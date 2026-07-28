"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyRequestInterceptor = exports.setForceIpv4First = void 0;
const logger_1 = __importDefault(require("../logger"));
const axios_1 = __importDefault(require("axios"));
const http_1 = __importDefault(require("http"));
const http_proxy_agent_1 = require("http-proxy-agent");
const https_1 = __importDefault(require("https"));
const https_proxy_agent_1 = require("https-proxy-agent");
const undici_1 = require("undici");
let proxyState = null;
let ipv4Agents = null;
function setForceIpv4First(enabled) {
    ipv4Agents = enabled
        ? {
            httpAgent: new http_1.default.Agent({ family: 4 }),
            httpsAgent: new https_1.default.Agent({ family: 4 }),
        }
        : null;
}
exports.setForceIpv4First = setForceIpv4First;
function proxyRequestInterceptor(config) {
    let url;
    try {
        if (config.baseURL) {
            url = new URL(config.url ?? '', config.baseURL);
        }
        else if (config.url) {
            url = new URL(config.url);
        }
    }
    catch {
        url = undefined;
    }
    if (proxyState) {
        if (url && proxyState.skipUrl(url)) {
            config.httpAgent = ipv4Agents?.httpAgent ?? false;
            config.httpsAgent = ipv4Agents?.httpsAgent ?? false;
        }
        else {
            config.httpAgent = proxyState.httpAgent;
            config.httpsAgent = proxyState.httpsAgent;
        }
        config.proxy = false;
    }
    else if (ipv4Agents) {
        config.httpAgent = ipv4Agents.httpAgent;
        config.httpsAgent = ipv4Agents.httpsAgent;
    }
    return config;
}
exports.proxyRequestInterceptor = proxyRequestInterceptor;
// default instance only, axios.create() clients register this themselves
axios_1.default.interceptors.request.use(proxyRequestInterceptor);
async function createCustomProxyAgent(proxySettings, forceIpv4First) {
    const defaultAgent = new undici_1.Agent({
        keepAliveTimeout: 5000,
        connections: 50,
        connect: forceIpv4First ? { family: 4 } : undefined,
    });
    const skipUrl = (url) => {
        const hostname = typeof url === 'string' ? new URL(url).hostname : url.hostname;
        if (proxySettings.bypassLocalAddresses && isLocalAddress(hostname)) {
            return true;
        }
        for (const address of proxySettings.bypassFilter.split(',')) {
            const trimmedAddress = address.trim();
            if (!trimmedAddress) {
                continue;
            }
            if (trimmedAddress.startsWith('*')) {
                const domain = trimmedAddress.slice(1);
                if (hostname.endsWith(domain)) {
                    return true;
                }
            }
            else if (hostname === trimmedAddress) {
                return true;
            }
        }
        return false;
    };
    const noProxyInterceptor = (dispatch) => {
        return (opts, handler) => {
            return opts.origin && skipUrl(opts.origin)
                ? defaultAgent.dispatch(opts, handler)
                : dispatch(opts, handler);
        };
    };
    const token = proxySettings.user && proxySettings.password
        ? `Basic ${Buffer.from(`${proxySettings.user}:${proxySettings.password}`).toString('base64')}`
        : undefined;
    try {
        const proxyUrl = `${proxySettings.useSsl ? 'https' : 'http'}://${proxySettings.hostname}:${proxySettings.port}`;
        const proxyAgent = new undici_1.ProxyAgent({
            uri: proxyUrl,
            token,
            keepAliveTimeout: 5000,
            connections: 50,
            connect: forceIpv4First ? { family: 4 } : undefined,
        });
        (0, undici_1.setGlobalDispatcher)(proxyAgent.compose(noProxyInterceptor));
        const agentOptions = {
            headers: token ? { 'proxy-authorization': token } : undefined,
            keepAlive: true,
            maxSockets: 50,
            maxFreeSockets: 10,
            timeout: 5000,
            scheduling: 'lifo',
            family: forceIpv4First ? 4 : undefined,
        };
        proxyState = {
            httpAgent: new http_proxy_agent_1.HttpProxyAgent(proxyUrl, agentOptions),
            httpsAgent: new https_proxy_agent_1.HttpsProxyAgent(proxyUrl, agentOptions),
            skipUrl,
        };
    }
    catch (e) {
        logger_1.default.error('Failed to connect to the proxy: ' + e.message, {
            label: 'Proxy',
        });
        (0, undici_1.setGlobalDispatcher)(defaultAgent);
        proxyState = null;
        return;
    }
    try {
        await axios_1.default.head('https://www.google.com');
        logger_1.default.debug('HTTP(S) proxy connected successfully', { label: 'Proxy' });
    }
    catch (e) {
        logger_1.default.error('Failed to connect to the proxy: ' + e.message + ': ' + e.cause, { label: 'Proxy' });
    }
}
exports.default = createCustomProxyAgent;
function isLocalAddress(hostname) {
    if (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1') {
        return true;
    }
    const privateIpRanges = [
        /^10\./, // 10.x.x.x
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.x.x - 172.31.x.x
        /^192\.168\./, // 192.168.x.x
    ];
    if (privateIpRanges.some((regex) => regex.test(hostname))) {
        return true;
    }
    return false;
}

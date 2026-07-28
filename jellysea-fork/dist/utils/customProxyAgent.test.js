"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const externalapi_1 = __importDefault(require("../api/externalapi"));
const customProxyAgent_1 = __importDefault(require("../utils/customProxyAgent"));
const axios_1 = __importDefault(require("axios"));
const https_proxy_agent_1 = require("https-proxy-agent");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
class TestExternalAPI extends externalapi_1.default {
    constructor() {
        super('https://api.themoviedb.org/3', {}, {});
    }
    async resolvedHttpsAgent(path = '/movie/123') {
        let captured;
        this.axios.defaults.adapter = (config) => {
            captured = config;
            return Promise.resolve({
                data: {},
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
                request: {},
            });
        };
        await this.axios.get(path);
        return captured?.httpsAgent;
    }
}
// constructed before any test configures the proxy, like BaseScanner.tmdb
const preProxyClient = new TestExternalAPI();
const proxySettings = {
    enabled: true,
    hostname: 'proxy.test',
    port: 3128,
    useSsl: false,
    user: '',
    password: '',
    bypassFilter: '*.bypass.test',
    bypassLocalAddresses: true,
};
(0, node_test_1.describe)('proxy routing (construction-order independence)', () => {
    (0, node_test_1.beforeEach)(() => {
        node_test_1.mock.method(axios_1.default, 'head', async () => ({ status: 200 }));
    });
    (0, node_test_1.afterEach)(() => {
        node_test_1.mock.restoreAll();
    });
    (0, node_test_1.it)('routes a client constructed BEFORE the proxy was configured', async () => {
        await (0, customProxyAgent_1.default)(proxySettings);
        const agent = await preProxyClient.resolvedHttpsAgent();
        strict_1.default.ok(agent instanceof https_proxy_agent_1.HttpsProxyAgent, 'client created before proxy setup must still route through the proxy');
    });
    (0, node_test_1.it)('routes a client constructed AFTER the proxy was configured', async () => {
        await (0, customProxyAgent_1.default)(proxySettings);
        const agent = await new TestExternalAPI().resolvedHttpsAgent();
        strict_1.default.ok(agent instanceof https_proxy_agent_1.HttpsProxyAgent);
    });
});

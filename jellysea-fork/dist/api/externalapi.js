"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const customProxyAgent_1 = require("../utils/customProxyAgent");
const axios_1 = __importDefault(require("axios"));
const axios_rate_limit_1 = __importDefault(require("axios-rate-limit"));
// 5 minute default TTL (in seconds)
const DEFAULT_TTL = 300;
// 10 seconds default rolling buffer (in ms)
const DEFAULT_ROLLING_BUFFER = 10000;
class ExternalAPI {
    constructor(baseUrl, params, options = {}) {
        this.axios = axios_1.default.create({
            baseURL: baseUrl,
            params,
            timeout: options.timeout,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...options.headers,
            },
        });
        this.axios.interceptors.request.use(customProxyAgent_1.proxyRequestInterceptor);
        if (options.rateLimit) {
            this.axios = (0, axios_rate_limit_1.default)(this.axios, {
                maxRequests: options.rateLimit.maxRequests,
                maxRPS: options.rateLimit.maxRPS,
            });
        }
        this.baseUrl = baseUrl;
        this.cache = options.nodeCache;
    }
    async get(endpoint, config, ttl) {
        const cacheKey = this.serializeCacheKey(endpoint, {
            ...config?.params,
            headers: config?.headers,
        });
        const cachedItem = this.cache?.get(cacheKey);
        if (cachedItem) {
            return cachedItem;
        }
        const response = await this.axios.get(endpoint, config);
        if (this.cache && ttl !== 0) {
            this.cache.set(cacheKey, response.data, ttl ?? DEFAULT_TTL);
        }
        return response.data;
    }
    async post(endpoint, data, config, ttl) {
        const cacheKey = this.serializeCacheKey(endpoint, {
            config: config?.params,
            ...(data ? { data } : {}),
        });
        const cachedItem = this.cache?.get(cacheKey);
        if (cachedItem) {
            return cachedItem;
        }
        const response = await this.axios.post(endpoint, data, config);
        if (this.cache && ttl !== 0) {
            this.cache.set(cacheKey, response.data, ttl ?? DEFAULT_TTL);
        }
        return response.data;
    }
    async getRolling(endpoint, config, ttl) {
        const cacheKey = this.serializeCacheKey(endpoint, {
            ...config?.params,
            headers: config?.headers,
        });
        const cachedItem = this.cache?.get(cacheKey);
        if (cachedItem) {
            const keyTtl = this.cache?.getTtl(cacheKey) ?? 0;
            // If the item has passed our rolling check, fetch again in background
            if (keyTtl - (ttl ?? DEFAULT_TTL) * 1000 <
                Date.now() - DEFAULT_ROLLING_BUFFER) {
                this.axios.get(endpoint, config).then((response) => {
                    this.cache?.set(cacheKey, response.data, ttl ?? DEFAULT_TTL);
                });
            }
            return cachedItem;
        }
        const response = await this.axios.get(endpoint, config);
        if (this.cache && ttl !== 0) {
            this.cache.set(cacheKey, response.data, ttl ?? DEFAULT_TTL);
        }
        return response.data;
    }
    removeCache(endpoint, options) {
        const cacheKey = this.serializeCacheKey(endpoint, {
            ...options,
        });
        this.cache?.del(cacheKey);
    }
    serializeCacheKey(endpoint, options) {
        if (!options) {
            return `${this.baseUrl}${endpoint}`;
        }
        return `${this.baseUrl}${endpoint}${JSON.stringify(options)}`;
    }
}
exports.default = ExternalAPI;

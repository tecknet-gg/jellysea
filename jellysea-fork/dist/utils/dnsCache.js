"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDnsCache = exports.dnsCache = void 0;
const logger_1 = __importDefault(require("../logger"));
const dns_caching_1 = require("dns-caching");
function initializeDnsCache({ forceMinTtl, forceMaxTtl, }) {
    if (exports.dnsCache) {
        logger_1.default.warn('DNS Cache is already initialized', { label: 'DNS Cache' });
        return;
    }
    logger_1.default.info('Initializing DNS Cache', { label: 'DNS Cache' });
    exports.dnsCache = new dns_caching_1.DnsCacheManager({
        logger: logger_1.default,
        forceMinTtl: typeof forceMinTtl === 'number' ? forceMinTtl * 1000 : 0,
        forceMaxTtl: typeof forceMaxTtl === 'number' ? forceMaxTtl * 1000 : -1,
    });
    exports.dnsCache.initialize();
}
exports.initializeDnsCache = initializeDnsCache;

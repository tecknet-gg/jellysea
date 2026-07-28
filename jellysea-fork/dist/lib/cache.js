"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cache_1 = __importDefault(require("node-cache"));
const DEFAULT_TTL = 300;
const DEFAULT_CHECK_PERIOD = 120;
class Cache {
    constructor(id, name, options = {}) {
        this.id = id;
        this.name = name;
        this.data = new node_cache_1.default({
            stdTTL: options.stdTtl ?? DEFAULT_TTL,
            checkperiod: options.checkPeriod ?? DEFAULT_CHECK_PERIOD,
        });
    }
    getStats() {
        return this.data.getStats();
    }
    flush() {
        this.data.flushAll();
    }
}
class CacheManager {
    constructor() {
        this.availableCaches = {
            tmdb: new Cache('tmdb', 'The Movie Database API', {
                stdTtl: 21600,
                checkPeriod: 60 * 30,
            }),
            radarr: new Cache('radarr', 'Radarr API'),
            sonarr: new Cache('sonarr', 'Sonarr API'),
            rt: new Cache('rt', 'Rotten Tomatoes API', {
                stdTtl: 43200,
                checkPeriod: 60 * 30,
            }),
            imdb: new Cache('imdb', 'IMDB Radarr Proxy', {
                stdTtl: 43200,
                checkPeriod: 60 * 30,
            }),
            github: new Cache('github', 'GitHub API', {
                stdTtl: 21600,
                checkPeriod: 60 * 30,
            }),
            plexguid: new Cache('plexguid', 'Plex GUID', {
                stdTtl: 86400 * 7, // 1 week cache
                checkPeriod: 60 * 30,
            }),
            plextv: new Cache('plextv', 'Plex TV', {
                stdTtl: 86400 * 7, // 1 week cache
                checkPeriod: 60,
            }),
            plexwatchlist: new Cache('plexwatchlist', 'Plex Watchlist'),
            tvdb: new Cache('tvdb', 'The TVDB API', {
                stdTtl: 21600,
                checkPeriod: 60 * 30,
            }),
        };
    }
    getCache(id) {
        return this.availableCaches[id];
    }
    getAllCaches() {
        return this.availableCaches;
    }
}
const cacheManager = new CacheManager();
exports.default = cacheManager;

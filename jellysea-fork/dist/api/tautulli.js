"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../logger"));
const customProxyAgent_1 = require("../utils/customProxyAgent");
const axios_1 = __importDefault(require("axios"));
const lodash_1 = require("lodash");
class TautulliAPI {
    constructor(settings) {
        this.axios = axios_1.default.create({
            baseURL: `${settings.useSsl ? 'https' : 'http'}://${settings.hostname}:${settings.port}${settings.urlBase ?? ''}`,
            params: { apikey: settings.apiKey },
        });
        this.axios.interceptors.request.use(customProxyAgent_1.proxyRequestInterceptor);
    }
    async getInfo() {
        try {
            return (await this.axios.get('/api/v2', {
                params: { cmd: 'get_tautulli_info' },
            })).data.response.data;
        }
        catch (e) {
            logger_1.default.error('Something went wrong fetching Tautulli server info', {
                label: 'Tautulli API',
                errorMessage: e.message,
            });
            throw new Error(`[Tautulli] Failed to fetch Tautulli server info: ${e.message}`, { cause: e });
        }
    }
    async getMediaWatchStats(ratingKey) {
        try {
            return (await this.axios.get('/api/v2', {
                params: {
                    cmd: 'get_item_watch_time_stats',
                    rating_key: ratingKey,
                    grouping: 1,
                },
            })).data.response.data;
        }
        catch (e) {
            logger_1.default.error('Something went wrong fetching media watch stats from Tautulli', {
                label: 'Tautulli API',
                errorMessage: e.message,
                ratingKey,
            });
            throw new Error(`[Tautulli] Failed to fetch media watch stats: ${e.message}`, { cause: e });
        }
    }
    async getMediaWatchUsers(ratingKey) {
        try {
            return (await this.axios.get('/api/v2', {
                params: {
                    cmd: 'get_item_user_stats',
                    rating_key: ratingKey,
                    grouping: 1,
                },
            })).data.response.data;
        }
        catch (e) {
            logger_1.default.error('Something went wrong fetching media watch users from Tautulli', {
                label: 'Tautulli API',
                errorMessage: e.message,
                ratingKey,
            });
            throw new Error(`[Tautulli] Failed to fetch media watch users: ${e.message}`, { cause: e });
        }
    }
    async getUserWatchStats(user) {
        try {
            if (!user.plexId) {
                throw new Error('User does not have an associated Plex ID');
            }
            return (await this.axios.get('/api/v2', {
                params: {
                    cmd: 'get_user_watch_time_stats',
                    user_id: user.plexId,
                    query_days: 0,
                    grouping: 1,
                },
            })).data.response.data[0];
        }
        catch (e) {
            logger_1.default.error('Something went wrong fetching user watch stats from Tautulli', {
                label: 'Tautulli API',
                errorMessage: e.message,
                user: user.displayName,
            });
            throw new Error(`[Tautulli] Failed to fetch user watch stats: ${e.message}`, { cause: e });
        }
    }
    async getUserWatchHistory(user) {
        let results = [];
        try {
            if (!user.plexId) {
                throw new Error('User does not have an associated Plex ID');
            }
            const take = 100;
            let start = 0;
            while (results.length < 20) {
                const tautulliData = (await this.axios.get('/api/v2', {
                    params: {
                        cmd: 'get_history',
                        grouping: 1,
                        order_column: 'date',
                        order_dir: 'desc',
                        user_id: user.plexId,
                        media_type: 'movie,episode',
                        length: take,
                        start,
                    },
                })).data.response.data.data;
                if (!tautulliData.length) {
                    return results;
                }
                results = (0, lodash_1.uniqWith)(results.concat(tautulliData), (recordA, recordB) => recordA.grandparent_rating_key && recordB.grandparent_rating_key
                    ? recordA.grandparent_rating_key === recordB.grandparent_rating_key
                    : recordA.parent_rating_key && recordB.parent_rating_key
                        ? recordA.parent_rating_key === recordB.parent_rating_key
                        : recordA.rating_key === recordB.rating_key);
                start += take;
            }
            return results.slice(0, 20);
        }
        catch (e) {
            logger_1.default.error('Something went wrong fetching user watch history from Tautulli', {
                label: 'Tautulli API',
                errorMessage: e.message,
                user: user.displayName,
            });
            throw new Error(`[Tautulli] Failed to fetch user watch history: ${e.message}`, { cause: e });
        }
    }
}
exports.default = TautulliAPI;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = __importDefault(require("../lib/cache"));
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const node_crypto_1 = require("node:crypto");
const xml2js_1 = __importDefault(require("xml2js"));
const externalapi_1 = __importDefault(require("./externalapi"));
class PlexTvAPI extends externalapi_1.default {
    constructor(authToken) {
        super('https://plex.tv', {}, {
            headers: {
                'X-Plex-Token': authToken,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            nodeCache: cache_1.default.getCache('plextv').data,
        });
        this.authToken = authToken;
    }
    async getDevices() {
        try {
            const devicesResp = await this.axios.get('/api/resources?includeHttps=1', {
                transformResponse: [],
                responseType: 'text',
            });
            const parsedXml = await xml2js_1.default.parseStringPromise(devicesResp.data);
            return parsedXml?.MediaContainer?.Device?.map((pxml) => ({
                name: pxml.$.name,
                product: pxml.$.product,
                productVersion: pxml.$.productVersion,
                platform: pxml.$?.platform,
                platformVersion: pxml.$?.platformVersion,
                device: pxml.$?.device,
                clientIdentifier: pxml.$.clientIdentifier,
                createdAt: new Date(parseInt(pxml.$?.createdAt, 10) * 1000),
                lastSeenAt: new Date(parseInt(pxml.$?.lastSeenAt, 10) * 1000),
                provides: pxml.$.provides.split(','),
                owned: pxml.$.owned == '1' ? true : false,
                accessToken: pxml.$?.accessToken,
                publicAddress: pxml.$?.publicAddress,
                publicAddressMatches: pxml.$?.publicAddressMatches == '1' ? true : false,
                httpsRequired: pxml.$?.httpsRequired == '1' ? true : false,
                synced: pxml.$?.synced == '1' ? true : false,
                relay: pxml.$?.relay == '1' ? true : false,
                dnsRebindingProtection: pxml.$?.dnsRebindingProtection == '1' ? true : false,
                natLoopbackSupported: pxml.$?.natLoopbackSupported == '1' ? true : false,
                presence: pxml.$?.presence == '1' ? true : false,
                ownerID: pxml.$?.ownerID,
                home: pxml.$?.home == '1' ? true : false,
                sourceTitle: pxml.$?.sourceTitle,
                connection: pxml?.Connection?.map((conn) => ({
                    protocol: conn.$.protocol,
                    address: conn.$.address,
                    port: parseInt(conn.$.port, 10),
                    uri: conn.$.uri,
                    local: conn.$.local == '1' ? true : false,
                })),
            }));
        }
        catch (e) {
            logger_1.default.error('Something went wrong getting the devices from plex.tv', {
                label: 'Plex.tv API',
                errorMessage: e.message,
            });
            throw new Error('Invalid auth token', { cause: e });
        }
    }
    async getUser() {
        try {
            const account = await this.axios.get('/users/account.json');
            return account.data.user;
        }
        catch (e) {
            logger_1.default.error(`Something went wrong while getting the account from plex.tv: ${e.message}`, { label: 'Plex.tv API' });
            throw new Error('Invalid auth token', { cause: e });
        }
    }
    async checkUserAccess(userId) {
        const settings = (0, settings_1.getSettings)();
        try {
            if (!settings.plex.machineId) {
                throw new Error('Plex is not configured!');
            }
            const usersResponse = await this.getUsers();
            const users = usersResponse.MediaContainer.User;
            const user = users.find((u) => parseInt(u.$.id) === userId);
            if (!user) {
                throw new Error("This user does not exist on the main Plex account's shared list");
            }
            return !!user.Server?.find((server) => server.$.machineIdentifier === settings.plex.machineId);
        }
        catch (e) {
            logger_1.default.error(`Error checking user access: ${e.message}`);
            return false;
        }
    }
    async getUsers() {
        const response = await this.axios.get('/api/users', {
            transformResponse: [],
            responseType: 'text',
        });
        const parsedXml = (await xml2js_1.default.parseStringPromise(response.data));
        return parsedXml;
    }
    async getWatchlist({ offset = 0, size = 20, } = {}) {
        try {
            const watchlistCache = cache_1.default.getCache('plexwatchlist');
            let cachedWatchlist = watchlistCache.data.get(this.authToken);
            const response = await this.axios.get('/library/sections/watchlist/all', {
                params: {
                    'X-Plex-Container-Start': offset,
                    'X-Plex-Container-Size': size,
                },
                headers: {
                    'If-None-Match': cachedWatchlist?.etag,
                },
                baseURL: 'https://discover.provider.plex.tv',
                validateStatus: (status) => status < 400, // Allow HTTP 304 to return without error
            });
            // If we don't recieve HTTP 304, the watchlist has been updated and we need to update the cache.
            if (response.status >= 200 && response.status <= 299) {
                cachedWatchlist = {
                    etag: response.headers.etag,
                    response: response.data,
                };
                watchlistCache.data.set(this.authToken, cachedWatchlist);
            }
            const watchlistDetails = await Promise.all((cachedWatchlist?.response.MediaContainer.Metadata ?? []).map(async (watchlistItem) => {
                let detailedResponse;
                try {
                    detailedResponse = await this.getRolling(`/library/metadata/${watchlistItem.ratingKey}`, {
                        baseURL: 'https://discover.provider.plex.tv',
                    });
                }
                catch (e) {
                    if (e.response?.status === 404) {
                        logger_1.default.warn(`Item with ratingKey ${watchlistItem.ratingKey} not found, it may have been removed from the server.`, { label: 'Plex.TV Metadata API' });
                        return null;
                    }
                    else {
                        throw e;
                    }
                }
                const metadata = detailedResponse.MediaContainer.Metadata?.[0] ??
                    detailedResponse.MediaContainer.Video?.[0];
                if (!metadata) {
                    logger_1.default.warn(`Item with ratingKey ${watchlistItem.ratingKey} returned no metadata, skipping.`, { label: 'Plex.TV Metadata API' });
                    return null;
                }
                const tmdbString = metadata.Guid?.find((guid) => guid.id.startsWith('tmdb'));
                const tvdbString = metadata.Guid?.find((guid) => guid.id.startsWith('tvdb'));
                return {
                    ratingKey: metadata.ratingKey,
                    // This should always be set? But I guess it also cannot be?
                    // We will filter out the 0's afterwards
                    tmdbId: tmdbString ? Number(tmdbString.id.split('//')[1]) : 0,
                    tvdbId: tvdbString
                        ? Number(tvdbString.id.split('//')[1])
                        : undefined,
                    title: metadata.title,
                    type: metadata.type,
                };
            }));
            const filteredList = watchlistDetails.filter((detail) => detail?.tmdbId);
            return {
                offset,
                size,
                totalSize: cachedWatchlist?.response.MediaContainer.totalSize ?? 0,
                items: filteredList,
            };
        }
        catch (e) {
            logger_1.default.error('Failed to retrieve watchlist items', {
                label: 'Plex.TV Metadata API',
                errorMessage: e.message,
            });
            return {
                offset,
                size,
                totalSize: 0,
                items: [],
            };
        }
    }
    async pingToken() {
        try {
            const response = await this.axios.get('/api/v2/ping', {
                headers: {
                    'X-Plex-Client-Identifier': (0, node_crypto_1.randomUUID)(),
                },
            });
            if (!response?.data?.pong) {
                throw new Error('No pong response');
            }
        }
        catch (e) {
            logger_1.default.error('Failed to ping token', {
                label: 'Plex Refresh Token',
                errorMessage: e.message,
            });
        }
    }
}
exports.default = PlexTvAPI;

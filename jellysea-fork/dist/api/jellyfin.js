"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const externalapi_1 = __importDefault(require("../api/externalapi"));
const error_1 = require("../constants/error");
const server_1 = require("../constants/server");
const availabilitySync_1 = __importDefault(require("../lib/availabilitySync"));
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const error_2 = require("../types/error");
const appVersion_1 = require("../utils/appVersion");
class JellyfinAPI extends externalapi_1.default {
    constructor(jellyfinHost, authToken, deviceId) {
        const settings = (0, settings_1.getSettings)();
        const safeDeviceId = deviceId && deviceId.length > 0
            ? deviceId
            : Buffer.from('BOT_seerr').toString('base64');
        const version = settings.main.mediaServerType === server_1.MediaServerType.EMBY
            ? '1.0.0'
            : (0, appVersion_1.getAppVersion)();
        let authHeaderVal = `MediaBrowser Client="Seerr", Device="Seerr", DeviceId="${safeDeviceId}", Version="${version}"`;
        if (authToken) {
            authHeaderVal += `, Token="${authToken}"`;
        }
        super(jellyfinHost, {}, {
            headers: {
                Authorization: authHeaderVal,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });
        this.mediaServerType = settings.main.mediaServerType;
    }
    async login(Username, Password, ClientIP) {
        const authenticate = async (useHeaders) => {
            const headers = useHeaders && ClientIP ? { 'X-Forwarded-For': ClientIP } : {};
            return this.post('/Users/AuthenticateByName', {
                Username,
                Pw: Password,
            }, { headers });
        };
        try {
            return await authenticate(true);
        }
        catch (e) {
            logger_1.default.debug('Failed to authenticate with headers', {
                label: 'Jellyfin API',
                error: e.response?.statusText,
                ip: ClientIP,
            });
            if (!e.response?.status) {
                throw new error_2.ApiError(404, error_1.ApiErrorCode.InvalidUrl);
            }
            if (e.response?.status === 401) {
                throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.InvalidCredentials);
            }
        }
        try {
            return await authenticate(false);
        }
        catch (e) {
            if (e.response?.status === 401) {
                throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.InvalidCredentials);
            }
            logger_1.default.error(`Something went wrong while authenticating with the Jellyfin server: ${e.message}`, {
                label: 'Jellyfin API',
                error: e.response?.status,
                ip: ClientIP,
            });
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.Unknown);
        }
    }
    async initiateQuickConnect() {
        try {
            const response = await this.post('/QuickConnect/Initiate');
            return response;
        }
        catch (e) {
            logger_1.default.error(`Something went wrong while initiating Quick Connect: ${e.message}`, { label: 'Jellyfin API', error: e.response?.status });
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.Unknown);
        }
    }
    async checkQuickConnect(secret) {
        try {
            const response = await this.get('/QuickConnect/Connect', { params: { secret } });
            return response;
        }
        catch (e) {
            logger_1.default.error(`Something went wrong while getting Quick Connect status: ${e.message}`, { label: 'Jellyfin API', error: e.response?.status });
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.Unknown);
        }
    }
    async authenticateQuickConnect(secret) {
        try {
            const response = await this.post('/Users/AuthenticateWithQuickConnect', { Secret: secret });
            return response;
        }
        catch (e) {
            logger_1.default.error(`Something went wrong while authenticating with Quick Connect: ${e.message}`, { label: 'Jellyfin API', error: e.response?.status });
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.Unknown);
        }
    }
    setUserId(userId) {
        this.userId = userId;
        return;
    }
    async getSystemInfo() {
        try {
            const systemInfoResponse = await this.get('/System/Info');
            return systemInfoResponse;
        }
        catch (e) {
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.InvalidAuthToken);
        }
    }
    async getServerName() {
        try {
            const serverResponse = await this.get('/System/Info/Public');
            return serverResponse.ServerName;
        }
        catch (e) {
            logger_1.default.error(`Something went wrong while getting the server name from the Jellyfin server: ${e.message}`, { label: 'Jellyfin API', error: e.response?.status });
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.Unknown);
        }
    }
    async getUsers() {
        try {
            const userReponse = await this.get(`/Users`);
            return { users: userReponse };
        }
        catch (e) {
            logger_1.default.error(`Something went wrong while getting the account from the Jellyfin server: ${e.message}`, { label: 'Jellyfin API', error: e.response?.status });
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.InvalidAuthToken);
        }
    }
    async getUser() {
        try {
            const userReponse = await this.get(`/Users/${this.userId ?? 'Me'}`);
            return userReponse;
        }
        catch (e) {
            logger_1.default.error(`Something went wrong while getting the account from the Jellyfin server: ${e.message}`, { label: 'Jellyfin API', error: e.response?.status });
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.InvalidAuthToken);
        }
    }
    async getLibraries() {
        try {
            const mediaFolderResponse = await this.get(`/Library/MediaFolders`);
            return this.mapLibraries(mediaFolderResponse.Items);
        }
        catch {
            // fallback to user views to get libraries
            // this only and maybe/depending on factors affects LDAP users
            try {
                const mediaFolderResponse = await this.get(`/Users/${this.userId ?? 'Me'}/Views`);
                return this.mapLibraries(mediaFolderResponse.Items);
            }
            catch (e) {
                logger_1.default.error(`Something went wrong while getting libraries from the Jellyfin server: ${e.message}`, {
                    label: 'Jellyfin API',
                    error: e.response?.status,
                });
                return [];
            }
        }
    }
    mapLibraries(mediaFolders) {
        const excludedTypes = [
            'music',
            'books',
            'musicvideos',
            'homevideos',
            'boxsets',
        ];
        return mediaFolders
            .filter((Item) => {
            return (Item.Type === 'CollectionFolder' &&
                !excludedTypes.includes(Item.CollectionType));
        })
            .map((Item) => {
            return {
                key: Item.Id,
                title: Item.Name,
                type: Item.CollectionType === 'movies' ? 'movie' : 'show',
                agent: 'jellyfin',
            };
        });
    }
    async getLibraryContents(id) {
        try {
            const libraryItemsResponse = await this.get(`/Items?SortBy=SortName&SortOrder=Ascending&IncludeItemTypes=Series,Movie,Others&Recursive=true&StartIndex=0&ParentId=${id}&collapseBoxSetItems=false`);
            return libraryItemsResponse.Items.filter((item) => item.LocationType !== 'Virtual');
        }
        catch (e) {
            logger_1.default.error(`Something went wrong while getting library content from the Jellyfin server: ${e.message}`, { label: 'Jellyfin API', error: e?.response?.status });
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.InvalidAuthToken);
        }
    }
    async getRecentlyAdded(id) {
        try {
            const endpoint = this.mediaServerType === server_1.MediaServerType.JELLYFIN
                ? `/Items/Latest`
                : `/Users/${this.userId}/Items/Latest`;
            const itemResponse = await this.get(`${endpoint}?Limit=12&ParentId=${id}${this.mediaServerType === server_1.MediaServerType.JELLYFIN
                ? `&userId=${this.userId ?? 'Me'}`
                : ''}`);
            return itemResponse;
        }
        catch (e) {
            logger_1.default.error(`Something went wrong while getting library content from the Jellyfin server: ${e.message}`, { label: 'Jellyfin API', error: e.response?.status });
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.InvalidAuthToken);
        }
    }
    async getItemData(id) {
        try {
            const itemResponse = await this.get(`/Items`, {
                params: {
                    ids: id,
                    fields: 'ProviderIds,MediaSources,Width,Height,IsHD,DateCreated',
                },
            });
            return itemResponse.Items?.[0];
        }
        catch (e) {
            if (availabilitySync_1.default.running) {
                if (e.response?.status === 500) {
                    return undefined;
                }
            }
            logger_1.default.error(`Something went wrong while getting library content from the Jellyfin server: ${e.message}`, { label: 'Jellyfin API', error: e.response?.status });
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.InvalidAuthToken);
        }
    }
    async getSeasons(seriesID) {
        try {
            const seasonResponse = await this.get(`/Shows/${seriesID}/Seasons`);
            return seasonResponse.Items;
        }
        catch (e) {
            logger_1.default.error(`Something went wrong while getting the list of seasons from the Jellyfin server: ${e.message}`, { label: 'Jellyfin API', error: e.response?.status });
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.InvalidAuthToken);
        }
    }
    async getEpisodes(seriesID, seasonID, options) {
        try {
            const episodeResponse = await this.get(`/Shows/${seriesID}/Episodes`, {
                params: {
                    seasonId: seasonID,
                    ...(options?.includeMediaInfo && { fields: 'MediaSources' }),
                },
            });
            return episodeResponse.Items.filter((item) => item.LocationType !== 'Virtual');
        }
        catch (e) {
            logger_1.default.error(`Something went wrong while getting the list of episodes from the Jellyfin server: ${e.message}`, { label: 'Jellyfin API', error: e.response?.status });
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.InvalidAuthToken);
        }
    }
    async createApiToken(appName) {
        try {
            await this.post(`/Auth/Keys?App=${appName}`);
            const apiKeys = await this.get(`/Auth/Keys`);
            return apiKeys.Items.reverse().find((item) => item.AppName === appName).AccessToken;
        }
        catch (e) {
            logger_1.default.error(`Something went wrong while creating an API key from the Jellyfin server: ${e.message}`, { label: 'Jellyfin API', error: e.response?.status });
            throw new error_2.ApiError(e.response?.status, error_1.ApiErrorCode.InvalidAuthToken);
        }
    }
}
exports.default = JellyfinAPI;

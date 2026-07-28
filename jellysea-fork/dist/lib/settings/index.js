"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = exports.NotificationAgentKey = exports.MetadataProviderType = void 0;
const server_1 = require("../../constants/server");
const permissions_1 = require("../../lib/permissions");
const migrator_1 = require("../../lib/settings/migrator");
const crypto_1 = require("crypto");
const promises_1 = __importDefault(require("fs/promises"));
const lodash_1 = require("lodash");
const path_1 = __importDefault(require("path"));
const web_push_1 = __importDefault(require("web-push"));
// Prevents stale array entries when incoming data has fewer elements
const mergeSettings = (current, incoming) => (0, lodash_1.mergeWith)({}, current, incoming, (_objValue, srcValue) => Array.isArray(srcValue) ? srcValue : undefined);
var MetadataProviderType;
(function (MetadataProviderType) {
    MetadataProviderType["TMDB"] = "tmdb";
    MetadataProviderType["TVDB"] = "tvdb";
})(MetadataProviderType || (exports.MetadataProviderType = MetadataProviderType = {}));
var NotificationAgentKey;
(function (NotificationAgentKey) {
    NotificationAgentKey["DISCORD"] = "discord";
    NotificationAgentKey["EMAIL"] = "email";
    NotificationAgentKey["GOTIFY"] = "gotify";
    NotificationAgentKey["NTFY"] = "ntfy";
    NotificationAgentKey["PUSHBULLET"] = "pushbullet";
    NotificationAgentKey["PUSHOVER"] = "pushover";
    NotificationAgentKey["SLACK"] = "slack";
    NotificationAgentKey["TELEGRAM"] = "telegram";
    NotificationAgentKey["WEBHOOK"] = "webhook";
    NotificationAgentKey["WEBPUSH"] = "webpush";
})(NotificationAgentKey || (exports.NotificationAgentKey = NotificationAgentKey = {}));
const SETTINGS_PATH = process.env.CONFIG_DIRECTORY
    ? `${process.env.CONFIG_DIRECTORY}/settings.json`
    : path_1.default.join(__dirname, '../../../config/settings.json');
class Settings {
    constructor(initialSettings) {
        this.saveLock = Promise.resolve();
        this.data = {
            clientId: (0, crypto_1.randomUUID)(),
            sessionSecret: '',
            vapidPrivate: '',
            vapidPublic: '',
            main: {
                apiKey: '',
                applicationTitle: 'Seerr',
                applicationUrl: '',
                cacheImages: false,
                defaultPermissions: permissions_1.Permission.REQUEST,
                defaultQuotas: {
                    movie: {},
                    tv: {},
                },
                hideAvailable: false,
                hideBlocklisted: false,
                localLogin: true,
                mediaServerLogin: true,
                newPlexLogin: true,
                discoverRegion: '',
                streamingRegion: '',
                originalLanguage: '',
                blocklistRegion: '',
                blocklistLanguage: '',
                blocklistedTags: '',
                blocklistedTagsLimit: 50,
                mediaServerType: server_1.MediaServerType.NOT_CONFIGURED,
                partialRequestsEnabled: true,
                enableSpecialEpisodes: false,
                locale: 'en',
                youtubeUrl: '',
            },
            plex: {
                name: '',
                ip: '',
                port: 32400,
                useSsl: false,
                libraries: [],
            },
            jellyfin: {
                name: '',
                ip: '',
                port: 8096,
                useSsl: false,
                urlBase: '',
                externalHostname: '',
                jellyfinForgotPasswordUrl: '',
                libraries: [],
                serverId: '',
                apiKey: '',
            },
            tautulli: {},
            metadataSettings: {
                tv: MetadataProviderType.TMDB,
                anime: MetadataProviderType.TMDB,
            },
            radarr: [],
            sonarr: [],
            public: {
                initialized: false,
            },
            notifications: {
                agents: {
                    email: {
                        enabled: false,
                        embedPoster: true,
                        options: {
                            userEmailRequired: false,
                            emailFrom: '',
                            smtpHost: '',
                            smtpPort: 587,
                            secure: false,
                            ignoreTls: false,
                            requireTls: false,
                            allowSelfSigned: false,
                            senderName: 'Seerr',
                            usePublicLogo: false,
                        },
                    },
                    discord: {
                        enabled: false,
                        embedPoster: true,
                        types: 0,
                        options: {
                            webhookUrl: '',
                            webhookRoleId: '',
                            enableMentions: true,
                            locale: 'en',
                            useUserLocale: true,
                        },
                    },
                    slack: {
                        enabled: false,
                        embedPoster: true,
                        types: 0,
                        options: {
                            webhookUrl: '',
                            locale: 'en',
                        },
                    },
                    telegram: {
                        enabled: false,
                        embedPoster: true,
                        types: 0,
                        options: {
                            botAPI: '',
                            chatId: '',
                            messageThreadId: '',
                            sendSilently: false,
                        },
                    },
                    pushbullet: {
                        enabled: false,
                        embedPoster: false,
                        types: 0,
                        options: {
                            accessToken: '',
                        },
                    },
                    pushover: {
                        enabled: false,
                        embedPoster: true,
                        types: 0,
                        options: {
                            accessToken: '',
                            userToken: '',
                            sound: '',
                        },
                    },
                    webhook: {
                        enabled: false,
                        embedPoster: true,
                        types: 0,
                        options: {
                            webhookUrl: '',
                            jsonPayload: 'IntcbiAgXCJub3RpZmljYXRpb25fdHlwZVwiOiBcInt7bm90aWZpY2F0aW9uX3R5cGV9fVwiLFxuICBcImV2ZW50XCI6IFwie3tldmVudH19XCIsXG4gIFwic3ViamVjdFwiOiBcInt7c3ViamVjdH19XCIsXG4gIFwibWVzc2FnZVwiOiBcInt7bWVzc2FnZX19XCIsXG4gIFwiaW1hZ2VcIjogXCJ7e2ltYWdlfX1cIixcbiAgXCJ7e21lZGlhfX1cIjoge1xuICAgIFwibWVkaWFfdHlwZVwiOiBcInt7bWVkaWFfdHlwZX19XCIsXG4gICAgXCJ0bWRiSWRcIjogXCJ7e21lZGlhX3RtZGJpZH19XCIsXG4gICAgXCJ0dmRiSWRcIjogXCJ7e21lZGlhX3R2ZGJpZH19XCIsXG4gICAgXCJzdGF0dXNcIjogXCJ7e21lZGlhX3N0YXR1c319XCIsXG4gICAgXCJzdGF0dXM0a1wiOiBcInt7bWVkaWFfc3RhdHVzNGt9fVwiXG4gIH0sXG4gIFwie3tyZXF1ZXN0fX1cIjoge1xuICAgIFwicmVxdWVzdF9pZFwiOiBcInt7cmVxdWVzdF9pZH19XCIsXG4gICAgXCJyZXF1ZXN0ZWRCeV9lbWFpbFwiOiBcInt7cmVxdWVzdGVkQnlfZW1haWx9fVwiLFxuICAgIFwicmVxdWVzdGVkQnlfdXNlcm5hbWVcIjogXCJ7e3JlcXVlc3RlZEJ5X3VzZXJuYW1lfX1cIixcbiAgICBcInJlcXVlc3RlZEJ5X2F2YXRhclwiOiBcInt7cmVxdWVzdGVkQnlfYXZhdGFyfX1cIixcbiAgICBcInJlcXVlc3RlZEJ5X3NldHRpbmdzX2Rpc2NvcmRJZFwiOiBcInt7cmVxdWVzdGVkQnlfc2V0dGluZ3NfZGlzY29yZElkfX1cIixcbiAgICBcInJlcXVlc3RlZEJ5X3NldHRpbmdzX3RlbGVncmFtQ2hhdElkXCI6IFwie3tyZXF1ZXN0ZWRCeV9zZXR0aW5nc190ZWxlZ3JhbUNoYXRJZH19XCJcbiAgfSxcbiAgXCJ7e2lzc3VlfX1cIjoge1xuICAgIFwiaXNzdWVfaWRcIjogXCJ7e2lzc3VlX2lkfX1cIixcbiAgICBcImlzc3VlX3R5cGVcIjogXCJ7e2lzc3VlX3R5cGV9fVwiLFxuICAgIFwiaXNzdWVfc3RhdHVzXCI6IFwie3tpc3N1ZV9zdGF0dXN9fVwiLFxuICAgIFwicmVwb3J0ZWRCeV9lbWFpbFwiOiBcInt7cmVwb3J0ZWRCeV9lbWFpbH19XCIsXG4gICAgXCJyZXBvcnRlZEJ5X3VzZXJuYW1lXCI6IFwie3tyZXBvcnRlZEJ5X3VzZXJuYW1lfX1cIixcbiAgICBcInJlcG9ydGVkQnlfYXZhdGFyXCI6IFwie3tyZXBvcnRlZEJ5X2F2YXRhcn19XCIsXG4gICAgXCJyZXBvcnRlZEJ5X3NldHRpbmdzX2Rpc2NvcmRJZFwiOiBcInt7cmVwb3J0ZWRCeV9zZXR0aW5nc19kaXNjb3JkSWR9fVwiLFxuICAgIFwicmVwb3J0ZWRCeV9zZXR0aW5nc190ZWxlZ3JhbUNoYXRJZFwiOiBcInt7cmVwb3J0ZWRCeV9zZXR0aW5nc190ZWxlZ3JhbUNoYXRJZH19XCJcbiAgfSxcbiAgXCJ7e2NvbW1lbnR9fVwiOiB7XG4gICAgXCJjb21tZW50X21lc3NhZ2VcIjogXCJ7e2NvbW1lbnRfbWVzc2FnZX19XCIsXG4gICAgXCJjb21tZW50ZWRCeV9lbWFpbFwiOiBcInt7Y29tbWVudGVkQnlfZW1haWx9fVwiLFxuICAgIFwiY29tbWVudGVkQnlfdXNlcm5hbWVcIjogXCJ7e2NvbW1lbnRlZEJ5X3VzZXJuYW1lfX1cIixcbiAgICBcImNvbW1lbnRlZEJ5X2F2YXRhclwiOiBcInt7Y29tbWVudGVkQnlfYXZhdGFyfX1cIixcbiAgICBcImNvbW1lbnRlZEJ5X3NldHRpbmdzX2Rpc2NvcmRJZFwiOiBcInt7Y29tbWVudGVkQnlfc2V0dGluZ3NfZGlzY29yZElkfX1cIixcbiAgICBcImNvbW1lbnRlZEJ5X3NldHRpbmdzX3RlbGVncmFtQ2hhdElkXCI6IFwie3tjb21tZW50ZWRCeV9zZXR0aW5nc190ZWxlZ3JhbUNoYXRJZH19XCJcbiAgfSxcbiAgXCJ7e2V4dHJhfX1cIjogW11cbn0i',
                        },
                    },
                    webpush: {
                        enabled: false,
                        embedPoster: true,
                        options: {},
                    },
                    gotify: {
                        enabled: false,
                        embedPoster: false,
                        types: 0,
                        options: {
                            url: '',
                            token: '',
                            priority: 0,
                            locale: 'en',
                        },
                    },
                    ntfy: {
                        enabled: false,
                        embedPoster: true,
                        types: 0,
                        options: {
                            url: '',
                            topic: '',
                            priority: 3,
                            locale: 'en',
                        },
                    },
                },
            },
            jobs: {
                'plex-recently-added-scan': {
                    schedule: '0 */5 * * * *',
                },
                'plex-full-scan': {
                    schedule: '0 0 3 * * *',
                },
                'plex-watchlist-sync': {
                    schedule: '0 */3 * * * *',
                },
                'plex-refresh-token': {
                    schedule: '0 0 5 * * *',
                },
                'radarr-scan': {
                    schedule: '0 0 4 * * *',
                },
                'sonarr-scan': {
                    schedule: '0 30 4 * * *',
                },
                'availability-sync': {
                    schedule: '0 * * * *',
                },
                'download-sync': {
                    schedule: '0 * * * * *',
                },
                'download-sync-reset': {
                    schedule: '0 0 1 * * *',
                },
                'jellyfin-recently-added-scan': {
                    schedule: '0 */5 * * * *',
                },
                'jellyfin-full-scan': {
                    schedule: '0 0 3 * * *',
                },
                'image-cache-cleanup': {
                    schedule: '0 0 5 * * *',
                },
                'process-blocklisted-tags': {
                    schedule: '0 30 1 */7 * *',
                },
            },
            network: {
                csrfProtection: false,
                forceIpv4First: false,
                trustProxy: false,
                proxy: {
                    enabled: false,
                    hostname: '',
                    port: 8080,
                    useSsl: false,
                    user: '',
                    password: '',
                    bypassFilter: '',
                    bypassLocalAddresses: true,
                },
                dnsCache: {
                    enabled: false,
                    forceMinTtl: 0,
                    forceMaxTtl: -1,
                },
                apiRequestTimeout: 10000,
            },
            migrations: [],
        };
        if (initialSettings) {
            this.data = mergeSettings(this.data, initialSettings);
        }
    }
    get main() {
        return this.data.main;
    }
    set main(data) {
        this.data.main = mergeSettings(this.data.main, data);
    }
    get plex() {
        return this.data.plex;
    }
    set plex(data) {
        this.data.plex = mergeSettings(this.data.plex, data);
    }
    get jellyfin() {
        return this.data.jellyfin;
    }
    set jellyfin(data) {
        this.data.jellyfin = mergeSettings(this.data.jellyfin, data);
    }
    get tautulli() {
        return this.data.tautulli;
    }
    set tautulli(data) {
        this.data.tautulli = mergeSettings(this.data.tautulli, data);
    }
    get metadataSettings() {
        return this.data.metadataSettings;
    }
    set metadataSettings(data) {
        this.data.metadataSettings = mergeSettings(this.data.metadataSettings, data);
    }
    get radarr() {
        return this.data.radarr;
    }
    set radarr(data) {
        this.data.radarr = data;
    }
    get sonarr() {
        return this.data.sonarr;
    }
    set sonarr(data) {
        this.data.sonarr = data;
    }
    get public() {
        return this.data.public;
    }
    set public(data) {
        this.data.public = mergeSettings(this.data.public, data);
    }
    get fullPublicSettings() {
        return {
            ...this.data.public,
            applicationTitle: this.data.main.applicationTitle,
            applicationUrl: this.data.main.applicationUrl,
            hideAvailable: this.data.main.hideAvailable,
            hideBlocklisted: this.data.main.hideBlocklisted,
            localLogin: this.data.main.localLogin,
            mediaServerLogin: this.data.main.mediaServerLogin,
            jellyfinExternalHost: this.data.jellyfin.externalHostname,
            jellyfinForgotPasswordUrl: this.data.jellyfin.jellyfinForgotPasswordUrl,
            movie4kEnabled: this.data.radarr.some((radarr) => radarr.is4k && radarr.isDefault),
            series4kEnabled: this.data.sonarr.some((sonarr) => sonarr.is4k && sonarr.isDefault),
            discoverRegion: this.data.main.discoverRegion,
            streamingRegion: this.data.main.streamingRegion,
            originalLanguage: this.data.main.originalLanguage,
            mediaServerType: this.main.mediaServerType,
            partialRequestsEnabled: this.data.main.partialRequestsEnabled,
            enableSpecialEpisodes: this.data.main.enableSpecialEpisodes,
            cacheImages: this.data.main.cacheImages,
            vapidPublic: this.vapidPublic,
            enablePushRegistration: this.data.notifications.agents.webpush.enabled,
            locale: this.data.main.locale,
            emailEnabled: this.data.notifications.agents.email.enabled,
            userEmailRequired: this.data.notifications.agents.email.options.userEmailRequired,
            newPlexLogin: this.data.main.newPlexLogin,
            youtubeUrl: this.data.main.youtubeUrl,
            plexClientIdentifier: this.data.clientId,
        };
    }
    get notifications() {
        return this.data.notifications;
    }
    set notifications(data) {
        this.data.notifications = mergeSettings(this.data.notifications, data);
    }
    get jobs() {
        return this.data.jobs;
    }
    set jobs(data) {
        this.data.jobs = mergeSettings(this.data.jobs, data);
    }
    get network() {
        return this.data.network;
    }
    set network(data) {
        this.data.network = mergeSettings(this.data.network, data);
    }
    get migrations() {
        return this.data.migrations;
    }
    set migrations(data) {
        this.data.migrations = data;
    }
    get clientId() {
        return this.data.clientId;
    }
    get sessionSecret() {
        return this.data.sessionSecret;
    }
    get vapidPublic() {
        return this.data.vapidPublic;
    }
    get vapidPrivate() {
        return this.data.vapidPrivate;
    }
    async regenerateApiKey() {
        this.main.apiKey = this.generateApiKey();
        await this.save();
        return this.main;
    }
    generateApiKey() {
        if (process.env.API_KEY) {
            return process.env.API_KEY;
        }
        else {
            return Buffer.from(`${Date.now()}${(0, crypto_1.randomUUID)()}`).toString('base64');
        }
    }
    /**
     * Settings Load
     *
     * This will load settings from file unless an optional argument of the object structure
     * is passed in.
     * @param overrideSettings If passed in, will override all existing settings with these
     * @param raw If true, will load the settings without running migrations or generating missing
     * values
     */
    async load(overrideSettings, raw = false) {
        if (overrideSettings) {
            this.data = overrideSettings;
            return this;
        }
        let data;
        try {
            data = await promises_1.default.readFile(SETTINGS_PATH, 'utf-8');
        }
        catch {
            await this.save();
        }
        let change = false;
        if (data && !raw) {
            const parsedJson = JSON.parse(data);
            const migratedData = await (0, migrator_1.runMigrations)(parsedJson, SETTINGS_PATH);
            const merged = mergeSettings(this.data, migratedData);
            if (JSON.stringify(merged) !== JSON.stringify(migratedData)) {
                change = true;
            }
            this.data = merged;
        }
        else if (data) {
            this.data = JSON.parse(data);
        }
        // generate keys and ids if it's missing
        if (!this.data.main.apiKey) {
            this.data.main.apiKey = this.generateApiKey();
            change = true;
        }
        else if (process.env.API_KEY) {
            if (this.main.apiKey != process.env.API_KEY) {
                this.main.apiKey = process.env.API_KEY;
            }
        }
        if (!this.data.clientId) {
            this.data.clientId = (0, crypto_1.randomUUID)();
            change = true;
        }
        if (!this.data.sessionSecret) {
            this.data.sessionSecret = (0, crypto_1.randomBytes)(32).toString('hex');
            change = true;
        }
        if (!this.data.vapidPublic || !this.data.vapidPrivate) {
            const vapidKeys = web_push_1.default.generateVAPIDKeys();
            this.data.vapidPrivate = vapidKeys.privateKey;
            this.data.vapidPublic = vapidKeys.publicKey;
            change = true;
        }
        if (change) {
            await this.save();
        }
        return this;
    }
    async save() {
        const savePromise = this.saveLock.then(async () => {
            const tmp = SETTINGS_PATH + '.tmp';
            await promises_1.default.writeFile(tmp, JSON.stringify(this.data, undefined, ' '));
            await promises_1.default.rename(tmp, SETTINGS_PATH);
        });
        this.saveLock = savePromise.catch(() => {
            // Keep the chain alive so future saves aren't blocked by past failures
        });
        return savePromise;
    }
}
let settings;
const getSettings = (initialSettings) => {
    if (!settings) {
        settings = new Settings(initialSettings);
    }
    return settings;
};
exports.getSettings = getSettings;
exports.default = Settings;

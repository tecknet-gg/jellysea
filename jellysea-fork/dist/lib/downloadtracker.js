"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const radarr_1 = __importDefault(require("../api/servarr/radarr"));
const sonarr_1 = __importDefault(require("../api/servarr/sonarr"));
const media_1 = require("../constants/media");
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const lodash_1 = require("lodash");
class DownloadTracker {
    constructor() {
        this.radarrServers = {};
        this.sonarrServers = {};
    }
    getMovieProgress(serverId, externalServiceId) {
        if (!this.radarrServers[serverId]) {
            return [];
        }
        return this.radarrServers[serverId].filter((item) => item.externalId === externalServiceId);
    }
    getSeriesProgress(serverId, externalServiceId) {
        if (!this.sonarrServers[serverId]) {
            return [];
        }
        return this.sonarrServers[serverId].filter((item) => item.externalId === externalServiceId);
    }
    async resetDownloadTracker() {
        this.radarrServers = {};
        this.sonarrServers = {};
    }
    updateDownloads() {
        this.updateRadarrDownloads();
        this.updateSonarrDownloads();
    }
    async updateRadarrDownloads() {
        const settings = (0, settings_1.getSettings)();
        // Remove duplicate servers
        const filteredServers = (0, lodash_1.uniqWith)(settings.radarr, (radarrA, radarrB) => {
            return (radarrA.hostname === radarrB.hostname &&
                radarrA.port === radarrB.port &&
                radarrA.baseUrl === radarrB.baseUrl);
        });
        // Load downloads from Radarr servers
        Promise.all(filteredServers.map(async (server) => {
            if (server.syncEnabled) {
                const radarr = new radarr_1.default({
                    apiKey: server.apiKey,
                    url: radarr_1.default.buildUrl(server, '/api/v3'),
                });
                try {
                    await radarr.refreshMonitoredDownloads();
                    const queueItems = await radarr.getQueue();
                    this.radarrServers[server.id] = queueItems.map((item) => ({
                        externalId: item.movieId,
                        estimatedCompletionTime: new Date(item.estimatedCompletionTime),
                        mediaType: media_1.MediaType.MOVIE,
                        size: item.size,
                        sizeLeft: item.sizeleft,
                        status: item.status,
                        timeLeft: item.timeleft,
                        title: item.title,
                        downloadId: item.downloadId,
                    }));
                    if (queueItems.length > 0) {
                        logger_1.default.debug(`Found ${queueItems.length} item(s) in progress on Radarr server: ${server.name}`, { label: 'Download Tracker' });
                    }
                }
                catch {
                    logger_1.default.error(`Unable to get queue from Radarr server: ${server.name}`, {
                        label: 'Download Tracker',
                    });
                }
                // Duplicate this data to matching servers
                const matchingServers = settings.radarr.filter((rs) => rs.hostname === server.hostname &&
                    rs.port === server.port &&
                    rs.baseUrl === server.baseUrl &&
                    rs.id !== server.id);
                if (matchingServers.length > 0) {
                    logger_1.default.debug(`Matching download data to ${matchingServers.length} other Radarr server(s)`, { label: 'Download Tracker' });
                }
                matchingServers.forEach((ms) => {
                    if (ms.syncEnabled) {
                        this.radarrServers[ms.id] = this.radarrServers[server.id];
                    }
                });
            }
        }));
    }
    async updateSonarrDownloads() {
        const settings = (0, settings_1.getSettings)();
        // Remove duplicate servers
        const filteredServers = (0, lodash_1.uniqWith)(settings.sonarr, (sonarrA, sonarrB) => {
            return (sonarrA.hostname === sonarrB.hostname &&
                sonarrA.port === sonarrB.port &&
                sonarrA.baseUrl === sonarrB.baseUrl);
        });
        // Load downloads from Sonarr servers
        Promise.all(filteredServers.map(async (server) => {
            if (server.syncEnabled) {
                const sonarr = new sonarr_1.default({
                    apiKey: server.apiKey,
                    url: sonarr_1.default.buildUrl(server, '/api/v3'),
                });
                try {
                    await sonarr.refreshMonitoredDownloads();
                    const queueItems = await sonarr.getQueue();
                    this.sonarrServers[server.id] = queueItems.map((item) => ({
                        externalId: item.seriesId,
                        estimatedCompletionTime: new Date(item.estimatedCompletionTime),
                        mediaType: media_1.MediaType.TV,
                        size: item.size,
                        sizeLeft: item.sizeleft,
                        status: item.status,
                        timeLeft: item.timeleft,
                        title: item.title,
                        episode: item.episode,
                        downloadId: item.downloadId,
                    }));
                    if (queueItems.length > 0) {
                        logger_1.default.debug(`Found ${queueItems.length} item(s) in progress on Sonarr server: ${server.name}`, { label: 'Download Tracker' });
                    }
                }
                catch {
                    logger_1.default.error(`Unable to get queue from Sonarr server: ${server.name}`, {
                        label: 'Download Tracker',
                    });
                }
                // Duplicate this data to matching servers
                const matchingServers = settings.sonarr.filter((ss) => ss.hostname === server.hostname &&
                    ss.port === server.port &&
                    ss.baseUrl === server.baseUrl &&
                    ss.id !== server.id);
                if (matchingServers.length > 0) {
                    logger_1.default.debug(`Matching download data to ${matchingServers.length} other Sonarr server(s)`, { label: 'Download Tracker' });
                }
                matchingServers.forEach((ms) => {
                    if (ms.syncEnabled) {
                        this.sonarrServers[ms.id] = this.sonarrServers[server.id];
                    }
                });
            }
        }));
    }
}
const downloadTracker = new DownloadTracker();
exports.default = downloadTracker;

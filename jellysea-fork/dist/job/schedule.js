"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startJobs = exports.scheduledJobs = void 0;
const server_1 = require("../constants/server");
const blocklistedTagsProcessor_1 = __importDefault(require("../job/blocklistedTagsProcessor"));
const availabilitySync_1 = __importDefault(require("../lib/availabilitySync"));
const downloadtracker_1 = __importDefault(require("../lib/downloadtracker"));
const imageproxy_1 = __importDefault(require("../lib/imageproxy"));
const refreshToken_1 = __importDefault(require("../lib/refreshToken"));
const jellyfin_1 = require("../lib/scanners/jellyfin");
const plex_1 = require("../lib/scanners/plex");
const radarr_1 = require("../lib/scanners/radarr");
const sonarr_1 = require("../lib/scanners/sonarr");
const settings_1 = require("../lib/settings");
const watchlistsync_1 = __importDefault(require("../lib/watchlistsync"));
const logger_1 = __importDefault(require("../logger"));
const node_schedule_1 = __importDefault(require("node-schedule"));
exports.scheduledJobs = [];
const startJobs = () => {
    const jobs = (0, settings_1.getSettings)().jobs;
    const mediaServerType = (0, settings_1.getSettings)().main.mediaServerType;
    if (mediaServerType === server_1.MediaServerType.PLEX) {
        // Run recently added plex scan every 5 minutes
        exports.scheduledJobs.push({
            id: 'plex-recently-added-scan',
            name: 'Plex Recently Added Scan',
            type: 'process',
            interval: 'minutes',
            cronSchedule: jobs['plex-recently-added-scan'].schedule,
            job: node_schedule_1.default.scheduleJob(jobs['plex-recently-added-scan'].schedule, () => {
                logger_1.default.info('Starting scheduled job: Plex Recently Added Scan', {
                    label: 'Jobs',
                });
                plex_1.plexRecentScanner.run();
            }),
            running: () => plex_1.plexRecentScanner.status().running,
            cancelFn: () => plex_1.plexRecentScanner.cancel(),
        });
        // Run full plex scan every 24 hours
        exports.scheduledJobs.push({
            id: 'plex-full-scan',
            name: 'Plex Full Library Scan',
            type: 'process',
            interval: 'hours',
            cronSchedule: jobs['plex-full-scan'].schedule,
            job: node_schedule_1.default.scheduleJob(jobs['plex-full-scan'].schedule, () => {
                logger_1.default.info('Starting scheduled job: Plex Full Library Scan', {
                    label: 'Jobs',
                });
                plex_1.plexFullScanner.run();
            }),
            running: () => plex_1.plexFullScanner.status().running,
            cancelFn: () => plex_1.plexFullScanner.cancel(),
        });
        exports.scheduledJobs.push({
            id: 'plex-refresh-token',
            name: 'Plex Refresh Token',
            type: 'process',
            interval: 'fixed',
            cronSchedule: jobs['plex-refresh-token'].schedule,
            job: node_schedule_1.default.scheduleJob(jobs['plex-refresh-token'].schedule, () => {
                logger_1.default.info('Starting scheduled job: Plex Refresh Token', {
                    label: 'Jobs',
                });
                refreshToken_1.default.run();
            }),
        });
        // Watchlist Sync
        exports.scheduledJobs.push({
            id: 'plex-watchlist-sync',
            name: 'Plex Watchlist Sync',
            type: 'process',
            interval: 'seconds',
            cronSchedule: jobs['plex-watchlist-sync'].schedule,
            job: node_schedule_1.default.scheduleJob(jobs['plex-watchlist-sync'].schedule, () => {
                logger_1.default.info('Starting scheduled job: Plex Watchlist Sync', {
                    label: 'Jobs',
                });
                watchlistsync_1.default.syncWatchlist().catch((e) => {
                    logger_1.default.error('Failed to sync watchlists', {
                        label: 'Plex Watchlist Sync',
                        errorMessage: e.message,
                    });
                });
            }),
        });
    }
    else if (mediaServerType === server_1.MediaServerType.JELLYFIN ||
        mediaServerType === server_1.MediaServerType.EMBY) {
        // Run recently added jellyfin sync every 5 minutes
        exports.scheduledJobs.push({
            id: 'jellyfin-recently-added-scan',
            name: 'Jellyfin Recently Added Scan',
            type: 'process',
            interval: 'minutes',
            cronSchedule: jobs['jellyfin-recently-added-scan'].schedule,
            job: node_schedule_1.default.scheduleJob(jobs['jellyfin-recently-added-scan'].schedule, () => {
                logger_1.default.info('Starting scheduled job: Jellyfin Recently Added Scan', {
                    label: 'Jobs',
                });
                jellyfin_1.jellyfinRecentScanner.run();
            }),
            running: () => jellyfin_1.jellyfinRecentScanner.status().running,
            cancelFn: () => jellyfin_1.jellyfinRecentScanner.cancel(),
        });
        // Run full jellyfin sync every 24 hours
        exports.scheduledJobs.push({
            id: 'jellyfin-full-scan',
            name: 'Jellyfin Full Library Scan',
            type: 'process',
            interval: 'hours',
            cronSchedule: jobs['jellyfin-full-scan'].schedule,
            job: node_schedule_1.default.scheduleJob(jobs['jellyfin-full-scan'].schedule, () => {
                logger_1.default.info('Starting scheduled job: Jellyfin Full Scan', {
                    label: 'Jobs',
                });
                jellyfin_1.jellyfinFullScanner.run();
            }),
            running: () => jellyfin_1.jellyfinFullScanner.status().running,
            cancelFn: () => jellyfin_1.jellyfinFullScanner.cancel(),
        });
    }
    // Run full radarr scan every 24 hours
    exports.scheduledJobs.push({
        id: 'radarr-scan',
        name: 'Radarr Scan',
        type: 'process',
        interval: 'hours',
        cronSchedule: jobs['radarr-scan'].schedule,
        job: node_schedule_1.default.scheduleJob(jobs['radarr-scan'].schedule, () => {
            logger_1.default.info('Starting scheduled job: Radarr Scan', { label: 'Jobs' });
            radarr_1.radarrScanner.run();
        }),
        running: () => radarr_1.radarrScanner.status().running,
        cancelFn: () => radarr_1.radarrScanner.cancel(),
    });
    // Run full sonarr scan every 24 hours
    exports.scheduledJobs.push({
        id: 'sonarr-scan',
        name: 'Sonarr Scan',
        type: 'process',
        interval: 'hours',
        cronSchedule: jobs['sonarr-scan'].schedule,
        job: node_schedule_1.default.scheduleJob(jobs['sonarr-scan'].schedule, () => {
            logger_1.default.info('Starting scheduled job: Sonarr Scan', { label: 'Jobs' });
            sonarr_1.sonarrScanner.run();
        }),
        running: () => sonarr_1.sonarrScanner.status().running,
        cancelFn: () => sonarr_1.sonarrScanner.cancel(),
    });
    // Checks if media is still available in plex/sonarr/radarr libs
    exports.scheduledJobs.push({
        id: 'availability-sync',
        name: 'Media Availability Sync',
        type: 'process',
        interval: 'hours',
        cronSchedule: jobs['availability-sync'].schedule,
        job: node_schedule_1.default.scheduleJob(jobs['availability-sync'].schedule, () => {
            logger_1.default.info('Starting scheduled job: Media Availability Sync', {
                label: 'Jobs',
            });
            availabilitySync_1.default.run();
        }),
        running: () => availabilitySync_1.default.running,
        cancelFn: () => availabilitySync_1.default.cancel(),
    });
    // Run download sync every minute
    exports.scheduledJobs.push({
        id: 'download-sync',
        name: 'Download Sync',
        type: 'command',
        interval: 'seconds',
        cronSchedule: jobs['download-sync'].schedule,
        job: node_schedule_1.default.scheduleJob(jobs['download-sync'].schedule, () => {
            logger_1.default.debug('Starting scheduled job: Download Sync', {
                label: 'Jobs',
            });
            downloadtracker_1.default.updateDownloads();
        }),
    });
    // Reset download sync everyday at 01:00 am
    exports.scheduledJobs.push({
        id: 'download-sync-reset',
        name: 'Download Sync Reset',
        type: 'command',
        interval: 'hours',
        cronSchedule: jobs['download-sync-reset'].schedule,
        job: node_schedule_1.default.scheduleJob(jobs['download-sync-reset'].schedule, () => {
            logger_1.default.info('Starting scheduled job: Download Sync Reset', {
                label: 'Jobs',
            });
            downloadtracker_1.default.resetDownloadTracker();
        }),
    });
    // Run image cache cleanup every 24 hours
    exports.scheduledJobs.push({
        id: 'image-cache-cleanup',
        name: 'Image Cache Cleanup',
        type: 'process',
        interval: 'hours',
        cronSchedule: jobs['image-cache-cleanup'].schedule,
        job: node_schedule_1.default.scheduleJob(jobs['image-cache-cleanup'].schedule, () => {
            logger_1.default.info('Starting scheduled job: Image Cache Cleanup', {
                label: 'Jobs',
            });
            // Clean TMDB image cache
            imageproxy_1.default.clearCache('tmdb');
            // Clean users avatar image cache
            imageproxy_1.default.clearCache('avatar');
        }),
    });
    exports.scheduledJobs.push({
        id: 'process-blocklisted-tags',
        name: 'Process Blocklisted Tags',
        type: 'process',
        interval: 'days',
        cronSchedule: jobs['process-blocklisted-tags'].schedule,
        job: node_schedule_1.default.scheduleJob(jobs['process-blocklisted-tags'].schedule, () => {
            logger_1.default.info('Starting scheduled job: Process Blocklisted Tags', {
                label: 'Jobs',
            });
            blocklistedTagsProcessor_1.default.run();
        }),
        running: () => blocklistedTagsProcessor_1.default.status().running,
        cancelFn: () => blocklistedTagsProcessor_1.default.cancel(),
    });
    logger_1.default.info('Scheduled jobs loaded', { label: 'Jobs' });
};
exports.startJobs = startJobs;

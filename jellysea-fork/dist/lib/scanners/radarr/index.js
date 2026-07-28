"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.radarrScanner = void 0;
const radarr_1 = __importDefault(require("../../../api/servarr/radarr"));
const media_1 = require("../../../constants/media");
const datasource_1 = require("../../../datasource");
const Media_1 = __importDefault(require("../../../entity/Media"));
const baseScanner_1 = __importDefault(require("../../../lib/scanners/baseScanner"));
const settings_1 = require("../../../lib/settings");
const lodash_1 = require("lodash");
class RadarrScanner extends baseScanner_1.default {
    constructor() {
        super('Radarr Scan', { bundleSize: 50 });
        this.scannedTmdbIds = new Set();
        this.scanned4kTmdbIds = new Set();
        this.didScanStandard = false;
        this.didScan4k = false;
        this.serverReturnedEmpty = false;
        this.server4kReturnedEmpty = false;
    }
    status() {
        return {
            running: this.running,
            progress: this.progress,
            total: this.items.length,
            currentServer: this.currentServer,
            servers: this.servers,
        };
    }
    async run() {
        const settings = (0, settings_1.getSettings)();
        const sessionId = this.startRun();
        this.scannedTmdbIds.clear();
        this.scanned4kTmdbIds.clear();
        this.didScanStandard = false;
        this.didScan4k = false;
        this.serverReturnedEmpty = false;
        this.server4kReturnedEmpty = false;
        try {
            this.servers = (0, lodash_1.uniqWith)(settings.radarr, (radarrA, radarrB) => {
                return (radarrA.hostname === radarrB.hostname &&
                    radarrA.port === radarrB.port &&
                    radarrA.baseUrl === radarrB.baseUrl);
            });
            for (const server of this.servers) {
                this.currentServer = server;
                if (server.syncEnabled) {
                    this.log(`Beginning to process Radarr server: ${server.name}`, 'info');
                    this.radarrApi = new radarr_1.default({
                        apiKey: server.apiKey,
                        url: radarr_1.default.buildUrl(server, '/api/v3'),
                    });
                    this.items = await this.radarrApi.getMovies();
                    const server4k = this.enable4kMovie && server.is4k;
                    if (server4k) {
                        this.didScan4k = true;
                    }
                    else {
                        this.didScanStandard = true;
                    }
                    if (this.items.length === 0) {
                        if (server4k) {
                            this.server4kReturnedEmpty = true;
                        }
                        else {
                            this.serverReturnedEmpty = true;
                        }
                        this.log(`Radarr server ${server.name} returned no movies. Orphan cleanup for this profile type will be skipped.`, 'warn');
                    }
                    await this.loop(this.processRadarrMovie.bind(this), { sessionId });
                }
                else {
                    this.log(`Sync not enabled. Skipping Radarr server: ${server.name}`);
                }
            }
            // Only run cleanup if all servers of this profile type have sync enabled.
            // If any server is skipped, we can't distinguish truly orphaned media from
            // media that exists on an unscanned server (e.g. separate instances for
            // anime, regional content, or different languages).
            const allStandardScanned = this.servers
                .filter((s) => !this.enable4kMovie || !s.is4k)
                .every((s) => s.syncEnabled);
            const all4kScanned = this.servers
                .filter((s) => this.enable4kMovie && s.is4k)
                .every((s) => s.syncEnabled);
            if (!allStandardScanned) {
                this.didScanStandard = false;
            }
            if (!all4kScanned) {
                this.didScan4k = false;
            }
            if (this.serverReturnedEmpty) {
                this.didScanStandard = false;
            }
            if (this.server4kReturnedEmpty) {
                this.didScan4k = false;
            }
            await this.cleanupOrphanedMovies();
            this.log('Radarr scan complete', 'info');
        }
        catch (e) {
            this.log('Scan interrupted', 'error', { errorMessage: e.message });
        }
        finally {
            this.endRun(sessionId);
        }
    }
    async processRadarrMovie(radarrMovie) {
        const server4k = this.enable4kMovie && this.currentServer.is4k;
        if (server4k) {
            this.scanned4kTmdbIds.add(radarrMovie.tmdbId);
        }
        else {
            this.scannedTmdbIds.add(radarrMovie.tmdbId);
        }
        try {
            await this.processMovie(radarrMovie.tmdbId, {
                is4k: server4k,
                serviceId: this.currentServer.id,
                externalServiceId: radarrMovie.id,
                externalServiceSlug: radarrMovie.titleSlug,
                title: radarrMovie.title,
                processing: !radarrMovie.hasFile && radarrMovie.monitored,
                hasFile: radarrMovie.hasFile,
            });
        }
        catch (e) {
            this.log('Failed to process Radarr media', 'error', {
                errorMessage: e.message,
                title: radarrMovie.title,
            });
        }
    }
    async cleanupOrphanedMovies() {
        const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
        if (this.didScanStandard) {
            const processingMovies = await mediaRepository.find({
                where: { mediaType: media_1.MediaType.MOVIE, status: media_1.MediaStatus.PROCESSING },
                relations: { requests: true },
            });
            for (const media of processingMovies) {
                if (!this.scannedTmdbIds.has(media.tmdbId)) {
                    media.status = media_1.MediaStatus.UNKNOWN;
                    await mediaRepository.save(media);
                    await this.declineOrphanedRequests(media, false);
                    this.log(`Movie ${media.tmdbId} not found in any Radarr server. Status reset to UNKNOWN.`, 'info');
                }
            }
        }
        else {
            this.log('Skipping orphaned movie cleanup: no standard Radarr servers were scanned.', 'info');
        }
        if (this.didScan4k) {
            const processing4kMovies = await mediaRepository.find({
                where: {
                    mediaType: media_1.MediaType.MOVIE,
                    status4k: media_1.MediaStatus.PROCESSING,
                },
                relations: { requests: true },
            });
            for (const media of processing4kMovies) {
                if (!this.scanned4kTmdbIds.has(media.tmdbId)) {
                    media.status4k = media_1.MediaStatus.UNKNOWN;
                    await mediaRepository.save(media);
                    await this.declineOrphanedRequests(media, true);
                    this.log(`Movie ${media.tmdbId} not found in any 4K Radarr server. 4K status reset to UNKNOWN.`, 'info');
                }
            }
        }
        else if (this.enable4kMovie) {
            this.log('Skipping orphaned 4K movie cleanup: no 4K Radarr servers were scanned.', 'info');
        }
    }
}
exports.radarrScanner = new RadarrScanner();

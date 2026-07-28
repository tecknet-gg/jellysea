"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sonarrScanner = void 0;
const metadata_1 = require("../../../api/metadata");
const sonarr_1 = __importDefault(require("../../../api/servarr/sonarr"));
const themoviedb_1 = __importDefault(require("../../../api/themoviedb"));
const constants_1 = require("../../../api/themoviedb/constants");
const media_1 = require("../../../constants/media");
const datasource_1 = require("../../../datasource");
const Media_1 = __importDefault(require("../../../entity/Media"));
const baseScanner_1 = __importDefault(require("../../../lib/scanners/baseScanner"));
const settings_1 = require("../../../lib/settings");
const lodash_1 = require("lodash");
class SonarrScanner extends baseScanner_1.default {
    constructor() {
        super('Sonarr Scan', { bundleSize: 50 });
        this.scannedTvdbIds = new Set();
        this.scanned4kTvdbIds = new Set();
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
        this.scannedTvdbIds.clear();
        this.scanned4kTvdbIds.clear();
        this.didScanStandard = false;
        this.didScan4k = false;
        this.serverReturnedEmpty = false;
        this.server4kReturnedEmpty = false;
        try {
            this.servers = (0, lodash_1.uniqWith)(settings.sonarr, (sonarrA, sonarrB) => {
                return (sonarrA.hostname === sonarrB.hostname &&
                    sonarrA.port === sonarrB.port &&
                    sonarrA.baseUrl === sonarrB.baseUrl);
            });
            for (const server of this.servers) {
                this.currentServer = server;
                if (server.syncEnabled) {
                    this.log(`Beginning to process Sonarr server: ${server.name}`, 'info');
                    this.sonarrApi = new sonarr_1.default({
                        apiKey: server.apiKey,
                        url: sonarr_1.default.buildUrl(server, '/api/v3'),
                    });
                    this.items = await this.sonarrApi.getSeries();
                    const server4k = this.enable4kShow && server.is4k;
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
                        this.log(`Sonarr server ${server.name} returned no series. Orphan cleanup for this profile type will be skipped.`, 'warn');
                    }
                    await this.loop(this.processSonarrSeries.bind(this), { sessionId });
                }
                else {
                    this.log(`Sync not enabled. Skipping Sonarr server: ${server.name}`);
                }
            }
            // Only run cleanup if all servers of this profile type have sync enabled.
            // If any server is skipped, we can't distinguish truly orphaned media from
            // media that exists on an unscanned server (e.g. separate instances for
            // anime, regional content, or different languages).
            const allStandardScanned = this.servers
                .filter((s) => !this.enable4kShow || !s.is4k)
                .every((s) => s.syncEnabled);
            const all4kScanned = this.servers
                .filter((s) => this.enable4kShow && s.is4k)
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
            await this.cleanupOrphanedShows();
            this.log('Sonarr scan complete', 'info');
        }
        catch (e) {
            this.log('Scan interrupted', 'error', { errorMessage: e.message });
        }
        finally {
            this.endRun(sessionId);
        }
    }
    async processSonarrSeries(sonarrSeries) {
        const server4k = this.enable4kShow && this.currentServer.is4k;
        if (server4k) {
            this.scanned4kTvdbIds.add(sonarrSeries.tvdbId);
        }
        else {
            this.scannedTvdbIds.add(sonarrSeries.tvdbId);
        }
        try {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const processableSeasons = [];
            let tvShow;
            const media = await mediaRepository.findOne({
                where: { tvdbId: sonarrSeries.tvdbId },
            });
            if (!media || !media.tmdbId) {
                tvShow = await this.tmdb.getShowByTvdbId({
                    tvdbId: sonarrSeries.tvdbId,
                });
            }
            else {
                tvShow = await this.tmdb.getTvShow({ tvId: media.tmdbId });
            }
            const tmdbId = tvShow.id;
            const metadataProvider = tvShow.keywords.results.some((keyword) => keyword.id === constants_1.ANIME_KEYWORD_ID)
                ? await (0, metadata_1.getMetadataProvider)('anime')
                : await (0, metadata_1.getMetadataProvider)('tv');
            if (!(metadataProvider instanceof themoviedb_1.default)) {
                tvShow = await metadataProvider.getTvShow({ tvId: tmdbId });
            }
            const settings = (0, settings_1.getSettings)();
            const filteredSeasons = tvShow.seasons
                .filter((sn) => settings.main.enableSpecialEpisodes || sn.season_number !== 0)
                .map((season) => {
                const sonarrSeason = sonarrSeries.seasons.find((s) => s.seasonNumber === season.season_number);
                if (!sonarrSeason) {
                    return {
                        seasonNumber: season.season_number,
                        episodeCount: season.episode_count,
                        monitored: false,
                        statistics: {
                            episodeFileCount: 0,
                            totalEpisodeCount: season.episode_count,
                        },
                    };
                }
                else {
                    return sonarrSeason;
                }
            });
            for (const season of filteredSeasons) {
                const totalAvailableEpisodes = season.statistics?.episodeFileCount ?? 0;
                processableSeasons.push({
                    seasonNumber: season.seasonNumber,
                    episodes: !server4k ? totalAvailableEpisodes : 0,
                    episodes4k: server4k ? totalAvailableEpisodes : 0,
                    totalEpisodes: season.statistics?.totalEpisodeCount ?? 0,
                    processing: season.monitored && totalAvailableEpisodes === 0,
                    is4kOverride: server4k,
                });
            }
            await this.processShow(tmdbId, sonarrSeries.tvdbId, processableSeasons, {
                serviceId: this.currentServer.id,
                externalServiceId: sonarrSeries.id,
                externalServiceSlug: sonarrSeries.titleSlug,
                title: sonarrSeries.title,
                is4k: server4k,
            });
        }
        catch (e) {
            this.log('Failed to process Sonarr media', 'error', {
                errorMessage: e.message,
                title: sonarrSeries.title,
            });
        }
    }
    async cleanupOrphanedShows() {
        const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
        if (this.didScanStandard) {
            const processingShows = await mediaRepository.find({
                where: { mediaType: media_1.MediaType.TV, status: media_1.MediaStatus.PROCESSING },
                relations: { seasons: true, requests: true },
            });
            for (const media of processingShows) {
                if (media.tvdbId && !this.scannedTvdbIds.has(media.tvdbId)) {
                    media.status = media_1.MediaStatus.UNKNOWN;
                    for (const season of media.seasons) {
                        if (season.status === media_1.MediaStatus.PROCESSING) {
                            season.status = media_1.MediaStatus.UNKNOWN;
                        }
                    }
                    await mediaRepository.save(media);
                    await this.declineOrphanedRequests(media, false);
                    this.log(`Show ${media.tmdbId} (tvdb: ${media.tvdbId}) not found in any Sonarr server. Status reset to UNKNOWN.`, 'info');
                }
            }
        }
        else {
            this.log('Skipping orphaned show cleanup: no standard Sonarr servers were scanned.', 'info');
        }
        if (this.didScan4k) {
            const processing4kShows = await mediaRepository.find({
                where: { mediaType: media_1.MediaType.TV, status4k: media_1.MediaStatus.PROCESSING },
                relations: { seasons: true, requests: true },
            });
            for (const media of processing4kShows) {
                if (media.tvdbId && !this.scanned4kTvdbIds.has(media.tvdbId)) {
                    media.status4k = media_1.MediaStatus.UNKNOWN;
                    for (const season of media.seasons) {
                        if (season.status4k === media_1.MediaStatus.PROCESSING) {
                            season.status4k = media_1.MediaStatus.UNKNOWN;
                        }
                    }
                    await mediaRepository.save(media);
                    await this.declineOrphanedRequests(media, true);
                    this.log(`Show ${media.tmdbId} (tvdb: ${media.tvdbId}) not found in any 4K Sonarr server. 4K status reset to UNKNOWN.`, 'info');
                }
            }
        }
        else if (this.enable4kShow) {
            this.log('Skipping orphaned 4K show cleanup: no 4K Sonarr servers were scanned.', 'info');
        }
    }
}
exports.sonarrScanner = new SonarrScanner();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const themoviedb_1 = __importDefault(require("../../api/themoviedb"));
const media_1 = require("../../constants/media");
const datasource_1 = require("../../datasource");
const Media_1 = __importDefault(require("../../entity/Media"));
const MediaRequest_1 = __importDefault(require("../../entity/MediaRequest"));
const Season_1 = __importDefault(require("../../entity/Season"));
const settings_1 = require("../../lib/settings");
const logger_1 = __importDefault(require("../../logger"));
const asyncLock_1 = __importDefault(require("../../utils/asyncLock"));
const crypto_1 = require("crypto");
// Default scan rates (can be overidden)
const BUNDLE_SIZE = 20;
const UPDATE_RATE = 4 * 1000;
class BaseScanner {
    constructor(scannerName, { updateRate, bundleSize, } = {}) {
        this.progress = 0;
        this.items = [];
        this.totalSize = 0;
        this.enable4kMovie = false;
        this.enable4kShow = false;
        this.running = false;
        this.asyncLock = new asyncLock_1.default();
        this.tmdb = new themoviedb_1.default();
        this.scannerName = scannerName;
        this.bundleSize = bundleSize ?? BUNDLE_SIZE;
        this.updateRate = updateRate ?? UPDATE_RATE;
    }
    async getExisting(tmdbId, mediaType) {
        const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
        const existing = await mediaRepository.findOne({
            where: { tmdbId: tmdbId, mediaType },
        });
        return existing;
    }
    async processMovie(tmdbId, { is4k = false, mediaAddedAt, ratingKey, jellyfinMediaId, imdbId, serviceId, externalServiceId, externalServiceSlug, processing = false, title = 'Unknown Title', hasFile = true, } = {}) {
        const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
        await this.asyncLock.dispatch(tmdbId, async () => {
            const existing = await this.getExisting(tmdbId, media_1.MediaType.MOVIE);
            if (existing) {
                let changedExisting = false;
                if (existing[is4k ? 'status4k' : 'status'] !== media_1.MediaStatus.AVAILABLE) {
                    const statusField = is4k ? 'status4k' : 'status';
                    const previousStatus = existing[statusField];
                    existing[statusField] =
                        !processing && hasFile
                            ? media_1.MediaStatus.AVAILABLE
                            : !processing &&
                                !hasFile &&
                                previousStatus === media_1.MediaStatus.PROCESSING
                                ? media_1.MediaStatus.UNKNOWN
                                : processing
                                    ? previousStatus === media_1.MediaStatus.DELETED
                                        ? media_1.MediaStatus.DELETED
                                        : media_1.MediaStatus.PROCESSING
                                    : previousStatus;
                    if (existing[statusField] !== previousStatus) {
                        if (mediaAddedAt) {
                            existing.mediaAddedAt = mediaAddedAt;
                        }
                        changedExisting = true;
                    }
                }
                if (!changedExisting && !existing.mediaAddedAt && mediaAddedAt) {
                    existing.mediaAddedAt = mediaAddedAt;
                    changedExisting = true;
                }
                if (ratingKey &&
                    existing[is4k ? 'ratingKey4k' : 'ratingKey'] !== ratingKey) {
                    existing[is4k ? 'ratingKey4k' : 'ratingKey'] = ratingKey;
                    changedExisting = true;
                }
                if (jellyfinMediaId &&
                    existing[is4k ? 'jellyfinMediaId4k' : 'jellyfinMediaId'] !==
                        jellyfinMediaId) {
                    existing[is4k ? 'jellyfinMediaId4k' : 'jellyfinMediaId'] =
                        jellyfinMediaId;
                    changedExisting = true;
                }
                if (imdbId && !existing.imdbId) {
                    existing.imdbId = imdbId;
                    changedExisting = true;
                }
                if (serviceId !== undefined &&
                    existing[is4k ? 'serviceId4k' : 'serviceId'] !== serviceId) {
                    existing[is4k ? 'serviceId4k' : 'serviceId'] = serviceId;
                    changedExisting = true;
                }
                if (externalServiceId !== undefined &&
                    existing[is4k ? 'externalServiceId4k' : 'externalServiceId'] !==
                        externalServiceId) {
                    existing[is4k ? 'externalServiceId4k' : 'externalServiceId'] =
                        externalServiceId;
                    changedExisting = true;
                }
                if (externalServiceSlug !== undefined &&
                    existing[is4k ? 'externalServiceSlug4k' : 'externalServiceSlug'] !==
                        externalServiceSlug) {
                    existing[is4k ? 'externalServiceSlug4k' : 'externalServiceSlug'] =
                        externalServiceSlug;
                    changedExisting = true;
                }
                if (changedExisting) {
                    await mediaRepository.save(existing);
                    this.log(`Media for ${title} exists. Changes were detected and the title will be updated.`, 'info');
                }
                else {
                    this.log(`Title already exists and no changes detected for ${title}`);
                }
            }
            else {
                if (!processing && !hasFile) {
                    return;
                }
                const newMedia = new Media_1.default();
                newMedia.tmdbId = tmdbId;
                newMedia.imdbId = imdbId;
                newMedia.status =
                    !is4k && !processing
                        ? media_1.MediaStatus.AVAILABLE
                        : !is4k && processing
                            ? media_1.MediaStatus.PROCESSING
                            : media_1.MediaStatus.UNKNOWN;
                newMedia.status4k =
                    is4k && this.enable4kMovie && !processing
                        ? media_1.MediaStatus.AVAILABLE
                        : is4k && this.enable4kMovie && processing
                            ? media_1.MediaStatus.PROCESSING
                            : media_1.MediaStatus.UNKNOWN;
                newMedia.mediaType = media_1.MediaType.MOVIE;
                newMedia.serviceId = !is4k ? serviceId : undefined;
                newMedia.serviceId4k = is4k ? serviceId : undefined;
                newMedia.externalServiceId = !is4k ? externalServiceId : undefined;
                newMedia.externalServiceId4k = is4k ? externalServiceId : undefined;
                newMedia.externalServiceSlug = !is4k ? externalServiceSlug : undefined;
                newMedia.externalServiceSlug4k = is4k ? externalServiceSlug : undefined;
                if (mediaAddedAt) {
                    newMedia.mediaAddedAt = mediaAddedAt;
                }
                if (ratingKey) {
                    newMedia.ratingKey = !is4k ? ratingKey : undefined;
                    newMedia.ratingKey4k =
                        is4k && this.enable4kMovie ? ratingKey : undefined;
                }
                if (jellyfinMediaId) {
                    newMedia.jellyfinMediaId = !is4k ? jellyfinMediaId : undefined;
                    newMedia.jellyfinMediaId4k =
                        is4k && this.enable4kMovie ? jellyfinMediaId : undefined;
                }
                await mediaRepository.save(newMedia);
                this.log(`Saved new media: ${title}`);
            }
        });
    }
    /**
     * processShow takes a TMDB ID and an array of ProcessableSeasons, which
     * should include the total episodes a sesaon has + the total available
     * episodes that each season currently has. Unlike processMovie, this method
     * does not take an `is4k` option. We handle both the 4k _and_ non 4k status
     * in one method.
     *
     * Note: If 4k is not enable, ProcessableSeasons should combine their episode counts
     * into the normal episodes properties and avoid using the 4k properties.
     */
    async processShow(tmdbId, tvdbId, seasons, { mediaAddedAt, ratingKey, jellyfinMediaId, serviceId, externalServiceId, externalServiceSlug, is4k = false, title = 'Unknown Title', } = {}) {
        const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
        await this.asyncLock.dispatch(tmdbId, async () => {
            const media = await this.getExisting(tmdbId, media_1.MediaType.TV);
            const newSeasons = [];
            const currentStandardSeasonsAvailable = (media?.seasons.filter((season) => season.status === media_1.MediaStatus.AVAILABLE) ?? []).length;
            const current4kSeasonsAvailable = (media?.seasons.filter((season) => season.status4k === media_1.MediaStatus.AVAILABLE) ?? []).length;
            for (const season of seasons) {
                const existingSeason = media?.seasons.find((es) => es.seasonNumber === season.seasonNumber);
                // We update the rating keys and jellyfinMediaId in the seasons loop because we need episode counts
                if (media && season.episodes > 0 && media.ratingKey !== ratingKey) {
                    media.ratingKey = ratingKey;
                }
                if (media &&
                    season.episodes4k > 0 &&
                    this.enable4kShow &&
                    media.ratingKey4k !== ratingKey) {
                    media.ratingKey4k = ratingKey;
                }
                if (media &&
                    season.episodes > 0 &&
                    media.jellyfinMediaId !== jellyfinMediaId) {
                    media.jellyfinMediaId = jellyfinMediaId;
                }
                if (media &&
                    season.episodes4k > 0 &&
                    this.enable4kShow &&
                    media.jellyfinMediaId4k !== jellyfinMediaId) {
                    media.jellyfinMediaId4k = jellyfinMediaId;
                }
                if (existingSeason) {
                    // Here we update seasons if they already exist.
                    // If the season is already marked as available, we
                    // force it to stay available (to avoid competing scanners)
                    existingSeason.status =
                        (season.totalEpisodes === season.episodes && season.episodes > 0) ||
                            existingSeason.status === media_1.MediaStatus.AVAILABLE
                            ? media_1.MediaStatus.AVAILABLE
                            : season.episodes > 0
                                ? media_1.MediaStatus.PARTIALLY_AVAILABLE
                                : !season.is4kOverride &&
                                    season.processing &&
                                    existingSeason.status !== media_1.MediaStatus.DELETED
                                    ? media_1.MediaStatus.PROCESSING
                                    : !season.is4kOverride &&
                                        !season.processing &&
                                        season.episodes === 0 &&
                                        existingSeason.status === media_1.MediaStatus.PROCESSING
                                        ? media_1.MediaStatus.UNKNOWN
                                        : existingSeason.status;
                    // Same thing here, except we only do updates if 4k is enabled
                    existingSeason.status4k =
                        (this.enable4kShow &&
                            season.episodes4k === season.totalEpisodes &&
                            season.episodes4k > 0) ||
                            existingSeason.status4k === media_1.MediaStatus.AVAILABLE
                            ? media_1.MediaStatus.AVAILABLE
                            : this.enable4kShow && season.episodes4k > 0
                                ? media_1.MediaStatus.PARTIALLY_AVAILABLE
                                : season.is4kOverride &&
                                    season.processing &&
                                    existingSeason.status4k !== media_1.MediaStatus.DELETED
                                    ? media_1.MediaStatus.PROCESSING
                                    : season.is4kOverride &&
                                        !season.processing &&
                                        season.episodes4k === 0 &&
                                        existingSeason.status4k === media_1.MediaStatus.PROCESSING
                                        ? media_1.MediaStatus.UNKNOWN
                                        : existingSeason.status4k;
                }
                else {
                    newSeasons.push(new Season_1.default({
                        seasonNumber: season.seasonNumber,
                        status: season.totalEpisodes === season.episodes && season.episodes > 0
                            ? media_1.MediaStatus.AVAILABLE
                            : season.episodes > 0
                                ? media_1.MediaStatus.PARTIALLY_AVAILABLE
                                : !season.is4kOverride && season.processing
                                    ? media_1.MediaStatus.PROCESSING
                                    : media_1.MediaStatus.UNKNOWN,
                        status4k: this.enable4kShow &&
                            season.totalEpisodes === season.episodes4k &&
                            season.episodes4k > 0
                            ? media_1.MediaStatus.AVAILABLE
                            : this.enable4kShow && season.episodes4k > 0
                                ? media_1.MediaStatus.PARTIALLY_AVAILABLE
                                : season.is4kOverride && season.processing
                                    ? media_1.MediaStatus.PROCESSING
                                    : media_1.MediaStatus.UNKNOWN,
                    }));
                }
            }
            if (media) {
                media.seasons = [...media.seasons, ...newSeasons];
                const newStandardSeasonsAvailable = (media.seasons.filter((season) => season.status === media_1.MediaStatus.AVAILABLE) ?? []).length;
                const new4kSeasonsAvailable = (media.seasons.filter((season) => season.status4k === media_1.MediaStatus.AVAILABLE) ?? []).length;
                // If at least one new season has become available, update
                // the lastSeasonChange field so we can trigger notifications
                if (newStandardSeasonsAvailable > currentStandardSeasonsAvailable) {
                    this.log(`Detected ${newStandardSeasonsAvailable - currentStandardSeasonsAvailable} new standard season(s) for ${title}`, 'debug');
                    media.lastSeasonChange = new Date();
                    if (mediaAddedAt) {
                        media.mediaAddedAt = mediaAddedAt;
                    }
                }
                if (new4kSeasonsAvailable > current4kSeasonsAvailable) {
                    this.log(`Detected ${new4kSeasonsAvailable - current4kSeasonsAvailable} new 4K season(s) for ${title}`, 'debug');
                    media.lastSeasonChange = new Date();
                }
                if (!media.mediaAddedAt && mediaAddedAt) {
                    media.mediaAddedAt = mediaAddedAt;
                }
                if (serviceId !== undefined) {
                    media[is4k ? 'serviceId4k' : 'serviceId'] = serviceId;
                }
                if (externalServiceId !== undefined) {
                    media[is4k ? 'externalServiceId4k' : 'externalServiceId'] =
                        externalServiceId;
                }
                if (externalServiceSlug !== undefined) {
                    media[is4k ? 'externalServiceSlug4k' : 'externalServiceSlug'] =
                        externalServiceSlug;
                }
                const nonSpecialSeasons = media.seasons.filter((s) => s.seasonNumber !== 0);
                // DB-only seasons block the rollup unless UNKNOWN (orphan placeholders
                // can never be revisited by a scan and would pin the show forever).
                const countsTowardsRollup = (s, statusKey) => {
                    const scannedSeason = seasons.find((season) => season.seasonNumber === s.seasonNumber);
                    if (scannedSeason) {
                        return scannedSeason.totalEpisodes > 0;
                    }
                    return s[statusKey] !== media_1.MediaStatus.UNKNOWN;
                };
                const standardSeasonsForRollup = nonSpecialSeasons.filter((s) => countsTowardsRollup(s, 'status'));
                const isAllStandardSeasonsAvailable = standardSeasonsForRollup.length > 0 &&
                    standardSeasonsForRollup.every((s) => s.status === media_1.MediaStatus.AVAILABLE);
                const seasons4kForRollup = nonSpecialSeasons.filter((s) => countsTowardsRollup(s, 'status4k'));
                const isAll4kSeasonsAvailable = seasons4kForRollup.length > 0 &&
                    seasons4kForRollup.every((s) => s.status4k === media_1.MediaStatus.AVAILABLE);
                media.status = isAllStandardSeasonsAvailable
                    ? media_1.MediaStatus.AVAILABLE
                    : media.seasons.some((season) => season.status === media_1.MediaStatus.PARTIALLY_AVAILABLE ||
                        season.status === media_1.MediaStatus.AVAILABLE)
                        ? media_1.MediaStatus.PARTIALLY_AVAILABLE
                        : (!seasons.length && media.status !== media_1.MediaStatus.DELETED) ||
                            media.seasons.some((season) => season.status === media_1.MediaStatus.PROCESSING)
                            ? media_1.MediaStatus.PROCESSING
                            : media.status === media_1.MediaStatus.DELETED
                                ? media_1.MediaStatus.DELETED
                                : media_1.MediaStatus.UNKNOWN;
                media.status4k =
                    isAll4kSeasonsAvailable && this.enable4kShow
                        ? media_1.MediaStatus.AVAILABLE
                        : this.enable4kShow &&
                            media.seasons.some((season) => season.status4k === media_1.MediaStatus.PARTIALLY_AVAILABLE ||
                                season.status4k === media_1.MediaStatus.AVAILABLE)
                            ? media_1.MediaStatus.PARTIALLY_AVAILABLE
                            : (!seasons.length && media.status4k !== media_1.MediaStatus.DELETED) ||
                                media.seasons.some((season) => season.status4k === media_1.MediaStatus.PROCESSING)
                                ? media_1.MediaStatus.PROCESSING
                                : media.status4k === media_1.MediaStatus.DELETED
                                    ? media_1.MediaStatus.DELETED
                                    : media_1.MediaStatus.UNKNOWN;
                await mediaRepository.save(media);
                this.log(`Updating existing title: ${title}`);
            }
            else {
                // For new media, check actual newSeasons objects instead of scanner
                // input to determine overall availability status
                const nonSpecialNewSeasons = newSeasons.filter((s) => s.seasonNumber !== 0);
                const newSeasonsForRollup = nonSpecialNewSeasons.filter((s) => (seasons.find((season) => season.seasonNumber === s.seasonNumber)
                    ?.totalEpisodes ?? 0) > 0);
                const isAllStandardSeasonsAvailable = newSeasonsForRollup.length > 0 &&
                    newSeasonsForRollup.every((s) => s.status === media_1.MediaStatus.AVAILABLE);
                const isAll4kSeasonsAvailable = newSeasonsForRollup.length > 0 &&
                    newSeasonsForRollup.every((s) => s.status4k === media_1.MediaStatus.AVAILABLE);
                const newMedia = new Media_1.default({
                    mediaType: media_1.MediaType.TV,
                    seasons: newSeasons,
                    tmdbId,
                    tvdbId,
                    mediaAddedAt,
                    serviceId: !is4k ? serviceId : undefined,
                    serviceId4k: is4k ? serviceId : undefined,
                    externalServiceId: !is4k ? externalServiceId : undefined,
                    externalServiceId4k: is4k ? externalServiceId : undefined,
                    externalServiceSlug: !is4k ? externalServiceSlug : undefined,
                    externalServiceSlug4k: is4k ? externalServiceSlug : undefined,
                    ratingKey: newSeasons.some((sn) => sn.status === media_1.MediaStatus.PARTIALLY_AVAILABLE ||
                        sn.status === media_1.MediaStatus.AVAILABLE)
                        ? ratingKey
                        : undefined,
                    ratingKey4k: this.enable4kShow &&
                        newSeasons.some((sn) => sn.status4k === media_1.MediaStatus.PARTIALLY_AVAILABLE ||
                            sn.status4k === media_1.MediaStatus.AVAILABLE)
                        ? ratingKey
                        : undefined,
                    jellyfinMediaId: newSeasons.some((sn) => sn.status === media_1.MediaStatus.PARTIALLY_AVAILABLE ||
                        sn.status === media_1.MediaStatus.AVAILABLE)
                        ? jellyfinMediaId
                        : undefined,
                    jellyfinMediaId4k: this.enable4kShow &&
                        newSeasons.some((sn) => sn.status4k === media_1.MediaStatus.PARTIALLY_AVAILABLE ||
                            sn.status4k === media_1.MediaStatus.AVAILABLE)
                        ? jellyfinMediaId
                        : undefined,
                    status: isAllStandardSeasonsAvailable
                        ? media_1.MediaStatus.AVAILABLE
                        : newSeasons.some((season) => season.status === media_1.MediaStatus.PARTIALLY_AVAILABLE ||
                            season.status === media_1.MediaStatus.AVAILABLE)
                            ? media_1.MediaStatus.PARTIALLY_AVAILABLE
                            : newSeasons.some((season) => season.status === media_1.MediaStatus.PROCESSING)
                                ? media_1.MediaStatus.PROCESSING
                                : media_1.MediaStatus.UNKNOWN,
                    status4k: isAll4kSeasonsAvailable && this.enable4kShow
                        ? media_1.MediaStatus.AVAILABLE
                        : this.enable4kShow &&
                            newSeasons.some((season) => season.status4k === media_1.MediaStatus.PARTIALLY_AVAILABLE ||
                                season.status4k === media_1.MediaStatus.AVAILABLE)
                            ? media_1.MediaStatus.PARTIALLY_AVAILABLE
                            : newSeasons.some((season) => season.status4k === media_1.MediaStatus.PROCESSING)
                                ? media_1.MediaStatus.PROCESSING
                                : media_1.MediaStatus.UNKNOWN,
                });
                await mediaRepository.save(newMedia);
                this.log(`Saved ${title}`);
            }
        });
    }
    /**
     * Declines APPROVED requests bound to media that has been orphaned before completion.
     * DECLINED clears the duplicate-request guard so the user can re-request it.
     * Callers must load the requests relation on the media.
     */
    async declineOrphanedRequests(media, is4k) {
        if (media.requests === undefined) {
            throw new Error(`declineOrphanedRequests called for media ${media.id} without the 'requests' relation loaded`);
        }
        const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.default);
        const orphanedRequests = (media.requests ?? []).filter((request) => request.is4k === is4k && request.status === media_1.MediaRequestStatus.APPROVED);
        for (const request of orphanedRequests) {
            request.status = media_1.MediaRequestStatus.DECLINED;
            // Ensure that the media relation is set so the AfterUpdate
            // notification hook can resolve it
            request.media = media;
            await requestRepository.save(request);
            this.log(`Declined orphaned ${media.mediaType === media_1.MediaType.MOVIE ? 'movie' : 'series'} request ${request.id} for ${media.tmdbId} not found in any Sonarr/Radarr server.`, 'info');
        }
    }
    /**
     * Call startRun from child class whenever a run is starting to
     * ensure required values are set
     *
     * Returns the session ID which is requried for the cleanup method
     */
    startRun() {
        const settings = (0, settings_1.getSettings)();
        const sessionId = (0, crypto_1.randomUUID)();
        this.sessionId = sessionId;
        this.log('Scan starting', 'info', { sessionId });
        this.enable4kMovie = settings.radarr.some((radarr) => radarr.is4k);
        if (this.enable4kMovie) {
            this.log('At least one 4K Radarr server was detected. 4K movie detection is now enabled', 'info');
        }
        this.enable4kShow = settings.sonarr.some((sonarr) => sonarr.is4k);
        if (this.enable4kShow) {
            this.log('At least one 4K Sonarr server was detected. 4K series detection is now enabled', 'info');
        }
        this.running = true;
        return sessionId;
    }
    /**
     * Call at end of run loop to perform cleanup
     */
    endRun(sessionId) {
        if (this.sessionId === sessionId) {
            this.running = false;
        }
    }
    cancel() {
        this.running = false;
    }
    async loop(processFn, { start = 0, end = this.bundleSize, sessionId, } = {}) {
        const slicedItems = this.items.slice(start, end);
        if (!this.running) {
            throw new Error('Sync was aborted.');
        }
        if (this.sessionId !== sessionId) {
            throw new Error('New session was started. Old session aborted.');
        }
        if (start < this.items.length) {
            this.progress = start;
            await this.processItems(processFn, slicedItems);
            await new Promise((resolve, reject) => setTimeout(() => {
                this.loop(processFn, {
                    start: start + this.bundleSize,
                    end: end + this.bundleSize,
                    sessionId,
                })
                    .then(() => resolve())
                    .catch((e) => reject(new Error(e.message)));
            }, this.updateRate));
        }
    }
    async processItems(processFn, items) {
        await Promise.all(items.map(async (item) => {
            await processFn(item);
        }));
    }
    log(message, level = 'debug', optional) {
        logger_1.default[level](message, { label: this.scannerName, ...optional });
    }
    get protectedUpdateRate() {
        return this.updateRate;
    }
    get protectedBundleSize() {
        return this.bundleSize;
    }
}
exports.default = BaseScanner;

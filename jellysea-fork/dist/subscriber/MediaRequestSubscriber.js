"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaRequestSubscriber = void 0;
const radarr_1 = __importDefault(require("../api/servarr/radarr"));
const sonarr_1 = __importDefault(require("../api/servarr/sonarr"));
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const constants_1 = require("../api/themoviedb/constants");
const media_1 = require("../constants/media");
const datasource_1 = require("../datasource");
const Media_1 = __importDefault(require("../entity/Media"));
const MediaRequest_1 = require("../entity/MediaRequest");
const Season_1 = __importDefault(require("../entity/Season"));
const SeasonRequest_1 = __importDefault(require("../entity/SeasonRequest"));
const notifications_1 = __importStar(require("../lib/notifications"));
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const lodash_1 = require("lodash");
const typeorm_1 = require("typeorm");
const sanitizeDisplayName = (displayName) => {
    return displayName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/gi, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};
let MediaRequestSubscriber = class MediaRequestSubscriber {
    async notifyAvailableMovie(entity, event) {
        // Get fresh media state using event manager
        let latestMedia = null;
        if (event?.manager) {
            latestMedia = await event.manager.findOne(Media_1.default, {
                where: { id: entity.media.id },
            });
        }
        if (!latestMedia) {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            latestMedia = await mediaRepository.findOne({
                where: { id: entity.media.id },
            });
        }
        // Check availability using fresh media state
        if (!latestMedia ||
            latestMedia[entity.is4k ? 'status4k' : 'status'] !== media_1.MediaStatus.AVAILABLE) {
            return;
        }
        const tmdb = new themoviedb_1.default();
        try {
            const movie = await tmdb.getMovie({
                movieId: entity.media.tmdbId,
            });
            notifications_1.default.sendNotification(notifications_1.Notification.MEDIA_AVAILABLE, {
                event: `${entity.is4k ? '4K ' : ''}Movie Request Now Available`,
                notifyAdmin: false,
                notifySystem: true,
                notifyUser: entity.requestedBy,
                subject: `${movie.title}${movie.release_date ? ` (${movie.release_date.slice(0, 4)})` : ''}`,
                message: (0, lodash_1.truncate)(movie.overview, {
                    length: 500,
                    separator: /\s/,
                    omission: '…',
                }),
                media: latestMedia,
                image: `https://image.tmdb.org/t/p/w600_and_h900_bestv2${movie.poster_path}`,
                request: entity,
            });
        }
        catch (e) {
            logger_1.default.error('Something went wrong sending media notification(s)', {
                label: 'Notifications',
                errorMessage: e.message,
                mediaId: entity.id,
            });
        }
    }
    async notifyAvailableSeries(entity, event) {
        // Get fresh media state with seasons using event manager
        let latestMedia = null;
        if (event?.manager) {
            latestMedia = await event.manager.findOne(Media_1.default, {
                where: { id: entity.media.id },
                relations: { seasons: true },
            });
        }
        if (!latestMedia) {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            latestMedia = await mediaRepository.findOne({
                where: { id: entity.media.id },
                relations: { seasons: true },
            });
        }
        if (!latestMedia) {
            return;
        }
        // Check availability using fresh media state
        const requestedSeasons = entity.seasons?.map((entitySeason) => entitySeason.seasonNumber) ?? [];
        const availableSeasons = latestMedia.seasons.filter((season) => season[entity.is4k ? 'status4k' : 'status'] === media_1.MediaStatus.AVAILABLE &&
            requestedSeasons.includes(season.seasonNumber));
        const isMediaAvailable = availableSeasons.length > 0 &&
            availableSeasons.length === requestedSeasons.length;
        if (!isMediaAvailable) {
            return;
        }
        const tmdb = new themoviedb_1.default();
        try {
            const tv = await tmdb.getTvShow({ tvId: entity.media.tmdbId });
            notifications_1.default.sendNotification(notifications_1.Notification.MEDIA_AVAILABLE, {
                event: `${entity.is4k ? '4K ' : ''}Series Request Now Available`,
                subject: `${tv.name}${tv.first_air_date ? ` (${tv.first_air_date.slice(0, 4)})` : ''}`,
                message: (0, lodash_1.truncate)(tv.overview, {
                    length: 500,
                    separator: /\s/,
                    omission: '…',
                }),
                notifyAdmin: false,
                notifySystem: true,
                notifyUser: entity.requestedBy,
                image: `https://image.tmdb.org/t/p/w600_and_h900_bestv2${tv.poster_path}`,
                media: latestMedia,
                extra: [
                    {
                        name: 'Requested Seasons',
                        value: entity.seasons
                            .map((season) => season.seasonNumber)
                            .join(', '),
                    },
                ],
                request: entity,
            });
        }
        catch (e) {
            logger_1.default.error('Something went wrong sending media notification(s)', {
                label: 'Notifications',
                errorMessage: e.message,
                mediaId: entity.id,
            });
        }
    }
    async sendToRadarr(entity) {
        if (entity.status === media_1.MediaRequestStatus.APPROVED &&
            entity.type === media_1.MediaType.MOVIE) {
            try {
                const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
                const settings = (0, settings_1.getSettings)();
                if (settings.radarr.length === 0 && !settings.radarr[0]) {
                    logger_1.default.info('No Radarr server configured, skipping request processing', {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                    return;
                }
                let radarrSettings = settings.radarr.find((radarr) => radarr.isDefault && radarr.is4k === entity.is4k);
                if (entity.serverId !== null &&
                    entity.serverId >= 0 &&
                    radarrSettings?.id !== entity.serverId) {
                    radarrSettings = settings.radarr.find((radarr) => radarr.id === entity.serverId);
                    logger_1.default.info(`Request has an override server: ${radarrSettings?.name}`, {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                }
                if (!radarrSettings) {
                    logger_1.default.warn(`There is no default ${entity.is4k ? '4K ' : ''}Radarr server configured. Did you set any of your ${entity.is4k ? '4K ' : ''}Radarr servers as default?`, {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                    return;
                }
                let rootFolder = radarrSettings.activeDirectory;
                let qualityProfile = radarrSettings.activeProfileId;
                let tags = radarrSettings.tags ? [...radarrSettings.tags] : [];
                if (entity.rootFolder &&
                    entity.rootFolder !== '' &&
                    entity.rootFolder !== radarrSettings.activeDirectory) {
                    rootFolder = entity.rootFolder;
                    logger_1.default.info(`Request has an override root folder: ${rootFolder}`, {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                }
                if (entity.profileId &&
                    entity.profileId !== radarrSettings.activeProfileId) {
                    qualityProfile = entity.profileId;
                    logger_1.default.info(`Request has an override quality profile ID: ${qualityProfile}`, {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                }
                if (entity.tags && !(0, lodash_1.isEqual)(entity.tags, radarrSettings.tags)) {
                    tags = entity.tags;
                    logger_1.default.info(`Request has override tags`, {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                        tagIds: tags,
                    });
                }
                const tmdb = new themoviedb_1.default();
                const radarr = new radarr_1.default({
                    apiKey: radarrSettings.apiKey,
                    url: radarr_1.default.buildUrl(radarrSettings, '/api/v3'),
                });
                const movie = await tmdb.getMovie({ movieId: entity.media.tmdbId });
                const media = await mediaRepository.findOne({
                    where: { id: entity.media.id },
                });
                if (!media) {
                    logger_1.default.error('Media data not found', {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                    return;
                }
                if (radarrSettings.tagRequests) {
                    const radarrTags = await radarr.getTags();
                    // old tags had space around the hyphen
                    let userTag = radarrTags.find((v) => v.label.startsWith(entity.requestedBy.id + ' - '));
                    // new tags do not have spaces around the hyphen, since spaces are not allowed anymore
                    if (!userTag) {
                        userTag = radarrTags.find((v) => v.label.startsWith(entity.requestedBy.id + '-'));
                    }
                    if (!userTag) {
                        logger_1.default.info(`Requester has no active tag. Creating new`, {
                            label: 'Media Request',
                            requestId: entity.id,
                            mediaId: entity.media.id,
                            userId: entity.requestedBy.id,
                            newTag: entity.requestedBy.id +
                                '-' +
                                sanitizeDisplayName(entity.requestedBy.displayName),
                        });
                        userTag = await radarr.createTag({
                            label: entity.requestedBy.id +
                                '-' +
                                sanitizeDisplayName(entity.requestedBy.displayName),
                        });
                    }
                    if (userTag.id) {
                        if (!tags?.find((v) => v === userTag?.id)) {
                            tags?.push(userTag.id);
                        }
                    }
                    else {
                        logger_1.default.warn(`Requester has no tag and failed to add one`, {
                            label: 'Media Request',
                            requestId: entity.id,
                            mediaId: entity.media.id,
                            userId: entity.requestedBy.id,
                            radarrServer: radarrSettings.hostname + ':' + radarrSettings.port,
                        });
                    }
                }
                if (media[entity.is4k ? 'status4k' : 'status'] === media_1.MediaStatus.AVAILABLE) {
                    logger_1.default.warn('Media already exists, marking request as COMPLETED', {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                    const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
                    entity.status = media_1.MediaRequestStatus.COMPLETED;
                    await requestRepository.save(entity);
                    return;
                }
                const radarrMovieOptions = {
                    profileId: qualityProfile,
                    qualityProfileId: qualityProfile,
                    rootFolderPath: rootFolder,
                    minimumAvailability: radarrSettings.minimumAvailability,
                    title: movie.title,
                    tmdbId: movie.id,
                    year: Number(movie.release_date.slice(0, 4)),
                    monitored: true,
                    tags,
                    searchNow: !radarrSettings.preventSearch,
                };
                // Run entity asynchronously so we don't wait for it on the UI side
                radarr
                    .addMovie(radarrMovieOptions)
                    .then(async (radarrMovie) => {
                    // We grab media again here to make sure we have the latest version of it
                    const media = await mediaRepository.findOne({
                        where: { id: entity.media.id },
                    });
                    if (!media) {
                        throw new Error('Media data not found');
                    }
                    media[entity.is4k ? 'externalServiceId4k' : 'externalServiceId'] =
                        radarrMovie.id;
                    media[entity.is4k ? 'externalServiceSlug4k' : 'externalServiceSlug'] = radarrMovie.titleSlug;
                    media[entity.is4k ? 'serviceId4k' : 'serviceId'] =
                        radarrSettings?.id;
                    await mediaRepository.save(media);
                })
                    .catch(async () => {
                    try {
                        const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
                        if (entity.status !== media_1.MediaRequestStatus.FAILED) {
                            entity.status = media_1.MediaRequestStatus.FAILED;
                            await requestRepository.save(entity);
                        }
                    }
                    catch (saveError) {
                        logger_1.default.error('Failed to mark request as FAILED', {
                            label: 'Media Request',
                            requestId: entity.id,
                            errorMessage: saveError instanceof Error
                                ? saveError.message
                                : String(saveError),
                        });
                    }
                    logger_1.default.warn('Something went wrong sending movie request to Radarr, marking status as FAILED', {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                        radarrMovieOptions,
                    });
                    MediaRequest_1.MediaRequest.sendNotification(entity, media, notifications_1.Notification.MEDIA_FAILED);
                })
                    .finally(() => {
                    radarr.clearCache({
                        tmdbId: movie.id,
                        externalId: entity.is4k
                            ? media.externalServiceId4k
                            : media.externalServiceId,
                    });
                });
                logger_1.default.info('Sent request to Radarr', {
                    label: 'Media Request',
                    requestId: entity.id,
                    mediaId: entity.media.id,
                });
            }
            catch (e) {
                const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
                const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
                const media = await mediaRepository.findOne({
                    where: { id: entity.media.id },
                });
                if (media) {
                    entity.status = media_1.MediaRequestStatus.FAILED;
                    await requestRepository.save(entity);
                    logger_1.default.warn('Failed to send movie request to Radarr due to connection or configuration error, marking status as FAILED', {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                        errorMessage: e.message,
                    });
                    MediaRequest_1.MediaRequest.sendNotification(entity, media, notifications_1.Notification.MEDIA_FAILED);
                }
            }
        }
    }
    async sendToSonarr(entity) {
        if (entity.status === media_1.MediaRequestStatus.APPROVED &&
            entity.type === media_1.MediaType.TV) {
            try {
                const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
                const settings = (0, settings_1.getSettings)();
                if (settings.sonarr.length === 0 && !settings.sonarr[0]) {
                    logger_1.default.warn('No Sonarr server configured, skipping request processing', {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                    return;
                }
                let sonarrSettings = settings.sonarr.find((sonarr) => sonarr.isDefault && sonarr.is4k === entity.is4k);
                if (entity.serverId !== null &&
                    entity.serverId >= 0 &&
                    sonarrSettings?.id !== entity.serverId) {
                    sonarrSettings = settings.sonarr.find((sonarr) => sonarr.id === entity.serverId);
                    logger_1.default.info(`Request has an override server: ${sonarrSettings?.name}`, {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                }
                if (!sonarrSettings) {
                    logger_1.default.warn(`There is no default ${entity.is4k ? '4K ' : ''}Sonarr server configured. Did you set any of your ${entity.is4k ? '4K ' : ''}Sonarr servers as default?`, {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                    return;
                }
                const media = await mediaRepository.findOne({
                    where: { id: entity.media.id },
                });
                if (!media) {
                    throw new Error('Media data not found');
                }
                if (media[entity.is4k ? 'status4k' : 'status'] === media_1.MediaStatus.AVAILABLE) {
                    logger_1.default.warn('Media already exists, marking request as COMPLETED', {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                    const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
                    entity.status = media_1.MediaRequestStatus.COMPLETED;
                    entity.seasons.forEach((season) => {
                        season.status = media_1.MediaRequestStatus.COMPLETED;
                    });
                    await requestRepository.save(entity);
                    return;
                }
                const tmdb = new themoviedb_1.default();
                const sonarr = new sonarr_1.default({
                    apiKey: sonarrSettings.apiKey,
                    url: sonarr_1.default.buildUrl(sonarrSettings, '/api/v3'),
                });
                const series = await tmdb.getTvShow({ tvId: media.tmdbId });
                const tvdbId = series.external_ids.tvdb_id ?? media.tvdbId;
                if (!tvdbId) {
                    const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
                    await mediaRepository.remove(media);
                    await requestRepository.remove(entity);
                    throw new Error('TVDB ID not found');
                }
                let seriesType = 'standard';
                // Change series type to anime if the anime keyword is present on tmdb
                if (series.keywords.results.some((keyword) => keyword.id === constants_1.ANIME_KEYWORD_ID)) {
                    seriesType = sonarrSettings.animeSeriesType ?? 'anime';
                }
                let rootFolder = seriesType === 'anime' && sonarrSettings.activeAnimeDirectory
                    ? sonarrSettings.activeAnimeDirectory
                    : sonarrSettings.activeDirectory;
                let qualityProfile = seriesType === 'anime' && sonarrSettings.activeAnimeProfileId
                    ? sonarrSettings.activeAnimeProfileId
                    : sonarrSettings.activeProfileId;
                let languageProfile = seriesType === 'anime' && sonarrSettings.activeAnimeLanguageProfileId
                    ? sonarrSettings.activeAnimeLanguageProfileId
                    : sonarrSettings.activeLanguageProfileId;
                let tags = seriesType === 'anime'
                    ? sonarrSettings.animeTags
                        ? [...sonarrSettings.animeTags]
                        : []
                    : sonarrSettings.tags
                        ? [...sonarrSettings.tags]
                        : [];
                if (entity.rootFolder &&
                    entity.rootFolder !== '' &&
                    entity.rootFolder !== rootFolder) {
                    rootFolder = entity.rootFolder;
                    logger_1.default.info(`Request has an override root folder: ${rootFolder}`, {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                }
                if (entity.profileId && entity.profileId !== qualityProfile) {
                    qualityProfile = entity.profileId;
                    logger_1.default.info(`Request has an override quality profile ID: ${qualityProfile}`, {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                }
                if (entity.languageProfileId &&
                    entity.languageProfileId !== languageProfile) {
                    languageProfile = entity.languageProfileId;
                    logger_1.default.info(`Request has an override language profile ID: ${languageProfile}`, {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                    });
                }
                if (entity.tags && !(0, lodash_1.isEqual)(entity.tags, tags)) {
                    tags = entity.tags;
                    logger_1.default.info(`Request has override tags`, {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                        tagIds: tags,
                    });
                }
                if (sonarrSettings.tagRequests) {
                    const sonarrTags = await sonarr.getTags();
                    // old tags had space around the hyphen
                    let userTag = sonarrTags.find((v) => v.label.startsWith(entity.requestedBy.id + ' - '));
                    // new tags do not have spaces around the hyphen, since spaces are not allowed anymore
                    if (!userTag) {
                        userTag = sonarrTags.find((v) => v.label.startsWith(entity.requestedBy.id + '-'));
                    }
                    if (!userTag) {
                        logger_1.default.info(`Requester has no active tag. Creating new`, {
                            label: 'Media Request',
                            requestId: entity.id,
                            mediaId: entity.media.id,
                            userId: entity.requestedBy.id,
                            newTag: entity.requestedBy.id +
                                '-' +
                                sanitizeDisplayName(entity.requestedBy.displayName),
                        });
                        userTag = await sonarr.createTag({
                            label: entity.requestedBy.id +
                                '-' +
                                sanitizeDisplayName(entity.requestedBy.displayName),
                        });
                    }
                    if (userTag.id) {
                        if (!tags?.find((v) => v === userTag?.id)) {
                            tags?.push(userTag.id);
                        }
                    }
                    else {
                        logger_1.default.warn(`Requester has no tag and failed to add one`, {
                            label: 'Media Request',
                            requestId: entity.id,
                            mediaId: entity.media.id,
                            userId: entity.requestedBy.id,
                            sonarrServer: sonarrSettings.hostname + ':' + sonarrSettings.port,
                        });
                    }
                }
                const sonarrSeriesOptions = {
                    profileId: qualityProfile,
                    languageProfileId: languageProfile,
                    rootFolderPath: rootFolder,
                    title: series.name,
                    tvdbid: tvdbId,
                    seasons: entity.seasons.map((season) => season.seasonNumber),
                    seasonFolder: sonarrSettings.enableSeasonFolders,
                    seriesType,
                    tags,
                    monitored: true,
                    monitorNewItems: sonarrSettings.monitorNewItems,
                    searchNow: !sonarrSettings.preventSearch,
                };
                // Run entity asynchronously so we don't wait for it on the UI side
                sonarr
                    .addSeries(sonarrSeriesOptions)
                    .then(async (sonarrSeries) => {
                    // We grab media again here to make sure we have the latest version of it
                    const media = await mediaRepository.findOne({
                        where: { id: entity.media.id },
                    });
                    if (!media) {
                        throw new Error('Media data not found');
                    }
                    media[entity.is4k ? 'externalServiceId4k' : 'externalServiceId'] =
                        sonarrSeries.id;
                    media[entity.is4k ? 'externalServiceSlug4k' : 'externalServiceSlug'] = sonarrSeries.titleSlug;
                    media[entity.is4k ? 'serviceId4k' : 'serviceId'] =
                        sonarrSettings?.id;
                    await mediaRepository.save(media);
                })
                    .catch(async () => {
                    try {
                        const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
                        if (entity.status !== media_1.MediaRequestStatus.FAILED) {
                            entity.status = media_1.MediaRequestStatus.FAILED;
                            await requestRepository.save(entity);
                        }
                    }
                    catch (saveError) {
                        logger_1.default.error('Failed to mark request as FAILED', {
                            label: 'Media Request',
                            requestId: entity.id,
                            errorMessage: saveError instanceof Error
                                ? saveError.message
                                : String(saveError),
                        });
                    }
                    logger_1.default.warn('Something went wrong sending series request to Sonarr, marking status as FAILED', {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                        sonarrSeriesOptions,
                    });
                    MediaRequest_1.MediaRequest.sendNotification(entity, media, notifications_1.Notification.MEDIA_FAILED);
                })
                    .finally(() => {
                    sonarr.clearCache({
                        tvdbId,
                        externalId: entity.is4k
                            ? media.externalServiceId4k
                            : media.externalServiceId,
                        title: series.name,
                    });
                });
                logger_1.default.info('Sent request to Sonarr', {
                    label: 'Media Request',
                    requestId: entity.id,
                    mediaId: entity.media.id,
                });
            }
            catch (e) {
                const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
                const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
                const media = await mediaRepository.findOne({
                    where: { id: entity.media.id },
                });
                if (media) {
                    entity.status = media_1.MediaRequestStatus.FAILED;
                    await requestRepository.save(entity);
                    logger_1.default.warn('Failed to send series request to Sonarr due to connection or configuration error, marking status as FAILED', {
                        label: 'Media Request',
                        requestId: entity.id,
                        mediaId: entity.media.id,
                        errorMessage: e.message,
                    });
                    MediaRequest_1.MediaRequest.sendNotification(entity, media, notifications_1.Notification.MEDIA_FAILED);
                }
            }
        }
    }
    async updateParentStatus(entity) {
        const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
        const media = await mediaRepository.findOne({
            where: { id: entity.media.id },
        });
        if (!media) {
            logger_1.default.error('Media data not found', {
                label: 'Media Request',
                requestId: entity.id,
                mediaId: entity.media.id,
            });
            return;
        }
        const statusKey = entity.is4k ? 'status4k' : 'status';
        const seasonRequestRepository = (0, datasource_1.getRepository)(SeasonRequest_1.default);
        const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        if (entity.status === media_1.MediaRequestStatus.APPROVED &&
            // Do not update the status if the item is already partially available or available
            media[statusKey] !== media_1.MediaStatus.AVAILABLE &&
            media[statusKey] !== media_1.MediaStatus.PARTIALLY_AVAILABLE &&
            media[statusKey] !== media_1.MediaStatus.PROCESSING) {
            media[statusKey] = media_1.MediaStatus.PROCESSING;
            await mediaRepository.save(media);
        }
        if (media.mediaType === media_1.MediaType.MOVIE &&
            entity.status === media_1.MediaRequestStatus.DECLINED &&
            media[statusKey] !== media_1.MediaStatus.DELETED) {
            media[statusKey] = media_1.MediaStatus.UNKNOWN;
            await mediaRepository.save(media);
        }
        /**
         * If the media type is TV, and we are declining a request,
         * we must check if its the only pending request and that
         * there the current media status is just pending (meaning no
         * other requests have yet to be approved)
         */
        if (media.mediaType === media_1.MediaType.TV &&
            entity.status === media_1.MediaRequestStatus.DECLINED &&
            media[statusKey] === media_1.MediaStatus.PENDING) {
            const pendingCount = await requestRepository.count({
                where: {
                    media: { id: media.id },
                    status: media_1.MediaRequestStatus.PENDING,
                    is4k: entity.is4k,
                    id: (0, typeorm_1.Not)(entity.id),
                },
            });
            if (pendingCount === 0) {
                // Re-fetch media without requests to avoid cascade issues
                const freshMedia = await mediaRepository.findOne({
                    where: { id: media.id },
                });
                if (freshMedia) {
                    freshMedia[statusKey] = media_1.MediaStatus.UNKNOWN;
                    await mediaRepository.save(freshMedia);
                }
            }
        }
        // Reset season statuses when a TV request is declined
        if (media.mediaType === media_1.MediaType.TV &&
            entity.status === media_1.MediaRequestStatus.DECLINED) {
            const seasonRepository = (0, datasource_1.getRepository)(Season_1.default);
            const actualSeasons = await seasonRepository.find({
                where: { media: { id: media.id } },
            });
            for (const seasonRequest of entity.seasons) {
                seasonRequest.status = media_1.MediaRequestStatus.DECLINED;
                await seasonRequestRepository.save(seasonRequest);
                const season = actualSeasons.find((s) => s.seasonNumber === seasonRequest.seasonNumber);
                if (season && season[statusKey] === media_1.MediaStatus.PENDING) {
                    const otherActiveRequests = await requestRepository
                        .createQueryBuilder('request')
                        .leftJoinAndSelect('request.seasons', 'season')
                        .where('request.mediaId = :mediaId', { mediaId: media.id })
                        .andWhere('request.id != :requestId', { requestId: entity.id })
                        .andWhere('request.is4k = :is4k', { is4k: entity.is4k })
                        .andWhere('request.status NOT IN (:...statuses)', {
                        statuses: [
                            media_1.MediaRequestStatus.DECLINED,
                            media_1.MediaRequestStatus.COMPLETED,
                        ],
                    })
                        .andWhere('season.seasonNumber = :seasonNumber', {
                        seasonNumber: season.seasonNumber,
                    })
                        .getCount();
                    if (otherActiveRequests === 0) {
                        season[statusKey] = media_1.MediaStatus.UNKNOWN;
                        await seasonRepository.save(season);
                    }
                }
            }
        }
        // Approve child seasons if parent is approved
        if (media.mediaType === media_1.MediaType.TV &&
            entity.status === media_1.MediaRequestStatus.APPROVED) {
            for (const season of entity.seasons) {
                season.status = media_1.MediaRequestStatus.APPROVED;
                await seasonRequestRepository.save(season);
            }
        }
    }
    async handleRemoveParentUpdate(manager, entity) {
        const fullMedia = await manager.findOneOrFail(Media_1.default, {
            where: { id: entity.media.id },
            relations: { requests: true },
        });
        const hasActive = fullMedia.requests.some((request) => !request.is4k &&
            request.status !== media_1.MediaRequestStatus.COMPLETED &&
            request.status !== media_1.MediaRequestStatus.DECLINED);
        const hasActive4k = fullMedia.requests.some((request) => request.is4k &&
            request.status !== media_1.MediaRequestStatus.COMPLETED &&
            request.status !== media_1.MediaRequestStatus.DECLINED);
        const needsStatusUpdate = !hasActive &&
            fullMedia.status !== media_1.MediaStatus.AVAILABLE &&
            fullMedia.status !== media_1.MediaStatus.PARTIALLY_AVAILABLE;
        const needs4kStatusUpdate = !hasActive4k &&
            fullMedia.status4k !== media_1.MediaStatus.AVAILABLE &&
            fullMedia.status4k !== media_1.MediaStatus.PARTIALLY_AVAILABLE;
        if (needsStatusUpdate || needs4kStatusUpdate) {
            // Re-fetch WITHOUT requests to avoid cascade issues on save
            const cleanMedia = await manager.findOneOrFail(Media_1.default, {
                where: { id: entity.media.id },
            });
            if (needsStatusUpdate) {
                const hadCompleted = fullMedia.requests.some((r) => !r.is4k && r.status === media_1.MediaRequestStatus.COMPLETED);
                cleanMedia.status = hadCompleted
                    ? media_1.MediaStatus.DELETED
                    : media_1.MediaStatus.UNKNOWN;
            }
            if (needs4kStatusUpdate) {
                const hadCompleted4k = fullMedia.requests.some((r) => r.is4k && r.status === media_1.MediaRequestStatus.COMPLETED);
                cleanMedia.status4k = hadCompleted4k
                    ? media_1.MediaStatus.DELETED
                    : media_1.MediaStatus.UNKNOWN;
            }
            await manager.save(cleanMedia);
        }
    }
    async afterUpdate(event) {
        if (!event.entity) {
            return;
        }
        try {
            await this.sendToRadarr(event.entity);
            await this.sendToSonarr(event.entity);
        }
        catch (e) {
            logger_1.default.error('Error while sending to *arr in afterUpdate subscriber', {
                label: 'Media Request',
                requestId: event.entity.id,
                errorMessage: e instanceof Error ? e.message : String(e),
            });
        }
        try {
            await this.updateParentStatus(event.entity);
            if (event.entity.status === media_1.MediaRequestStatus.COMPLETED) {
                if (event.entity.media.mediaType === media_1.MediaType.MOVIE) {
                    await this.notifyAvailableMovie(event.entity, event);
                }
                if (event.entity.media.mediaType === media_1.MediaType.TV) {
                    await this.notifyAvailableSeries(event.entity, event);
                }
            }
        }
        catch (e) {
            logger_1.default.error('Error while updating parent status in afterUpdate subscriber', {
                label: 'Media Request',
                requestId: event.entity.id,
                errorMessage: e instanceof Error ? e.message : String(e),
            });
        }
    }
    async afterInsert(event) {
        if (!event.entity) {
            return;
        }
        try {
            await this.sendToRadarr(event.entity);
            await this.sendToSonarr(event.entity);
        }
        catch (e) {
            logger_1.default.error('Error while sending to *arr in afterInsert subscriber', {
                label: 'Media Request',
                requestId: event.entity.id,
                errorMessage: e instanceof Error ? e.message : String(e),
            });
        }
        try {
            await this.updateParentStatus(event.entity);
        }
        catch (e) {
            logger_1.default.error('Error while updating parent status in afterInsert subscriber', {
                label: 'Media Request',
                requestId: event.entity.id,
                errorMessage: e instanceof Error ? e.message : String(e),
            });
        }
    }
    async afterRemove(event) {
        if (!event.entity) {
            return;
        }
        await this.handleRemoveParentUpdate(event.manager, event.entity);
    }
    listenTo() {
        return MediaRequest_1.MediaRequest;
    }
};
exports.MediaRequestSubscriber = MediaRequestSubscriber;
exports.MediaRequestSubscriber = MediaRequestSubscriber = __decorate([
    (0, typeorm_1.EventSubscriber)()
], MediaRequestSubscriber);

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jellyfin_1 = __importDefault(require("../api/jellyfin"));
const plexapi_1 = __importDefault(require("../api/plexapi"));
const radarr_1 = __importDefault(require("../api/servarr/radarr"));
const sonarr_1 = __importDefault(require("../api/servarr/sonarr"));
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const media_1 = require("../constants/media");
const server_1 = require("../constants/server");
const datasource_1 = require("../datasource");
const Media_1 = __importDefault(require("../entity/Media"));
const MediaRequest_1 = __importDefault(require("../entity/MediaRequest"));
const User_1 = require("../entity/User");
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const getHostname_1 = require("../utils/getHostname");
class AvailabilitySync {
    constructor() {
        this.running = false;
        this.tmdb = new themoviedb_1.default();
    }
    async run() {
        const settings = (0, settings_1.getSettings)();
        const mediaServerType = (0, settings_1.getSettings)().main.mediaServerType;
        this.running = true;
        this.plexSeasonsCache = {};
        this.plexEpisodeExistsCache = {};
        this.jellyfinSeasonsCache = {};
        this.jellyfinEpisodeExistsCache = {};
        this.sonarrSeasonsCache = {};
        this.radarrServers = settings.radarr.filter((server) => server.syncEnabled);
        this.sonarrServers = settings.sonarr.filter((server) => server.syncEnabled);
        try {
            logger_1.default.info(`Starting availability sync...`, {
                label: 'AvailabilitySync',
            });
            const pageSize = 50;
            const userRepository = (0, datasource_1.getRepository)(User_1.User);
            // If it is plex admin is selected using plexToken if jellyfin admin is selected using jellyfinUserID
            let admin = null;
            if (mediaServerType === server_1.MediaServerType.PLEX) {
                admin = await userRepository.findOne({
                    select: { id: true, plexToken: true },
                    where: { id: 1 },
                });
            }
            else if (mediaServerType === server_1.MediaServerType.JELLYFIN ||
                mediaServerType === server_1.MediaServerType.EMBY) {
                admin = await userRepository.findOne({
                    where: { id: 1 },
                    select: ['id', 'jellyfinUserId', 'jellyfinDeviceId'],
                    order: { id: 'ASC' },
                });
            }
            switch (mediaServerType) {
                case server_1.MediaServerType.PLEX:
                    if (admin && admin.plexToken) {
                        this.plexClient = new plexapi_1.default({ plexToken: admin.plexToken });
                    }
                    else {
                        logger_1.default.error('Plex admin is not configured.');
                    }
                    break;
                case server_1.MediaServerType.JELLYFIN:
                case server_1.MediaServerType.EMBY:
                    if (admin) {
                        this.jellyfinClient = new jellyfin_1.default((0, getHostname_1.getHostname)(), settings.jellyfin.apiKey, admin.jellyfinDeviceId);
                        this.jellyfinClient.setUserId(admin.jellyfinUserId ?? '');
                        try {
                            await this.jellyfinClient.getSystemInfo();
                        }
                        catch (e) {
                            logger_1.default.error('Sync interrupted.', {
                                label: 'AvailabilitySync',
                                status: e.statusCode,
                                error: e.name,
                                errorMessage: e.errorCode,
                            });
                            this.running = false;
                            return;
                        }
                    }
                    else {
                        logger_1.default.error('Jellyfin admin is not configured.');
                        this.running = false;
                        return;
                    }
                    break;
                default:
                    logger_1.default.error('An admin is not configured.');
                    this.running = false;
                    return;
            }
            for await (const media of this.loadAvailableMediaPaginated(pageSize)) {
                if (!this.running) {
                    throw new Error('Job aborted');
                }
                // Check plex, radarr, and sonarr for that specific media and
                // if unavailable, then we change the status accordingly.
                // If a non-4k or 4k version exists in at least one of the instances, we will only update that specific version
                if (media.mediaType === 'movie') {
                    let movieExists = false;
                    let movieExists4k = false;
                    // if (mediaServerType === MediaServerType.PLEX) {
                    //   await this.mediaExistsInPlex(media, false);
                    // } else if (
                    //   mediaServerType === MediaServerType.JELLYFIN ||
                    //   mediaServerType === MediaServerType.EMBY
                    // ) {
                    //   await this.mediaExistsInJellyfin(media, false);
                    // }
                    const existsInRadarr = await this.mediaExistsInRadarr(media, false);
                    const existsInRadarr4k = await this.mediaExistsInRadarr(media, true);
                    // plex
                    if (mediaServerType === server_1.MediaServerType.PLEX) {
                        const { existsInPlex } = await this.mediaExistsInPlex(media, false);
                        const { existsInPlex: existsInPlex4k } = await this.mediaExistsInPlex(media, true);
                        if (existsInPlex || existsInRadarr) {
                            movieExists = true;
                            logger_1.default.debug(`The non-4K movie [TMDB ID ${media.tmdbId}] still exists. Preventing removal.`, {
                                label: 'AvailabilitySync',
                            });
                        }
                        if (existsInPlex4k || existsInRadarr4k) {
                            movieExists4k = true;
                            logger_1.default.debug(`The 4K movie [TMDB ID ${media.tmdbId}] still exists. Preventing removal.`, {
                                label: 'AvailabilitySync',
                            });
                        }
                    }
                    //jellyfin
                    if (mediaServerType === server_1.MediaServerType.JELLYFIN ||
                        mediaServerType === server_1.MediaServerType.EMBY) {
                        const { existsInJellyfin } = await this.mediaExistsInJellyfin(media, false);
                        const { existsInJellyfin: existsInJellyfin4k } = await this.mediaExistsInJellyfin(media, true);
                        if (existsInJellyfin || existsInRadarr) {
                            movieExists = true;
                            logger_1.default.debug(`The non-4K movie [TMDB ID ${media.tmdbId}] still exists. Preventing removal.`, {
                                label: 'AvailabilitySync',
                            });
                        }
                        if (existsInJellyfin4k || existsInRadarr4k) {
                            movieExists4k = true;
                            logger_1.default.debug(`The 4K movie [TMDB ID ${media.tmdbId}] still exists. Preventing removal.`, {
                                label: 'AvailabilitySync',
                            });
                        }
                    }
                    if (!movieExists && media.status === media_1.MediaStatus.AVAILABLE) {
                        await this.mediaUpdater(media, false, mediaServerType);
                    }
                    if (!movieExists4k && media.status4k === media_1.MediaStatus.AVAILABLE) {
                        await this.mediaUpdater(media, true, mediaServerType);
                    }
                }
                // If both versions still exist in plex, we still need
                // to check through sonarr to verify season availability
                if (media.mediaType === 'tv') {
                    let showExists = false;
                    let showExists4k = false;
                    //plex
                    const { existsInPlex, seasonsMap: plexSeasonsMap = new Map() } = await this.mediaExistsInPlex(media, false);
                    const { existsInPlex: existsInPlex4k, seasonsMap: plexSeasonsMap4k = new Map(), } = await this.mediaExistsInPlex(media, true);
                    //jellyfin
                    const { existsInJellyfin, seasonsMap: jellyfinSeasonsMap = new Map(), } = await this.mediaExistsInJellyfin(media, false);
                    const { existsInJellyfin: existsInJellyfin4k, seasonsMap: jellyfinSeasonsMap4k = new Map(), } = await this.mediaExistsInJellyfin(media, true);
                    const { existsInSonarr, seasonsMap: sonarrSeasonsMap } = await this.mediaExistsInSonarr(media, false);
                    const { existsInSonarr: existsInSonarr4k, seasonsMap: sonarrSeasonsMap4k, } = await this.mediaExistsInSonarr(media, true);
                    //plex
                    if (mediaServerType === server_1.MediaServerType.PLEX) {
                        if (existsInPlex || existsInSonarr) {
                            showExists = true;
                            logger_1.default.debug(`The non-4K show [TMDB ID ${media.tmdbId}] still exists. Preventing removal.`, {
                                label: 'AvailabilitySync',
                            });
                        }
                    }
                    if (mediaServerType === server_1.MediaServerType.PLEX) {
                        if (existsInPlex4k || existsInSonarr4k) {
                            showExists4k = true;
                            logger_1.default.debug(`The 4K show [TMDB ID ${media.tmdbId}] still exists. Preventing removal.`, {
                                label: 'AvailabilitySync',
                            });
                        }
                    }
                    //jellyfin
                    if (mediaServerType === server_1.MediaServerType.JELLYFIN ||
                        mediaServerType === server_1.MediaServerType.EMBY) {
                        if (existsInJellyfin || existsInSonarr) {
                            showExists = true;
                            logger_1.default.debug(`The non-4K show [TMDB ID ${media.tmdbId}] still exists. Preventing removal.`, {
                                label: 'AvailabilitySync',
                            });
                        }
                    }
                    if (mediaServerType === server_1.MediaServerType.JELLYFIN ||
                        mediaServerType === server_1.MediaServerType.EMBY) {
                        if (existsInJellyfin4k || existsInSonarr4k) {
                            showExists4k = true;
                            logger_1.default.debug(`The 4K show [TMDB ID ${media.tmdbId}] still exists. Preventing removal.`, {
                                label: 'AvailabilitySync',
                            });
                        }
                    }
                    // Here we will create a final map that will cross compare
                    // with plex and sonarr. Filtered seasons will go through
                    // each season and assume the season does not exist. If Plex or
                    // Sonarr finds that season, we will change the final seasons value
                    // to true.
                    const filteredSeasonsMap = new Map();
                    media.seasons
                        .filter((season) => season.status === media_1.MediaStatus.AVAILABLE ||
                        season.status === media_1.MediaStatus.PARTIALLY_AVAILABLE)
                        .forEach((season) => filteredSeasonsMap.set(season.seasonNumber, false));
                    const filteredSeasonsMap4k = new Map();
                    media.seasons
                        .filter((season) => season.status4k === media_1.MediaStatus.AVAILABLE ||
                        season.status4k === media_1.MediaStatus.PARTIALLY_AVAILABLE)
                        .forEach((season) => filteredSeasonsMap4k.set(season.seasonNumber, false));
                    let finalSeasons;
                    let finalSeasons4k;
                    if (mediaServerType === server_1.MediaServerType.PLEX) {
                        finalSeasons = new Map([
                            ...filteredSeasonsMap,
                            ...plexSeasonsMap,
                            ...sonarrSeasonsMap,
                        ]);
                        finalSeasons4k = new Map([
                            ...filteredSeasonsMap4k,
                            ...plexSeasonsMap4k,
                            ...sonarrSeasonsMap4k,
                        ]);
                    }
                    else {
                        // Jellyfin/Emby
                        finalSeasons = new Map([
                            ...filteredSeasonsMap,
                            ...jellyfinSeasonsMap,
                            ...sonarrSeasonsMap,
                        ]);
                        finalSeasons4k = new Map([
                            ...filteredSeasonsMap4k,
                            ...jellyfinSeasonsMap4k,
                            ...sonarrSeasonsMap4k,
                        ]);
                    }
                    // We need to fetch from TMDB to get the episode count for each season
                    let tvShow;
                    try {
                        if (media.tmdbId) {
                            tvShow = await this.tmdb.getTvShow({
                                tvId: Number(media.tmdbId),
                            });
                        }
                        else if (media.tvdbId) {
                            tvShow = await this.tmdb.getShowByTvdbId({
                                tvdbId: Number(media.tvdbId),
                            });
                        }
                    }
                    catch (e) {
                        logger_1.default.debug(`Failed to fetch TMDB data for show [TMDB ID ${media.tmdbId}]. Skipping season enrichment.`, { label: 'AvailabilitySync', errorMessage: e.message });
                    }
                    if (tvShow) {
                        // fill the finalSeasons and finalSeasons4k maps with false for missing seasons
                        media.seasons.forEach((season) => {
                            // Specials don't count towards availability (baseScanner skips them too)
                            // TODO: doesn't respect enableSpecialEpisodes; needs a shared predicate with baseScanner.ts
                            if (season.seasonNumber === 0) {
                                return;
                            }
                            if (!finalSeasons.has(season.seasonNumber) &&
                                tvShow.seasons.find((s) => s.season_number === season.seasonNumber)?.episode_count) {
                                finalSeasons.set(season.seasonNumber, false);
                            }
                            if (!finalSeasons4k.has(season.seasonNumber) &&
                                tvShow.seasons.find((s) => s.season_number === season.seasonNumber)?.episode_count) {
                                finalSeasons4k.set(season.seasonNumber, false);
                            }
                        });
                    }
                    if (!showExists &&
                        (media.status === media_1.MediaStatus.AVAILABLE ||
                            media.status === media_1.MediaStatus.PARTIALLY_AVAILABLE ||
                            media.seasons.some((season) => season.status === media_1.MediaStatus.AVAILABLE) ||
                            media.seasons.some((season) => season.status === media_1.MediaStatus.PARTIALLY_AVAILABLE))) {
                        await this.mediaUpdater(media, false, mediaServerType);
                    }
                    if (!showExists4k &&
                        (media.status4k === media_1.MediaStatus.AVAILABLE ||
                            media.status4k === media_1.MediaStatus.PARTIALLY_AVAILABLE ||
                            media.seasons.some((season) => season.status4k === media_1.MediaStatus.AVAILABLE) ||
                            media.seasons.some((season) => season.status4k === media_1.MediaStatus.PARTIALLY_AVAILABLE))) {
                        await this.mediaUpdater(media, true, mediaServerType);
                    }
                    // TODO: Figure out how to run seasonUpdater for each season
                    if ([...finalSeasons.values()].includes(false)) {
                        await this.seasonUpdater(media, finalSeasons, false, mediaServerType);
                    }
                    if ([...finalSeasons4k.values()].includes(false)) {
                        await this.seasonUpdater(media, finalSeasons4k, true, mediaServerType);
                    }
                }
            }
        }
        catch (ex) {
            logger_1.default.error('Failed to complete availability sync.', {
                errorMessage: ex.message,
                label: 'AvailabilitySync',
            });
        }
        finally {
            logger_1.default.info(`Availability sync complete.`, {
                label: 'AvailabilitySync',
            });
            this.running = false;
        }
    }
    cancel() {
        this.running = false;
    }
    async *loadAvailableMediaPaginated(pageSize) {
        let offset = 0;
        const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
        const whereOptions = [
            { status: media_1.MediaStatus.AVAILABLE },
            { status: media_1.MediaStatus.PARTIALLY_AVAILABLE },
            { status4k: media_1.MediaStatus.AVAILABLE },
            { status4k: media_1.MediaStatus.PARTIALLY_AVAILABLE },
            { seasons: { status: media_1.MediaStatus.AVAILABLE } },
            { seasons: { status: media_1.MediaStatus.PARTIALLY_AVAILABLE } },
            { seasons: { status4k: media_1.MediaStatus.AVAILABLE } },
            { seasons: { status4k: media_1.MediaStatus.PARTIALLY_AVAILABLE } },
        ];
        let mediaPage;
        do {
            yield* (mediaPage = await mediaRepository.find({
                where: whereOptions,
                skip: offset,
                take: pageSize,
            }));
            offset += pageSize;
        } while (mediaPage.length > 0);
    }
    async mediaUpdater(media, is4k, mediaServerType) {
        const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
        try {
            // If media type is tv, check if a season is processing
            // to see if we need to keep the external metadata
            let isMediaProcessing = false;
            if (media.mediaType === 'tv') {
                const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.default);
                const request = await requestRepository
                    .createQueryBuilder('request')
                    .leftJoinAndSelect('request.media', 'media')
                    .where('(media.id = :id)', {
                    id: media.id,
                })
                    .andWhere('(request.is4k = :is4k AND request.status = :requestStatus)', {
                    requestStatus: media_1.MediaRequestStatus.APPROVED,
                    is4k: is4k,
                })
                    .getOne();
                if (request) {
                    isMediaProcessing = true;
                }
            }
            // Set the non-4K or 4K media to deleted
            // and change related columns to null if media
            // is not processing
            media[is4k ? 'status4k' : 'status'] = media_1.MediaStatus.DELETED;
            media[is4k ? 'serviceId4k' : 'serviceId'] = isMediaProcessing
                ? media[is4k ? 'serviceId4k' : 'serviceId']
                : null;
            media[is4k ? 'externalServiceId4k' : 'externalServiceId'] =
                isMediaProcessing
                    ? media[is4k ? 'externalServiceId4k' : 'externalServiceId']
                    : null;
            media[is4k ? 'externalServiceSlug4k' : 'externalServiceSlug'] =
                isMediaProcessing
                    ? media[is4k ? 'externalServiceSlug4k' : 'externalServiceSlug']
                    : null;
            if (mediaServerType === server_1.MediaServerType.PLEX) {
                media[is4k ? 'ratingKey4k' : 'ratingKey'] = isMediaProcessing
                    ? media[is4k ? 'ratingKey4k' : 'ratingKey']
                    : null;
            }
            else if (mediaServerType === server_1.MediaServerType.JELLYFIN ||
                mediaServerType === server_1.MediaServerType.EMBY) {
                media[is4k ? 'jellyfinMediaId4k' : 'jellyfinMediaId'] =
                    isMediaProcessing
                        ? media[is4k ? 'jellyfinMediaId4k' : 'jellyfinMediaId']
                        : null;
            }
            logger_1.default.debug(`The ${is4k ? '4K' : 'non-4K'} ${media.mediaType === 'movie' ? 'movie' : 'show'} [TMDB ID ${media.tmdbId}] was not found in any ${media.mediaType === 'movie' ? 'Radarr' : 'Sonarr'} and ${mediaServerType === server_1.MediaServerType.PLEX
                ? 'plex'
                : mediaServerType === server_1.MediaServerType.JELLYFIN
                    ? 'jellyfin'
                    : 'emby'} instance. Status will be changed to deleted.`, { label: 'AvailabilitySync' });
            await mediaRepository.save(media);
        }
        catch (ex) {
            logger_1.default.debug(`Failure updating the ${is4k ? '4K' : 'non-4K'} ${media.mediaType === 'tv' ? 'show' : 'movie'} [TMDB ID ${media.tmdbId}].`, {
                errorMessage: ex.message,
                label: 'AvailabilitySync',
            });
        }
    }
    async seasonUpdater(media, seasons, is4k, mediaServerType) {
        const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
        // Filter out only the values that are false
        // (media that should be deleted)
        const seasonsPendingRemoval = new Map(
        // Disabled linter as only the value is needed from the filter
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        [...seasons].filter(([_, exists]) => !exists));
        // Retrieve the season keys to pass into our log
        const seasonKeys = [...seasonsPendingRemoval.keys()];
        // Specials can still be marked DELETED below, but shouldn't demote the show
        const nonSpecialSeasonKeys = seasonKeys.filter((key) => key !== 0);
        try {
            for (const mediaSeason of media.seasons) {
                if (seasonsPendingRemoval.has(mediaSeason.seasonNumber) &&
                    (mediaSeason[is4k ? 'status4k' : 'status'] ===
                        media_1.MediaStatus.AVAILABLE ||
                        mediaSeason[is4k ? 'status4k' : 'status'] ===
                            media_1.MediaStatus.PARTIALLY_AVAILABLE)) {
                    mediaSeason[is4k ? 'status4k' : 'status'] = media_1.MediaStatus.DELETED;
                }
            }
            if (nonSpecialSeasonKeys.length > 0 &&
                media[is4k ? 'status4k' : 'status'] === media_1.MediaStatus.AVAILABLE) {
                media[is4k ? 'status4k' : 'status'] = media_1.MediaStatus.PARTIALLY_AVAILABLE;
                logger_1.default.debug(`Marking the ${is4k ? '4K' : 'non-4K'} show [TMDB ID ${media.tmdbId}] as PARTIALLY_AVAILABLE because season(s) [${nonSpecialSeasonKeys}] was not found in any ${media.mediaType === 'tv' ? 'Sonarr' : 'Radarr'} and ${mediaServerType === server_1.MediaServerType.PLEX
                    ? 'plex'
                    : mediaServerType === server_1.MediaServerType.JELLYFIN
                        ? 'jellyfin'
                        : 'emby'} instance.`, { label: 'AvailabilitySync' });
            }
            media.lastSeasonChange = new Date();
            await mediaRepository.save(media);
        }
        catch (ex) {
            logger_1.default.debug(`Failure updating the ${is4k ? '4K' : 'non-4K'} season(s) [${seasonKeys}], TMDB ID ${media.tmdbId}.`, {
                errorMessage: ex.message,
                label: 'AvailabilitySync',
            });
        }
    }
    async mediaExistsInRadarr(media, is4k) {
        let existsInRadarr = false;
        const hasSameServerInBothModes = this.radarrServers.some((a) => this.radarrServers.some((b) => a.is4k !== b.is4k && a.hostname === b.hostname && a.port === b.port));
        // Check for availability in all of the available radarr servers
        // If any find the media, we will assume the media exists
        for (const server of this.radarrServers.filter((server) => server.is4k === is4k)) {
            const radarrAPI = new radarr_1.default({
                apiKey: server.apiKey,
                url: radarr_1.default.buildUrl(server, '/api/v3'),
            });
            try {
                let radarr;
                if (media.externalServiceId && !is4k) {
                    radarr = await radarrAPI.getMovie({
                        id: media.externalServiceId,
                    });
                }
                if (media.externalServiceId4k && is4k) {
                    radarr = await radarrAPI.getMovie({
                        id: media.externalServiceId4k,
                    });
                }
                if (radarr && radarr.tmdbId !== media.tmdbId) {
                    continue;
                }
                if (radarr && radarr.hasFile) {
                    const resolution = radarr?.movieFile?.mediaInfo?.resolution?.split('x');
                    const is4kMovie = resolution?.length === 2 && Number(resolution[0]) >= 2000;
                    if (hasSameServerInBothModes && resolution?.length === 2) {
                        // Same server in both modes then use resolution to distinguish
                        existsInRadarr = is4k ? is4kMovie : !is4kMovie;
                    }
                    else {
                        // One server type and if file exists, count it
                        existsInRadarr = true;
                    }
                }
            }
            catch (ex) {
                if (!ex.message.includes('404')) {
                    existsInRadarr = true;
                    logger_1.default.debug(`Failure retrieving the ${is4k ? '4K' : 'non-4K'} movie [TMDB ID ${media.tmdbId}] from Radarr.`, {
                        errorMessage: ex.message,
                        label: 'AvailabilitySync',
                    });
                }
            }
            if (existsInRadarr)
                break;
        }
        return existsInRadarr;
    }
    async mediaExistsInSonarr(media, is4k) {
        let existsInSonarr = false;
        let preventSeasonSearch = false;
        // Check for availability in all of the available sonarr servers
        // If any find the media, we will assume the media exists
        for (const server of this.sonarrServers.filter((server) => {
            return server.is4k === is4k;
        })) {
            const sonarrAPI = new sonarr_1.default({
                apiKey: server.apiKey,
                url: sonarr_1.default.buildUrl(server, '/api/v3'),
            });
            try {
                let sonarr;
                if (media.externalServiceId && !is4k) {
                    sonarr = await sonarrAPI.getSeriesById(media.externalServiceId);
                }
                if (media.externalServiceId4k && is4k) {
                    sonarr = await sonarrAPI.getSeriesById(media.externalServiceId4k);
                }
                if (sonarr && media.tvdbId != null && sonarr.tvdbId !== media.tvdbId) {
                    continue;
                }
                if (sonarr) {
                    const externalServiceId = is4k
                        ? media.externalServiceId4k
                        : media.externalServiceId;
                    this.sonarrSeasonsCache[`${server.id}-${externalServiceId}`] =
                        sonarr.seasons;
                    if (sonarr.statistics.episodeFileCount > 0) {
                        existsInSonarr = true;
                    }
                }
            }
            catch (ex) {
                if (!ex.message.includes('404')) {
                    existsInSonarr = true;
                    preventSeasonSearch = true;
                    logger_1.default.debug(`Failure retrieving the ${is4k ? '4K' : 'non-4K'} show [TMDB ID ${media.tmdbId}] from Sonarr.`, {
                        errorMessage: ex.message,
                        label: 'AvailabilitySync',
                    });
                }
            }
        }
        // Here we check each season for availability
        // If the API returns an error other than a 404,
        // we will have to prevent the season check from happening
        const seasonsMap = new Map();
        if (!preventSeasonSearch) {
            const filteredSeasons = media.seasons.filter((season) => season[is4k ? 'status4k' : 'status'] === media_1.MediaStatus.AVAILABLE ||
                season[is4k ? 'status4k' : 'status'] ===
                    media_1.MediaStatus.PARTIALLY_AVAILABLE);
            for (const season of filteredSeasons) {
                const seasonExists = await this.seasonExistsInSonarr(media, season, is4k);
                if (seasonExists) {
                    seasonsMap.set(season.seasonNumber, true);
                }
            }
        }
        return { existsInSonarr, seasonsMap };
    }
    async seasonExistsInSonarr(media, season, is4k) {
        let seasonExists = false;
        // Check each sonarr instance to see if the media still exists
        // If found, we will assume the media exists and prevent removal
        // We can use the cache we built when we fetched the series with mediaExistsInSonarr
        for (const server of this.sonarrServers.filter((server) => server.is4k === is4k)) {
            let sonarrSeasons;
            if (media.externalServiceId && !is4k) {
                sonarrSeasons =
                    this.sonarrSeasonsCache[`${server.id}-${media.externalServiceId}`];
            }
            if (media.externalServiceId4k && is4k) {
                sonarrSeasons =
                    this.sonarrSeasonsCache[`${server.id}-${media.externalServiceId4k}`];
            }
            const seasonIsAvailable = sonarrSeasons?.find(({ seasonNumber, statistics }) => season.seasonNumber === seasonNumber &&
                statistics?.episodeFileCount &&
                statistics?.episodeFileCount > 0);
            if (seasonIsAvailable && sonarrSeasons) {
                seasonExists = true;
            }
        }
        return seasonExists;
    }
    // Plex
    async mediaExistsInPlex(media, is4k) {
        const ratingKey = media.ratingKey;
        const ratingKey4k = media.ratingKey4k;
        let existsInPlex = false;
        let preventSeasonSearch = false;
        // Check each plex instance to see if the media still exists
        // If found, we will assume the media exists and prevent removal
        // We can use the cache we built when we fetched the series with mediaExistsInPlex
        try {
            let plexMedia;
            if (ratingKey && !is4k) {
                plexMedia = await this.plexClient?.getMetadata(ratingKey);
                if (media.mediaType === 'tv') {
                    this.plexSeasonsCache[ratingKey] =
                        await this.plexClient?.getChildrenMetadata(ratingKey);
                }
            }
            if (ratingKey4k && is4k) {
                plexMedia = await this.plexClient?.getMetadata(ratingKey4k);
                if (media.mediaType === 'tv') {
                    this.plexSeasonsCache[ratingKey4k] =
                        await this.plexClient?.getChildrenMetadata(ratingKey4k);
                }
                if (plexMedia) {
                    if (ratingKey === ratingKey4k) {
                        plexMedia = undefined;
                    }
                    if (plexMedia &&
                        media.mediaType === 'movie' &&
                        !plexMedia.Media?.some((mediaItem) => (mediaItem.width ?? 0) >= 2000)) {
                        plexMedia = undefined;
                    }
                    if (plexMedia && media.mediaType === 'tv') {
                        const cachedSeasons = this.plexSeasonsCache[ratingKey4k];
                        if (cachedSeasons?.length) {
                            let has4kInAnySeason = false;
                            for (const season of cachedSeasons) {
                                try {
                                    const episodes = await this.plexClient?.getChildrenMetadata(season.ratingKey);
                                    const has4kEpisode = episodes?.some((episode) => episode.Media?.some((mediaItem) => (mediaItem.width ?? 0) >= 2000));
                                    if (has4kEpisode) {
                                        has4kInAnySeason = true;
                                        break;
                                    }
                                }
                                catch {
                                    // If we can't fetch episodes for a season, continue checking other seasons
                                }
                            }
                            if (!has4kInAnySeason) {
                                plexMedia = undefined;
                            }
                        }
                    }
                }
            }
            if (plexMedia) {
                existsInPlex = true;
            }
        }
        catch (ex) {
            if (!ex.message.includes('404')) {
                existsInPlex = true;
                preventSeasonSearch = true;
                logger_1.default.debug(`Failure retrieving the ${is4k ? '4K' : 'non-4K'} ${media.mediaType === 'tv' ? 'show' : 'movie'} [TMDB ID ${media.tmdbId}] from Plex.`, {
                    errorMessage: ex.message,
                    label: 'AvailabilitySync',
                });
            }
        }
        // Here we check each season in plex for availability
        // If the API returns an error other than a 404,
        // we will have to prevent the season check from happening
        if (media.mediaType === 'tv') {
            const seasonsMap = new Map();
            if (!preventSeasonSearch) {
                const filteredSeasons = media.seasons.filter((season) => season[is4k ? 'status4k' : 'status'] === media_1.MediaStatus.AVAILABLE ||
                    season[is4k ? 'status4k' : 'status'] ===
                        media_1.MediaStatus.PARTIALLY_AVAILABLE);
                for (const season of filteredSeasons) {
                    const seasonExists = await this.seasonExistsInPlex(media, season, is4k);
                    if (seasonExists) {
                        seasonsMap.set(season.seasonNumber, true);
                    }
                }
            }
            return { existsInPlex, seasonsMap };
        }
        return { existsInPlex };
    }
    async seasonExistsInPlex(media, season, is4k) {
        const ratingKey = media.ratingKey;
        const ratingKey4k = media.ratingKey4k;
        let seasonExistsInPlex = false;
        let plexSeasons;
        if (ratingKey && !is4k) {
            plexSeasons = this.plexSeasonsCache[ratingKey];
        }
        if (ratingKey4k && is4k) {
            plexSeasons = this.plexSeasonsCache[ratingKey4k];
        }
        const seasonMeta = plexSeasons?.find((plexSeason) => plexSeason.index === season.seasonNumber);
        if (seasonMeta) {
            const cacheKey = seasonMeta.ratingKey;
            if (cacheKey in this.plexEpisodeExistsCache) {
                seasonExistsInPlex = this.plexEpisodeExistsCache[cacheKey];
            }
            else {
                try {
                    // Season metadata exists, but we need to verify it has actual
                    // episode files. Plex can keep empty season entries.
                    const episodes = await this.plexClient?.getChildrenMetadata(seasonMeta.ratingKey);
                    seasonExistsInPlex =
                        episodes?.some((episode) => episode.Media?.length > 0) ?? false;
                }
                catch {
                    // If we can't fetch episodes, assume the season exists
                    // to avoid false removal
                    seasonExistsInPlex = true;
                }
                this.plexEpisodeExistsCache[cacheKey] = seasonExistsInPlex;
            }
        }
        return seasonExistsInPlex;
    }
    // Jellyfin
    async mediaExistsInJellyfin(media, is4k) {
        const ratingKey = media.jellyfinMediaId;
        const ratingKey4k = media.jellyfinMediaId4k;
        let existsInJellyfin = false;
        let preventSeasonSearch = false;
        // Check each jellyfin instance to see if the media still exists
        // If found, we will assume the media exists and prevent removal
        // We can use the cache we built when we fetched the series with mediaExistsInJellyfin
        try {
            let jellyfinMedia;
            if (ratingKey && !is4k) {
                jellyfinMedia = await this.jellyfinClient?.getItemData(ratingKey);
                if (media.mediaType === 'tv' && jellyfinMedia !== undefined) {
                    this.jellyfinSeasonsCache[ratingKey] =
                        await this.jellyfinClient?.getSeasons(ratingKey);
                }
            }
            if (ratingKey4k && is4k) {
                jellyfinMedia = await this.jellyfinClient?.getItemData(ratingKey4k);
                if (media.mediaType === 'tv' && jellyfinMedia !== undefined) {
                    this.jellyfinSeasonsCache[ratingKey4k] =
                        await this.jellyfinClient?.getSeasons(ratingKey4k);
                }
            }
            if (jellyfinMedia) {
                existsInJellyfin = true;
            }
        }
        catch (ex) {
            if (!ex.message.includes('404') && !ex.message.includes('500')) {
                existsInJellyfin = true;
                preventSeasonSearch = true;
                logger_1.default.debug(`Failure retrieving the ${is4k ? '4K' : 'non-4K'} ${media.mediaType === 'tv' ? 'show' : 'movie'} [TMDB ID ${media.tmdbId}] from Jellyfin.`, {
                    errorMessage: ex.message,
                    label: 'AvailabilitySync',
                });
            }
        }
        // Here we check each season in jellyfin for availability
        // If the API returns an error other than a 404,
        // we will have to prevent the season check from happening
        if (media.mediaType === 'tv') {
            const seasonsMap = new Map();
            if (!preventSeasonSearch) {
                const filteredSeasons = media.seasons.filter((season) => season[is4k ? 'status4k' : 'status'] === media_1.MediaStatus.AVAILABLE ||
                    season[is4k ? 'status4k' : 'status'] ===
                        media_1.MediaStatus.PARTIALLY_AVAILABLE);
                for (const season of filteredSeasons) {
                    const seasonExists = await this.seasonExistsInJellyfin(media, season, is4k);
                    if (seasonExists) {
                        seasonsMap.set(season.seasonNumber, true);
                    }
                }
            }
            return { existsInJellyfin, seasonsMap };
        }
        return { existsInJellyfin };
    }
    async seasonExistsInJellyfin(media, season, is4k) {
        const ratingKey = media.jellyfinMediaId;
        const ratingKey4k = media.jellyfinMediaId4k;
        let seasonExistsInJellyfin = false;
        let jellyfinSeasons;
        if (ratingKey && !is4k) {
            jellyfinSeasons = this.jellyfinSeasonsCache[ratingKey];
        }
        if (ratingKey4k && is4k) {
            jellyfinSeasons = this.jellyfinSeasonsCache[ratingKey4k];
        }
        const seasonMeta = jellyfinSeasons?.find((jellyfinSeason) => jellyfinSeason.IndexNumber === season.seasonNumber);
        if (seasonMeta) {
            const seriesId = is4k ? ratingKey4k : ratingKey;
            if (seriesId) {
                const cacheKey = `${seriesId}-${seasonMeta.Id}`;
                if (cacheKey in this.jellyfinEpisodeExistsCache) {
                    seasonExistsInJellyfin = this.jellyfinEpisodeExistsCache[cacheKey];
                }
                else {
                    try {
                        // Season metadata exists, but we need to verify it has actual
                        // episode files. Jellyfin keeps season entries even after all
                        // episodes are deleted. getEpisodes already filters out
                        // virtual episodes.
                        const episodes = await this.jellyfinClient.getEpisodes(seriesId, seasonMeta.Id);
                        seasonExistsInJellyfin = episodes.length > 0;
                    }
                    catch {
                        // If we can't fetch episodes, assume the season exists
                        // to avoid false removal
                        seasonExistsInJellyfin = true;
                    }
                    this.jellyfinEpisodeExistsCache[cacheKey] = seasonExistsInJellyfin;
                }
            }
        }
        return seasonExistsInJellyfin;
    }
}
const availabilitySync = new AvailabilitySync();
exports.default = availabilitySync;

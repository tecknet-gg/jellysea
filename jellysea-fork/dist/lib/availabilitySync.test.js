"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const jellyfin_1 = __importDefault(require("../api/jellyfin"));
const plexapi_1 = __importDefault(require("../api/plexapi"));
const radarr_1 = __importDefault(require("../api/servarr/radarr"));
const sonarr_1 = __importDefault(require("../api/servarr/sonarr"));
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const media_1 = require("../constants/media");
const server_1 = require("../constants/server");
const datasource_1 = require("../datasource");
const Media_1 = __importDefault(require("../entity/Media"));
const Season_1 = __importDefault(require("../entity/Season"));
const User_1 = require("../entity/User");
const settings_1 = require("../lib/settings");
const db_1 = require("../test/db");
// --- Mock JellyfinAPI ---
let getSystemInfoImpl = async () => ({
    ServerName: 'Test',
});
let getItemDataImpl = async () => undefined;
let getSeasonsImpl = async () => [];
let getEpisodesImpl = async () => [];
Object.defineProperty(jellyfin_1.default.prototype, 'getSystemInfo', {
    get() {
        return async () => getSystemInfoImpl();
    },
    set() { },
    configurable: true,
});
Object.defineProperty(jellyfin_1.default.prototype, 'getItemData', {
    get() {
        return async (id) => getItemDataImpl(id);
    },
    set() { },
    configurable: true,
});
Object.defineProperty(jellyfin_1.default.prototype, 'getSeasons', {
    get() {
        return async (seriesID) => getSeasonsImpl(seriesID);
    },
    set() { },
    configurable: true,
});
Object.defineProperty(jellyfin_1.default.prototype, 'getEpisodes', {
    get() {
        return async (seriesID, seasonID) => getEpisodesImpl(seriesID, seasonID);
    },
    set() { },
    configurable: true,
});
Object.defineProperty(jellyfin_1.default.prototype, 'setUserId', {
    get() {
        return () => { };
    },
    set() { },
    configurable: true,
});
// --- Mock PlexAPI ---
let getMetadataImpl = async () => {
    throw new Error('404');
};
let getChildrenMetadataImpl = async () => [];
Object.defineProperty(plexapi_1.default.prototype, 'getMetadata', {
    get() {
        return async (key, options) => getMetadataImpl(key, options);
    },
    set() { },
    configurable: true,
});
Object.defineProperty(plexapi_1.default.prototype, 'getChildrenMetadata', {
    get() {
        return async (key) => getChildrenMetadataImpl(key);
    },
    set() { },
    configurable: true,
});
// --- Mock SonarrAPI ---
let getSeriesByIdImpl = async () => {
    throw new Error('404');
};
Object.defineProperty(sonarr_1.default.prototype, 'getSeriesById', {
    get() {
        return async (id) => getSeriesByIdImpl(id);
    },
    set() { },
    configurable: true,
});
// --- Mock RadarrAPI ---
let getMovieImpl = async () => {
    throw new Error('404');
};
Object.defineProperty(radarr_1.default.prototype, 'getMovie', {
    get() {
        return async ({ id }) => getMovieImpl(id);
    },
    set() { },
    configurable: true,
});
// --- Mock TheMovieDb ---
let getTvShowImpl = async () => fakeTmdbShow(1);
let getShowByTvdbIdImpl = async () => fakeTmdbShow(1);
Object.defineProperty(themoviedb_1.default.prototype, 'getTvShow', {
    get() {
        return async (args) => getTvShowImpl(args);
    },
    set() { },
    configurable: true,
});
Object.defineProperty(themoviedb_1.default.prototype, 'getShowByTvdbId', {
    get() {
        return async (args) => getShowByTvdbIdImpl(args);
    },
    set() { },
    configurable: true,
});
// --- Helpers ---
function fakeTmdbShow(tmdbId, seasons = [
    {
        id: 1,
        air_date: '2024-01-01',
        episode_count: 10,
        name: 'Season 1',
        overview: '',
        season_number: 1,
    },
]) {
    return {
        id: tmdbId,
        content_ratings: { results: [] },
        created_by: [],
        episode_run_time: [],
        first_air_date: '2024-01-01',
        genres: [],
        homepage: '',
        in_production: false,
        languages: ['en'],
        last_air_date: '2024-01-01',
        name: 'Test Show',
        networks: [],
        number_of_episodes: 10,
        number_of_seasons: seasons.length,
        origin_country: ['US'],
        original_language: 'en',
        original_name: 'Test Show',
        overview: '',
        popularity: 0,
        production_companies: [],
        production_countries: [],
        spoken_languages: [],
        seasons,
        status: 'Ended',
        type: 'Scripted',
        vote_average: 0,
        vote_count: 0,
        aggregate_credits: { cast: [] },
        credits: { crew: [] },
        external_ids: {},
        keywords: { results: [] },
        videos: { results: [] },
    };
}
const availabilitySync_1 = __importDefault(require("../lib/availabilitySync"));
(0, db_1.setupTestDb)();
function configureSonarr(overrides = [{}]) {
    const settings = (0, settings_1.getSettings)();
    settings.sonarr = overrides.map((o, i) => ({
        id: i,
        name: `Sonarr ${i}`,
        hostname: 'localhost',
        port: 8989,
        apiKey: 'test-key',
        baseUrl: '',
        useSsl: false,
        activeProfileId: 1,
        activeDirectory: '/tv',
        activeLanguageProfileId: 1,
        activeAnimeProfileId: undefined,
        activeAnimeDirectory: '',
        activeAnimeLanguageProfileId: undefined,
        animeTags: [],
        is4k: false,
        enableSeasonFolders: true,
        tags: [],
        isDefault: i === 0,
        syncEnabled: true,
        preventSearch: false,
        externalUrl: '',
        ...o,
    }));
    settings.radarr = [];
}
function configureRadarr(overrides = [{}]) {
    const settings = (0, settings_1.getSettings)();
    settings.radarr = overrides.map((o, i) => ({
        id: i,
        name: `Radarr ${i}`,
        hostname: 'localhost',
        port: 7878,
        apiKey: 'test-key',
        baseUrl: '',
        useSsl: false,
        activeProfileId: 1,
        activeProfileName: 'Default',
        activeDirectory: '/movies',
        minimumAvailability: 'released',
        tags: [],
        is4k: false,
        isDefault: i === 0,
        syncEnabled: true,
        preventSearch: false,
        tagRequests: false,
        overrideRule: [],
        externalUrl: '',
        ...o,
    }));
    settings.sonarr = [];
}
function configureJellyfin() {
    const settings = (0, settings_1.getSettings)();
    settings.main.mediaServerType = server_1.MediaServerType.JELLYFIN;
    settings.jellyfin = {
        ...settings.jellyfin,
        apiKey: 'test-api-key',
    };
}
function configurePlex() {
    const settings = (0, settings_1.getSettings)();
    settings.main.mediaServerType = server_1.MediaServerType.PLEX;
}
// --- Jellyfin helpers ---
function fakeJellyfinSeason(seasonNumber, id) {
    return {
        Name: `Season ${seasonNumber}`,
        Id: id ?? `jellyfin-season-${seasonNumber}-id`,
        IndexNumber: seasonNumber,
        Type: 'Season',
        HasSubtitles: false,
        LocationType: 'FileSystem',
        MediaType: 'Video',
    };
}
function fakeJellyfinEpisodes(count) {
    return Array.from({ length: count }, (_, i) => ({
        Name: `Episode ${i + 1}`,
        Id: `ep-${i}`,
        IndexNumber: i + 1,
        Type: 'Episode',
        HasSubtitles: false,
        LocationType: 'FileSystem',
        MediaType: 'Video',
    }));
}
function fakeJellyfinShow(id, tmdbId) {
    return {
        Name: 'Test Show',
        Id: id,
        Type: 'Series',
        HasSubtitles: false,
        LocationType: 'FileSystem',
        MediaType: 'Video',
        ProviderIds: { Tmdb: tmdbId },
    };
}
// --- Plex helpers ---
function fakePlexSeason(seasonNumber, ratingKey) {
    return {
        ratingKey,
        guid: `plex://season/${ratingKey}`,
        type: 'season',
        title: `Season ${seasonNumber}`,
        Guid: [],
        index: seasonNumber,
        leafCount: 0,
        viewedLeafCount: 0,
        addedAt: 0,
        updatedAt: 0,
        Media: [],
    };
}
function fakePlexEpisodes(count) {
    return Array.from({ length: count }, (_, i) => ({
        ratingKey: `ep-${i}`,
        guid: `plex://episode/ep-${i}`,
        type: 'movie',
        title: `Episode ${i + 1}`,
        Guid: [],
        index: i + 1,
        leafCount: 0,
        viewedLeafCount: 0,
        addedAt: 0,
        updatedAt: 0,
        Media: [
            {
                id: i,
                duration: 2400,
                bitrate: 4000,
                width: 1920,
                height: 1080,
                aspectRatio: 1.78,
                audioChannels: 2,
                audioCodec: 'aac',
                videoCodec: 'h264',
                videoResolution: '1080',
                container: 'mkv',
                videoFrameRate: '24p',
                videoProfile: 'high',
            },
        ],
    }));
}
function fakePlexShow(ratingKey) {
    return {
        ratingKey,
        guid: `plex://show/${ratingKey}`,
        type: 'show',
        title: 'Test Show',
        Guid: [],
        index: 1,
        leafCount: 0,
        viewedLeafCount: 0,
        addedAt: 0,
        updatedAt: 0,
        Media: [],
    };
}
// --- Sonarr helpers ---
function fakeSonarrSeasons(totalSeasons, seasonsWithFiles) {
    return Array.from({ length: totalSeasons }, (_, i) => ({
        seasonNumber: i + 1,
        monitored: true,
        statistics: {
            episodeFileCount: seasonsWithFiles[i + 1] ?? 0,
            totalEpisodeCount: 10,
            episodeCount: 10,
            percentOfEpisodes: seasonsWithFiles[i + 1] ? 100 : 0,
            sizeOnDisk: seasonsWithFiles[i + 1] ? 7516192768 : 0,
            previousAiring: undefined,
        },
    }));
}
(0, node_test_1.describe)('AvailabilitySync', () => {
    (0, node_test_1.beforeEach)(async () => {
        getSystemInfoImpl = async () => ({ ServerName: 'Test' });
        getItemDataImpl = async () => undefined;
        getSeasonsImpl = async () => [];
        getEpisodesImpl = async () => [];
        getMetadataImpl = async () => {
            throw new Error('404');
        };
        getChildrenMetadataImpl = async () => [];
        getSeriesByIdImpl = async () => {
            throw new Error('404');
        };
        getMovieImpl = async () => {
            throw new Error('404');
        };
        getTvShowImpl = async ({ tvId }) => fakeTmdbShow(tvId, Array.from({ length: 4 }, (_, i) => ({
            id: i + 1,
            air_date: '2024-01-01',
            episode_count: 10,
            name: `Season ${i + 1}`,
            overview: '',
            season_number: i + 1,
        })));
        getShowByTvdbIdImpl = async ({ tvdbId }) => fakeTmdbShow(tvdbId, Array.from({ length: 4 }, (_, i) => ({
            id: i + 1,
            air_date: '2024-01-01',
            episode_count: 10,
            name: `Season ${i + 1}`,
            overview: '',
            season_number: i + 1,
        })));
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const existingAdmin = await userRepository.findOne({ where: { id: 1 } });
        if (!existingAdmin) {
            const admin = new User_1.User();
            admin.id = 1;
            admin.plexToken = 'test-plex-token';
            admin.jellyfinUserId = 'admin-user-id';
            admin.jellyfinDeviceId = 'admin-device-id';
            admin.email = 'admin@test.com';
            admin.permissions = 2;
            admin.username = 'admin';
            await userRepository.save(admin);
        }
    });
    (0, node_test_1.describe)('TV season availability - Jellyfin', () => {
        (0, node_test_1.it)('should mark deleted seasons as DELETED when only some seasons exist in Jellyfin and Sonarr', async () => {
            configureJellyfin();
            configureSonarr([{ syncEnabled: true }]);
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1408;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.jellyfinMediaId = 'jellyfin-house-id';
            media.externalServiceId = 100;
            media.seasons = [];
            for (let i = 1; i <= 8; i++) {
                media.seasons.push(new Season_1.default({
                    seasonNumber: i,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }));
            }
            await mediaRepository.save(media);
            getItemDataImpl = async (id) => {
                if (id === 'jellyfin-house-id') {
                    return fakeJellyfinShow('jellyfin-house-id', '1408');
                }
                return undefined;
            };
            getSeasonsImpl = async (seriesID) => {
                if (seriesID === 'jellyfin-house-id') {
                    return [fakeJellyfinSeason(6)];
                }
                return [];
            };
            getEpisodesImpl = async (_seriesID, seasonID) => {
                if (seasonID === 'jellyfin-season-6-id') {
                    return fakeJellyfinEpisodes(10);
                }
                return [];
            };
            getSeriesByIdImpl = async (id) => {
                if (id === 100) {
                    return {
                        tvdbId: 73255,
                        id: 100,
                        title: 'House',
                        titleSlug: 'house',
                        monitored: true,
                        statistics: {
                            episodeFileCount: 21,
                            totalEpisodeCount: 10,
                            episodeCount: 10,
                            percentOfEpisodes: 100,
                            sizeOnDisk: 0,
                            seasonCount: 8,
                        },
                        seasons: fakeSonarrSeasons(8, { 6: 10 }),
                    };
                }
                throw new Error('404');
            };
            await availabilitySync_1.default.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1408 },
                relations: ['seasons'],
            });
            const s6 = updated.seasons.find((s) => s.seasonNumber === 6);
            strict_1.default.strictEqual(s6?.status, media_1.MediaStatus.AVAILABLE, 'Season 6 should remain AVAILABLE');
            for (const season of updated.seasons) {
                if (season.seasonNumber !== 6) {
                    strict_1.default.strictEqual(season.status, media_1.MediaStatus.DELETED, `Season ${season.seasonNumber} should be DELETED but was ${season.status}`);
                }
            }
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PARTIALLY_AVAILABLE, 'Show should be PARTIALLY_AVAILABLE after season removal');
        });
        (0, node_test_1.it)('should still mark deleted seasons when externalServiceId is null (no Sonarr link)', async () => {
            configureJellyfin();
            configureSonarr([{ syncEnabled: true }]);
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1409;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.jellyfinMediaId = 'jellyfin-house2-id';
            media.externalServiceId = undefined;
            media.seasons = [];
            for (let i = 1; i <= 8; i++) {
                media.seasons.push(new Season_1.default({
                    seasonNumber: i,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }));
            }
            await mediaRepository.save(media);
            getItemDataImpl = async (id) => {
                if (id === 'jellyfin-house2-id') {
                    return fakeJellyfinShow('jellyfin-house2-id', '1409');
                }
                return undefined;
            };
            getSeasonsImpl = async (seriesID) => {
                if (seriesID === 'jellyfin-house2-id') {
                    return [fakeJellyfinSeason(6, 'jellyfin-house2-s6-id')];
                }
                return [];
            };
            getEpisodesImpl = async (_seriesID, seasonID) => {
                if (seasonID === 'jellyfin-house2-s6-id') {
                    return fakeJellyfinEpisodes(21);
                }
                return [];
            };
            getSeriesByIdImpl = async () => {
                throw new Error('404');
            };
            await availabilitySync_1.default.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1409 },
                relations: ['seasons'],
            });
            const s6 = updated.seasons.find((s) => s.seasonNumber === 6);
            strict_1.default.strictEqual(s6?.status, media_1.MediaStatus.AVAILABLE, 'Season 6 should remain AVAILABLE');
            for (const season of updated.seasons) {
                if (season.seasonNumber !== 6) {
                    strict_1.default.strictEqual(season.status, media_1.MediaStatus.DELETED, `Season ${season.seasonNumber} should be DELETED but was ${season.status}`);
                }
            }
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PARTIALLY_AVAILABLE, 'Show should be PARTIALLY_AVAILABLE after season removal');
        });
        (0, node_test_1.it)('should mark deleted seasons even when Jellyfin returns empty season metadata entries (real-world behavior)', async () => {
            configureJellyfin();
            configureSonarr([{ syncEnabled: true }]);
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1410;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.jellyfinMediaId = 'jellyfin-house3-id';
            media.externalServiceId = 101;
            media.seasons = [];
            for (let i = 1; i <= 8; i++) {
                media.seasons.push(new Season_1.default({
                    seasonNumber: i,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }));
            }
            await mediaRepository.save(media);
            getItemDataImpl = async (id) => {
                if (id === 'jellyfin-house3-id') {
                    return fakeJellyfinShow('jellyfin-house3-id', '1410');
                }
                return undefined;
            };
            // MOCK REAL BEHAVIOR: Jellyfin returns ALL 8 season metadata entries
            // even though only season 6 has actual episode files.
            getSeasonsImpl = async (seriesID) => {
                if (seriesID === 'jellyfin-house3-id') {
                    return Array.from({ length: 8 }, (_, i) => fakeJellyfinSeason(i + 1, `jellyfin-house3-s${i + 1}-id`));
                }
                return [];
            };
            // Only season 6 has actual episodes
            getEpisodesImpl = async (_seriesID, seasonID) => {
                if (seasonID === 'jellyfin-house3-s6-id') {
                    return fakeJellyfinEpisodes(21);
                }
                return [];
            };
            getSeriesByIdImpl = async (id) => {
                if (id === 101) {
                    return {
                        tvdbId: 73255,
                        id: 101,
                        title: 'House',
                        titleSlug: 'house',
                        monitored: true,
                        statistics: {
                            episodeFileCount: 21,
                            totalEpisodeCount: 177,
                            episodeCount: 177,
                            percentOfEpisodes: 11.86,
                            sizeOnDisk: 0,
                            seasonCount: 8,
                        },
                        seasons: fakeSonarrSeasons(8, { 6: 21 }),
                    };
                }
                throw new Error('404');
            };
            await availabilitySync_1.default.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1410 },
                relations: ['seasons'],
            });
            const s6 = updated.seasons.find((s) => s.seasonNumber === 6);
            strict_1.default.strictEqual(s6?.status, media_1.MediaStatus.AVAILABLE, 'Season 6 should remain AVAILABLE');
            for (const season of updated.seasons) {
                if (season.seasonNumber !== 6) {
                    strict_1.default.strictEqual(season.status, media_1.MediaStatus.DELETED, `Season ${season.seasonNumber} should be DELETED but was ${season.status}`);
                }
            }
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PARTIALLY_AVAILABLE, 'Show should be PARTIALLY_AVAILABLE after season removal');
        });
        (0, node_test_1.it)('should assume season exists when getEpisodes fails (safe fallback)', async () => {
            configureJellyfin();
            configureSonarr([{ syncEnabled: true }]);
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1411;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.jellyfinMediaId = 'jellyfin-house4-id';
            media.externalServiceId = 102;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            getItemDataImpl = async (id) => {
                if (id === 'jellyfin-house4-id') {
                    return fakeJellyfinShow('jellyfin-house4-id', '1411');
                }
                return undefined;
            };
            getSeasonsImpl = async (seriesID) => {
                if (seriesID === 'jellyfin-house4-id') {
                    return [fakeJellyfinSeason(1, 'jellyfin-house4-s1-id')];
                }
                return [];
            };
            getEpisodesImpl = async () => {
                throw new Error('Connection refused');
            };
            getSeriesByIdImpl = async (id) => {
                if (id === 102) {
                    return {
                        tvdbId: 99999,
                        id: 102,
                        title: 'House 4',
                        titleSlug: 'house-4',
                        monitored: true,
                        statistics: {
                            episodeFileCount: 10,
                            totalEpisodeCount: 10,
                            episodeCount: 10,
                            percentOfEpisodes: 100,
                            sizeOnDisk: 0,
                            seasonCount: 1,
                        },
                        seasons: fakeSonarrSeasons(1, { 1: 10 }),
                    };
                }
                throw new Error('404');
            };
            await availabilitySync_1.default.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1411 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.seasons[0].status, media_1.MediaStatus.AVAILABLE, 'Season should remain AVAILABLE when getEpisodes fails');
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.AVAILABLE, 'Show should remain AVAILABLE when getEpisodes fails');
        });
        (0, node_test_1.it)('should mark show as PARTIALLY_AVAILABLE when some seasons are available and some are unknown', async () => {
            configureJellyfin();
            configureSonarr([{ syncEnabled: true }]);
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1412;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.jellyfinMediaId = 'jellyfin-partial-id';
            media.externalServiceId = 103;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
                new Season_1.default({
                    seasonNumber: 2,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
                new Season_1.default({
                    seasonNumber: 3,
                    status: media_1.MediaStatus.UNKNOWN,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
                new Season_1.default({
                    seasonNumber: 4,
                    status: media_1.MediaStatus.UNKNOWN,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            getItemDataImpl = async (id) => {
                if (id === 'jellyfin-partial-id') {
                    return fakeJellyfinShow('jellyfin-partial-id', '1412');
                }
                return undefined;
            };
            getSeasonsImpl = async (seriesID) => {
                if (seriesID === 'jellyfin-partial-id') {
                    return [
                        fakeJellyfinSeason(1, 'jellyfin-partial-s1-id'),
                        fakeJellyfinSeason(2, 'jellyfin-partial-s2-id'),
                    ];
                }
                return [];
            };
            getEpisodesImpl = async (_seriesID, seasonID) => {
                if (seasonID === 'jellyfin-partial-s1-id') {
                    return fakeJellyfinEpisodes(10);
                }
                if (seasonID === 'jellyfin-partial-s2-id') {
                    return fakeJellyfinEpisodes(10);
                }
                return [];
            };
            getSeriesByIdImpl = async (id) => {
                if (id === 103) {
                    return {
                        tvdbId: 99997,
                        id: 103,
                        title: 'Partial Show',
                        titleSlug: 'partial-show',
                        monitored: true,
                        statistics: {
                            episodeFileCount: 20,
                            totalEpisodeCount: 40,
                            episodeCount: 40,
                            percentOfEpisodes: 50,
                            sizeOnDisk: 0,
                            seasonCount: 4,
                        },
                        seasons: fakeSonarrSeasons(4, { 1: 10, 2: 10 }),
                    };
                }
                throw new Error('404');
            };
            await availabilitySync_1.default.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1412 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PARTIALLY_AVAILABLE, 'Show should be PARTIALLY_AVAILABLE when some seasons are available and some are unknown');
        });
    });
    (0, node_test_1.describe)('TV season availability - Plex', () => {
        (0, node_test_1.it)('should mark deleted seasons when Plex returns empty season metadata entries', async () => {
            configurePlex();
            configureSonarr([{ syncEnabled: true }]);
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 2000;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.ratingKey = 'plex-house-rk';
            media.externalServiceId = 200;
            media.seasons = [];
            for (let i = 1; i <= 8; i++) {
                media.seasons.push(new Season_1.default({
                    seasonNumber: i,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }));
            }
            await mediaRepository.save(media);
            getMetadataImpl = async (key) => {
                if (key === 'plex-house-rk') {
                    return fakePlexShow('plex-house-rk');
                }
                throw new Error('404');
            };
            // Plex returns ALL 8 season metadata entries,
            // but only season 6 has episode files
            getChildrenMetadataImpl = async (key) => {
                if (key === 'plex-house-rk') {
                    return Array.from({ length: 8 }, (_, i) => fakePlexSeason(i + 1, `plex-house-s${i + 1}-rk`));
                }
                if (key === 'plex-house-s6-rk') {
                    return fakePlexEpisodes(21);
                }
                return [];
            };
            // Sonarr: only season 6 has files
            getSeriesByIdImpl = async (id) => {
                if (id === 200) {
                    return {
                        tvdbId: 73255,
                        id: 200,
                        title: 'House',
                        titleSlug: 'house',
                        monitored: true,
                        statistics: {
                            episodeFileCount: 21,
                            totalEpisodeCount: 177,
                            episodeCount: 177,
                            percentOfEpisodes: 11.86,
                            sizeOnDisk: 0,
                            seasonCount: 8,
                        },
                        seasons: fakeSonarrSeasons(8, { 6: 21 }),
                    };
                }
                throw new Error('404');
            };
            await availabilitySync_1.default.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 2000 },
                relations: ['seasons'],
            });
            const s6 = updated.seasons.find((s) => s.seasonNumber === 6);
            strict_1.default.strictEqual(s6?.status, media_1.MediaStatus.AVAILABLE, 'Season 6 should remain AVAILABLE');
            for (const season of updated.seasons) {
                if (season.seasonNumber !== 6) {
                    strict_1.default.strictEqual(season.status, media_1.MediaStatus.DELETED, `Season ${season.seasonNumber} should be DELETED but was ${season.status}`);
                }
            }
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PARTIALLY_AVAILABLE, 'Show should be PARTIALLY_AVAILABLE after season removal');
        });
        (0, node_test_1.it)('should mark a deleted show as DELETED when a second standard Sonarr instance has a colliding externalServiceId', async () => {
            configurePlex();
            configureSonarr([{ syncEnabled: true }, { syncEnabled: true }]);
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 3000;
            media.tvdbId = 73255;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.ratingKey = 'gone-from-plex-rk';
            media.externalServiceId = 200;
            media.serviceId = 0;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
                new Season_1.default({
                    seasonNumber: 2,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            // Probed once per standard instance with the same id (200): origin 404s
            // (deleted); the other instance has a different series at 200.
            let sonarrCall = 0;
            getSeriesByIdImpl = async (id) => {
                if (id !== 200) {
                    throw new Error('404');
                }
                sonarrCall += 1;
                if (sonarrCall === 1) {
                    throw new Error('404');
                }
                return {
                    tvdbId: 999999,
                    id: 200,
                    title: 'Unrelated Colliding Series',
                    titleSlug: 'unrelated-colliding-series',
                    monitored: true,
                    statistics: {
                        episodeFileCount: 12,
                        totalEpisodeCount: 12,
                        episodeCount: 12,
                        percentOfEpisodes: 100,
                        sizeOnDisk: 0,
                        seasonCount: 1,
                    },
                    seasons: fakeSonarrSeasons(1, { 1: 12 }),
                };
            };
            await availabilitySync_1.default.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 3000 },
                relations: ['seasons'],
            });
            for (const season of updated.seasons) {
                strict_1.default.strictEqual(season.status, media_1.MediaStatus.DELETED, `Season ${season.seasonNumber} should be DELETED (collision must not keep it available) but was ${season.status}`);
            }
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.DELETED, 'Show deleted from its origin instance and Plex must not be kept alive by a colliding externalServiceId on another standard instance');
        });
        (0, node_test_1.it)('should assume season exists when getChildrenMetadata fails for episodes (safe fallback)', async () => {
            configurePlex();
            configureSonarr([{ syncEnabled: true }]);
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 2001;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.ratingKey = 'plex-house2-rk';
            media.externalServiceId = 201;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            getMetadataImpl = async (key) => {
                if (key === 'plex-house2-rk') {
                    return fakePlexShow('plex-house2-rk');
                }
                throw new Error('404');
            };
            getChildrenMetadataImpl = async (key) => {
                if (key === 'plex-house2-rk') {
                    return [fakePlexSeason(1, 'plex-house2-s1-rk')];
                }
                throw new Error('Connection refused');
            };
            getSeriesByIdImpl = async (id) => {
                if (id === 201) {
                    return {
                        tvdbId: 99999,
                        id: 201,
                        title: 'House 2',
                        titleSlug: 'house-2',
                        monitored: true,
                        statistics: {
                            episodeFileCount: 10,
                            totalEpisodeCount: 10,
                            episodeCount: 10,
                            percentOfEpisodes: 100,
                            sizeOnDisk: 0,
                            seasonCount: 1,
                        },
                        seasons: fakeSonarrSeasons(1, { 1: 10 }),
                    };
                }
                throw new Error('404');
            };
            await availabilitySync_1.default.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 2001 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.seasons[0].status, media_1.MediaStatus.AVAILABLE, 'Season should remain AVAILABLE when getChildrenMetadata fails');
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.AVAILABLE, 'Show should remain AVAILABLE when getChildrenMetadata fails');
        });
        (0, node_test_1.it)('should mark deleted seasons when only some seasons have episodes in Plex (no Sonarr link)', async () => {
            configurePlex();
            configureSonarr([{ syncEnabled: true }]);
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 2002;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.ratingKey = 'plex-house3-rk';
            media.externalServiceId = undefined;
            media.seasons = [];
            for (let i = 1; i <= 4; i++) {
                media.seasons.push(new Season_1.default({
                    seasonNumber: i,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }));
            }
            await mediaRepository.save(media);
            getMetadataImpl = async (key) => {
                if (key === 'plex-house3-rk') {
                    return fakePlexShow('plex-house3-rk');
                }
                throw new Error('404');
            };
            getChildrenMetadataImpl = async (key) => {
                if (key === 'plex-house3-rk') {
                    return Array.from({ length: 4 }, (_, i) => fakePlexSeason(i + 1, `plex-house3-s${i + 1}-rk`));
                }
                // Only seasons 2 and 4 have episodes
                if (key === 'plex-house3-s2-rk' || key === 'plex-house3-s4-rk') {
                    return fakePlexEpisodes(10);
                }
                return [];
            };
            getSeriesByIdImpl = async () => {
                throw new Error('404');
            };
            await availabilitySync_1.default.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 2002 },
                relations: ['seasons'],
            });
            const s2 = updated.seasons.find((s) => s.seasonNumber === 2);
            const s4 = updated.seasons.find((s) => s.seasonNumber === 4);
            strict_1.default.strictEqual(s2?.status, media_1.MediaStatus.AVAILABLE, 'Season 2 should remain AVAILABLE');
            strict_1.default.strictEqual(s4?.status, media_1.MediaStatus.AVAILABLE, 'Season 4 should remain AVAILABLE');
            const s1 = updated.seasons.find((s) => s.seasonNumber === 1);
            const s3 = updated.seasons.find((s) => s.seasonNumber === 3);
            strict_1.default.strictEqual(s1?.status, media_1.MediaStatus.DELETED, 'Season 1 should be DELETED');
            strict_1.default.strictEqual(s3?.status, media_1.MediaStatus.DELETED, 'Season 3 should be DELETED');
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PARTIALLY_AVAILABLE, 'Show should be PARTIALLY_AVAILABLE after season removal');
        });
    });
    (0, node_test_1.describe)('movie availability - Radarr', () => {
        (0, node_test_1.it)('should mark a deleted movie as DELETED when a second standard Radarr instance has a colliding externalServiceId', async () => {
            configurePlex();
            configureRadarr([{ syncEnabled: true }, { syncEnabled: true }]);
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 5000;
            media.mediaType = media_1.MediaType.MOVIE;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.ratingKey = 'gone-from-plex-rk';
            media.externalServiceId = 300;
            media.serviceId = 0;
            await mediaRepository.save(media);
            // Probed once per standard instance with the same id (300): origin 404s
            // (deleted); the other instance has a different movie at 300.
            let radarrCall = 0;
            getMovieImpl = async (id) => {
                if (id !== 300) {
                    throw new Error('404');
                }
                radarrCall += 1;
                if (radarrCall === 1) {
                    throw new Error('404');
                }
                return {
                    id: 300,
                    tmdbId: 999999,
                    title: 'Unrelated Colliding Movie',
                    hasFile: true,
                };
            };
            await availabilitySync_1.default.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 5000 },
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.DELETED, 'Movie deleted from its origin instance and Plex must not be kept alive by a colliding externalServiceId on another standard instance');
        });
    });
    (0, node_test_1.describe)('specials season handling', () => {
        const tmdbSeasonsWithSpecials = [
            {
                id: 100,
                air_date: '2024-01-01',
                episode_count: 3,
                name: 'Specials',
                overview: '',
                season_number: 0,
            },
            {
                id: 101,
                air_date: '2024-01-01',
                episode_count: 10,
                name: 'Season 1',
                overview: '',
                season_number: 1,
            },
        ];
        (0, node_test_1.it)('should not demote an available show when only the specials season is missing (Jellyfin)', async () => {
            configureJellyfin();
            configureSonarr([{ syncEnabled: true }]);
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 13862;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.jellyfinMediaId = 'jellyfin-shogun-id';
            media.externalServiceId = 300;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 0,
                    status: media_1.MediaStatus.UNKNOWN,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            getTvShowImpl = async () => fakeTmdbShow(13862, tmdbSeasonsWithSpecials);
            getItemDataImpl = async (id) => {
                if (id === 'jellyfin-shogun-id') {
                    return fakeJellyfinShow('jellyfin-shogun-id', '13862');
                }
                return undefined;
            };
            getSeasonsImpl = async (seriesID) => {
                if (seriesID === 'jellyfin-shogun-id') {
                    return [fakeJellyfinSeason(1, 'jellyfin-shogun-s1-id')];
                }
                return [];
            };
            getEpisodesImpl = async (_seriesID, seasonID) => {
                if (seasonID === 'jellyfin-shogun-s1-id') {
                    return fakeJellyfinEpisodes(10);
                }
                return [];
            };
            getSeriesByIdImpl = async (id) => {
                if (id === 300) {
                    return {
                        tvdbId: 70814,
                        id: 300,
                        title: 'Shogun',
                        titleSlug: 'shogun',
                        monitored: true,
                        statistics: {
                            episodeFileCount: 10,
                            totalEpisodeCount: 10,
                            episodeCount: 10,
                            percentOfEpisodes: 100,
                            sizeOnDisk: 0,
                            seasonCount: 1,
                        },
                        seasons: fakeSonarrSeasons(1, { 1: 10 }),
                    };
                }
                throw new Error('404');
            };
            await availabilitySync_1.default.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 13862 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.AVAILABLE, 'Show should stay AVAILABLE when only the specials season is missing');
        });
        (0, node_test_1.it)('should not demote an available show when only the specials season is missing (Plex)', async () => {
            configurePlex();
            configureSonarr([{ syncEnabled: true }]);
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 13863;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.ratingKey = 'plex-shogun-rk';
            media.externalServiceId = 301;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 0,
                    status: media_1.MediaStatus.UNKNOWN,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            getTvShowImpl = async () => fakeTmdbShow(13863, tmdbSeasonsWithSpecials);
            getMetadataImpl = async (key) => {
                if (key === 'plex-shogun-rk') {
                    return fakePlexShow('plex-shogun-rk');
                }
                throw new Error('404');
            };
            getChildrenMetadataImpl = async (key) => {
                if (key === 'plex-shogun-rk') {
                    return [fakePlexSeason(1, 'plex-shogun-s1-rk')];
                }
                if (key === 'plex-shogun-s1-rk') {
                    return fakePlexEpisodes(10);
                }
                return [];
            };
            getSeriesByIdImpl = async (id) => {
                if (id === 301) {
                    return {
                        tvdbId: 70814,
                        id: 301,
                        title: 'Shogun',
                        titleSlug: 'shogun',
                        monitored: true,
                        statistics: {
                            episodeFileCount: 10,
                            totalEpisodeCount: 10,
                            episodeCount: 10,
                            percentOfEpisodes: 100,
                            sizeOnDisk: 0,
                            seasonCount: 1,
                        },
                        seasons: fakeSonarrSeasons(1, { 1: 10 }),
                    };
                }
                throw new Error('404');
            };
            await availabilitySync_1.default.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 13863 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.AVAILABLE, 'Show should stay AVAILABLE when only the specials season is missing');
        });
        (0, node_test_1.it)('should mark a removed specials season as DELETED without demoting the show (Jellyfin)', async () => {
            configureJellyfin();
            configureSonarr([{ syncEnabled: true }]);
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 13864;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.jellyfinMediaId = 'jellyfin-specials-id';
            media.externalServiceId = 302;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 0,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            getTvShowImpl = async () => fakeTmdbShow(13864, tmdbSeasonsWithSpecials);
            getItemDataImpl = async (id) => {
                if (id === 'jellyfin-specials-id') {
                    return fakeJellyfinShow('jellyfin-specials-id', '13864');
                }
                return undefined;
            };
            getSeasonsImpl = async (seriesID) => {
                if (seriesID === 'jellyfin-specials-id') {
                    return [fakeJellyfinSeason(1, 'jellyfin-specials-s1-id')];
                }
                return [];
            };
            getEpisodesImpl = async (_seriesID, seasonID) => {
                if (seasonID === 'jellyfin-specials-s1-id') {
                    return fakeJellyfinEpisodes(10);
                }
                return [];
            };
            getSeriesByIdImpl = async (id) => {
                if (id === 302) {
                    return {
                        tvdbId: 70814,
                        id: 302,
                        title: 'Shogun',
                        titleSlug: 'shogun',
                        monitored: true,
                        statistics: {
                            episodeFileCount: 10,
                            totalEpisodeCount: 10,
                            episodeCount: 10,
                            percentOfEpisodes: 100,
                            sizeOnDisk: 0,
                            seasonCount: 1,
                        },
                        seasons: fakeSonarrSeasons(1, { 1: 10 }),
                    };
                }
                throw new Error('404');
            };
            await availabilitySync_1.default.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 13864 },
                relations: ['seasons'],
            });
            const specials = updated.seasons.find((s) => s.seasonNumber === 0);
            strict_1.default.strictEqual(specials?.status, media_1.MediaStatus.DELETED, 'Removed specials season should be marked DELETED');
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.AVAILABLE, 'Show should stay AVAILABLE when only specials were removed');
        });
    });
});

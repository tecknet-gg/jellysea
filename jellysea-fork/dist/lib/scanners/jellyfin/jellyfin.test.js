"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const animelist_1 = __importDefault(require("../../../api/animelist"));
const jellyfin_1 = __importDefault(require("../../../api/jellyfin"));
const themoviedb_1 = __importDefault(require("../../../api/themoviedb"));
const media_1 = require("../../../constants/media");
const server_1 = require("../../../constants/server");
const datasource_1 = require("../../../datasource");
const Media_1 = __importDefault(require("../../../entity/Media"));
const Season_1 = __importDefault(require("../../../entity/Season"));
const User_1 = require("../../../entity/User");
const settings_1 = require("../../../lib/settings");
const db_1 = require("../../../test/db");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
// --- Mock animeList.sync to avoid filesystem/network I/O in tests ---
Object.defineProperty(animelist_1.default, 'sync', {
    value: async () => { },
    configurable: true,
    writable: true,
});
// --- Mock JellyfinAPI ---
let getLibraryContentsImpl = async () => [];
let getItemDataImpl = async () => undefined;
let getSeasonsImpl = async () => [];
let getEpisodesImpl = async () => [];
Object.defineProperty(jellyfin_1.default.prototype, 'getLibraryContents', {
    get() {
        return async (id) => getLibraryContentsImpl(id);
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
// --- Mock TheMovieDb ---
let getTvShowImpl = async () => fakeTmdbShow(1);
Object.defineProperty(themoviedb_1.default.prototype, 'getTvShow', {
    get() {
        return async (args) => getTvShowImpl(args);
    },
    set() { },
    configurable: true,
});
const jellyfin_2 = require("../../../lib/scanners/jellyfin");
(0, db_1.setupTestDb)();
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
function fakeJellyfinSeriesItem(id) {
    return {
        Name: 'Test Show',
        Id: id,
        Type: 'Series',
        HasSubtitles: false,
        LocationType: 'FileSystem',
        MediaType: 'Video',
    };
}
function fakeJellyfinShowMetadata(id, tmdbId) {
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
function fakeJellyfinSeason(seasonNumber, id) {
    return {
        Name: `Season ${seasonNumber}`,
        Id: id,
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
function configureJellyfinWithLibrary(libraries = [
    { id: 'test-library-id', name: 'TV Shows', enabled: true, type: 'show' },
]) {
    const settings = (0, settings_1.getSettings)();
    settings.main.mediaServerType = server_1.MediaServerType.JELLYFIN;
    settings.jellyfin = {
        ...settings.jellyfin,
        apiKey: 'test-api-key',
        libraries,
    };
}
(0, node_test_1.describe)('Jellyfin Scanner', () => {
    (0, node_test_1.beforeEach)(async () => {
        getLibraryContentsImpl = async () => [];
        getItemDataImpl = async () => undefined;
        getSeasonsImpl = async () => [];
        getEpisodesImpl = async () => [];
        getTvShowImpl = async () => fakeTmdbShow(1);
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const existingAdmin = await userRepository.findOne({ where: { id: 1 } });
        if (!existingAdmin) {
            const admin = new User_1.User();
            admin.id = 1;
            admin.jellyfinUserId = 'admin-user-id';
            admin.jellyfinDeviceId = 'admin-device-id';
            admin.email = 'admin@test.com';
            admin.permissions = 2;
            admin.username = 'admin';
            await userRepository.save(admin);
        }
    });
    (0, node_test_1.describe)('empty TMDB season handling', () => {
        (0, node_test_1.it)('should mark show as available when all non-empty TMDB seasons are fully scanned and an empty placeholder season exists in the DB', async () => {
            configureJellyfinWithLibrary();
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 5000;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.PARTIALLY_AVAILABLE;
            media.jellyfinMediaId = 'jf-scanner-show-id';
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
            ];
            await mediaRepository.save(media);
            getTvShowImpl = async () => fakeTmdbShow(5000, [
                {
                    id: 1,
                    air_date: '2024-01-01',
                    episode_count: 10,
                    name: 'Season 1',
                    overview: '',
                    season_number: 1,
                },
                {
                    id: 2,
                    air_date: '2024-01-01',
                    episode_count: 10,
                    name: 'Season 2',
                    overview: '',
                    season_number: 2,
                },
                {
                    id: 3,
                    air_date: '2024-01-01',
                    episode_count: 0,
                    name: 'Season 3',
                    overview: '',
                    season_number: 3,
                },
            ]);
            // Jellyfin: S1 and S2 are fully scanned; S3 has no files.
            getLibraryContentsImpl = async (id) => {
                if (id === 'test-library-id') {
                    return [fakeJellyfinSeriesItem('jf-scanner-show-id')];
                }
                return [];
            };
            getItemDataImpl = async (id) => {
                if (id === 'jf-scanner-show-id') {
                    return fakeJellyfinShowMetadata('jf-scanner-show-id', '5000');
                }
                return undefined;
            };
            getSeasonsImpl = async (seriesID) => {
                if (seriesID === 'jf-scanner-show-id') {
                    return [
                        fakeJellyfinSeason(1, 'jf-scanner-s1-id'),
                        fakeJellyfinSeason(2, 'jf-scanner-s2-id'),
                    ];
                }
                return [];
            };
            getEpisodesImpl = async (_seriesID, seasonID) => {
                if (seasonID === 'jf-scanner-s1-id')
                    return fakeJellyfinEpisodes(10);
                if (seasonID === 'jf-scanner-s2-id')
                    return fakeJellyfinEpisodes(10);
                return [];
            };
            await jellyfin_2.jellyfinFullScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 5000 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.AVAILABLE, 'Show should be AVAILABLE when all non-empty TMDB seasons are fully scanned, ignoring empty placeholder seasons');
        });
        (0, node_test_1.it)('should mark show as available when an orphan UNKNOWN season exists in the DB but not in TMDB', async () => {
            configureJellyfinWithLibrary();
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 5001;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.PARTIALLY_AVAILABLE;
            media.jellyfinMediaId = 'jf-orphan-show-id';
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
                // Not present in the TMDB season list below
                new Season_1.default({
                    seasonNumber: 2,
                    status: media_1.MediaStatus.UNKNOWN,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            getTvShowImpl = async () => fakeTmdbShow(5001, [
                {
                    id: 1,
                    air_date: '2024-01-01',
                    episode_count: 10,
                    name: 'Season 1',
                    overview: '',
                    season_number: 1,
                },
            ]);
            getLibraryContentsImpl = async (id) => {
                if (id === 'test-library-id') {
                    return [fakeJellyfinSeriesItem('jf-orphan-show-id')];
                }
                return [];
            };
            getItemDataImpl = async (id) => {
                if (id === 'jf-orphan-show-id') {
                    return fakeJellyfinShowMetadata('jf-orphan-show-id', '5001');
                }
                return undefined;
            };
            getSeasonsImpl = async (seriesID) => {
                if (seriesID === 'jf-orphan-show-id') {
                    return [fakeJellyfinSeason(1, 'jf-orphan-s1-id')];
                }
                return [];
            };
            getEpisodesImpl = async (_seriesID, seasonID) => {
                if (seasonID === 'jf-orphan-s1-id')
                    return fakeJellyfinEpisodes(10);
                return [];
            };
            await jellyfin_2.jellyfinFullScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 5001 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.AVAILABLE, 'Show should be AVAILABLE when the only DB season missing from TMDB is an UNKNOWN orphan placeholder');
        });
        (0, node_test_1.it)('should keep show partially available when a season missing from TMDB was previously available', async () => {
            configureJellyfinWithLibrary();
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 5002;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.PARTIALLY_AVAILABLE;
            media.jellyfinMediaId = 'jf-deleted-show-id';
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
                new Season_1.default({
                    seasonNumber: 2,
                    status: media_1.MediaStatus.DELETED,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            getTvShowImpl = async () => fakeTmdbShow(5002, [
                {
                    id: 1,
                    air_date: '2024-01-01',
                    episode_count: 10,
                    name: 'Season 1',
                    overview: '',
                    season_number: 1,
                },
            ]);
            getLibraryContentsImpl = async (id) => {
                if (id === 'test-library-id') {
                    return [fakeJellyfinSeriesItem('jf-deleted-show-id')];
                }
                return [];
            };
            getItemDataImpl = async (id) => {
                if (id === 'jf-deleted-show-id') {
                    return fakeJellyfinShowMetadata('jf-deleted-show-id', '5002');
                }
                return undefined;
            };
            getSeasonsImpl = async (seriesID) => {
                if (seriesID === 'jf-deleted-show-id') {
                    return [fakeJellyfinSeason(1, 'jf-deleted-s1-id')];
                }
                return [];
            };
            getEpisodesImpl = async (_seriesID, seasonID) => {
                if (seasonID === 'jf-deleted-s1-id')
                    return fakeJellyfinEpisodes(10);
                return [];
            };
            await jellyfin_2.jellyfinFullScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 5002 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PARTIALLY_AVAILABLE, 'Show should stay PARTIALLY_AVAILABLE when a DELETED season is missing from the metadata provider');
        });
    });
});

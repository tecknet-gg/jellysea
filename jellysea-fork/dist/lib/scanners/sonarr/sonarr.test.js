"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sonarr_1 = __importDefault(require("../../../api/servarr/sonarr"));
const themoviedb_1 = __importDefault(require("../../../api/themoviedb"));
const media_1 = require("../../../constants/media");
const datasource_1 = require("../../../datasource");
const Media_1 = __importDefault(require("../../../entity/Media"));
const MediaRequest_1 = __importDefault(require("../../../entity/MediaRequest"));
const Season_1 = __importDefault(require("../../../entity/Season"));
const User_1 = require("../../../entity/User");
const sonarr_2 = require("../../../lib/scanners/sonarr");
const settings_1 = require("../../../lib/settings");
const db_1 = require("../../../test/db");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
let getSeriesImpl = async () => [];
Object.defineProperty(sonarr_1.default.prototype, 'getSeries', {
    set() { },
    get() {
        return async () => getSeriesImpl();
    },
    configurable: true,
});
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
        number_of_seasons: 1,
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
let getShowByTvdbIdImpl = async () => fakeTmdbShow(1);
themoviedb_1.default.prototype.getShowByTvdbId = async function (args) {
    return getShowByTvdbIdImpl(args);
};
let getTvShowImpl = async () => fakeTmdbShow(1);
Object.defineProperty(themoviedb_1.default.prototype, 'getTvShow', {
    set() { },
    get() {
        return async (args) => getTvShowImpl(args);
    },
    configurable: true,
});
node_test_1.mock.method(MediaRequest_1.default, 'sendNotification', async () => undefined);
(0, db_1.setupTestDb)();
function fakeSonarrSeries(overrides = {}) {
    return {
        tvdbId: 100,
        id: 1,
        title: 'Test Show',
        titleSlug: 'test-show',
        monitored: true,
        seasons: [
            {
                seasonNumber: 1,
                monitored: true,
                statistics: {
                    episodeFileCount: 10,
                    totalEpisodeCount: 10,
                    episodeCount: 10,
                    percentOfEpisodes: 100,
                    sizeOnDisk: 0,
                    previousAiring: undefined,
                },
            },
        ],
        ...overrides,
    };
}
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
(0, node_test_1.describe)('Sonarr Scanner', () => {
    (0, node_test_1.beforeEach)(() => {
        getSeriesImpl = async () => [];
        getShowByTvdbIdImpl = async () => fakeTmdbShow(1);
        getTvShowImpl = async () => fakeTmdbShow(1);
    });
    (0, node_test_1.describe)('orphaned show cleanup', () => {
        (0, node_test_1.it)('skips cleanup when a standard server has sync disabled', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1050;
            media.tvdbId = 550;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.PROCESSING;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.PROCESSING,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            configureSonarr([
                { syncEnabled: true, id: 0, hostname: 'server-a' },
                { syncEnabled: false, id: 1, hostname: 'server-b' },
            ]);
            getSeriesImpl = async () => [];
            await sonarr_2.sonarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1050 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PROCESSING);
            strict_1.default.strictEqual(updated.seasons[0].status, media_1.MediaStatus.PROCESSING);
        });
        (0, node_test_1.it)('resets PROCESSING to UNKNOWN when show is not in any Sonarr server', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1000;
            media.tvdbId = 500;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.PROCESSING;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.PROCESSING,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            configureSonarr([{ syncEnabled: true }]);
            getSeriesImpl = async () => [fakeSonarrSeries({ tvdbId: 999 })];
            await sonarr_2.sonarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1000 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.UNKNOWN);
            strict_1.default.strictEqual(updated.seasons[0].status, media_1.MediaStatus.UNKNOWN);
        });
        (0, node_test_1.it)('does not reset AVAILABLE show when missing from Sonarr', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1001;
            media.tvdbId = 501;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.AVAILABLE;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            configureSonarr([{ syncEnabled: true }]);
            getSeriesImpl = async () => [];
            await sonarr_2.sonarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1001 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.AVAILABLE);
        });
        (0, node_test_1.it)('does not reset PROCESSING show that still exists in Sonarr', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1;
            media.tvdbId = 200;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.PROCESSING;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.PROCESSING,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            configureSonarr([{ syncEnabled: true }]);
            getSeriesImpl = async () => [
                fakeSonarrSeries({
                    tvdbId: 200,
                    seasons: [
                        {
                            seasonNumber: 1,
                            monitored: true,
                            statistics: {
                                episodeFileCount: 0,
                                totalEpisodeCount: 10,
                                episodeCount: 10,
                                percentOfEpisodes: 0,
                                sizeOnDisk: 0,
                                previousAiring: undefined,
                            },
                        },
                    ],
                }),
            ];
            getShowByTvdbIdImpl = async () => fakeTmdbShow(1);
            getTvShowImpl = async () => fakeTmdbShow(1);
            await sonarr_2.sonarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PROCESSING);
        });
        (0, node_test_1.it)('only resets season statuses that are PROCESSING on orphaned shows', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1003;
            media.tvdbId = 503;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.PROCESSING;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.AVAILABLE,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
                new Season_1.default({
                    seasonNumber: 2,
                    status: media_1.MediaStatus.PROCESSING,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(media);
            configureSonarr([{ syncEnabled: true }]);
            getSeriesImpl = async () => [fakeSonarrSeries({ tvdbId: 999 })];
            await sonarr_2.sonarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1003 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.UNKNOWN);
            const s1 = updated.seasons.find((s) => s.seasonNumber === 1);
            const s2 = updated.seasons.find((s) => s.seasonNumber === 2);
            strict_1.default.strictEqual(s1?.status, media_1.MediaStatus.AVAILABLE);
            strict_1.default.strictEqual(s2?.status, media_1.MediaStatus.UNKNOWN);
        });
        (0, node_test_1.it)('does not reset movie media that is missing from Sonarr', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1004;
            media.mediaType = media_1.MediaType.MOVIE;
            media.status = media_1.MediaStatus.PROCESSING;
            await mediaRepository.save(media);
            configureSonarr([{ syncEnabled: true }]);
            getSeriesImpl = async () => [];
            await sonarr_2.sonarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1004 },
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PROCESSING);
        });
        (0, node_test_1.it)('only resets orphaned shows not found across all servers', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const orphan = new Media_1.default();
            orphan.tmdbId = 1010;
            orphan.tvdbId = 510;
            orphan.mediaType = media_1.MediaType.TV;
            orphan.status = media_1.MediaStatus.PROCESSING;
            orphan.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.PROCESSING,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(orphan);
            const existing = new Media_1.default();
            existing.tmdbId = 2;
            existing.tvdbId = 511;
            existing.mediaType = media_1.MediaType.TV;
            existing.status = media_1.MediaStatus.PROCESSING;
            existing.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.PROCESSING,
                    status4k: media_1.MediaStatus.UNKNOWN,
                }),
            ];
            await mediaRepository.save(existing);
            configureSonarr([
                { syncEnabled: true, id: 0, hostname: 'server-a' },
                { syncEnabled: true, id: 1, hostname: 'server-b' },
            ]);
            getSeriesImpl = async () => [fakeSonarrSeries({ tvdbId: 511 })];
            getShowByTvdbIdImpl = async () => fakeTmdbShow(2);
            getTvShowImpl = async () => fakeTmdbShow(2);
            await sonarr_2.sonarrScanner.run();
            const updatedOrphan = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1010 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updatedOrphan.status, media_1.MediaStatus.UNKNOWN);
            const updatedExisting = await mediaRepository.findOneOrFail({
                where: { tmdbId: 2 },
                relations: ['seasons'],
            });
            strict_1.default.notStrictEqual(updatedExisting.status, media_1.MediaStatus.UNKNOWN);
        });
        (0, node_test_1.it)('skips shows without a tvdbId during cleanup', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1020;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.PROCESSING;
            media.seasons = [];
            await mediaRepository.save(media);
            configureSonarr([{ syncEnabled: true }]);
            getSeriesImpl = async () => [fakeSonarrSeries({ tvdbId: 999 })];
            await sonarr_2.sonarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1020 },
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PROCESSING);
        });
    });
    (0, node_test_1.describe)('4k orphaned show cleanup', () => {
        (0, node_test_1.it)('resets 4k PROCESSING to UNKNOWN when show is not in any Sonarr server', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1030;
            media.tvdbId = 530;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.UNKNOWN;
            media.status4k = media_1.MediaStatus.PROCESSING;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.UNKNOWN,
                    status4k: media_1.MediaStatus.PROCESSING,
                }),
            ];
            await mediaRepository.save(media);
            configureSonarr([{ syncEnabled: true, is4k: true }]);
            getSeriesImpl = async () => [fakeSonarrSeries({ tvdbId: 999 })];
            await sonarr_2.sonarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1030 },
                relations: ['seasons'],
            });
            strict_1.default.strictEqual(updated.status4k, media_1.MediaStatus.UNKNOWN);
            strict_1.default.strictEqual(updated.seasons[0].status4k, media_1.MediaStatus.UNKNOWN);
        });
        (0, node_test_1.it)('does not reset 4k AVAILABLE season when show is orphaned', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 1031;
            media.tvdbId = 531;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.UNKNOWN;
            media.status4k = media_1.MediaStatus.PROCESSING;
            media.seasons = [
                new Season_1.default({
                    seasonNumber: 1,
                    status: media_1.MediaStatus.UNKNOWN,
                    status4k: media_1.MediaStatus.AVAILABLE,
                }),
                new Season_1.default({
                    seasonNumber: 2,
                    status: media_1.MediaStatus.UNKNOWN,
                    status4k: media_1.MediaStatus.PROCESSING,
                }),
            ];
            await mediaRepository.save(media);
            configureSonarr([{ syncEnabled: true, is4k: true }]);
            getSeriesImpl = async () => [fakeSonarrSeries({ tvdbId: 999 })];
            await sonarr_2.sonarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1031 },
                relations: ['seasons'],
            });
            const s1 = updated.seasons.find((s) => s.seasonNumber === 1);
            const s2 = updated.seasons.find((s) => s.seasonNumber === 2);
            strict_1.default.strictEqual(s1?.status4k, media_1.MediaStatus.AVAILABLE);
            strict_1.default.strictEqual(s2?.status4k, media_1.MediaStatus.UNKNOWN);
        });
    });
    (0, node_test_1.describe)('orphaned request handling', () => {
        (0, node_test_1.it)('declines the approved request and resets the show to UNKNOWN when orphaned', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.default);
            const userRepository = (0, datasource_1.getRepository)(User_1.User);
            const requestedBy = await userRepository.findOneOrFail({
                where: { id: 1 },
            });
            const media = await mediaRepository.save(new Media_1.default({
                tmdbId: 2000,
                tvdbId: 555,
                mediaType: media_1.MediaType.TV,
                status: media_1.MediaStatus.PROCESSING,
                seasons: [
                    new Season_1.default({
                        seasonNumber: 1,
                        status: media_1.MediaStatus.PROCESSING,
                        status4k: media_1.MediaStatus.UNKNOWN,
                    }),
                ],
            }));
            const settings = (0, settings_1.getSettings)();
            settings.sonarr = [];
            settings.radarr = [];
            const request = await requestRepository.save(new MediaRequest_1.default({
                type: media_1.MediaType.TV,
                status: media_1.MediaRequestStatus.APPROVED,
                media,
                requestedBy,
                is4k: false,
            }));
            configureSonarr([{ syncEnabled: true }]);
            getSeriesImpl = async () => [fakeSonarrSeries({ tvdbId: 999 })];
            await sonarr_2.sonarrScanner.run();
            const updatedMedia = await mediaRepository.findOneOrFail({
                where: { tmdbId: 2000 },
            });
            const updatedRequest = await requestRepository.findOneOrFail({
                where: { id: request.id },
            });
            strict_1.default.strictEqual(updatedMedia.status, media_1.MediaStatus.UNKNOWN);
            strict_1.default.strictEqual(updatedRequest.status, media_1.MediaRequestStatus.DECLINED);
        });
        (0, node_test_1.it)('does not decline the request when the show still exists in Sonarr', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.default);
            const userRepository = (0, datasource_1.getRepository)(User_1.User);
            const requestedBy = await userRepository.findOneOrFail({
                where: { id: 1 },
            });
            const media = await mediaRepository.save(new Media_1.default({
                tmdbId: 2001,
                tvdbId: 600,
                mediaType: media_1.MediaType.TV,
                status: media_1.MediaStatus.PROCESSING,
                seasons: [
                    new Season_1.default({
                        seasonNumber: 1,
                        status: media_1.MediaStatus.PROCESSING,
                        status4k: media_1.MediaStatus.UNKNOWN,
                    }),
                ],
            }));
            const settings = (0, settings_1.getSettings)();
            settings.sonarr = [];
            settings.radarr = [];
            const request = await requestRepository.save(new MediaRequest_1.default({
                type: media_1.MediaType.TV,
                status: media_1.MediaRequestStatus.APPROVED,
                media,
                requestedBy,
                is4k: false,
            }));
            configureSonarr([{ syncEnabled: true }]);
            getSeriesImpl = async () => [
                fakeSonarrSeries({
                    tvdbId: 600,
                    seasons: [
                        {
                            seasonNumber: 1,
                            monitored: true,
                            statistics: {
                                episodeFileCount: 0,
                                totalEpisodeCount: 10,
                                episodeCount: 10,
                                percentOfEpisodes: 0,
                                sizeOnDisk: 0,
                                previousAiring: undefined,
                            },
                        },
                    ],
                }),
            ];
            getShowByTvdbIdImpl = async () => fakeTmdbShow(2001);
            getTvShowImpl = async () => fakeTmdbShow(2001);
            await sonarr_2.sonarrScanner.run();
            const updatedRequest = await requestRepository.findOneOrFail({
                where: { id: request.id },
            });
            strict_1.default.strictEqual(updatedRequest.status, media_1.MediaRequestStatus.APPROVED);
        });
        (0, node_test_1.it)('skips cleanup and leaves the request approved when Sonarr returns an empty list', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.default);
            const userRepository = (0, datasource_1.getRepository)(User_1.User);
            const requestedBy = await userRepository.findOneOrFail({
                where: { id: 1 },
            });
            const media = await mediaRepository.save(new Media_1.default({
                tmdbId: 2005,
                tvdbId: 605,
                mediaType: media_1.MediaType.TV,
                status: media_1.MediaStatus.PROCESSING,
                seasons: [
                    new Season_1.default({
                        seasonNumber: 1,
                        status: media_1.MediaStatus.PROCESSING,
                        status4k: media_1.MediaStatus.UNKNOWN,
                    }),
                ],
            }));
            const settings = (0, settings_1.getSettings)();
            settings.sonarr = [];
            settings.radarr = [];
            const request = await requestRepository.save(new MediaRequest_1.default({
                type: media_1.MediaType.TV,
                status: media_1.MediaRequestStatus.APPROVED,
                media,
                requestedBy,
                is4k: false,
            }));
            configureSonarr([{ syncEnabled: true }]);
            getSeriesImpl = async () => [];
            await sonarr_2.sonarrScanner.run();
            const updatedMedia = await mediaRepository.findOneOrFail({
                where: { tmdbId: 2005 },
            });
            const updatedRequest = await requestRepository.findOneOrFail({
                where: { id: request.id },
            });
            strict_1.default.strictEqual(updatedMedia.status, media_1.MediaStatus.PROCESSING);
            strict_1.default.strictEqual(updatedRequest.status, media_1.MediaRequestStatus.APPROVED);
        });
        (0, node_test_1.it)('declineOrphanedRequests throws when the requests relation is not loaded', async () => {
            const media = new Media_1.default();
            media.id = 1;
            media.tmdbId = 123;
            media.mediaType = media_1.MediaType.TV;
            await strict_1.default.rejects(() => sonarr_2.sonarrScanner.declineOrphanedRequests(media, false), /without the 'requests' relation loaded/);
        });
        (0, node_test_1.it)('declines only the 4k request when the 4k dimension is orphaned but standard still exists', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.default);
            const userRepository = (0, datasource_1.getRepository)(User_1.User);
            const requestedBy = await userRepository.findOneOrFail({
                where: { id: 1 },
            });
            const media = await mediaRepository.save(new Media_1.default({
                tmdbId: 2002,
                tvdbId: 666,
                mediaType: media_1.MediaType.TV,
                status: media_1.MediaStatus.PROCESSING,
                status4k: media_1.MediaStatus.PROCESSING,
                seasons: [
                    new Season_1.default({
                        seasonNumber: 1,
                        status: media_1.MediaStatus.PROCESSING,
                        status4k: media_1.MediaStatus.PROCESSING,
                    }),
                ],
            }));
            const settings = (0, settings_1.getSettings)();
            settings.sonarr = [];
            settings.radarr = [];
            const standardRequest = await requestRepository.save(new MediaRequest_1.default({
                type: media_1.MediaType.TV,
                status: media_1.MediaRequestStatus.APPROVED,
                media,
                requestedBy,
                is4k: false,
            }));
            const fourKRequest = await requestRepository.save(new MediaRequest_1.default({
                type: media_1.MediaType.TV,
                status: media_1.MediaRequestStatus.APPROVED,
                media,
                requestedBy,
                is4k: true,
            }));
            configureSonarr([
                { syncEnabled: true, id: 0, hostname: 'server-standard' },
                { syncEnabled: true, id: 1, hostname: 'server-4k', is4k: true },
            ]);
            let callCount = 0;
            getSeriesImpl = async () => {
                callCount++;
                if (callCount === 1) {
                    // standard server still has the show (processing, no files)
                    return [
                        fakeSonarrSeries({
                            tvdbId: 666,
                            seasons: [
                                {
                                    seasonNumber: 1,
                                    monitored: true,
                                    statistics: {
                                        episodeFileCount: 0,
                                        totalEpisodeCount: 10,
                                        episodeCount: 10,
                                        percentOfEpisodes: 0,
                                        sizeOnDisk: 0,
                                        previousAiring: undefined,
                                    },
                                },
                            ],
                        }),
                    ];
                }
                // 4k server: populated but the show is absent, so 4k dimension orphaned
                return [fakeSonarrSeries({ tvdbId: 997 })];
            };
            getShowByTvdbIdImpl = async ({ tvdbId }) => tvdbId === 666 ? fakeTmdbShow(2002) : fakeTmdbShow(997);
            getTvShowImpl = async ({ tvId }) => fakeTmdbShow(tvId);
            await sonarr_2.sonarrScanner.run();
            const updatedMedia = await mediaRepository.findOneOrFail({
                where: { tmdbId: 2002 },
            });
            const updatedStandard = await requestRepository.findOneOrFail({
                where: { id: standardRequest.id },
            });
            const updated4k = await requestRepository.findOneOrFail({
                where: { id: fourKRequest.id },
            });
            strict_1.default.strictEqual(updatedMedia.status, media_1.MediaStatus.PROCESSING);
            strict_1.default.strictEqual(updatedMedia.status4k, media_1.MediaStatus.UNKNOWN);
            strict_1.default.strictEqual(updatedStandard.status, media_1.MediaRequestStatus.APPROVED);
            strict_1.default.strictEqual(updated4k.status, media_1.MediaRequestStatus.DECLINED);
        });
    });
});

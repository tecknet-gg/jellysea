"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const radarr_1 = __importDefault(require("../../../api/servarr/radarr"));
const media_1 = require("../../../constants/media");
const datasource_1 = require("../../../datasource");
const Media_1 = __importDefault(require("../../../entity/Media"));
const MediaRequest_1 = __importDefault(require("../../../entity/MediaRequest"));
const User_1 = require("../../../entity/User");
const radarr_2 = require("../../../lib/scanners/radarr");
const settings_1 = require("../../../lib/settings");
const db_1 = require("../../../test/db");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
let getMoviesImpl = async () => [];
Object.defineProperty(radarr_1.default.prototype, 'getMovies', {
    set() { },
    get() {
        return async () => getMoviesImpl();
    },
    configurable: true,
});
node_test_1.mock.method(MediaRequest_1.default, 'sendNotification', async () => undefined);
(0, db_1.setupTestDb)();
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
        activeDirectory: '/movies',
        is4k: false,
        minimumAvailability: 'released',
        tags: [],
        isDefault: i === 0,
        syncEnabled: true,
        preventSearch: false,
        externalUrl: '',
        ...o,
    }));
    settings.sonarr = [];
}
function fakeRadarrMovie(overrides = {}) {
    return {
        tmdbId: 550,
        id: 1,
        title: 'Test Movie',
        titleSlug: 'test-movie',
        monitored: true,
        hasFile: true,
        isAvailable: true,
        imdbId: 'tt0137523',
        folderName: '/movies/Test Movie (2024)',
        path: '/movies/Test Movie (2024)',
        profileId: 1,
        qualityProfileId: 1,
        added: '2024-01-01T00:00:00Z',
        tags: [],
        ...overrides,
    };
}
(0, node_test_1.describe)('Radarr Scanner', () => {
    (0, node_test_1.beforeEach)(() => {
        getMoviesImpl = async () => [];
    });
    (0, node_test_1.describe)('unmonitored movie handling', () => {
        (0, node_test_1.it)('resets PROCESSING to UNKNOWN when movie is unmonitored and has no file', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 550;
            media.mediaType = media_1.MediaType.MOVIE;
            media.status = media_1.MediaStatus.PROCESSING;
            await mediaRepository.save(media);
            configureRadarr([{ syncEnabled: true }]);
            getMoviesImpl = async () => [
                fakeRadarrMovie({ monitored: false, hasFile: false }),
            ];
            await radarr_2.radarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 550 },
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.UNKNOWN);
        });
        (0, node_test_1.it)('does not create new media entry when movie is unmonitored and has no file', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            configureRadarr([{ syncEnabled: true }]);
            getMoviesImpl = async () => [
                fakeRadarrMovie({ tmdbId: 777, monitored: false, hasFile: false }),
            ];
            await radarr_2.radarrScanner.run();
            const media = await mediaRepository.findOne({
                where: { tmdbId: 777 },
            });
            strict_1.default.strictEqual(media, null);
        });
        (0, node_test_1.it)('sets AVAILABLE when movie has a file', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 551;
            media.mediaType = media_1.MediaType.MOVIE;
            media.status = media_1.MediaStatus.PROCESSING;
            await mediaRepository.save(media);
            configureRadarr([{ syncEnabled: true }]);
            getMoviesImpl = async () => [
                fakeRadarrMovie({ tmdbId: 551, monitored: true, hasFile: true }),
            ];
            await radarr_2.radarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 551 },
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.AVAILABLE);
        });
        (0, node_test_1.it)('sets PROCESSING when movie is monitored but has no file', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 552;
            media.mediaType = media_1.MediaType.MOVIE;
            media.status = media_1.MediaStatus.UNKNOWN;
            await mediaRepository.save(media);
            configureRadarr([{ syncEnabled: true }]);
            getMoviesImpl = async () => [
                fakeRadarrMovie({ tmdbId: 552, monitored: true, hasFile: false }),
            ];
            await radarr_2.radarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 552 },
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PROCESSING);
        });
        (0, node_test_1.it)('preserves DELETED status when movie is monitored but has no file', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 553;
            media.mediaType = media_1.MediaType.MOVIE;
            media.status = media_1.MediaStatus.DELETED;
            await mediaRepository.save(media);
            configureRadarr([{ syncEnabled: true }]);
            getMoviesImpl = async () => [
                fakeRadarrMovie({ tmdbId: 553, monitored: true, hasFile: false }),
            ];
            await radarr_2.radarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 553 },
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.DELETED);
        });
        (0, node_test_1.it)('keeps AVAILABLE status even when movie is unmonitored', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 554;
            media.mediaType = media_1.MediaType.MOVIE;
            media.status = media_1.MediaStatus.AVAILABLE;
            await mediaRepository.save(media);
            configureRadarr([{ syncEnabled: true }]);
            getMoviesImpl = async () => [
                fakeRadarrMovie({ tmdbId: 554, monitored: false, hasFile: true }),
            ];
            await radarr_2.radarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 554 },
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.AVAILABLE);
        });
    });
    (0, node_test_1.describe)('orphaned movie cleanup', () => {
        (0, node_test_1.it)('skips cleanup when a standard server has sync disabled', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 950;
            media.mediaType = media_1.MediaType.MOVIE;
            media.status = media_1.MediaStatus.PROCESSING;
            await mediaRepository.save(media);
            configureRadarr([
                { syncEnabled: true, id: 0, hostname: 'server-a' },
                { syncEnabled: false, id: 1, hostname: 'server-b' },
            ]);
            getMoviesImpl = async () => [];
            await radarr_2.radarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 950 },
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PROCESSING);
        });
        (0, node_test_1.it)('resets PROCESSING to UNKNOWN when movie is not in any Radarr server', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 999;
            media.mediaType = media_1.MediaType.MOVIE;
            media.status = media_1.MediaStatus.PROCESSING;
            await mediaRepository.save(media);
            configureRadarr([{ syncEnabled: true }]);
            getMoviesImpl = async () => [fakeRadarrMovie({ tmdbId: 1, id: 99 })];
            await radarr_2.radarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 999 },
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.UNKNOWN);
        });
        (0, node_test_1.it)('does not reset AVAILABLE movie when missing from Radarr', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 888;
            media.mediaType = media_1.MediaType.MOVIE;
            media.status = media_1.MediaStatus.AVAILABLE;
            await mediaRepository.save(media);
            configureRadarr([{ syncEnabled: true }]);
            getMoviesImpl = async () => [];
            await radarr_2.radarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 888 },
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.AVAILABLE);
        });
        (0, node_test_1.it)('does not reset PROCESSING movie that still exists in Radarr', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 700;
            media.mediaType = media_1.MediaType.MOVIE;
            media.status = media_1.MediaStatus.PROCESSING;
            await mediaRepository.save(media);
            configureRadarr([{ syncEnabled: true }]);
            getMoviesImpl = async () => [
                fakeRadarrMovie({ tmdbId: 700, monitored: true, hasFile: false }),
            ];
            await radarr_2.radarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 700 },
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PROCESSING);
        });
        (0, node_test_1.it)('does not reset TV media that is missing from Radarr', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            // TV show stuck in processing so Radarr scanner should not touch it
            const media = new Media_1.default();
            media.tmdbId = 800;
            media.mediaType = media_1.MediaType.TV;
            media.status = media_1.MediaStatus.PROCESSING;
            await mediaRepository.save(media);
            configureRadarr([{ syncEnabled: true }]);
            getMoviesImpl = async () => [];
            await radarr_2.radarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 800 },
            });
            strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PROCESSING);
        });
        (0, node_test_1.it)('only resets orphaned movies not found across all servers', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const orphan = new Media_1.default();
            orphan.tmdbId = 901;
            orphan.mediaType = media_1.MediaType.MOVIE;
            orphan.status = media_1.MediaStatus.PROCESSING;
            await mediaRepository.save(orphan);
            const existing = new Media_1.default();
            existing.tmdbId = 902;
            existing.mediaType = media_1.MediaType.MOVIE;
            existing.status = media_1.MediaStatus.PROCESSING;
            await mediaRepository.save(existing);
            // Two servers but movie exists on server 1 only
            configureRadarr([
                { syncEnabled: true, id: 0, hostname: 'server-a' },
                { syncEnabled: true, id: 1, hostname: 'server-b' },
            ]);
            let callCount = 0;
            getMoviesImpl = async () => {
                callCount++;
                if (callCount === 1) {
                    return [fakeRadarrMovie({ tmdbId: 902, id: 10 })];
                }
                return [fakeRadarrMovie({ tmdbId: 903, id: 11 })];
            };
            await radarr_2.radarrScanner.run();
            const updatedOrphan = await mediaRepository.findOneOrFail({
                where: { tmdbId: 901 },
            });
            strict_1.default.strictEqual(updatedOrphan.status, media_1.MediaStatus.UNKNOWN);
            const updatedExisting = await mediaRepository.findOneOrFail({
                where: { tmdbId: 902 },
            });
            strict_1.default.strictEqual(updatedExisting.status, media_1.MediaStatus.AVAILABLE);
        });
    });
    (0, node_test_1.describe)('4k orphaned movie cleanup', () => {
        (0, node_test_1.it)('resets 4k PROCESSING to UNKNOWN when movie is not in any Radarr server', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 960;
            media.mediaType = media_1.MediaType.MOVIE;
            media.status = media_1.MediaStatus.UNKNOWN;
            media.status4k = media_1.MediaStatus.PROCESSING;
            await mediaRepository.save(media);
            configureRadarr([{ syncEnabled: true, is4k: true }]);
            getMoviesImpl = async () => [fakeRadarrMovie({ tmdbId: 1, id: 99 })];
            await radarr_2.radarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 960 },
            });
            strict_1.default.strictEqual(updated.status4k, media_1.MediaStatus.UNKNOWN);
        });
        (0, node_test_1.it)('does not reset 4k AVAILABLE when movie is missing from Radarr', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = new Media_1.default();
            media.tmdbId = 961;
            media.mediaType = media_1.MediaType.MOVIE;
            media.status = media_1.MediaStatus.UNKNOWN;
            media.status4k = media_1.MediaStatus.AVAILABLE;
            await mediaRepository.save(media);
            configureRadarr([{ syncEnabled: true, is4k: true }]);
            getMoviesImpl = async () => [];
            await radarr_2.radarrScanner.run();
            const updated = await mediaRepository.findOneOrFail({
                where: { tmdbId: 961 },
            });
            strict_1.default.strictEqual(updated.status4k, media_1.MediaStatus.AVAILABLE);
        });
    });
    (0, node_test_1.describe)('orphaned request handling', () => {
        (0, node_test_1.it)('declines the approved request and resets media to UNKNOWN when the movie is orphaned', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.default);
            const userRepository = (0, datasource_1.getRepository)(User_1.User);
            const requestedBy = await userRepository.findOneOrFail({
                where: { id: 1 },
            });
            const media = await mediaRepository.save(new Media_1.default({
                tmdbId: 1003596,
                mediaType: media_1.MediaType.MOVIE,
                status: media_1.MediaStatus.PROCESSING,
            }));
            const settings = (0, settings_1.getSettings)();
            settings.radarr = [];
            settings.sonarr = [];
            const request = await requestRepository.save(new MediaRequest_1.default({
                type: media_1.MediaType.MOVIE,
                status: media_1.MediaRequestStatus.APPROVED,
                media,
                requestedBy,
                is4k: false,
            }));
            configureRadarr([{ syncEnabled: true }]);
            getMoviesImpl = async () => [fakeRadarrMovie({ tmdbId: 1, id: 99 })];
            await radarr_2.radarrScanner.run();
            const updatedMedia = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1003596 },
            });
            const updatedRequest = await requestRepository.findOneOrFail({
                where: { id: request.id },
            });
            strict_1.default.strictEqual(updatedMedia.status, media_1.MediaStatus.UNKNOWN);
            strict_1.default.strictEqual(updatedRequest.status, media_1.MediaRequestStatus.DECLINED);
        });
        (0, node_test_1.it)('does not decline the request when the movie still exists in Radarr', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.default);
            const userRepository = (0, datasource_1.getRepository)(User_1.User);
            const requestedBy = await userRepository.findOneOrFail({
                where: { id: 1 },
            });
            const media = await mediaRepository.save(new Media_1.default({
                tmdbId: 700,
                mediaType: media_1.MediaType.MOVIE,
                status: media_1.MediaStatus.PROCESSING,
            }));
            const settings = (0, settings_1.getSettings)();
            settings.radarr = [];
            settings.sonarr = [];
            const request = await requestRepository.save(new MediaRequest_1.default({
                type: media_1.MediaType.MOVIE,
                status: media_1.MediaRequestStatus.APPROVED,
                media,
                requestedBy,
                is4k: false,
            }));
            configureRadarr([{ syncEnabled: true }]);
            getMoviesImpl = async () => [
                fakeRadarrMovie({ tmdbId: 700, monitored: true, hasFile: false }),
            ];
            await radarr_2.radarrScanner.run();
            const updatedRequest = await requestRepository.findOneOrFail({
                where: { id: request.id },
            });
            strict_1.default.strictEqual(updatedRequest.status, media_1.MediaRequestStatus.APPROVED);
        });
        (0, node_test_1.it)('skips cleanup and leaves the request approved when Radarr returns an empty list', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.default);
            const userRepository = (0, datasource_1.getRepository)(User_1.User);
            const requestedBy = await userRepository.findOneOrFail({
                where: { id: 1 },
            });
            const media = await mediaRepository.save(new Media_1.default({
                tmdbId: 1234,
                mediaType: media_1.MediaType.MOVIE,
                status: media_1.MediaStatus.PROCESSING,
            }));
            const settings = (0, settings_1.getSettings)();
            settings.radarr = [];
            settings.sonarr = [];
            const request = await requestRepository.save(new MediaRequest_1.default({
                type: media_1.MediaType.MOVIE,
                status: media_1.MediaRequestStatus.APPROVED,
                media,
                requestedBy,
                is4k: false,
            }));
            configureRadarr([{ syncEnabled: true }]);
            getMoviesImpl = async () => [];
            await radarr_2.radarrScanner.run();
            const updatedMedia = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1234 },
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
            media.mediaType = media_1.MediaType.MOVIE;
            await strict_1.default.rejects(() => radarr_2.radarrScanner.declineOrphanedRequests(media, false), /without the 'requests' relation loaded/);
        });
        (0, node_test_1.it)('declines only the 4k request when the 4k dimension is orphaned but standard still exists', async () => {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.default);
            const userRepository = (0, datasource_1.getRepository)(User_1.User);
            const requestedBy = await userRepository.findOneOrFail({
                where: { id: 1 },
            });
            const media = await mediaRepository.save(new Media_1.default({
                tmdbId: 1003598,
                mediaType: media_1.MediaType.MOVIE,
                status: media_1.MediaStatus.PROCESSING,
                status4k: media_1.MediaStatus.PROCESSING,
            }));
            const settings = (0, settings_1.getSettings)();
            settings.radarr = [];
            settings.sonarr = [];
            const standardRequest = await requestRepository.save(new MediaRequest_1.default({
                type: media_1.MediaType.MOVIE,
                status: media_1.MediaRequestStatus.APPROVED,
                media,
                requestedBy,
                is4k: false,
            }));
            const fourKRequest = await requestRepository.save(new MediaRequest_1.default({
                type: media_1.MediaType.MOVIE,
                status: media_1.MediaRequestStatus.APPROVED,
                media,
                requestedBy,
                is4k: true,
            }));
            configureRadarr([
                { syncEnabled: true, id: 0, hostname: 'server-standard' },
                { syncEnabled: true, id: 1, hostname: 'server-4k', is4k: true },
            ]);
            let callCount = 0;
            getMoviesImpl = async () => {
                callCount++;
                if (callCount === 1) {
                    // standard server still has the movie
                    return [
                        fakeRadarrMovie({
                            tmdbId: 1003598,
                            id: 42,
                            monitored: true,
                            hasFile: false,
                        }),
                    ];
                }
                // 4k server: populated but the movie is absent, so 4k dimension orphaned
                return [fakeRadarrMovie({ tmdbId: 2, id: 88 })];
            };
            await radarr_2.radarrScanner.run();
            const updatedMedia = await mediaRepository.findOneOrFail({
                where: { tmdbId: 1003598 },
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

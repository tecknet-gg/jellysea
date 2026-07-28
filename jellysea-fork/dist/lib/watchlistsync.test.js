"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const plextv_1 = __importDefault(require("../api/plextv"));
const media_1 = require("../constants/media");
const datasource_1 = require("../datasource");
const Media_1 = __importDefault(require("../entity/Media"));
const MediaRequest_1 = require("../entity/MediaRequest");
const User_1 = require("../entity/User");
const UserSettings_1 = require("../entity/UserSettings");
const permissions_1 = require("../lib/permissions");
const db_1 = require("../test/db");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
let watchlistItems = [];
Object.defineProperty(plextv_1.default.prototype, 'getWatchlist', {
    get() {
        return async () => ({
            offset: 0,
            size: 20,
            totalSize: watchlistItems.length,
            items: watchlistItems,
        });
    },
    set() { },
    configurable: true,
});
let requestCalls = [];
Object.defineProperty(MediaRequest_1.MediaRequest, 'request', {
    value: async (body) => {
        requestCalls.push({ mediaId: body.mediaId, mediaType: body.mediaType });
        return {};
    },
    writable: true,
    configurable: true,
});
const watchlistsync_1 = __importDefault(require("../lib/watchlistsync"));
(0, db_1.setupTestDb)();
async function configureSyncUser() {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const admin = await userRepository.findOneOrFail({ where: { id: 1 } });
    admin.plexToken = 'test-plex-token';
    admin.permissions = permissions_1.Permission.AUTO_REQUEST;
    await userRepository.save(admin);
    const userSettingsRepository = (0, datasource_1.getRepository)(UserSettings_1.UserSettings);
    await userSettingsRepository.save(new UserSettings_1.UserSettings({
        user: admin,
        watchlistSyncMovies: true,
        watchlistSyncTv: true,
    }));
    return admin;
}
async function seedMedia(tmdbId, mediaType, status) {
    const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
    await mediaRepository.save(new Media_1.default({
        tmdbId,
        mediaType,
        status,
        status4k: media_1.MediaStatus.UNKNOWN,
    }));
}
function movieItem(tmdbId, title) {
    return { ratingKey: `rk-${tmdbId}`, tmdbId, title, type: 'movie' };
}
function showItem(tmdbId, title) {
    return {
        ratingKey: `rk-${tmdbId}`,
        tmdbId,
        tvdbId: tmdbId * 1000,
        title,
        type: 'show',
    };
}
(0, node_test_1.describe)('WatchlistSync re-request gating', () => {
    (0, node_test_1.beforeEach)(() => {
        requestCalls = [];
        watchlistItems = [];
    });
    (0, node_test_1.it)('re-requests DELETED watchlist items and skips non-requestable ones', async () => {
        await configureSyncUser();
        await seedMedia(100, media_1.MediaType.MOVIE, media_1.MediaStatus.DELETED);
        await seedMedia(101, media_1.MediaType.MOVIE, media_1.MediaStatus.UNKNOWN);
        await seedMedia(102, media_1.MediaType.MOVIE, media_1.MediaStatus.AVAILABLE);
        await seedMedia(103, media_1.MediaType.MOVIE, media_1.MediaStatus.BLOCKLISTED);
        await seedMedia(200, media_1.MediaType.TV, media_1.MediaStatus.DELETED);
        await seedMedia(201, media_1.MediaType.TV, media_1.MediaStatus.AVAILABLE);
        watchlistItems = [
            movieItem(100, 'Deleted Movie'),
            movieItem(101, 'Unknown Movie'),
            movieItem(102, 'Available Movie'),
            movieItem(103, 'Blocklisted Movie'),
            showItem(200, 'Deleted Show'),
            showItem(201, 'Available Show'),
        ];
        await watchlistsync_1.default.syncWatchlist();
        const requestedArray = requestCalls.map((c) => `${c.mediaType}:${c.mediaId}`);
        const requested = new Set(requestedArray);
        strict_1.default.strictEqual(requestedArray.length, requested.size, 'Each item should be requested exactly once');
        strict_1.default.ok(requested.has(`${media_1.MediaType.MOVIE}:100`), 'DELETED movie on the watchlist should be re-requested');
        strict_1.default.ok(requested.has(`${media_1.MediaType.MOVIE}:101`), 'UNKNOWN movie should be requested');
        strict_1.default.ok(!requested.has(`${media_1.MediaType.MOVIE}:102`), 'AVAILABLE movie should NOT be requested');
        strict_1.default.ok(!requested.has(`${media_1.MediaType.MOVIE}:103`), 'BLOCKLISTED movie should NOT be requested');
        strict_1.default.ok(requested.has(`${media_1.MediaType.TV}:200`), 'DELETED show should be re-requested');
        strict_1.default.ok(!requested.has(`${media_1.MediaType.TV}:201`), 'AVAILABLE show should NOT be requested');
    });
    (0, node_test_1.it)('re-requests DELETED watchlist items even when a stale auto-request exists', async () => {
        const user = await configureSyncUser();
        await seedMedia(100, media_1.MediaType.MOVIE, media_1.MediaStatus.DELETED);
        const media = await (0, datasource_1.getRepository)(Media_1.default).findOneOrFail({
            where: { tmdbId: 100, mediaType: media_1.MediaType.MOVIE },
        });
        await (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest).save(new MediaRequest_1.MediaRequest({
            type: media_1.MediaType.MOVIE,
            status: media_1.MediaRequestStatus.COMPLETED,
            media,
            requestedBy: user,
            is4k: false,
            isAutoRequest: true,
        }));
        watchlistItems = [movieItem(100, 'Deleted Movie')];
        await watchlistsync_1.default.syncWatchlist();
        const calls = requestCalls.filter((c) => c.mediaType === media_1.MediaType.MOVIE && c.mediaId === 100);
        strict_1.default.strictEqual(calls.length, 1, 'DELETED movie should be re-requested even when a stale auto-request exists');
    });
});

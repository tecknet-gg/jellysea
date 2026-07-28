"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const media_1 = require("../constants/media");
const datasource_1 = require("../datasource");
const Media_1 = __importDefault(require("../entity/Media"));
const MediaRequest_1 = require("../entity/MediaRequest");
const User_1 = require("../entity/User");
const settings_1 = require("../lib/settings");
const auth_1 = require("../middleware/auth");
const db_1 = require("../test/db");
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const supertest_1 = __importDefault(require("supertest"));
const auth_2 = __importDefault(require("./auth"));
const request_1 = __importDefault(require("./request"));
const sendNotificationMock = node_test_1.mock.method(MediaRequest_1.MediaRequest, 'sendNotification', async () => undefined).mock;
let app;
function createApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((0, express_session_1.default)({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
    }));
    app.use(auth_1.checkUser);
    app.use('/auth', auth_2.default);
    app.use('/request', request_1.default);
    app.use((err, _req, res, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next) => {
        res
            .status(err.status ?? 500)
            .json({ status: err.status ?? 500, message: err.message });
    });
    return app;
}
(0, node_test_1.before)(async () => {
    app = createApp();
});
(0, node_test_1.beforeEach)(() => {
    sendNotificationMock.resetCalls();
});
(0, db_1.setupTestDb)();
async function loginAs(email, password) {
    const settings = (0, settings_1.getSettings)();
    const priorLocalLogin = settings.main.localLogin;
    settings.main.localLogin = true;
    try {
        const agent = supertest_1.default.agent(app);
        const res = await agent.post('/auth/local').send({ email, password });
        strict_1.default.strictEqual(res.status, 200);
        return agent;
    }
    finally {
        settings.main.localLogin = priorLocalLogin;
    }
}
async function seedRequest(status = media_1.MediaRequestStatus.PENDING) {
    const userRepo = (0, datasource_1.getRepository)(User_1.User);
    const mediaRepo = (0, datasource_1.getRepository)(Media_1.default);
    const requestRepo = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
    const requestedBy = await userRepo.findOneOrFail({
        where: { email: 'friend@seerr.dev' },
    });
    const media = await mediaRepo.save(new Media_1.default({
        mediaType: media_1.MediaType.MOVIE,
        tmdbId: 12345,
        status: media_1.MediaStatus.UNKNOWN,
        status4k: media_1.MediaStatus.UNKNOWN,
    }));
    const created = await requestRepo.save(new MediaRequest_1.MediaRequest({
        type: media_1.MediaType.MOVIE,
        status,
        media,
        requestedBy,
        is4k: false,
        updatedAt: new Date('2025-03-01T00:00:00.000Z'),
    }));
    return requestRepo.findOneOrFail({
        where: { id: created.id },
        relations: { requestedBy: true, modifiedBy: true },
    });
}
(0, node_test_1.describe)('DELETE /request/:requestId', () => {
    (0, node_test_1.it)('allows the owner to delete their own pending request', async () => {
        const mediaRequest = await seedRequest();
        const agent = await loginAs('friend@seerr.dev', 'test1234');
        const res = await agent.delete(`/request/${mediaRequest.id}`);
        strict_1.default.strictEqual(res.status, 204);
    });
    (0, node_test_1.it)('allows an admin to delete any pending request', async () => {
        const mediaRequest = await seedRequest();
        const agent = await loginAs('admin@seerr.dev', 'test1234');
        const res = await agent.delete(`/request/${mediaRequest.id}`);
        strict_1.default.strictEqual(res.status, 204);
    });
    (0, node_test_1.it)('prevents a non-owner non-admin from deleting a pending request', async () => {
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const mediaRepo = (0, datasource_1.getRepository)(Media_1.default);
        const requestRepo = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        // Create a request owned by admin, then try to delete as friend
        const owner = await userRepo.findOneOrFail({
            where: { email: 'admin@seerr.dev' },
        });
        const media = await mediaRepo.save(new Media_1.default({
            mediaType: media_1.MediaType.MOVIE,
            tmdbId: 54321,
            status: media_1.MediaStatus.UNKNOWN,
            status4k: media_1.MediaStatus.UNKNOWN,
        }));
        const mediaRequest = await requestRepo.save(new MediaRequest_1.MediaRequest({
            type: media_1.MediaType.MOVIE,
            status: media_1.MediaRequestStatus.PENDING,
            media,
            requestedBy: owner,
            is4k: false,
        }));
        const agent = await loginAs('friend@seerr.dev', 'test1234');
        const res = await agent.delete(`/request/${mediaRequest.id}`);
        strict_1.default.strictEqual(res.status, 401);
    });
    (0, node_test_1.it)('prevents the owner from deleting an approved request', async () => {
        const mediaRequest = await seedRequest(media_1.MediaRequestStatus.APPROVED);
        const agent = await loginAs('friend@seerr.dev', 'test1234');
        const res = await agent.delete(`/request/${mediaRequest.id}`);
        strict_1.default.strictEqual(res.status, 401);
    });
    (0, node_test_1.it)('returns 404 for a non-existent request', async () => {
        const agent = await loginAs('admin@seerr.dev', 'test1234');
        const res = await agent.delete('/request/99999999');
        strict_1.default.strictEqual(res.status, 404);
    });
});
(0, node_test_1.describe)('PUT /request/:requestId (movie)', () => {
    (0, node_test_1.it)('persists server and root folder changes to the database', async () => {
        const requestRepo = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        const mediaRequest = await seedRequest();
        const agent = await loginAs('admin@seerr.dev', 'test1234');
        const res = await agent.put(`/request/${mediaRequest.id}`).send({
            mediaType: media_1.MediaType.MOVIE,
            serverId: 3,
            profileId: 7,
            rootFolder: '/updated/movies',
            tags: [1, 2],
        });
        strict_1.default.strictEqual(res.status, 200);
        const saved = await requestRepo.findOneOrFail({
            where: { id: mediaRequest.id },
        });
        strict_1.default.strictEqual(saved.serverId, 3);
        strict_1.default.strictEqual(saved.profileId, 7);
        strict_1.default.strictEqual(saved.rootFolder, '/updated/movies');
    });
});
(0, node_test_1.describe)('POST /request/:requestId/:status', () => {
    const cases = [
        { action: 'approve', expected: media_1.MediaRequestStatus.APPROVED },
        { action: 'decline', expected: media_1.MediaRequestStatus.DECLINED },
    ];
    for (const { action, expected } of cases) {
        (0, node_test_1.it)(`transitions to ${action}d and records the acting user`, async () => {
            const repo = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
            const pending = await seedRequest();
            const admin = await loginAs('admin@seerr.dev', 'test1234');
            const res = await admin.post(`/request/${pending.id}/${action}`);
            strict_1.default.strictEqual(res.status, 200);
            strict_1.default.strictEqual(res.body.status, expected);
            strict_1.default.strictEqual(res.body.modifiedBy.email, 'admin@seerr.dev');
            const persisted = await repo.findOneOrFail({
                where: { id: pending.id },
                relations: { modifiedBy: true },
            });
            strict_1.default.strictEqual(persisted.status, expected);
            strict_1.default.strictEqual(persisted.modifiedBy?.email, 'admin@seerr.dev');
            strict_1.default.ok(persisted.updatedAt > pending.updatedAt);
        });
    }
});
(0, node_test_1.describe)('POST /request/:requestId/retry', () => {
    (0, node_test_1.it)('re-approves a failed request and records the acting user', async () => {
        const repo = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        const failed = await seedRequest(media_1.MediaRequestStatus.FAILED);
        const admin = await loginAs('admin@seerr.dev', 'test1234');
        const res = await admin.post(`/request/${failed.id}/retry`);
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.strictEqual(res.body.status, media_1.MediaRequestStatus.APPROVED);
        strict_1.default.strictEqual(res.body.modifiedBy.email, 'admin@seerr.dev');
        const persisted = await repo.findOneOrFail({
            where: { id: failed.id },
            relations: { modifiedBy: true },
        });
        strict_1.default.strictEqual(persisted.status, media_1.MediaRequestStatus.APPROVED);
        strict_1.default.strictEqual(persisted.modifiedBy?.email, 'admin@seerr.dev');
        strict_1.default.ok(persisted.updatedAt > failed.updatedAt);
    });
});
(0, node_test_1.describe)('DELETE /request/:requestId, deleted media status restoration', () => {
    async function seedDeletedMediaScenario() {
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const mediaRepo = (0, datasource_1.getRepository)(Media_1.default);
        const requestRepo = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        const admin = await userRepo.findOneOrFail({
            where: { email: 'admin@seerr.dev' },
        });
        const media = await mediaRepo.save(new Media_1.default({
            mediaType: media_1.MediaType.MOVIE,
            tmdbId: 99001,
            status: media_1.MediaStatus.DELETED,
            status4k: media_1.MediaStatus.UNKNOWN,
        }));
        const staleRequest = await requestRepo.save(new MediaRequest_1.MediaRequest({
            type: media_1.MediaType.MOVIE,
            status: media_1.MediaRequestStatus.COMPLETED,
            media,
            requestedBy: admin,
            is4k: false,
            isAutoRequest: true,
        }));
        media.status = media_1.MediaStatus.PENDING;
        await mediaRepo.save(media);
        const newRequest = await requestRepo.save(new MediaRequest_1.MediaRequest({
            type: media_1.MediaType.MOVIE,
            status: media_1.MediaRequestStatus.APPROVED,
            media,
            requestedBy: admin,
            is4k: false,
        }));
        return { media, staleRequest, newRequest, admin };
    }
    (0, node_test_1.it)('restores media status to DELETED when the re-request is deleted and a stale completed request remains', async () => {
        const mediaRepo = (0, datasource_1.getRepository)(Media_1.default);
        const { media, newRequest } = await seedDeletedMediaScenario();
        const agent = await loginAs('admin@seerr.dev', 'test1234');
        const res = await agent.delete(`/request/${newRequest.id}`);
        strict_1.default.strictEqual(res.status, 204);
        const updated = await mediaRepo.findOneOrFail({ where: { id: media.id } });
        strict_1.default.strictEqual(updated.status, media_1.MediaStatus.DELETED);
    });
    (0, node_test_1.it)('restores media status4k to DELETED when the re-request is deleted and a stale completed request remains', async () => {
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const mediaRepo = (0, datasource_1.getRepository)(Media_1.default);
        const requestRepo = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        const admin = await userRepo.findOneOrFail({
            where: { email: 'admin@seerr.dev' },
        });
        const media = await mediaRepo.save(new Media_1.default({
            mediaType: media_1.MediaType.MOVIE,
            tmdbId: 99003,
            status: media_1.MediaStatus.UNKNOWN,
            status4k: media_1.MediaStatus.DELETED,
        }));
        await requestRepo.save(new MediaRequest_1.MediaRequest({
            type: media_1.MediaType.MOVIE,
            status: media_1.MediaRequestStatus.COMPLETED,
            media,
            requestedBy: admin,
            is4k: true,
            isAutoRequest: true,
        }));
        media.status4k = media_1.MediaStatus.PENDING;
        await mediaRepo.save(media);
        const newRequest = await requestRepo.save(new MediaRequest_1.MediaRequest({
            type: media_1.MediaType.MOVIE,
            status: media_1.MediaRequestStatus.APPROVED,
            media,
            requestedBy: admin,
            is4k: true,
        }));
        const agent = await loginAs('admin@seerr.dev', 'test1234');
        const res = await agent.delete(`/request/${newRequest.id}`);
        strict_1.default.strictEqual(res.status, 204);
        const updated = await mediaRepo.findOneOrFail({ where: { id: media.id } });
        strict_1.default.strictEqual(updated.status4k, media_1.MediaStatus.DELETED);
    });
    (0, node_test_1.it)('resets media status to UNKNOWN when the stale completed request is also deleted', async () => {
        const mediaRepo = (0, datasource_1.getRepository)(Media_1.default);
        const requestRepo = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        const { media, newRequest, staleRequest } = await seedDeletedMediaScenario();
        const agent = await loginAs('admin@seerr.dev', 'test1234');
        await agent.delete(`/request/${newRequest.id}`);
        const res = await agent.delete(`/request/${staleRequest.id}`);
        strict_1.default.strictEqual(res.status, 204);
        const updated = await mediaRepo.findOneOrFail({ where: { id: media.id } });
        strict_1.default.strictEqual(updated.status, media_1.MediaStatus.UNKNOWN);
        const remaining = await requestRepo.find({
            where: { media: { id: media.id } },
        });
        strict_1.default.strictEqual(remaining.length, 0);
    });
    (0, node_test_1.it)('resets media status4k to UNKNOWN when the stale completed 4K request is also deleted', async () => {
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const mediaRepo = (0, datasource_1.getRepository)(Media_1.default);
        const requestRepo = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        const admin = await userRepo.findOneOrFail({
            where: { email: 'admin@seerr.dev' },
        });
        const media = await mediaRepo.save(new Media_1.default({
            mediaType: media_1.MediaType.MOVIE,
            tmdbId: 99004,
            status: media_1.MediaStatus.UNKNOWN,
            status4k: media_1.MediaStatus.DELETED,
        }));
        const staleRequest = await requestRepo.save(new MediaRequest_1.MediaRequest({
            type: media_1.MediaType.MOVIE,
            status: media_1.MediaRequestStatus.COMPLETED,
            media,
            requestedBy: admin,
            is4k: true,
            isAutoRequest: true,
        }));
        media.status4k = media_1.MediaStatus.PENDING;
        await mediaRepo.save(media);
        const newRequest = await requestRepo.save(new MediaRequest_1.MediaRequest({
            type: media_1.MediaType.MOVIE,
            status: media_1.MediaRequestStatus.APPROVED,
            media,
            requestedBy: admin,
            is4k: true,
        }));
        const agent = await loginAs('admin@seerr.dev', 'test1234');
        await agent.delete(`/request/${newRequest.id}`);
        const res = await agent.delete(`/request/${staleRequest.id}`);
        strict_1.default.strictEqual(res.status, 204);
        const updated = await mediaRepo.findOneOrFail({ where: { id: media.id } });
        strict_1.default.strictEqual(updated.status4k, media_1.MediaStatus.UNKNOWN);
    });
    (0, node_test_1.it)('does not reset media status when other active requests still exist', async () => {
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const mediaRepo = (0, datasource_1.getRepository)(Media_1.default);
        const requestRepo = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        const admin = await userRepo.findOneOrFail({
            where: { email: 'admin@seerr.dev' },
        });
        const media = await mediaRepo.save(new Media_1.default({
            mediaType: media_1.MediaType.MOVIE,
            tmdbId: 99002,
            status: media_1.MediaStatus.PENDING,
            status4k: media_1.MediaStatus.UNKNOWN,
        }));
        const req1 = await requestRepo.save(new MediaRequest_1.MediaRequest({
            type: media_1.MediaType.MOVIE,
            status: media_1.MediaRequestStatus.PENDING,
            media,
            requestedBy: admin,
            is4k: false,
        }));
        await requestRepo.save(new MediaRequest_1.MediaRequest({
            type: media_1.MediaType.MOVIE,
            status: media_1.MediaRequestStatus.PENDING,
            media,
            requestedBy: admin,
            is4k: false,
        }));
        const agent = await loginAs('admin@seerr.dev', 'test1234');
        const res = await agent.delete(`/request/${req1.id}`);
        strict_1.default.strictEqual(res.status, 204);
        const updated = await mediaRepo.findOneOrFail({ where: { id: media.id } });
        strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PENDING);
    });
    (0, node_test_1.it)('does not reset media status when status is PARTIALLY_AVAILABLE and only completed requests remain', async () => {
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const mediaRepo = (0, datasource_1.getRepository)(Media_1.default);
        const requestRepo = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        const admin = await userRepo.findOneOrFail({
            where: { email: 'admin@seerr.dev' },
        });
        const media = await mediaRepo.save(new Media_1.default({
            mediaType: media_1.MediaType.MOVIE,
            tmdbId: 99005,
            status: media_1.MediaStatus.PARTIALLY_AVAILABLE,
            status4k: media_1.MediaStatus.UNKNOWN,
        }));
        const completedRequest = await requestRepo.save(new MediaRequest_1.MediaRequest({
            type: media_1.MediaType.MOVIE,
            status: media_1.MediaRequestStatus.COMPLETED,
            media,
            requestedBy: admin,
            is4k: false,
        }));
        const agent = await loginAs('admin@seerr.dev', 'test1234');
        const res = await agent.delete(`/request/${completedRequest.id}`);
        strict_1.default.strictEqual(res.status, 204);
        const updated = await mediaRepo.findOneOrFail({ where: { id: media.id } });
        strict_1.default.strictEqual(updated.status, media_1.MediaStatus.PARTIALLY_AVAILABLE);
    });
});

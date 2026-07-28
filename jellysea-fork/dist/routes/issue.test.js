"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const issue_1 = require("../constants/issue");
const media_1 = require("../constants/media");
const datasource_1 = require("../datasource");
const Issue_1 = __importDefault(require("../entity/Issue"));
const Media_1 = __importDefault(require("../entity/Media"));
const User_1 = require("../entity/User");
const permissions_1 = require("../lib/permissions");
const settings_1 = require("../lib/settings");
const auth_1 = require("../middleware/auth");
const IssueSubscriber_1 = require("../subscriber/IssueSubscriber");
const db_1 = require("../test/db");
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const supertest_1 = __importDefault(require("supertest"));
const auth_2 = __importDefault(require("./auth"));
const issue_2 = __importDefault(require("./issue"));
const sendIssueNotificationMock = node_test_1.mock.method(IssueSubscriber_1.IssueSubscriber.prototype, 'sendIssueNotification', async () => undefined).mock;
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
    app.use('/issue', issue_2.default);
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
    sendIssueNotificationMock.resetCalls();
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
async function seedMedia() {
    return (0, datasource_1.getRepository)(Media_1.default).save(new Media_1.default({
        mediaType: media_1.MediaType.MOVIE,
        tmdbId: 12345,
        status: media_1.MediaStatus.AVAILABLE,
        status4k: media_1.MediaStatus.UNKNOWN,
    }));
}
(0, node_test_1.describe)('POST /issue', () => {
    (0, node_test_1.it)('creates an issue on behalf of the supplied userId', async () => {
        const issueRepo = (0, datasource_1.getRepository)(Issue_1.default);
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const media = await seedMedia();
        const friend = await userRepo.findOneOrFail({
            where: { email: 'friend@seerr.dev' },
        });
        const agent = await loginAs('admin@seerr.dev', 'test1234');
        const res = await agent.post('/issue').send({
            issueType: issue_1.IssueType.VIDEO,
            message: 'Playback stutters near the end.',
            mediaId: media.id,
            problemSeason: 0,
            problemEpisode: 0,
            userId: friend.id,
        });
        strict_1.default.strictEqual(res.status, 201);
        strict_1.default.strictEqual(res.body.createdBy.email, 'friend@seerr.dev');
        strict_1.default.strictEqual(res.body.comments[0].user.email, 'friend@seerr.dev');
        const persisted = await issueRepo.findOneOrFail({
            where: { id: res.body.id },
        });
        strict_1.default.strictEqual(persisted.createdBy.id, friend.id);
        strict_1.default.strictEqual(persisted.comments[0].user.id, friend.id);
    });
    (0, node_test_1.it)('defaults to the authenticated user when userId is omitted', async () => {
        const media = await seedMedia();
        const agent = await loginAs('admin@seerr.dev', 'test1234');
        const res = await agent.post('/issue').send({
            issueType: issue_1.IssueType.AUDIO,
            message: 'Audio is out of sync.',
            mediaId: media.id,
        });
        strict_1.default.strictEqual(res.status, 201);
        strict_1.default.strictEqual(res.body.createdBy.email, 'admin@seerr.dev');
        strict_1.default.strictEqual(res.body.comments[0].user.email, 'admin@seerr.dev');
    });
    (0, node_test_1.it)('allows creators to supply their own userId', async () => {
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const media = await seedMedia();
        const friend = await userRepo.findOneOrFail({
            where: { email: 'friend@seerr.dev' },
        });
        friend.permissions = permissions_1.Permission.CREATE_ISSUES;
        await userRepo.save(friend);
        const agent = await loginAs('friend@seerr.dev', 'test1234');
        const res = await agent.post('/issue').send({
            issueType: issue_1.IssueType.SUBTITLES,
            message: 'Subtitles are missing.',
            mediaId: media.id,
            userId: friend.id,
        });
        strict_1.default.strictEqual(res.status, 201);
        strict_1.default.strictEqual(res.body.createdBy.email, 'friend@seerr.dev');
        strict_1.default.strictEqual(res.body.comments[0].user.email, 'friend@seerr.dev');
    });
    (0, node_test_1.it)('prevents non-managers from supplying another userId', async () => {
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const media = await seedMedia();
        const friend = await userRepo.findOneOrFail({
            where: { email: 'friend@seerr.dev' },
        });
        const admin = await userRepo.findOneOrFail({
            where: { email: 'admin@seerr.dev' },
        });
        friend.permissions = permissions_1.Permission.CREATE_ISSUES;
        await userRepo.save(friend);
        const agent = await loginAs('friend@seerr.dev', 'test1234');
        const res = await agent.post('/issue').send({
            issueType: issue_1.IssueType.OTHER,
            message: 'Something else is wrong.',
            mediaId: media.id,
            userId: admin.id,
        });
        strict_1.default.strictEqual(res.status, 403);
        strict_1.default.strictEqual(res.body.message, 'You do not have permission to create an issue on behalf of another user.');
    });
    (0, node_test_1.it)('returns 404 when the supplied userId does not exist', async () => {
        const media = await seedMedia();
        const agent = await loginAs('admin@seerr.dev', 'test1234');
        const res = await agent.post('/issue').send({
            issueType: issue_1.IssueType.OTHER,
            message: 'Something else is wrong.',
            mediaId: media.id,
            userId: 999999,
        });
        strict_1.default.strictEqual(res.status, 404);
        strict_1.default.strictEqual(res.body.message, 'Issue user not found');
    });
});

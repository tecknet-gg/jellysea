"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const jellyfin_1 = __importDefault(require("../api/jellyfin"));
const error_1 = require("../constants/error");
const server_1 = require("../constants/server");
const user_1 = require("../constants/user");
const datasource_1 = require("../datasource");
const User_1 = require("../entity/User");
const email_1 = __importDefault(require("../lib/email"));
const settings_1 = require("../lib/settings");
const auth_1 = require("../middleware/auth");
const db_1 = require("../test/db");
const error_2 = require("../types/error");
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const supertest_1 = __importDefault(require("supertest"));
const auth_2 = __importDefault(require("./auth"));
const emailMock = node_test_1.mock.method(email_1.default.prototype, 'send', async () => {
    return undefined;
}).mock;
// Jellyfin Quick Connect mocks
const defaultInitiateResponse = {
    Secret: 'abc123def456abc123def456',
    Code: '123456',
    DateAdded: new Date().toISOString(),
};
const defaultCheckResponse = {
    Authenticated: false,
    Secret: 'abc123def456abc123def456',
    Code: '123456',
    DeviceId: 'device-1',
    DeviceName: 'Test',
    AppName: 'Seerr',
    AppVersion: '1.0',
    DateAdded: new Date().toISOString(),
};
const defaultAuthenticateResponse = {
    User: {
        Id: 'jf-qc-user-001',
        Name: 'quickconnectuser',
        ServerId: 'server-1',
        Policy: { IsAdministrator: false },
    },
    AccessToken: 'fake-qc-access-token',
};
const initiateQCMock = node_test_1.mock.method(jellyfin_1.default.prototype, 'initiateQuickConnect', async () => ({ ...defaultInitiateResponse }));
const checkQCMock = node_test_1.mock.method(jellyfin_1.default.prototype, 'checkQuickConnect', async () => ({ ...defaultCheckResponse }));
const authenticateQCMock = node_test_1.mock.method(jellyfin_1.default.prototype, 'authenticateQuickConnect', async () => ({ ...defaultAuthenticateResponse }));
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
    // Error handler matching how next({ status, message }) calls are handled
    app.use((err, _req, res, 
    // We must provide a next function for the function signature here even though its not used
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
(0, db_1.setupTestDb)();
/** Create a supertest agent that is logged in as the given user. */
async function authenticatedAgent(email, password) {
    const agent = supertest_1.default.agent(app);
    const settings = (0, settings_1.getSettings)();
    settings.main.localLogin = true;
    const res = await agent.post('/auth/local').send({ email, password });
    strict_1.default.strictEqual(res.status, 200);
    return agent;
}
/** Configure Jellyfin settings for testing QC */
function configureJellyfin() {
    const settings = (0, settings_1.getSettings)();
    settings.main.mediaServerType = server_1.MediaServerType.JELLYFIN;
    settings.main.newPlexLogin = true;
    settings.jellyfin.ip = 'localhost';
    settings.jellyfin.port = 8096;
    settings.jellyfin.useSsl = false;
    settings.jellyfin.urlBase = '';
}
(0, node_test_1.describe)('POST /auth/jellyfin/quickconnect/initiate', () => {
    (0, node_test_1.beforeEach)(() => {
        initiateQCMock.mock.resetCalls();
        initiateQCMock.mock.mockImplementation(async () => ({
            ...defaultInitiateResponse,
        }));
        configureJellyfin();
    });
    (0, node_test_1.it)('returns code and secret on success', async () => {
        const res = await (0, supertest_1.default)(app).post('/auth/jellyfin/quickconnect/initiate');
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.strictEqual(res.body.code, '123456');
        strict_1.default.strictEqual(res.body.secret, 'abc123def456abc123def456');
        strict_1.default.strictEqual(initiateQCMock.mock.callCount(), 1);
    });
    (0, node_test_1.it)('returns 500 when Jellyfin API fails', async () => {
        initiateQCMock.mock.mockImplementation(async () => {
            throw new Error('Connection refused');
        });
        const res = await (0, supertest_1.default)(app).post('/auth/jellyfin/quickconnect/initiate');
        strict_1.default.strictEqual(res.status, 500);
        strict_1.default.match(res.body.message, /initiate quick connect/i);
    });
    (0, node_test_1.it)('returns 500 when initiateQuickConnect throws ApiError', async () => {
        initiateQCMock.mock.mockImplementation(async () => {
            throw new error_2.ApiError(500, error_1.ApiErrorCode.Unknown);
        });
        const res = await (0, supertest_1.default)(app).post('/auth/jellyfin/quickconnect/initiate');
        strict_1.default.strictEqual(res.status, 500);
    });
});
(0, node_test_1.describe)('GET /auth/jellyfin/quickconnect/check', () => {
    (0, node_test_1.beforeEach)(() => {
        checkQCMock.mock.resetCalls();
        checkQCMock.mock.mockImplementation(async () => ({
            ...defaultCheckResponse,
        }));
        configureJellyfin();
    });
    (0, node_test_1.it)('returns authenticated: false when not yet authorized', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/auth/jellyfin/quickconnect/check')
            .query({ secret: 'abc123def456abc123def456' });
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.strictEqual(res.body.authenticated, false);
        strict_1.default.strictEqual(checkQCMock.mock.callCount(), 1);
    });
    (0, node_test_1.it)('returns authenticated: true when authorized', async () => {
        checkQCMock.mock.mockImplementation(async () => ({
            ...defaultCheckResponse,
            Authenticated: true,
        }));
        const res = await (0, supertest_1.default)(app)
            .get('/auth/jellyfin/quickconnect/check')
            .query({ secret: 'abc123def456abc123def456' });
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.strictEqual(res.body.authenticated, true);
    });
    (0, node_test_1.it)('returns 400 when secret is missing', async () => {
        const res = await (0, supertest_1.default)(app).get('/auth/jellyfin/quickconnect/check');
        strict_1.default.strictEqual(res.status, 400);
        strict_1.default.match(res.body.message, /invalid secret/i);
        strict_1.default.strictEqual(checkQCMock.mock.callCount(), 0);
    });
    (0, node_test_1.it)('returns 400 when secret is too short', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/auth/jellyfin/quickconnect/check')
            .query({ secret: 'ab12' });
        strict_1.default.strictEqual(res.status, 400);
        strict_1.default.match(res.body.message, /invalid secret/i);
        strict_1.default.strictEqual(checkQCMock.mock.callCount(), 0);
    });
    (0, node_test_1.it)('returns 400 when secret is too long', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/auth/jellyfin/quickconnect/check')
            .query({ secret: 'a'.repeat(129) });
        strict_1.default.strictEqual(res.status, 400);
        strict_1.default.match(res.body.message, /invalid secret/i);
        strict_1.default.strictEqual(checkQCMock.mock.callCount(), 0);
    });
    (0, node_test_1.it)('returns 400 when secret contains non-hex characters', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/auth/jellyfin/quickconnect/check')
            .query({ secret: 'zzzzzzzzzzzz' });
        strict_1.default.strictEqual(res.status, 400);
        strict_1.default.match(res.body.message, /invalid secret/i);
        strict_1.default.strictEqual(checkQCMock.mock.callCount(), 0);
    });
    (0, node_test_1.it)('returns error when Jellyfin API fails', async () => {
        checkQCMock.mock.mockImplementation(async () => {
            throw new error_2.ApiError(500, error_1.ApiErrorCode.Unknown);
        });
        const res = await (0, supertest_1.default)(app)
            .get('/auth/jellyfin/quickconnect/check')
            .query({ secret: 'abc123def456abc123def456' });
        strict_1.default.strictEqual(res.status, 500);
    });
});
(0, node_test_1.describe)('POST /auth/jellyfin/quickconnect/authenticate', () => {
    (0, node_test_1.beforeEach)(() => {
        authenticateQCMock.mock.resetCalls();
        authenticateQCMock.mock.mockImplementation(async () => ({
            ...defaultAuthenticateResponse,
        }));
        configureJellyfin();
    });
    (0, node_test_1.it)('returns 400 when secret is missing', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/jellyfin/quickconnect/authenticate')
            .send({});
        strict_1.default.strictEqual(res.status, 400);
        strict_1.default.strictEqual(authenticateQCMock.mock.callCount(), 0);
    });
    (0, node_test_1.it)('returns 400 when secret is not a string', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/jellyfin/quickconnect/authenticate')
            .send({ secret: 12345678 });
        strict_1.default.strictEqual(res.status, 400);
        strict_1.default.strictEqual(authenticateQCMock.mock.callCount(), 0);
    });
    (0, node_test_1.it)('returns 400 when secret is too short', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/jellyfin/quickconnect/authenticate')
            .send({ secret: 'ab12' });
        strict_1.default.strictEqual(res.status, 400);
    });
    (0, node_test_1.it)('returns 400 when secret contains non-hex characters', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/jellyfin/quickconnect/authenticate')
            .send({ secret: 'zzzzzzzzzzzz' });
        strict_1.default.strictEqual(res.status, 400);
        strict_1.default.strictEqual(authenticateQCMock.mock.callCount(), 0);
    });
    (0, node_test_1.it)('returns 403 when media server is not configured', async () => {
        const settings = (0, settings_1.getSettings)();
        settings.main.mediaServerType = server_1.MediaServerType.NOT_CONFIGURED;
        const res = await (0, supertest_1.default)(app)
            .post('/auth/jellyfin/quickconnect/authenticate')
            .send({ secret: 'abc123def456abc123def456' });
        strict_1.default.strictEqual(res.status, 403);
        strict_1.default.match(res.body.message, /initial setup/i);
        strict_1.default.strictEqual(authenticateQCMock.mock.callCount(), 0);
    });
    (0, node_test_1.it)('returns 403 when no users exist in the database', async () => {
        // Clear all users to simulate initial setup
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        await userRepo.clear();
        const res = await (0, supertest_1.default)(app)
            .post('/auth/jellyfin/quickconnect/authenticate')
            .send({ secret: 'abc123def456abc123def456' });
        strict_1.default.strictEqual(res.status, 403);
        strict_1.default.match(res.body.message, /initial setup/i);
    });
    (0, node_test_1.it)('signs in an existing Jellyfin user and sets session', async () => {
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const existingUser = new User_1.User({
            email: 'existing-qc@seerr.dev',
            jellyfinUsername: 'quickconnectuser',
            jellyfinUserId: 'jf-qc-user-001',
            jellyfinDeviceId: 'old-device-id',
            permissions: 0,
            avatar: '/avatarproxy/jf-qc-user-001?v=0',
            userType: user_1.UserType.JELLYFIN,
        });
        await userRepo.save(existingUser);
        const agent = supertest_1.default.agent(app);
        const res = await agent
            .post('/auth/jellyfin/quickconnect/authenticate')
            .send({ secret: 'abc123def456abc123def456' });
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.ok('id' in res.body);
        strict_1.default.ok(!('password' in res.body));
        const meRes = await agent.get('/auth/me');
        strict_1.default.strictEqual(meRes.status, 200);
        strict_1.default.strictEqual(meRes.body.jellyfinUsername, 'quickconnectuser');
        const updatedUser = await userRepo.findOneOrFail({
            where: { jellyfinUserId: 'jf-qc-user-001' },
            select: {
                id: true,
                jellyfinAuthToken: true,
                jellyfinDeviceId: true,
            },
        });
        strict_1.default.strictEqual(updatedUser.jellyfinAuthToken, 'fake-qc-access-token');
        strict_1.default.notStrictEqual(updatedUser.jellyfinDeviceId, 'old-device-id');
    });
    (0, node_test_1.it)('creates a new user when newPlexLogin is enabled and user does not exist', async () => {
        const settings = (0, settings_1.getSettings)();
        settings.main.newPlexLogin = true;
        authenticateQCMock.mock.mockImplementation(async () => ({
            User: {
                Id: 'jf-brand-new-user',
                Name: 'brandnewuser',
                ServerId: 'server-1',
                Policy: { IsAdministrator: false },
            },
            AccessToken: 'new-user-token',
        }));
        const agent = supertest_1.default.agent(app);
        const res = await agent
            .post('/auth/jellyfin/quickconnect/authenticate')
            .send({ secret: 'abc123def456abc123def456' });
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.ok('id' in res.body);
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const newUser = await userRepo.findOne({
            where: { jellyfinUserId: 'jf-brand-new-user' },
        });
        strict_1.default.ok(newUser);
        strict_1.default.strictEqual(newUser.jellyfinUsername, 'brandnewuser');
        strict_1.default.strictEqual(newUser.userType, user_1.UserType.JELLYFIN);
        const meRes = await agent.get('/auth/me');
        strict_1.default.strictEqual(meRes.status, 200);
    });
    (0, node_test_1.it)('sets userType to EMBY when media server is Emby', async () => {
        const settings = (0, settings_1.getSettings)();
        settings.main.mediaServerType = server_1.MediaServerType.EMBY;
        settings.main.newPlexLogin = true;
        authenticateQCMock.mock.mockImplementation(async () => ({
            User: {
                Id: 'emby-new-user',
                Name: 'embyuser',
                ServerId: 'server-1',
                Policy: { IsAdministrator: false },
            },
            AccessToken: 'emby-token',
        }));
        const agent = supertest_1.default.agent(app);
        const res = await agent
            .post('/auth/jellyfin/quickconnect/authenticate')
            .send({ secret: 'abc123def456abc123def456' });
        strict_1.default.strictEqual(res.status, 200);
        const meRes = await agent.get('/auth/me');
        strict_1.default.strictEqual(meRes.status, 200);
        strict_1.default.strictEqual(meRes.body.jellyfinUsername, 'embyuser');
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const user = await userRepo.findOne({
            where: { jellyfinUserId: 'emby-new-user' },
        });
        strict_1.default.ok(user);
        strict_1.default.strictEqual(user.userType, user_1.UserType.EMBY);
    });
    (0, node_test_1.it)('applies default permissions to newly created users', async () => {
        const settings = (0, settings_1.getSettings)();
        settings.main.newPlexLogin = true;
        settings.main.defaultPermissions = 32;
        authenticateQCMock.mock.mockImplementation(async () => ({
            User: {
                Id: 'jf-perms-test-user',
                Name: 'permsuser',
                ServerId: 'server-1',
                Policy: { IsAdministrator: false },
            },
            AccessToken: 'perms-token',
        }));
        const res = await (0, supertest_1.default)(app)
            .post('/auth/jellyfin/quickconnect/authenticate')
            .send({ secret: 'abc123def456abc123def456' });
        strict_1.default.strictEqual(res.status, 200);
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const user = await userRepo.findOneOrFail({
            where: { jellyfinUserId: 'jf-perms-test-user' },
        });
        strict_1.default.strictEqual(user.permissions, 32);
    });
    (0, node_test_1.it)('returns 403 when newPlexLogin is disabled and user does not exist', async () => {
        const settings = (0, settings_1.getSettings)();
        settings.main.newPlexLogin = false;
        authenticateQCMock.mock.mockImplementation(async () => ({
            User: {
                Id: 'jf-unknown-user',
                Name: 'unknownuser',
                ServerId: 'server-1',
                Policy: { IsAdministrator: false },
            },
            AccessToken: 'unknown-token',
        }));
        const res = await (0, supertest_1.default)(app)
            .post('/auth/jellyfin/quickconnect/authenticate')
            .send({ secret: 'abc123def456abc123def456' });
        strict_1.default.strictEqual(res.status, 403);
        strict_1.default.strictEqual(res.body.message, 'Access denied.');
    });
    (0, node_test_1.it)('returns error when Jellyfin authenticateQuickConnect fails', async () => {
        authenticateQCMock.mock.mockImplementation(async () => {
            throw new error_2.ApiError(401, error_1.ApiErrorCode.InvalidCredentials);
        });
        const res = await (0, supertest_1.default)(app)
            .post('/auth/jellyfin/quickconnect/authenticate')
            .send({ secret: 'abc123def456abc123def456' });
        strict_1.default.strictEqual(res.status, 401);
        strict_1.default.strictEqual(res.body.message, error_1.ApiErrorCode.InvalidCredentials);
    });
    (0, node_test_1.it)('returns 500 when Jellyfin throws a generic error', async () => {
        authenticateQCMock.mock.mockImplementation(async () => {
            throw new Error('Network timeout');
        });
        const res = await (0, supertest_1.default)(app)
            .post('/auth/jellyfin/quickconnect/authenticate')
            .send({ secret: 'abc123def456abc123def456' });
        strict_1.default.strictEqual(res.status, 500);
    });
});
(0, node_test_1.describe)('GET /auth/me', () => {
    (0, node_test_1.it)('returns 403 when not authenticated', async () => {
        const res = await (0, supertest_1.default)(app).get('/auth/me');
        strict_1.default.strictEqual(res.status, 403);
    });
    (0, node_test_1.it)('returns the authenticated user', async () => {
        const agent = await authenticatedAgent('admin@seerr.dev', 'test1234');
        const res = await agent.get('/auth/me');
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.ok('id' in res.body);
        strict_1.default.strictEqual(res.body.displayName, 'admin');
    });
    (0, node_test_1.it)('includes userEmailRequired warning when email is required but invalid', async () => {
        const settings = (0, settings_1.getSettings)();
        settings.notifications.agents.email.options.userEmailRequired = true;
        // Change the user's email to something invalid
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const user = await userRepo.findOneOrFail({
            where: { email: 'admin@seerr.dev' },
        });
        user.email = 'not-an-email';
        await userRepo.save(user);
        // Log in with the changed email
        const agent = supertest_1.default.agent(app);
        settings.main.localLogin = true;
        const loginRes = await agent
            .post('/auth/local')
            .send({ email: 'not-an-email', password: 'test1234' });
        strict_1.default.strictEqual(loginRes.status, 200);
        const res = await agent.get('/auth/me');
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.ok(res.body.warnings.includes('userEmailRequired'));
        settings.notifications.agents.email.options.userEmailRequired = false;
    });
});
(0, node_test_1.describe)('POST /auth/local', () => {
    (0, node_test_1.beforeEach)(() => {
        const settings = (0, settings_1.getSettings)();
        settings.main.localLogin = true;
    });
    (0, node_test_1.it)('returns 200 and user data on valid credentials', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/local')
            .send({ email: 'admin@seerr.dev', password: 'test1234' });
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.ok('id' in res.body);
        // filter() strips sensitive fields like password
        strict_1.default.ok(!('password' in res.body));
    });
    (0, node_test_1.it)('returns 403 on wrong password', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/local')
            .send({ email: 'admin@seerr.dev', password: 'wrongpassword' });
        strict_1.default.strictEqual(res.status, 403);
        strict_1.default.strictEqual(res.body.message, 'Access denied.');
    });
    (0, node_test_1.it)('returns 403 for nonexistent user', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/local')
            .send({ email: 'nobody@seerr.dev', password: 'test1234' });
        strict_1.default.strictEqual(res.status, 403);
        strict_1.default.strictEqual(res.body.message, 'Access denied.');
    });
    (0, node_test_1.it)('returns 500 when local login is disabled', async () => {
        const settings = (0, settings_1.getSettings)();
        settings.main.localLogin = false;
        const res = await (0, supertest_1.default)(app)
            .post('/auth/local')
            .send({ email: 'admin@seerr.dev', password: 'test1234' });
        strict_1.default.strictEqual(res.status, 500);
        strict_1.default.strictEqual(res.body.error, 'Password sign-in is disabled.');
    });
    (0, node_test_1.it)('returns 500 when email is missing', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/local')
            .send({ password: 'test1234' });
        strict_1.default.strictEqual(res.status, 500);
        strict_1.default.match(res.body.error, /email address and a password/);
    });
    (0, node_test_1.it)('returns 500 when password is missing', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/local')
            .send({ email: 'admin@seerr.dev' });
        strict_1.default.strictEqual(res.status, 500);
        strict_1.default.match(res.body.error, /email address and a password/);
    });
    (0, node_test_1.it)('is case-insensitive for email', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/local')
            .send({ email: 'Admin@Seerr.Dev', password: 'test1234' });
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.ok('id' in res.body);
    });
    (0, node_test_1.it)('allows the non-admin user to log in', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/local')
            .send({ email: 'friend@seerr.dev', password: 'test1234' });
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.ok('id' in res.body);
    });
    (0, node_test_1.it)('sets a session on successful login', async () => {
        const agent = supertest_1.default.agent(app);
        await agent
            .post('/auth/local')
            .send({ email: 'admin@seerr.dev', password: 'test1234' });
        // Session should persist — /me should succeed
        const meRes = await agent.get('/auth/me');
        strict_1.default.strictEqual(meRes.status, 200);
    });
});
(0, node_test_1.describe)('POST /auth/logout', () => {
    (0, node_test_1.it)('returns 200 when not logged in', async () => {
        const res = await (0, supertest_1.default)(app).post('/auth/logout');
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.strictEqual(res.body.status, 'ok');
    });
    (0, node_test_1.it)('destroys session and returns 200 when logged in', async () => {
        const agent = await authenticatedAgent('admin@seerr.dev', 'test1234');
        // Verify session is active
        const meBeforeRes = await agent.get('/auth/me');
        strict_1.default.strictEqual(meBeforeRes.status, 200);
        const logoutRes = await agent.post('/auth/logout');
        strict_1.default.strictEqual(logoutRes.status, 200);
        strict_1.default.strictEqual(logoutRes.body.status, 'ok');
        // Session should be invalidated — /me should fail
        const meAfterRes = await agent.get('/auth/me');
        strict_1.default.strictEqual(meAfterRes.status, 403);
    });
});
(0, node_test_1.describe)('POST /auth/reset-password', () => {
    (0, node_test_1.beforeEach)(() => {
        emailMock.resetCalls();
    });
    (0, node_test_1.it)('returns 200 for a valid email', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/reset-password')
            .send({ email: 'admin@seerr.dev' });
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.strictEqual(res.body.status, 'ok');
        strict_1.default.strictEqual(emailMock.callCount(), 1);
    });
    (0, node_test_1.it)('returns 200 for nonexistent email (does not reveal user existence)', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/reset-password')
            .send({ email: 'nonexistent@seerr.dev' });
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.strictEqual(res.body.status, 'ok');
        strict_1.default.strictEqual(emailMock.callCount(), 0);
    });
    (0, node_test_1.it)('returns 500 when email is missing', async () => {
        const res = await (0, supertest_1.default)(app).post('/auth/reset-password').send({});
        strict_1.default.strictEqual(res.status, 500);
        strict_1.default.strictEqual(res.body.message, 'Email address required.');
        strict_1.default.strictEqual(emailMock.callCount(), 0);
    });
    (0, node_test_1.it)('sets a resetPasswordGuid on the user', async () => {
        await (0, supertest_1.default)(app)
            .post('/auth/reset-password')
            .send({ email: 'admin@seerr.dev' });
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const user = await userRepo
            .createQueryBuilder('user')
            .addSelect(['user.resetPasswordGuid', 'user.recoveryLinkExpirationDate'])
            .where('user.email = :email', { email: 'admin@seerr.dev' })
            .getOneOrFail();
        strict_1.default.notStrictEqual(user.resetPasswordGuid, undefined);
        strict_1.default.notStrictEqual(user.resetPasswordGuid, null);
        strict_1.default.notStrictEqual(user.recoveryLinkExpirationDate, undefined);
        strict_1.default.strictEqual(emailMock.callCount(), 1);
    });
});
(0, node_test_1.describe)('POST /auth/reset-password/:guid', () => {
    /** Trigger a password reset and return the guid. */
    async function getResetGuid(email) {
        await (0, supertest_1.default)(app).post('/auth/reset-password').send({ email });
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const user = await userRepo
            .createQueryBuilder('user')
            .addSelect('user.resetPasswordGuid')
            .where('user.email = :email', { email })
            .getOneOrFail();
        return user.resetPasswordGuid;
    }
    (0, node_test_1.it)('resets password with a valid guid and password', async () => {
        const guid = await getResetGuid('admin@seerr.dev');
        const res = await (0, supertest_1.default)(app)
            .post(`/auth/reset-password/${guid}`)
            .send({ password: 'newpassword123' });
        strict_1.default.strictEqual(res.status, 200);
        strict_1.default.strictEqual(res.body.status, 'ok');
        // Old password no longer works
        const oldLogin = await (0, supertest_1.default)(app)
            .post('/auth/local')
            .send({ email: 'admin@seerr.dev', password: 'test1234' });
        strict_1.default.strictEqual(oldLogin.status, 403);
        // New password works
        const newLogin = await (0, supertest_1.default)(app)
            .post('/auth/local')
            .send({ email: 'admin@seerr.dev', password: 'newpassword123' });
        strict_1.default.strictEqual(newLogin.status, 200);
    });
    (0, node_test_1.it)('returns 500 for an invalid guid', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/auth/reset-password/invalid-guid-here')
            .send({ password: 'newpassword123' });
        strict_1.default.strictEqual(res.status, 500);
        strict_1.default.strictEqual(res.body.message, 'Invalid password reset link.');
    });
    (0, node_test_1.it)('returns 500 when password is too short', async () => {
        const guid = await getResetGuid('admin@seerr.dev');
        const res = await (0, supertest_1.default)(app)
            .post(`/auth/reset-password/${guid}`)
            .send({ password: 'short' });
        strict_1.default.strictEqual(res.status, 500);
        strict_1.default.strictEqual(res.body.message, 'Password must be at least 8 characters long.');
    });
    (0, node_test_1.it)('returns 500 when password is missing', async () => {
        const guid = await getResetGuid('admin@seerr.dev');
        const res = await (0, supertest_1.default)(app)
            .post(`/auth/reset-password/${guid}`)
            .send({});
        strict_1.default.strictEqual(res.status, 500);
        strict_1.default.strictEqual(res.body.message, 'Password must be at least 8 characters long.');
    });
    (0, node_test_1.it)('returns 500 for an expired recovery link', async () => {
        const guid = await getResetGuid('admin@seerr.dev');
        // Expire the link
        const userRepo = (0, datasource_1.getRepository)(User_1.User);
        const user = await userRepo.findOneOrFail({
            where: { email: 'admin@seerr.dev' },
        });
        user.recoveryLinkExpirationDate = new Date('2020-01-01');
        await userRepo.save(user);
        const res = await (0, supertest_1.default)(app)
            .post(`/auth/reset-password/${guid}`)
            .send({ password: 'newpassword123' });
        strict_1.default.strictEqual(res.status, 500);
        strict_1.default.strictEqual(res.body.message, 'Invalid password reset link.');
    });
    (0, node_test_1.it)('cannot reuse a guid after successful reset', async () => {
        const guid = await getResetGuid('admin@seerr.dev');
        // First reset succeeds
        const first = await (0, supertest_1.default)(app)
            .post(`/auth/reset-password/${guid}`)
            .send({ password: 'newpassword123' });
        strict_1.default.strictEqual(first.status, 200);
        // Second reset with same guid fails (recoveryLinkExpirationDate was cleared)
        const second = await (0, supertest_1.default)(app)
            .post(`/auth/reset-password/${guid}`)
            .send({ password: 'anotherpassword' });
        strict_1.default.strictEqual(second.status, 500);
    });
});

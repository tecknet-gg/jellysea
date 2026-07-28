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
const csurf_1 = __importDefault(require("@dr.pogodin/csurf"));
const plexapi_1 = __importDefault(require("./api/plexapi"));
const datasource_1 = __importStar(require("./datasource"));
const DiscoverSlider_1 = __importDefault(require("./entity/DiscoverSlider"));
const Session_1 = require("./entity/Session");
const User_1 = require("./entity/User");
const i18n_1 = require("./i18n");
const schedule_1 = require("./job/schedule");
const notifications_1 = __importDefault(require("./lib/notifications"));
const discord_1 = __importDefault(require("./lib/notifications/agents/discord"));
const email_1 = __importDefault(require("./lib/notifications/agents/email"));
const gotify_1 = __importDefault(require("./lib/notifications/agents/gotify"));
const ntfy_1 = __importDefault(require("./lib/notifications/agents/ntfy"));
const pushbullet_1 = __importDefault(require("./lib/notifications/agents/pushbullet"));
const pushover_1 = __importDefault(require("./lib/notifications/agents/pushover"));
const slack_1 = __importDefault(require("./lib/notifications/agents/slack"));
const telegram_1 = __importDefault(require("./lib/notifications/agents/telegram"));
const webhook_1 = __importDefault(require("./lib/notifications/agents/webhook"));
const webpush_1 = __importDefault(require("./lib/notifications/agents/webpush"));
const overseerrMerge_1 = __importDefault(require("./lib/overseerrMerge"));
const settings_1 = require("./lib/settings");
const logger_1 = __importDefault(require("./logger"));
const clearcookies_1 = __importDefault(require("./middleware/clearcookies"));
const routes_1 = __importDefault(require("./routes"));
const avatarproxy_1 = __importDefault(require("./routes/avatarproxy"));
const imageproxy_1 = __importDefault(require("./routes/imageproxy"));
const appDataVolume_1 = require("./utils/appDataVolume");
const appVersion_1 = require("./utils/appVersion");
const customProxyAgent_1 = __importStar(require("./utils/customProxyAgent"));
const dnsCache_1 = require("./utils/dnsCache");
const restartFlag_1 = __importDefault(require("./utils/restartFlag"));
const request_ip_1 = require("@supercharge/request-ip");
const out_1 = require("connect-typeorm/out");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const OpenApiValidator = __importStar(require("express-openapi-validator"));
const express_session_1 = __importDefault(require("express-session"));
const promises_1 = __importDefault(require("fs/promises"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const next_1 = __importDefault(require("next"));
const path_1 = __importDefault(require("path"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const proxy_1 = __importDefault(require("./routes/proxy"));
const play_1 = __importDefault(require("./routes/play"));
const auth_1 = require("./middleware/auth");
const API_SPEC_PATH = path_1.default.join(__dirname, '../seerr-api.yml');
logger_1.default.info(`Starting Seerr version ${(0, appVersion_1.getAppVersion)()}`);
const dev = process.env.NODE_ENV !== 'production';
const app = (0, next_1.default)({ dev });
const handle = app.getRequestHandler();
if (!(0, appDataVolume_1.appDataPermissions)()) {
    logger_1.default.error('Something went wrong while checking config folder! Please ensure the config folder is set up properly.\nhttps://docs.seerr.dev/getting-started');
}
app
    .prepare()
    .then(async () => {
    // Run Overseerr to Seerr migration
    await (0, overseerrMerge_1.default)();
    const dbConnection = datasource_1.default.isInitialized
        ? datasource_1.default
        : await datasource_1.default.initialize();
    // Run migrations in production
    if (process.env.NODE_ENV === 'production') {
        if (datasource_1.isPgsql) {
            await dbConnection.runMigrations();
        }
        else {
            await dbConnection.query('PRAGMA foreign_keys=OFF');
            await dbConnection.runMigrations();
            await dbConnection.query('PRAGMA foreign_keys=ON');
        }
    }
    // Load Settings
    const settings = await (0, settings_1.getSettings)().load();
    restartFlag_1.default.initializeSettings(settings);
    (0, i18n_1.initI18n)();
    (0, customProxyAgent_1.setForceIpv4First)(settings.network.forceIpv4First);
    // Add DNS caching
    if (settings.network.dnsCache?.enabled) {
        (0, dnsCache_1.initializeDnsCache)({
            forceMinTtl: settings.network.dnsCache.forceMinTtl,
            forceMaxTtl: settings.network.dnsCache.forceMaxTtl,
        });
    }
    // Register HTTP proxy
    if (settings.network.proxy.enabled) {
        await (0, customProxyAgent_1.default)(settings.network.proxy, settings.network.forceIpv4First);
    }
    // Migrate library types
    if (settings.plex.libraries.length > 1 &&
        !settings.plex.libraries[0].type) {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const admin = await userRepository.findOne({
            select: { id: true, plexToken: true },
            where: { id: 1 },
        });
        if (admin) {
            logger_1.default.info('Migrating Plex libraries to include media type', {
                label: 'Settings',
            });
            const plexapi = new plexapi_1.default({ plexToken: admin.plexToken });
            await plexapi.syncLibraries();
        }
    }
    // Register Notification Agents
    notifications_1.default.registerAgents([
        new discord_1.default(),
        new email_1.default(),
        new gotify_1.default(),
        new ntfy_1.default(),
        new pushbullet_1.default(),
        new pushover_1.default(),
        new slack_1.default(),
        new telegram_1.default(),
        new webhook_1.default(),
        new webpush_1.default(),
    ]);
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const totalUsers = await userRepository.count();
    if (totalUsers > 0) {
        (0, schedule_1.startJobs)();
    }
    else {
        logger_1.default.info(`Skipping starting the scheduled jobs as we have no Plex/Jellyfin/Emby servers setup yet`, {
            label: 'Server',
        });
    }
    // Bootstrap Discovery Sliders
    await DiscoverSlider_1.default.bootstrapSliders();
    const server = (0, express_1.default)();
    if (settings.network.trustProxy) {
        server.enable('trust proxy');
    }
    server.use((0, cookie_parser_1.default)());
    server.use(express_1.default.json());
    server.use(express_1.default.urlencoded({ extended: true }));
    server.use('/proxy', proxy_1.default);
    server.use((req, _res, next) => {
        try {
            const descriptor = Object.getOwnPropertyDescriptor(req, 'ip');
            if (descriptor?.writable === true) {
                Object.defineProperty(req, 'ip', {
                    ...descriptor,
                    value: (0, request_ip_1.getClientIp)(req) ?? '',
                });
            }
        }
        catch (e) {
            logger_1.default.error('Failed to attach the ip to the request', {
                label: 'Middleware',
                message: e.message,
            });
        }
        finally {
            next();
        }
    });
    if (settings.network.csrfProtection) {
        server.use((0, csurf_1.default)({
            cookie: {
                httpOnly: true,
                sameSite: true,
                secure: !dev,
                key: '_csrf',
                path: '/',
            },
        }));
        server.use((req, res, next) => {
            res.cookie('XSRF-TOKEN', req.csrfToken(), {
                sameSite: true,
                secure: !dev,
            });
            next();
        });
    }
    // Set up sessions
    const sessionRespository = (0, datasource_1.getRepository)(Session_1.Session);
    server.use('/api', (0, express_session_1.default)({
        secret: settings.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 30,
            httpOnly: true,
            sameSite: settings.network.csrfProtection ? 'strict' : 'lax',
            secure: 'auto',
        },
        store: new out_1.TypeormStore({
            cleanupLimit: 2,
            ttl: 60 * 60 * 24 * 30,
        }).connect(sessionRespository),
    }));
    server.use('/api/v1/media', auth_1.checkUser, (0, auth_1.isAuthenticated)(), play_1.default);
    const apiSpecContent = await promises_1.default.readFile(API_SPEC_PATH, 'utf-8');
    const apiDocs = js_yaml_1.default.load(apiSpecContent);
    server.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(apiDocs));
    server.use(OpenApiValidator.middleware({
        apiSpec: API_SPEC_PATH,
        validateRequests: true,
    }));
    /**
     * This is a workaround to convert dates to strings before they are validated by
     * OpenAPI validator. Otherwise, they are treated as objects instead of strings
     * and response validation will fail
     */
    server.use((_req, res, next) => {
        const original = res.json;
        res.json = function jsonp(json) {
            return original.call(this, JSON.parse(JSON.stringify(json)));
        };
        next();
    });
    server.use('/api/v1', routes_1.default);
    // Do not set cookies so CDNs can cache them
    server.use('/imageproxy', clearcookies_1.default, imageproxy_1.default);
    server.use('/avatarproxy', clearcookies_1.default, avatarproxy_1.default);
    server.get('*path', (req, res) => handle(req, res));
    server.use((err, _req, res, 
    // We must provide a next function for the function signature here even though its not used
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next) => {
        // format error
        res.status(err.status || 500).json({
            message: err.message,
            errors: err.errors,
        });
    });
    const port = Number(process.env.PORT) || 5055;
    const host = process.env.HOST;
    if (host) {
        server.listen(port, host, () => {
            logger_1.default.info(`Server ready on ${host} port ${port}`, {
                label: 'Server',
            });
        });
    }
    else {
        server.listen(port, () => {
            logger_1.default.info(`Server ready on port ${port}`, {
                label: 'Server',
            });
        });
    }
})
    .catch((err) => {
    logger_1.default.error(err.stack);
    process.exit(1);
});

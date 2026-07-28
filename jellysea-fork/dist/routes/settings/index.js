"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jellyfin_1 = __importDefault(require("../../api/jellyfin"));
const plexapi_1 = __importDefault(require("../../api/plexapi"));
const plextv_1 = __importDefault(require("../../api/plextv"));
const tautulli_1 = __importDefault(require("../../api/tautulli"));
const error_1 = require("../../constants/error");
const datasource_1 = require("../../datasource");
const Media_1 = __importDefault(require("../../entity/Media"));
const MediaRequest_1 = require("../../entity/MediaRequest");
const User_1 = require("../../entity/User");
const schedule_1 = require("../../job/schedule");
const cache_1 = __importDefault(require("../../lib/cache"));
const imageproxy_1 = __importDefault(require("../../lib/imageproxy"));
const permissions_1 = require("../../lib/permissions");
const jellyfin_2 = require("../../lib/scanners/jellyfin");
const plex_1 = require("../../lib/scanners/plex");
const settings_1 = require("../../lib/settings");
const logger_1 = __importDefault(require("../../logger"));
const auth_1 = require("../../middleware/auth");
const discover_1 = __importDefault(require("../../routes/settings/discover"));
const error_2 = require("../../types/error");
const appDataVolume_1 = require("../../utils/appDataVolume");
const appVersion_1 = require("../../utils/appVersion");
const dnsCache_1 = require("../../utils/dnsCache");
const getHostname_1 = require("../../utils/getHostname");
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const fs_1 = __importDefault(require("fs"));
const lodash_1 = require("lodash");
const node_schedule_1 = require("node-schedule");
const path_1 = __importDefault(require("path"));
const semver_1 = __importDefault(require("semver"));
const url_1 = require("url");
const metadata_1 = __importDefault(require("./metadata"));
const notifications_1 = __importDefault(require("./notifications"));
const radarr_1 = __importDefault(require("./radarr"));
const sonarr_1 = __importDefault(require("./sonarr"));
const settingsRoutes = (0, express_1.Router)();
settingsRoutes.use('/notifications', notifications_1.default);
settingsRoutes.use('/radarr', radarr_1.default);
settingsRoutes.use('/sonarr', sonarr_1.default);
settingsRoutes.use('/discover', discover_1.default);
settingsRoutes.use('/metadatas', metadata_1.default);
const filteredMainSettings = (user, main) => {
    if (!user?.hasPermission(permissions_1.Permission.ADMIN)) {
        return (0, lodash_1.omit)(main, 'apiKey');
    }
    return main;
};
settingsRoutes.get('/main', (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    if (!req.user) {
        return next({ status: 400, message: 'User missing from request.' });
    }
    res.status(200).json(filteredMainSettings(req.user, settings.main));
});
settingsRoutes.post('/main', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    settings.main = (0, lodash_1.merge)(settings.main, req.body);
    await settings.save();
    return res.status(200).json(settings.main);
});
settingsRoutes.get('/network', (req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.network);
});
settingsRoutes.post('/network', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    settings.network = (0, lodash_1.merge)(settings.network, req.body);
    await settings.save();
    return res.status(200).json(settings.network);
});
settingsRoutes.post('/main/regenerate', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    const main = await settings.regenerateApiKey();
    if (!req.user) {
        return next({ status: 500, message: 'User missing from request.' });
    }
    return res.status(200).json(filteredMainSettings(req.user, main));
});
settingsRoutes.get('/plex', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.plex);
});
settingsRoutes.post('/plex', async (req, res, next) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const settings = (0, settings_1.getSettings)();
    try {
        const admin = await userRepository.findOneOrFail({
            select: { id: true, plexToken: true },
            where: { id: 1 },
        });
        Object.assign(settings.plex, req.body);
        const plexClient = new plexapi_1.default({ plexToken: admin.plexToken });
        const result = await plexClient.getStatus();
        if (!result?.MediaContainer?.machineIdentifier) {
            throw new Error('Server not found');
        }
        settings.plex.machineId = result.MediaContainer.machineIdentifier;
        settings.plex.name = result.MediaContainer.friendlyName;
        await settings.save();
    }
    catch (e) {
        logger_1.default.error('Something went wrong testing Plex connection', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to connect to Plex.',
        });
    }
    return res.status(200).json(settings.plex);
});
settingsRoutes.get('/plex/devices/servers', async (req, res, next) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    try {
        const admin = await userRepository.findOneOrFail({
            select: { id: true, plexToken: true },
            where: { id: 1 },
        });
        const plexTvClient = admin.plexToken
            ? new plextv_1.default(admin.plexToken)
            : null;
        const devices = (await plexTvClient?.getDevices())?.filter((device) => {
            return device.provides.includes('server') && device.owned;
        });
        const settings = (0, settings_1.getSettings)();
        if (devices) {
            await Promise.all(devices.map(async (device) => {
                const plexDirectConnections = [];
                device.connection.forEach((connection) => {
                    const url = new url_1.URL(connection.uri);
                    if (url.hostname !== connection.address) {
                        const plexDirectConnection = { ...connection };
                        plexDirectConnection.address = url.hostname;
                        plexDirectConnections.push(plexDirectConnection);
                        // Connect to IP addresses over HTTP
                        connection.protocol = 'http';
                    }
                });
                plexDirectConnections.forEach((plexDirectConnection) => {
                    device.connection.push(plexDirectConnection);
                });
                await Promise.all(device.connection.map(async (connection) => {
                    const plexDeviceSettings = {
                        ...settings.plex,
                        ip: connection.address,
                        port: connection.port,
                        useSsl: connection.protocol === 'https',
                    };
                    const plexClient = new plexapi_1.default({
                        plexToken: admin.plexToken,
                        plexSettings: plexDeviceSettings,
                        timeout: 5000,
                    });
                    try {
                        await plexClient.getStatus();
                        connection.status = 200;
                        connection.message = 'OK';
                    }
                    catch (e) {
                        connection.status = 500;
                        connection.message = e.message.split(':')[0];
                    }
                }));
            }));
        }
        return res.status(200).json(devices);
    }
    catch (e) {
        logger_1.default.error('Something went wrong retrieving Plex server list', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve Plex server list.',
        });
    }
});
settingsRoutes.get('/plex/library', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    if (req.query.sync) {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const admin = await userRepository.findOneOrFail({
            select: { id: true, plexToken: true },
            where: { id: 1 },
        });
        const plexapi = new plexapi_1.default({ plexToken: admin.plexToken });
        await plexapi.syncLibraries();
    }
    const enabledLibraries = req.query.enable
        ? req.query.enable.split(',')
        : [];
    settings.plex.libraries = settings.plex.libraries.map((library) => ({
        ...library,
        enabled: enabledLibraries.includes(library.id),
    }));
    await settings.save();
    return res.status(200).json(settings.plex.libraries);
});
settingsRoutes.get('/plex/sync', (_req, res) => {
    return res.status(200).json(plex_1.plexFullScanner.status());
});
settingsRoutes.post('/plex/sync', (req, res) => {
    if (req.body.cancel) {
        plex_1.plexFullScanner.cancel();
    }
    else if (req.body.start) {
        plex_1.plexFullScanner.run();
    }
    return res.status(200).json(plex_1.plexFullScanner.status());
});
settingsRoutes.get('/jellyfin', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.jellyfin);
});
settingsRoutes.post('/jellyfin', async (req, res, next) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const settings = (0, settings_1.getSettings)();
    try {
        const admin = await userRepository.findOneOrFail({
            where: { id: 1 },
            select: ['id', 'jellyfinUserId', 'jellyfinDeviceId'],
            order: { id: 'ASC' },
        });
        const tempJellyfinSettings = { ...settings.jellyfin, ...req.body };
        const jellyfinClient = new jellyfin_1.default((0, getHostname_1.getHostname)(tempJellyfinSettings), tempJellyfinSettings.apiKey, admin.jellyfinDeviceId ?? '');
        const result = await jellyfinClient.getSystemInfo();
        if (!result?.Id) {
            throw new error_2.ApiError(result?.status, error_1.ApiErrorCode.InvalidUrl);
        }
        Object.assign(settings.jellyfin, req.body);
        settings.jellyfin.serverId = result.Id;
        settings.jellyfin.name = result.ServerName;
        await settings.save();
    }
    catch (e) {
        if (e instanceof error_2.ApiError) {
            logger_1.default.error('Something went wrong testing Jellyfin connection', {
                label: 'API',
                status: e.statusCode,
                errorMessage: error_1.ApiErrorCode.InvalidUrl,
            });
            return next({
                status: e.statusCode,
                message: error_1.ApiErrorCode.InvalidUrl,
            });
        }
        else {
            logger_1.default.error('Something went wrong', {
                label: 'API',
                errorMessage: e.message,
            });
            return next({
                status: e.statusCode ?? 500,
                message: error_1.ApiErrorCode.Unknown,
            });
        }
    }
    return res.status(200).json(settings.jellyfin);
});
settingsRoutes.get('/jellyfin/library', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    if (req.query.sync) {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const admin = await userRepository.findOneOrFail({
            select: ['id', 'jellyfinDeviceId', 'jellyfinUserId'],
            where: { id: 1 },
            order: { id: 'ASC' },
        });
        const jellyfinClient = new jellyfin_1.default((0, getHostname_1.getHostname)(), settings.jellyfin.apiKey, admin.jellyfinDeviceId ?? '');
        jellyfinClient.setUserId(admin.jellyfinUserId ?? '');
        const libraries = await jellyfinClient.getLibraries();
        if (libraries.length === 0) {
            // Check if no libraries are found due to the fallback to user views
            // This only affects LDAP users
            const account = await jellyfinClient.getUser();
            // Automatic Library grouping is not supported when user views are used to get library
            if (account.Configuration.GroupedFolders?.length > 0) {
                return next({
                    status: 501,
                    message: error_1.ApiErrorCode.SyncErrorGroupedFolders,
                });
            }
            return next({ status: 404, message: error_1.ApiErrorCode.SyncErrorNoLibraries });
        }
        const newLibraries = libraries.map((library) => {
            const existing = settings.jellyfin.libraries.find((l) => l.id === library.key && l.name === library.title);
            return {
                id: library.key,
                name: library.title,
                enabled: existing?.enabled ?? false,
                type: library.type,
            };
        });
        settings.jellyfin.libraries = newLibraries;
    }
    const enabledLibraries = req.query.enable
        ? req.query.enable.split(',')
        : [];
    settings.jellyfin.libraries = settings.jellyfin.libraries.map((library) => ({
        ...library,
        enabled: enabledLibraries.includes(library.id),
    }));
    await settings.save();
    return res.status(200).json(settings.jellyfin.libraries);
});
settingsRoutes.get('/jellyfin/users', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const admin = await userRepository.findOneOrFail({
        select: ['id', 'jellyfinDeviceId', 'jellyfinUserId'],
        where: { id: 1 },
        order: { id: 'ASC' },
    });
    const jellyfinClient = new jellyfin_1.default((0, getHostname_1.getHostname)(), settings.jellyfin.apiKey, admin.jellyfinDeviceId ?? '');
    jellyfinClient.setUserId(admin.jellyfinUserId ?? '');
    const resp = await jellyfinClient.getUsers();
    const users = resp.users.map((user) => ({
        username: user.Name,
        id: user.Id,
        thumb: `/avatarproxy/${user.Id}`,
        email: user.Name,
    }));
    return res.status(200).json(users);
});
settingsRoutes.get('/jellyfin/sync', (_req, res) => {
    return res.status(200).json(jellyfin_2.jellyfinFullScanner.status());
});
settingsRoutes.post('/jellyfin/sync', (req, res) => {
    if (req.body.cancel) {
        jellyfin_2.jellyfinFullScanner.cancel();
    }
    else if (req.body.start) {
        jellyfin_2.jellyfinFullScanner.run();
    }
    return res.status(200).json(jellyfin_2.jellyfinFullScanner.status());
});
settingsRoutes.get('/tautulli', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.tautulli);
});
settingsRoutes.post('/tautulli', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    Object.assign(settings.tautulli, req.body);
    if (settings.tautulli.hostname) {
        try {
            const tautulliClient = new tautulli_1.default(settings.tautulli);
            const result = await tautulliClient.getInfo();
            if (!semver_1.default.gte(semver_1.default.coerce(result?.tautulli_version) ?? '', '2.9.0')) {
                throw new Error('Tautulli version not supported');
            }
            await settings.save();
        }
        catch (e) {
            logger_1.default.error('Something went wrong testing Tautulli connection', {
                label: 'API',
                errorMessage: e.message,
            });
            return next({
                status: 500,
                message: 'Unable to connect to Tautulli.',
            });
        }
    }
    return res.status(200).json(settings.tautulli);
});
settingsRoutes.get('/plex/users', (0, auth_1.isAuthenticated)(permissions_1.Permission.MANAGE_USERS), async (req, res, next) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const qb = userRepository.createQueryBuilder('user');
    try {
        const admin = await userRepository.findOneOrFail({
            select: { id: true, plexToken: true },
            where: { id: 1 },
        });
        const plexApi = new plextv_1.default(admin.plexToken ?? '');
        const plexUsers = (await plexApi.getUsers()).MediaContainer.User.map((user) => user.$).filter((user) => user.email);
        const unimportedPlexUsers = [];
        const plexIds = plexUsers.map((plexUser) => plexUser.id);
        const plexEmails = plexUsers.map((plexUser) => plexUser.email.toLowerCase());
        if (!plexIds.length)
            plexIds.push('-1');
        if (!plexEmails.length)
            plexEmails.push('@');
        const existingUsers = await qb
            .where('user.plexId IN (:...plexIds)', { plexIds })
            .orWhere('user.email IN (:...plexEmails)', { plexEmails })
            .getMany();
        await Promise.all(plexUsers.map(async (plexUser) => {
            if (!existingUsers.find((user) => user.plexId === parseInt(plexUser.id) ||
                user.email === plexUser.email.toLowerCase()) &&
                (await plexApi.checkUserAccess(parseInt(plexUser.id)))) {
                unimportedPlexUsers.push(plexUser);
            }
        }));
        return res.status(200).json((0, lodash_1.sortBy)(unimportedPlexUsers, 'username'));
    }
    catch (e) {
        logger_1.default.error('Something went wrong getting unimported Plex users', {
            label: 'API',
            errorMessage: e.message,
        });
        next({
            status: 500,
            message: 'Unable to retrieve unimported Plex users.',
        });
    }
});
settingsRoutes.get('/logs', (0, express_rate_limit_1.default)({ windowMs: 60 * 1000, max: 50 }), (req, res, next) => {
    const pageSize = req.query.take ? Number(req.query.take) : 25;
    const skip = req.query.skip ? Number(req.query.skip) : 0;
    const search = req.query.search ?? '';
    const searchRegexp = new RegExp((0, lodash_1.escapeRegExp)(search), 'i');
    let filter = [];
    switch (req.query.filter) {
        case 'debug':
            filter.push('debug');
        // falls through
        case 'info':
            filter.push('info');
        // falls through
        case 'warn':
            filter.push('warn');
        // falls through
        case 'error':
            filter.push('error');
            break;
        default:
            filter = ['debug', 'info', 'warn', 'error'];
    }
    const logFile = process.env.CONFIG_DIRECTORY
        ? `${process.env.CONFIG_DIRECTORY}/logs/.machinelogs.json`
        : path_1.default.join(__dirname, '../../../config/logs/.machinelogs.json');
    const logs = [];
    const logMessageProperties = [
        'timestamp',
        'level',
        'label',
        'message',
        'data',
    ];
    const deepValueStrings = (obj) => {
        const values = [];
        for (const val of Object.values(obj)) {
            if (typeof val === 'string') {
                values.push(val);
            }
            else if (typeof val === 'number') {
                values.push(val.toString());
            }
            else if (val !== null && typeof val === 'object') {
                values.push(...deepValueStrings(val));
            }
        }
        return values;
    };
    try {
        fs_1.default.readFileSync(logFile, 'utf-8')
            .split('\n')
            .forEach((line) => {
            if (!line.length)
                return;
            const logMessage = JSON.parse(line);
            if (!filter.includes(logMessage.level)) {
                return;
            }
            if (!Object.keys(logMessage).every((key) => logMessageProperties.includes(key))) {
                Object.keys(logMessage)
                    .filter((prop) => !logMessageProperties.includes(prop))
                    .forEach((prop) => {
                    (0, lodash_1.set)(logMessage, `data.${prop}`, logMessage[prop]);
                });
            }
            if (req.query.search) {
                if (
                // label and data are sometimes undefined
                !searchRegexp.test(logMessage.label ?? '') &&
                    !searchRegexp.test(logMessage.message) &&
                    !deepValueStrings(logMessage.data ?? {}).some((val) => searchRegexp.test(val))) {
                    return;
                }
            }
            logs.push(logMessage);
        });
        const displayedLogs = logs.reverse().slice(skip, skip + pageSize);
        return res.status(200).json({
            pageInfo: {
                pages: Math.ceil(logs.length / pageSize),
                pageSize,
                results: logs.length,
                page: Math.ceil(skip / pageSize) + 1,
            },
            results: displayedLogs,
        });
    }
    catch (error) {
        logger_1.default.error('Something went wrong while retrieving logs', {
            label: 'Logs',
            errorMessage: error.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve logs.',
        });
    }
});
settingsRoutes.get('/jobs', (_req, res) => {
    return res.status(200).json(schedule_1.scheduledJobs.map((job) => ({
        id: job.id,
        name: job.name,
        type: job.type,
        interval: job.interval,
        cronSchedule: job.cronSchedule,
        nextExecutionTime: job.job.nextInvocation(),
        running: job.running ? job.running() : false,
    })));
});
settingsRoutes.post('/jobs/:jobId/run', (req, res, next) => {
    const scheduledJob = schedule_1.scheduledJobs.find((job) => job.id === req.params.jobId);
    if (!scheduledJob) {
        return next({ status: 404, message: 'Job not found.' });
    }
    scheduledJob.job.invoke();
    return res.status(200).json({
        id: scheduledJob.id,
        name: scheduledJob.name,
        type: scheduledJob.type,
        interval: scheduledJob.interval,
        cronSchedule: scheduledJob.cronSchedule,
        nextExecutionTime: scheduledJob.job.nextInvocation(),
        running: scheduledJob.running ? scheduledJob.running() : false,
    });
});
settingsRoutes.post('/jobs/:jobId/cancel', (req, res, next) => {
    const scheduledJob = schedule_1.scheduledJobs.find((job) => job.id === req.params.jobId);
    if (!scheduledJob) {
        return next({ status: 404, message: 'Job not found.' });
    }
    if (scheduledJob.cancelFn) {
        scheduledJob.cancelFn();
    }
    return res.status(200).json({
        id: scheduledJob.id,
        name: scheduledJob.name,
        type: scheduledJob.type,
        interval: scheduledJob.interval,
        cronSchedule: scheduledJob.cronSchedule,
        nextExecutionTime: scheduledJob.job.nextInvocation(),
        running: scheduledJob.running ? scheduledJob.running() : false,
    });
});
settingsRoutes.post('/jobs/:jobId/schedule', async (req, res, next) => {
    const scheduledJob = schedule_1.scheduledJobs.find((job) => job.id === req.params.jobId);
    if (!scheduledJob) {
        return next({ status: 404, message: 'Job not found.' });
    }
    const result = (0, node_schedule_1.rescheduleJob)(scheduledJob.job, req.body.schedule);
    const settings = (0, settings_1.getSettings)();
    if (result) {
        settings.jobs[scheduledJob.id].schedule = req.body.schedule;
        await settings.save();
        scheduledJob.cronSchedule = req.body.schedule;
        return res.status(200).json({
            id: scheduledJob.id,
            name: scheduledJob.name,
            type: scheduledJob.type,
            interval: scheduledJob.interval,
            cronSchedule: scheduledJob.cronSchedule,
            nextExecutionTime: scheduledJob.job.nextInvocation(),
            running: scheduledJob.running ? scheduledJob.running() : false,
        });
    }
    else {
        return next({ status: 400, message: 'Invalid job schedule.' });
    }
});
settingsRoutes.get('/cache', async (_req, res) => {
    const cacheManagerCaches = cache_1.default.getAllCaches();
    const apiCaches = Object.values(cacheManagerCaches).map((cache) => ({
        id: cache.id,
        name: cache.name,
        stats: cache.getStats(),
    }));
    const tmdbImageCache = await imageproxy_1.default.getImageStats('tmdb');
    const avatarImageCache = await imageproxy_1.default.getImageStats('avatar');
    const stats = dnsCache_1.dnsCache?.getStats();
    const entries = dnsCache_1.dnsCache?.getCacheEntries();
    return res.status(200).json({
        apiCaches,
        imageCache: {
            tmdb: tmdbImageCache,
            avatar: avatarImageCache,
        },
        dnsCache: {
            stats,
            entries,
        },
    });
});
settingsRoutes.post('/cache/:cacheId/flush', (req, res, next) => {
    const cache = cache_1.default.getCache(req.params.cacheId);
    if (cache) {
        cache.flush();
        return res.status(204).send();
    }
    next({ status: 404, message: 'Cache not found.' });
});
settingsRoutes.post('/cache/dns/:dnsEntry/flush', (req, res, next) => {
    const dnsEntry = req.params.dnsEntry;
    if (dnsCache_1.dnsCache) {
        dnsCache_1.dnsCache.clear(dnsEntry);
        return res.status(204).send();
    }
    next({ status: 404, message: 'Cache not found.' });
});
settingsRoutes.post('/initialize', (0, auth_1.isAuthenticated)(permissions_1.Permission.ADMIN), async (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    settings.public.initialized = true;
    await settings.save();
    return res.status(200).json(settings.public);
});
settingsRoutes.get('/about', async (req, res) => {
    const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
    const mediaRequestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
    const totalMediaItems = await mediaRepository.count();
    const totalRequests = await mediaRequestRepository.count();
    return res.status(200).json({
        version: (0, appVersion_1.getAppVersion)(),
        totalMediaItems,
        totalRequests,
        tz: process.env.TZ,
        appDataPath: (0, appDataVolume_1.appDataPath)(),
    });
});
exports.default = settingsRoutes;

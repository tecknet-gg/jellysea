"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickConnectSecret = void 0;
const jellyfin_1 = __importDefault(require("../api/jellyfin"));
const plextv_1 = __importDefault(require("../api/plextv"));
const error_1 = require("../constants/error");
const server_1 = require("../constants/server");
const user_1 = require("../constants/user");
const datasource_1 = require("../datasource");
const User_1 = require("../entity/User");
const schedule_1 = require("../job/schedule");
const permissions_1 = require("../lib/permissions");
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const auth_1 = require("../middleware/auth");
const avatarproxy_1 = require("../routes/avatarproxy");
const error_2 = require("../types/error");
const appVersion_1 = require("../utils/appVersion");
const getHostname_1 = require("../utils/getHostname");
const axios_1 = __importDefault(require("axios"));
const express_1 = require("express");
const net_1 = __importDefault(require("net"));
const validator_1 = __importDefault(require("validator"));
const zod_1 = require("zod");
const authRoutes = (0, express_1.Router)();
exports.quickConnectSecret = zod_1.z.object({
    secret: zod_1.z
        .string()
        .min(8)
        .max(128)
        .regex(/^[A-Fa-f0-9]+$/),
});
authRoutes.get('/me', (0, auth_1.isAuthenticated)(), async (req, res) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    if (!req.user) {
        return res.status(500).json({
            status: 500,
            error: 'Please sign in.',
        });
    }
    const user = await userRepository.findOneOrFail({
        where: { id: req.user.id },
    });
    // check if email is required in settings and if user has an valid email
    const settings = await (0, settings_1.getSettings)();
    if (settings.notifications.agents.email.options.userEmailRequired &&
        !validator_1.default.isEmail(user.email, { require_tld: false })) {
        user.warnings.push('userEmailRequired');
        logger_1.default.warn(`User ${user.username} has no valid email address`);
    }
    return res.status(200).json(user);
});
authRoutes.post('/plex', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const body = req.body;
    if (!body.authToken) {
        return next({
            status: 500,
            message: 'Authentication token required.',
        });
    }
    if (settings.main.mediaServerType != server_1.MediaServerType.NOT_CONFIGURED &&
        (settings.main.mediaServerLogin === false ||
            settings.main.mediaServerType != server_1.MediaServerType.PLEX)) {
        return res.status(500).json({ error: 'Plex login is disabled' });
    }
    try {
        // First we need to use this auth token to get the user's email from plex.tv
        const plextv = new plextv_1.default(body.authToken);
        const account = await plextv.getUser();
        // Next let's see if the user already exists
        let user = await userRepository
            .createQueryBuilder('user')
            .where('user.plexId = :id', { id: account.id })
            .orWhere('user.email = :email', {
            email: account.email.toLowerCase(),
        })
            .getOne();
        if (!user && !(await userRepository.count())) {
            user = new User_1.User({
                email: account.email,
                plexUsername: account.username,
                plexId: account.id,
                plexToken: account.authToken,
                permissions: permissions_1.Permission.ADMIN,
                avatar: account.thumb,
                userType: user_1.UserType.PLEX,
            });
            settings.main.mediaServerType = server_1.MediaServerType.PLEX;
            await settings.save();
            (0, schedule_1.startJobs)();
            await userRepository.save(user);
        }
        else {
            const mainUser = await userRepository.findOneOrFail({
                select: { id: true, plexToken: true, plexId: true, email: true },
                where: { id: 1 },
            });
            const mainPlexTv = new plextv_1.default(mainUser.plexToken ?? '');
            if (!account.id) {
                logger_1.default.error('Plex ID was missing from Plex.tv response', {
                    label: 'API',
                    ip: req.ip,
                    email: account.email,
                    plexUsername: account.username,
                });
                return next({
                    status: 500,
                    message: 'Something went wrong. Try again.',
                });
            }
            if (account.id === mainUser.plexId ||
                (account.email === mainUser.email && !mainUser.plexId) ||
                (await mainPlexTv.checkUserAccess(account.id))) {
                if (user) {
                    if (!user.plexId) {
                        logger_1.default.info('Found matching Plex user; updating user with Plex data', {
                            label: 'API',
                            ip: req.ip,
                            email: user.email,
                            userId: user.id,
                            plexId: account.id,
                            plexUsername: account.username,
                        });
                    }
                    user.plexToken = body.authToken;
                    user.plexId = account.id;
                    user.avatar = account.thumb;
                    user.email = account.email;
                    user.plexUsername = account.username;
                    user.userType = user_1.UserType.PLEX;
                    await userRepository.save(user);
                }
                else if (!settings.main.newPlexLogin) {
                    logger_1.default.warn('Failed sign-in attempt by unimported Plex user with access to the media server', {
                        label: 'API',
                        ip: req.ip,
                        email: account.email,
                        plexId: account.id,
                        plexUsername: account.username,
                    });
                    return next({
                        status: 403,
                        message: 'Access denied.',
                    });
                }
                else {
                    logger_1.default.info('Sign-in attempt from Plex user with access to the media server; creating new Seerr user', {
                        label: 'API',
                        ip: req.ip,
                        email: account.email,
                        plexId: account.id,
                        plexUsername: account.username,
                    });
                    user = new User_1.User({
                        email: account.email,
                        plexUsername: account.username,
                        plexId: account.id,
                        plexToken: account.authToken,
                        permissions: settings.main.defaultPermissions,
                        avatar: account.thumb,
                        userType: user_1.UserType.PLEX,
                    });
                    await userRepository.save(user);
                }
            }
            else {
                logger_1.default.warn('Failed sign-in attempt by Plex user without access to the media server', {
                    label: 'API',
                    ip: req.ip,
                    email: account.email,
                    plexId: account.id,
                    plexUsername: account.username,
                });
                return next({
                    status: 403,
                    message: 'Access denied.',
                });
            }
        }
        // Set logged in session
        if (req.session) {
            req.session.userId = user.id;
        }
        return res.status(200).json(user?.filter() ?? {});
    }
    catch (e) {
        logger_1.default.error('Something went wrong authenticating with Plex account', {
            label: 'API',
            errorMessage: e.message,
            ip: req.ip,
        });
        return next({
            status: 500,
            message: 'Unable to authenticate.',
        });
    }
});
function getUserAvatarUrl(user) {
    return `/avatarproxy/${user.jellyfinUserId}?v=${user.avatarVersion}`;
}
authRoutes.post('/jellyfin', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const body = req.body;
    //Make sure jellyfin login is enabled, but only if jellyfin && Emby is not already configured
    if (
    // media server not configured, allow login for setup
    settings.main.mediaServerType != server_1.MediaServerType.NOT_CONFIGURED &&
        (settings.main.mediaServerLogin === false ||
            // media server is neither jellyfin or emby
            (settings.main.mediaServerType !== server_1.MediaServerType.JELLYFIN &&
                settings.main.mediaServerType !== server_1.MediaServerType.EMBY))) {
        return res.status(500).json({ error: 'Jellyfin login is disabled' });
    }
    if (!body.username) {
        return res.status(500).json({ error: 'You must provide an username' });
    }
    else if (settings.jellyfin.ip !== '' && body.hostname) {
        return res
            .status(500)
            .json({ error: 'Jellyfin hostname already configured' });
    }
    else if (settings.jellyfin.ip === '' && !body.hostname) {
        return res.status(500).json({ error: 'No hostname provided.' });
    }
    try {
        const hostname = settings.jellyfin.ip !== ''
            ? (0, getHostname_1.getHostname)()
            : (0, getHostname_1.getHostname)({
                useSsl: body.useSsl,
                ip: body.hostname,
                port: body.port,
                urlBase: body.urlBase,
            });
        // Try to find deviceId that corresponds to jellyfin user, else generate a new one
        let user = await userRepository.findOne({
            where: { jellyfinUsername: body.username },
            select: { id: true, jellyfinDeviceId: true },
        });
        let deviceId = 'BOT_seerr';
        if (user && user.id === 1) {
            // Admin is always BOT_seerr
            deviceId = 'BOT_seerr';
        }
        else if (user && user.jellyfinDeviceId) {
            deviceId = user.jellyfinDeviceId;
        }
        else if (body.username) {
            deviceId = Buffer.from(`BOT_seerr_${body.username}`).toString('base64');
        }
        // First we need to attempt to log the user in to jellyfin
        const jellyfinserver = new jellyfin_1.default(hostname ?? '', undefined, deviceId);
        const ip = req.ip;
        let clientIp;
        if (ip) {
            if (net_1.default.isIPv4(ip)) {
                clientIp = ip;
            }
            else if (net_1.default.isIPv6(ip)) {
                clientIp = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
            }
        }
        const account = await jellyfinserver.login(body.username, body.password, clientIp);
        // Next let's see if the user already exists
        user = await userRepository.findOne({
            where: { jellyfinUserId: account.User.Id },
        });
        const missingAdminUser = !user && !(await userRepository.count());
        if (missingAdminUser ||
            settings.main.mediaServerType === server_1.MediaServerType.NOT_CONFIGURED) {
            // Check if user is admin on jellyfin
            if (account.User.Policy.IsAdministrator === false) {
                throw new error_2.ApiError(403, error_1.ApiErrorCode.NotAdmin);
            }
            if (body.serverType !== server_1.MediaServerType.JELLYFIN &&
                body.serverType !== server_1.MediaServerType.EMBY) {
                throw new error_2.ApiError(500, error_1.ApiErrorCode.NoAdminUser);
            }
            settings.main.mediaServerType = body.serverType;
            if (missingAdminUser) {
                logger_1.default.info('Sign-in attempt from Jellyfin user with access to the media server; creating initial admin user for Seerr', {
                    label: 'API',
                    ip: req.ip,
                    jellyfinUsername: account.User.Name,
                });
                // User doesn't exist, and there are no users in the database, we'll create the user
                // with admin permissions
                user = new User_1.User({
                    id: 1,
                    email: body.email || account.User.Name,
                    jellyfinUsername: account.User.Name,
                    jellyfinUserId: account.User.Id,
                    jellyfinDeviceId: deviceId,
                    jellyfinAuthToken: account.AccessToken,
                    permissions: permissions_1.Permission.ADMIN,
                    userType: body.serverType === server_1.MediaServerType.JELLYFIN
                        ? user_1.UserType.JELLYFIN
                        : user_1.UserType.EMBY,
                });
                user.avatar = getUserAvatarUrl(user);
                await userRepository.save(user);
            }
            else {
                logger_1.default.info('Sign-in attempt from Jellyfin user with access to the media server; editing admin user for Seerr', {
                    label: 'API',
                    ip: req.ip,
                    jellyfinUsername: account.User.Name,
                });
                // User alread exist but settings.json is not configured, we'll edit the admin user
                user = await userRepository.findOne({
                    where: { id: 1 },
                });
                if (!user) {
                    throw new Error('Unable to find admin user to edit');
                }
                user.email = body.email || account.User.Name;
                user.jellyfinUsername = account.User.Name;
                user.jellyfinUserId = account.User.Id;
                user.jellyfinDeviceId = deviceId;
                user.jellyfinAuthToken = account.AccessToken;
                user.permissions = permissions_1.Permission.ADMIN;
                user.avatar = getUserAvatarUrl(user);
                user.userType =
                    body.serverType === server_1.MediaServerType.JELLYFIN
                        ? user_1.UserType.JELLYFIN
                        : user_1.UserType.EMBY;
                await userRepository.save(user);
            }
            // Create an API key on Jellyfin from this admin user
            const jellyfinClient = new jellyfin_1.default(hostname, account.AccessToken, deviceId);
            const apiKey = await jellyfinClient.createApiToken('Seerr');
            const serverName = await jellyfinserver.getServerName();
            settings.jellyfin.name = serverName;
            settings.jellyfin.serverId = account.User.ServerId;
            settings.jellyfin.ip = body.hostname ?? '';
            settings.jellyfin.port = body.port ?? 8096;
            settings.jellyfin.urlBase = body.urlBase ?? '';
            settings.jellyfin.useSsl = body.useSsl ?? false;
            settings.jellyfin.apiKey = apiKey;
            await settings.save();
            (0, schedule_1.startJobs)();
        }
        // User already exists, let's update their information
        else if (account.User.Id === user?.jellyfinUserId) {
            logger_1.default.info(`Found matching ${settings.main.mediaServerType === server_1.MediaServerType.JELLYFIN
                ? server_1.ServerType.JELLYFIN
                : server_1.ServerType.EMBY} user; updating user with ${settings.main.mediaServerType === server_1.MediaServerType.JELLYFIN
                ? server_1.ServerType.JELLYFIN
                : server_1.ServerType.EMBY}`, {
                label: 'API',
                ip: req.ip,
                jellyfinUsername: account.User.Name,
            });
            user.avatar = getUserAvatarUrl(user);
            user.jellyfinUsername = account.User.Name;
            if (user.username === account.User.Name) {
                user.username = '';
            }
            await userRepository.save(user);
        }
        else if (!settings.main.newPlexLogin) {
            logger_1.default.warn('Failed sign-in attempt by unimported Jellyfin user with access to the media server', {
                label: 'API',
                ip: req.ip,
                jellyfinUserId: account.User.Id,
                jellyfinUsername: account.User.Name,
            });
            return next({
                status: 403,
                message: 'Access denied.',
            });
        }
        else if (!user) {
            logger_1.default.info('Sign-in attempt from Jellyfin user with access to the media server; creating new Seerr user', {
                label: 'API',
                ip: req.ip,
                jellyfinUsername: account.User.Name,
            });
            user = new User_1.User({
                email: body.email,
                jellyfinUsername: account.User.Name,
                jellyfinUserId: account.User.Id,
                jellyfinDeviceId: deviceId,
                permissions: settings.main.defaultPermissions,
                userType: settings.main.mediaServerType === server_1.MediaServerType.JELLYFIN
                    ? user_1.UserType.JELLYFIN
                    : user_1.UserType.EMBY,
            });
            user.avatar = getUserAvatarUrl(user);
            //initialize Jellyfin/Emby users with local login
            const passedExplicitPassword = body.password && body.password.length > 0;
            if (passedExplicitPassword) {
                await user.setPassword(body.password ?? '');
            }
            await userRepository.save(user);
        }
        if (user && user.jellyfinUserId) {
            try {
                const { changed } = await (0, avatarproxy_1.checkAvatarChanged)(user);
                if (changed) {
                    user.avatar = getUserAvatarUrl(user);
                    await userRepository.save(user);
                    logger_1.default.debug('Avatar updated during login', {
                        userId: user.id,
                        jellyfinUserId: user.jellyfinUserId,
                    });
                }
            }
            catch (error) {
                logger_1.default.error('Error handling avatar during login', {
                    label: 'Auth',
                    errorMessage: error.message,
                });
            }
        }
        // Set logged in session
        if (req.session) {
            req.session.userId = user?.id;
        }
        return res.status(200).json(user?.filter() ?? {});
    }
    catch (e) {
        switch (e.errorCode) {
            case error_1.ApiErrorCode.InvalidUrl:
                logger_1.default.error(`The provided ${settings.main.mediaServerType === server_1.MediaServerType.JELLYFIN
                    ? server_1.ServerType.JELLYFIN
                    : server_1.ServerType.EMBY} is invalid or the server is not reachable.`, {
                    label: 'Auth',
                    error: e.errorCode,
                    status: e.statusCode,
                    hostname: (0, getHostname_1.getHostname)({
                        useSsl: body.useSsl,
                        ip: body.hostname,
                        port: body.port,
                        urlBase: body.urlBase,
                    }),
                });
                return next({
                    status: e.statusCode,
                    message: e.errorCode,
                });
            case error_1.ApiErrorCode.InvalidCredentials:
                logger_1.default.warn('Failed sign-in attempt from user with incorrect Jellyfin credentials', {
                    label: 'Auth',
                    account: {
                        ip: req.ip,
                        email: body.username,
                        password: '__REDACTED__',
                    },
                });
                return next({
                    status: e.statusCode,
                    message: e.errorCode,
                });
            case error_1.ApiErrorCode.NotAdmin:
                logger_1.default.warn('Failed sign-in attempt from user without admin permissions', {
                    label: 'Auth',
                    account: {
                        ip: req.ip,
                        email: body.username,
                    },
                });
                return next({
                    status: e.statusCode,
                    message: e.errorCode,
                });
            case error_1.ApiErrorCode.NoAdminUser:
                logger_1.default.warn('Failed sign-in attempt from user without admin permissions and no admin user exists', {
                    label: 'Auth',
                    account: {
                        ip: req.ip,
                        email: body.username,
                    },
                });
                return next({
                    status: e.statusCode,
                    message: e.errorCode,
                });
            default:
                logger_1.default.error(e.message, { label: 'Auth' });
                return next({
                    status: 500,
                    message: 'Something went wrong.',
                });
        }
    }
});
authRoutes.post('/jellyfin/quickconnect/initiate', async (req, res, next) => {
    try {
        const hostname = (0, getHostname_1.getHostname)();
        const jellyfinServer = new jellyfin_1.default(hostname ?? '', undefined, undefined);
        const response = await jellyfinServer.initiateQuickConnect();
        return res.status(200).json({
            code: response.Code,
            secret: response.Secret,
        });
    }
    catch (error) {
        logger_1.default.error('Error initiating Jellyfin quick connect', {
            label: 'Auth',
            errorMessage: error.message,
        });
        return next({
            status: 500,
            message: 'Failed to initiate quick connect.',
        });
    }
});
authRoutes.get('/jellyfin/quickconnect/check', async (req, res, next) => {
    const result = exports.quickConnectSecret.safeParse(req.query);
    if (!result.success) {
        return next({
            status: 400,
            message: 'Invalid secret format',
        });
    }
    const { secret } = result.data;
    try {
        const hostname = (0, getHostname_1.getHostname)();
        const jellyfinServer = new jellyfin_1.default(hostname ?? '', undefined, undefined);
        const response = await jellyfinServer.checkQuickConnect(secret);
        return res.status(200).json({ authenticated: response.Authenticated });
    }
    catch (e) {
        return next({
            status: e.statusCode || 500,
            message: 'Failed to check Quick Connect status',
        });
    }
});
authRoutes.post('/jellyfin/quickconnect/authenticate', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const result = exports.quickConnectSecret.safeParse(req.body);
    if (!result.success) {
        return next({
            status: 400,
            message: 'Secret required',
        });
    }
    const { secret } = result.data;
    if (settings.main.mediaServerType === server_1.MediaServerType.NOT_CONFIGURED ||
        !(await userRepository.count())) {
        return next({
            status: 403,
            message: 'Quick Connect is not available during initial setup.',
        });
    }
    try {
        const hostname = (0, getHostname_1.getHostname)();
        const jellyfinServer = new jellyfin_1.default(hostname ?? '', undefined, undefined);
        const account = await jellyfinServer.authenticateQuickConnect(secret);
        let user = await userRepository.findOne({
            where: { jellyfinUserId: account.User.Id },
        });
        const deviceId = Buffer.from(`BOT_seerr_${account.User.Name ?? ''}`).toString('base64');
        if (user) {
            logger_1.default.info('Quick Connect sign-in from existing user', {
                label: 'API',
                ip: req.ip,
                jellyfinUsername: account.User.Name,
                userId: user.id,
            });
            user.jellyfinAuthToken = account.AccessToken;
            user.jellyfinDeviceId = deviceId;
            user.avatar = getUserAvatarUrl(user);
            await userRepository.save(user);
        }
        else if (!settings.main.newPlexLogin) {
            logger_1.default.warn('Failed Quick Connect sign-in attempt by unimported Jellyfin user', {
                label: 'API',
                ip: req.ip,
                jellyfinUserId: account.User.Id,
                jellyfinUsername: account.User.Name,
            });
            return next({
                status: 403,
                message: 'Access denied.',
            });
        }
        else {
            logger_1.default.info('Quick Connect sign-in from new Jellyfin user; creating new Seerr user', {
                label: 'API',
                ip: req.ip,
                jellyfinUsername: account.User.Name,
            });
            user = new User_1.User({
                email: account.User.Name,
                jellyfinUsername: account.User.Name,
                jellyfinUserId: account.User.Id,
                jellyfinDeviceId: deviceId,
                permissions: settings.main.defaultPermissions,
                userType: settings.main.mediaServerType === server_1.MediaServerType.JELLYFIN
                    ? user_1.UserType.JELLYFIN
                    : user_1.UserType.EMBY,
            });
            user.avatar = getUserAvatarUrl(user);
            await userRepository.save(user);
        }
        // Set session
        if (req.session) {
            req.session.userId = user.id;
        }
        return res.status(200).json(user?.filter() ?? {});
    }
    catch (e) {
        logger_1.default.error('Quick Connect authentication failed', {
            label: 'Auth',
            error: e.message,
            ip: req.ip,
        });
        return next({
            status: e.statusCode || 500,
            message: error_1.ApiErrorCode.InvalidCredentials,
        });
    }
});
authRoutes.post('/local', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const body = req.body;
    if (!settings.main.localLogin) {
        return res.status(500).json({ error: 'Password sign-in is disabled.' });
    }
    else if (!body.email || !body.password) {
        return res.status(500).json({
            error: 'You must provide both an email address and a password.',
        });
    }
    try {
        const user = await userRepository
            .createQueryBuilder('user')
            .select(['user.id', 'user.email', 'user.password', 'user.plexId'])
            .where('user.email = :email', { email: body.email.toLowerCase() })
            .getOne();
        if (!user || !(await user.passwordMatch(body.password))) {
            logger_1.default.warn('Failed sign-in attempt using invalid Seerr password', {
                label: 'API',
                ip: req.ip,
                email: body.email,
                userId: user?.id,
            });
            return next({
                status: 403,
                message: 'Access denied.',
            });
        }
        // Set logged in session
        if (user && req.session) {
            req.session.userId = user.id;
        }
        return res.status(200).json(user?.filter() ?? {});
    }
    catch (e) {
        logger_1.default.error('Something went wrong authenticating with Seerr password', {
            label: 'API',
            errorMessage: e.message,
            ip: req.ip,
            email: body.email,
        });
        return next({
            status: 500,
            message: 'Unable to authenticate.',
        });
    }
});
authRoutes.post('/logout', async (req, res, next) => {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(200).json({ status: 'ok' });
        }
        const settings = (0, settings_1.getSettings)();
        const isJellyfinOrEmby = settings.main.mediaServerType === server_1.MediaServerType.JELLYFIN ||
            settings.main.mediaServerType === server_1.MediaServerType.EMBY;
        if (isJellyfinOrEmby) {
            const user = await (0, datasource_1.getRepository)(User_1.User)
                .createQueryBuilder('user')
                .addSelect(['user.jellyfinUserId', 'user.jellyfinDeviceId'])
                .where('user.id = :id', { id: userId })
                .getOne();
            if (user?.jellyfinUserId && user.jellyfinDeviceId) {
                try {
                    const baseUrl = (0, getHostname_1.getHostname)();
                    try {
                        await axios_1.default.delete(`${baseUrl}/Devices`, {
                            params: { Id: user.jellyfinDeviceId },
                            headers: {
                                'X-Emby-Authorization': `MediaBrowser Client="Seerr", Device="Seerr", DeviceId="seerr", Version="${settings.main.mediaServerType === server_1.MediaServerType.EMBY
                                    ? '1.0.0'
                                    : (0, appVersion_1.getAppVersion)()}", Token="${settings.jellyfin.apiKey}"`,
                            },
                        });
                    }
                    catch (error) {
                        logger_1.default.error('Failed to delete Jellyfin device', {
                            label: 'Auth',
                            error: error instanceof Error ? error.message : 'Unknown error',
                            userId: user.id,
                            jellyfinUserId: user.jellyfinUserId,
                        });
                    }
                }
                catch (error) {
                    logger_1.default.error('Failed to delete Jellyfin device', {
                        label: 'Auth',
                        error: error instanceof Error ? error.message : 'Unknown error',
                        userId: user.id,
                        jellyfinUserId: user.jellyfinUserId,
                    });
                }
            }
        }
        req.session?.destroy((err) => {
            if (err) {
                logger_1.default.error('Failed to destroy session', {
                    label: 'Auth',
                    error: err.message,
                    userId,
                });
                return next({ status: 500, message: 'Failed to destroy session.' });
            }
            logger_1.default.debug('Successfully logged out user', {
                label: 'Auth',
                userId,
            });
            res.status(200).json({ status: 'ok' });
        });
    }
    catch (error) {
        logger_1.default.error('Error during logout process', {
            label: 'Auth',
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.session?.userId,
        });
        next({ status: 500, message: 'Error during logout process.' });
    }
});
authRoutes.post('/reset-password', async (req, res, next) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const body = req.body;
    if (!body.email) {
        return next({
            status: 500,
            message: 'Email address required.',
        });
    }
    const user = await userRepository
        .createQueryBuilder('user')
        .where('user.email = :email', { email: body.email.toLowerCase() })
        .getOne();
    if (user) {
        await user.resetPassword();
        await userRepository.save(user);
        logger_1.default.info('Successfully sent password reset link', {
            label: 'API',
            ip: req.ip,
            email: body.email,
        });
    }
    else {
        logger_1.default.error('Something went wrong sending password reset link', {
            label: 'API',
            ip: req.ip,
            email: body.email,
        });
    }
    return res.status(200).json({ status: 'ok' });
});
authRoutes.post('/reset-password/:guid', async (req, res, next) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    if (!req.body.password || req.body.password?.length < 8) {
        logger_1.default.warn('Failed password reset attempt using invalid new password', {
            label: 'API',
            ip: req.ip,
            guid: req.params.guid,
        });
        return next({
            status: 500,
            message: 'Password must be at least 8 characters long.',
        });
    }
    const user = await userRepository.findOne({
        where: { resetPasswordGuid: req.params.guid },
    });
    if (!user) {
        logger_1.default.warn('Failed password reset attempt using invalid recovery link', {
            label: 'API',
            ip: req.ip,
            guid: req.params.guid,
        });
        return next({
            status: 500,
            message: 'Invalid password reset link.',
        });
    }
    if (!user.recoveryLinkExpirationDate ||
        user.recoveryLinkExpirationDate <= new Date()) {
        logger_1.default.warn('Failed password reset attempt using expired recovery link', {
            label: 'API',
            ip: req.ip,
            guid: req.params.guid,
            email: user.email,
        });
        return next({
            status: 500,
            message: 'Invalid password reset link.',
        });
    }
    user.recoveryLinkExpirationDate = null;
    await user.setPassword(req.body.password);
    await userRepository.save(user);
    logger_1.default.info('Successfully reset password', {
        label: 'API',
        ip: req.ip,
        guid: req.params.guid,
        email: user.email,
    });
    return res.status(200).json({ status: 'ok' });
});
exports.default = authRoutes;

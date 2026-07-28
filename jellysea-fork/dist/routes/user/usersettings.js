"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jellyfin_1 = __importDefault(require("../../api/jellyfin"));
const plextv_1 = __importDefault(require("../../api/plextv"));
const error_1 = require("../../constants/error");
const server_1 = require("../../constants/server");
const user_1 = require("../../constants/user");
const datasource_1 = require("../../datasource");
const User_1 = require("../../entity/User");
const UserSettings_1 = require("../../entity/UserSettings");
const permissions_1 = require("../../lib/permissions");
const settings_1 = require("../../lib/settings");
const logger_1 = __importDefault(require("../../logger"));
const auth_1 = require("../../middleware/auth");
const auth_2 = require("../../routes/auth");
const error_2 = require("../../types/error");
const getHostname_1 = require("../../utils/getHostname");
const profileMiddleware_1 = require("../../utils/profileMiddleware");
const express_1 = require("express");
const net_1 = __importDefault(require("net"));
const typeorm_1 = require("typeorm");
const _1 = require(".");
const userSettingsRoutes = (0, express_1.Router)({ mergeParams: true });
userSettingsRoutes.get('/main', (0, profileMiddleware_1.isOwnProfileOrAdmin)(), async (req, res, next) => {
    const { main: { defaultQuotas }, } = (0, settings_1.getSettings)();
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    try {
        const user = await userRepository.findOne({
            where: { id: Number(req.params.id) },
        });
        if (!user) {
            return next({ status: 404, message: 'User not found.' });
        }
        return res.status(200).json({
            username: user.username,
            email: user.email,
            locale: user.settings?.locale,
            discoverRegion: user.settings?.discoverRegion,
            streamingRegion: user.settings?.streamingRegion,
            originalLanguage: user.settings?.originalLanguage,
            movieQuotaLimit: user.movieQuotaLimit,
            movieQuotaDays: user.movieQuotaDays,
            tvQuotaLimit: user.tvQuotaLimit,
            tvQuotaDays: user.tvQuotaDays,
            globalMovieQuotaDays: defaultQuotas.movie.quotaDays,
            globalMovieQuotaLimit: defaultQuotas.movie.quotaLimit,
            globalTvQuotaDays: defaultQuotas.tv.quotaDays,
            globalTvQuotaLimit: defaultQuotas.tv.quotaLimit,
            watchlistSyncMovies: user.settings?.watchlistSyncMovies,
            watchlistSyncTv: user.settings?.watchlistSyncTv,
        });
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
userSettingsRoutes.post('/main', (0, profileMiddleware_1.isOwnProfileOrAdmin)(), async (req, res, next) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    try {
        const user = await userRepository.findOne({
            where: { id: Number(req.params.id) },
        });
        if (!user) {
            return next({ status: 404, message: 'User not found.' });
        }
        // "Owner" user settings cannot be modified by other users
        if (user.id === 1 && req.user?.id !== 1) {
            return next({
                status: 403,
                message: "You do not have permission to modify this user's settings.",
            });
        }
        const oldEmail = user.email;
        user.username = req.body.username;
        if (user.userType !== user_1.UserType.PLEX) {
            user.email = req.body.email || user.jellyfinUsername || user.email;
        }
        const existingUser = await userRepository.findOne({
            where: { email: user.email, id: (0, typeorm_1.Not)(user.id) },
        });
        if (oldEmail !== user.email && existingUser) {
            throw new error_2.ApiError(400, error_1.ApiErrorCode.InvalidEmail);
        }
        // Update quota values only if the user has the correct permissions
        if (!user.hasPermission(permissions_1.Permission.MANAGE_USERS) &&
            req.user?.id !== user.id) {
            user.movieQuotaDays = req.body.movieQuotaDays;
            user.movieQuotaLimit = req.body.movieQuotaLimit;
            user.tvQuotaDays = req.body.tvQuotaDays;
            user.tvQuotaLimit = req.body.tvQuotaLimit;
        }
        if (!user.settings) {
            user.settings = new UserSettings_1.UserSettings({
                user: req.user,
                locale: req.body.locale,
                discoverRegion: req.body.discoverRegion,
                streamingRegion: req.body.streamingRegion,
                originalLanguage: req.body.originalLanguage,
                watchlistSyncMovies: req.body.watchlistSyncMovies,
                watchlistSyncTv: req.body.watchlistSyncTv,
            });
        }
        else {
            user.settings.locale = req.body.locale;
            user.settings.discoverRegion = req.body.discoverRegion;
            user.settings.streamingRegion = req.body.streamingRegion;
            user.settings.originalLanguage = req.body.originalLanguage;
            user.settings.watchlistSyncMovies = req.body.watchlistSyncMovies;
            user.settings.watchlistSyncTv = req.body.watchlistSyncTv;
        }
        const savedUser = await userRepository.save(user);
        return res.status(200).json({
            username: savedUser.username,
            locale: savedUser.settings?.locale,
            discoverRegion: savedUser.settings?.discoverRegion,
            streamingRegion: savedUser.settings?.streamingRegion,
            originalLanguage: savedUser.settings?.originalLanguage,
            watchlistSyncMovies: savedUser.settings?.watchlistSyncMovies,
            watchlistSyncTv: savedUser.settings?.watchlistSyncTv,
            email: savedUser.email,
        });
    }
    catch (e) {
        if (e.errorCode) {
            return next({
                status: e.statusCode,
                message: e.errorCode,
            });
        }
        return next({ status: 500, message: e.message });
    }
});
userSettingsRoutes.get('/password', (0, profileMiddleware_1.isOwnProfileOrAdmin)(), async (req, res, next) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    try {
        const user = await userRepository.findOne({
            where: { id: Number(req.params.id) },
            select: ['id', 'password'],
        });
        if (!user) {
            return next({ status: 404, message: 'User not found.' });
        }
        return res.status(200).json({ hasPassword: !!user.password });
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
userSettingsRoutes.post('/password', (0, profileMiddleware_1.isOwnProfileOrAdmin)(), async (req, res, next) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    try {
        const user = await userRepository.findOne({
            where: { id: Number(req.params.id) },
        });
        const userWithPassword = await userRepository.findOne({
            select: ['id', 'password'],
            where: { id: Number(req.params.id) },
        });
        if (!user || !userWithPassword) {
            return next({ status: 404, message: 'User not found.' });
        }
        if (req.body.newPassword.length < 8) {
            return next({
                status: 400,
                message: 'Password must be at least 8 characters.',
            });
        }
        if ((user.id === 1 && req.user?.id !== 1) ||
            (user.hasPermission(permissions_1.Permission.ADMIN) &&
                user.id !== req.user?.id &&
                req.user?.id !== 1)) {
            return next({
                status: 403,
                message: "You do not have permission to modify this user's password.",
            });
        }
        // If the user has the permission to manage users and they are not
        // editing themselves, we will just set the new password
        if (req.user?.hasPermission(permissions_1.Permission.MANAGE_USERS) &&
            req.user?.id !== user.id) {
            await user.setPassword(req.body.newPassword);
            await userRepository.save(user);
            logger_1.default.debug('Password overriden by user.', {
                label: 'User Settings',
                userEmail: user.email,
                changingUser: req.user.email,
            });
            return res.status(204).send();
        }
        // If the user has a password, we need to check the currentPassword is correct
        if (user.password &&
            (!req.body.currentPassword ||
                !(await userWithPassword.passwordMatch(req.body.currentPassword)))) {
            logger_1.default.debug('Attempt to change password for user failed. Invalid current password provided.', { label: 'User Settings', userEmail: user.email });
            return next({ status: 403, message: 'Current password is invalid.' });
        }
        await user.setPassword(req.body.newPassword);
        await userRepository.save(user);
        return res.status(204).send();
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
userSettingsRoutes.post('/linked-accounts/plex', (0, profileMiddleware_1.isOwnProfile)(), async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    if (!req.user) {
        return res.status(404).json({ code: error_1.ApiErrorCode.Unauthorized });
    }
    // Make sure Plex login is enabled
    if (settings.main.mediaServerType !== server_1.MediaServerType.PLEX) {
        return res.status(500).json({ message: 'Plex login is disabled' });
    }
    // First we need to use this auth token to get the user's email from plex.tv
    const plextv = new plextv_1.default(req.body.authToken);
    const account = await plextv.getUser();
    // Do not allow linking of an already linked account
    if (await userRepository.exist({ where: { plexId: account.id } })) {
        return res.status(422).json({
            message: 'This Plex account is already linked to a Seerr user',
        });
    }
    const user = req.user;
    // Emails do not match
    if (user.email !== account.email) {
        return res.status(422).json({
            message: 'This Plex account is registered under a different email address.',
        });
    }
    // valid plex user found, link to current user
    user.userType = user_1.UserType.PLEX;
    user.plexId = account.id;
    user.plexUsername = account.username;
    user.plexToken = account.authToken;
    await userRepository.save(user);
    return res.status(204).send();
});
userSettingsRoutes.delete('/linked-accounts/plex', (0, profileMiddleware_1.isOwnProfileOrAdmin)(), async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    // Make sure Plex login is enabled
    if (settings.main.mediaServerType !== server_1.MediaServerType.PLEX) {
        return res.status(500).json({ message: 'Plex login is disabled' });
    }
    try {
        const user = await userRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where({
            id: Number(req.params.id),
        })
            .getOne();
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (user.id === 1) {
            return res.status(400).json({
                message: 'Cannot unlink media server accounts for the primary administrator.',
            });
        }
        if (!user.email || !user.password) {
            return res.status(400).json({
                message: 'User does not have a local email or password set.',
            });
        }
        user.userType = user_1.UserType.LOCAL;
        user.plexId = null;
        user.plexUsername = null;
        user.plexToken = null;
        await userRepository.save(user);
        return res.status(204).send();
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
});
userSettingsRoutes.post('/linked-accounts/jellyfin', (0, profileMiddleware_1.isOwnProfile)(), async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    if (!req.user) {
        return res.status(401).json({ code: error_1.ApiErrorCode.Unauthorized });
    }
    // Make sure jellyfin login is enabled
    if (settings.main.mediaServerType !== server_1.MediaServerType.JELLYFIN &&
        settings.main.mediaServerType !== server_1.MediaServerType.EMBY) {
        return res
            .status(500)
            .json({ message: 'Jellyfin/Emby login is disabled' });
    }
    // Do not allow linking of an already linked account
    if (await userRepository.exist({
        where: { jellyfinUsername: req.body.username },
    })) {
        return res.status(422).json({
            message: 'The specified account is already linked to a Seerr user',
        });
    }
    const hostname = (0, getHostname_1.getHostname)();
    const deviceId = Buffer.from(req.user?.id === 1 ? 'BOT_seerr' : `BOT_seerr_${req.user.username ?? ''}`).toString('base64');
    const jellyfinserver = new jellyfin_1.default(hostname, undefined, deviceId);
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
    try {
        const account = await jellyfinserver.login(req.body.username, req.body.password, clientIp);
        // Do not allow linking of an already linked account
        if (await userRepository.exist({
            where: { jellyfinUserId: account.User.Id },
        })) {
            return res.status(422).json({
                message: 'The specified account is already linked to a Seerr user',
            });
        }
        const user = req.user;
        // valid jellyfin user found, link to current user
        user.userType =
            settings.main.mediaServerType === server_1.MediaServerType.EMBY
                ? user_1.UserType.EMBY
                : user_1.UserType.JELLYFIN;
        user.jellyfinUserId = account.User.Id;
        user.jellyfinUsername = account.User.Name;
        user.jellyfinAuthToken = account.AccessToken;
        user.jellyfinDeviceId = deviceId;
        await userRepository.save(user);
        return res.status(204).send();
    }
    catch (e) {
        logger_1.default.error('Failed to link account to user.', {
            label: 'API',
            ip: req.ip,
            error: e,
        });
        if (e instanceof error_2.ApiError &&
            e.errorCode === error_1.ApiErrorCode.InvalidCredentials) {
            return res.status(401).json({ code: e.errorCode });
        }
        return res.status(500).send();
    }
});
userSettingsRoutes.delete('/linked-accounts/jellyfin', (0, profileMiddleware_1.isOwnProfileOrAdmin)(), async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    // Make sure jellyfin login is enabled
    if (settings.main.mediaServerType !== server_1.MediaServerType.JELLYFIN &&
        settings.main.mediaServerType !== server_1.MediaServerType.EMBY) {
        return res
            .status(500)
            .json({ message: 'Jellyfin/Emby login is disabled' });
    }
    try {
        const user = await userRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where({
            id: Number(req.params.id),
        })
            .getOne();
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (user.id === 1) {
            return res.status(400).json({
                message: 'Cannot unlink media server accounts for the primary administrator.',
            });
        }
        if (!user.email || !user.password) {
            return res.status(400).json({
                message: 'User does not have a local email or password set.',
            });
        }
        user.userType = user_1.UserType.LOCAL;
        user.jellyfinUserId = null;
        user.jellyfinUsername = null;
        user.jellyfinAuthToken = null;
        user.jellyfinDeviceId = null;
        await userRepository.save(user);
        return res.status(204).send();
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
});
userSettingsRoutes.post('/linked-accounts/jellyfin/quickconnect', (0, profileMiddleware_1.isOwnProfile)(), async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    if (!req.user) {
        return res.status(401).json({ code: error_1.ApiErrorCode.Unauthorized });
    }
    const result = auth_2.quickConnectSecret.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: 'Invalid secret format' });
    }
    const { secret } = result.data;
    if (settings.main.mediaServerType !== server_1.MediaServerType.JELLYFIN &&
        settings.main.mediaServerType !== server_1.MediaServerType.EMBY) {
        return res
            .status(500)
            .json({ message: 'Jellyfin/Emby login is disabled' });
    }
    const hostname = (0, getHostname_1.getHostname)();
    const jellyfinServer = new jellyfin_1.default(hostname);
    try {
        const account = await jellyfinServer.authenticateQuickConnect(secret);
        if (await userRepository.exist({
            where: { jellyfinUserId: account.User.Id },
        })) {
            return res.status(422).json({
                message: 'The specified account is already linked to a Seerr user',
            });
        }
        const user = req.user;
        const deviceId = Buffer.from(user.id === 1 ? 'BOT_seerr' : `BOT_seerr_${user.username ?? ''}`).toString('base64');
        user.userType =
            settings.main.mediaServerType === server_1.MediaServerType.EMBY
                ? user_1.UserType.EMBY
                : user_1.UserType.JELLYFIN;
        user.jellyfinUserId = account.User.Id;
        user.jellyfinUsername = account.User.Name;
        user.jellyfinAuthToken = account.AccessToken;
        user.jellyfinDeviceId = deviceId;
        await userRepository.save(user);
        return res.status(204).send();
    }
    catch (e) {
        logger_1.default.error('Failed to link account with Quick Connect.', {
            label: 'API',
            ip: req.ip,
            error: e,
        });
        const status = e instanceof error_2.ApiError ? e.statusCode : 500;
        return res.status(status).send();
    }
});
userSettingsRoutes.get('/notifications', (0, profileMiddleware_1.isOwnProfileOrAdmin)(), async (req, res, next) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const settings = (0, settings_1.getSettings)()?.notifications.agents;
    try {
        const user = await userRepository.findOne({
            where: { id: Number(req.params.id) },
        });
        if (!user) {
            return next({ status: 404, message: 'User not found.' });
        }
        return res.status(200).json({
            emailEnabled: settings.email.enabled,
            pgpKey: user.settings?.pgpKey,
            discordEnabled: settings?.discord.enabled && settings.discord.options.enableMentions,
            discordEnabledTypes: settings?.discord.enabled && settings.discord.options.enableMentions
                ? settings.discord.types
                : 0,
            discordIds: user.settings?.discordIds ?? [],
            pushbulletAccessToken: user.settings?.pushbulletAccessToken,
            pushoverApplicationToken: user.settings?.pushoverApplicationToken,
            pushoverUserKey: user.settings?.pushoverUserKey,
            pushoverSound: user.settings?.pushoverSound,
            telegramEnabled: settings.telegram.enabled,
            telegramBotUsername: settings.telegram.options.botUsername,
            telegramChatId: user.settings?.telegramChatId,
            telegramMessageThreadId: user.settings?.telegramMessageThreadId,
            telegramSendSilently: user.settings?.telegramSendSilently,
            webPushEnabled: settings.webpush.enabled,
            notificationTypes: user.settings?.notificationTypes ?? {},
        });
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
userSettingsRoutes.post('/notifications', (0, profileMiddleware_1.isOwnProfileOrAdmin)(), async (req, res, next) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    try {
        const user = await userRepository.findOne({
            where: { id: Number(req.params.id) },
        });
        if (!user) {
            return next({ status: 404, message: 'User not found.' });
        }
        // "Owner" user settings cannot be modified by other users
        if (user.id === 1 && req.user?.id !== 1) {
            return next({
                status: 403,
                message: "You do not have permission to modify this user's settings.",
            });
        }
        const discordIds = req.body.discordIds?.filter((id) => id !== '') ?? [];
        if (!user.settings) {
            user.settings = new UserSettings_1.UserSettings({
                user: req.user,
                pgpKey: req.body.pgpKey,
                discordIds,
                pushbulletAccessToken: req.body.pushbulletAccessToken,
                pushoverApplicationToken: req.body.pushoverApplicationToken,
                pushoverUserKey: req.body.pushoverUserKey,
                telegramChatId: req.body.telegramChatId,
                telegramMessageThreadId: req.body.telegramMessageThreadId,
                telegramSendSilently: req.body.telegramSendSilently,
                notificationTypes: req.body.notificationTypes,
            });
        }
        else {
            user.settings.pgpKey = req.body.pgpKey;
            user.settings.discordIds = discordIds;
            user.settings.pushbulletAccessToken = req.body.pushbulletAccessToken;
            user.settings.pushoverApplicationToken =
                req.body.pushoverApplicationToken;
            user.settings.pushoverUserKey = req.body.pushoverUserKey;
            user.settings.pushoverSound = req.body.pushoverSound;
            user.settings.telegramChatId = req.body.telegramChatId;
            user.settings.telegramMessageThreadId =
                req.body.telegramMessageThreadId;
            user.settings.telegramSendSilently = req.body.telegramSendSilently;
            user.settings.notificationTypes = Object.assign({}, user.settings.notificationTypes, req.body.notificationTypes);
        }
        await userRepository.save(user);
        return res.status(200).json({
            pgpKey: user.settings.pgpKey,
            discordIds: user.settings.discordIds ?? [],
            pushbulletAccessToken: user.settings.pushbulletAccessToken,
            pushoverApplicationToken: user.settings.pushoverApplicationToken,
            pushoverUserKey: user.settings.pushoverUserKey,
            pushoverSound: user.settings.pushoverSound,
            telegramChatId: user.settings.telegramChatId,
            telegramMessageThreadId: user.settings.telegramMessageThreadId,
            telegramSendSilently: user.settings.telegramSendSilently,
            notificationTypes: user.settings.notificationTypes,
        });
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
userSettingsRoutes.get('/permissions', (0, auth_1.isAuthenticated)(permissions_1.Permission.MANAGE_USERS), async (req, res, next) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    try {
        const user = await userRepository.findOne({
            where: { id: Number(req.params.id) },
        });
        if (!user) {
            return next({ status: 404, message: 'User not found.' });
        }
        return res.status(200).json({ permissions: user.permissions });
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
userSettingsRoutes.post('/permissions', (0, auth_1.isAuthenticated)(permissions_1.Permission.MANAGE_USERS), async (req, res, next) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    try {
        const user = await userRepository.findOne({
            where: { id: Number(req.params.id) },
        });
        if (!user) {
            return next({ status: 404, message: 'User not found.' });
        }
        // "Owner" user permissions cannot be modified, and users cannot set their own permissions
        if (user.id === 1 || req.user?.id === user.id) {
            return next({
                status: 403,
                message: 'You do not have permission to modify this user',
            });
        }
        if (!(0, _1.canMakePermissionsChange)(req.body.permissions, req.user)) {
            return next({
                status: 403,
                message: 'You do not have permission to grant this level of access',
            });
        }
        user.permissions = req.body.permissions;
        await userRepository.save(user);
        return res.status(200).json({ permissions: user.permissions });
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
exports.default = userSettingsRoutes;

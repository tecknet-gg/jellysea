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
exports.canMakePermissionsChange = void 0;
const jellyfin_1 = __importDefault(require("../../api/jellyfin"));
const plextv_1 = __importDefault(require("../../api/plextv"));
const tautulli_1 = __importDefault(require("../../api/tautulli"));
const media_1 = require("../../constants/media");
const server_1 = require("../../constants/server");
const user_1 = require("../../constants/user");
const datasource_1 = __importStar(require("../../datasource"));
const Media_1 = __importDefault(require("../../entity/Media"));
const MediaRequest_1 = require("../../entity/MediaRequest");
const User_1 = require("../../entity/User");
const UserPushSubscription_1 = require("../../entity/UserPushSubscription");
const Watchlist_1 = require("../../entity/Watchlist");
const permissions_1 = require("../../lib/permissions");
const settings_1 = require("../../lib/settings");
const logger_1 = __importDefault(require("../../logger"));
const auth_1 = require("../../middleware/auth");
const getHostname_1 = require("../../utils/getHostname");
const jellyfin_2 = require("../../utils/jellyfin");
const profileMiddleware_1 = require("../../utils/profileMiddleware");
const express_1 = require("express");
const gravatar_url_1 = __importDefault(require("gravatar-url"));
const lodash_1 = require("lodash");
const typeorm_1 = require("typeorm");
const usersettings_1 = __importDefault(require("./usersettings"));
const router = (0, express_1.Router)();
router.get('/', async (req, res, next) => {
    try {
        const includeIds = [
            ...new Set(req.query.includeIds ? req.query.includeIds.toString().split(',') : []),
        ];
        const pageSize = req.query.take
            ? Number(req.query.take)
            : Math.max(10, includeIds.length);
        const skip = req.query.skip ? Number(req.query.skip) : 0;
        const q = req.query.q ? req.query.q.toString().toLowerCase() : '';
        const sortParam = req.query.sort ? req.query.sort.toString() : undefined;
        const sortDirectionQuery = req.query.sortDirection
            ? req.query.sortDirection.toString().toLowerCase()
            : undefined;
        let sortDirection;
        if (sortDirectionQuery === 'asc') {
            sortDirection = 'ASC';
        }
        else if (sortDirectionQuery === 'desc') {
            sortDirection = 'DESC';
        }
        else {
            switch (sortParam) {
                case 'displayname':
                    sortDirection = 'ASC';
                    break;
                case 'requests':
                case 'updated':
                    sortDirection = 'DESC';
                    break;
                case 'created':
                case 'usertype':
                case 'role':
                case undefined:
                default:
                    sortDirection = 'ASC';
                    break;
            }
        }
        let query = (0, datasource_1.getRepository)(User_1.User).createQueryBuilder('user');
        if (q) {
            query = query.where('LOWER(user.username) LIKE :q OR LOWER(user.email) LIKE :q OR LOWER(user.plexUsername) LIKE :q OR LOWER(user.jellyfinUsername) LIKE :q', { q: `%${q}%` });
        }
        if (includeIds.length > 0) {
            query.andWhereInIds(includeIds);
        }
        switch (sortParam) {
            case 'created':
                query = query.orderBy('user.createdAt', sortDirection);
                break;
            case 'updated':
                query = query.orderBy('user.updatedAt', sortDirection);
                break;
            case 'displayname':
                query = query
                    .addSelect(`CASE WHEN (user.username IS NULL OR user.username = '') THEN (
                CASE WHEN (user.plexUsername IS NULL OR user.plexUsername = '') THEN (
                  CASE WHEN (user.jellyfinUsername IS NULL OR user.jellyfinUsername = '') THEN
                    "user"."email"
                  ELSE
                    LOWER(user.jellyfinUsername)
                  END)
                ELSE
                  LOWER(user.plexUsername)
                END)
              ELSE
                LOWER(user.username)
              END`, 'displayname_sort_key')
                    .orderBy('displayname_sort_key', sortDirection);
                break;
            case 'requests':
                query = query
                    .addSelect((subQuery) => {
                    return subQuery
                        .select('COUNT(request.id)', 'request_count')
                        .from(MediaRequest_1.MediaRequest, 'request')
                        .where('request.requestedBy.id = user.id');
                }, 'request_count')
                    .orderBy('request_count', sortDirection);
                break;
            case 'usertype':
                query = query.orderBy('user.userType', sortDirection);
                break;
            case 'role':
                query = query
                    .addSelect(`CASE
              WHEN user.id = 1 THEN 0
              WHEN (user.permissions & ${permissions_1.Permission.ADMIN}) != 0 THEN 1
              ELSE 2
            END`, 'role_sort_key')
                    .orderBy('role_sort_key', sortDirection);
                break;
            default:
                query = query.orderBy('user.id', sortDirection);
                break;
        }
        const [users, userCount] = await query
            .take(pageSize)
            .skip(skip)
            .distinct(true)
            .getManyAndCount();
        return res.status(200).json({
            pageInfo: {
                pages: Math.ceil(userCount / pageSize),
                pageSize,
                results: userCount,
                page: Math.ceil(skip / pageSize) + 1,
            },
            results: User_1.User.filterMany(users, req.user?.hasPermission(permissions_1.Permission.MANAGE_USERS)),
        });
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
router.post('/', (0, auth_1.isAuthenticated)(permissions_1.Permission.MANAGE_USERS), async (req, res, next) => {
    try {
        const settings = (0, settings_1.getSettings)();
        const body = req.body;
        const email = body.email || body.username;
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const existingUser = await userRepository
            .createQueryBuilder('user')
            .where('user.email = :email', {
            email: email.toLowerCase(),
        })
            .getOne();
        if (existingUser) {
            return next({
                status: 409,
                message: 'User already exists with submitted email.',
                errors: ['USER_EXISTS'],
            });
        }
        const passedExplicitPassword = body.password && body.password.length > 0;
        const avatar = (0, gravatar_url_1.default)(email, { default: 'mm', size: 200 });
        if (!passedExplicitPassword &&
            !settings.notifications.agents.email.enabled) {
            throw new Error('Email notifications must be enabled');
        }
        const user = new User_1.User({
            email,
            avatar: body.avatar ?? avatar,
            username: body.username,
            password: body.password,
            permissions: settings.main.defaultPermissions,
            plexToken: '',
            userType: user_1.UserType.LOCAL,
        });
        if (passedExplicitPassword) {
            await user?.setPassword(body.password);
        }
        else {
            await user?.generatePassword();
        }
        await userRepository.save(user);
        return res.status(201).json(user.filter());
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
router.post('/registerPushSubscription', async (req, res, next) => {
    try {
        // This prevents race conditions where two requests both pass the checks
        await datasource_1.default.transaction(async (transactionalEntityManager) => {
            const transactionalRepo = transactionalEntityManager.getRepository(UserPushSubscription_1.UserPushSubscription);
            // Check for existing subscription by auth or endpoint within transaction
            const existingSubscription = await transactionalRepo.findOne({
                relations: { user: true },
                where: [
                    { auth: req.body.auth, user: { id: req.user?.id } },
                    { endpoint: req.body.endpoint, user: { id: req.user?.id } },
                ],
            });
            if (existingSubscription) {
                // If endpoint matches but auth is different, update with new keys (iOS refresh case)
                if (existingSubscription.endpoint === req.body.endpoint &&
                    existingSubscription.auth !== req.body.auth) {
                    existingSubscription.auth = req.body.auth;
                    existingSubscription.p256dh = req.body.p256dh;
                    existingSubscription.userAgent = req.body.userAgent;
                    await transactionalRepo.save(existingSubscription);
                    logger_1.default.debug('Updated existing push subscription with new keys for same endpoint.', { label: 'API' });
                    return;
                }
                logger_1.default.debug('Duplicate subscription detected. Skipping registration.', { label: 'API' });
                return;
            }
            // Clean up old subscriptions from the same device (userAgent) for this user
            // iOS can silently refresh endpoints, leaving stale subscriptions in the database
            // Only clean up if we're creating a new subscription (not updating an existing one)
            if (req.body.userAgent) {
                const staleSubscriptions = await transactionalRepo.find({
                    relations: { user: true },
                    where: {
                        userAgent: req.body.userAgent,
                        user: { id: req.user?.id },
                        // Only remove subscriptions with different endpoints (stale ones)
                        // Keep subscriptions that might be from different browsers/tabs
                        endpoint: (0, typeorm_1.Not)(req.body.endpoint),
                    },
                });
                if (staleSubscriptions.length > 0) {
                    await transactionalRepo.remove(staleSubscriptions);
                    logger_1.default.debug(`Removed ${staleSubscriptions.length} stale push subscription(s) from same device.`, { label: 'API' });
                }
            }
            const userPushSubscription = new UserPushSubscription_1.UserPushSubscription({
                auth: req.body.auth,
                endpoint: req.body.endpoint,
                p256dh: req.body.p256dh,
                userAgent: req.body.userAgent,
                user: req.user,
            });
            await transactionalRepo.save(userPushSubscription);
        });
        return res.status(204).send();
    }
    catch {
        logger_1.default.error('Failed to register user push subscription', {
            label: 'API',
        });
        next({ status: 500, message: 'Failed to register subscription.' });
    }
});
router.get('/:id/pushSubscriptions', (0, profileMiddleware_1.isOwnProfileOrAdmin)(), async (req, res, next) => {
    try {
        const userPushSubRepository = (0, datasource_1.getRepository)(UserPushSubscription_1.UserPushSubscription);
        const userPushSubs = await userPushSubRepository.find({
            relations: { user: true },
            where: { user: { id: Number(req.params.id) } },
        });
        return res.status(200).json(userPushSubs);
    }
    catch {
        next({ status: 404, message: 'User subscriptions not found.' });
    }
});
router.get('/:id/pushSubscription/:endpoint', (0, profileMiddleware_1.isOwnProfileOrAdmin)(), async (req, res, next) => {
    try {
        const userPushSubRepository = (0, datasource_1.getRepository)(UserPushSubscription_1.UserPushSubscription);
        const userPushSub = await userPushSubRepository.findOneOrFail({
            relations: {
                user: true,
            },
            where: {
                user: { id: Number(req.params.id) },
                endpoint: req.params.endpoint,
            },
        });
        return res.status(200).json(userPushSub);
    }
    catch {
        next({ status: 404, message: 'User subscription not found.' });
    }
});
router.delete('/:id/pushSubscription/:endpoint', (0, profileMiddleware_1.isOwnProfileOrAdmin)(), async (req, res, next) => {
    try {
        const userPushSubRepository = (0, datasource_1.getRepository)(UserPushSubscription_1.UserPushSubscription);
        const userPushSub = await userPushSubRepository.findOne({
            relations: { user: true },
            where: {
                user: { id: Number(req.params.id) },
                endpoint: req.params.endpoint,
            },
        });
        // If not found, just return 204 to prevent push disable failure
        // (rare scenario where user push sub does not exist)
        if (!userPushSub) {
            return res.status(204).send();
        }
        await userPushSubRepository.remove(userPushSub);
        return res.status(204).send();
    }
    catch (e) {
        logger_1.default.error('Something went wrong deleting the user push subcription', {
            label: 'API',
            endpoint: req.params.endpoint,
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'User push subcription not found',
        });
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const user = await userRepository.findOneOrFail({
            where: { id: Number(req.params.id) },
        });
        const isOwnProfile = req.user?.id === user.id;
        const isAdmin = req.user?.hasPermission(permissions_1.Permission.MANAGE_USERS);
        return res.status(200).json(user.filter(isOwnProfile || isAdmin));
    }
    catch {
        next({ status: 404, message: 'User not found.' });
    }
});
router.get('/jellyfin/:jellyfinUserId', async (req, res, next) => {
    try {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const jellyfinUserId = (0, jellyfin_2.normalizeJellyfinGuid)(req.params.jellyfinUserId);
        if (!jellyfinUserId) {
            return next({ status: 400, message: 'Invalid Jellyfin User ID.' });
        }
        const user = await userRepository.findOneOrFail({
            where: { jellyfinUserId },
        });
        return res
            .status(200)
            .json(user.filter(req.user?.hasPermission(permissions_1.Permission.MANAGE_USERS)));
    }
    catch {
        next({ status: 404, message: 'User not found.' });
    }
});
router.use('/:id/settings', usersettings_1.default);
router.get('/:id/requests', async (req, res, next) => {
    const pageSize = req.query.take ? Number(req.query.take) : 20;
    const skip = req.query.skip ? Number(req.query.skip) : 0;
    try {
        const user = await (0, datasource_1.getRepository)(User_1.User).findOne({
            where: { id: Number(req.params.id) },
        });
        if (!user) {
            return next({ status: 404, message: 'User not found.' });
        }
        if (user.id !== req.user?.id &&
            !req.user?.hasPermission([permissions_1.Permission.MANAGE_REQUESTS, permissions_1.Permission.REQUEST_VIEW], { type: 'or' })) {
            return next({
                status: 403,
                message: "You do not have permission to view this user's requests.",
            });
        }
        const [requests, requestCount] = await (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest)
            .createQueryBuilder('request')
            .leftJoinAndSelect('request.media', 'media')
            .leftJoinAndSelect('request.seasons', 'seasons')
            .leftJoinAndSelect('request.modifiedBy', 'modifiedBy')
            .leftJoinAndSelect('request.requestedBy', 'requestedBy')
            .andWhere('requestedBy.id = :id', {
            id: user.id,
        })
            .orderBy('request.id', 'DESC')
            .take(pageSize)
            .skip(skip)
            .getManyAndCount();
        return res.status(200).json({
            pageInfo: {
                pages: Math.ceil(requestCount / pageSize),
                pageSize,
                results: requestCount,
                page: Math.ceil(skip / pageSize) + 1,
            },
            results: requests,
        });
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
const canMakePermissionsChange = (permissions, user) => 
// Only let the owner grant admin privileges
!((0, permissions_1.hasPermission)(permissions_1.Permission.ADMIN, permissions) && user?.id !== 1);
exports.canMakePermissionsChange = canMakePermissionsChange;
router.put('/', (0, auth_1.isAuthenticated)(permissions_1.Permission.MANAGE_USERS), async (req, res, next) => {
    try {
        const isOwner = req.user?.id === 1;
        if (!(0, exports.canMakePermissionsChange)(req.body.permissions, req.user)) {
            return next({
                status: 403,
                message: 'You do not have permission to grant this level of access',
            });
        }
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const users = await userRepository.find({
            where: {
                id: (0, typeorm_1.In)(isOwner ? req.body.ids : req.body.ids.filter((id) => Number(id) !== 1)),
            },
        });
        const updatedUsers = await Promise.all(users.map(async (user) => {
            return userRepository.save({
                ...user,
                ...{ permissions: req.body.permissions },
            });
        }));
        return res.status(200).json(updatedUsers);
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
router.put('/:id', (0, auth_1.isAuthenticated)(permissions_1.Permission.MANAGE_USERS), async (req, res, next) => {
    try {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const user = await userRepository.findOneOrFail({
            where: { id: Number(req.params.id) },
        });
        // Only let the owner user modify themselves
        if (user.id === 1 && req.user?.id !== 1) {
            return next({
                status: 403,
                message: 'You do not have permission to modify this user',
            });
        }
        if (!(0, exports.canMakePermissionsChange)(req.body.permissions, req.user)) {
            return next({
                status: 403,
                message: 'You do not have permission to grant this level of access',
            });
        }
        Object.assign(user, {
            username: req.body.username,
            permissions: req.body.permissions,
        });
        await userRepository.save(user);
        return res.status(200).json(user.filter());
    }
    catch {
        next({ status: 404, message: 'User not found.' });
    }
});
router.delete('/:id', (0, auth_1.isAuthenticated)(permissions_1.Permission.MANAGE_USERS), async (req, res, next) => {
    try {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const user = await userRepository.findOne({
            where: { id: Number(req.params.id) },
            relations: { requests: true },
        });
        if (!user) {
            return next({ status: 404, message: 'User not found.' });
        }
        if (user.id === 1) {
            return next({
                status: 405,
                message: 'This account cannot be deleted.',
            });
        }
        if (user.hasPermission(permissions_1.Permission.ADMIN) && req.user?.id !== 1) {
            return next({
                status: 405,
                message: 'You cannot delete users with administrative privileges.',
            });
        }
        const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        /**
         * Requests are usually deleted through a cascade constraint. Those however, do
         * not trigger the removal event so listeners to not run and the parent Media
         * will not be updated back to unknown for titles that were still pending. So
         * we manually remove all requests from the user here so the parent media's
         * properly reflect the change.
         */
        await requestRepository.remove(user.requests, {
            /**
             * Break-up into groups of 1000 requests to be removed at a time.
             * Necessary for users with >1000 requests, else an SQLite 'Expression tree is too large' error occurs.
             * https://typeorm.io/repository-api#additional-options
             */
            chunk: user.requests.length / 1000,
        });
        await userRepository.delete(user.id);
        return res.status(200).json(user.filter());
    }
    catch (e) {
        logger_1.default.error('Something went wrong deleting a user', {
            label: 'API',
            userId: req.params.id,
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Something went wrong deleting the user',
        });
    }
});
router.post('/import-from-plex', (0, auth_1.isAuthenticated)(permissions_1.Permission.MANAGE_USERS), async (req, res, next) => {
    try {
        const settings = (0, settings_1.getSettings)();
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const body = req.body;
        // taken from auth.ts
        const mainUser = await userRepository.findOneOrFail({
            select: { id: true, plexToken: true },
            where: { id: 1 },
        });
        const mainPlexTv = new plextv_1.default(mainUser.plexToken ?? '');
        const plexUsersResponse = await mainPlexTv.getUsers();
        const createdUsers = [];
        let refreshedUsers = 0;
        for (const rawUser of plexUsersResponse.MediaContainer.User) {
            const account = rawUser.$;
            if (account.email) {
                const user = await userRepository
                    .createQueryBuilder('user')
                    .where('user.plexId = :id', { id: account.id })
                    .orWhere('user.email = :email', {
                    email: account.email.toLowerCase(),
                })
                    .getOne();
                if (user) {
                    // Update the user's avatar with their Plex thumbnail, in case it changed
                    user.avatar = account.thumb;
                    user.email = account.email;
                    user.plexUsername = account.username;
                    // In case the user was previously a local account
                    if (user.userType === user_1.UserType.LOCAL) {
                        user.userType = user_1.UserType.PLEX;
                        user.plexId = parseInt(account.id);
                    }
                    await userRepository.save(user);
                    refreshedUsers += 1;
                }
                else if (!body || body.plexIds.includes(account.id)) {
                    if (await mainPlexTv.checkUserAccess(parseInt(account.id))) {
                        const newUser = new User_1.User({
                            plexUsername: account.username,
                            email: account.email,
                            permissions: settings.main.defaultPermissions,
                            plexId: parseInt(account.id),
                            plexToken: '',
                            avatar: account.thumb,
                            userType: user_1.UserType.PLEX,
                        });
                        await userRepository.save(newUser);
                        createdUsers.push(newUser);
                    }
                }
            }
        }
        return res.status(201).json({
            createdUsers: User_1.User.filterMany(createdUsers),
            refreshedUsers,
        });
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
router.post('/import-from-jellyfin', (0, auth_1.isAuthenticated)(permissions_1.Permission.MANAGE_USERS), async (req, res, next) => {
    try {
        const settings = (0, settings_1.getSettings)();
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const body = req.body;
        // taken from auth.ts
        const admin = await userRepository.findOneOrFail({
            where: { id: 1 },
            select: ['id', 'jellyfinDeviceId', 'jellyfinUserId'],
            order: { id: 'ASC' },
        });
        const hostname = (0, getHostname_1.getHostname)();
        const jellyfinClient = new jellyfin_1.default(hostname, settings.jellyfin.apiKey, admin.jellyfinDeviceId ?? '');
        jellyfinClient.setUserId(admin.jellyfinUserId ?? '');
        //const jellyfinUsersResponse = await jellyfinClient.getUsers();
        const createdUsers = [];
        jellyfinClient.setUserId(admin.jellyfinUserId ?? '');
        const jellyfinUsers = await jellyfinClient.getUsers();
        const jellyfinUsersById = new Map(jellyfinUsers.users.map((user) => [
            (0, jellyfin_2.normalizeJellyfinGuid)(user.Id),
            user,
        ]));
        for (const rawJellyfinUserId of body.jellyfinUserIds) {
            const jellyfinUserId = (0, jellyfin_2.normalizeJellyfinGuid)(rawJellyfinUserId);
            if (!jellyfinUserId) {
                continue;
            }
            const jellyfinUser = jellyfinUsersById.get(jellyfinUserId);
            const user = await userRepository.findOne({
                select: ['id', 'jellyfinUserId'],
                where: { jellyfinUserId: jellyfinUserId },
            });
            if (!user) {
                const newUser = new User_1.User({
                    jellyfinUsername: jellyfinUser?.Name,
                    jellyfinUserId: jellyfinUser?.Id,
                    jellyfinDeviceId: Buffer.from(`BOT_seerr_${jellyfinUser?.Name ?? ''}`).toString('base64'),
                    email: jellyfinUser?.Name,
                    permissions: settings.main.defaultPermissions,
                    avatar: `/avatarproxy/${jellyfinUser?.Id}`,
                    userType: settings.main.mediaServerType === server_1.MediaServerType.JELLYFIN
                        ? user_1.UserType.JELLYFIN
                        : user_1.UserType.EMBY,
                });
                await userRepository.save(newUser);
                createdUsers.push(newUser);
            }
        }
        return res.status(201).json(User_1.User.filterMany(createdUsers));
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
router.get('/:id/quota', async (req, res, next) => {
    try {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        if (Number(req.params.id) !== req.user?.id &&
            !req.user?.hasPermission([permissions_1.Permission.MANAGE_USERS, permissions_1.Permission.MANAGE_REQUESTS], { type: 'and' })) {
            return next({
                status: 403,
                message: "You do not have permission to view this user's request limits.",
            });
        }
        const user = await userRepository.findOneOrFail({
            where: { id: Number(req.params.id) },
        });
        const quotas = await user.getQuota();
        return res.status(200).json(quotas);
    }
    catch (e) {
        next({ status: 404, message: e.message });
    }
});
router.get('/:id/watch_data', (0, profileMiddleware_1.isOwnProfileOrAdmin)(), async (req, res, next) => {
    const settings = (0, settings_1.getSettings)().tautulli;
    if (!settings.hostname || !settings.port || !settings.apiKey) {
        return next({
            status: 404,
            message: 'Tautulli API not configured.',
        });
    }
    try {
        const user = await (0, datasource_1.getRepository)(User_1.User).findOneOrFail({
            where: { id: Number(req.params.id) },
            select: { id: true, plexId: true },
        });
        const tautulli = new tautulli_1.default(settings);
        const watchStats = await tautulli.getUserWatchStats(user);
        const watchHistory = await tautulli.getUserWatchHistory(user);
        const recentlyWatched = (0, lodash_1.sortBy)(await (0, datasource_1.getRepository)(Media_1.default).find({
            where: [
                {
                    mediaType: media_1.MediaType.MOVIE,
                    ratingKey: (0, typeorm_1.In)(watchHistory
                        .filter((record) => record.media_type === 'movie')
                        .map((record) => record.rating_key)),
                },
                {
                    mediaType: media_1.MediaType.MOVIE,
                    ratingKey4k: (0, typeorm_1.In)(watchHistory
                        .filter((record) => record.media_type === 'movie')
                        .map((record) => record.rating_key)),
                },
                {
                    mediaType: media_1.MediaType.TV,
                    ratingKey: (0, typeorm_1.In)(watchHistory
                        .filter((record) => record.media_type === 'episode')
                        .map((record) => record.grandparent_rating_key)),
                },
                {
                    mediaType: media_1.MediaType.TV,
                    ratingKey4k: (0, typeorm_1.In)(watchHistory
                        .filter((record) => record.media_type === 'episode')
                        .map((record) => record.grandparent_rating_key)),
                },
            ],
        }), [
            (media) => (0, lodash_1.findIndex)(watchHistory, (record) => (!!media.ratingKey &&
                parseInt(media.ratingKey) ===
                    (record.media_type === 'movie'
                        ? record.rating_key
                        : record.grandparent_rating_key)) ||
                (!!media.ratingKey4k &&
                    parseInt(media.ratingKey4k) ===
                        (record.media_type === 'movie'
                            ? record.rating_key
                            : record.grandparent_rating_key))),
        ]);
        return res.status(200).json({
            recentlyWatched,
            playCount: watchStats.total_plays,
        });
    }
    catch (e) {
        logger_1.default.error('Something went wrong fetching user watch data', {
            label: 'API',
            errorMessage: e.message,
            userId: req.params.id,
        });
        next({
            status: 500,
            message: 'Failed to fetch user watch data.',
        });
    }
});
router.get('/:id/watchlist', async (req, res, next) => {
    if (Number(req.params.id) !== req.user?.id &&
        !req.user?.hasPermission([permissions_1.Permission.MANAGE_REQUESTS, permissions_1.Permission.WATCHLIST_VIEW], {
            type: 'or',
        })) {
        return next({
            status: 403,
            message: "You do not have permission to view this user's Watchlist.",
        });
    }
    const itemsPerPage = 20;
    const page = req.query.page ? Number(req.query.page) : 1;
    const offset = (page - 1) * itemsPerPage;
    const user = await (0, datasource_1.getRepository)(User_1.User).findOneOrFail({
        where: { id: Number(req.params.id) },
        select: ['id', 'plexToken'],
    });
    if (user) {
        const [result, total] = await (0, datasource_1.getRepository)(Watchlist_1.Watchlist).findAndCount({
            where: { requestedBy: { id: user?.id } },
            relations: {
            /*requestedBy: true,media:true*/
            },
            // loadRelationIds: true,
            take: itemsPerPage,
            skip: offset,
        });
        if (total) {
            return res.json({
                page: page,
                totalPages: Math.ceil(total / itemsPerPage),
                totalResults: total,
                results: result,
            });
        }
    }
    // We will just return an empty array if the user has no Plex token
    if (!user.plexToken) {
        return res.json({
            page: 1,
            totalPages: 1,
            totalResults: 0,
            results: [],
        });
    }
    const plexTV = new plextv_1.default(user.plexToken);
    const watchlist = await plexTV.getWatchlist({ offset });
    return res.json({
        page,
        totalPages: Math.ceil(watchlist.totalSize / itemsPerPage),
        totalResults: watchlist.totalSize,
        results: watchlist.items.map((item) => ({
            id: item.tmdbId,
            ratingKey: item.ratingKey,
            title: item.title,
            mediaType: item.type === 'show' ? 'tv' : 'movie',
            tmdbId: item.tmdbId,
        })),
    });
});
exports.default = router;

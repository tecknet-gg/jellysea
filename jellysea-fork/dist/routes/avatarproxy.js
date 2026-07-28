"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAvatarChanged = void 0;
const server_1 = require("../constants/server");
const datasource_1 = require("../datasource");
const User_1 = require("../entity/User");
const imageproxy_1 = __importDefault(require("../lib/imageproxy"));
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const appVersion_1 = require("../utils/appVersion");
const getHostname_1 = require("../utils/getHostname");
const axios_1 = __importDefault(require("axios"));
const express_1 = require("express");
const gravatar_url_1 = __importDefault(require("gravatar-url"));
const node_crypto_1 = require("node:crypto");
const router = (0, express_1.Router)();
let _avatarImageProxy = null;
async function initAvatarImageProxy() {
    if (!_avatarImageProxy) {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const admin = await userRepository.findOne({
            where: { id: 1 },
            select: ['id', 'jellyfinUserId', 'jellyfinDeviceId'],
            order: { id: 'ASC' },
        });
        const deviceId = admin?.jellyfinDeviceId || 'BOT_seerr';
        const authToken = (0, settings_1.getSettings)().jellyfin.apiKey;
        _avatarImageProxy = new imageproxy_1.default('avatar', '', {
            headers: {
                'X-Emby-Authorization': `MediaBrowser Client="Seerr", Device="Seerr", DeviceId="${deviceId}", Version="${(0, settings_1.getSettings)().main.mediaServerType === server_1.MediaServerType.EMBY
                    ? '1.0.0'
                    : (0, appVersion_1.getAppVersion)()}", Token="${authToken}"`,
            },
        });
    }
    return _avatarImageProxy;
}
function getJellyfinAvatarUrl(userId) {
    const settings = (0, settings_1.getSettings)();
    return settings.main.mediaServerType === server_1.MediaServerType.JELLYFIN
        ? `${(0, getHostname_1.getHostname)()}/UserImage?UserId=${userId}`
        : `${(0, getHostname_1.getHostname)()}/Users/${userId}/Images/Primary?quality=90`;
}
function computeImageHash(buffer) {
    return (0, node_crypto_1.createHash)('sha256').update(buffer).digest('hex');
}
async function checkAvatarChanged(user) {
    try {
        if (!user || !user.jellyfinUserId) {
            return { changed: false };
        }
        const jellyfinAvatarUrl = getJellyfinAvatarUrl(user.jellyfinUserId);
        let headResponse;
        try {
            headResponse = await axios_1.default.head(jellyfinAvatarUrl);
            if (headResponse.status !== 200) {
                return { changed: false };
            }
        }
        catch {
            return { changed: false };
        }
        const settings = (0, settings_1.getSettings)();
        let remoteVersion;
        if (settings.main.mediaServerType === server_1.MediaServerType.JELLYFIN) {
            const remoteLastModifiedStr = headResponse.headers['last-modified'] || '';
            remoteVersion = (Date.parse(remoteLastModifiedStr) || Date.now()).toString();
        }
        else if (settings.main.mediaServerType === server_1.MediaServerType.EMBY) {
            remoteVersion =
                headResponse.headers['etag']?.replace(/"/g, '') ||
                    Date.now().toString();
        }
        else {
            remoteVersion = Date.now().toString();
        }
        if (user.avatarVersion && user.avatarVersion === remoteVersion) {
            return { changed: false, etag: user.avatarETag ?? undefined };
        }
        const avatarImageCache = await initAvatarImageProxy();
        await avatarImageCache.clearCachedImage(jellyfinAvatarUrl);
        const imageData = await avatarImageCache.getImage(jellyfinAvatarUrl, (0, gravatar_url_1.default)(user.email || 'none', { default: 'mm', size: 200 }));
        const newHash = computeImageHash(imageData.imageBuffer);
        const hasChanged = user.avatarETag !== newHash;
        user.avatarVersion = remoteVersion;
        if (hasChanged) {
            user.avatarETag = newHash;
        }
        await (0, datasource_1.getRepository)(User_1.User).save(user);
        return { changed: hasChanged, etag: newHash };
    }
    catch (error) {
        logger_1.default.error('Error checking avatar changes', {
            errorMessage: error.message,
        });
        return { changed: false };
    }
}
exports.checkAvatarChanged = checkAvatarChanged;
router.get('/:jellyfinUserId', async (req, res) => {
    try {
        if (!req.params.jellyfinUserId.match(/^[a-f0-9]{32}$/)) {
            const mediaServerType = (0, settings_1.getSettings)().main.mediaServerType;
            throw new Error(`Provided URL is not ${mediaServerType === server_1.MediaServerType.JELLYFIN
                ? 'a Jellyfin'
                : 'an Emby'} avatar.`);
        }
        const avatarImageCache = await initAvatarImageProxy();
        const userEtag = req.headers['if-none-match'];
        const versionParam = req.query.v;
        const user = await (0, datasource_1.getRepository)(User_1.User).findOne({
            where: { jellyfinUserId: req.params.jellyfinUserId },
        });
        const fallbackUrl = (0, gravatar_url_1.default)(user?.email || 'none', {
            default: 'mm',
            size: 200,
        });
        const jellyfinAvatarUrl = getJellyfinAvatarUrl(req.params.jellyfinUserId);
        let imageData;
        if (user?.avatarVersion) {
            imageData = await avatarImageCache.getImage(jellyfinAvatarUrl, fallbackUrl);
            if (imageData.meta.extension === 'json') {
                imageData = await avatarImageCache.getImage(fallbackUrl);
            }
        }
        else {
            imageData = await avatarImageCache.getImage(fallbackUrl);
        }
        if (userEtag && userEtag === `"${imageData.meta.etag}"` && !versionParam) {
            return res.status(304).end();
        }
        res.writeHead(200, {
            'Content-Type': `image/${imageData.meta.extension}`,
            'Content-Length': imageData.imageBuffer.length,
            'Cache-Control': `public, max-age=${imageData.meta.curRevalidate}`,
            ETag: `"${imageData.meta.etag}"`,
            'OS-Cache-Key': imageData.meta.cacheKey,
            'OS-Cache-Status': imageData.meta.cacheMiss ? 'MISS' : 'HIT',
        });
        res.end(imageData.imageBuffer);
    }
    catch (e) {
        logger_1.default.error('Failed to proxy avatar image', {
            errorMessage: e.message,
        });
    }
});
exports.default = router;

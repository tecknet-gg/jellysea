"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const media_1 = require("../constants/media");
const Media_1 = __importDefault(require("../entity/Media"));
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const playRoutes = (0, express_1.Router)();
playRoutes.get('/:tmdbId/play', async (req, res, next) => {
    const tmdbId = Number(req.params.tmdbId);
    const is4k = req.query.is4k === 'true';
    const mediaType = req.query.mediaType === 'tv' ? media_1.MediaType.TV : media_1.MediaType.MOVIE;
    const media = await Media_1.default.getMedia(tmdbId, mediaType);
    if (!media) {
        return next({ status: 404, message: 'Media not found' });
    }
    const jellyfinMediaId = is4k ? media.jellyfinMediaId4k : media.jellyfinMediaId;
    if (!jellyfinMediaId) {
        return next({ status: 404, message: 'Jellyfin media ID not found' });
    }
    const settings = (0, settings_1.getSettings)();
    const { ip, port, useSsl, apiKey, urlBase } = settings.jellyfin;
    const protocol = useSsl ? 'https' : 'http';
    const host = `${protocol}://${ip}:${port}${urlBase || ''}`;
    try {
        const playbackResponse = await axios_1.default.post(`${host}/Items/${jellyfinMediaId}/PlaybackInfo`, { MaxStreamingBitrate: 140000000 }, {
            headers: {
                'X-Emby-Token': apiKey,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        const mediaSources = playbackResponse.data.MediaSources ?? [];
        const sourceId = mediaSources[0]?.Id ?? jellyfinMediaId;
        const directUrl = `${host}/videos/${jellyfinMediaId}/master.m3u8` +
            `?api_key=${apiKey}` +
            `&MediaSourceId=${sourceId}` +
            `&VideoCodec=h264` +
            `&AudioCodec=aac` +
            `&AudioStreamIndex=0` +
            `&SubtitleStreamIndex=-1` +
            `&SegmentContainer=mp4` +
            `&BreakOnNonKeyFrames=True`;
        const streamUrl = `/proxy?url=${encodeURIComponent(directUrl)}`;
        return res.status(200).json({
            streamUrl,
            itemId: jellyfinMediaId,
            mediaSource: mediaSources[0] ?? null,
        });
    }
    catch (e) {
        logger_1.default.warn(`Failed to get PlaybackInfo from Jellyfin for item ${jellyfinMediaId}, falling back to direct URL`, { label: 'Play Route', error: e.response?.status ?? e.message });
        const directUrl = `${host}/videos/${jellyfinMediaId}/master.m3u8` +
            `?api_key=${apiKey}` +
            `&MediaSourceId=${jellyfinMediaId}` +
            `&VideoCodec=h264` +
            `&AudioCodec=aac` +
            `&SegmentContainer=mp4` +
            `&BreakOnNonKeyFrames=True`;
        const streamUrl = `/proxy?url=${encodeURIComponent(directUrl)}`;
        return res.status(200).json({
            streamUrl,
            itemId: jellyfinMediaId,
            mediaSource: null,
        });
    }
});
exports.default = playRoutes;

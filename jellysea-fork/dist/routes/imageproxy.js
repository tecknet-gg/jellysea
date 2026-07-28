"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const imageproxy_1 = __importDefault(require("../lib/imageproxy"));
const logger_1 = __importDefault(require("../logger"));
const express_1 = require("express");
const router = (0, express_1.Router)();
// Delay the initialization of ImageProxy instances until the proxy (if any) is properly configured
let _tmdbImageProxy;
function initTmdbImageProxy() {
    if (!_tmdbImageProxy) {
        _tmdbImageProxy = new imageproxy_1.default('tmdb', 'https://image.tmdb.org', {
            rateLimitOptions: {
                maxRequests: 20,
                maxRPS: 50,
            },
        });
    }
    return _tmdbImageProxy;
}
let _tvdbImageProxy;
function initTvdbImageProxy() {
    if (!_tvdbImageProxy) {
        _tvdbImageProxy = new imageproxy_1.default('tvdb', 'https://artworks.thetvdb.com', {
            rateLimitOptions: {
                maxRequests: 20,
                maxRPS: 50,
            },
        });
    }
    return _tvdbImageProxy;
}
router.get('/:type/*path', async (req, res) => {
    const imagePath = '/' + req.params.path.join('/');
    if (imagePath.startsWith('//') || imagePath.includes('://')) {
        logger_1.default.error('Invalid URL for image proxy', { imagePath });
        return res.status(403).send('Invalid URL for image proxy');
    }
    try {
        let imageData;
        if (req.params.type === 'tmdb') {
            imageData = await initTmdbImageProxy().getImage(imagePath);
        }
        else if (req.params.type === 'tvdb') {
            imageData = await initTvdbImageProxy().getImage(imagePath);
        }
        else {
            logger_1.default.error('Unsupported image type', {
                imagePath,
                type: req.params.type,
            });
            res.status(400).send('Unsupported image type');
            return;
        }
        res.writeHead(200, {
            'Content-Type': `image/${imageData.meta.extension}`,
            'Content-Length': imageData.imageBuffer.length,
            'Cache-Control': `public, max-age=${imageData.meta.curRevalidate}`,
            'OS-Cache-Key': imageData.meta.cacheKey,
            'OS-Cache-Status': imageData.meta.cacheMiss ? 'MISS' : 'HIT',
        });
        res.end(imageData.imageBuffer);
    }
    catch (e) {
        logger_1.default.error('Failed to proxy image', {
            imagePath,
            errorMessage: e.message,
        });
        res.status(500).send();
    }
});
exports.default = router;

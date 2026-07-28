"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../logger"));
const proxyRoutes = (0, express_1.Router)();
proxyRoutes.get('/', async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: 'Missing url parameter' });
    }
    try {
        const response = await axios_1.default.get(url, {
            responseType: 'stream',
            timeout: 30000,
        });
        const contentType = response.headers['content-type'] ?? '';
        const contentLength = response.headers['content-length'];
        if (contentLength) {
            res.setHeader('content-length', contentLength);
        }
        const isM3u8 = contentType.includes('m3u8') ||
            contentType.includes('mpegurl') ||
            url.includes('.m3u8');
        if (isM3u8) {
            res.setHeader('content-type', 'application/x-mpegURL');
            let data = '';
            response.data.on('data', (chunk) => {
                data += chunk.toString();
            });
            response.data.on('end', () => {
                const baseUrl = new URL(url);
                const baseOriginPath = baseUrl.origin + baseUrl.pathname;
                const proxyUrl = (inputUrl) => {
                    const absolute = new URL(inputUrl, baseOriginPath).toString();
                    return `/proxy?url=${encodeURIComponent(absolute)}`;
                };
                const lines = data.split('\n');
                const rewritten = lines.map((line) => {
                    const trimmed = line.trim();
                    if (trimmed === '' || trimmed.startsWith('#')) {
                        return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
                            return `URI="${proxyUrl(uri)}"`;
                        });
                    }
                    return proxyUrl(trimmed);
                });
                res.send(rewritten.join('\n'));
            });
            response.data.on('error', (err) => {
                logger_1.default.error('Proxy stream error while reading M3U8', {
                    label: 'Proxy',
                    errorMessage: err.message,
                });
                if (!res.headersSent) {
                    res.status(502).json({ message: 'Failed to read upstream stream' });
                }
            });
        }
        else {
            res.setHeader('content-type', contentType);
            response.data.pipe(res);
            response.data.on('error', (err) => {
                logger_1.default.error('Proxy stream error while piping segment', {
                    label: 'Proxy',
                    errorMessage: err.message,
                });
                if (!res.headersSent) {
                    res.status(502).json({ message: 'Upstream stream error' });
                }
            });
        }
    }
    catch (e) {
        const axiosErr = e;
        logger_1.default.warn('Proxy request failed', {
            label: 'Proxy',
            url: url.substring(0, 100),
            error: axiosErr.response?.status ?? axiosErr.message,
        });
        if (!res.headersSent) {
            res.status(502).json({ message: 'Failed to proxy request' });
        }
    }
});
exports.default = proxyRoutes;

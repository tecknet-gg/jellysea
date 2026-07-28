"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const themoviedb_1 = __importDefault(require("../../api/themoviedb"));
const tvdb_1 = __importDefault(require("../../api/tvdb"));
const settings_1 = require("../../lib/settings");
const logger_1 = __importDefault(require("../../logger"));
const express_1 = require("express");
function getTestResultString(testValue) {
    if (testValue === -1)
        return 'not tested';
    if (testValue === 0)
        return 'failed';
    return 'ok';
}
const metadataRoutes = (0, express_1.Router)();
metadataRoutes.get('/', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json({
        tv: settings.metadataSettings.tv,
        anime: settings.metadataSettings.anime,
    });
});
metadataRoutes.put('/', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    const body = req.body;
    let tvdbTest = -1;
    let tmdbTest = -1;
    try {
        if (body.tv === settings_1.MetadataProviderType.TVDB ||
            body.anime === settings_1.MetadataProviderType.TVDB) {
            tvdbTest = 0;
            const tvdb = await tvdb_1.default.getInstance();
            await tvdb.test();
            tvdbTest = 1;
        }
    }
    catch (e) {
        logger_1.default.error('Failed to test metadata provider', {
            label: 'Metadata',
            message: e.message,
        });
    }
    try {
        if (body.tv === settings_1.MetadataProviderType.TMDB ||
            body.anime === settings_1.MetadataProviderType.TMDB) {
            tmdbTest = 0;
            const tmdb = new themoviedb_1.default();
            await tmdb.getTvShow({ tvId: 1054 });
            tmdbTest = 1;
        }
    }
    catch (e) {
        logger_1.default.error('Failed to test metadata provider', {
            label: 'MetadataProvider',
            message: e.message,
        });
    }
    // If a test failed, return the test results
    if (tvdbTest === 0 || tmdbTest === 0) {
        return res.status(500).json({
            success: false,
            tests: {
                tvdb: getTestResultString(tvdbTest),
                tmdb: getTestResultString(tmdbTest),
            },
        });
    }
    settings.metadataSettings = {
        tv: body.tv,
        anime: body.anime,
    };
    await settings.save();
    res.status(200).json({
        success: true,
        tv: body.tv,
        anime: body.anime,
        tests: {
            tvdb: getTestResultString(tvdbTest),
            tmdb: getTestResultString(tmdbTest),
        },
    });
});
metadataRoutes.post('/test', async (req, res) => {
    let tvdbTest = -1;
    let tmdbTest = -1;
    try {
        const body = req.body;
        try {
            if (body.tmdb) {
                tmdbTest = 0;
                const tmdb = new themoviedb_1.default();
                await tmdb.getTvShow({ tvId: 1054 });
                tmdbTest = 1;
            }
        }
        catch (e) {
            logger_1.default.error('Failed to test metadata provider', {
                label: 'MetadataProvider',
                message: e.message,
            });
        }
        try {
            if (body.tvdb) {
                tvdbTest = 0;
                const tvdb = await tvdb_1.default.getInstance();
                await tvdb.test();
                tvdbTest = 1;
            }
        }
        catch (e) {
            logger_1.default.error('Failed to test metadata provider', {
                label: 'MetadataProvider',
                message: e.message,
            });
        }
        const success = !(tvdbTest === 0 || tmdbTest === 0);
        const statusCode = success ? 200 : 500;
        return res.status(statusCode).json({
            success: success,
            tests: {
                tmdb: getTestResultString(tmdbTest),
                tvdb: getTestResultString(tvdbTest),
            },
        });
    }
    catch (e) {
        return res.status(500).json({
            success: false,
            tests: {
                tmdb: getTestResultString(tmdbTest),
                tvdb: getTestResultString(tvdbTest),
            },
            error: e.message,
        });
    }
});
exports.default = metadataRoutes;

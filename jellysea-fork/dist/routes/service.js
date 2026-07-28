"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const radarr_1 = __importDefault(require("../api/servarr/radarr"));
const sonarr_1 = __importDefault(require("../api/servarr/sonarr"));
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const express_1 = require("express");
const serviceRoutes = (0, express_1.Router)();
serviceRoutes.get('/radarr', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    const filteredRadarrServers = settings.radarr.map((radarr) => ({
        id: radarr.id,
        name: radarr.name,
        is4k: radarr.is4k,
        isDefault: radarr.isDefault,
        activeDirectory: radarr.activeDirectory,
        activeProfileId: radarr.activeProfileId,
        activeTags: radarr.tags ?? [],
    }));
    return res.status(200).json(filteredRadarrServers);
});
serviceRoutes.get('/radarr/:radarrId', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    const radarrSettings = settings.radarr.find((radarr) => radarr.id === Number(req.params.radarrId));
    if (!radarrSettings) {
        return next({
            status: 404,
            message: 'Radarr server with provided ID  does not exist.',
        });
    }
    const radarr = new radarr_1.default({
        apiKey: radarrSettings.apiKey,
        url: radarr_1.default.buildUrl(radarrSettings, '/api/v3'),
    });
    const profiles = await radarr.getProfiles();
    const rootFolders = await radarr.getRootFolders();
    const tags = await radarr.getTags();
    return res.status(200).json({
        server: {
            id: radarrSettings.id,
            name: radarrSettings.name,
            is4k: radarrSettings.is4k,
            isDefault: radarrSettings.isDefault,
            activeDirectory: radarrSettings.activeDirectory,
            activeProfileId: radarrSettings.activeProfileId,
            activeTags: radarrSettings.tags,
        },
        profiles: profiles.map((profile) => ({
            id: profile.id,
            name: profile.name,
        })),
        rootFolders: rootFolders.map((folder) => ({
            id: folder.id,
            freeSpace: folder.freeSpace,
            path: folder.path,
            totalSpace: folder.totalSpace,
        })),
        tags,
    });
});
serviceRoutes.get('/sonarr', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    const filteredSonarrServers = settings.sonarr.map((sonarr) => ({
        id: sonarr.id,
        name: sonarr.name,
        is4k: sonarr.is4k,
        isDefault: sonarr.isDefault,
        activeDirectory: sonarr.activeDirectory,
        activeProfileId: sonarr.activeProfileId,
        activeAnimeProfileId: sonarr.activeAnimeProfileId,
        activeAnimeDirectory: sonarr.activeAnimeDirectory,
        activeLanguageProfileId: sonarr.activeLanguageProfileId,
        activeAnimeLanguageProfileId: sonarr.activeAnimeLanguageProfileId,
        activeTags: [],
    }));
    return res.status(200).json(filteredSonarrServers);
});
serviceRoutes.get('/sonarr/:sonarrId', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    const sonarrSettings = settings.sonarr.find((sonarr) => sonarr.id === Number(req.params.sonarrId));
    if (!sonarrSettings) {
        return next({
            status: 404,
            message: 'Sonarr server with provided ID does not exist.',
        });
    }
    const sonarr = new sonarr_1.default({
        apiKey: sonarrSettings.apiKey,
        url: sonarr_1.default.buildUrl(sonarrSettings, '/api/v3'),
    });
    try {
        const systemStatus = await sonarr.getSystemStatus();
        const sonarrMajorVersion = Number(systemStatus.version.split('.')[0]);
        const profiles = await sonarr.getProfiles();
        const rootFolders = await sonarr.getRootFolders();
        const languageProfiles = sonarrMajorVersion <= 3 ? await sonarr.getLanguageProfiles() : null;
        const tags = await sonarr.getTags();
        return res.status(200).json({
            server: {
                id: sonarrSettings.id,
                name: sonarrSettings.name,
                is4k: sonarrSettings.is4k,
                isDefault: sonarrSettings.isDefault,
                activeDirectory: sonarrSettings.activeDirectory,
                activeProfileId: sonarrSettings.activeProfileId,
                activeAnimeProfileId: sonarrSettings.activeAnimeProfileId,
                activeAnimeDirectory: sonarrSettings.activeAnimeDirectory,
                activeLanguageProfileId: sonarrSettings.activeLanguageProfileId,
                activeAnimeLanguageProfileId: sonarrSettings.activeAnimeLanguageProfileId,
                activeTags: sonarrSettings.tags,
                activeAnimeTags: sonarrSettings.animeTags,
            },
            profiles: profiles.map((profile) => ({
                id: profile.id,
                name: profile.name,
            })),
            rootFolders: rootFolders.map((folder) => ({
                id: folder.id,
                freeSpace: folder.freeSpace,
                path: folder.path,
                totalSpace: folder.totalSpace,
            })),
            languageProfiles: languageProfiles,
            tags,
        });
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
serviceRoutes.get('/sonarr/lookup/:tmdbId', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    const tmdb = new themoviedb_1.default();
    const sonarrSettings = settings.sonarr[0];
    if (!sonarrSettings) {
        logger_1.default.error('No sonarr server has been setup', {
            label: 'Media Request',
        });
        return next({
            status: 404,
            message: 'No sonarr server has been setup',
        });
    }
    const sonarr = new sonarr_1.default({
        apiKey: sonarrSettings.apiKey,
        url: sonarr_1.default.buildUrl(sonarrSettings, '/api/v3'),
    });
    try {
        const tv = await tmdb.getTvShow({
            tvId: Number(req.params.tmdbId),
            language: 'en',
        });
        const response = await sonarr.getSeriesByTitle(tv.name);
        return res.status(200).json(response);
    }
    catch (e) {
        logger_1.default.error('Failed to fetch tvdb search results', {
            label: 'Media Request',
            message: e.message,
        });
        return next({
            status: 500,
            message: 'Something went wrong trying to fetch series information',
        });
    }
});
exports.default = serviceRoutes;

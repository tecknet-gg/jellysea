"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const radarr_1 = __importDefault(require("../../api/servarr/radarr"));
const settings_1 = require("../../lib/settings");
const logger_1 = __importDefault(require("../../logger"));
const express_1 = require("express");
const radarrRoutes = (0, express_1.Router)();
radarrRoutes.get('/', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.radarr);
});
radarrRoutes.post('/', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    const newRadarr = req.body;
    const lastItem = settings.radarr[settings.radarr.length - 1];
    newRadarr.id = lastItem ? lastItem.id + 1 : 0;
    // If we are setting this as the default, clear any previous defaults for the same type first
    // ex: if is4k is true, it will only remove defaults for other servers that have is4k set to true
    // and are the default
    if (req.body.isDefault) {
        settings.radarr
            .filter((radarrInstance) => radarrInstance.is4k === req.body.is4k)
            .forEach((radarrInstance) => {
            radarrInstance.isDefault = false;
        });
    }
    settings.radarr = [...settings.radarr, newRadarr];
    await settings.save();
    return res.status(201).json(newRadarr);
});
radarrRoutes.post('/test', async (req, res, next) => {
    try {
        const radarr = new radarr_1.default({
            apiKey: req.body.apiKey,
            url: radarr_1.default.buildUrl(req.body, '/api/v3'),
        });
        const urlBase = await radarr
            .getSystemStatus()
            .then((value) => value.urlBase)
            .catch(() => req.body.baseUrl);
        const profiles = await radarr.getProfiles();
        const folders = await radarr.getRootFolders();
        const tags = await radarr.getTags();
        return res.status(200).json({
            profiles,
            rootFolders: folders.map((folder) => ({
                id: folder.id,
                path: folder.path,
            })),
            tags,
            urlBase,
        });
    }
    catch (e) {
        logger_1.default.error('Failed to test Radarr', {
            label: 'Radarr',
            message: e.message,
        });
        next({ status: 500, message: 'Failed to connect to Radarr' });
    }
});
radarrRoutes.put('/:id', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    const radarrIndex = settings.radarr.findIndex((r) => r.id === Number(req.params.id));
    if (radarrIndex === -1) {
        return next({ status: '404', message: 'Settings instance not found' });
    }
    // If we are setting this as the default, clear any previous defaults for the same type first
    // ex: if is4k is true, it will only remove defaults for other servers that have is4k set to true
    // and are the default
    if (req.body.isDefault) {
        settings.radarr
            .filter((radarrInstance) => radarrInstance.is4k === req.body.is4k)
            .forEach((radarrInstance) => {
            radarrInstance.isDefault = false;
        });
    }
    settings.radarr[radarrIndex] = {
        ...req.body,
        id: Number(req.params.id),
    };
    await settings.save();
    return res.status(200).json(settings.radarr[radarrIndex]);
});
radarrRoutes.get('/:id/profiles', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    const radarrSettings = settings.radarr.find((r) => r.id === Number(req.params.id));
    if (!radarrSettings) {
        return next({ status: '404', message: 'Settings instance not found' });
    }
    const radarr = new radarr_1.default({
        apiKey: radarrSettings.apiKey,
        url: radarr_1.default.buildUrl(radarrSettings, '/api/v3'),
    });
    const profiles = await radarr.getProfiles();
    return res.status(200).json(profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
    })));
});
radarrRoutes.delete('/:id', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    const radarrIndex = settings.radarr.findIndex((r) => r.id === Number(req.params.id));
    if (radarrIndex === -1) {
        return next({ status: '404', message: 'Settings instance not found' });
    }
    const removed = settings.radarr.splice(radarrIndex, 1);
    await settings.save();
    return res.status(200).json(removed[0]);
});
exports.default = radarrRoutes;

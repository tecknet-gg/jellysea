"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const radarr_1 = __importDefault(require("../../../api/servarr/radarr"));
const sonarr_1 = __importDefault(require("../../../api/servarr/sonarr"));
const datasource_1 = require("../../../datasource");
const User_1 = require("../../../entity/User");
const migrationArrTags = async (settings) => {
    if (Array.isArray(settings.migrations) &&
        settings.migrations.includes('0007_migrate_arr_tags')) {
        return settings;
    }
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const users = await userRepository.find();
    let errorOccurred = false;
    for (const radarrSettings of settings.radarr || []) {
        if (!radarrSettings.tagRequests) {
            continue;
        }
        try {
            const radarr = new radarr_1.default({
                apiKey: radarrSettings.apiKey,
                url: radarr_1.default.buildUrl(radarrSettings, '/api/v3'),
            });
            const radarrTags = await radarr.getTags();
            for (const user of users) {
                const userTag = radarrTags.find((v) => v.label.startsWith(user.id + ' - ') ||
                    v.label.startsWith(user.id + '-'));
                if (!userTag) {
                    continue;
                }
                await radarr.renameTag({
                    id: userTag.id,
                    label: user.id +
                        '-' +
                        user.displayName
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/\s+/g, '-')
                            .replace(/[^a-z0-9-]/gi, '')
                            .replace(/-+/g, '-')
                            .replace(/^-|-$/g, ''),
                });
            }
        }
        catch (error) {
            console.error(`Unable to rename Radarr tags to the new format. Please check your Radarr connection settings for the instance "${radarrSettings.name}".`, error.message);
            errorOccurred = true;
        }
    }
    for (const sonarrSettings of settings.sonarr || []) {
        if (!sonarrSettings.tagRequests) {
            continue;
        }
        try {
            const sonarr = new sonarr_1.default({
                apiKey: sonarrSettings.apiKey,
                url: sonarr_1.default.buildUrl(sonarrSettings, '/api/v3'),
            });
            const sonarrTags = await sonarr.getTags();
            for (const user of users) {
                const userTag = sonarrTags.find((v) => v.label.startsWith(user.id + ' - ') ||
                    v.label.startsWith(user.id + '-'));
                if (!userTag) {
                    continue;
                }
                await sonarr.renameTag({
                    id: userTag.id,
                    label: user.id +
                        '-' +
                        user.displayName
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/\s+/g, '-')
                            .replace(/[^a-z0-9-]/gi, '')
                            .replace(/-+/g, '-')
                            .replace(/^-|-$/g, ''),
                });
            }
        }
        catch (error) {
            console.error(`Unable to rename Sonarr tags to the new format. Please check your Sonarr connection settings for the instance "${sonarrSettings.name}".`, error.message);
            errorOccurred = true;
        }
    }
    if (!errorOccurred) {
        if (!Array.isArray(settings.migrations)) {
            settings.migrations = [];
        }
        settings.migrations.push('0007_migrate_arr_tags');
    }
    return settings;
};
exports.default = migrationArrTags;

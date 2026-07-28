"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const externalapi_1 = __importDefault(require("../api/externalapi"));
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
class PlexAPI extends externalapi_1.default {
    constructor({ plexToken, plexSettings, timeout, }) {
        const settings = (0, settings_1.getSettings)();
        const settingsPlex = plexSettings ?? settings.plex;
        const protocol = settingsPlex.useSsl ? 'https' : 'http';
        const baseUrl = `${protocol}://${settingsPlex.ip}:${settingsPlex.port}`;
        super(baseUrl, {}, {
            timeout,
            headers: {
                'X-Plex-Token': plexToken ?? '',
                'X-Plex-Client-Identifier': settings.clientId,
                'X-Plex-Product': 'Seerr',
                'X-Plex-Device-Name': 'Seerr',
                'X-Plex-Platform': 'Seerr',
            },
        });
    }
    async getStatus() {
        return await this.get('/');
    }
    async getLibraries() {
        const response = await this.get('/library/sections');
        return response.MediaContainer.Directory;
    }
    async syncLibraries() {
        const settings = (0, settings_1.getSettings)();
        try {
            const libraries = await this.getLibraries();
            const newLibraries = libraries
                // Remove libraries that are not movie or show
                .filter((library) => library.type === 'movie' || library.type === 'show')
                // Remove libraries that do not have a metadata agent set (usually personal video libraries)
                .filter((library) => library.agent !== 'com.plexapp.agents.none')
                .map((library) => {
                const existing = settings.plex.libraries.find((l) => l.id === library.key && l.name === library.title);
                return {
                    id: library.key,
                    name: library.title,
                    enabled: existing?.enabled ?? false,
                    type: library.type,
                    lastScan: existing?.lastScan,
                };
            });
            settings.plex.libraries = newLibraries;
        }
        catch (e) {
            logger_1.default.error('Failed to fetch Plex libraries', {
                label: 'Plex API',
                message: e.message,
            });
            settings.plex.libraries = [];
        }
        await settings.save();
    }
    async getLibraryContents(id, { offset = 0, size = 50 } = {}) {
        const response = await this.get(`/library/sections/${id}/all?includeGuids=1`, {
            headers: {
                'X-Plex-Container-Start': `${offset}`,
                'X-Plex-Container-Size': `${size}`,
            },
        });
        return {
            totalSize: response.MediaContainer.totalSize,
            items: response.MediaContainer.Metadata ?? [],
        };
    }
    async getMetadata(key, options = {}) {
        const response = await this.get(`/library/metadata/${key}${options.includeChildren ? '?includeChildren=1' : ''}`);
        return response.MediaContainer.Metadata[0];
    }
    async getChildrenMetadata(key) {
        const response = await this.get(`/library/metadata/${key}/children`);
        return response.MediaContainer.Metadata;
    }
    async getRecentlyAdded(id, options = {
        addedAt: Date.now() - 1000 * 60 * 60,
    }, mediaType) {
        const response = await this.get(`/library/sections/${id}/all?type=${mediaType === 'show' ? '4' : '1'}&sort=addedAt%3Adesc&addedAt>>=${Math.floor(options.addedAt / 1000)}`, {
            headers: {
                'X-Plex-Container-Start': '0',
                'X-Plex-Container-Size': '500',
            },
        });
        return response.MediaContainer.Metadata;
    }
}
exports.default = PlexAPI;

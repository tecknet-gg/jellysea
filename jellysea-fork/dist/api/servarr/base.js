"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const externalapi_1 = __importDefault(require("../../api/externalapi"));
const cache_1 = __importDefault(require("../../lib/cache"));
const settings_1 = require("../../lib/settings");
class ServarrBase extends externalapi_1.default {
    static buildUrl(settings, path) {
        return `${settings.useSsl ? 'https' : 'http'}://${settings.hostname}:${settings.port}${settings.baseUrl ?? ''}${path}`;
    }
    constructor({ url, apiKey, cacheName, apiName, }) {
        const timeout = (0, settings_1.getSettings)().network.apiRequestTimeout;
        super(url, {
            apikey: apiKey,
        }, {
            nodeCache: cache_1.default.getCache(cacheName).data,
            timeout,
        });
        this.getSystemStatus = async () => {
            try {
                const response = await this.axios.get('/system/status');
                return response.data;
            }
            catch (e) {
                throw new Error(`[${this.apiName}] Failed to retrieve system status: ${e.message}`, { cause: e });
            }
        };
        this.getProfiles = async () => {
            try {
                const data = await this.getRolling(`/qualityProfile`, undefined, 3600);
                return data;
            }
            catch (e) {
                throw new Error(`[${this.apiName}] Failed to retrieve profiles: ${e.message}`, { cause: e });
            }
        };
        this.getRootFolders = async () => {
            try {
                const data = await this.getRolling(`/rootfolder`, undefined, 3600);
                return data;
            }
            catch (e) {
                throw new Error(`[${this.apiName}] Failed to retrieve root folders: ${e.message}`, { cause: e });
            }
        };
        this.getQueue = async () => {
            try {
                const response = await this.axios.get(`/queue`, {
                    params: {
                        includeEpisode: true,
                    },
                });
                return response.data.records;
            }
            catch (e) {
                throw new Error(`[${this.apiName}] Failed to retrieve queue: ${e.message}`, { cause: e });
            }
        };
        this.getTags = async () => {
            try {
                const response = await this.axios.get(`/tag`);
                return response.data;
            }
            catch (e) {
                throw new Error(`[${this.apiName}] Failed to retrieve tags: ${e.message}`, { cause: e });
            }
        };
        this.createTag = async ({ label }) => {
            try {
                const response = await this.axios.post(`/tag`, {
                    label,
                });
                return response.data;
            }
            catch (e) {
                throw new Error(`[${this.apiName}] Failed to create tag: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.renameTag = async ({ id, label, }) => {
            try {
                const response = await this.axios.put(`/tag/${id}`, {
                    id,
                    label,
                });
                return response.data;
            }
            catch (e) {
                throw new Error(`[${this.apiName}] Failed to rename tag: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.apiName = apiName;
    }
    async refreshMonitoredDownloads() {
        await this.runCommand('RefreshMonitoredDownloads', {});
    }
    async runCommand(commandName, options) {
        try {
            await this.axios.post(`/command`, {
                name: commandName,
                ...options,
            });
        }
        catch (e) {
            throw new Error(`[${this.apiName}] Failed to run command: ${e.message}`, {
                cause: e,
            });
        }
    }
}
exports.default = ServarrBase;

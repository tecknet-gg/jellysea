"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetadataProvider = void 0;
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const tvdb_1 = __importDefault(require("../api/tvdb"));
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const getMetadataProvider = async (mediaType) => {
    try {
        const settings = await (0, settings_1.getSettings)();
        if (mediaType == 'movie') {
            return new themoviedb_1.default();
        }
        if (mediaType == 'tv' &&
            settings.metadataSettings.tv == settings_1.MetadataProviderType.TVDB) {
            return await tvdb_1.default.getInstance();
        }
        if (mediaType == 'anime' &&
            settings.metadataSettings.anime == settings_1.MetadataProviderType.TVDB) {
            return await tvdb_1.default.getInstance();
        }
        return new themoviedb_1.default();
    }
    catch (e) {
        logger_1.default.error('Failed to get metadata provider', {
            label: 'Metadata',
            message: e.message,
        });
        return new themoviedb_1.default();
    }
};
exports.getMetadataProvider = getMetadataProvider;

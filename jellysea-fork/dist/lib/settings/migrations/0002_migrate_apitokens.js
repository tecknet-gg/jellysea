"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jellyfin_1 = __importDefault(require("../../../api/jellyfin"));
const server_1 = require("../../../constants/server");
const datasource_1 = require("../../../datasource");
const User_1 = require("../../../entity/User");
const getHostname_1 = require("../../../utils/getHostname");
const migrateApiTokens = async (settings) => {
    const mediaServerType = settings.main.mediaServerType;
    if (!settings.jellyfin?.apiKey &&
        (mediaServerType === server_1.MediaServerType.JELLYFIN ||
            mediaServerType === server_1.MediaServerType.EMBY)) {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const admin = await userRepository.findOne({
            where: { id: 1 },
            select: ['id', 'jellyfinAuthToken', 'jellyfinUserId', 'jellyfinDeviceId'],
            order: { id: 'ASC' },
        });
        if (!admin) {
            return settings;
        }
        const jellyfinClient = new jellyfin_1.default((0, getHostname_1.getHostname)(settings.jellyfin), admin.jellyfinAuthToken, admin.jellyfinDeviceId);
        jellyfinClient.setUserId(admin.jellyfinUserId ?? '');
        try {
            const apiKey = await jellyfinClient.createApiToken('Seerr');
            settings.jellyfin.apiKey = apiKey;
        }
        catch {
            throw new Error("Failed to create Jellyfin API token from admin account. Please check your network configuration or edit your settings.json by adding an 'apiKey' field inside of the 'jellyfin' section to fix this issue.");
        }
    }
    return settings;
};
exports.default = migrateApiTokens;

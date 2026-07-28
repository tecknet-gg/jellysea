"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../../../constants/server");
const migrateHostname = (settings) => {
    const oldMediaServerType = settings.main.mediaServerType;
    if (oldMediaServerType === server_1.MediaServerType.JELLYFIN &&
        process.env.JELLYFIN_TYPE === 'emby') {
        settings.main.mediaServerType = server_1.MediaServerType.EMBY;
    }
    return settings;
};
exports.default = migrateHostname;

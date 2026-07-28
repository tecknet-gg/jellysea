"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHostname = void 0;
const settings_1 = require("../lib/settings");
const getHostname = (params) => {
    const settings = params ? params : (0, settings_1.getSettings)().jellyfin;
    const { useSsl, ip, port, urlBase } = settings;
    const hostname = `${useSsl ? 'https' : 'http'}://${ip}:${port}${urlBase}`;
    return hostname;
};
exports.getHostname = getHostname;

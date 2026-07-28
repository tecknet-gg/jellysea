"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const removeLunaSeaSetting = (settings) => {
    if (settings.notifications &&
        settings.notifications.agents &&
        settings.notifications.agents.lunasea) {
        delete settings.notifications.agents.lunasea;
    }
    return settings;
};
exports.default = removeLunaSeaSetting;

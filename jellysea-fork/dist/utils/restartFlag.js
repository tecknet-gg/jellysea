"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = require("../lib/settings");
class RestartFlag {
    initializeSettings(settings) {
        this.networkSettings = {
            ...settings.network,
            proxy: { ...settings.network.proxy },
        };
    }
    isSet() {
        const networkSettings = (0, settings_1.getSettings)().network;
        return (this.networkSettings.csrfProtection !== networkSettings.csrfProtection ||
            this.networkSettings.trustProxy !== networkSettings.trustProxy ||
            this.networkSettings.proxy.enabled !== networkSettings.proxy.enabled);
    }
}
const restartFlag = new RestartFlag();
exports.default = restartFlag;

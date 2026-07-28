"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const migrateRegionSetting = (settings) => {
    if (settings.main.discoverRegion !== undefined &&
        settings.main.streamingRegion !== undefined) {
        return settings;
    }
    const oldRegion = settings.main.region;
    if (oldRegion) {
        settings.main.discoverRegion = oldRegion;
        settings.main.streamingRegion = oldRegion;
    }
    else {
        settings.main.discoverRegion = '';
        settings.main.streamingRegion = 'US';
    }
    delete settings.main.region;
    return settings;
};
exports.default = migrateRegionSetting;

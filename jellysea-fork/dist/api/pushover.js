"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapSounds = void 0;
const externalapi_1 = __importDefault(require("./externalapi"));
const mapSounds = (sounds) => Object.entries(sounds).map(([name, description]) => ({
    name,
    description,
}));
exports.mapSounds = mapSounds;
class PushoverAPI extends externalapi_1.default {
    constructor() {
        super('https://api.pushover.net/1', {}, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });
    }
    async getSounds(appToken) {
        try {
            const data = await this.get('/sounds.json', {
                params: {
                    token: appToken,
                },
            });
            return (0, exports.mapSounds)(data.sounds);
        }
        catch (e) {
            throw new Error(`[Pushover] Failed to retrieve sounds: ${e.message}`, {
                cause: e,
            });
        }
    }
}
exports.default = PushoverAPI;

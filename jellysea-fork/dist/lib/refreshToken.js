"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const plextv_1 = __importDefault(require("../api/plextv"));
const datasource_1 = require("../datasource");
const User_1 = require("../entity/User");
const logger_1 = __importDefault(require("../logger"));
class RefreshToken {
    async run() {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const users = await userRepository
            .createQueryBuilder('user')
            .addSelect('user.plexToken')
            .where("user.plexToken != ''")
            .getMany();
        for (const user of users) {
            await this.refreshUserToken(user);
        }
    }
    async refreshUserToken(user) {
        if (!user.plexToken) {
            logger_1.default.warn('Skipping user refresh token for user without plex token', {
                label: 'Plex Refresh Token',
                user: user.displayName,
            });
            return;
        }
        const plexTvApi = new plextv_1.default(user.plexToken);
        plexTvApi.pingToken();
    }
}
const refreshToken = new RefreshToken();
exports.default = refreshToken;

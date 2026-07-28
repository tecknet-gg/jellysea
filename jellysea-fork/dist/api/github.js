"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = __importDefault(require("../lib/cache"));
const logger_1 = __importDefault(require("../logger"));
const externalapi_1 = __importDefault(require("./externalapi"));
class GithubAPI extends externalapi_1.default {
    constructor() {
        super('https://api.github.com', {}, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            nodeCache: cache_1.default.getCache('github').data,
        });
    }
    async getSeerrReleases({ take = 20, } = {}) {
        try {
            const data = await this.get('/repos/seerr-team/seerr/releases', {
                params: {
                    per_page: take,
                },
            });
            return data;
        }
        catch (e) {
            logger_1.default.warn("Failed to retrieve GitHub releases. This may be an issue on GitHub's end. Seerr can't check if it's on the latest version.", { label: 'GitHub API', errorMessage: e.message });
            return [];
        }
    }
    async getSeerrCommits({ take = 20, branch = 'develop', } = {}) {
        try {
            const data = await this.get('/repos/seerr-team/seerr/commits', {
                params: {
                    per_page: take,
                    branch,
                },
            });
            return data;
        }
        catch (e) {
            logger_1.default.warn("Failed to retrieve GitHub commits. This may be an issue on GitHub's end. Seerr can't check if it's on the latest version.", { label: 'GitHub API', errorMessage: e.message });
            return [];
        }
    }
}
exports.default = GithubAPI;

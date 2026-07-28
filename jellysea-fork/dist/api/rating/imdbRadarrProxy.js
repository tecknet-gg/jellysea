"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const externalapi_1 = __importDefault(require("../../api/externalapi"));
const cache_1 = __importDefault(require("../../lib/cache"));
/**
 * This is a best-effort API. The IMDB API is technically
 * private and getting access costs money/requires approval.
 *
 * Radarr hosts a public proxy that's in use by all Radarr instances.
 */
class IMDBRadarrProxy extends externalapi_1.default {
    constructor() {
        super('https://api.radarr.video/v1', {}, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            nodeCache: cache_1.default.getCache('imdb').data,
        });
    }
    /**
     * Ask the Radarr IMDB Proxy for the movie
     *
     * @param IMDBid Id of IMDB movie
     */
    async getMovieRatings(IMDBid) {
        try {
            const data = await this.get(`/movie/imdb/${IMDBid}`);
            if (!data?.length ||
                data[0].ImdbId !== IMDBid ||
                !data[0].MovieRatings.Imdb) {
                return null;
            }
            return {
                title: data[0].Title,
                url: `https://www.imdb.com/title/${data[0].ImdbId}`,
                criticsScore: data[0].MovieRatings.Imdb.Value,
                criticsScoreCount: data[0].MovieRatings.Imdb.Count,
            };
        }
        catch (e) {
            throw new Error(`[IMDB RADARR PROXY API] Failed to retrieve movie ratings: ${e.message}`, { cause: e });
        }
    }
}
exports.default = IMDBRadarrProxy;

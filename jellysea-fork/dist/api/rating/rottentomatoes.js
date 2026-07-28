"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const externalapi_1 = __importDefault(require("../../api/externalapi"));
const cache_1 = __importDefault(require("../../lib/cache"));
const settings_1 = require("../../lib/settings");
const wink_jaro_distance_1 = __importDefault(require("wink-jaro-distance"));
// Tunables
const INEXACT_TITLE_FACTOR = 0.25;
const ALTERNATE_TITLE_FACTOR = 0.8;
const PER_YEAR_PENALTY = 0.4;
const MINIMUM_SCORE = 0.175;
// Normalization for title comparisons.
// Lowercase and strip non-alphanumeric (unicode-aware).
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '');
// Title similarity. 1 if exact, quarter-jaro otherwise.
const similarity = (a, b) => a === b ? 1 : (0, wink_jaro_distance_1.default)(a, b).similarity * INEXACT_TITLE_FACTOR;
// Gets the best similarity score between the searched title and all alternate
// titles of the search result. Non-main titles are penalized.
const t_score = ({ title, titles, aka }, s) => {
    const f = (t, i) => similarity(norm(t), norm(s)) * (i ? ALTERNATE_TITLE_FACTOR : 1);
    return Math.max(...[title].concat(aka || [], titles || []).map(f));
};
// Year difference to score: 0 -> 1.0, 1 -> 0.6, 2 -> 0.2, 3+ -> 0.0
const y_score = (r, y) => y ? Math.max(0, 1 - Math.abs(r.releaseYear - y) * PER_YEAR_PENALTY) : 1;
// Cut score in half if result has no ratings.
const extra_score = (r) => (r.rottenTomatoes ? 1 : 0.5);
// Score search result as product of all subscores
const score = (r, name, year) => t_score(r, name) * y_score(r, year) * extra_score(r);
// Score each search result and return the highest scoring result, if any
const best = (rs, name, year) => rs
    .map((r) => ({ score: score(r, name, year), result: r }))
    .filter(({ score }) => score > MINIMUM_SCORE)
    .sort(({ score: a }, { score: b }) => b - a)[0]?.result;
/**
 * This is a best-effort API. The Rotten Tomatoes API is technically
 * private and getting access costs money/requires approval.
 *
 * They do, however, have a "public" api that they use to request the
 * data on their own site. We use this to get ratings for movies/tv shows.
 *
 * Unfortunately, we need to do it by searching for the movie name, so it's
 * not always accurate.
 */
class RottenTomatoes extends externalapi_1.default {
    constructor() {
        const settings = (0, settings_1.getSettings)();
        super('https://79frdp12pn-dsn.algolia.net/1/indexes/*', {
            'x-algolia-agent': 'Algolia%20for%20JavaScript%20(4.14.3)%3B%20Browser%20(lite)',
            'x-algolia-api-key': '175588f6e5f8319b27702e4cc4013561',
            'x-algolia-application-id': '79FRDP12PN',
        }, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'x-algolia-usertoken': settings.clientId,
            },
            nodeCache: cache_1.default.getCache('rt').data,
        });
    }
    /**
     * Search the RT algolia api for the movie title
     *
     * We compare the release date to make sure its the correct
     * match. But it's not guaranteed to have results.
     *
     * @param name Movie name
     * @param year Release Year
     */
    async getMovieRatings(name, year) {
        try {
            const filters = encodeURIComponent('isEmsSearchable=1 AND type:"movie"');
            const data = await this.post('/queries', {
                requests: [
                    {
                        indexName: 'content_rt',
                        query: name.replace(/\bthe\b ?/gi, ''),
                        params: `filters=${filters}&hitsPerPage=20`,
                    },
                ],
            });
            const contentResults = data.results.find((r) => r.index === 'content_rt');
            const movie = best(contentResults?.hits || [], name, year);
            if (!movie?.rottenTomatoes)
                return null;
            return {
                title: movie.title,
                url: `https://www.rottentomatoes.com/m/${movie.vanity}`,
                criticsRating: movie.rottenTomatoes.certifiedFresh
                    ? 'Certified Fresh'
                    : movie.rottenTomatoes.criticsScore >= 60
                        ? 'Fresh'
                        : 'Rotten',
                criticsScore: movie.rottenTomatoes.criticsScore,
                audienceRating: movie.rottenTomatoes.audienceScore >= 60 ? 'Upright' : 'Spilled',
                audienceScore: movie.rottenTomatoes.audienceScore,
                year: Number(movie.releaseYear),
            };
        }
        catch (e) {
            throw new Error(`[RT API] Failed to retrieve movie ratings: ${e.message}`, { cause: e });
        }
    }
    async getTVRatings(name, year) {
        try {
            const filters = encodeURIComponent('isEmsSearchable=1 AND type:"tv"');
            const data = await this.post('/queries', {
                requests: [
                    {
                        indexName: 'content_rt',
                        query: name,
                        params: `filters=${filters}&hitsPerPage=20`,
                    },
                ],
            });
            const contentResults = data.results.find((r) => r.index === 'content_rt');
            const tvshow = best(contentResults?.hits || [], name, year);
            if (!tvshow?.rottenTomatoes)
                return null;
            return {
                title: tvshow.title,
                url: `https://www.rottentomatoes.com/tv/${tvshow.vanity}`,
                criticsRating: tvshow.rottenTomatoes.criticsScore >= 60 ? 'Fresh' : 'Rotten',
                criticsScore: tvshow.rottenTomatoes.criticsScore,
                audienceRating: tvshow.rottenTomatoes.audienceScore >= 60 ? 'Upright' : 'Spilled',
                audienceScore: tvshow.rottenTomatoes.audienceScore,
                year: Number(tvshow.releaseYear),
            };
        }
        catch (e) {
            throw new Error(`[RT API] Failed to retrieve tv ratings: ${e.message}`, {
                cause: e,
            });
        }
    }
}
exports.default = RottenTomatoes;

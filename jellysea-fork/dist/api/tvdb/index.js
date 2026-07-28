"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const externalapi_1 = __importDefault(require("../../api/externalapi"));
const themoviedb_1 = __importDefault(require("../../api/themoviedb"));
const interfaces_1 = require("../../api/tvdb/interfaces");
const cache_1 = __importDefault(require("../../lib/cache"));
const logger_1 = __importDefault(require("../../logger"));
const DEFAULT_CONFIG = {
    baseUrl: 'https://api4.thetvdb.com/v4',
    maxRequestsPerSecond: 50,
    maxRequests: 20,
    cachePrefix: 'tvdb',
};
var TvdbIdStatus;
(function (TvdbIdStatus) {
    TvdbIdStatus[TvdbIdStatus["INVALID"] = -1] = "INVALID";
})(TvdbIdStatus || (TvdbIdStatus = {}));
class Tvdb extends externalapi_1.default {
    constructor(pin) {
        const finalConfig = { ...DEFAULT_CONFIG };
        super(finalConfig.baseUrl, {}, {
            nodeCache: cache_1.default.getCache(finalConfig.cachePrefix).data,
            rateLimit: {
                maxRequests: finalConfig.maxRequests,
                maxRPS: finalConfig.maxRequestsPerSecond,
            },
        });
        this.pin = pin;
        this.tmdb = new themoviedb_1.default();
    }
    static async getInstance() {
        if (!this.instance) {
            this.instance = new Tvdb();
            await this.instance.login();
        }
        return this.instance;
    }
    async refreshToken() {
        try {
            if (!this.token) {
                await this.login();
                return;
            }
            const base64Url = this.token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
            if (!payload.exp) {
                await this.login();
            }
            const now = Math.floor(Date.now() / 1000);
            const diff = payload.exp - now;
            // refresh token 1 week before expiration
            if (diff < 604800) {
                await this.login();
            }
        }
        catch (error) {
            this.handleError('Failed to refresh token', error);
        }
    }
    async test() {
        try {
            await this.login();
        }
        catch (error) {
            this.handleError('Login failed', error);
            throw error;
        }
    }
    async login() {
        let body = {
            apiKey: 'd00d9ecb-a9d0-4860-958a-74b14a041405',
        };
        if (this.pin) {
            body = {
                ...body,
                pin: this.pin,
            };
        }
        const response = await this.post('/login', {
            ...body,
        });
        this.token = response.data.token;
        return response.data;
    }
    async getShowByTvdbId({ tvdbId, language, }) {
        try {
            const tmdbTvShow = await this.tmdb.getShowByTvdbId({
                tvdbId: tvdbId,
                language,
            });
            try {
                await this.refreshToken();
                const validTvdbId = this.getTvdbIdFromTmdb(tmdbTvShow);
                if (this.isValidTvdbId(validTvdbId)) {
                    return this.enrichTmdbShowWithTvdbData(tmdbTvShow, validTvdbId);
                }
                return tmdbTvShow;
            }
            catch {
                return tmdbTvShow;
            }
        }
        catch (error) {
            this.handleError('Failed to fetch TV show details', error);
            throw error;
        }
    }
    async getTvShow({ tvId, language, }) {
        try {
            const tmdbTvShow = await this.tmdb.getTvShow({ tvId, language });
            try {
                await this.refreshToken();
                const tvdbId = this.getTvdbIdFromTmdb(tmdbTvShow);
                if (this.isValidTvdbId(tvdbId)) {
                    return await this.enrichTmdbShowWithTvdbData(tmdbTvShow, tvdbId);
                }
                return tmdbTvShow;
            }
            catch (error) {
                this.handleError('Failed to fetch TV show details', error);
                return tmdbTvShow;
            }
        }
        catch (error) {
            this.handleError('Failed to fetch TV show details', error);
            return this.tmdb.getTvShow({ tvId, language });
        }
    }
    async getTvSeason({ tvId, seasonNumber, language = Tvdb.DEFAULT_LANGUAGE, }) {
        try {
            const tmdbTvShow = await this.tmdb.getTvShow({ tvId, language });
            try {
                await this.refreshToken();
                const tvdbId = this.getTvdbIdFromTmdb(tmdbTvShow);
                if (!this.isValidTvdbId(tvdbId)) {
                    return await this.tmdb.getTvSeason({ tvId, seasonNumber, language });
                }
                return await this.getTvdbSeasonData(tvdbId, seasonNumber, tvId, language);
            }
            catch (error) {
                this.handleError('Failed to fetch TV season details', error);
                return await this.tmdb.getTvSeason({ tvId, seasonNumber, language });
            }
        }
        catch (error) {
            logger_1.default.error(`[TVDB] Failed to fetch TV season details: ${error.message}`);
            throw error;
        }
    }
    async enrichTmdbShowWithTvdbData(tmdbTvShow, tvdbId) {
        try {
            await this.refreshToken();
            const tvdbData = await this.fetchTvdbShowData(tvdbId);
            const seasons = this.processSeasons(tvdbData);
            if (!seasons.length) {
                return tmdbTvShow;
            }
            return { ...tmdbTvShow, seasons };
        }
        catch (error) {
            logger_1.default.error(`Failed to enrich TMDB show with TVDB data: ${error.message} token: ${this.token}`);
            return tmdbTvShow;
        }
    }
    async fetchTvdbShowData(tvdbId) {
        const resp = await this.get(`/series/${tvdbId}/extended?meta=episodes&short=true`, {
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        }, Tvdb.DEFAULT_CACHE_TTL);
        return resp.data;
    }
    processSeasons(tvdbData) {
        if (!tvdbData || !tvdbData.seasons || !tvdbData.episodes) {
            return [];
        }
        const seasons = tvdbData.seasons
            .filter((season) => season.type && season.type.type === 'official')
            .sort((a, b) => a.number - b.number)
            .map((season) => this.createSeasonData(season, tvdbData))
            .filter((season) => season && season.season_number >= 0);
        return seasons;
    }
    createSeasonData(season, tvdbData) {
        const seasonNumber = season.number ?? -1;
        if (seasonNumber < 0) {
            return {
                id: 0,
                episode_count: 0,
                name: '',
                overview: '',
                season_number: -1,
                poster_path: '',
                air_date: '',
            };
        }
        const episodeCount = tvdbData.episodes.filter((episode) => episode.seasonNumber === season.number).length;
        return {
            id: tvdbData.id,
            episode_count: episodeCount,
            name: `${season.number}`,
            overview: '',
            season_number: season.number,
            poster_path: '',
            air_date: '',
        };
    }
    async getTvdbSeasonData(tvdbId, seasonNumber, tvId, language = Tvdb.DEFAULT_LANGUAGE) {
        const tvdbData = await this.fetchTvdbShowData(tvdbId);
        if (!tvdbData) {
            logger_1.default.error(`Failed to fetch TVDB data for ID: ${tvdbId}`);
            return this.createEmptySeasonResponse(tvId);
        }
        // get season id
        const season = tvdbData.seasons.find((season) => season.number === seasonNumber &&
            season.type.type &&
            season.type.type === 'official');
        if (!season) {
            logger_1.default.error(`Failed to find season ${seasonNumber} for TVDB ID: ${tvdbId}`);
            return this.createEmptySeasonResponse(tvId);
        }
        const wantedTranslation = (0, interfaces_1.convertTmdbLanguageToTvdbWithFallback)(language, Tvdb.DEFAULT_LANGUAGE);
        // check if translation is available for the season
        const availableTranslation = season.nameTranslations.filter((translation) => translation === wantedTranslation ||
            translation === Tvdb.DEFAULT_LANGUAGE);
        if (!availableTranslation) {
            return this.getSeasonWithOriginalLanguage(tvdbId, tvId, seasonNumber, season);
        }
        return this.getSeasonWithTranslation(tvdbId, tvId, seasonNumber, season, wantedTranslation);
    }
    async getSeasonWithTranslation(tvdbId, tvId, seasonNumber, season, language) {
        if (!season) {
            logger_1.default.error(`Failed to find season ${seasonNumber} for TVDB ID: ${tvdbId}`);
            return this.createEmptySeasonResponse(tvId);
        }
        const allEpisodes = [];
        let page = 0;
        // Limit to max 50 pages to avoid infinite loops.
        // 50 pages with 500 items per page = 25_000 episodes in a series which should be more than enough
        const maxPages = 50;
        while (page < maxPages) {
            const resp = await this.get(`/series/${tvdbId}/episodes/default/${language}`, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                },
                params: {
                    page: page,
                },
            });
            if (!resp?.data?.episodes) {
                logger_1.default.warn(`No episodes found for TVDB ID: ${tvdbId} on page ${page} for season ${seasonNumber}`);
                break;
            }
            const { episodes } = resp.data;
            if (!episodes) {
                logger_1.default.debug(`No more episodes found for TVDB ID: ${tvdbId} on page ${page} for season ${seasonNumber}`);
                break;
            }
            allEpisodes.push(...episodes);
            const hasNextPage = resp.links?.next && episodes.length > 0;
            if (!hasNextPage) {
                break;
            }
            page++;
        }
        if (page >= maxPages) {
            logger_1.default.warn(`Reached max pages (${maxPages}) for TVDB ID: ${tvdbId} on season ${seasonNumber} with language ${language}. There might be more episodes available.`);
        }
        const episodes = this.processEpisodes({ ...season, episodes: allEpisodes }, seasonNumber, tvId);
        return {
            episodes,
            external_ids: { tvdb_id: tvdbId },
            name: '',
            overview: '',
            id: season.id,
            air_date: season.firstAired,
            season_number: episodes.length,
        };
    }
    async getSeasonWithOriginalLanguage(tvdbId, tvId, seasonNumber, season) {
        if (!season) {
            logger_1.default.error(`Failed to find season ${seasonNumber} for TVDB ID: ${tvdbId}`);
            return this.createEmptySeasonResponse(tvId);
        }
        const resp = await this.get(`/seasons/${season.id}/extended`, {
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        });
        const seasons = resp.data;
        const episodes = this.processEpisodes(seasons, seasonNumber, tvId);
        return {
            episodes,
            external_ids: { tvdb_id: tvdbId },
            name: '',
            overview: '',
            id: seasons.id,
            air_date: seasons.firstAired,
            season_number: episodes.length,
        };
    }
    processEpisodes(tvdbSeason, seasonNumber, tvId) {
        if (!tvdbSeason || !tvdbSeason.episodes) {
            logger_1.default.error('No episodes found in TVDB season data');
            return [];
        }
        return tvdbSeason.episodes
            .filter((episode) => episode.seasonNumber === seasonNumber)
            .map((episode, index) => this.createEpisodeData(episode, index, tvId));
    }
    createEpisodeData(episode, index, tvId) {
        return {
            id: episode.id,
            air_date: episode.aired,
            episode_number: episode.number,
            name: episode.name || `Episode ${index + 1}`,
            overview: episode.overview || '',
            season_number: episode.seasonNumber,
            production_code: '',
            show_id: tvId,
            still_path: episode.image && !episode.image.startsWith('https://')
                ? 'https://artworks.thetvdb.com' + episode.image
                : '',
            vote_average: 1,
            vote_count: 1,
        };
    }
    createEmptySeasonResponse(tvId) {
        return {
            episodes: [],
            external_ids: { tvdb_id: tvId },
            name: '',
            overview: '',
            id: 0,
            air_date: '',
            season_number: 0,
        };
    }
    getTvdbIdFromTmdb(tmdbTvShow) {
        return tmdbTvShow?.external_ids?.tvdb_id ?? TvdbIdStatus.INVALID;
    }
    isValidTvdbId(tvdbId) {
        return tvdbId !== TvdbIdStatus.INVALID;
    }
    handleError(context, error) {
        throw new Error(`[TVDB] ${context}: ${error.message}`);
    }
}
Tvdb.DEFAULT_CACHE_TTL = 43200;
Tvdb.DEFAULT_LANGUAGE = 'eng';
exports.default = Tvdb;

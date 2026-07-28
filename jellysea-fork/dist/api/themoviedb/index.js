"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SortOptionsIterable = void 0;
const externalapi_1 = __importDefault(require("../../api/externalapi"));
const cache_1 = __importDefault(require("../../lib/cache"));
const settings_1 = require("../../lib/settings");
const lodash_1 = require("lodash");
exports.SortOptionsIterable = [
    'popularity.desc',
    'popularity.asc',
    'release_date.desc',
    'release_date.asc',
    'revenue.desc',
    'revenue.asc',
    'primary_release_date.desc',
    'primary_release_date.asc',
    'original_title.asc',
    'original_title.desc',
    'vote_average.desc',
    'vote_average.asc',
    'vote_count.desc',
    'vote_count.asc',
    'first_air_date.desc',
    'first_air_date.asc',
];
class TheMovieDb extends externalapi_1.default {
    constructor({ discoverRegion, originalLanguage, } = {}) {
        super('https://api.themoviedb.org/3', {
            api_key: '431a8708161bcd1f1fbe7536137e61ed',
        }, {
            nodeCache: cache_1.default.getCache('tmdb').data,
            rateLimit: {
                maxRequests: 20,
                maxRPS: 50,
            },
        });
        this.searchMulti = async ({ query, page = 1, includeAdult = false, language = this.locale, }) => {
            try {
                const data = await this.get('/search/multi', {
                    params: { query, page, include_adult: includeAdult, language },
                });
                return data;
            }
            catch {
                return {
                    page: 1,
                    results: [],
                    total_pages: 1,
                    total_results: 0,
                };
            }
        };
        this.searchMovies = async ({ query, page = 1, includeAdult = false, language = this.locale, year, }) => {
            try {
                const data = await this.get('/search/movie', {
                    params: {
                        query,
                        page,
                        include_adult: includeAdult,
                        language,
                        primary_release_year: year,
                    },
                });
                return data;
            }
            catch {
                return {
                    page: 1,
                    results: [],
                    total_pages: 1,
                    total_results: 0,
                };
            }
        };
        this.searchTvShows = async ({ query, page = 1, includeAdult = false, language = this.locale, year, }) => {
            try {
                const data = await this.get('/search/tv', {
                    params: {
                        query,
                        page,
                        include_adult: includeAdult,
                        language,
                        first_air_date_year: year,
                    },
                });
                return data;
            }
            catch {
                return {
                    page: 1,
                    results: [],
                    total_pages: 1,
                    total_results: 0,
                };
            }
        };
        this.getPerson = async ({ personId, language = this.locale, }) => {
            try {
                const data = await this.get(`/person/${personId}`, {
                    params: { language },
                });
                return data;
            }
            catch (e) {
                throw new Error(`[TMDB] Failed to fetch person details: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.getPersonCombinedCredits = async ({ personId, language = this.locale, }) => {
            try {
                const data = await this.get(`/person/${personId}/combined_credits`, {
                    params: { language },
                });
                return data;
            }
            catch (e) {
                throw new Error(`[TMDB] Failed to fetch person combined credits: ${e.message}`, { cause: e });
            }
        };
        this.getMovie = async ({ movieId, language = this.locale, }) => {
            try {
                const data = await this.get(`/movie/${movieId}`, {
                    params: {
                        language,
                        append_to_response: 'credits,external_ids,videos,keywords,release_dates,watch/providers',
                        include_video_language: language,
                    },
                }, 43200);
                if ((!language || !language.startsWith('en')) &&
                    !data.videos?.results?.some((video) => video.type === 'Trailer')) {
                    try {
                        const fallback = await this.get(`/movie/${movieId}`, {
                            params: {
                                language,
                                append_to_response: 'videos',
                                include_video_language: 'en',
                            },
                        }, 43200);
                        const localizedVideos = data.videos?.results ?? [];
                        const localizedVideoKeys = new Set(localizedVideos.map((video) => video.key));
                        const englishFallbackTrailers = fallback.videos?.results?.filter((video) => video.type === 'Trailer' && !localizedVideoKeys.has(video.key)) ?? [];
                        if (englishFallbackTrailers.length > 0) {
                            data.videos = {
                                ...(data.videos ?? { results: [] }),
                                results: [...localizedVideos, ...englishFallbackTrailers],
                            };
                        }
                    }
                    catch {
                        // Ignore trailer fallback failures; return the original data.
                    }
                }
                return data;
            }
            catch (e) {
                throw new Error(`[TMDB] Failed to fetch movie details: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.getTvShow = async ({ tvId, language = this.locale, }) => {
            try {
                const data = await this.get(`/tv/${tvId}`, {
                    params: {
                        language,
                        append_to_response: 'aggregate_credits,credits,external_ids,keywords,videos,content_ratings,watch/providers',
                        include_video_language: language,
                    },
                }, 43200);
                if ((!language || !language.startsWith('en')) &&
                    !data.videos?.results?.some((video) => video.type === 'Trailer')) {
                    try {
                        const fallback = await this.get(`/tv/${tvId}`, {
                            params: {
                                language,
                                append_to_response: 'videos',
                                include_video_language: 'en',
                            },
                        }, 43200);
                        const localizedVideos = data.videos?.results ?? [];
                        const localizedVideoKeys = new Set(localizedVideos.map((video) => video.key));
                        const englishFallbackTrailers = fallback.videos?.results?.filter((video) => video.type === 'Trailer' && !localizedVideoKeys.has(video.key)) ?? [];
                        if (englishFallbackTrailers.length > 0) {
                            data.videos = {
                                ...(data.videos ?? { results: [] }),
                                results: [...localizedVideos, ...englishFallbackTrailers],
                            };
                        }
                    }
                    catch {
                        // Ignore trailer fallback failures; return the original data.
                    }
                }
                return data;
            }
            catch (e) {
                throw new Error(`[TMDB] Failed to fetch TV show details: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.getTvSeason = async ({ tvId, seasonNumber, language, }) => {
            try {
                const data = await this.get(`/tv/${tvId}/season/${seasonNumber}`, {
                    params: {
                        language,
                        append_to_response: 'external_ids',
                    },
                });
                data.episodes = data.episodes.map((episode) => {
                    if (episode.still_path) {
                        episode.still_path = `https://image.tmdb.org/t/p/original/${episode.still_path}`;
                    }
                    return episode;
                });
                return data;
            }
            catch (e) {
                throw new Error(`[TMDB] Failed to fetch TV show details: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.getDiscoverMovies = async ({ sortBy = 'popularity.desc', page = 1, includeAdult = false, includeVideo = true, language = this.locale, primaryReleaseDateGte, primaryReleaseDateLte, originalLanguage, genre, studio, keywords, excludeKeywords, withRuntimeGte, withRuntimeLte, voteAverageGte, voteAverageLte, voteCountGte, voteCountLte, watchProviders, watchRegion, certification, certificationGte, certificationLte, certificationCountry, } = {}) => {
            try {
                const defaultFutureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * (365 * 1.5))
                    .toISOString()
                    .split('T')[0];
                const defaultPastDate = new Date('1900-01-01')
                    .toISOString()
                    .split('T')[0];
                const data = await this.get('/discover/movie', {
                    params: {
                        sort_by: sortBy,
                        page,
                        include_adult: includeAdult,
                        include_video: includeVideo,
                        language,
                        region: this.discoverRegion || '',
                        with_original_language: originalLanguage && originalLanguage !== 'all'
                            ? originalLanguage
                            : originalLanguage === 'all'
                                ? undefined
                                : this.originalLanguage,
                        // Set our release date values, but check if one is set and not the other,
                        // so we can force a past date or a future date. TMDB Requires both values if one is set!
                        'primary_release_date.gte': !primaryReleaseDateGte && primaryReleaseDateLte
                            ? defaultPastDate
                            : primaryReleaseDateGte,
                        'primary_release_date.lte': !primaryReleaseDateLte && primaryReleaseDateGte
                            ? defaultFutureDate
                            : primaryReleaseDateLte,
                        with_genres: genre,
                        with_companies: studio,
                        with_keywords: keywords,
                        without_keywords: excludeKeywords,
                        'with_runtime.gte': withRuntimeGte,
                        'with_runtime.lte': withRuntimeLte,
                        'vote_average.gte': voteAverageGte,
                        'vote_average.lte': voteAverageLte,
                        'vote_count.gte': voteCountGte,
                        'vote_count.lte': voteCountLte,
                        watch_region: watchRegion,
                        with_watch_providers: watchProviders,
                        certification: certification,
                        'certification.gte': certificationGte,
                        'certification.lte': certificationLte,
                        certification_country: certificationCountry,
                    },
                });
                return data;
            }
            catch (e) {
                throw new Error(`[TMDB] Failed to fetch discover movies: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.getDiscoverTv = async ({ sortBy = 'popularity.desc', page = 1, language = this.locale, firstAirDateGte, firstAirDateLte, includeEmptyReleaseDate = false, originalLanguage, genre, network, keywords, excludeKeywords, withRuntimeGte, withRuntimeLte, voteAverageGte, voteAverageLte, voteCountGte, voteCountLte, watchProviders, watchRegion, withStatus, certification, certificationGte, certificationLte, certificationCountry, } = {}) => {
            try {
                const defaultFutureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * (365 * 1.5))
                    .toISOString()
                    .split('T')[0];
                const defaultPastDate = new Date('1900-01-01')
                    .toISOString()
                    .split('T')[0];
                const data = await this.get('/discover/tv', {
                    params: {
                        sort_by: sortBy,
                        page,
                        language,
                        region: this.discoverRegion || '',
                        // Set our release date values, but check if one is set and not the other,
                        // so we can force a past date or a future date. TMDB Requires both values if one is set!
                        'first_air_date.gte': !firstAirDateGte && firstAirDateLte
                            ? defaultPastDate
                            : firstAirDateGte,
                        'first_air_date.lte': !firstAirDateLte && firstAirDateGte
                            ? defaultFutureDate
                            : firstAirDateLte,
                        with_original_language: originalLanguage && originalLanguage !== 'all'
                            ? originalLanguage
                            : originalLanguage === 'all'
                                ? undefined
                                : this.originalLanguage,
                        include_null_first_air_dates: includeEmptyReleaseDate,
                        with_genres: genre,
                        with_networks: network,
                        with_keywords: keywords,
                        without_keywords: excludeKeywords,
                        'with_runtime.gte': withRuntimeGte,
                        'with_runtime.lte': withRuntimeLte,
                        'vote_average.gte': voteAverageGte,
                        'vote_average.lte': voteAverageLte,
                        'vote_count.gte': voteCountGte,
                        'vote_count.lte': voteCountLte,
                        with_watch_providers: watchProviders,
                        watch_region: watchRegion,
                        with_status: withStatus,
                        certification: certification,
                        'certification.gte': certificationGte,
                        'certification.lte': certificationLte,
                        certification_country: certificationCountry,
                    },
                });
                return data;
            }
            catch (e) {
                throw new Error(`[TMDB] Failed to fetch discover TV: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.getUpcomingMovies = async ({ page = 1, language = this.locale, }) => {
            try {
                const data = await this.get('/movie/upcoming', {
                    params: {
                        page,
                        language,
                        region: this.discoverRegion,
                        originalLanguage: this.originalLanguage,
                    },
                });
                return data;
            }
            catch (e) {
                throw new Error(`[TMDB] Failed to fetch upcoming movies: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.getAllTrending = async ({ page = 1, timeWindow = 'day', language = this.locale, } = {}) => {
            try {
                const data = await this.get(`/trending/all/${timeWindow}`, {
                    params: {
                        page,
                        language,
                        region: this.discoverRegion,
                    },
                });
                return data;
            }
            catch (e) {
                throw new Error(`[TMDB] Failed to fetch all trending: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.getMovieTrending = async ({ page = 1, timeWindow = 'day', language = this.locale, } = {}) => {
            try {
                const data = await this.get(`/trending/movie/${timeWindow}`, {
                    params: {
                        page,
                        language,
                    },
                });
                return data;
            }
            catch (e) {
                throw new Error(`[TMDB] Failed to fetch all trending: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.getTvTrending = async ({ page = 1, timeWindow = 'day', language = this.locale, } = {}) => {
            try {
                const data = await this.get(`/trending/tv/${timeWindow}`, {
                    params: {
                        page,
                        language,
                    },
                });
                return data;
            }
            catch (e) {
                throw new Error(`[TMDB] Failed to fetch all trending: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.getMovieCertifications = async () => {
            try {
                const data = await this.get('/certification/movie/list', {}, 604800 // 7 days
                );
                return data;
            }
            catch (e) {
                throw new Error(`[TMDB] Failed to fetch movie certifications: ${e}`, {
                    cause: e,
                });
            }
        };
        this.getTvCertifications = async () => {
            try {
                const data = await this.get('/certification/tv/list', {}, 604800 // 7 days
                );
                return data;
            }
            catch (e) {
                throw new Error(`[TMDB] Failed to fetch TV certifications: ${e.message}`, { cause: e });
            }
        };
        this.locale = (0, settings_1.getSettings)().main?.locale || 'en';
        this.discoverRegion = discoverRegion;
        this.originalLanguage = originalLanguage;
    }
    async getMovieRecommendations({ movieId, page = 1, language = this.locale, }) {
        try {
            const data = await this.get(`/movie/${movieId}/recommendations`, {
                params: {
                    page,
                    language,
                },
            });
            return data;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch discover movies: ${e.message}`, {
                cause: e,
            });
        }
    }
    async getMovieSimilar({ movieId, page = 1, language = this.locale, }) {
        try {
            const data = await this.get(`/movie/${movieId}/similar`, {
                params: {
                    page,
                    language,
                },
            });
            return data;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch discover movies: ${e.message}`, {
                cause: e,
            });
        }
    }
    async getMoviesByKeyword({ keywordId, page = 1, language = this.locale, }) {
        try {
            const data = await this.get(`/keyword/${keywordId}/movies`, {
                params: {
                    page,
                    language,
                },
            });
            return data;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch movies by keyword: ${e.message}`, { cause: e });
        }
    }
    async getTvRecommendations({ tvId, page = 1, language = this.locale, }) {
        try {
            const data = await this.get(`/tv/${tvId}/recommendations`, {
                params: {
                    page,
                    language,
                },
            });
            return data;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch TV recommendations: ${e.message}`, { cause: e });
        }
    }
    async getTvSimilar({ tvId, page = 1, language = this.locale, }) {
        try {
            const data = await this.get(`/tv/${tvId}/similar`, {
                params: {
                    page,
                    language,
                },
            });
            return data;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch TV similar: ${e.message}`, {
                cause: e,
            });
        }
    }
    async getByExternalId({ externalId, type, language = this.locale, }) {
        try {
            const data = await this.get(`/find/${externalId}`, {
                params: {
                    external_source: type === 'imdb' ? 'imdb_id' : 'tvdb_id',
                    language,
                },
            });
            return data;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to find by external ID: ${e.message}`, {
                cause: e,
            });
        }
    }
    async getMediaByImdbId({ imdbId, language = this.locale, }) {
        try {
            const extResponse = await this.getByExternalId({
                externalId: imdbId,
                type: 'imdb',
            });
            if (extResponse.movie_results[0]) {
                const movie = await this.getMovie({
                    movieId: extResponse.movie_results[0].id,
                    language,
                });
                return movie;
            }
            if (extResponse.tv_results[0]) {
                const tvshow = await this.getTvShow({
                    tvId: extResponse.tv_results[0].id,
                    language,
                });
                return tvshow;
            }
            throw new Error(`No movie or show returned from API for ID ${imdbId}`);
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to find media using external IMDb ID: ${e.message}`, { cause: e });
        }
    }
    async getShowByTvdbId({ tvdbId, language = this.locale, }) {
        try {
            const extResponse = await this.getByExternalId({
                externalId: tvdbId,
                type: 'tvdb',
            });
            if (extResponse.tv_results[0]) {
                const tvshow = await this.getTvShow({
                    tvId: extResponse.tv_results[0].id,
                    language,
                });
                return tvshow;
            }
            throw new Error(`No show returned from API for ID ${tvdbId}`);
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to get TV show using the external TVDB ID: ${e.message}`, { cause: e });
        }
    }
    async getCollection({ collectionId, language = this.locale, }) {
        try {
            const data = await this.get(`/collection/${collectionId}`, {
                params: {
                    language,
                },
            });
            return data;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch collection: ${e.message}`, {
                cause: e,
            });
        }
    }
    async getRegions() {
        try {
            const data = await this.get('/configuration/countries', {}, 86400 // 24 hours
            );
            const regions = (0, lodash_1.sortBy)(data, 'english_name');
            return regions;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch countries: ${e.message}`, {
                cause: e,
            });
        }
    }
    async getLanguages() {
        try {
            const data = await this.get('/configuration/languages', {}, 86400 // 24 hours
            );
            const languages = (0, lodash_1.sortBy)(data, 'english_name');
            return languages;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch langauges: ${e.message}`, {
                cause: e,
            });
        }
    }
    async getStudio(studioId) {
        try {
            const data = await this.get(`/company/${studioId}`);
            return data;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch movie studio: ${e.message}`, {
                cause: e,
            });
        }
    }
    async getNetwork(networkId) {
        try {
            const data = await this.get(`/network/${networkId}`);
            return data;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch TV network: ${e.message}`, {
                cause: e,
            });
        }
    }
    async getMovieGenres({ language = this.locale, } = {}) {
        try {
            const data = await this.get('/genre/movie/list', {
                params: {
                    language,
                },
            }, 86400 // 24 hours
            );
            if (!language.startsWith('en') &&
                data.genres.some((genre) => !genre.name)) {
                const englishData = await this.get('/genre/movie/list', {
                    params: {
                        language: 'en',
                    },
                }, 86400 // 24 hours
                );
                data.genres
                    .filter((genre) => !genre.name)
                    .forEach((genre) => {
                    genre.name =
                        englishData.genres.find((englishGenre) => englishGenre.id === genre.id)?.name ?? '';
                });
            }
            const movieGenres = (0, lodash_1.sortBy)(data.genres.filter((genre) => genre.name), 'name');
            return movieGenres;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch movie genres: ${e.message}`, {
                cause: e,
            });
        }
    }
    async getTvGenres({ language = this.locale, } = {}) {
        try {
            const data = await this.get('/genre/tv/list', {
                params: {
                    language,
                },
            }, 86400 // 24 hours
            );
            if (!language.startsWith('en') &&
                data.genres.some((genre) => !genre.name)) {
                const englishData = await this.get('/genre/tv/list', {
                    params: {
                        language: 'en',
                    },
                }, 86400 // 24 hours
                );
                data.genres
                    .filter((genre) => !genre.name)
                    .forEach((genre) => {
                    genre.name =
                        englishData.genres.find((englishGenre) => englishGenre.id === genre.id)?.name ?? '';
                });
            }
            const tvGenres = (0, lodash_1.sortBy)(data.genres.filter((genre) => genre.name), 'name');
            return tvGenres;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch TV genres: ${e.message}`, {
                cause: e,
            });
        }
    }
    async getKeywordDetails({ keywordId, }) {
        try {
            const data = await this.get(`/keyword/${keywordId}`, undefined, 604800 // 7 days
            );
            return data;
        }
        catch (e) {
            if (e.response?.status === 404) {
                return null;
            }
            throw new Error(`[TMDB] Failed to fetch keyword: ${e.message}`, {
                cause: e,
            });
        }
    }
    async searchKeyword({ query, page = 1, }) {
        try {
            const data = await this.get('/search/keyword', {
                params: {
                    query,
                    page,
                },
            }, 86400 // 24 hours
            );
            return data;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to search keyword: ${e.message}`, {
                cause: e,
            });
        }
    }
    async searchCompany({ query, page = 1, }) {
        try {
            const data = await this.get('/search/company', {
                params: {
                    query,
                    page,
                },
            }, 86400 // 24 hours
            );
            return data;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to search companies: ${e.message}`, {
                cause: e,
            });
        }
    }
    async getAvailableWatchProviderRegions({ language, }) {
        try {
            const data = await this.get('/watch/providers/regions', {
                params: {
                    language: language ?? this.originalLanguage,
                },
            }, 86400 // 24 hours
            );
            return data.results;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch available watch regions: ${e.message}`, { cause: e });
        }
    }
    async getMovieWatchProviders({ language, watchRegion, }) {
        try {
            const data = await this.get('/watch/providers/movie', {
                params: {
                    language: language ?? this.originalLanguage,
                    watch_region: watchRegion,
                },
            }, 86400 // 24 hours
            );
            return data.results;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch movie watch providers: ${e.message}`, { cause: e });
        }
    }
    async getTvWatchProviders({ language, watchRegion, }) {
        try {
            const data = await this.get('/watch/providers/tv', {
                params: {
                    language: language ?? this.originalLanguage,
                    watch_region: watchRegion,
                },
            }, 86400 // 24 hours
            );
            return data.results;
        }
        catch (e) {
            throw new Error(`[TMDB] Failed to fetch TV watch providers: ${e.message}`, { cause: e });
        }
    }
}
exports.default = TheMovieDb;

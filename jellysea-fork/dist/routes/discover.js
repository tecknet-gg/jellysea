"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTmdbWithBlocklistSettings = exports.createTmdbWithRegionLanguage = void 0;
const plextv_1 = __importDefault(require("../api/plextv"));
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const media_1 = require("../constants/media");
const datasource_1 = require("../datasource");
const Media_1 = __importDefault(require("../entity/Media"));
const User_1 = require("../entity/User");
const Watchlist_1 = require("../entity/Watchlist");
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const Movie_1 = require("../models/Movie");
const Search_1 = require("../models/Search");
const Tv_1 = require("../models/Tv");
const typeHelpers_1 = require("../utils/typeHelpers");
const express_1 = require("express");
const lodash_1 = require("lodash");
const zod_1 = require("zod");
const createTmdbWithRegionLanguage = (user) => {
    const settings = (0, settings_1.getSettings)();
    const discoverRegion = user?.settings?.streamingRegion === 'all'
        ? ''
        : user?.settings?.streamingRegion
            ? user?.settings?.streamingRegion
            : settings.main.discoverRegion;
    const originalLanguage = user?.settings?.originalLanguage === 'all'
        ? ''
        : user?.settings?.originalLanguage
            ? user?.settings?.originalLanguage
            : settings.main.originalLanguage;
    return new themoviedb_1.default({
        discoverRegion,
        originalLanguage,
    });
};
exports.createTmdbWithRegionLanguage = createTmdbWithRegionLanguage;
const createTmdbWithBlocklistSettings = () => {
    const settings = (0, settings_1.getSettings)();
    return new themoviedb_1.default({
        discoverRegion: settings.main.blocklistRegion,
        originalLanguage: settings.main.blocklistLanguage,
    });
};
exports.createTmdbWithBlocklistSettings = createTmdbWithBlocklistSettings;
const discoverRoutes = (0, express_1.Router)();
const QueryFilterOptions = zod_1.z.object({
    page: zod_1.z.coerce.string().optional(),
    sortBy: zod_1.z.coerce.string().optional(),
    primaryReleaseDateGte: zod_1.z.coerce.string().optional(),
    primaryReleaseDateLte: zod_1.z.coerce.string().optional(),
    firstAirDateGte: zod_1.z.coerce.string().optional(),
    firstAirDateLte: zod_1.z.coerce.string().optional(),
    studio: zod_1.z.coerce.string().optional(),
    genre: zod_1.z.coerce.string().optional(),
    keywords: zod_1.z.coerce.string().optional(),
    excludeKeywords: zod_1.z.coerce.string().optional(),
    language: zod_1.z.coerce.string().optional(),
    withRuntimeGte: zod_1.z.coerce.string().optional(),
    withRuntimeLte: zod_1.z.coerce.string().optional(),
    voteAverageGte: zod_1.z.coerce.string().optional(),
    voteAverageLte: zod_1.z.coerce.string().optional(),
    voteCountGte: zod_1.z.coerce.string().optional(),
    voteCountLte: zod_1.z.coerce.string().optional(),
    network: zod_1.z.coerce.string().optional(),
    watchProviders: zod_1.z.coerce.string().optional(),
    watchRegion: zod_1.z.coerce.string().optional(),
    status: zod_1.z.coerce.string().optional(),
    certification: zod_1.z.coerce.string().optional(),
    certificationGte: zod_1.z.coerce.string().optional(),
    certificationLte: zod_1.z.coerce.string().optional(),
    certificationCountry: zod_1.z.coerce.string().optional(),
    certificationMode: zod_1.z.enum(['exact', 'range']).optional(),
});
const ApiQuerySchema = QueryFilterOptions.omit({
    certificationMode: true,
});
discoverRoutes.get('/movies', async (req, res, next) => {
    const tmdb = (0, exports.createTmdbWithRegionLanguage)(req.user);
    try {
        const query = ApiQuerySchema.parse(req.query);
        const keywords = query.keywords;
        const excludeKeywords = query.excludeKeywords;
        const data = await tmdb.getDiscoverMovies({
            page: Number(query.page),
            sortBy: query.sortBy,
            language: req.locale ?? query.language,
            originalLanguage: query.language,
            genre: query.genre,
            studio: query.studio,
            primaryReleaseDateLte: query.primaryReleaseDateLte
                ? new Date(query.primaryReleaseDateLte).toISOString().split('T')[0]
                : undefined,
            primaryReleaseDateGte: query.primaryReleaseDateGte
                ? new Date(query.primaryReleaseDateGte).toISOString().split('T')[0]
                : undefined,
            keywords,
            excludeKeywords,
            withRuntimeGte: query.withRuntimeGte,
            withRuntimeLte: query.withRuntimeLte,
            voteAverageGte: query.voteAverageGte,
            voteAverageLte: query.voteAverageLte,
            voteCountGte: query.voteCountGte,
            voteCountLte: query.voteCountLte,
            watchProviders: query.watchProviders,
            watchRegion: query.watchRegion,
            certification: query.certification,
            certificationGte: query.certificationGte,
            certificationLte: query.certificationLte,
            certificationCountry: query.certificationCountry,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, data.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.MOVIE,
        })));
        let keywordData = [];
        if (keywords) {
            const splitKeywords = keywords.split(',');
            const keywordResults = await Promise.all(splitKeywords.map(async (keywordId) => {
                return await tmdb.getKeywordDetails({ keywordId: Number(keywordId) });
            }));
            keywordData = keywordResults.filter((keyword) => keyword !== null);
        }
        return res.status(200).json({
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results,
            keywords: keywordData,
            results: data.results.map((result) => (0, Search_1.mapMovieResult)(result, media.find((req) => req.tmdbId === result.id && req.mediaType === media_1.MediaType.MOVIE))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving popular movies', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve popular movies.',
        });
    }
});
discoverRoutes.get('/movies/language/:language', async (req, res, next) => {
    const tmdb = (0, exports.createTmdbWithRegionLanguage)(req.user);
    try {
        const languages = await tmdb.getLanguages();
        const language = languages.find((lang) => lang.iso_639_1 === req.params.language);
        if (!language) {
            return next({ status: 404, message: 'Language not found.' });
        }
        const data = await tmdb.getDiscoverMovies({
            page: Number(req.query.page),
            language: req.query.language ?? req.locale,
            originalLanguage: req.params.language,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, data.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.MOVIE,
        })));
        return res.status(200).json({
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results,
            language,
            results: data.results.map((result) => (0, Search_1.mapMovieResult)(result, media.find((req) => req.tmdbId === result.id && req.mediaType === media_1.MediaType.MOVIE))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving movies by language', {
            label: 'API',
            errorMessage: e.message,
            language: req.params.language,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve movies by language.',
        });
    }
});
discoverRoutes.get('/movies/genre/:genreId', async (req, res, next) => {
    const tmdb = (0, exports.createTmdbWithRegionLanguage)(req.user);
    try {
        const genres = await tmdb.getMovieGenres({
            language: req.query.language ?? req.locale,
        });
        const genre = genres.find((genre) => genre.id === Number(req.params.genreId));
        if (!genre) {
            return next({ status: 404, message: 'Genre not found.' });
        }
        const data = await tmdb.getDiscoverMovies({
            page: Number(req.query.page),
            language: req.query.language ?? req.locale,
            genre: req.params.genreId,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, data.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.MOVIE,
        })));
        return res.status(200).json({
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results,
            genre,
            results: data.results.map((result) => (0, Search_1.mapMovieResult)(result, media.find((req) => req.tmdbId === result.id && req.mediaType === media_1.MediaType.MOVIE))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving movies by genre', {
            label: 'API',
            errorMessage: e.message,
            genreId: req.params.genreId,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve movies by genre.',
        });
    }
});
discoverRoutes.get('/movies/studio/:studioId', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const studio = await tmdb.getStudio(Number(req.params.studioId));
        const data = await tmdb.getDiscoverMovies({
            page: Number(req.query.page),
            language: req.query.language ?? req.locale,
            studio: req.params.studioId,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, data.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.MOVIE,
        })));
        return res.status(200).json({
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results,
            studio: (0, Movie_1.mapProductionCompany)(studio),
            results: data.results.map((result) => (0, Search_1.mapMovieResult)(result, media.find((med) => med.tmdbId === result.id && med.mediaType === media_1.MediaType.MOVIE))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving movies by studio', {
            label: 'API',
            errorMessage: e.message,
            studioId: req.params.studioId,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve movies by studio.',
        });
    }
});
discoverRoutes.get('/movies/upcoming', async (req, res, next) => {
    const tmdb = (0, exports.createTmdbWithRegionLanguage)(req.user);
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const date = new Date(now.getTime() - offset * 60 * 1000)
        .toISOString()
        .split('T')[0];
    try {
        const data = await tmdb.getDiscoverMovies({
            page: Number(req.query.page),
            language: req.query.language ?? req.locale,
            primaryReleaseDateGte: date,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, data.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.MOVIE,
        })));
        return res.status(200).json({
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results,
            results: data.results.map((result) => (0, Search_1.mapMovieResult)(result, media.find((med) => med.tmdbId === result.id && med.mediaType === media_1.MediaType.MOVIE))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving upcoming movies', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve upcoming movies.',
        });
    }
});
discoverRoutes.get('/tv', async (req, res, next) => {
    const tmdb = (0, exports.createTmdbWithRegionLanguage)(req.user);
    try {
        const query = ApiQuerySchema.parse(req.query);
        const keywords = query.keywords;
        const excludeKeywords = query.excludeKeywords;
        const data = await tmdb.getDiscoverTv({
            page: Number(query.page),
            sortBy: query.sortBy,
            language: req.locale ?? query.language,
            genre: query.genre,
            network: query.network ? Number(query.network) : undefined,
            firstAirDateLte: query.firstAirDateLte
                ? new Date(query.firstAirDateLte).toISOString().split('T')[0]
                : undefined,
            firstAirDateGte: query.firstAirDateGte
                ? new Date(query.firstAirDateGte).toISOString().split('T')[0]
                : undefined,
            originalLanguage: query.language,
            keywords,
            excludeKeywords,
            withRuntimeGte: query.withRuntimeGte,
            withRuntimeLte: query.withRuntimeLte,
            voteAverageGte: query.voteAverageGte,
            voteAverageLte: query.voteAverageLte,
            voteCountGte: query.voteCountGte,
            voteCountLte: query.voteCountLte,
            watchProviders: query.watchProviders,
            watchRegion: query.watchRegion,
            withStatus: query.status,
            certification: query.certification,
            certificationGte: query.certificationGte,
            certificationLte: query.certificationLte,
            certificationCountry: query.certificationCountry,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, data.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.TV,
        })));
        let keywordData = [];
        if (keywords) {
            const splitKeywords = keywords.split(',');
            const keywordResults = await Promise.all(splitKeywords.map(async (keywordId) => {
                return await tmdb.getKeywordDetails({ keywordId: Number(keywordId) });
            }));
            keywordData = keywordResults.filter((keyword) => keyword !== null);
        }
        return res.status(200).json({
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results,
            keywords: keywordData,
            results: data.results.map((result) => (0, Search_1.mapTvResult)(result, media.find((med) => med.tmdbId === result.id && med.mediaType === media_1.MediaType.TV))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving popular series', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve popular series.',
        });
    }
});
discoverRoutes.get('/tv/language/:language', async (req, res, next) => {
    const tmdb = (0, exports.createTmdbWithRegionLanguage)(req.user);
    try {
        const languages = await tmdb.getLanguages();
        const language = languages.find((lang) => lang.iso_639_1 === req.params.language);
        if (!language) {
            return next({ status: 404, message: 'Language not found.' });
        }
        const data = await tmdb.getDiscoverTv({
            page: Number(req.query.page),
            language: req.query.language ?? req.locale,
            originalLanguage: req.params.language,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, data.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.TV,
        })));
        return res.status(200).json({
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results,
            language,
            results: data.results.map((result) => (0, Search_1.mapTvResult)(result, media.find((med) => med.tmdbId === result.id && med.mediaType === media_1.MediaType.TV))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving series by language', {
            label: 'API',
            errorMessage: e.message,
            language: req.params.language,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve series by language.',
        });
    }
});
discoverRoutes.get('/tv/genre/:genreId', async (req, res, next) => {
    const tmdb = (0, exports.createTmdbWithRegionLanguage)(req.user);
    try {
        const genres = await tmdb.getTvGenres({
            language: req.query.language ?? req.locale,
        });
        const genre = genres.find((genre) => genre.id === Number(req.params.genreId));
        if (!genre) {
            return next({ status: 404, message: 'Genre not found.' });
        }
        const data = await tmdb.getDiscoverTv({
            page: Number(req.query.page),
            language: req.query.language ?? req.locale,
            genre: req.params.genreId,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, data.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.TV,
        })));
        return res.status(200).json({
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results,
            genre,
            results: data.results.map((result) => (0, Search_1.mapTvResult)(result, media.find((med) => med.tmdbId === result.id && med.mediaType === media_1.MediaType.TV))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving series by genre', {
            label: 'API',
            errorMessage: e.message,
            genreId: req.params.genreId,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve series by genre.',
        });
    }
});
discoverRoutes.get('/tv/network/:networkId', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const network = await tmdb.getNetwork(Number(req.params.networkId));
        const data = await tmdb.getDiscoverTv({
            page: Number(req.query.page),
            language: req.query.language ?? req.locale,
            network: Number(req.params.networkId),
        });
        const media = await Media_1.default.getRelatedMedia(req.user, data.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.TV,
        })));
        return res.status(200).json({
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results,
            network: (0, Tv_1.mapNetwork)(network),
            results: data.results.map((result) => (0, Search_1.mapTvResult)(result, media.find((med) => med.tmdbId === result.id && med.mediaType === media_1.MediaType.TV))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving series by network', {
            label: 'API',
            errorMessage: e.message,
            networkId: req.params.networkId,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve series by network.',
        });
    }
});
discoverRoutes.get('/tv/upcoming', async (req, res, next) => {
    const tmdb = (0, exports.createTmdbWithRegionLanguage)(req.user);
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const date = new Date(now.getTime() - offset * 60 * 1000)
        .toISOString()
        .split('T')[0];
    try {
        const data = await tmdb.getDiscoverTv({
            page: Number(req.query.page),
            language: req.query.language ?? req.locale,
            firstAirDateGte: date,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, data.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.TV,
        })));
        return res.status(200).json({
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results,
            results: data.results.map((result) => (0, Search_1.mapTvResult)(result, media.find((med) => med.tmdbId === result.id && med.mediaType === media_1.MediaType.TV))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving upcoming series', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve upcoming series.',
        });
    }
});
discoverRoutes.get('/trending', async (req, res, next) => {
    const tmdb = (0, exports.createTmdbWithRegionLanguage)(req.user);
    try {
        const mediaType = req.query.mediaType ?? 'all';
        const timeWindow = req.query.timeWindow === 'week' ? 'week' : 'day';
        const language = req.query.language ?? req.locale;
        const page = Number(req.query.page);
        const trendingFetchers = {
            movie: async () => ({
                data: await tmdb.getMovieTrending({ page, language, timeWindow }),
                mapper: Search_1.mapMovieResult,
                type: media_1.MediaType.MOVIE,
            }),
            tv: async () => ({
                data: await tmdb.getTvTrending({ page, language, timeWindow }),
                mapper: Search_1.mapTvResult,
                type: media_1.MediaType.TV,
            }),
            all: async () => ({
                data: await tmdb.getAllTrending({ page, language, timeWindow }),
                mapper: (result, media) => {
                    if ((0, typeHelpers_1.isMovie)(result)) {
                        return (0, Search_1.mapMovieResult)(result, media);
                    }
                    else if ((0, typeHelpers_1.isPerson)(result)) {
                        return (0, Search_1.mapPersonResult)(result);
                    }
                    else if ((0, typeHelpers_1.isCollection)(result)) {
                        return (0, Search_1.mapCollectionResult)(result);
                    }
                    else {
                        return (0, Search_1.mapTvResult)(result, media);
                    }
                },
                type: null,
            }),
        };
        const { data, mapper, type } = await trendingFetchers[mediaType]();
        const media = await Media_1.default.getRelatedMedia(req.user, data.results.map((result) => ({
            tmdbId: result.id,
            mediaType: (0, typeHelpers_1.isMovie)(result) ? media_1.MediaType.MOVIE : media_1.MediaType.TV,
        })));
        return res.status(200).json({
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results,
            results: data.results.map((result) => {
                // - If "type" is set (case: "movie" or "tv"), the mediaType must also match.
                // - If "type" is not set (case: "all"), only filter by tmdbId.
                const selectedMedia = media.find((med) => med.tmdbId === result.id && (type ? med.mediaType === type : true));
                return mapper(result, selectedMedia);
            }),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving trending items', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve trending items.',
        });
    }
});
discoverRoutes.get('/keyword/:keywordId/movies', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const data = await tmdb.getMoviesByKeyword({
            keywordId: Number(req.params.keywordId),
            page: Number(req.query.page),
            language: req.query.language ?? req.locale,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, data.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.MOVIE,
        })));
        return res.status(200).json({
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results,
            results: data.results.map((result) => (0, Search_1.mapMovieResult)(result, media.find((med) => med.tmdbId === result.id && med.mediaType === media_1.MediaType.MOVIE))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving movies by keyword', {
            label: 'API',
            errorMessage: e.message,
            keywordId: req.params.keywordId,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve movies by keyword.',
        });
    }
});
discoverRoutes.get('/genreslider/movie', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const mappedGenres = [];
        const genres = await tmdb.getMovieGenres({
            language: req.query.language ?? req.locale,
        });
        await Promise.all(genres.map(async (genre) => {
            const genreData = await tmdb.getDiscoverMovies({
                genre: genre.id.toString(),
            });
            mappedGenres.push({
                id: genre.id,
                name: genre.name,
                backdrops: genreData.results
                    .filter((title) => !!title.backdrop_path)
                    .map((title) => title.backdrop_path),
            });
        }));
        const sortedData = (0, lodash_1.sortBy)(mappedGenres, 'name');
        return res.status(200).json(sortedData);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving the movie genre slider', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve movie genre slider.',
        });
    }
});
discoverRoutes.get('/genreslider/tv', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const mappedGenres = [];
        const genres = await tmdb.getTvGenres({
            language: req.query.language ?? req.locale,
        });
        await Promise.all(genres.map(async (genre) => {
            const genreData = await tmdb.getDiscoverTv({
                genre: genre.id.toString(),
            });
            mappedGenres.push({
                id: genre.id,
                name: genre.name,
                backdrops: genreData.results
                    .filter((title) => !!title.backdrop_path)
                    .map((title) => title.backdrop_path),
            });
        }));
        const sortedData = (0, lodash_1.sortBy)(mappedGenres, 'name');
        return res.status(200).json(sortedData);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving the series genre slider', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve series genre slider.',
        });
    }
});
discoverRoutes.get('/watchlist', async (req, res) => {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const itemsPerPage = 20;
    const page = req.query.page ? Number(req.query.page) : 1;
    const offset = (page - 1) * itemsPerPage;
    const activeUser = await userRepository.findOne({
        where: { id: req.user?.id },
        select: ['id', 'plexToken'],
    });
    if (activeUser && !activeUser?.plexToken) {
        // Non-Plex users can only see their own watchlist
        const [result, total] = await (0, datasource_1.getRepository)(Watchlist_1.Watchlist).findAndCount({
            where: { requestedBy: { id: activeUser?.id } },
            relations: {
            /*requestedBy: true,media:true*/
            },
            // loadRelationIds: true,
            take: itemsPerPage,
            skip: offset,
        });
        if (total) {
            return res.json({
                page: page,
                totalPages: Math.ceil(total / itemsPerPage),
                totalResults: total,
                results: result,
            });
        }
    }
    if (!activeUser?.plexToken) {
        // We will just return an empty array if the user has no Plex token
        return res.json({
            page: 1,
            totalPages: 1,
            totalResults: 0,
            results: [],
        });
    }
    // List watchlist from Plex
    const plexTV = new plextv_1.default(activeUser.plexToken);
    const watchlist = await plexTV.getWatchlist({ offset });
    return res.json({
        page,
        totalPages: Math.ceil(watchlist.totalSize / itemsPerPage),
        totalResults: watchlist.totalSize,
        results: watchlist.items.map((item) => ({
            id: item.tmdbId,
            ratingKey: item.ratingKey,
            title: item.title,
            mediaType: item.type === 'show' ? 'tv' : 'movie',
            tmdbId: item.tmdbId,
        })),
    });
});
exports.default = discoverRoutes;

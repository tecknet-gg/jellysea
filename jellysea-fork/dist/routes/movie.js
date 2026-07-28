"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const imdbRadarrProxy_1 = __importDefault(require("../api/rating/imdbRadarrProxy"));
const rottentomatoes_1 = __importDefault(require("../api/rating/rottentomatoes"));
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const media_1 = require("../constants/media");
const datasource_1 = require("../datasource");
const Media_1 = __importDefault(require("../entity/Media"));
const Watchlist_1 = require("../entity/Watchlist");
const logger_1 = __importDefault(require("../logger"));
const Movie_1 = require("../models/Movie");
const Search_1 = require("../models/Search");
const express_1 = require("express");
const movieRoutes = (0, express_1.Router)();
movieRoutes.get('/:id', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const tmdbMovie = await tmdb.getMovie({
            movieId: Number(req.params.id),
            language: req.query.language ?? req.locale,
        });
        const media = await Media_1.default.getMedia(tmdbMovie.id, media_1.MediaType.MOVIE);
        const onUserWatchlist = await (0, datasource_1.getRepository)(Watchlist_1.Watchlist).exist({
            where: {
                tmdbId: Number(req.params.id),
                mediaType: media_1.MediaType.MOVIE,
                requestedBy: {
                    id: req.user?.id,
                },
            },
        });
        const data = (0, Movie_1.mapMovieDetails)(tmdbMovie, media, onUserWatchlist);
        // TMDB issue where it doesnt fallback to English when no overview is available in requested locale.
        if (!data.overview) {
            const tvEnglish = await tmdb.getMovie({ movieId: Number(req.params.id) });
            data.overview = tvEnglish.overview;
        }
        return res.status(200).json(data);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving movie', {
            label: 'API',
            errorMessage: e.message,
            movieId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve movie.',
        });
    }
});
movieRoutes.get('/:id/recommendations', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const results = await tmdb.getMovieRecommendations({
            movieId: Number(req.params.id),
            page: Number(req.query.page),
            language: req.query.language ?? req.locale,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, results.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.MOVIE,
        })));
        return res.status(200).json({
            page: results.page,
            totalPages: results.total_pages,
            totalResults: results.total_results,
            results: results.results.map((result) => (0, Search_1.mapMovieResult)(result, media.find((req) => req.tmdbId === result.id && req.mediaType === media_1.MediaType.MOVIE))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving movie recommendations', {
            label: 'API',
            errorMessage: e.message,
            movieId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve movie recommendations.',
        });
    }
});
movieRoutes.get('/:id/similar', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const results = await tmdb.getMovieSimilar({
            movieId: Number(req.params.id),
            page: Number(req.query.page),
            language: req.query.language ?? req.locale,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, results.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.MOVIE,
        })));
        return res.status(200).json({
            page: results.page,
            totalPages: results.total_pages,
            totalResults: results.total_results,
            results: results.results.map((result) => (0, Search_1.mapMovieResult)(result, media.find((req) => req.tmdbId === result.id && req.mediaType === media_1.MediaType.MOVIE))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving similar movies', {
            label: 'API',
            errorMessage: e.message,
            movieId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve similar movies.',
        });
    }
});
/**
 * Endpoint backed by RottenTomatoes
 */
movieRoutes.get('/:id/ratings', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    const rtapi = new rottentomatoes_1.default();
    try {
        const movie = await tmdb.getMovie({
            movieId: Number(req.params.id),
        });
        const rtratings = await rtapi.getMovieRatings(movie.title, Number(movie.release_date.slice(0, 4)));
        if (!rtratings) {
            return next({
                status: 404,
                message: 'Rotten Tomatoes ratings not found.',
            });
        }
        return res.status(200).json(rtratings);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving movie ratings', {
            label: 'API',
            errorMessage: e.message,
            movieId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve movie ratings.',
        });
    }
});
/**
 * Endpoint combining RottenTomatoes and IMDB
 */
movieRoutes.get('/:id/ratingscombined', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    const rtapi = new rottentomatoes_1.default();
    const imdbApi = new imdbRadarrProxy_1.default();
    try {
        const movie = await tmdb.getMovie({
            movieId: Number(req.params.id),
        });
        const rtratings = await rtapi.getMovieRatings(movie.title, Number(movie.release_date.slice(0, 4)));
        let imdbRatings;
        if (movie.imdb_id) {
            imdbRatings = await imdbApi.getMovieRatings(movie.imdb_id);
        }
        if (!rtratings && !imdbRatings) {
            return next({
                status: 404,
                message: 'No ratings found.',
            });
        }
        const ratings = {
            ...(rtratings ? { rt: rtratings } : {}),
            ...(imdbRatings ? { imdb: imdbRatings } : {}),
        };
        return res.status(200).json(ratings);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving movie ratings', {
            label: 'API',
            errorMessage: e.message,
            movieId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve movie ratings.',
        });
    }
});
exports.default = movieRoutes;

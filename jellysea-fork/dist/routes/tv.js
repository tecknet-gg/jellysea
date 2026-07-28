"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const metadata_1 = require("../api/metadata");
const rottentomatoes_1 = __importDefault(require("../api/rating/rottentomatoes"));
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const constants_1 = require("../api/themoviedb/constants");
const media_1 = require("../constants/media");
const datasource_1 = require("../datasource");
const Media_1 = __importDefault(require("../entity/Media"));
const Watchlist_1 = require("../entity/Watchlist");
const logger_1 = __importDefault(require("../logger"));
const Search_1 = require("../models/Search");
const Tv_1 = require("../models/Tv");
const express_1 = require("express");
const tvRoutes = (0, express_1.Router)();
tvRoutes.get('/:id', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const tmdbTv = await tmdb.getTvShow({
            tvId: Number(req.params.id),
        });
        const metadataProvider = tmdbTv.keywords.results.some((keyword) => keyword.id === constants_1.ANIME_KEYWORD_ID)
            ? await (0, metadata_1.getMetadataProvider)('anime')
            : await (0, metadata_1.getMetadataProvider)('tv');
        const tv = await metadataProvider.getTvShow({
            tvId: Number(req.params.id),
            language: req.query.language ?? req.locale,
        });
        const media = await Media_1.default.getMedia(tv.id, media_1.MediaType.TV);
        const onUserWatchlist = await (0, datasource_1.getRepository)(Watchlist_1.Watchlist).exist({
            where: {
                tmdbId: Number(req.params.id),
                mediaType: media_1.MediaType.TV,
                requestedBy: {
                    id: req.user?.id,
                },
            },
        });
        const data = (0, Tv_1.mapTvDetails)(tv, media, onUserWatchlist);
        // TMDB issue where it doesnt fallback to English when no overview is available in requested locale.
        if (!data.overview) {
            const tvEnglish = await metadataProvider.getTvShow({
                tvId: Number(req.params.id),
            });
            data.overview = tvEnglish.overview;
        }
        return res.status(200).json(data);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving series', {
            label: 'API',
            errorMessage: e.message,
            tvId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve series.',
        });
    }
});
tvRoutes.get('/:id/season/:seasonNumber', async (req, res, next) => {
    try {
        const tmdb = new themoviedb_1.default();
        const tmdbTv = await tmdb.getTvShow({
            tvId: Number(req.params.id),
        });
        const metadataProvider = tmdbTv.keywords.results.some((keyword) => keyword.id === constants_1.ANIME_KEYWORD_ID)
            ? await (0, metadata_1.getMetadataProvider)('anime')
            : await (0, metadata_1.getMetadataProvider)('tv');
        const season = await metadataProvider.getTvSeason({
            tvId: Number(req.params.id),
            seasonNumber: Number(req.params.seasonNumber),
            language: req.query.language ?? req.locale,
        });
        return res.status(200).json((0, Tv_1.mapSeasonWithEpisodes)(season));
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving season', {
            label: 'API',
            errorMessage: e.message,
            tvId: req.params.id,
            seasonNumber: req.params.seasonNumber,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve season.',
        });
    }
});
tvRoutes.get('/:id/recommendations', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const results = await tmdb.getTvRecommendations({
            tvId: Number(req.params.id),
            page: Number(req.query.page),
            language: req.query.language ?? req.locale,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, results.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.TV,
        })));
        return res.status(200).json({
            page: results.page,
            totalPages: results.total_pages,
            totalResults: results.total_results,
            results: results.results.map((result) => (0, Search_1.mapTvResult)(result, media.find((req) => req.tmdbId === result.id && req.mediaType === media_1.MediaType.TV))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving series recommendations', {
            label: 'API',
            errorMessage: e.message,
            tvId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve series recommendations.',
        });
    }
});
tvRoutes.get('/:id/similar', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const results = await tmdb.getTvSimilar({
            tvId: Number(req.params.id),
            page: Number(req.query.page),
            language: req.query.language ?? req.locale,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, results.results.map((result) => ({
            tmdbId: result.id,
            mediaType: media_1.MediaType.TV,
        })));
        return res.status(200).json({
            page: results.page,
            totalPages: results.total_pages,
            totalResults: results.total_results,
            results: results.results.map((result) => (0, Search_1.mapTvResult)(result, media.find((req) => req.tmdbId === result.id && req.mediaType === media_1.MediaType.TV))),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving similar series', {
            label: 'API',
            errorMessage: e.message,
            tvId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve similar series.',
        });
    }
});
tvRoutes.get('/:id/ratings', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    const rtapi = new rottentomatoes_1.default();
    try {
        const tv = await tmdb.getTvShow({
            tvId: Number(req.params.id),
        });
        const rtratings = await rtapi.getTVRatings(tv.name, tv.first_air_date ? Number(tv.first_air_date.slice(0, 4)) : undefined);
        if (!rtratings) {
            return next({
                status: 404,
                message: 'Rotten Tomatoes ratings not found.',
            });
        }
        return res.status(200).json(rtratings);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving series ratings', {
            label: 'API',
            errorMessage: e.message,
            tvId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve series ratings.',
        });
    }
});
exports.default = tvRoutes;

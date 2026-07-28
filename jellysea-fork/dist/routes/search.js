"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const Media_1 = __importDefault(require("../entity/Media"));
const search_1 = require("../lib/search");
const logger_1 = __importDefault(require("../logger"));
const Search_1 = require("../models/Search");
const express_1 = require("express");
const searchRoutes = (0, express_1.Router)();
searchRoutes.get('/', async (req, res, next) => {
    const queryString = req.query.query;
    const searchProvider = (0, search_1.findSearchProvider)(queryString.toLowerCase());
    let results;
    try {
        if (searchProvider) {
            const [id] = queryString
                .toLowerCase()
                .match(searchProvider.pattern);
            results = await searchProvider.search({
                id,
                language: req.query.language ?? req.locale,
                query: queryString,
            });
        }
        else {
            const tmdb = new themoviedb_1.default();
            results = await tmdb.searchMulti({
                query: queryString,
                page: Number(req.query.page),
                language: req.query.language ?? req.locale,
            });
        }
        const media = await Media_1.default.getRelatedMedia(req.user, results.results.map((result) => ({
            tmdbId: result.id,
            mediaType: result.media_type,
        })));
        return res.status(200).json({
            page: results.page,
            totalPages: results.total_pages,
            totalResults: results.total_results,
            results: (0, Search_1.mapSearchResults)(results.results, media),
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving search results', {
            label: 'API',
            errorMessage: e.message,
            query: req.query.query,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve search results.',
        });
    }
});
searchRoutes.get('/keyword', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const results = await tmdb.searchKeyword({
            query: req.query.query,
            page: Number(req.query.page),
        });
        return res.status(200).json(results);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving keyword search results', {
            label: 'API',
            errorMessage: e.message,
            query: req.query.query,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve keyword search results.',
        });
    }
});
searchRoutes.get('/company', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const results = await tmdb.searchCompany({
            query: req.query.query,
            page: Number(req.query.page),
        });
        return res.status(200).json(results);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving company search results', {
            label: 'API',
            errorMessage: e.message,
            query: req.query.query,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve company search results.',
        });
    }
});
exports.default = searchRoutes;

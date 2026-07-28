"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const media_1 = require("../constants/media");
const Media_1 = __importDefault(require("../entity/Media"));
const logger_1 = __importDefault(require("../logger"));
const Collection_1 = require("../models/Collection");
const express_1 = require("express");
const collectionRoutes = (0, express_1.Router)();
collectionRoutes.get('/:id', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const collection = await tmdb.getCollection({
            collectionId: Number(req.params.id),
            language: req.query.language ?? req.locale,
        });
        const media = await Media_1.default.getRelatedMedia(req.user, collection.parts.map((part) => ({
            tmdbId: part.id,
            mediaType: media_1.MediaType.MOVIE,
        })));
        return res.status(200).json((0, Collection_1.mapCollection)(collection, media));
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving collection', {
            label: 'API',
            errorMessage: e.message,
            collectionId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve collection.',
        });
    }
});
exports.default = collectionRoutes;

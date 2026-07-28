"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const Media_1 = __importDefault(require("../entity/Media"));
const logger_1 = __importDefault(require("../logger"));
const Person_1 = require("../models/Person");
const express_1 = require("express");
const personRoutes = (0, express_1.Router)();
personRoutes.get('/:id', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const person = await tmdb.getPerson({
            personId: Number(req.params.id),
            language: req.query.language ?? req.locale,
        });
        return res.status(200).json((0, Person_1.mapPersonDetails)(person));
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving person', {
            label: 'API',
            errorMessage: e.message,
            personId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve person.',
        });
    }
});
personRoutes.get('/:id/combined_credits', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const combinedCredits = await tmdb.getPersonCombinedCredits({
            personId: Number(req.params.id),
            language: req.query.language ?? req.locale,
        });
        const castMedia = await Media_1.default.getRelatedMedia(req.user, combinedCredits.cast
            .filter((result) => result.media_type)
            .map((result) => ({
            tmdbId: result.id,
            mediaType: result.media_type,
        })));
        const crewMedia = await Media_1.default.getRelatedMedia(req.user, combinedCredits.crew
            .filter((result) => result.media_type)
            .map((result) => ({
            tmdbId: result.id,
            mediaType: result.media_type,
        })));
        return res.status(200).json({
            cast: combinedCredits.cast
                .map((result) => (0, Person_1.mapCastCredits)(result, castMedia.find((med) => med.tmdbId === result.id && med.mediaType === result.media_type)))
                .filter((item) => !item.adult && item.character !== 'Thanks'),
            crew: combinedCredits.crew
                .map((result) => (0, Person_1.mapCrewCredits)(result, crewMedia.find((med) => med.tmdbId === result.id && med.mediaType === result.media_type)))
                .filter((item) => !item.adult && item.job !== 'Thanks'),
            id: combinedCredits.id,
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving combined credits', {
            label: 'API',
            errorMessage: e.message,
            personId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve combined credits.',
        });
    }
});
exports.default = personRoutes;

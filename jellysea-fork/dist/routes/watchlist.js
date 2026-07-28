"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Watchlist_1 = require("../entity/Watchlist");
const logger_1 = __importDefault(require("../logger"));
const express_1 = require("express");
const typeorm_1 = require("typeorm");
const media_1 = require("../constants/media");
const watchlistCreate_1 = require("../interfaces/api/watchlistCreate");
const watchlistRoutes = (0, express_1.Router)();
watchlistRoutes.post('/', async (req, res, next) => {
    try {
        if (!req.user) {
            return next({
                status: 401,
                message: 'You must be logged in to add watchlist.',
            });
        }
        const values = watchlistCreate_1.watchlistCreate.parse(req.body);
        const request = await Watchlist_1.Watchlist.createWatchlist({
            watchlistRequest: values,
            user: req.user,
        });
        return res.status(201).json(request);
    }
    catch (error) {
        if (!(error instanceof Error)) {
            return;
        }
        switch (error.constructor) {
            case typeorm_1.QueryFailedError:
                logger_1.default.warn('Something wrong with data watchlist', {
                    tmdbId: req.body.tmdbId,
                    mediaType: req.body.mediaType,
                    label: 'Watchlist',
                });
                return next({ status: 409, message: 'Something wrong' });
            case Watchlist_1.DuplicateWatchlistRequestError:
                return next({ status: 409, message: error.message });
            default:
                return next({ status: 500, message: error.message });
        }
    }
});
watchlistRoutes.delete('/:tmdbId', async (req, res, next) => {
    if (!req.user) {
        return next({
            status: 401,
            message: 'You must be logged in to delete watchlist data.',
        });
    }
    try {
        const mediaType = req.query.mediaType;
        if (mediaType !== media_1.MediaType.MOVIE && mediaType !== media_1.MediaType.TV) {
            return next({
                status: 400,
                message: 'Invalid mediaType query parameter.',
            });
        }
        await Watchlist_1.Watchlist.deleteWatchlist(Number(req.params.tmdbId), mediaType, req.user);
        return res.status(204).send();
    }
    catch (e) {
        if (e instanceof Watchlist_1.NotFoundError) {
            return next({
                status: 404,
                message: e.message,
            });
        }
        return next({ status: 500, message: e.message });
    }
});
exports.default = watchlistRoutes;

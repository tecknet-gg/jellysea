"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blocklistAdd = void 0;
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const media_1 = require("../constants/media");
const datasource_1 = __importStar(require("../datasource"));
const Blocklist_1 = require("../entity/Blocklist");
const Media_1 = __importDefault(require("../entity/Media"));
const permissions_1 = require("../lib/permissions");
const logger_1 = __importDefault(require("../logger"));
const auth_1 = require("../middleware/auth");
const express_1 = require("express");
const typeorm_1 = require("typeorm");
const zod_1 = require("zod");
const blocklistRoutes = (0, express_1.Router)();
exports.blocklistAdd = zod_1.z.object({
    tmdbId: zod_1.z.coerce.number(),
    mediaType: zod_1.z.nativeEnum(media_1.MediaType),
    title: zod_1.z.coerce.string().optional(),
    user: zod_1.z.coerce.number(),
    blocklistedTags: zod_1.z.string().optional(),
});
const blocklistGet = zod_1.z.object({
    take: zod_1.z.coerce.number().int().positive().default(25),
    skip: zod_1.z.coerce.number().int().nonnegative().default(0),
    search: zod_1.z.string().optional(),
    filter: zod_1.z.enum(['all', 'manual', 'blocklistedTags']).optional(),
});
blocklistRoutes.get('/', (0, auth_1.isAuthenticated)([permissions_1.Permission.MANAGE_BLOCKLIST, permissions_1.Permission.VIEW_BLOCKLIST], {
    type: 'or',
}), async (req, res, next) => {
    const { take, skip, search, filter } = blocklistGet.parse(req.query);
    try {
        let query = (0, datasource_1.getRepository)(Blocklist_1.Blocklist)
            .createQueryBuilder('blocklist')
            .leftJoinAndSelect('blocklist.user', 'user')
            .where('1 = 1'); // Allow use of andWhere later
        switch (filter) {
            case 'manual':
                query = query.andWhere('blocklist.blocklistedTags IS NULL');
                break;
            case 'blocklistedTags':
                query = query.andWhere('blocklist.blocklistedTags IS NOT NULL');
                break;
        }
        if (search) {
            query = query.andWhere('blocklist.title like :title', {
                title: `%${search}%`,
            });
        }
        const [blocklistedItems, itemsCount] = await query
            .orderBy('blocklist.createdAt', 'DESC')
            .take(take)
            .skip(skip)
            .getManyAndCount();
        return res.status(200).json({
            pageInfo: {
                pages: Math.ceil(itemsCount / take),
                pageSize: take,
                results: itemsCount,
                page: Math.ceil(skip / take) + 1,
            },
            results: blocklistedItems,
        });
    }
    catch (error) {
        logger_1.default.error('Something went wrong while retrieving blocklisted items', {
            label: 'Blocklist',
            errorMessage: error.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve blocklisted items.',
        });
    }
});
blocklistRoutes.get('/:id', (0, auth_1.isAuthenticated)([permissions_1.Permission.MANAGE_BLOCKLIST], {
    type: 'or',
}), async (req, res, next) => {
    const mediaType = req.query.mediaType;
    if (mediaType !== media_1.MediaType.MOVIE && mediaType !== media_1.MediaType.TV) {
        return next({
            status: 400,
            message: 'Invalid or missing mediaType query parameter.',
        });
    }
    try {
        const blocklisteRepository = (0, datasource_1.getRepository)(Blocklist_1.Blocklist);
        const blocklistItem = await blocklisteRepository.findOneOrFail({
            where: {
                tmdbId: Number(req.params.id),
                mediaType,
            },
        });
        return res.status(200).send(blocklistItem);
    }
    catch (e) {
        if (e instanceof typeorm_1.EntityNotFoundError) {
            return next({
                status: 404,
                message: e.message,
            });
        }
        return next({ status: 500, message: e.message });
    }
});
blocklistRoutes.post('/', (0, auth_1.isAuthenticated)([permissions_1.Permission.MANAGE_BLOCKLIST], {
    type: 'or',
}), async (req, res, next) => {
    try {
        const values = exports.blocklistAdd.parse(req.body);
        await Blocklist_1.Blocklist.addToBlocklist({
            blocklistRequest: values,
        });
        return res.status(201).send();
    }
    catch (error) {
        if (!(error instanceof Error)) {
            return;
        }
        if (error instanceof typeorm_1.QueryFailedError) {
            switch (error.driverError.errno) {
                case 19:
                    return next({ status: 412, message: 'Item already blocklisted' });
                default:
                    logger_1.default.warn('Something wrong with data blocklist', {
                        tmdbId: req.body.tmdbId,
                        mediaType: req.body.mediaType,
                        label: 'Blocklist',
                    });
                    return next({ status: 409, message: 'Something wrong' });
            }
        }
        return next({ status: 500, message: error.message });
    }
});
blocklistRoutes.post('/collection/:id', (0, auth_1.isAuthenticated)([permissions_1.Permission.MANAGE_BLOCKLIST], {
    type: 'or',
}), async (req, res, next) => {
    try {
        const tmdb = new themoviedb_1.default();
        const collection = await tmdb.getCollection({
            collectionId: Number(req.params.id),
            language: req.locale,
        });
        const uniqueParts = [
            ...new Map(collection.parts.map((p) => [p.id, p])).values(),
        ];
        const partIds = uniqueParts.map((p) => p.id);
        if (partIds.length === 0) {
            return res.status(201).send();
        }
        await datasource_1.default.transaction(async (em) => {
            const blocklistRepository = em.getRepository(Blocklist_1.Blocklist);
            const mediaRepository = em.getRepository(Media_1.default);
            const [existingBlocklists, existingMedia] = await Promise.all([
                blocklistRepository.find({
                    where: { tmdbId: (0, typeorm_1.In)(partIds), mediaType: media_1.MediaType.MOVIE },
                }),
                mediaRepository.find({
                    where: { tmdbId: (0, typeorm_1.In)(partIds), mediaType: media_1.MediaType.MOVIE },
                }),
            ]);
            const blocklistByTmdbId = new Map(existingBlocklists.map((b) => [b.tmdbId, b]));
            const mediaByTmdbId = new Map(existingMedia.map((m) => [m.tmdbId, m]));
            await Promise.all(uniqueParts.map(async (part) => {
                if (blocklistByTmdbId.has(part.id)) {
                    return;
                }
                let blocklist = new Blocklist_1.Blocklist({
                    tmdbId: part.id,
                    mediaType: media_1.MediaType.MOVIE,
                    title: part.title,
                    user: req.user,
                });
                try {
                    await blocklistRepository.save(blocklist);
                }
                catch (error) {
                    if (!(error instanceof typeorm_1.QueryFailedError) ||
                        error.driverError.errno !== 19) {
                        throw error;
                    }
                    const row = await blocklistRepository.findOne({
                        where: { tmdbId: part.id, mediaType: media_1.MediaType.MOVIE },
                    });
                    if (!row) {
                        throw error;
                    }
                    blocklist = row;
                }
                let media = mediaByTmdbId.get(part.id);
                if (!media) {
                    media = new Media_1.default({
                        tmdbId: part.id,
                        status: media_1.MediaStatus.BLOCKLISTED,
                        status4k: media_1.MediaStatus.BLOCKLISTED,
                        mediaType: media_1.MediaType.MOVIE,
                        blocklist: Promise.resolve(blocklist),
                    });
                }
                else {
                    media.status = media_1.MediaStatus.BLOCKLISTED;
                    media.status4k = media_1.MediaStatus.BLOCKLISTED;
                    media.blocklist = Promise.resolve(blocklist);
                }
                await mediaRepository.save(media);
            }));
        });
        return res.status(201).send();
    }
    catch (e) {
        logger_1.default.error('Error blocklisting collection', {
            label: 'Blocklist',
            errorMessage: e.message,
            collectionId: req.params.id,
        });
        return next({ status: 500, message: e.message });
    }
});
blocklistRoutes.delete('/:id', (0, auth_1.isAuthenticated)([permissions_1.Permission.MANAGE_BLOCKLIST], {
    type: 'or',
}), async (req, res, next) => {
    const mediaType = req.query.mediaType;
    if (mediaType !== media_1.MediaType.MOVIE && mediaType !== media_1.MediaType.TV) {
        return next({
            status: 400,
            message: 'Invalid or missing mediaType query parameter.',
        });
    }
    try {
        const blocklisteRepository = (0, datasource_1.getRepository)(Blocklist_1.Blocklist);
        const blocklistItem = await blocklisteRepository.findOneOrFail({
            where: {
                tmdbId: Number(req.params.id),
                mediaType,
            },
        });
        await blocklisteRepository.remove(blocklistItem);
        const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
        const mediaItem = await mediaRepository.findOneOrFail({
            where: {
                tmdbId: Number(req.params.id),
                mediaType: req.query.mediaType,
            },
        });
        await mediaRepository.remove(mediaItem);
        return res.status(204).send();
    }
    catch (e) {
        if (e instanceof typeorm_1.EntityNotFoundError) {
            return next({
                status: 404,
                message: e.message,
            });
        }
        return next({ status: 500, message: e.message });
    }
});
blocklistRoutes.delete('/collection/:id', (0, auth_1.isAuthenticated)([permissions_1.Permission.MANAGE_BLOCKLIST], {
    type: 'or',
}), async (req, res, next) => {
    try {
        const tmdb = new themoviedb_1.default();
        const collection = await tmdb.getCollection({
            collectionId: Number(req.params.id),
            language: req.locale,
        });
        await datasource_1.default.transaction(async (em) => {
            const blocklistRepository = em.getRepository(Blocklist_1.Blocklist);
            const mediaRepository = em.getRepository(Media_1.default);
            await Promise.all(collection.parts.map(async (part) => {
                const blocklistItem = await blocklistRepository.findOne({
                    where: { tmdbId: part.id, mediaType: media_1.MediaType.MOVIE },
                });
                if (blocklistItem) {
                    await blocklistRepository.remove(blocklistItem);
                    const mediaItem = await mediaRepository.findOne({
                        where: { tmdbId: part.id, mediaType: media_1.MediaType.MOVIE },
                    });
                    if (mediaItem) {
                        await mediaRepository.remove(mediaItem);
                    }
                }
            }));
        });
        return res.status(204).send();
    }
    catch (e) {
        logger_1.default.error('Error unblocklisting collection', {
            label: 'Blocklist',
            errorMessage: e.message,
            collectionId: req.params.id,
        });
        return next({ status: 500, message: e.message });
    }
});
exports.default = blocklistRoutes;

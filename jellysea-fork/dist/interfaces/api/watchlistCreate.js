"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchlistCreate = void 0;
const media_1 = require("../../constants/media");
const zod_1 = require("zod");
exports.watchlistCreate = zod_1.z.object({
    ratingKey: zod_1.z.coerce.string().optional(),
    tmdbId: zod_1.z.coerce.number(),
    mediaType: zod_1.z.nativeEnum(media_1.MediaType),
    title: zod_1.z.coerce.string().optional(),
});

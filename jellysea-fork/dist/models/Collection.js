"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapCollection = void 0;
const media_1 = require("../constants/media");
const lodash_1 = require("lodash");
const Search_1 = require("./Search");
const mapCollection = (collection, media) => ({
    id: collection.id,
    name: collection.name,
    overview: collection.overview,
    posterPath: collection.poster_path,
    backdropPath: collection.backdrop_path,
    parts: (0, lodash_1.sortBy)(collection.parts, 'release_date').map((part) => (0, Search_1.mapMovieResult)(part, media?.find((req) => req.tmdbId === part.id && req.mediaType === media_1.MediaType.MOVIE))),
});
exports.mapCollection = mapCollection;

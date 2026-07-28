"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findSearchProvider = void 0;
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const Search_1 = require("../models/Search");
const typeHelpers_1 = require("../utils/typeHelpers");
const searchProviders = [];
const findSearchProvider = (query) => {
    return searchProviders.find((provider) => provider.pattern.test(query));
};
exports.findSearchProvider = findSearchProvider;
searchProviders.push({
    pattern: new RegExp(/(?<=tmdb:)\d+/),
    search: async ({ id, language }) => {
        const tmdb = new themoviedb_1.default();
        const moviePromise = tmdb.getMovie({ movieId: parseInt(id), language });
        const tvShowPromise = tmdb.getTvShow({ tvId: parseInt(id), language });
        const personPromise = tmdb.getPerson({ personId: parseInt(id), language });
        const responses = await Promise.allSettled([
            moviePromise,
            tvShowPromise,
            personPromise,
        ]);
        const successfulResponses = responses.filter((r) => r.status === 'fulfilled');
        const results = [];
        if (successfulResponses.length) {
            results.push(...successfulResponses.map((r) => {
                if ((0, typeHelpers_1.isMovieDetails)(r.value)) {
                    return (0, Search_1.mapMovieDetailsToResult)(r.value);
                }
                else if ((0, typeHelpers_1.isTvDetails)(r.value)) {
                    return (0, Search_1.mapTvDetailsToResult)(r.value);
                }
                else {
                    return (0, Search_1.mapPersonDetailsToResult)(r.value);
                }
            }));
        }
        return {
            page: 1,
            total_pages: 1,
            total_results: results.length,
            results,
        };
    },
});
searchProviders.push({
    pattern: new RegExp(/(?<=imdb:)(tt|nm)\d+/),
    search: async ({ id, language }) => {
        const tmdb = new themoviedb_1.default();
        const responses = await tmdb.getByExternalId({
            externalId: id,
            type: 'imdb',
            language,
        });
        const results = [];
        // set the media_type here since searching by external id doesn't return it
        results.push(...responses.movie_results.map((movie) => ({
            ...movie,
            media_type: 'movie',
        })), ...responses.tv_results.map((tv) => ({
            ...tv,
            media_type: 'tv',
        })), ...responses.person_results.map((person) => ({
            ...person,
            media_type: 'person',
        })));
        return {
            page: 1,
            total_pages: 1,
            total_results: results.length,
            results,
        };
    },
});
searchProviders.push({
    pattern: new RegExp(/(?<=tvdb:)\d+/),
    search: async ({ id, language }) => {
        const tmdb = new themoviedb_1.default();
        const responses = await tmdb.getByExternalId({
            externalId: parseInt(id),
            type: 'tvdb',
            language,
        });
        const results = [];
        // set the media_type here since searching by external id doesn't return it
        results.push(...responses.movie_results.map((movie) => ({
            ...movie,
            media_type: 'movie',
        })), ...responses.tv_results.map((tv) => ({
            ...tv,
            media_type: 'tv',
        })), ...responses.person_results.map((person) => ({
            ...person,
            media_type: 'person',
        })));
        return {
            page: 1,
            total_pages: 1,
            total_results: results.length,
            results,
        };
    },
});
searchProviders.push({
    pattern: new RegExp(/(?<=year:)\d{4}/),
    search: async ({ id: year, query }) => {
        const tmdb = new themoviedb_1.default();
        const moviesPromise = tmdb.searchMovies({
            query: query?.replace(new RegExp(/year:\d{4}/), '') ?? '',
            year: parseInt(year),
        });
        const tvShowsPromise = tmdb.searchTvShows({
            query: query?.replace(new RegExp(/year:\d{4}/), '') ?? '',
            year: parseInt(year),
        });
        const responses = await Promise.allSettled([moviesPromise, tvShowsPromise]);
        const successfulResponses = responses.filter((r) => r.status === 'fulfilled');
        const results = [];
        if (successfulResponses.length) {
            successfulResponses.forEach((response) => {
                response.value.results.forEach((result) => 
                // set the media_type here since the search endpoints don't return it
                results.push((0, typeHelpers_1.isMovie)(result)
                    ? { ...result, media_type: 'movie' }
                    : { ...result, media_type: 'tv' }));
            });
        }
        return {
            page: 1,
            total_pages: 1,
            total_results: results.length,
            results,
        };
    },
});

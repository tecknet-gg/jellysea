"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTvDetails = exports.isMovieDetails = exports.isCollection = exports.isPerson = exports.isMovie = void 0;
const isMovie = (movie) => {
    return movie.title !== undefined;
};
exports.isMovie = isMovie;
const isPerson = (person) => {
    return person.known_for !== undefined;
};
exports.isPerson = isPerson;
const isCollection = (collection) => {
    return collection.media_type === 'collection';
};
exports.isCollection = isCollection;
const isMovieDetails = (movie) => {
    return movie.title !== undefined;
};
exports.isMovieDetails = isMovieDetails;
const isTvDetails = (tv) => {
    return tv.number_of_seasons !== undefined;
};
exports.isTvDetails = isTvDetails;

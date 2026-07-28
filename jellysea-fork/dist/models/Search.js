"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapPersonDetailsToResult = exports.mapTvDetailsToResult = exports.mapMovieDetailsToResult = exports.mapSearchResults = exports.mapPersonResult = exports.mapCollectionResult = exports.mapTvResult = exports.mapMovieResult = void 0;
const media_1 = require("../constants/media");
const mapMovieResult = (movieResult, media) => ({
    id: movieResult.id,
    mediaType: 'movie',
    adult: movieResult.adult,
    genreIds: movieResult.genre_ids,
    originalLanguage: movieResult.original_language,
    originalTitle: movieResult.original_title,
    overview: movieResult.overview,
    popularity: movieResult.popularity,
    releaseDate: movieResult.release_date,
    title: movieResult.title,
    video: movieResult.video,
    voteAverage: movieResult.vote_average,
    voteCount: movieResult.vote_count,
    backdropPath: movieResult.backdrop_path,
    posterPath: movieResult.poster_path,
    mediaInfo: media,
});
exports.mapMovieResult = mapMovieResult;
const mapTvResult = (tvResult, media) => ({
    id: tvResult.id,
    firstAirDate: tvResult.first_air_date,
    genreIds: tvResult.genre_ids,
    // Some results from tmdb dont return the mediaType so we force it here!
    mediaType: tvResult.media_type || 'tv',
    name: tvResult.name,
    originCountry: tvResult.origin_country,
    originalLanguage: tvResult.original_language,
    originalName: tvResult.original_name,
    overview: tvResult.overview,
    popularity: tvResult.popularity,
    voteAverage: tvResult.vote_average,
    voteCount: tvResult.vote_count,
    backdropPath: tvResult.backdrop_path,
    posterPath: tvResult.poster_path,
    mediaInfo: media,
});
exports.mapTvResult = mapTvResult;
const mapCollectionResult = (collectionResult) => ({
    id: collectionResult.id,
    mediaType: collectionResult.media_type || 'collection',
    adult: collectionResult.adult,
    originalLanguage: collectionResult.original_language,
    originalTitle: collectionResult.original_title,
    title: collectionResult.title,
    overview: collectionResult.overview,
    backdropPath: collectionResult.backdrop_path,
    posterPath: collectionResult.poster_path,
});
exports.mapCollectionResult = mapCollectionResult;
const mapPersonResult = (personResult) => ({
    id: personResult.id,
    name: personResult.name,
    popularity: personResult.popularity,
    adult: personResult.adult,
    mediaType: personResult.media_type,
    profilePath: personResult.profile_path,
    knownFor: personResult.known_for.map((result) => {
        if (result.media_type === 'movie') {
            return (0, exports.mapMovieResult)(result);
        }
        return (0, exports.mapTvResult)(result);
    }),
});
exports.mapPersonResult = mapPersonResult;
const mapSearchResults = (results, media) => results.map((result) => {
    switch (result.media_type) {
        case 'movie':
            return (0, exports.mapMovieResult)(result, media?.find((req) => req.tmdbId === result.id && req.mediaType === media_1.MediaType.MOVIE));
        case 'tv':
            return (0, exports.mapTvResult)(result, media?.find((req) => req.tmdbId === result.id && req.mediaType === media_1.MediaType.TV));
        case 'collection':
            return (0, exports.mapCollectionResult)(result);
        default:
            return (0, exports.mapPersonResult)(result);
    }
});
exports.mapSearchResults = mapSearchResults;
const mapMovieDetailsToResult = (movieDetails) => ({
    id: movieDetails.id,
    media_type: 'movie',
    adult: movieDetails.adult,
    genre_ids: movieDetails.genres.map((genre) => genre.id),
    original_language: movieDetails.original_language,
    original_title: movieDetails.original_title,
    overview: movieDetails.overview ?? '',
    popularity: movieDetails.popularity,
    release_date: movieDetails.release_date,
    title: movieDetails.title,
    video: movieDetails.video,
    vote_average: movieDetails.vote_average,
    vote_count: movieDetails.vote_count,
    backdrop_path: movieDetails.backdrop_path,
    poster_path: movieDetails.poster_path,
});
exports.mapMovieDetailsToResult = mapMovieDetailsToResult;
const mapTvDetailsToResult = (tvDetails) => ({
    id: tvDetails.id,
    media_type: 'tv',
    first_air_date: tvDetails.first_air_date,
    genre_ids: tvDetails.genres.map((genre) => genre.id),
    name: tvDetails.name,
    origin_country: tvDetails.origin_country,
    original_language: tvDetails.original_language,
    original_name: tvDetails.original_name,
    overview: tvDetails.overview,
    popularity: tvDetails.popularity,
    vote_average: tvDetails.vote_average,
    vote_count: tvDetails.vote_count,
    backdrop_path: tvDetails.backdrop_path,
    poster_path: tvDetails.poster_path,
});
exports.mapTvDetailsToResult = mapTvDetailsToResult;
const mapPersonDetailsToResult = (personDetails) => ({
    id: personDetails.id,
    media_type: 'person',
    name: personDetails.name,
    popularity: personDetails.popularity,
    adult: personDetails.adult,
    profile_path: personDetails.profile_path,
    known_for: [],
});
exports.mapPersonDetailsToResult = mapPersonDetailsToResult;

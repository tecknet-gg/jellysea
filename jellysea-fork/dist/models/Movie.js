"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapMovieDetails = exports.mapProductionCompany = void 0;
const common_1 = require("./common");
const mapProductionCompany = (company) => ({
    id: company.id,
    name: company.name,
    originCountry: company.origin_country,
    description: company.description,
    headquarters: company.headquarters,
    homepage: company.homepage,
    logoPath: company.logo_path,
});
exports.mapProductionCompany = mapProductionCompany;
const mapMovieDetails = (movie, media, userWatchlist) => ({
    id: movie.id,
    adult: movie.adult,
    budget: movie.budget,
    genres: movie.genres,
    relatedVideos: (0, common_1.mapVideos)(movie.videos),
    originalLanguage: movie.original_language,
    originalTitle: movie.original_title,
    popularity: movie.popularity,
    productionCompanies: movie.production_companies.map(exports.mapProductionCompany),
    productionCountries: movie.production_countries,
    releaseDate: movie.release_date,
    releases: movie.release_dates,
    revenue: movie.revenue,
    spokenLanguages: movie.spoken_languages,
    status: movie.status,
    title: movie.title,
    video: movie.video,
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    backdropPath: movie.backdrop_path,
    homepage: movie.homepage,
    imdbId: movie.imdb_id,
    overview: movie.overview,
    posterPath: movie.poster_path,
    runtime: movie.runtime,
    tagline: movie.tagline,
    credits: {
        cast: movie.credits.cast.map(common_1.mapCast),
        crew: movie.credits.crew.map(common_1.mapCrew),
    },
    collection: movie.belongs_to_collection
        ? {
            id: movie.belongs_to_collection.id,
            name: movie.belongs_to_collection.name,
            posterPath: movie.belongs_to_collection.poster_path,
            backdropPath: movie.belongs_to_collection.backdrop_path,
        }
        : undefined,
    externalIds: (0, common_1.mapExternalIds)(movie.external_ids),
    mediaInfo: media,
    watchProviders: (0, common_1.mapWatchProviders)(movie['watch/providers']?.results ?? {}),
    keywords: movie.keywords.keywords.map((keyword) => ({
        id: keyword.id,
        name: keyword.name,
    })),
    onUserWatchlist: userWatchlist,
});
exports.mapMovieDetails = mapMovieDetails;

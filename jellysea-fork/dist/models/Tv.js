"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapTvDetails = exports.mapNetwork = exports.mapSeasonWithEpisodes = void 0;
const common_1 = require("./common");
const mapEpisodeResult = (episode) => ({
    id: episode.id,
    airDate: episode.air_date,
    episodeNumber: episode.episode_number,
    name: episode.name,
    overview: episode.overview,
    productionCode: episode.production_code,
    seasonNumber: episode.season_number,
    showId: episode.show_id,
    voteAverage: episode.vote_average,
    voteCount: episode.vote_count,
    stillPath: episode.still_path,
});
const mapSeasonResult = (season) => ({
    airDate: season.air_date,
    episodeCount: season.episode_count,
    id: season.id,
    name: season.name,
    overview: season.overview,
    seasonNumber: season.season_number,
    posterPath: season.poster_path,
});
const mapSeasonWithEpisodes = (season) => ({
    airDate: season.air_date,
    episodes: season.episodes.map(mapEpisodeResult),
    externalIds: (0, common_1.mapExternalIds)(season.external_ids),
    id: season.id,
    name: season.name,
    overview: season.overview,
    seasonNumber: season.season_number,
    posterPath: season.poster_path,
});
exports.mapSeasonWithEpisodes = mapSeasonWithEpisodes;
const mapNetwork = (network) => ({
    id: network.id,
    name: network.name,
    originCountry: network.origin_country,
    headquarters: network.headquarters,
    homepage: network.homepage,
    logoPath: network.logo_path,
});
exports.mapNetwork = mapNetwork;
const mapTvDetails = (show, media, userWatchlist) => ({
    createdBy: show.created_by,
    episodeRunTime: show.episode_run_time,
    firstAirDate: show.first_air_date,
    genres: show.genres.map((genre) => ({
        id: genre.id,
        name: genre.name,
    })),
    relatedVideos: (0, common_1.mapVideos)(show.videos),
    homepage: show.homepage,
    id: show.id,
    inProduction: show.in_production,
    languages: show.languages,
    lastAirDate: show.last_air_date,
    name: show.name,
    networks: show.networks.map(exports.mapNetwork),
    numberOfEpisodes: show.number_of_episodes,
    numberOfSeasons: show.number_of_seasons,
    originCountry: show.origin_country,
    originalLanguage: show.original_language,
    originalName: show.original_name,
    tagline: show.tagline,
    overview: show.overview,
    popularity: show.popularity,
    productionCompanies: show.production_companies.map((company) => ({
        id: company.id,
        name: company.name,
        originCountry: company.origin_country,
        logoPath: company.logo_path,
    })),
    productionCountries: show.production_countries,
    contentRatings: show.content_ratings,
    spokenLanguages: show.spoken_languages.map((language) => ({
        englishName: language.english_name,
        iso_639_1: language.iso_639_1,
        name: language.name,
    })),
    seasons: show.seasons.map(mapSeasonResult),
    status: show.status,
    type: show.type,
    voteAverage: show.vote_average,
    voteCount: show.vote_count,
    backdropPath: show.backdrop_path,
    lastEpisodeToAir: show.last_episode_to_air
        ? mapEpisodeResult(show.last_episode_to_air)
        : undefined,
    nextEpisodeToAir: show.next_episode_to_air
        ? mapEpisodeResult(show.next_episode_to_air)
        : undefined,
    posterPath: show.poster_path,
    credits: {
        cast: show.aggregate_credits.cast.map(common_1.mapAggregateCast),
        crew: show.credits.crew.map(common_1.mapCrew),
    },
    externalIds: (0, common_1.mapExternalIds)(show.external_ids),
    keywords: show.keywords.results.map((keyword) => ({
        id: keyword.id,
        name: keyword.name,
    })),
    mediaInfo: media,
    watchProviders: (0, common_1.mapWatchProviders)(show['watch/providers']?.results ?? {}),
    onUserWatchlist: userWatchlist,
});
exports.mapTvDetails = mapTvDetails;

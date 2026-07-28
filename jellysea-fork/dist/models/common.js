"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapWatchProviderDetails = exports.mapWatchProviders = exports.mapVideos = exports.mapExternalIds = exports.mapCrew = exports.mapAggregateCast = exports.mapCast = void 0;
const mapCast = (person) => ({
    castId: person.cast_id,
    character: person.character,
    creditId: person.credit_id,
    id: person.id,
    name: person.name,
    order: person.order,
    gender: person.gender,
    profilePath: person.profile_path,
});
exports.mapCast = mapCast;
const mapAggregateCast = (person) => ({
    castId: person.cast_id,
    // the first role is the one for which the actor appears the most as
    character: person.roles[0].character,
    creditId: person.roles[0].credit_id,
    id: person.id,
    name: person.name,
    order: person.order,
    gender: person.gender,
    profilePath: person.profile_path,
});
exports.mapAggregateCast = mapAggregateCast;
const mapCrew = (person) => ({
    creditId: person.credit_id,
    department: person.department,
    id: person.id,
    job: person.job,
    name: person.name,
    gender: person.gender,
    profilePath: person.profile_path,
});
exports.mapCrew = mapCrew;
const mapExternalIds = (eids) => ({
    facebookId: eids.facebook_id,
    freebaseId: eids.freebase_id,
    freebaseMid: eids.freebase_mid,
    imdbId: eids.imdb_id,
    instagramId: eids.instagram_id,
    tvdbId: eids.tvdb_id,
    tvrageId: eids.tvrage_id,
    twitterId: eids.twitter_id,
});
exports.mapExternalIds = mapExternalIds;
const mapVideos = (videoResult) => videoResult?.results.map(({ key, name, size, type, site }) => ({
    site,
    key,
    name,
    size,
    type,
    url: siteUrlCreator(site, key),
}));
exports.mapVideos = mapVideos;
const mapWatchProviders = (watchProvidersResult) => Object.entries(watchProvidersResult).map(([iso_3166_1, provider]) => ({
    iso_3166_1,
    link: provider.link,
    buy: (0, exports.mapWatchProviderDetails)(provider.buy ?? []),
    flatrate: (0, exports.mapWatchProviderDetails)(provider.flatrate ?? []),
}));
exports.mapWatchProviders = mapWatchProviders;
const mapWatchProviderDetails = (watchProviderDetails) => watchProviderDetails.map((provider) => ({
    displayPriority: provider.display_priority,
    logoPath: provider.logo_path,
    id: provider.provider_id,
    name: provider.provider_name,
}));
exports.mapWatchProviderDetails = mapWatchProviderDetails;
const siteUrlCreator = (site, key) => ({
    YouTube: `https://www.youtube.com/watch?v=${key}`,
})[site];

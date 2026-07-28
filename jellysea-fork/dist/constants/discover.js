"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSliders = exports.DiscoverSliderType = void 0;
var DiscoverSliderType;
(function (DiscoverSliderType) {
    DiscoverSliderType[DiscoverSliderType["RECENTLY_ADDED"] = 1] = "RECENTLY_ADDED";
    DiscoverSliderType[DiscoverSliderType["RECENT_REQUESTS"] = 2] = "RECENT_REQUESTS";
    DiscoverSliderType[DiscoverSliderType["PLEX_WATCHLIST"] = 3] = "PLEX_WATCHLIST";
    DiscoverSliderType[DiscoverSliderType["TRENDING"] = 4] = "TRENDING";
    DiscoverSliderType[DiscoverSliderType["POPULAR_MOVIES"] = 5] = "POPULAR_MOVIES";
    DiscoverSliderType[DiscoverSliderType["MOVIE_GENRES"] = 6] = "MOVIE_GENRES";
    DiscoverSliderType[DiscoverSliderType["UPCOMING_MOVIES"] = 7] = "UPCOMING_MOVIES";
    DiscoverSliderType[DiscoverSliderType["STUDIOS"] = 8] = "STUDIOS";
    DiscoverSliderType[DiscoverSliderType["POPULAR_TV"] = 9] = "POPULAR_TV";
    DiscoverSliderType[DiscoverSliderType["TV_GENRES"] = 10] = "TV_GENRES";
    DiscoverSliderType[DiscoverSliderType["UPCOMING_TV"] = 11] = "UPCOMING_TV";
    DiscoverSliderType[DiscoverSliderType["NETWORKS"] = 12] = "NETWORKS";
    DiscoverSliderType[DiscoverSliderType["TMDB_MOVIE_KEYWORD"] = 13] = "TMDB_MOVIE_KEYWORD";
    DiscoverSliderType[DiscoverSliderType["TMDB_MOVIE_GENRE"] = 14] = "TMDB_MOVIE_GENRE";
    DiscoverSliderType[DiscoverSliderType["TMDB_TV_KEYWORD"] = 15] = "TMDB_TV_KEYWORD";
    DiscoverSliderType[DiscoverSliderType["TMDB_TV_GENRE"] = 16] = "TMDB_TV_GENRE";
    DiscoverSliderType[DiscoverSliderType["TMDB_SEARCH"] = 17] = "TMDB_SEARCH";
    DiscoverSliderType[DiscoverSliderType["TMDB_STUDIO"] = 18] = "TMDB_STUDIO";
    DiscoverSliderType[DiscoverSliderType["TMDB_NETWORK"] = 19] = "TMDB_NETWORK";
    DiscoverSliderType[DiscoverSliderType["TMDB_MOVIE_STREAMING_SERVICES"] = 20] = "TMDB_MOVIE_STREAMING_SERVICES";
    DiscoverSliderType[DiscoverSliderType["TMDB_TV_STREAMING_SERVICES"] = 21] = "TMDB_TV_STREAMING_SERVICES";
})(DiscoverSliderType || (exports.DiscoverSliderType = DiscoverSliderType = {}));
exports.defaultSliders = [
    {
        type: DiscoverSliderType.RECENTLY_ADDED,
        enabled: true,
        isBuiltIn: true,
        order: 0,
    },
    {
        type: DiscoverSliderType.RECENT_REQUESTS,
        enabled: true,
        isBuiltIn: true,
        order: 1,
    },
    {
        type: DiscoverSliderType.PLEX_WATCHLIST,
        enabled: true,
        isBuiltIn: true,
        order: 2,
    },
    {
        type: DiscoverSliderType.TRENDING,
        enabled: true,
        isBuiltIn: true,
        order: 3,
    },
    {
        type: DiscoverSliderType.POPULAR_MOVIES,
        enabled: true,
        isBuiltIn: true,
        order: 4,
    },
    {
        type: DiscoverSliderType.MOVIE_GENRES,
        enabled: true,
        isBuiltIn: true,
        order: 5,
    },
    {
        type: DiscoverSliderType.UPCOMING_MOVIES,
        enabled: true,
        isBuiltIn: true,
        order: 6,
    },
    {
        type: DiscoverSliderType.STUDIOS,
        enabled: true,
        isBuiltIn: true,
        order: 7,
    },
    {
        type: DiscoverSliderType.POPULAR_TV,
        enabled: true,
        isBuiltIn: true,
        order: 8,
    },
    {
        type: DiscoverSliderType.TV_GENRES,
        enabled: true,
        isBuiltIn: true,
        order: 9,
    },
    {
        type: DiscoverSliderType.UPCOMING_TV,
        enabled: true,
        isBuiltIn: true,
        order: 10,
    },
    {
        type: DiscoverSliderType.NETWORKS,
        enabled: true,
        isBuiltIn: true,
        order: 11,
    },
];

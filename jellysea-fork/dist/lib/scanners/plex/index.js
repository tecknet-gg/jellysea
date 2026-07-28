"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plexRecentScanner = exports.plexFullScanner = void 0;
const animelist_1 = __importDefault(require("../../../api/animelist"));
const metadata_1 = require("../../../api/metadata");
const plexapi_1 = __importDefault(require("../../../api/plexapi"));
const themoviedb_1 = __importDefault(require("../../../api/themoviedb"));
const constants_1 = require("../../../api/themoviedb/constants");
const datasource_1 = require("../../../datasource");
const User_1 = require("../../../entity/User");
const cache_1 = __importDefault(require("../../../lib/cache"));
const baseScanner_1 = __importDefault(require("../../../lib/scanners/baseScanner"));
const settings_1 = require("../../../lib/settings");
const lodash_1 = require("lodash");
const imdbRegex = new RegExp(/imdb:\/\/(tt[0-9]+)/);
const tmdbRegex = new RegExp(/tmdb:\/\/([0-9]+)/);
const tvdbRegex = new RegExp(/tvdb:\/\/([0-9]+)/);
const tmdbShowRegex = new RegExp(/themoviedb:\/\/([0-9]+)/);
const plexRegex = new RegExp(/plex:\/\//);
// Hama agent uses ASS naming, see details here:
// https://github.com/ZeroQI/Absolute-Series-Scanner/blob/master/README.md#forcing-the-movieseries-id
const hamaTvdbRegex = new RegExp(/hama:\/\/tvdb[0-9]?-([0-9]+)/);
const hamaAnidbRegex = new RegExp(/hama:\/\/anidb[0-9]?-([0-9]+)/);
const HAMA_AGENT = 'com.plexapp.agents.hama';
class PlexScanner extends baseScanner_1.default {
    constructor(isRecentOnly = false) {
        super('Plex Scan', { bundleSize: 50 });
        this.isRecentOnly = false;
        this.isRecentOnly = isRecentOnly;
    }
    status() {
        return {
            running: this.running,
            progress: this.progress,
            total: this.totalSize ?? 0,
            currentLibrary: this.currentLibrary,
            libraries: this.libraries,
        };
    }
    async run() {
        const settings = (0, settings_1.getSettings)();
        const sessionId = this.startRun();
        try {
            const userRepository = (0, datasource_1.getRepository)(User_1.User);
            const admin = await userRepository.findOne({
                select: { id: true, plexToken: true },
                where: { id: 1 },
            });
            if (!admin) {
                return this.log('No admin configured. Plex scan skipped.', 'warn');
            }
            this.plexClient = new plexapi_1.default({ plexToken: admin.plexToken });
            this.libraries = settings.plex.libraries.filter((library) => library.enabled);
            const hasHama = await this.hasHamaAgent();
            if (hasHama) {
                await animelist_1.default.sync();
            }
            if (this.isRecentOnly) {
                for (const library of this.libraries) {
                    this.currentLibrary = library;
                    this.log(`Beginning to process recently added for library: ${library.name}`, 'info', { lastScan: library.lastScan });
                    const libraryItems = await this.plexClient.getRecentlyAdded(library.id, library.lastScan
                        ? {
                            // We remove 10 minutes from the last scan as a buffer
                            addedAt: library.lastScan - 1000 * 60 * 10,
                        }
                        : undefined, library.type);
                    // Bundle items up by rating keys
                    this.items = (0, lodash_1.uniqWith)(libraryItems, (mediaA, mediaB) => {
                        if (mediaA.grandparentRatingKey && mediaB.grandparentRatingKey) {
                            return (mediaA.grandparentRatingKey === mediaB.grandparentRatingKey);
                        }
                        if (mediaA.parentRatingKey && mediaB.parentRatingKey) {
                            return mediaA.parentRatingKey === mediaB.parentRatingKey;
                        }
                        return mediaA.ratingKey === mediaB.ratingKey;
                    });
                    await this.loop(this.processItem.bind(this), { sessionId });
                    // After run completes, update last scan time
                    const newLibraries = settings.plex.libraries.map((lib) => {
                        if (lib.id === library.id) {
                            return {
                                ...lib,
                                lastScan: Date.now(),
                            };
                        }
                        return lib;
                    });
                    settings.plex.libraries = newLibraries;
                    await settings.save();
                }
            }
            else {
                for (const library of this.libraries) {
                    this.currentLibrary = library;
                    this.log(`Beginning to process library: ${library.name}`, 'info');
                    await this.paginateLibrary(library, { sessionId });
                }
            }
            this.log(this.isRecentOnly
                ? 'Recently Added Scan Complete'
                : 'Full Scan Complete', 'info');
        }
        catch (e) {
            this.log('Scan interrupted', 'error', {
                errorMessage: e.message,
            });
        }
        finally {
            this.endRun(sessionId);
        }
    }
    async paginateLibrary(library, { start = 0, sessionId }) {
        if (!this.running) {
            throw new Error('Sync was aborted.');
        }
        if (this.sessionId !== sessionId) {
            throw new Error('New session was started. Old session aborted.');
        }
        const response = await this.plexClient.getLibraryContents(library.id, {
            size: this.protectedBundleSize,
            offset: start,
        });
        this.progress = start;
        this.totalSize = response.totalSize;
        if (response.items.length === 0) {
            return;
        }
        await Promise.all(response.items.map(async (item) => {
            await this.processItem(item);
        }));
        if (response.items.length < this.protectedBundleSize) {
            return;
        }
        await new Promise((resolve, reject) => setTimeout(() => {
            this.paginateLibrary(library, {
                start: start + this.protectedBundleSize,
                sessionId,
            })
                .then(() => resolve())
                .catch((e) => reject(new Error(e.message)));
        }, this.protectedUpdateRate));
    }
    async processItem(plexitem) {
        try {
            if (plexitem.type === 'movie') {
                await this.processPlexMovie(plexitem);
            }
            else if (plexitem.type === 'show' ||
                plexitem.type === 'episode' ||
                plexitem.type === 'season') {
                await this.processPlexShow(plexitem);
            }
        }
        catch (e) {
            this.log('Failed to process Plex media', 'error', {
                errorMessage: e.message,
                title: plexitem.title,
            });
        }
    }
    async processPlexMovie(plexitem) {
        const mediaIds = await this.getMediaIds(plexitem);
        const has4k = plexitem.Media.some((media) => media.videoResolution === '4k');
        await this.processMovie(mediaIds.tmdbId, {
            is4k: has4k && this.enable4kMovie,
            mediaAddedAt: new Date(plexitem.addedAt * 1000),
            ratingKey: plexitem.ratingKey,
            title: plexitem.title,
        });
    }
    async processPlexMovieByTmdbId(plexitem, tmdbId) {
        const has4k = plexitem.Media.some((media) => media.videoResolution === '4k');
        await this.processMovie(tmdbId, {
            is4k: has4k && this.enable4kMovie,
            mediaAddedAt: new Date(plexitem.addedAt * 1000),
            ratingKey: plexitem.ratingKey,
            title: plexitem.title,
        });
    }
    async getTvShow({ tmdbId, tvdbId, }) {
        let tvShow;
        if (tmdbId) {
            tvShow = await this.tmdb.getTvShow({
                tvId: Number(tmdbId),
            });
        }
        else if (tvdbId) {
            tvShow = await this.tmdb.getShowByTvdbId({
                tvdbId: Number(tvdbId),
            });
        }
        else {
            throw new Error('No ID provided');
        }
        const metadataProvider = tvShow.keywords.results.some((keyword) => keyword.id === constants_1.ANIME_KEYWORD_ID)
            ? await (0, metadata_1.getMetadataProvider)('anime')
            : await (0, metadata_1.getMetadataProvider)('tv');
        if (!(metadataProvider instanceof themoviedb_1.default)) {
            tvShow = await metadataProvider.getTvShow({
                tvId: Number(tmdbId),
            });
        }
        return tvShow;
    }
    async processPlexShow(plexitem) {
        const ratingKey = plexitem.grandparentRatingKey ??
            plexitem.parentRatingKey ??
            plexitem.ratingKey;
        const metadata = await this.plexClient.getMetadata(ratingKey, {
            includeChildren: true,
        });
        const mediaIds = await this.getMediaIds(metadata);
        // If the media is from HAMA, and doesn't have a TVDb ID, we will treat it
        // as a special HAMA movie
        if (mediaIds.tmdbId && !mediaIds.tvdbId && mediaIds.isHama) {
            this.processHamaMovie(metadata, mediaIds.tmdbId);
            return;
        }
        // If the media is from HAMA and we have a TVDb ID, we will attempt
        // to process any specials that may exist
        if (mediaIds.tvdbId && mediaIds.isHama) {
            await this.processHamaSpecials(metadata, mediaIds.tvdbId);
        }
        const tvShow = await this.getTvShow({
            tmdbId: mediaIds.tmdbId,
        });
        const seasons = tvShow.seasons;
        const processableSeasons = [];
        const settings = (0, settings_1.getSettings)();
        const filteredSeasons = settings.main.enableSpecialEpisodes
            ? seasons
            : seasons.filter((sn) => sn.season_number !== 0);
        for (const season of filteredSeasons) {
            const matchedPlexSeason = metadata.Children?.Metadata.find((md) => Number(md.index) === season.season_number);
            if (matchedPlexSeason) {
                // If we have a matched Plex season, get its children metadata so we can check details
                const episodes = await this.plexClient.getChildrenMetadata(matchedPlexSeason.ratingKey);
                // Total episodes that are in standard definition (not 4k)
                const totalStandard = episodes.filter((episode) => !this.enable4kShow
                    ? true
                    : episode.Media.some((media) => media.videoResolution !== '4k')).length;
                // Total episodes that are in 4k
                const total4k = this.enable4kShow
                    ? episodes.filter((episode) => episode.Media.some((media) => media.videoResolution === '4k')).length
                    : 0;
                processableSeasons.push({
                    seasonNumber: season.season_number,
                    episodes: totalStandard,
                    episodes4k: total4k,
                    totalEpisodes: season.episode_count,
                });
            }
            else {
                processableSeasons.push({
                    seasonNumber: season.season_number,
                    episodes: 0,
                    episodes4k: 0,
                    totalEpisodes: season.episode_count,
                });
            }
        }
        await this.processShow(mediaIds.tmdbId, mediaIds.tvdbId ?? tvShow.external_ids.tvdb_id, processableSeasons, {
            mediaAddedAt: new Date(metadata.addedAt * 1000),
            ratingKey: ratingKey,
            title: metadata.title,
        });
    }
    async getMediaIds(plexitem) {
        let mediaIds = {};
        // Check if item is using new plex movie/tv agent
        if (plexitem.guid.match(plexRegex)) {
            const guidCache = cache_1.default.getCache('plexguid');
            const cachedGuids = guidCache.data.get(plexitem.ratingKey);
            if (cachedGuids) {
                this.log('GUIDs are cached. Skipping metadata request.', 'debug', {
                    mediaIds: cachedGuids,
                    title: plexitem.title,
                });
                mediaIds = cachedGuids;
            }
            const metadata = plexitem.Guid && plexitem.Guid.length > 0
                ? plexitem
                : await this.plexClient.getMetadata(plexitem.ratingKey);
            // If there is no Guid field at all, then we bail
            if (!metadata.Guid) {
                throw new Error('No Guid metadata for this title. Skipping. (Try refreshing the metadata in Plex for this media!)');
            }
            // Map all IDs to MediaId object
            metadata.Guid.forEach((ref) => {
                if (ref.id.match(imdbRegex)) {
                    mediaIds.imdbId = ref.id.match(imdbRegex)?.[1] ?? undefined;
                }
                else if (ref.id.match(tmdbRegex)) {
                    const tmdbMatch = ref.id.match(tmdbRegex)?.[1];
                    mediaIds.tmdbId = Number(tmdbMatch);
                }
                else if (ref.id.match(tvdbRegex)) {
                    const tvdbMatch = ref.id.match(tvdbRegex)?.[1];
                    mediaIds.tvdbId = Number(tvdbMatch);
                }
            });
            // If we got an IMDb ID, but no TMDB ID, lookup the TMDB ID with the IMDb ID
            if (mediaIds.imdbId && !mediaIds.tmdbId) {
                const tmdbMedia = await this.tmdb.getMediaByImdbId({
                    imdbId: mediaIds.imdbId,
                });
                mediaIds.tmdbId = tmdbMedia.id;
            }
            if (mediaIds.tvdbId && !mediaIds.tmdbId) {
                const show = await this.tmdb.getShowByTvdbId({
                    tvdbId: mediaIds.tvdbId,
                });
                mediaIds.tmdbId = show.id;
            }
            // Cache GUIDs
            guidCache.data.set(plexitem.ratingKey, mediaIds);
            // Check if the agent is IMDb
        }
        else if (plexitem.guid.match(imdbRegex)) {
            const imdbMatch = plexitem.guid.match(imdbRegex);
            if (imdbMatch) {
                mediaIds.imdbId = imdbMatch[1];
                const tmdbMedia = await this.tmdb.getMediaByImdbId({
                    imdbId: mediaIds.imdbId,
                });
                mediaIds.tmdbId = tmdbMedia.id;
            }
            // Check if the agent is TMDB
        }
        else if (plexitem.guid.match(tmdbRegex)) {
            const tmdbMatch = plexitem.guid.match(tmdbRegex);
            if (tmdbMatch) {
                mediaIds.tmdbId = Number(tmdbMatch[1]);
            }
            // Check if the agent is TVDb
        }
        else if (plexitem.guid.match(tvdbRegex)) {
            const matchedtvdb = plexitem.guid.match(tvdbRegex);
            // If we can find a tvdb Id, use it to get the full tmdb show details
            if (matchedtvdb) {
                const show = await this.tmdb.getShowByTvdbId({
                    tvdbId: Number(matchedtvdb[1]),
                });
                mediaIds.tvdbId = Number(matchedtvdb[1]);
                mediaIds.tmdbId = show.id;
            }
            // Check if the agent (for shows) is TMDB
        }
        else if (plexitem.guid.match(tmdbShowRegex)) {
            const matchedtmdb = plexitem.guid.match(tmdbShowRegex);
            if (matchedtmdb) {
                mediaIds.tmdbId = Number(matchedtmdb[1]);
            }
            // Check for HAMA (with TVDb guid)
        }
        else if (plexitem.guid.match(hamaTvdbRegex)) {
            const matchedtvdb = plexitem.guid.match(hamaTvdbRegex);
            if (matchedtvdb) {
                const show = await this.tmdb.getShowByTvdbId({
                    tvdbId: Number(matchedtvdb[1]),
                });
                mediaIds.tvdbId = Number(matchedtvdb[1]);
                mediaIds.tmdbId = show.id;
                // Set isHama to true, so we can know to add special processing to this item
                mediaIds.isHama = true;
            }
            // Check for HAMA (with anidb guid)
        }
        else if (plexitem.guid.match(hamaAnidbRegex)) {
            const matchedhama = plexitem.guid.match(hamaAnidbRegex);
            if (!animelist_1.default.isLoaded()) {
                this.log(`Hama ID ${plexitem.guid} detected, but library agent is not set to Hama`, 'warn', { title: plexitem.title });
            }
            else if (matchedhama) {
                const anidbId = Number(matchedhama[1]);
                const result = animelist_1.default.getFromAnidbId(anidbId);
                let tvShow = null;
                // Set isHama to true, so we can know to add special processing to this item
                mediaIds.isHama = true;
                // First try to lookup the show by TVDb ID
                if (result?.tvdbId) {
                    const extResponse = await this.tmdb.getByExternalId({
                        externalId: result.tvdbId,
                        type: 'tvdb',
                    });
                    if (extResponse.tv_results[0]) {
                        tvShow = await this.tmdb.getTvShow({
                            tvId: extResponse.tv_results[0].id,
                        });
                        mediaIds.tvdbId = result.tvdbId;
                        mediaIds.tmdbId = tvShow.id;
                    }
                    else {
                        this.log(`Missing TVDB ${result.tvdbId} entry in TMDB for AniDB ${anidbId}`);
                    }
                }
                if (!tvShow) {
                    // if lookup of tvshow above failed, then try movie with tmdbid/imdbid
                    // note - some tv shows have imdbid set too, that's why this need to go second
                    if (result?.tmdbId) {
                        mediaIds.tmdbId = result.tmdbId;
                        mediaIds.imdbId = result?.imdbId;
                    }
                    else if (result?.imdbId) {
                        const tmdbMovie = await this.tmdb.getMediaByImdbId({
                            imdbId: result.imdbId,
                        });
                        mediaIds.tmdbId = tmdbMovie.id;
                        mediaIds.imdbId = result.imdbId;
                    }
                }
            }
        }
        if (!mediaIds.tmdbId) {
            throw new Error('Unable to find TMDB ID');
        }
        // We check above if we have the TMDB ID, so we can safely assert the type below
        return mediaIds;
    }
    // movies with hama agent actually are tv shows with at least one episode in it
    // try to get first episode of any season - cannot hardcode season or episode number
    // because sometimes user can have it in other season/ep than s01e01
    async processHamaMovie(metadata, tmdbId) {
        const season = metadata.Children?.Metadata[0];
        if (season) {
            const episodes = await this.plexClient.getChildrenMetadata(season.ratingKey);
            if (episodes) {
                await this.processPlexMovieByTmdbId(episodes[0], tmdbId);
            }
        }
    }
    // this adds all movie episodes from specials season for Hama agent
    async processHamaSpecials(metadata, tvdbId) {
        const specials = metadata.Children?.Metadata.find((md) => Number(md.index) === 0);
        if (specials) {
            const episodes = await this.plexClient.getChildrenMetadata(specials.ratingKey);
            if (episodes) {
                for (const episode of episodes) {
                    const special = animelist_1.default.getSpecialEpisode(tvdbId, episode.index);
                    if (special) {
                        if (special.tmdbId) {
                            await this.processPlexMovieByTmdbId(episode, special.tmdbId);
                        }
                        else if (special.imdbId) {
                            const tmdbMovie = await this.tmdb.getMediaByImdbId({
                                imdbId: special.imdbId,
                            });
                            await this.processPlexMovieByTmdbId(episode, tmdbMovie.id);
                        }
                    }
                }
            }
        }
    }
    // checks if any of this.libraries has Hama agent set in Plex
    async hasHamaAgent() {
        const plexLibraries = await this.plexClient.getLibraries();
        return this.libraries.some((library) => plexLibraries.some((plexLibrary) => plexLibrary.agent === HAMA_AGENT && library.id === plexLibrary.key));
    }
}
exports.plexFullScanner = new PlexScanner();
exports.plexRecentScanner = new PlexScanner(true);

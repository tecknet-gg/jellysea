"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const plextv_1 = __importDefault(require("../api/plextv"));
const media_1 = require("../constants/media");
const datasource_1 = require("../datasource");
const Media_1 = __importDefault(require("../entity/Media"));
const MediaRequest_1 = require("../entity/MediaRequest");
const User_1 = require("../entity/User");
const logger_1 = __importDefault(require("../logger"));
const permissions_1 = require("./permissions");
class WatchlistSync {
    async syncWatchlist() {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        // Get users who actually have plex tokens
        const users = await userRepository
            .createQueryBuilder('user')
            .addSelect('user.plexToken')
            .leftJoinAndSelect('user.settings', 'settings')
            .where("user.plexToken != ''")
            .getMany();
        for (const user of users) {
            await this.syncUserWatchlist(user);
        }
    }
    async syncUserWatchlist(user) {
        if (!user.plexToken) {
            logger_1.default.warn('Skipping user watchlist sync for user without plex token', {
                label: 'Plex Watchlist Sync',
                user: user.displayName,
            });
            return;
        }
        if (!user.hasPermission([
            permissions_1.Permission.AUTO_REQUEST,
            permissions_1.Permission.AUTO_REQUEST_MOVIE,
            permissions_1.Permission.AUTO_REQUEST_TV,
        ], { type: 'or' })) {
            return;
        }
        if (!user.settings?.watchlistSyncMovies &&
            !user.settings?.watchlistSyncTv) {
            // Skip sync if user settings have it disabled
            return;
        }
        const plexTvApi = new plextv_1.default(user.plexToken);
        const response = await plexTvApi.getWatchlist({ size: 20 });
        const mediaItems = await Media_1.default.getRelatedMedia(user, response.items.map((i) => ({
            tmdbId: i.tmdbId,
            mediaType: i.type === 'show' ? media_1.MediaType.TV : media_1.MediaType.MOVIE,
        })));
        const watchlistTmdbIds = response.items.map((i) => i.tmdbId);
        const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        const existingAutoRequests = watchlistTmdbIds.length > 0
            ? await requestRepository
                .createQueryBuilder('request')
                .leftJoinAndSelect('request.media', 'media')
                .where('request.requestedBy = :userId', { userId: user.id })
                .andWhere('request.isAutoRequest = true')
                .andWhere('media.tmdbId IN (:...tmdbIds)', {
                tmdbIds: watchlistTmdbIds,
            })
                .getMany()
            : [];
        const autoRequestedTmdbIds = new Set(existingAutoRequests
            .filter((r) => r.media != null && r.media.status !== media_1.MediaStatus.DELETED)
            .map((r) => `${r.media.mediaType}:${r.media.tmdbId}`));
        const unavailableItems = response.items.filter((i) => {
            const itemMediaType = i.type === 'show' ? media_1.MediaType.TV : media_1.MediaType.MOVIE;
            return (!autoRequestedTmdbIds.has(`${itemMediaType}:${i.tmdbId}`) &&
                !mediaItems.find((m) => m.tmdbId === i.tmdbId &&
                    m.mediaType === itemMediaType &&
                    (m.status === media_1.MediaStatus.BLOCKLISTED ||
                        (itemMediaType === media_1.MediaType.MOVIE &&
                            m.status !== media_1.MediaStatus.UNKNOWN &&
                            m.status !== media_1.MediaStatus.DELETED) ||
                        (itemMediaType === media_1.MediaType.TV &&
                            m.status === media_1.MediaStatus.AVAILABLE))));
        });
        for (const mediaItem of unavailableItems) {
            try {
                if (mediaItem.type === 'show' && !mediaItem.tvdbId) {
                    throw new Error('Missing TVDB ID from Plex Metadata');
                }
                // Check if they have auto-request permissons and watchlist sync
                // enabled for the media type
                if (((!user.hasPermission([permissions_1.Permission.AUTO_REQUEST, permissions_1.Permission.AUTO_REQUEST_MOVIE], { type: 'or' }) ||
                    !user.settings?.watchlistSyncMovies) &&
                    mediaItem.type === 'movie') ||
                    ((!user.hasPermission([permissions_1.Permission.AUTO_REQUEST, permissions_1.Permission.AUTO_REQUEST_TV], { type: 'or' }) ||
                        !user.settings?.watchlistSyncTv) &&
                        mediaItem.type === 'show')) {
                    continue;
                }
                await MediaRequest_1.MediaRequest.request({
                    mediaId: mediaItem.tmdbId,
                    mediaType: mediaItem.type === 'show' ? media_1.MediaType.TV : media_1.MediaType.MOVIE,
                    seasons: mediaItem.type === 'show' ? 'all' : undefined,
                    tvdbId: mediaItem.tvdbId,
                    is4k: false,
                }, user, { isAutoRequest: true });
                logger_1.default.info("Created media request from user's Plex Watchlist", {
                    label: 'Watchlist Sync',
                    userId: user.id,
                    mediaTitle: mediaItem.title,
                });
            }
            catch (e) {
                if (!(e instanceof Error)) {
                    continue;
                }
                switch (e.constructor) {
                    // During watchlist sync, these errors aren't necessarily
                    // a problem with Seerr. Since we are auto syncing these constantly, it's
                    // possible they are unexpectedly at their quota limit, for example. So we'll
                    // instead log these as debug messages.
                    case MediaRequest_1.RequestPermissionError:
                    case MediaRequest_1.DuplicateMediaRequestError:
                    case MediaRequest_1.QuotaRestrictedError:
                    case MediaRequest_1.NoSeasonsAvailableError:
                        logger_1.default.debug('Failed to create media request from watchlist', {
                            label: 'Watchlist Sync',
                            userId: user.id,
                            mediaTitle: mediaItem.title,
                            errorMessage: e.message,
                        });
                        break;
                    // Blocklisted media should be silently ignored during watchlist sync to avoid spam
                    case MediaRequest_1.BlocklistedMediaError:
                        break;
                    default:
                        logger_1.default.error('Failed to create media request from watchlist', {
                            label: 'Watchlist Sync',
                            userId: user.id,
                            mediaTitle: mediaItem.title,
                            errorMessage: e.message,
                        });
                }
            }
        }
    }
}
const watchlistSync = new WatchlistSync();
exports.default = watchlistSync;

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MediaRequest_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaRequest = exports.BlocklistedMediaError = exports.NoSeasonsAvailableError = exports.DuplicateMediaRequestError = exports.QuotaRestrictedError = exports.RequestPermissionError = void 0;
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const constants_1 = require("../api/themoviedb/constants");
const media_1 = require("../constants/media");
const datasource_1 = require("../datasource");
const OverrideRule_1 = __importDefault(require("../entity/OverrideRule"));
const notifications_1 = __importStar(require("../lib/notifications"));
const permissions_1 = require("../lib/permissions");
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const DbColumnHelper_1 = require("../utils/DbColumnHelper");
const lodash_1 = require("lodash");
const typeorm_1 = require("typeorm");
const Media_1 = __importDefault(require("./Media"));
const SeasonRequest_1 = __importDefault(require("./SeasonRequest"));
const User_1 = require("./User");
class RequestPermissionError extends Error {
}
exports.RequestPermissionError = RequestPermissionError;
class QuotaRestrictedError extends Error {
}
exports.QuotaRestrictedError = QuotaRestrictedError;
class DuplicateMediaRequestError extends Error {
}
exports.DuplicateMediaRequestError = DuplicateMediaRequestError;
class NoSeasonsAvailableError extends Error {
}
exports.NoSeasonsAvailableError = NoSeasonsAvailableError;
class BlocklistedMediaError extends Error {
}
exports.BlocklistedMediaError = BlocklistedMediaError;
let MediaRequest = MediaRequest_1 = class MediaRequest {
    static async request(requestBody, user, options = {}) {
        const tmdb = new themoviedb_1.default();
        const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
        const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1);
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const settings = (0, settings_1.getSettings)();
        let requestUser = user;
        if (requestBody.userId &&
            !requestUser.hasPermission([
                permissions_1.Permission.MANAGE_USERS,
                permissions_1.Permission.MANAGE_REQUESTS,
            ])) {
            throw new RequestPermissionError('You do not have permission to modify the request user.');
        }
        else if (requestBody.userId) {
            requestUser = await userRepository.findOneOrFail({
                where: { id: requestBody.userId },
            });
        }
        if (!requestUser) {
            throw new Error('User missing from request context.');
        }
        if (requestBody.mediaType === media_1.MediaType.MOVIE &&
            !requestUser.hasPermission(requestBody.is4k
                ? [permissions_1.Permission.REQUEST_4K, permissions_1.Permission.REQUEST_4K_MOVIE]
                : [permissions_1.Permission.REQUEST, permissions_1.Permission.REQUEST_MOVIE], {
                type: 'or',
            })) {
            throw new RequestPermissionError(`You do not have permission to make ${requestBody.is4k ? '4K ' : ''}movie requests.`);
        }
        else if (requestBody.mediaType === media_1.MediaType.TV &&
            !requestUser.hasPermission(requestBody.is4k
                ? [permissions_1.Permission.REQUEST_4K, permissions_1.Permission.REQUEST_4K_TV]
                : [permissions_1.Permission.REQUEST, permissions_1.Permission.REQUEST_TV], {
                type: 'or',
            })) {
            throw new RequestPermissionError(`You do not have permission to make ${requestBody.is4k ? '4K ' : ''}series requests.`);
        }
        const quotas = await requestUser.getQuota();
        const canBypassQuota = user.hasPermission(permissions_1.Permission.MANAGE_REQUESTS);
        const ignoreQuota = requestBody.ignoreQuota === true &&
            canBypassQuota &&
            ((requestBody.mediaType === media_1.MediaType.MOVIE
                ? quotas.movie.limit
                : quotas.tv.limit) ?? 0) > 0;
        if (!ignoreQuota) {
            if (requestBody.ignoreQuota && !canBypassQuota) {
                throw new RequestPermissionError('You do not have permission to bypass user quota limits.');
            }
            else if (requestBody.mediaType === media_1.MediaType.MOVIE &&
                quotas.movie.restricted) {
                throw new QuotaRestrictedError('Movie Quota exceeded.');
            }
            else if (requestBody.mediaType === media_1.MediaType.TV &&
                quotas.tv.restricted) {
                throw new QuotaRestrictedError('Series Quota exceeded.');
            }
        }
        const tmdbMedia = requestBody.mediaType === media_1.MediaType.MOVIE
            ? await tmdb.getMovie({ movieId: requestBody.mediaId })
            : await tmdb.getTvShow({ tvId: requestBody.mediaId });
        let media = await mediaRepository.findOne({
            where: {
                tmdbId: requestBody.mediaId,
                mediaType: requestBody.mediaType,
            },
            relations: ['requests'],
        });
        if (!media) {
            media = new Media_1.default({
                tmdbId: tmdbMedia.id,
                tvdbId: requestBody.tvdbId ?? tmdbMedia.external_ids.tvdb_id,
                status: !requestBody.is4k ? media_1.MediaStatus.PENDING : media_1.MediaStatus.UNKNOWN,
                status4k: requestBody.is4k ? media_1.MediaStatus.PENDING : media_1.MediaStatus.UNKNOWN,
                mediaType: requestBody.mediaType,
            });
        }
        else {
            if (media.status === media_1.MediaStatus.BLOCKLISTED) {
                logger_1.default.warn('Request for media blocked due to being blocklisted', {
                    tmdbId: tmdbMedia.id,
                    mediaType: requestBody.mediaType,
                    label: 'Media Request',
                });
                throw new BlocklistedMediaError('This media is blocklisted.');
            }
            if ((media.status === media_1.MediaStatus.UNKNOWN ||
                media.status === media_1.MediaStatus.DELETED) &&
                !requestBody.is4k) {
                media.status = media_1.MediaStatus.PENDING;
            }
            if ((media.status4k === media_1.MediaStatus.UNKNOWN ||
                media.status4k === media_1.MediaStatus.DELETED) &&
                requestBody.is4k) {
                media.status4k = media_1.MediaStatus.PENDING;
            }
        }
        const existing = await requestRepository
            .createQueryBuilder('request')
            .leftJoinAndSelect('request.media', 'media')
            .leftJoinAndSelect('request.requestedBy', 'user')
            .where('request.is4k = :is4k', { is4k: requestBody.is4k })
            .andWhere('media.tmdbId = :tmdbId', { tmdbId: tmdbMedia.id })
            .andWhere('media.mediaType = :mediaType', {
            mediaType: requestBody.mediaType,
        })
            .getMany();
        if (existing && existing.length > 0) {
            // If there is an existing movie request that isn't declined, don't allow a new one.
            if (requestBody.mediaType === media_1.MediaType.MOVIE &&
                existing[0].status !== media_1.MediaRequestStatus.DECLINED &&
                existing[0].status !== media_1.MediaRequestStatus.COMPLETED) {
                logger_1.default.warn('Duplicate request for media blocked', {
                    tmdbId: tmdbMedia.id,
                    mediaType: requestBody.mediaType,
                    is4k: requestBody.is4k,
                    label: 'Media Request',
                });
                throw new DuplicateMediaRequestError('Request for this media already exists.');
            }
            // If an existing auto-request for this media exists from the same user,
            // don't allow a new one.
            const statusKey = requestBody.is4k ? 'status4k' : 'status';
            if (existing.find((r) => r.requestedBy.id === requestUser.id &&
                r.isAutoRequest &&
                r.media?.[statusKey] !== media_1.MediaStatus.DELETED)) {
                throw new DuplicateMediaRequestError('Auto-request for this media and user already exists.');
            }
        }
        // Apply overrides if the user is not an admin or has the "advanced request" permission
        const useOverrides = !user.hasPermission([permissions_1.Permission.MANAGE_REQUESTS], {
            type: 'or',
        });
        let rootFolder = requestBody.rootFolder;
        let profileId = requestBody.profileId;
        let tags = requestBody.tags;
        if (useOverrides) {
            const defaultRadarrId = requestBody.is4k
                ? settings.radarr.findIndex((r) => r.is4k && r.isDefault)
                : settings.radarr.findIndex((r) => !r.is4k && r.isDefault);
            const defaultSonarrId = requestBody.is4k
                ? settings.sonarr.findIndex((s) => s.is4k && s.isDefault)
                : settings.sonarr.findIndex((s) => !s.is4k && s.isDefault);
            const overrideRuleRepository = (0, datasource_1.getRepository)(OverrideRule_1.default);
            const overrideRules = await overrideRuleRepository.find({
                where: requestBody.mediaType === media_1.MediaType.MOVIE
                    ? { radarrServiceId: defaultRadarrId }
                    : { sonarrServiceId: defaultSonarrId },
            });
            const appliedOverrideRules = overrideRules.filter((rule) => {
                const hasAnimeKeyword = 'results' in tmdbMedia.keywords &&
                    tmdbMedia.keywords.results.some((keyword) => keyword.id === constants_1.ANIME_KEYWORD_ID);
                // Skip override rules if the media is an anime TV show as anime TV
                // is handled by default and override rules do not explicitly include
                // the anime keyword
                if (requestBody.mediaType === media_1.MediaType.TV &&
                    hasAnimeKeyword &&
                    (!rule.keywords ||
                        !rule.keywords.split(',').map(Number).includes(constants_1.ANIME_KEYWORD_ID))) {
                    return false;
                }
                if (rule.users &&
                    !rule.users
                        .split(',')
                        .some((userId) => Number(userId) === requestUser.id)) {
                    return false;
                }
                if (rule.genre &&
                    !rule.genre
                        .split(',')
                        .some((genreId) => tmdbMedia.genres
                        .map((genre) => genre.id)
                        .includes(Number(genreId)))) {
                    return false;
                }
                if (rule.language &&
                    !rule.language
                        .split('|')
                        .some((languageId) => languageId === tmdbMedia.original_language)) {
                    return false;
                }
                if (rule.keywords &&
                    !rule.keywords.split(',').some((keywordId) => {
                        let keywordList = [];
                        if ('keywords' in tmdbMedia.keywords) {
                            keywordList = tmdbMedia.keywords.keywords;
                        }
                        else if ('results' in tmdbMedia.keywords) {
                            keywordList = tmdbMedia.keywords.results;
                        }
                        return keywordList
                            .map((keyword) => keyword.id)
                            .includes(Number(keywordId));
                    })) {
                    return false;
                }
                return true;
            });
            // hacky way to prioritize rules
            // TODO: make this better
            const prioritizedRule = appliedOverrideRules.sort((a, b) => {
                const keys = ['genre', 'language', 'keywords'];
                const aSpecificity = keys.filter((key) => a[key] !== null).length;
                const bSpecificity = keys.filter((key) => b[key] !== null).length;
                // Take the rule with the most specific condition first
                return bSpecificity - aSpecificity;
            })[0];
            if (prioritizedRule) {
                if (prioritizedRule.rootFolder) {
                    rootFolder = prioritizedRule.rootFolder;
                }
                if (prioritizedRule.profileId) {
                    profileId = prioritizedRule.profileId;
                }
                if (prioritizedRule.tags) {
                    tags = [
                        ...new Set([
                            ...(tags || []),
                            ...prioritizedRule.tags.split(',').map((tag) => Number(tag)),
                        ]),
                    ];
                }
                logger_1.default.debug('Override rule applied.', {
                    label: 'Media Request',
                    overrides: prioritizedRule,
                });
            }
        }
        if (requestBody.mediaType === media_1.MediaType.MOVIE) {
            await mediaRepository.save(media);
            const request = new MediaRequest_1({
                type: media_1.MediaType.MOVIE,
                media,
                requestedBy: requestUser,
                // If the user is an admin or has the "auto approve" permission, automatically approve the request
                status: user.hasPermission([
                    requestBody.is4k
                        ? permissions_1.Permission.AUTO_APPROVE_4K
                        : permissions_1.Permission.AUTO_APPROVE,
                    requestBody.is4k
                        ? permissions_1.Permission.AUTO_APPROVE_4K_MOVIE
                        : permissions_1.Permission.AUTO_APPROVE_MOVIE,
                    permissions_1.Permission.MANAGE_REQUESTS,
                ], { type: 'or' })
                    ? media_1.MediaRequestStatus.APPROVED
                    : media_1.MediaRequestStatus.PENDING,
                modifiedBy: user.hasPermission([
                    requestBody.is4k
                        ? permissions_1.Permission.AUTO_APPROVE_4K
                        : permissions_1.Permission.AUTO_APPROVE,
                    requestBody.is4k
                        ? permissions_1.Permission.AUTO_APPROVE_4K_MOVIE
                        : permissions_1.Permission.AUTO_APPROVE_MOVIE,
                    permissions_1.Permission.MANAGE_REQUESTS,
                ], { type: 'or' })
                    ? user
                    : undefined,
                is4k: requestBody.is4k,
                serverId: requestBody.serverId,
                profileId: profileId,
                rootFolder: rootFolder,
                tags: tags,
                isAutoRequest: options.isAutoRequest ?? false,
                ignoreQuota,
            });
            await requestRepository.save(request);
            return request;
        }
        else {
            const tmdbMediaShow = tmdbMedia;
            let requestedSeasons = requestBody.seasons === 'all'
                ? tmdbMediaShow.seasons
                    .filter((season) => season.season_number !== 0)
                    .map((season) => season.season_number)
                : requestBody.seasons;
            if (!settings.main.enableSpecialEpisodes) {
                requestedSeasons = requestedSeasons.filter((sn) => sn > 0);
            }
            let existingSeasons = [];
            // We need to check existing requests on this title to make sure we don't double up on seasons that were
            // already requested. In the case they were, we just throw out any duplicates but still approve the request.
            // (Unless there are no seasons, in which case we abort)
            if (media.requests) {
                existingSeasons = media.requests
                    .filter((request) => request.is4k === requestBody.is4k &&
                    request.status !== media_1.MediaRequestStatus.DECLINED &&
                    request.status !== media_1.MediaRequestStatus.COMPLETED)
                    .reduce((seasons, request) => {
                    const combinedSeasons = request.seasons.map((season) => season.seasonNumber);
                    return [...seasons, ...combinedSeasons];
                }, []);
            }
            // We should also check seasons that are available/partially available but don't have existing requests
            if (media.seasons) {
                existingSeasons = [
                    ...existingSeasons,
                    ...media.seasons
                        .filter((season) => season[requestBody.is4k ? 'status4k' : 'status'] !==
                        media_1.MediaStatus.UNKNOWN &&
                        season[requestBody.is4k ? 'status4k' : 'status'] !==
                            media_1.MediaStatus.DELETED)
                        .map((season) => season.seasonNumber),
                ];
            }
            const finalSeasons = requestedSeasons.filter((rs) => !existingSeasons.includes(rs));
            if (finalSeasons.length === 0) {
                throw new NoSeasonsAvailableError('No seasons available to request');
            }
            else if (!ignoreQuota &&
                quotas.tv.limit &&
                finalSeasons.length > (quotas.tv.remaining ?? 0)) {
                throw new QuotaRestrictedError('Series Quota exceeded.');
            }
            await mediaRepository.save(media);
            const request = new MediaRequest_1({
                type: media_1.MediaType.TV,
                media,
                requestedBy: requestUser,
                // If the user is an admin or has the "auto approve" permission, automatically approve the request
                status: user.hasPermission([
                    requestBody.is4k
                        ? permissions_1.Permission.AUTO_APPROVE_4K
                        : permissions_1.Permission.AUTO_APPROVE,
                    requestBody.is4k
                        ? permissions_1.Permission.AUTO_APPROVE_4K_TV
                        : permissions_1.Permission.AUTO_APPROVE_TV,
                    permissions_1.Permission.MANAGE_REQUESTS,
                ], { type: 'or' })
                    ? media_1.MediaRequestStatus.APPROVED
                    : media_1.MediaRequestStatus.PENDING,
                modifiedBy: user.hasPermission([
                    requestBody.is4k
                        ? permissions_1.Permission.AUTO_APPROVE_4K
                        : permissions_1.Permission.AUTO_APPROVE,
                    requestBody.is4k
                        ? permissions_1.Permission.AUTO_APPROVE_4K_TV
                        : permissions_1.Permission.AUTO_APPROVE_TV,
                    permissions_1.Permission.MANAGE_REQUESTS,
                ], { type: 'or' })
                    ? user
                    : undefined,
                is4k: requestBody.is4k,
                serverId: requestBody.serverId,
                profileId: profileId,
                rootFolder: rootFolder,
                languageProfileId: requestBody.languageProfileId,
                tags: tags,
                seasons: finalSeasons.map((sn) => new SeasonRequest_1.default({
                    seasonNumber: sn,
                    status: user.hasPermission([
                        requestBody.is4k
                            ? permissions_1.Permission.AUTO_APPROVE_4K
                            : permissions_1.Permission.AUTO_APPROVE,
                        requestBody.is4k
                            ? permissions_1.Permission.AUTO_APPROVE_4K_TV
                            : permissions_1.Permission.AUTO_APPROVE_TV,
                        permissions_1.Permission.MANAGE_REQUESTS,
                    ], { type: 'or' })
                        ? media_1.MediaRequestStatus.APPROVED
                        : media_1.MediaRequestStatus.PENDING,
                })),
                isAutoRequest: options.isAutoRequest ?? false,
                ignoreQuota,
            });
            await requestRepository.save(request);
            return request;
        }
    }
    constructor(init) {
        Object.assign(this, init);
    }
    async notifyNewRequest() {
        if (this.status === media_1.MediaRequestStatus.PENDING) {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = await mediaRepository.findOne({
                where: { id: this.media.id },
            });
            if (!media) {
                logger_1.default.error('Media data not found', {
                    label: 'Media Request',
                    requestId: this.id,
                    mediaId: this.media.id,
                });
                return;
            }
            MediaRequest_1.sendNotification(this, media, notifications_1.Notification.MEDIA_PENDING);
            if (this.isAutoRequest) {
                MediaRequest_1.sendNotification(this, media, notifications_1.Notification.MEDIA_AUTO_REQUESTED);
            }
        }
    }
    /**
     * Notification for approval
     *
     * We only check on AfterUpdate as to not trigger this for
     * auto approved content
     */
    async notifyApprovedOrDeclined(autoApproved = false) {
        if (this.status === media_1.MediaRequestStatus.APPROVED ||
            this.status === media_1.MediaRequestStatus.DECLINED) {
            const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
            const media = await mediaRepository.findOne({
                where: { id: this.media.id },
            });
            if (!media) {
                logger_1.default.error('Media data not found', {
                    label: 'Media Request',
                    requestId: this.id,
                    mediaId: this.media.id,
                });
                return;
            }
            if (this.status === media_1.MediaRequestStatus.APPROVED &&
                media[this.is4k ? 'status4k' : 'status'] === media_1.MediaStatus.AVAILABLE) {
                logger_1.default.info('Media is already available. Sending availability notification instead of approval.', { label: 'Media Request', requestId: this.id, mediaId: this.media.id });
                MediaRequest_1.sendNotification(this, media, notifications_1.Notification.MEDIA_AVAILABLE);
                return;
            }
            MediaRequest_1.sendNotification(this, media, this.status === media_1.MediaRequestStatus.APPROVED
                ? autoApproved
                    ? notifications_1.Notification.MEDIA_AUTO_APPROVED
                    : notifications_1.Notification.MEDIA_APPROVED
                : notifications_1.Notification.MEDIA_DECLINED);
            if (this.status === media_1.MediaRequestStatus.APPROVED &&
                autoApproved &&
                this.isAutoRequest) {
                MediaRequest_1.sendNotification(this, media, notifications_1.Notification.MEDIA_AUTO_REQUESTED);
            }
        }
    }
    async autoapprovalNotification() {
        if (this.status === media_1.MediaRequestStatus.APPROVED) {
            this.notifyApprovedOrDeclined(true);
        }
    }
    sortSeasons() {
        if (Array.isArray(this.seasons)) {
            this.seasons.sort((a, b) => a.id - b.id);
        }
    }
    static async sendNotification(entity, media, type) {
        const tmdb = new themoviedb_1.default();
        try {
            const mediaType = entity.type === media_1.MediaType.MOVIE ? 'Movie' : 'Series';
            let event;
            let notifyAdmin = true;
            let notifySystem = true;
            switch (type) {
                case notifications_1.Notification.MEDIA_AVAILABLE:
                    event = `${entity.is4k ? '4K ' : ''}${mediaType} Now Available`;
                    notifyAdmin = false;
                    break;
                case notifications_1.Notification.MEDIA_APPROVED:
                    event = `${entity.is4k ? '4K ' : ''}${mediaType} Request Approved`;
                    notifyAdmin = false;
                    break;
                case notifications_1.Notification.MEDIA_DECLINED:
                    event = `${entity.is4k ? '4K ' : ''}${mediaType} Request Declined`;
                    notifyAdmin = false;
                    break;
                case notifications_1.Notification.MEDIA_PENDING:
                    event = `New ${entity.is4k ? '4K ' : ''}${mediaType} Request`;
                    break;
                case notifications_1.Notification.MEDIA_AUTO_REQUESTED:
                    event = `${entity.is4k ? '4K ' : ''}${mediaType} Request Automatically Submitted`;
                    notifyAdmin = false;
                    notifySystem = false;
                    break;
                case notifications_1.Notification.MEDIA_AUTO_APPROVED:
                    event = `${entity.is4k ? '4K ' : ''}${mediaType} Request Automatically Approved`;
                    break;
                case notifications_1.Notification.MEDIA_FAILED:
                    event = `${entity.is4k ? '4K ' : ''}${mediaType} Request Failed`;
                    break;
            }
            if (entity.type === media_1.MediaType.MOVIE) {
                const movie = await tmdb.getMovie({ movieId: media.tmdbId });
                notifications_1.default.sendNotification(type, {
                    media,
                    request: entity,
                    notifyAdmin,
                    notifySystem,
                    notifyUser: notifyAdmin ? undefined : entity.requestedBy,
                    event,
                    subject: `${movie.title}${movie.release_date ? ` (${movie.release_date.slice(0, 4)})` : ''}`,
                    message: (0, lodash_1.truncate)(movie.overview, {
                        length: 500,
                        separator: /\s/,
                        omission: '…',
                    }),
                    image: `https://image.tmdb.org/t/p/w600_and_h900_bestv2${movie.poster_path}`,
                });
            }
            else if (entity.type === media_1.MediaType.TV) {
                const tv = await tmdb.getTvShow({ tvId: media.tmdbId });
                notifications_1.default.sendNotification(type, {
                    media,
                    request: entity,
                    notifyAdmin,
                    notifySystem,
                    notifyUser: notifyAdmin ? undefined : entity.requestedBy,
                    event,
                    subject: `${tv.name}${tv.first_air_date ? ` (${tv.first_air_date.slice(0, 4)})` : ''}`,
                    message: (0, lodash_1.truncate)(tv.overview, {
                        length: 500,
                        separator: /\s/,
                        omission: '…',
                    }),
                    image: `https://image.tmdb.org/t/p/w600_and_h900_bestv2${tv.poster_path}`,
                    extra: [
                        {
                            name: 'Requested Seasons',
                            value: entity.seasons
                                .map((season) => season.seasonNumber)
                                .join(', '),
                        },
                    ],
                });
            }
        }
        catch (e) {
            logger_1.default.error('Something went wrong sending media notification(s)', {
                label: 'Notifications',
                errorMessage: e.message,
                requestId: entity.id,
                mediaId: entity.media.id,
            });
        }
    }
};
exports.MediaRequest = MediaRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], MediaRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], MediaRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Media_1.default, (media) => media.requests, {
        eager: true,
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Media_1.default)
], MediaRequest.prototype, "media", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.requests, {
        eager: true,
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", User_1.User)
], MediaRequest.prototype, "requestedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, {
        nullable: true,
        eager: true,
        onDelete: 'SET NULL',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", User_1.User)
], MediaRequest.prototype, "modifiedBy", void 0);
__decorate([
    (0, DbColumnHelper_1.DbAwareColumn)({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], MediaRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({
        type: (0, DbColumnHelper_1.resolveDbType)('datetime'),
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], MediaRequest.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], MediaRequest.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.RelationCount)((request) => request.seasons),
    __metadata("design:type", Number)
], MediaRequest.prototype, "seasonCount", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => SeasonRequest_1.default, (season) => season.request, {
        eager: true,
        cascade: true,
    }),
    __metadata("design:type", Array)
], MediaRequest.prototype, "seasons", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], MediaRequest.prototype, "is4k", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], MediaRequest.prototype, "serverId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], MediaRequest.prototype, "profileId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MediaRequest.prototype, "rootFolder", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], MediaRequest.prototype, "languageProfileId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        nullable: true,
        transformer: {
            from: (value) => {
                if (value) {
                    if (value === 'none') {
                        return [];
                    }
                    return value.split(',').map((v) => Number(v));
                }
                return null;
            },
            to: (value) => {
                if (value) {
                    const finalValue = value.join(',');
                    // We want to keep the actual state of an "empty array" so we use
                    // the keyword "none" to track this.
                    if (!finalValue) {
                        return 'none';
                    }
                    return finalValue;
                }
                return null;
            },
        },
    }),
    __metadata("design:type", Array)
], MediaRequest.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], MediaRequest.prototype, "isAutoRequest", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], MediaRequest.prototype, "ignoreQuota", void 0);
__decorate([
    (0, typeorm_1.AfterInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MediaRequest.prototype, "notifyNewRequest", null);
__decorate([
    (0, typeorm_1.AfterUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaRequest.prototype, "notifyApprovedOrDeclined", null);
__decorate([
    (0, typeorm_1.AfterInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MediaRequest.prototype, "autoapprovalNotification", null);
__decorate([
    (0, typeorm_1.AfterLoad)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MediaRequest.prototype, "sortSeasons", null);
exports.MediaRequest = MediaRequest = MediaRequest_1 = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], MediaRequest);
exports.default = MediaRequest;

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var Media_1;
Object.defineProperty(exports, "__esModule", { value: true });
const radarr_1 = __importDefault(require("../api/servarr/radarr"));
const sonarr_1 = __importDefault(require("../api/servarr/sonarr"));
const media_1 = require("../constants/media");
const server_1 = require("../constants/server");
const datasource_1 = require("../datasource");
const Blocklist_1 = require("../entity/Blocklist");
const Watchlist_1 = require("../entity/Watchlist");
const downloadtracker_1 = __importDefault(require("../lib/downloadtracker"));
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const DbColumnHelper_1 = require("../utils/DbColumnHelper");
const getHostname_1 = require("../utils/getHostname");
const typeorm_1 = require("typeorm");
const Issue_1 = __importDefault(require("./Issue"));
const MediaRequest_1 = require("./MediaRequest");
const Season_1 = __importDefault(require("./Season"));
let Media = Media_1 = class Media {
    static async getRelatedMedia(user, items) {
        const mediaRepository = (0, datasource_1.getRepository)(Media_1);
        try {
            if (items.length === 0) {
                return [];
            }
            const finalIds = [...new Set(items.map((i) => i.tmdbId))];
            const media = await mediaRepository
                .createQueryBuilder('media')
                .leftJoinAndSelect('media.watchlists', 'watchlist', 'media.id= watchlist.media and watchlist.requestedBy = :userId', { userId: user?.id }) //,
                .where(' media.tmdbId in (:...finalIds)', { finalIds })
                .getMany();
            return media.filter((m) => items.some((i) => i.tmdbId === m.tmdbId && i.mediaType === m.mediaType));
        }
        catch (e) {
            logger_1.default.error(e.message);
            return [];
        }
    }
    static async getMedia(id, mediaType) {
        const mediaRepository = (0, datasource_1.getRepository)(Media_1);
        try {
            const media = await mediaRepository.findOne({
                where: { tmdbId: id, mediaType: mediaType },
                relations: { requests: true, issues: true },
            });
            return media ?? undefined;
        }
        catch (e) {
            logger_1.default.error(e.message);
            return undefined;
        }
    }
    constructor(init) {
        this.downloadStatus = [];
        this.downloadStatus4k = [];
        Object.assign(this, init);
    }
    resetServiceData() {
        this.serviceId = null;
        this.serviceId4k = null;
        this.externalServiceId = null;
        this.externalServiceId4k = null;
        this.externalServiceSlug = null;
        this.externalServiceSlug4k = null;
        this.ratingKey = null;
        this.ratingKey4k = null;
        this.jellyfinMediaId = null;
        this.jellyfinMediaId4k = null;
    }
    setPlexUrls() {
        const { machineId, webAppUrl } = (0, settings_1.getSettings)().plex;
        const { externalUrl: tautulliUrl } = (0, settings_1.getSettings)().tautulli;
        if ((0, settings_1.getSettings)().main.mediaServerType == server_1.MediaServerType.PLEX) {
            if (this.ratingKey) {
                this.mediaUrl = `${webAppUrl ? webAppUrl : 'https://app.plex.tv/desktop'}#!/server/${machineId}/details?key=%2Flibrary%2Fmetadata%2F${this.ratingKey}`;
                this.iOSPlexUrl = `plex://preplay/?metadataKey=%2Flibrary%2Fmetadata%2F${this.ratingKey}&server=${machineId}`;
                if (tautulliUrl) {
                    this.tautulliUrl = `${tautulliUrl}/info?rating_key=${this.ratingKey}`;
                }
            }
            if (this.ratingKey4k) {
                this.mediaUrl4k = `${webAppUrl ? webAppUrl : 'https://app.plex.tv/desktop'}#!/server/${machineId}/details?key=%2Flibrary%2Fmetadata%2F${this.ratingKey4k}`;
                this.iOSPlexUrl4k = `plex://preplay/?metadataKey=%2Flibrary%2Fmetadata%2F${this.ratingKey4k}&server=${machineId}`;
                if (tautulliUrl) {
                    this.tautulliUrl4k = `${tautulliUrl}/info?rating_key=${this.ratingKey4k}`;
                }
            }
        }
        else {
            const pageName = (0, settings_1.getSettings)().main.mediaServerType == server_1.MediaServerType.EMBY
                ? 'item'
                : 'details';
            const { serverId, externalHostname } = (0, settings_1.getSettings)().jellyfin;
            const jellyfinHost = externalHostname && externalHostname.length > 0
                ? externalHostname
                : (0, getHostname_1.getHostname)();
            if (this.jellyfinMediaId) {
                this.mediaUrl = `${jellyfinHost}/web/index.html#!/${pageName}?id=${this.jellyfinMediaId}&context=home&serverId=${serverId}`;
            }
            if (this.jellyfinMediaId4k) {
                this.mediaUrl4k = `${jellyfinHost}/web/index.html#!/${pageName}?id=${this.jellyfinMediaId4k}&context=home&serverId=${serverId}`;
            }
        }
    }
    setServiceUrl() {
        if (this.mediaType === media_1.MediaType.MOVIE) {
            if (this.serviceId !== null && this.externalServiceSlug !== null) {
                const settings = (0, settings_1.getSettings)();
                const server = settings.radarr.find((radarr) => radarr.id === this.serviceId);
                if (server) {
                    this.serviceUrl = server.externalUrl
                        ? `${server.externalUrl}/movie/${this.externalServiceSlug}`
                        : radarr_1.default.buildUrl(server, `/movie/${this.externalServiceSlug}`);
                }
            }
            if (this.serviceId4k !== null && this.externalServiceSlug4k !== null) {
                const settings = (0, settings_1.getSettings)();
                const server = settings.radarr.find((radarr) => radarr.id === this.serviceId4k);
                if (server) {
                    this.serviceUrl4k = server.externalUrl
                        ? `${server.externalUrl}/movie/${this.externalServiceSlug4k}`
                        : radarr_1.default.buildUrl(server, `/movie/${this.externalServiceSlug4k}`);
                }
            }
        }
        if (this.mediaType === media_1.MediaType.TV) {
            if (this.serviceId !== null && this.externalServiceSlug !== null) {
                const settings = (0, settings_1.getSettings)();
                const server = settings.sonarr.find((sonarr) => sonarr.id === this.serviceId);
                if (server) {
                    this.serviceUrl = server.externalUrl
                        ? `${server.externalUrl}/series/${this.externalServiceSlug}`
                        : sonarr_1.default.buildUrl(server, `/series/${this.externalServiceSlug}`);
                }
            }
            if (this.serviceId4k !== null && this.externalServiceSlug4k !== null) {
                const settings = (0, settings_1.getSettings)();
                const server = settings.sonarr.find((sonarr) => sonarr.id === this.serviceId4k);
                if (server) {
                    this.serviceUrl4k = server.externalUrl
                        ? `${server.externalUrl}/series/${this.externalServiceSlug4k}`
                        : sonarr_1.default.buildUrl(server, `/series/${this.externalServiceSlug4k}`);
                }
            }
        }
    }
    getDownloadingItem() {
        if (this.mediaType === media_1.MediaType.MOVIE) {
            if (this.externalServiceId !== undefined &&
                this.externalServiceId !== null &&
                this.serviceId !== undefined &&
                this.serviceId !== null) {
                this.downloadStatus = downloadtracker_1.default.getMovieProgress(this.serviceId, this.externalServiceId);
            }
            if (this.externalServiceId4k !== undefined &&
                this.externalServiceId4k !== null &&
                this.serviceId4k !== undefined &&
                this.serviceId4k !== null) {
                this.downloadStatus4k = downloadtracker_1.default.getMovieProgress(this.serviceId4k, this.externalServiceId4k);
            }
        }
        if (this.mediaType === media_1.MediaType.TV) {
            if (this.externalServiceId !== undefined &&
                this.externalServiceId !== null &&
                this.serviceId !== undefined &&
                this.serviceId !== null) {
                this.downloadStatus = downloadtracker_1.default.getSeriesProgress(this.serviceId, this.externalServiceId);
            }
            if (this.externalServiceId4k !== undefined &&
                this.externalServiceId4k !== null &&
                this.serviceId4k !== undefined &&
                this.serviceId4k !== null) {
                this.downloadStatus4k = downloadtracker_1.default.getSeriesProgress(this.serviceId4k, this.externalServiceId4k);
            }
        }
    }
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Media.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Media.prototype, "mediaType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], Media.prototype, "tmdbId", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], Media.prototype, "tvdbId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Media.prototype, "imdbId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: media_1.MediaStatus.UNKNOWN }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], Media.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: media_1.MediaStatus.UNKNOWN }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], Media.prototype, "status4k", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => MediaRequest_1.MediaRequest, (request) => request.media, {
        cascade: ['insert', 'remove'],
    }),
    __metadata("design:type", Array)
], Media.prototype, "requests", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Watchlist_1.Watchlist, (watchlist) => watchlist.media),
    __metadata("design:type", Object)
], Media.prototype, "watchlists", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Season_1.default, (season) => season.media, {
        cascade: true,
        eager: true,
    }),
    __metadata("design:type", Array)
], Media.prototype, "seasons", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Issue_1.default, (issue) => issue.media, { cascade: true }),
    __metadata("design:type", Array)
], Media.prototype, "issues", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Blocklist_1.Blocklist, (blocklist) => blocklist.media),
    __metadata("design:type", Promise)
], Media.prototype, "blocklist", void 0);
__decorate([
    (0, DbColumnHelper_1.DbAwareColumn)({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], Media.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({
        type: (0, DbColumnHelper_1.resolveDbType)('datetime'),
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Media.prototype, "updatedAt", void 0);
__decorate([
    (0, DbColumnHelper_1.DbAwareColumn)({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], Media.prototype, "lastSeasonChange", void 0);
__decorate([
    (0, DbColumnHelper_1.DbAwareColumn)({
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
        nullable: true,
    }),
    __metadata("design:type", Date)
], Media.prototype, "mediaAddedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'int' }),
    __metadata("design:type", Object)
], Media.prototype, "serviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'int' }),
    __metadata("design:type", Object)
], Media.prototype, "serviceId4k", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'int' }),
    __metadata("design:type", Object)
], Media.prototype, "externalServiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'int' }),
    __metadata("design:type", Object)
], Media.prototype, "externalServiceId4k", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'varchar' }),
    __metadata("design:type", Object)
], Media.prototype, "externalServiceSlug", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'varchar' }),
    __metadata("design:type", Object)
], Media.prototype, "externalServiceSlug4k", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'varchar' }),
    __metadata("design:type", Object)
], Media.prototype, "ratingKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'varchar' }),
    __metadata("design:type", Object)
], Media.prototype, "ratingKey4k", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'varchar' }),
    __metadata("design:type", Object)
], Media.prototype, "jellyfinMediaId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'varchar' }),
    __metadata("design:type", Object)
], Media.prototype, "jellyfinMediaId4k", void 0);
__decorate([
    (0, typeorm_1.AfterLoad)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Media.prototype, "setPlexUrls", null);
__decorate([
    (0, typeorm_1.AfterLoad)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Media.prototype, "setServiceUrl", null);
__decorate([
    (0, typeorm_1.AfterLoad)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Media.prototype, "getDownloadingItem", null);
Media = Media_1 = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Index)(['tmdbId', 'mediaType']),
    __metadata("design:paramtypes", [Object])
], Media);
exports.default = Media;

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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Watchlist = exports.NotFoundError = exports.DuplicateWatchlistRequestError = void 0;
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const media_1 = require("../constants/media");
const datasource_1 = require("../datasource");
const Media_1 = __importDefault(require("../entity/Media"));
const User_1 = require("../entity/User");
const logger_1 = __importDefault(require("../logger"));
const DbColumnHelper_1 = require("../utils/DbColumnHelper");
const typeorm_1 = require("typeorm");
class DuplicateWatchlistRequestError extends Error {
}
exports.DuplicateWatchlistRequestError = DuplicateWatchlistRequestError;
class NotFoundError extends Error {
    constructor(message = 'Not found') {
        super(message);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
let Watchlist = class Watchlist {
    constructor(init) {
        this.ratingKey = '';
        this.title = '';
        Object.assign(this, init);
    }
    static async createWatchlist({ watchlistRequest, user, }) {
        const watchlistRepository = (0, datasource_1.getRepository)(this);
        const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
        const tmdb = new themoviedb_1.default();
        const tmdbMedia = watchlistRequest.mediaType === media_1.MediaType.MOVIE
            ? await tmdb.getMovie({ movieId: watchlistRequest.tmdbId })
            : await tmdb.getTvShow({ tvId: watchlistRequest.tmdbId });
        const existing = await watchlistRepository
            .createQueryBuilder('watchlist')
            .leftJoinAndSelect('watchlist.requestedBy', 'user')
            .where('user.id = :userId', { userId: user.id })
            .andWhere('watchlist.tmdbId = :tmdbId', {
            tmdbId: watchlistRequest.tmdbId,
        })
            .andWhere('watchlist.mediaType = :mediaType', {
            mediaType: watchlistRequest.mediaType,
        })
            .getMany();
        if (existing && existing.length > 0) {
            logger_1.default.warn('Duplicate request for watchlist blocked', {
                tmdbId: watchlistRequest.tmdbId,
                mediaType: watchlistRequest.mediaType,
                label: 'Watchlist',
            });
            throw new DuplicateWatchlistRequestError();
        }
        let media = await mediaRepository.findOne({
            where: {
                tmdbId: watchlistRequest.tmdbId,
                mediaType: watchlistRequest.mediaType,
            },
        });
        if (!media) {
            media = new Media_1.default({
                tmdbId: tmdbMedia.id,
                tvdbId: tmdbMedia.external_ids.tvdb_id,
                mediaType: watchlistRequest.mediaType,
            });
        }
        const watchlist = new this({
            ...watchlistRequest,
            requestedBy: user,
            media,
        });
        await mediaRepository.save(media);
        await watchlistRepository.save(watchlist);
        return watchlist;
    }
    static async deleteWatchlist(tmdbId, mediaType, user) {
        const watchlistRepository = (0, datasource_1.getRepository)(this);
        const watchlist = await watchlistRepository.findOneBy({
            tmdbId,
            mediaType,
            requestedBy: { id: user.id },
        });
        if (!watchlist) {
            throw new NotFoundError('not Found');
        }
        if (watchlist) {
            await watchlistRepository.delete(watchlist.id);
        }
        return watchlist;
    }
};
exports.Watchlist = Watchlist;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Watchlist.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", Object)
], Watchlist.prototype, "ratingKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Watchlist.prototype, "mediaType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", Object)
], Watchlist.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], Watchlist.prototype, "tmdbId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.watchlists, {
        eager: true,
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", User_1.User)
], Watchlist.prototype, "requestedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Media_1.default, (media) => media.watchlists, {
        eager: true,
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Media_1.default)
], Watchlist.prototype, "media", void 0);
__decorate([
    (0, DbColumnHelper_1.DbAwareColumn)({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], Watchlist.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({
        type: (0, DbColumnHelper_1.resolveDbType)('datetime'),
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Watchlist.prototype, "updatedAt", void 0);
exports.Watchlist = Watchlist = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Unique)('UNIQUE_USER_DB', ['tmdbId', 'mediaType', 'requestedBy']),
    __metadata("design:paramtypes", [Object])
], Watchlist);

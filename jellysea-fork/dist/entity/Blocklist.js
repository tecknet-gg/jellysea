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
exports.Blocklist = void 0;
const media_1 = require("../constants/media");
const datasource_1 = __importDefault(require("../datasource"));
const Media_1 = __importDefault(require("../entity/Media"));
const User_1 = require("../entity/User");
const DbColumnHelper_1 = require("../utils/DbColumnHelper");
const typeorm_1 = require("typeorm");
let Blocklist = class Blocklist {
    constructor(init) {
        Object.assign(this, init);
    }
    static async addToBlocklist({ blocklistRequest, }, entityManager) {
        const em = entityManager ?? datasource_1.default;
        const blocklist = new this({
            ...blocklistRequest,
        });
        const mediaRepository = em.getRepository(Media_1.default);
        let media = await mediaRepository.findOne({
            where: {
                tmdbId: blocklistRequest.tmdbId,
                mediaType: blocklistRequest.mediaType,
            },
        });
        const blocklistRepository = em.getRepository(this);
        await blocklistRepository.save(blocklist);
        if (!media) {
            media = new Media_1.default({
                tmdbId: blocklistRequest.tmdbId,
                status: media_1.MediaStatus.BLOCKLISTED,
                status4k: media_1.MediaStatus.BLOCKLISTED,
                mediaType: blocklistRequest.mediaType,
                blocklist: Promise.resolve(blocklist),
            });
            await mediaRepository.save(media);
        }
        else {
            media.blocklist = Promise.resolve(blocklist);
            media.status = media_1.MediaStatus.BLOCKLISTED;
            media.status4k = media_1.MediaStatus.BLOCKLISTED;
            await mediaRepository.save(media);
        }
    }
};
exports.Blocklist = Blocklist;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Blocklist.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Blocklist.prototype, "mediaType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'varchar' }),
    __metadata("design:type", String)
], Blocklist.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], Blocklist.prototype, "tmdbId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.id, {
        eager: true,
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", User_1.User)
], Blocklist.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Media_1.default, (media) => media.blocklist, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", Media_1.default)
], Blocklist.prototype, "media", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'varchar' }),
    __metadata("design:type", String)
], Blocklist.prototype, "blocklistedTags", void 0);
__decorate([
    (0, DbColumnHelper_1.DbAwareColumn)({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], Blocklist.prototype, "createdAt", void 0);
exports.Blocklist = Blocklist = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Unique)(['tmdbId', 'mediaType']),
    __metadata("design:paramtypes", [Object])
], Blocklist);

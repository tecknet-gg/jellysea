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
const media_1 = require("../constants/media");
const DbColumnHelper_1 = require("../utils/DbColumnHelper");
const typeorm_1 = require("typeorm");
const Media_1 = __importDefault(require("./Media"));
let Season = class Season {
    constructor(init) {
        Object.assign(this, init);
    }
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Season.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Season.prototype, "seasonNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: media_1.MediaStatus.UNKNOWN }),
    __metadata("design:type", Number)
], Season.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: media_1.MediaStatus.UNKNOWN }),
    __metadata("design:type", Number)
], Season.prototype, "status4k", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Media_1.default, (media) => media.seasons, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Promise)
], Season.prototype, "media", void 0);
__decorate([
    (0, DbColumnHelper_1.DbAwareColumn)({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], Season.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({
        type: (0, DbColumnHelper_1.resolveDbType)('datetime'),
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Season.prototype, "updatedAt", void 0);
Season = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], Season);
exports.default = Season;

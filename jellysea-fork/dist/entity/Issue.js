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
const issue_1 = require("../constants/issue");
const DbColumnHelper_1 = require("../utils/DbColumnHelper");
const typeorm_1 = require("typeorm");
const IssueComment_1 = __importDefault(require("./IssueComment"));
const Media_1 = __importDefault(require("./Media"));
const User_1 = require("./User");
let Issue = class Issue {
    sortComments() {
        this.comments?.sort((a, b) => a.id - b.id);
    }
    constructor(init) {
        Object.assign(this, init);
    }
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Issue.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], Issue.prototype, "issueType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: issue_1.IssueStatus.OPEN }),
    __metadata("design:type", Number)
], Issue.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Issue.prototype, "problemSeason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Issue.prototype, "problemEpisode", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Media_1.default, (media) => media.issues, {
        eager: true,
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Media_1.default)
], Issue.prototype, "media", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.createdIssues, {
        eager: true,
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", User_1.User)
], Issue.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, {
        eager: true,
        onDelete: 'CASCADE',
        nullable: true,
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", User_1.User)
], Issue.prototype, "modifiedBy", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => IssueComment_1.default, (comment) => comment.issue, {
        cascade: true,
        eager: true,
    }),
    __metadata("design:type", Array)
], Issue.prototype, "comments", void 0);
__decorate([
    (0, DbColumnHelper_1.DbAwareColumn)({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], Issue.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({
        type: (0, DbColumnHelper_1.resolveDbType)('datetime'),
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Issue.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.AfterLoad)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Issue.prototype, "sortComments", null);
Issue = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], Issue);
exports.default = Issue;

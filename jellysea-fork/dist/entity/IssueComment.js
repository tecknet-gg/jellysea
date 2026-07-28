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
const DbColumnHelper_1 = require("../utils/DbColumnHelper");
const typeorm_1 = require("typeorm");
const Issue_1 = __importDefault(require("./Issue"));
const User_1 = require("./User");
let IssueComment = class IssueComment {
    constructor(init) {
        Object.assign(this, init);
    }
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], IssueComment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, {
        eager: true,
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", User_1.User)
], IssueComment.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Issue_1.default, (issue) => issue.comments, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Issue_1.default)
], IssueComment.prototype, "issue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], IssueComment.prototype, "message", void 0);
__decorate([
    (0, DbColumnHelper_1.DbAwareColumn)({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], IssueComment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({
        type: (0, DbColumnHelper_1.resolveDbType)('datetime'),
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], IssueComment.prototype, "updatedAt", void 0);
IssueComment = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], IssueComment);
exports.default = IssueComment;

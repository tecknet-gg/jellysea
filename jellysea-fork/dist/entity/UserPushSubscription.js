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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserPushSubscription = void 0;
const DbColumnHelper_1 = require("../utils/DbColumnHelper");
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
let UserPushSubscription = class UserPushSubscription {
    constructor(init) {
        Object.assign(this, init);
    }
};
exports.UserPushSubscription = UserPushSubscription;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], UserPushSubscription.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.pushSubscriptions, {
        eager: true,
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", User_1.User)
], UserPushSubscription.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], UserPushSubscription.prototype, "endpoint", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], UserPushSubscription.prototype, "p256dh", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], UserPushSubscription.prototype, "auth", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UserPushSubscription.prototype, "userAgent", void 0);
__decorate([
    (0, DbColumnHelper_1.DbAwareColumn)({
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
        nullable: true,
    }),
    __metadata("design:type", Date)
], UserPushSubscription.prototype, "createdAt", void 0);
exports.UserPushSubscription = UserPushSubscription = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Unique)(['endpoint', 'user']),
    __metadata("design:paramtypes", [Object])
], UserPushSubscription);

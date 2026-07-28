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
exports.UserSettings = exports.ALL_NOTIFICATIONS = void 0;
const notifications_1 = require("../lib/notifications");
const settings_1 = require("../lib/settings");
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
exports.ALL_NOTIFICATIONS = Object.values(notifications_1.Notification)
    .filter((v) => !isNaN(Number(v)))
    .reduce((a, v) => a + Number(v), 0);
// convert between DB representation (JSON string) into typescript array
const jsonArrayTransformer = {
    from: (v) => {
        try {
            return v ? JSON.parse(v) : [];
        }
        catch {
            return [];
        }
    },
    to: (v) => v?.length ? JSON.stringify(v) : null,
};
let UserSettings = class UserSettings {
    constructor(init) {
        Object.assign(this, init);
    }
    hasNotificationType(key, type) {
        return (0, notifications_1.hasNotificationType)(type, this.notificationTypes[key] ?? 0);
    }
};
exports.UserSettings = UserSettings;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], UserSettings.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => User_1.User, (user) => user.settings, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", User_1.User)
], UserSettings.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], UserSettings.prototype, "locale", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UserSettings.prototype, "discoverRegion", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UserSettings.prototype, "streamingRegion", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UserSettings.prototype, "originalLanguage", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UserSettings.prototype, "pgpKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, transformer: jsonArrayTransformer }),
    __metadata("design:type", Array)
], UserSettings.prototype, "discordIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UserSettings.prototype, "pushbulletAccessToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UserSettings.prototype, "pushoverApplicationToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UserSettings.prototype, "pushoverUserKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UserSettings.prototype, "pushoverSound", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UserSettings.prototype, "telegramChatId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UserSettings.prototype, "telegramMessageThreadId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Boolean)
], UserSettings.prototype, "telegramSendSilently", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Boolean)
], UserSettings.prototype, "watchlistSyncMovies", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Boolean)
], UserSettings.prototype, "watchlistSyncTv", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        nullable: true,
        transformer: {
            from: (value) => {
                const defaultTypes = {
                    email: exports.ALL_NOTIFICATIONS,
                    discord: 0,
                    pushbullet: 0,
                    pushover: 0,
                    slack: 0,
                    telegram: 0,
                    webhook: 0,
                    webpush: exports.ALL_NOTIFICATIONS,
                };
                if (!value) {
                    return defaultTypes;
                }
                const values = JSON.parse(value);
                // Something with the migration to this field has caused some issue where
                // the value pre-populates with just a raw "2"? Here we check if that's the case
                // and return the default notification types if so
                if (typeof values !== 'object') {
                    return defaultTypes;
                }
                if (values.email == null) {
                    values.email = exports.ALL_NOTIFICATIONS;
                }
                if (values.webpush == null) {
                    values.webpush = exports.ALL_NOTIFICATIONS;
                }
                return values;
            },
            to: (value) => {
                if (!value || typeof value !== 'object') {
                    return null;
                }
                const allowedKeys = Object.values(settings_1.NotificationAgentKey);
                // Remove any unknown notification agent keys before saving to db
                Object.keys(value).forEach((key) => {
                    if (!allowedKeys.includes(key)) {
                        delete value[key];
                    }
                });
                return JSON.stringify(value);
            },
        },
    }),
    __metadata("design:type", Object)
], UserSettings.prototype, "notificationTypes", void 0);
exports.UserSettings = UserSettings = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], UserSettings);

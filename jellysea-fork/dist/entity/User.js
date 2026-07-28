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
var User_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const media_1 = require("../constants/media");
const user_1 = require("../constants/user");
const datasource_1 = require("../datasource");
const Watchlist_1 = require("../entity/Watchlist");
const email_1 = __importDefault(require("../lib/email"));
const permissions_1 = require("../lib/permissions");
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const DbColumnHelper_1 = require("../utils/DbColumnHelper");
const dateHelpers_1 = require("../utils/dateHelpers");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = require("crypto");
const nanoid_1 = require("nanoid");
const path_1 = __importDefault(require("path"));
const typeorm_1 = require("typeorm");
const Issue_1 = __importDefault(require("./Issue"));
const MediaRequest_1 = require("./MediaRequest");
const SeasonRequest_1 = __importDefault(require("./SeasonRequest"));
const UserPushSubscription_1 = require("./UserPushSubscription");
const UserSettings_1 = require("./UserSettings");
let User = User_1 = class User {
    static filterMany(users, showFiltered) {
        return users.map((u) => u.filter(showFiltered));
    }
    constructor(init) {
        this.permissions = 0;
        this.warnings = [];
        Object.assign(this, init);
    }
    filter(showFiltered) {
        const filtered = Object.assign({}, ...Object.keys(this)
            .filter((k) => showFiltered || !User_1.filteredFields.includes(k))
            .map((k) => ({ [k]: this[k] })));
        return filtered;
    }
    hasPermission(permissions, options) {
        return !!(0, permissions_1.hasPermission)(permissions, this.permissions, options);
    }
    passwordMatch(password) {
        return new Promise((resolve) => {
            if (this.password) {
                resolve(bcrypt_1.default.compare(password, this.password));
            }
            else {
                return resolve(false);
            }
        });
    }
    async setPassword(password) {
        const hashedPassword = await bcrypt_1.default.hash(password, 12);
        this.password = hashedPassword;
    }
    async generatePassword() {
        const password = (0, nanoid_1.nanoid)(16);
        await this.setPassword(password);
        const { applicationTitle, applicationUrl } = (0, settings_1.getSettings)().main;
        try {
            logger_1.default.info(`Sending generated password email for ${this.email}`, {
                label: 'User Management',
            });
            const email = new email_1.default((0, settings_1.getSettings)().notifications.agents.email);
            await email.send({
                template: path_1.default.join(__dirname, '../templates/email/generatedpassword'),
                message: {
                    to: this.email,
                },
                locals: {
                    password: password,
                    applicationUrl,
                    applicationTitle,
                    recipientName: this.username,
                },
            });
        }
        catch (e) {
            logger_1.default.error('Failed to send out generated password email', {
                label: 'User Management',
                message: e.message,
            });
        }
    }
    async resetPassword() {
        const guid = (0, crypto_1.randomUUID)();
        this.resetPasswordGuid = guid;
        // 24 hours into the future
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1);
        this.recoveryLinkExpirationDate = targetDate;
        const { applicationTitle, applicationUrl } = (0, settings_1.getSettings)().main;
        const resetPasswordLink = `${applicationUrl}/resetpassword/${guid}`;
        try {
            logger_1.default.info(`Sending reset password email for ${this.email}`, {
                label: 'User Management',
            });
            const email = new email_1.default((0, settings_1.getSettings)().notifications.agents.email);
            await email.send({
                template: path_1.default.join(__dirname, '../templates/email/resetpassword'),
                message: {
                    to: this.email,
                },
                locals: {
                    resetPasswordLink,
                    applicationUrl,
                    applicationTitle,
                    recipientName: this.displayName,
                    recipientEmail: this.email,
                },
            });
        }
        catch (e) {
            logger_1.default.error('Failed to send out reset password email', {
                label: 'User Management',
                message: e.message,
            });
        }
    }
    setDisplayName() {
        this.displayName =
            this.username || this.plexUsername || this.jellyfinUsername || this.email;
    }
    async getQuota() {
        const { main: { defaultQuotas }, } = (0, settings_1.getSettings)();
        const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        const canBypass = this.hasPermission([permissions_1.Permission.MANAGE_USERS], {
            type: 'or',
        });
        const movieQuotaLimit = !canBypass
            ? (this.movieQuotaLimit ?? defaultQuotas.movie.quotaLimit)
            : 0;
        const movieQuotaDays = this.movieQuotaDays ?? defaultQuotas.movie.quotaDays;
        // Count movie requests made during quota period
        const movieDate = new Date();
        if (movieQuotaDays) {
            movieDate.setDate(movieDate.getDate() - movieQuotaDays);
        }
        const movieQuotaUsed = movieQuotaLimit
            ? await requestRepository.count({
                where: {
                    requestedBy: {
                        id: this.id,
                    },
                    ...(movieQuotaDays ? { createdAt: (0, dateHelpers_1.AfterDate)(movieDate) } : {}),
                    type: media_1.MediaType.MOVIE,
                    status: (0, typeorm_1.Not)(media_1.MediaRequestStatus.DECLINED),
                    ignoreQuota: false,
                },
            })
            : 0;
        const tvQuotaLimit = !canBypass
            ? (this.tvQuotaLimit ?? defaultQuotas.tv.quotaLimit)
            : 0;
        const tvQuotaDays = this.tvQuotaDays ?? defaultQuotas.tv.quotaDays;
        // Count tv season requests made during quota period
        const tvDate = new Date();
        if (tvQuotaDays) {
            tvDate.setDate(tvDate.getDate() - tvQuotaDays);
        }
        const tvQuotaStartDate = tvDate.toJSON();
        const tvQuotaUsedQuery = requestRepository
            .createQueryBuilder('request')
            .leftJoin('request.requestedBy', 'requestedBy')
            .where('request.type = :requestType', {
            requestType: media_1.MediaType.TV,
        })
            .andWhere('requestedBy.id = :userId', {
            userId: this.id,
        })
            .andWhere('request.status != :declinedStatus', {
            declinedStatus: media_1.MediaRequestStatus.DECLINED,
        });
        if (tvQuotaDays) {
            tvQuotaUsedQuery.andWhere('request.createdAt > :date', {
                date: tvQuotaStartDate,
            });
        }
        const tvQuotaUsed = tvQuotaLimit
            ? (await tvQuotaUsedQuery
                .andWhere('request.ignoreQuota = :ignoreQuota', {
                ignoreQuota: false,
            })
                .addSelect((subQuery) => {
                return subQuery
                    .select('COUNT(season.id)', 'seasonCount')
                    .from(SeasonRequest_1.default, 'season')
                    .leftJoin('season.request', 'parentRequest')
                    .where('parentRequest.id = request.id');
            }, 'seasonCount')
                .getMany()).reduce((sum, req) => sum + req.seasonCount, 0)
            : 0;
        return {
            movie: {
                days: movieQuotaDays,
                limit: movieQuotaLimit,
                used: movieQuotaUsed,
                remaining: movieQuotaLimit
                    ? Math.max(0, movieQuotaLimit - movieQuotaUsed)
                    : undefined,
                restricted: !!(movieQuotaLimit && movieQuotaLimit - movieQuotaUsed <= 0),
            },
            tv: {
                days: tvQuotaDays,
                limit: tvQuotaLimit,
                used: tvQuotaUsed,
                remaining: tvQuotaLimit
                    ? Math.max(0, tvQuotaLimit - tvQuotaUsed)
                    : undefined,
                restricted: !!(tvQuotaLimit && tvQuotaLimit - tvQuotaUsed <= 0),
            },
        };
    }
};
exports.User = User;
User.filteredFields = [
    'email',
    'plexId',
    'password',
    'resetPasswordGuid',
    'jellyfinDeviceId',
    'jellyfinAuthToken',
    'plexToken',
    'settings',
];
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        unique: true,
        transformer: {
            from: (value) => (value ?? '').toLowerCase(),
            to: (value) => (value ?? '').toLowerCase(),
        },
    }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "plexUsername", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "jellyfinUsername", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", String)
], User.prototype, "resetPasswordGuid", void 0);
__decorate([
    (0, DbColumnHelper_1.DbAwareColumn)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "recoveryLinkExpirationDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: user_1.UserType.PLEX }),
    __metadata("design:type", Number)
], User.prototype, "userType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true, select: true }),
    __metadata("design:type", Object)
], User.prototype, "plexId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "jellyfinUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, select: false }),
    __metadata("design:type", Object)
], User.prototype, "jellyfinDeviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, select: false }),
    __metadata("design:type", Object)
], User.prototype, "jellyfinAuthToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, select: false }),
    __metadata("design:type", Object)
], User.prototype, "plexToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Object)
], User.prototype, "permissions", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "avatar", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "avatarETag", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "avatarVersion", void 0);
__decorate([
    (0, typeorm_1.RelationCount)((user) => user.requests),
    __metadata("design:type", Number)
], User.prototype, "requestCount", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => MediaRequest_1.MediaRequest, (request) => request.requestedBy),
    __metadata("design:type", Array)
], User.prototype, "requests", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Watchlist_1.Watchlist, (watchlist) => watchlist.requestedBy),
    __metadata("design:type", Array)
], User.prototype, "watchlists", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "movieQuotaLimit", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "movieQuotaDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "tvQuotaLimit", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "tvQuotaDays", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => UserSettings_1.UserSettings, (settings) => settings.user, {
        cascade: true,
        eager: true,
        onDelete: 'CASCADE',
    }),
    __metadata("design:type", UserSettings_1.UserSettings)
], User.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => UserPushSubscription_1.UserPushSubscription, (pushSub) => pushSub.user),
    __metadata("design:type", Array)
], User.prototype, "pushSubscriptions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Issue_1.default, (issue) => issue.createdBy, { cascade: true }),
    __metadata("design:type", Array)
], User.prototype, "createdIssues", void 0);
__decorate([
    (0, DbColumnHelper_1.DbAwareColumn)({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({
        type: (0, DbColumnHelper_1.resolveDbType)('datetime'),
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.AfterLoad)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], User.prototype, "setDisplayName", null);
exports.User = User = User_1 = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], User);

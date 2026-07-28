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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueSubscriber = void 0;
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const issue_1 = require("../constants/issue");
const media_1 = require("../constants/media");
const Issue_1 = __importDefault(require("../entity/Issue"));
const notifications_1 = __importStar(require("../lib/notifications"));
const permissions_1 = require("../lib/permissions");
const logger_1 = __importDefault(require("../logger"));
const lodash_1 = require("lodash");
const typeorm_1 = require("typeorm");
let IssueSubscriber = class IssueSubscriber {
    listenTo() {
        return Issue_1.default;
    }
    async sendIssueNotification(entity, type) {
        let title;
        let image;
        const tmdb = new themoviedb_1.default();
        try {
            if (entity.media.mediaType === media_1.MediaType.MOVIE) {
                const movie = await tmdb.getMovie({ movieId: entity.media.tmdbId });
                title = `${movie.title}${movie.release_date ? ` (${movie.release_date.slice(0, 4)})` : ''}`;
                image = `https://image.tmdb.org/t/p/w600_and_h900_bestv2${movie.poster_path}`;
            }
            else {
                const tvshow = await tmdb.getTvShow({ tvId: entity.media.tmdbId });
                title = `${tvshow.name}${tvshow.first_air_date ? ` (${tvshow.first_air_date.slice(0, 4)})` : ''}`;
                image = `https://image.tmdb.org/t/p/w600_and_h900_bestv2${tvshow.poster_path}`;
            }
            const [firstComment] = (0, lodash_1.sortBy)(entity.comments, 'id');
            const extra = [];
            if (entity.media.mediaType === media_1.MediaType.TV && entity.problemSeason > 0) {
                extra.push({
                    name: 'Affected Season',
                    value: entity.problemSeason.toString(),
                });
                if (entity.problemEpisode > 0) {
                    extra.push({
                        name: 'Affected Episode',
                        value: entity.problemEpisode.toString(),
                    });
                }
            }
            notifications_1.default.sendNotification(type, {
                event: type === notifications_1.Notification.ISSUE_CREATED
                    ? `New ${entity.issueType !== issue_1.IssueType.OTHER
                        ? `${issue_1.IssueTypeName[entity.issueType]} `
                        : ''}Issue Reported`
                    : type === notifications_1.Notification.ISSUE_RESOLVED
                        ? `${entity.issueType !== issue_1.IssueType.OTHER
                            ? `${issue_1.IssueTypeName[entity.issueType]} `
                            : ''}Issue Resolved`
                        : `${entity.issueType !== issue_1.IssueType.OTHER
                            ? `${issue_1.IssueTypeName[entity.issueType]} `
                            : ''}Issue Reopened`,
                subject: title,
                message: firstComment.message,
                issue: entity,
                media: entity.media,
                image,
                extra,
                notifyAdmin: true,
                notifySystem: true,
                notifyUser: !entity.createdBy.hasPermission(permissions_1.Permission.MANAGE_ISSUES) &&
                    entity.modifiedBy?.id !== entity.createdBy.id &&
                    (type === notifications_1.Notification.ISSUE_RESOLVED ||
                        type === notifications_1.Notification.ISSUE_REOPENED)
                    ? entity.createdBy
                    : undefined,
            });
        }
        catch (e) {
            logger_1.default.error('Something went wrong sending issue notification(s)', {
                label: 'Notifications',
                errorMessage: e.message,
                issueId: entity.id,
            });
        }
    }
    afterInsert(event) {
        if (!event.entity) {
            return;
        }
        this.sendIssueNotification(event.entity, notifications_1.Notification.ISSUE_CREATED);
    }
    beforeUpdate(event) {
        if (!event.entity) {
            return;
        }
        if (event.entity.status === issue_1.IssueStatus.RESOLVED &&
            event.databaseEntity.status !== issue_1.IssueStatus.RESOLVED) {
            this.sendIssueNotification(event.entity, notifications_1.Notification.ISSUE_RESOLVED);
        }
        else if (event.entity.status === issue_1.IssueStatus.OPEN &&
            event.databaseEntity.status !== issue_1.IssueStatus.OPEN) {
            this.sendIssueNotification(event.entity, notifications_1.Notification.ISSUE_REOPENED);
        }
    }
};
exports.IssueSubscriber = IssueSubscriber;
exports.IssueSubscriber = IssueSubscriber = __decorate([
    (0, typeorm_1.EventSubscriber)()
], IssueSubscriber);

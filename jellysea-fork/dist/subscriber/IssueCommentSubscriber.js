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
exports.IssueCommentSubscriber = void 0;
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const issue_1 = require("../constants/issue");
const media_1 = require("../constants/media");
const datasource_1 = require("../datasource");
const IssueComment_1 = __importDefault(require("../entity/IssueComment"));
const Media_1 = __importDefault(require("../entity/Media"));
const User_1 = require("../entity/User");
const notifications_1 = __importStar(require("../lib/notifications"));
const permissions_1 = require("../lib/permissions");
const logger_1 = __importDefault(require("../logger"));
const lodash_1 = require("lodash");
const typeorm_1 = require("typeorm");
let IssueCommentSubscriber = class IssueCommentSubscriber {
    listenTo() {
        return IssueComment_1.default;
    }
    async sendIssueCommentNotification(entity) {
        let title;
        let image;
        const tmdb = new themoviedb_1.default();
        try {
            const issue = (await (0, datasource_1.getRepository)(IssueComment_1.default).findOneOrFail({
                where: { id: entity.id },
                relations: { issue: true },
            })).issue;
            const createdBy = await (0, datasource_1.getRepository)(User_1.User).findOneOrFail({
                where: { id: issue.createdBy.id },
            });
            const media = await (0, datasource_1.getRepository)(Media_1.default).findOneOrFail({
                where: { id: issue.media.id },
            });
            if (media.mediaType === media_1.MediaType.MOVIE) {
                const movie = await tmdb.getMovie({ movieId: media.tmdbId });
                title = `${movie.title}${movie.release_date ? ` (${movie.release_date.slice(0, 4)})` : ''}`;
                image = `https://image.tmdb.org/t/p/w600_and_h900_bestv2${movie.poster_path}`;
            }
            else {
                const tvshow = await tmdb.getTvShow({ tvId: media.tmdbId });
                title = `${tvshow.name}${tvshow.first_air_date ? ` (${tvshow.first_air_date.slice(0, 4)})` : ''}`;
                image = `https://image.tmdb.org/t/p/w600_and_h900_bestv2${tvshow.poster_path}`;
            }
            const [firstComment] = (0, lodash_1.sortBy)(issue.comments, 'id');
            if (entity.id !== firstComment.id) {
                // Send notifications to all issue managers
                notifications_1.default.sendNotification(notifications_1.Notification.ISSUE_COMMENT, {
                    event: `New Comment on ${issue.issueType !== issue_1.IssueType.OTHER
                        ? `${issue_1.IssueTypeName[issue.issueType]} `
                        : ''}Issue`,
                    subject: title,
                    message: firstComment.message,
                    comment: entity,
                    issue,
                    media,
                    image,
                    notifyAdmin: true,
                    notifySystem: true,
                    notifyUser: !createdBy.hasPermission(permissions_1.Permission.MANAGE_ISSUES) &&
                        createdBy.id !== entity.user.id
                        ? createdBy
                        : undefined,
                });
            }
        }
        catch (e) {
            logger_1.default.error('Something went wrong sending issue comment notification(s)', {
                label: 'Notifications',
                errorMessage: e.message,
                commentId: entity.id,
            });
        }
    }
    afterInsert(event) {
        if (!event.entity) {
            return;
        }
        this.sendIssueCommentNotification(event.entity);
    }
};
exports.IssueCommentSubscriber = IssueCommentSubscriber;
exports.IssueCommentSubscriber = IssueCommentSubscriber = __decorate([
    (0, typeorm_1.EventSubscriber)()
], IssueCommentSubscriber);

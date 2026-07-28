"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const issue_1 = require("../constants/issue");
const datasource_1 = require("../datasource");
const Issue_1 = __importDefault(require("../entity/Issue"));
const IssueComment_1 = __importDefault(require("../entity/IssueComment"));
const Media_1 = __importDefault(require("../entity/Media"));
const User_1 = require("../entity/User");
const permissions_1 = require("../lib/permissions");
const logger_1 = __importDefault(require("../logger"));
const auth_1 = require("../middleware/auth");
const express_1 = require("express");
const issueRoutes = (0, express_1.Router)();
issueRoutes.get('/', (0, auth_1.isAuthenticated)([
    permissions_1.Permission.MANAGE_ISSUES,
    permissions_1.Permission.VIEW_ISSUES,
    permissions_1.Permission.CREATE_ISSUES,
], { type: 'or' }), async (req, res, next) => {
    const pageSize = req.query.take ? Number(req.query.take) : 10;
    const skip = req.query.skip ? Number(req.query.skip) : 0;
    const createdBy = req.query.createdBy ? Number(req.query.createdBy) : null;
    let sortFilter;
    switch (req.query.sort) {
        case 'modified':
            sortFilter = 'issue.updatedAt';
            break;
        default:
            sortFilter = 'issue.createdAt';
    }
    let statusFilter;
    switch (req.query.filter) {
        case 'open':
            statusFilter = [issue_1.IssueStatus.OPEN];
            break;
        case 'resolved':
            statusFilter = [issue_1.IssueStatus.RESOLVED];
            break;
        default:
            statusFilter = [issue_1.IssueStatus.OPEN, issue_1.IssueStatus.RESOLVED];
    }
    let query = (0, datasource_1.getRepository)(Issue_1.default)
        .createQueryBuilder('issue')
        .leftJoinAndSelect('issue.createdBy', 'createdBy')
        .leftJoinAndSelect('issue.media', 'media')
        .leftJoinAndSelect('issue.modifiedBy', 'modifiedBy')
        .leftJoinAndSelect('issue.comments', 'comments')
        .where('issue.status IN (:...issueStatus)', {
        issueStatus: statusFilter,
    });
    if (!req.user?.hasPermission([permissions_1.Permission.MANAGE_ISSUES, permissions_1.Permission.VIEW_ISSUES], { type: 'or' })) {
        if (createdBy && createdBy !== req.user?.id) {
            return next({
                status: 403,
                message: 'You do not have permission to view issues reported by other users',
            });
        }
        query = query.andWhere('createdBy.id = :id', { id: req.user?.id });
    }
    else if (createdBy) {
        query = query.andWhere('createdBy.id = :id', { id: createdBy });
    }
    const [issues, issueCount] = await query
        .orderBy(sortFilter, 'DESC')
        .take(pageSize)
        .skip(skip)
        .getManyAndCount();
    return res.status(200).json({
        pageInfo: {
            pages: Math.ceil(issueCount / pageSize),
            pageSize,
            results: issueCount,
            page: Math.ceil(skip / pageSize) + 1,
        },
        results: issues,
    });
});
issueRoutes.post('/', (0, auth_1.isAuthenticated)([permissions_1.Permission.MANAGE_ISSUES, permissions_1.Permission.CREATE_ISSUES], {
    type: 'or',
}), async (req, res, next) => {
    // Satisfy typescript here. User is set, we assure you!
    if (!req.user) {
        return next({ status: 500, message: 'User missing from request.' });
    }
    const issueRepository = (0, datasource_1.getRepository)(Issue_1.default);
    const mediaRepository = (0, datasource_1.getRepository)(Media_1.default);
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const media = await mediaRepository.findOne({
        where: { id: req.body.mediaId },
    });
    if (!media) {
        return next({ status: 404, message: 'Media does not exist.' });
    }
    let createdBy = req.user;
    if (req.body.userId != null && req.body.userId !== req.user.id) {
        if (!req.user.hasPermission(permissions_1.Permission.MANAGE_ISSUES)) {
            return next({
                status: 403,
                message: 'You do not have permission to create an issue on behalf of another user.',
            });
        }
        const user = await userRepository.findOne({
            where: { id: req.body.userId },
        });
        if (!user) {
            return next({ status: 404, message: 'Issue user not found' });
        }
        createdBy = user;
    }
    const issue = new Issue_1.default({
        createdBy,
        issueType: req.body.issueType,
        problemSeason: req.body.problemSeason,
        problemEpisode: req.body.problemEpisode,
        media,
        comments: [
            new IssueComment_1.default({
                user: createdBy,
                message: req.body.message,
            }),
        ],
    });
    const newIssue = await issueRepository.save(issue);
    return res.status(201).json(newIssue);
});
issueRoutes.get('/count', async (req, res, next) => {
    const issueRepository = (0, datasource_1.getRepository)(Issue_1.default);
    try {
        const query = issueRepository.createQueryBuilder('issue');
        const totalCount = await query.getCount();
        const videoCount = await query
            .where('issue.issueType = :issueType', {
            issueType: issue_1.IssueType.VIDEO,
        })
            .getCount();
        const audioCount = await query
            .where('issue.issueType = :issueType', {
            issueType: issue_1.IssueType.AUDIO,
        })
            .getCount();
        const subtitlesCount = await query
            .where('issue.issueType = :issueType', {
            issueType: issue_1.IssueType.SUBTITLES,
        })
            .getCount();
        const othersCount = await query
            .where('issue.issueType = :issueType', {
            issueType: issue_1.IssueType.OTHER,
        })
            .getCount();
        const openCount = await query
            .where('issue.status = :issueStatus', {
            issueStatus: issue_1.IssueStatus.OPEN,
        })
            .getCount();
        const closedCount = await query
            .where('issue.status = :issueStatus', {
            issueStatus: issue_1.IssueStatus.RESOLVED,
        })
            .getCount();
        return res.status(200).json({
            total: totalCount,
            video: videoCount,
            audio: audioCount,
            subtitles: subtitlesCount,
            others: othersCount,
            open: openCount,
            closed: closedCount,
        });
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving issue counts.', {
            label: 'API',
            errorMessage: e.message,
        });
        next({ status: 500, message: 'Unable to retrieve issue counts.' });
    }
});
issueRoutes.get('/:issueId', (0, auth_1.isAuthenticated)([
    permissions_1.Permission.MANAGE_ISSUES,
    permissions_1.Permission.VIEW_ISSUES,
    permissions_1.Permission.CREATE_ISSUES,
], { type: 'or' }), async (req, res, next) => {
    const issueRepository = (0, datasource_1.getRepository)(Issue_1.default);
    // Satisfy typescript here. User is set, we assure you!
    if (!req.user) {
        return next({ status: 500, message: 'User missing from request.' });
    }
    try {
        const issue = await issueRepository
            .createQueryBuilder('issue')
            .leftJoinAndSelect('issue.comments', 'comments')
            .leftJoinAndSelect('issue.createdBy', 'createdBy')
            .leftJoinAndSelect('comments.user', 'user')
            .leftJoinAndSelect('issue.media', 'media')
            .where('issue.id = :issueId', { issueId: Number(req.params.issueId) })
            .getOneOrFail();
        if (issue.createdBy.id !== req.user.id &&
            !req.user.hasPermission([permissions_1.Permission.MANAGE_ISSUES, permissions_1.Permission.VIEW_ISSUES], { type: 'or' })) {
            return next({
                status: 403,
                message: 'You do not have permission to view this issue.',
            });
        }
        return res.status(200).json(issue);
    }
    catch (e) {
        logger_1.default.debug('Failed to retrieve issue.', {
            label: 'API',
            errorMessage: e.message,
        });
        next({ status: 500, message: 'Issue not found.' });
    }
});
issueRoutes.post('/:issueId/comment', (0, auth_1.isAuthenticated)([permissions_1.Permission.MANAGE_ISSUES, permissions_1.Permission.CREATE_ISSUES], {
    type: 'or',
}), async (req, res, next) => {
    const issueRepository = (0, datasource_1.getRepository)(Issue_1.default);
    // Satisfy typescript here. User is set, we assure you!
    if (!req.user) {
        return next({ status: 500, message: 'User missing from request.' });
    }
    try {
        const issue = await issueRepository.findOneOrFail({
            where: { id: Number(req.params.issueId) },
        });
        if (issue.createdBy.id !== req.user.id &&
            !req.user.hasPermission(permissions_1.Permission.MANAGE_ISSUES)) {
            return next({
                status: 403,
                message: 'You do not have permission to comment on this issue.',
            });
        }
        const comment = new IssueComment_1.default({
            message: req.body.message,
            user: req.user,
        });
        issue.comments = [...issue.comments, comment];
        issue.updatedAt = new Date();
        await issueRepository.save(issue);
        return res.status(200).json(issue);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong creating an issue comment.', {
            label: 'API',
            errorMessage: e.message,
        });
        next({ status: 500, message: 'Issue not found.' });
    }
});
issueRoutes.post('/:issueId/:status', (0, auth_1.isAuthenticated)([permissions_1.Permission.MANAGE_ISSUES, permissions_1.Permission.CREATE_ISSUES], {
    type: 'or',
}), async (req, res, next) => {
    const issueRepository = (0, datasource_1.getRepository)(Issue_1.default);
    // Satisfy typescript here. User is set, we assure you!
    if (!req.user) {
        return next({ status: 500, message: 'User missing from request.' });
    }
    try {
        const issue = await issueRepository.findOneOrFail({
            where: { id: Number(req.params.issueId) },
        });
        if (!req.user?.hasPermission(permissions_1.Permission.MANAGE_ISSUES) &&
            issue.createdBy.id !== req.user?.id) {
            return next({
                status: 401,
                message: 'You do not have permission to modify this issue.',
            });
        }
        let newStatus;
        switch (req.params.status) {
            case 'resolved':
                newStatus = issue_1.IssueStatus.RESOLVED;
                break;
            case 'open':
                newStatus = issue_1.IssueStatus.OPEN;
        }
        if (!newStatus) {
            return next({
                status: 400,
                message: 'You must provide a valid status',
            });
        }
        issue.status = newStatus;
        issue.modifiedBy = req.user;
        await issueRepository.save(issue);
        return res.status(200).json(issue);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong creating an issue comment.', {
            label: 'API',
            errorMessage: e.message,
        });
        next({ status: 500, message: 'Issue not found.' });
    }
});
issueRoutes.delete('/:issueId', (0, auth_1.isAuthenticated)([permissions_1.Permission.MANAGE_ISSUES, permissions_1.Permission.CREATE_ISSUES], {
    type: 'or',
}), async (req, res, next) => {
    const issueRepository = (0, datasource_1.getRepository)(Issue_1.default);
    try {
        const issue = await issueRepository.findOneOrFail({
            where: { id: Number(req.params.issueId) },
            relations: { createdBy: true },
        });
        if (!req.user?.hasPermission(permissions_1.Permission.MANAGE_ISSUES) &&
            (issue.createdBy.id !== req.user?.id || issue.comments.length > 1)) {
            return next({
                status: 401,
                message: 'You do not have permission to delete this issue.',
            });
        }
        await issueRepository.remove(issue);
        return res.status(204).send();
    }
    catch (e) {
        logger_1.default.error('Something went wrong deleting an issue.', {
            label: 'API',
            errorMessage: e.message,
        });
        next({ status: 404, message: 'Issue not found.' });
    }
});
exports.default = issueRoutes;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const datasource_1 = require("../datasource");
const IssueComment_1 = __importDefault(require("../entity/IssueComment"));
const permissions_1 = require("../lib/permissions");
const logger_1 = __importDefault(require("../logger"));
const auth_1 = require("../middleware/auth");
const express_1 = require("express");
const issueCommentRoutes = (0, express_1.Router)();
issueCommentRoutes.get('/:commentId', (0, auth_1.isAuthenticated)([
    permissions_1.Permission.MANAGE_ISSUES,
    permissions_1.Permission.VIEW_ISSUES,
    permissions_1.Permission.CREATE_ISSUES,
], {
    type: 'or',
}), async (req, res, next) => {
    const issueCommentRepository = (0, datasource_1.getRepository)(IssueComment_1.default);
    try {
        const comment = await issueCommentRepository.findOneOrFail({
            where: { id: Number(req.params.commentId) },
        });
        if (!req.user?.hasPermission([permissions_1.Permission.MANAGE_ISSUES, permissions_1.Permission.VIEW_ISSUES], { type: 'or' }) &&
            comment.user.id !== req.user?.id) {
            return next({
                status: 403,
                message: 'You do not have permission to view this comment.',
            });
        }
        return res.status(200).json(comment);
    }
    catch (e) {
        logger_1.default.debug('Request for unknown issue comment failed', {
            label: 'API',
            errorMessage: e.message,
        });
        next({ status: 404, message: 'Issue comment not found.' });
    }
});
issueCommentRoutes.put('/:commentId', (0, auth_1.isAuthenticated)([permissions_1.Permission.MANAGE_ISSUES, permissions_1.Permission.CREATE_ISSUES], {
    type: 'or',
}), async (req, res, next) => {
    const issueCommentRepository = (0, datasource_1.getRepository)(IssueComment_1.default);
    try {
        const comment = await issueCommentRepository.findOneOrFail({
            where: { id: Number(req.params.commentId) },
        });
        if (comment.user.id !== req.user?.id) {
            return next({
                status: 403,
                message: 'You can only edit your own comments.',
            });
        }
        comment.message = req.body.message;
        await issueCommentRepository.save(comment);
        return res.status(200).json(comment);
    }
    catch (e) {
        logger_1.default.debug('Put request for issue comment failed', {
            label: 'API',
            errorMessage: e.message,
        });
        next({ status: 404, message: 'Issue comment not found.' });
    }
});
issueCommentRoutes.delete('/:commentId', (0, auth_1.isAuthenticated)([permissions_1.Permission.MANAGE_ISSUES, permissions_1.Permission.CREATE_ISSUES], {
    type: 'or',
}), async (req, res, next) => {
    const issueCommentRepository = (0, datasource_1.getRepository)(IssueComment_1.default);
    try {
        const comment = await issueCommentRepository.findOneOrFail({
            where: { id: Number(req.params.commentId) },
        });
        if (!req.user?.hasPermission([permissions_1.Permission.MANAGE_ISSUES], { type: 'or' }) &&
            comment.user.id !== req.user?.id) {
            return next({
                status: 403,
                message: 'You do not have permission to delete this comment.',
            });
        }
        await issueCommentRepository.remove(comment);
        return res.status(204).send();
    }
    catch (e) {
        logger_1.default.debug('Delete request for issue comment failed', {
            label: 'API',
            errorMessage: e.message,
        });
        next({ status: 404, message: 'Issue comment not found.' });
    }
});
exports.default = issueCommentRoutes;

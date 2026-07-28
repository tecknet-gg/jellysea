"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldSendAdminNotification = exports.getAdminPermission = exports.hasNotificationType = exports.Notification = void 0;
const permissions_1 = require("../../lib/permissions");
const logger_1 = __importDefault(require("../../logger"));
var Notification;
(function (Notification) {
    Notification[Notification["NONE"] = 0] = "NONE";
    Notification[Notification["MEDIA_PENDING"] = 2] = "MEDIA_PENDING";
    Notification[Notification["MEDIA_APPROVED"] = 4] = "MEDIA_APPROVED";
    Notification[Notification["MEDIA_AVAILABLE"] = 8] = "MEDIA_AVAILABLE";
    Notification[Notification["MEDIA_FAILED"] = 16] = "MEDIA_FAILED";
    Notification[Notification["TEST_NOTIFICATION"] = 32] = "TEST_NOTIFICATION";
    Notification[Notification["MEDIA_DECLINED"] = 64] = "MEDIA_DECLINED";
    Notification[Notification["MEDIA_AUTO_APPROVED"] = 128] = "MEDIA_AUTO_APPROVED";
    Notification[Notification["ISSUE_CREATED"] = 256] = "ISSUE_CREATED";
    Notification[Notification["ISSUE_COMMENT"] = 512] = "ISSUE_COMMENT";
    Notification[Notification["ISSUE_RESOLVED"] = 1024] = "ISSUE_RESOLVED";
    Notification[Notification["ISSUE_REOPENED"] = 2048] = "ISSUE_REOPENED";
    Notification[Notification["MEDIA_AUTO_REQUESTED"] = 4096] = "MEDIA_AUTO_REQUESTED";
})(Notification || (exports.Notification = Notification = {}));
const hasNotificationType = (types, value) => {
    let total;
    // If we are not checking any notifications, bail out and return true
    if (types === 0) {
        return true;
    }
    if (Array.isArray(types)) {
        // Combine all notification values into one
        total = types.reduce((a, v) => a + v, 0);
    }
    else {
        total = types;
    }
    // Test notifications don't need to be enabled
    if (!(value & Notification.TEST_NOTIFICATION)) {
        value += Notification.TEST_NOTIFICATION;
    }
    return !!(value & total);
};
exports.hasNotificationType = hasNotificationType;
const getAdminPermission = (type) => {
    switch (type) {
        case Notification.MEDIA_PENDING:
        case Notification.MEDIA_APPROVED:
        case Notification.MEDIA_AVAILABLE:
        case Notification.MEDIA_FAILED:
        case Notification.MEDIA_DECLINED:
        case Notification.MEDIA_AUTO_APPROVED:
            return permissions_1.Permission.MANAGE_REQUESTS;
        case Notification.ISSUE_CREATED:
        case Notification.ISSUE_COMMENT:
        case Notification.ISSUE_RESOLVED:
        case Notification.ISSUE_REOPENED:
            return permissions_1.Permission.MANAGE_ISSUES;
        default:
            return permissions_1.Permission.ADMIN;
    }
};
exports.getAdminPermission = getAdminPermission;
const shouldSendAdminNotification = (type, user, payload) => {
    return (user.id !== payload.notifyUser?.id &&
        user.hasPermission((0, exports.getAdminPermission)(type)) &&
        // Check if the user submitted this request (on behalf of themself OR another user)
        (type !== Notification.MEDIA_AUTO_APPROVED ||
            user.id !==
                (payload.request?.modifiedBy ?? payload.request?.requestedBy)?.id) &&
        // Check if the user created this issue
        (type !== Notification.ISSUE_CREATED ||
            user.id !== payload.issue?.createdBy.id) &&
        // Check if the user submitted this issue comment
        (type !== Notification.ISSUE_COMMENT ||
            user.id !== payload.comment?.user.id) &&
        // Check if the user resolved/reopened this issue
        ((type !== Notification.ISSUE_RESOLVED &&
            type !== Notification.ISSUE_REOPENED) ||
            user.id !== payload.issue?.modifiedBy?.id));
};
exports.shouldSendAdminNotification = shouldSendAdminNotification;
class NotificationManager {
    constructor() {
        this.activeAgents = [];
        this.registerAgents = (agents) => {
            this.activeAgents = [...this.activeAgents, ...agents];
            logger_1.default.info('Registered notification agents', { label: 'Notifications' });
        };
    }
    sendNotification(type, payload) {
        logger_1.default.info(`Sending notification(s) for ${Notification[type]}`, {
            label: 'Notifications',
            subject: payload.subject,
        });
        this.activeAgents.forEach((agent) => {
            if (agent.shouldSend()) {
                agent.send(type, payload);
            }
        });
    }
}
const notificationManager = new NotificationManager();
exports.default = notificationManager;

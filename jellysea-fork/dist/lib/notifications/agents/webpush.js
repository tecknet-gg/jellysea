"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const issue_1 = require("../../../constants/issue");
const media_1 = require("../../../constants/media");
const datasource_1 = require("../../../datasource");
const MediaRequest_1 = __importDefault(require("../../../entity/MediaRequest"));
const User_1 = require("../../../entity/User");
const UserPushSubscription_1 = require("../../../entity/UserPushSubscription");
const i18n_1 = require("../../../i18n");
const globalMessages_1 = __importDefault(require("../../../i18n/globalMessages"));
const settings_1 = require("../../../lib/settings");
const logger_1 = __importDefault(require("../../../logger"));
const web_push_1 = __importDefault(require("web-push"));
const __1 = require("..");
const agent_1 = require("./agent");
const messages = (0, i18n_1.defineMessages)('notifications.agents.webpush', {
    autoRequested: 'Automatically submitted a new {quality}{mediaType} request.',
    approved: 'Your {quality}{mediaType} request has been approved.',
    autoApproved: 'Automatically approved a new {quality}{mediaType} request from {userName}.',
    available: 'Your {quality}{mediaType} request is now available!',
    declined: 'Your {quality}{mediaType} request was declined.',
    failed: 'Failed to process {quality}{mediaType} request.',
    pending: 'Approval required for a new {quality}{mediaType} request from {userName}.',
    issueCreated: 'A new {issueType} was reported by {userName}.',
    issueComment: '{userName} commented on the {issueType}.',
    issueResolved: 'The {issueType} was marked as resolved by {userName}!',
    issueReopened: 'The {issueType} was reopened by {userName}.',
    viewIssue: 'View Issue',
    viewMedia: 'View Media',
});
class WebPushAgent extends agent_1.BaseAgent {
    getSettings() {
        if (this.settings) {
            return this.settings;
        }
        const settings = (0, settings_1.getSettings)();
        return settings.notifications.agents.webpush;
    }
    getNotificationPayload(type, payload, locale) {
        const intl = (0, i18n_1.getIntl)(locale);
        const { embedPoster } = (0, settings_1.getSettings)().notifications.agents.webpush;
        const mediaType = payload.media
            ? payload.media.mediaType === media_1.MediaType.MOVIE
                ? intl.formatMessage(globalMessages_1.default.movie)
                : intl.formatMessage(globalMessages_1.default.series)
            : undefined;
        const is4k = payload.request?.is4k;
        const quality = is4k ? '4K ' : '';
        const issueType = payload.issue
            ? payload.issue.issueType !== issue_1.IssueType.OTHER
                ? intl.formatMessage(globalMessages_1.default.issueTypeName, {
                    type: issue_1.IssueTypeName[payload.issue.issueType].toLowerCase(),
                })
                : intl.formatMessage(globalMessages_1.default.issue)
            : undefined;
        let message;
        switch (type) {
            case __1.Notification.TEST_NOTIFICATION:
                message = payload.message;
                break;
            case __1.Notification.MEDIA_AUTO_REQUESTED:
                message = intl.formatMessage(messages.autoRequested, {
                    quality,
                    mediaType,
                });
                break;
            case __1.Notification.MEDIA_APPROVED:
                message = intl.formatMessage(messages.approved, {
                    quality,
                    mediaType,
                });
                break;
            case __1.Notification.MEDIA_AUTO_APPROVED:
                message = intl.formatMessage(messages.autoApproved, {
                    quality,
                    mediaType,
                    userName: payload.request?.requestedBy.displayName,
                });
                break;
            case __1.Notification.MEDIA_AVAILABLE:
                message = intl.formatMessage(messages.available, {
                    quality,
                    mediaType,
                });
                break;
            case __1.Notification.MEDIA_DECLINED:
                message = intl.formatMessage(messages.declined, {
                    quality,
                    mediaType,
                });
                break;
            case __1.Notification.MEDIA_FAILED:
                message = intl.formatMessage(messages.failed, {
                    quality,
                    mediaType,
                });
                break;
            case __1.Notification.MEDIA_PENDING:
                message = intl.formatMessage(messages.pending, {
                    quality,
                    mediaType,
                    userName: payload.request?.requestedBy.displayName,
                });
                break;
            case __1.Notification.ISSUE_CREATED:
                message = intl.formatMessage(messages.issueCreated, {
                    issueType,
                    userName: payload.issue?.createdBy.displayName,
                });
                break;
            case __1.Notification.ISSUE_COMMENT:
                message = intl.formatMessage(messages.issueComment, {
                    userName: payload.comment?.user.displayName,
                    issueType,
                });
                break;
            case __1.Notification.ISSUE_RESOLVED:
                message = intl.formatMessage(messages.issueResolved, {
                    issueType,
                    userName: payload.issue?.modifiedBy?.displayName,
                });
                break;
            case __1.Notification.ISSUE_REOPENED:
                message = intl.formatMessage(messages.issueReopened, {
                    issueType,
                    userName: payload.issue?.modifiedBy?.displayName,
                });
                break;
            default:
                return {
                    notificationType: __1.Notification[type],
                    subject: 'Unknown',
                };
        }
        const actionUrl = payload.issue
            ? `/issues/${payload.issue.id}`
            : payload.media
                ? `/${payload.media.mediaType}/${payload.media.tmdbId}`
                : undefined;
        const actionUrlTitle = actionUrl
            ? intl.formatMessage(payload.issue ? messages.viewIssue : messages.viewMedia)
            : undefined;
        return {
            notificationType: __1.Notification[type],
            subject: payload.subject,
            message,
            image: embedPoster ? payload.image : undefined,
            requestId: payload.request?.id,
            actionUrl,
            actionUrlTitle,
            pendingRequestsCount: payload.pendingRequestsCount,
            isAdmin: payload.isAdmin,
        };
    }
    shouldSend() {
        if (this.getSettings().enabled) {
            return true;
        }
        return false;
    }
    async send(type, payload) {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        const userPushSubRepository = (0, datasource_1.getRepository)(UserPushSubscription_1.UserPushSubscription);
        const settings = (0, settings_1.getSettings)();
        const pushSubs = [];
        const mainUser = await userRepository.findOne({ where: { id: 1 } });
        const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.default);
        const pendingRequests = await requestRepository.find({
            where: { status: media_1.MediaRequestStatus.PENDING },
        });
        const webPushNotification = async (pushSub, notificationPayload) => {
            logger_1.default.debug('Sending web push notification', {
                label: 'Notifications',
                recipient: pushSub.user.displayName,
                type: __1.Notification[type],
                subject: payload.subject,
            });
            try {
                await web_push_1.default.sendNotification({
                    endpoint: pushSub.endpoint,
                    keys: {
                        auth: pushSub.auth,
                        p256dh: pushSub.p256dh,
                    },
                }, notificationPayload);
            }
            catch (e) {
                const webPushError = e;
                const statusCode = webPushError.statusCode || webPushError.status;
                const errorMessage = webPushError.message || String(e);
                // RFC 8030: 410/404 are permanent failures, others are transient
                const isPermanentFailure = statusCode === 410 || statusCode === 404;
                logger_1.default.error(isPermanentFailure
                    ? 'Error sending web push notification; removing invalid subscription'
                    : 'Error sending web push notification (transient error, keeping subscription)', {
                    label: 'Notifications',
                    recipient: pushSub.user.displayName,
                    type: __1.Notification[type],
                    subject: payload.subject,
                    errorMessage,
                    statusCode: statusCode || 'unknown',
                });
                if (isPermanentFailure) {
                    await userPushSubRepository.remove(pushSub);
                }
            }
        };
        if (payload.notifyUser &&
            // Check if user has webpush notifications enabled and fallback to true if undefined
            // since web push should default to true
            (payload.notifyUser.settings?.hasNotificationType(settings_1.NotificationAgentKey.WEBPUSH, type) ??
                true)) {
            const notifySubs = await userPushSubRepository.find({
                where: { user: { id: payload.notifyUser.id } },
            });
            pushSubs.push(...notifySubs.map((sub) => ({
                sub,
                locale: payload.notifyUser?.settings?.locale,
            })));
        }
        if (payload.notifyAdmin ||
            type === __1.Notification.MEDIA_APPROVED ||
            type === __1.Notification.MEDIA_DECLINED) {
            const users = await userRepository.find();
            const manageUsers = users.filter((user) => 
            // Check if user has webpush notifications enabled and fallback to true if undefined
            // since web push should default to true
            (user.settings?.hasNotificationType(settings_1.NotificationAgentKey.WEBPUSH, type) ??
                true) &&
                (0, __1.shouldSendAdminNotification)(type, user, payload));
            const allSubs = manageUsers.length > 0
                ? await userPushSubRepository
                    .createQueryBuilder('pushSub')
                    .leftJoinAndSelect('pushSub.user', 'user')
                    .leftJoinAndSelect('user.settings', 'settings')
                    .where('pushSub.userId IN (:...users)', {
                    users: manageUsers.map((user) => user.id),
                })
                    .getMany()
                : [];
            // We only want to send the custom notification when type is approved or declined
            // Otherwise, default to the normal notification
            if (type === __1.Notification.MEDIA_APPROVED ||
                type === __1.Notification.MEDIA_DECLINED) {
                if (mainUser && allSubs.length > 0) {
                    web_push_1.default.setVapidDetails(`mailto:${mainUser.email}`, settings.vapidPublic, settings.vapidPrivate);
                    await Promise.all(allSubs.map(async (sub) => {
                        const locale = sub.user?.settings?.locale;
                        // Custom payload only for updating the app badge
                        const notificationBadgePayload = Buffer.from(JSON.stringify(this.getNotificationPayload(type, {
                            subject: payload.subject,
                            notifySystem: false,
                            notifyAdmin: true,
                            isAdmin: true,
                            pendingRequestsCount: pendingRequests.length,
                        }, locale)), 'utf-8');
                        await webPushNotification(sub, notificationBadgePayload);
                    }));
                }
            }
            else {
                pushSubs.push(...allSubs.map((sub) => ({
                    sub,
                    locale: sub.user?.settings?.locale,
                })));
            }
        }
        if (mainUser && pushSubs.length > 0) {
            web_push_1.default.setVapidDetails(`mailto:${mainUser.email}`, settings.vapidPublic, settings.vapidPrivate);
            if (type === __1.Notification.MEDIA_PENDING) {
                payload = { ...payload, pendingRequestsCount: pendingRequests.length };
            }
            await Promise.all(pushSubs.map(async ({ sub, locale }) => {
                const notificationPayload = Buffer.from(JSON.stringify(this.getNotificationPayload(type, payload, locale)), 'utf-8');
                await webPushNotification(sub, notificationPayload);
            }));
        }
        return true;
    }
}
exports.default = WebPushAgent;

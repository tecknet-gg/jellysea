"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const issue_1 = require("../../../constants/issue");
const media_1 = require("../../../constants/media");
const datasource_1 = require("../../../datasource");
const User_1 = require("../../../entity/User");
const i18n_1 = require("../../../i18n");
const globalMessages_1 = __importDefault(require("../../../i18n/globalMessages"));
const email_1 = __importDefault(require("../../../lib/email"));
const settings_1 = require("../../../lib/settings");
const logger_1 = __importDefault(require("../../../logger"));
const path_1 = __importDefault(require("path"));
const validator_1 = __importDefault(require("validator"));
const __1 = require("..");
const agent_1 = require("./agent");
const PUBLIC_LOGO_URL = 'https://raw.githubusercontent.com/seerr-team/seerr/refs/heads/develop/public/logo_full.svg';
const messages = (0, i18n_1.defineMessages)('notifications.agents.email', {
    issueType: '{type} issue',
    issue: 'issue',
    pendingRequest: 'A new request for the following {mediaType} is pending approval:',
    pendingRequest4k: 'A new request for the following {mediaType} in 4K is pending approval:',
    autoRequested: 'A new request for the following {mediaType} was automatically submitted:',
    autoRequested4k: 'A new request for the following {mediaType} in 4K was automatically submitted:',
    approvedRequest: 'Your request for the following {mediaType} has been approved:',
    approvedRequest4k: 'Your request for the following {mediaType} in 4K has been approved:',
    autoApproved: 'A new request for the following {mediaType} has been automatically approved:',
    autoApproved4k: 'A new request for the following {mediaType} in 4K has been automatically approved:',
    availableRequest: 'Your request for the following {mediaType} is now available:',
    availableRequest4k: 'Your request for the following {mediaType} in 4K is now available:',
    declinedRequest: 'Your request for the following {mediaType} was declined:',
    declinedRequest4k: 'Your request for the following {mediaType} in 4K was declined:',
    failedRequest: 'A request for the following {mediaType} failed to be added to {service}:',
    failedRequest4k: 'A request for the following {mediaType} in 4K failed to be added to {service}:',
    issueCreated: 'A new {issueType} has been reported by {userName} for the {mediaType} {subject}:',
    issueComment: '{userName} commented on the {issueType} for the {mediaType} {subject}:',
    issueResolved: 'The {issueType} for the {mediaType} {subject} was marked as resolved by {userName}!',
    issueReopened: 'The {issueType} for the {mediaType} {subject} was reopened by {userName}.',
});
class EmailAgent extends agent_1.BaseAgent {
    getSettings() {
        if (this.settings) {
            return this.settings;
        }
        const settings = (0, settings_1.getSettings)();
        return settings.notifications.agents.email;
    }
    shouldSend() {
        const settings = this.getSettings();
        if (settings.enabled &&
            settings.options.emailFrom &&
            settings.options.smtpHost &&
            settings.options.smtpPort) {
            return true;
        }
        return false;
    }
    buildMessage(type, payload, recipientEmail, recipientName, locale) {
        const intl = (0, i18n_1.getIntl)(locale);
        const settings = (0, settings_1.getSettings)();
        const { applicationUrl, applicationTitle } = settings.main;
        const { embedPoster } = settings.notifications.agents.email;
        const { usePublicLogo } = settings.notifications.agents.email.options;
        const logoUrl = usePublicLogo
            ? PUBLIC_LOGO_URL
            : applicationUrl
                ? `${applicationUrl}/logo_full.svg`
                : undefined;
        if (type === __1.Notification.TEST_NOTIFICATION) {
            return {
                template: path_1.default.join(__dirname, '../../../templates/email/test-email'),
                message: {
                    to: recipientEmail,
                },
                locals: {
                    body: payload.message,
                    applicationUrl,
                    applicationTitle,
                    logoUrl,
                    recipientName,
                    recipientEmail,
                },
            };
        }
        const mediaType = payload.media
            ? payload.media.mediaType === media_1.MediaType.MOVIE
                ? intl.formatMessage(globalMessages_1.default.movie)
                : intl.formatMessage(globalMessages_1.default.series)
            : undefined;
        const is4k = payload.request?.is4k;
        if (payload.request) {
            let body = '';
            switch (type) {
                case __1.Notification.MEDIA_PENDING:
                    body = intl.formatMessage(is4k ? messages.pendingRequest4k : messages.pendingRequest, { mediaType });
                    break;
                case __1.Notification.MEDIA_AUTO_REQUESTED:
                    body = intl.formatMessage(is4k ? messages.autoRequested4k : messages.autoRequested, { mediaType });
                    break;
                case __1.Notification.MEDIA_APPROVED:
                    body = intl.formatMessage(is4k ? messages.approvedRequest4k : messages.approvedRequest, { mediaType });
                    break;
                case __1.Notification.MEDIA_AUTO_APPROVED:
                    body = intl.formatMessage(is4k ? messages.autoApproved4k : messages.autoApproved, { mediaType });
                    break;
                case __1.Notification.MEDIA_AVAILABLE:
                    body = intl.formatMessage(is4k ? messages.availableRequest4k : messages.availableRequest, { mediaType });
                    break;
                case __1.Notification.MEDIA_DECLINED:
                    body = intl.formatMessage(is4k ? messages.declinedRequest4k : messages.declinedRequest, { mediaType });
                    break;
                case __1.Notification.MEDIA_FAILED:
                    body = intl.formatMessage(is4k ? messages.failedRequest4k : messages.failedRequest, {
                        mediaType,
                        service: payload.media?.mediaType === media_1.MediaType.MOVIE
                            ? 'Radarr'
                            : 'Sonarr',
                    });
                    break;
            }
            return {
                template: path_1.default.join(__dirname, '../../../templates/email/media-request'),
                message: {
                    to: recipientEmail,
                },
                locals: {
                    event: payload.event,
                    body,
                    mediaName: payload.subject,
                    mediaExtra: payload.extra ?? [],
                    imageUrl: embedPoster ? payload.image : undefined,
                    timestamp: new Date().toTimeString(),
                    requestedBy: payload.request.requestedBy.displayName,
                    actionUrl: applicationUrl
                        ? `${applicationUrl}/${payload.media?.mediaType}/${payload.media?.tmdbId}`
                        : undefined,
                    applicationUrl,
                    applicationTitle,
                    logoUrl,
                    recipientName,
                    recipientEmail,
                },
            };
        }
        else if (payload.issue) {
            const issueType = payload.issue && payload.issue.issueType !== issue_1.IssueType.OTHER
                ? intl.formatMessage(messages.issueType, {
                    type: issue_1.IssueTypeName[payload.issue.issueType].toLowerCase(),
                })
                : intl.formatMessage(messages.issue);
            let body = '';
            switch (type) {
                case __1.Notification.ISSUE_CREATED:
                    body = intl.formatMessage(messages.issueCreated, {
                        issueType,
                        userName: payload.issue.createdBy.displayName,
                        mediaType,
                        subject: payload.subject,
                    });
                    break;
                case __1.Notification.ISSUE_COMMENT:
                    body = intl.formatMessage(messages.issueComment, {
                        userName: payload.comment?.user.displayName,
                        issueType,
                        mediaType,
                        subject: payload.subject,
                    });
                    break;
                case __1.Notification.ISSUE_RESOLVED:
                    body = intl.formatMessage(messages.issueResolved, {
                        issueType,
                        userName: payload.issue.modifiedBy?.displayName,
                        mediaType,
                        subject: payload.subject,
                    });
                    break;
                case __1.Notification.ISSUE_REOPENED:
                    body = intl.formatMessage(messages.issueReopened, {
                        issueType,
                        userName: payload.issue.modifiedBy?.displayName,
                        mediaType,
                        subject: payload.subject,
                    });
                    break;
            }
            return {
                template: path_1.default.join(__dirname, '../../../templates/email/media-issue'),
                message: {
                    to: recipientEmail,
                },
                locals: {
                    event: payload.event,
                    body,
                    issueDescription: payload.message,
                    issueComment: payload.comment?.message,
                    mediaName: payload.subject,
                    extra: payload.extra ?? [],
                    imageUrl: embedPoster ? payload.image : undefined,
                    timestamp: new Date().toTimeString(),
                    actionUrl: applicationUrl
                        ? `${applicationUrl}/issues/${payload.issue.id}`
                        : undefined,
                    applicationUrl,
                    applicationTitle,
                    logoUrl,
                    recipientName,
                    recipientEmail,
                },
            };
        }
        return undefined;
    }
    async send(type, payload) {
        if (payload.notifyUser) {
            if (!payload.notifyUser.settings ||
                (payload.notifyUser.settings.hasNotificationType(settings_1.NotificationAgentKey.EMAIL, type) ??
                    true)) {
                logger_1.default.debug('Sending email notification', {
                    label: 'Notifications',
                    recipient: payload.notifyUser.displayName,
                    type: __1.Notification[type],
                    subject: payload.subject,
                });
                try {
                    const email = new email_1.default(this.getSettings(), payload.notifyUser.settings?.pgpKey);
                    if (validator_1.default.isEmail(payload.notifyUser.email, { require_tld: false })) {
                        await email.send(this.buildMessage(type, payload, payload.notifyUser.email, payload.notifyUser.displayName, payload.notifyUser.settings?.locale));
                    }
                    else {
                        logger_1.default.warn('Invalid email address provided for user', {
                            label: 'Notifications',
                            recipient: payload.notifyUser.displayName,
                            type: __1.Notification[type],
                            subject: payload.subject,
                        });
                    }
                }
                catch (e) {
                    logger_1.default.error('Error sending email notification', {
                        label: 'Notifications',
                        recipient: payload.notifyUser.displayName,
                        type: __1.Notification[type],
                        subject: payload.subject,
                        errorMessage: e.message,
                    });
                    return false;
                }
            }
        }
        if (payload.notifyAdmin) {
            const userRepository = (0, datasource_1.getRepository)(User_1.User);
            const users = await userRepository.find();
            await Promise.all(users
                .filter((user) => (!user.settings ||
                (user.settings.hasNotificationType(settings_1.NotificationAgentKey.EMAIL, type) ??
                    true)) &&
                (0, __1.shouldSendAdminNotification)(type, user, payload))
                .map(async (user) => {
                logger_1.default.debug('Sending email notification', {
                    label: 'Notifications',
                    recipient: user.displayName,
                    type: __1.Notification[type],
                    subject: payload.subject,
                });
                try {
                    const email = new email_1.default(this.getSettings(), user.settings?.pgpKey);
                    if (validator_1.default.isEmail(user.email, { require_tld: false })) {
                        await email.send(this.buildMessage(type, payload, user.email, user.displayName, user.settings?.locale));
                    }
                    else {
                        logger_1.default.warn('Invalid email address provided for user', {
                            label: 'Notifications',
                            recipient: user.displayName,
                            type: __1.Notification[type],
                            subject: payload.subject,
                        });
                    }
                }
                catch (e) {
                    logger_1.default.error('Error sending email notification', {
                        label: 'Notifications',
                        recipient: user.displayName,
                        type: __1.Notification[type],
                        subject: payload.subject,
                        errorMessage: e.message,
                    });
                    return false;
                }
            }));
        }
        return true;
    }
}
exports.default = EmailAgent;

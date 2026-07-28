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
const settings_1 = require("../../../lib/settings");
const logger_1 = __importDefault(require("../../../logger"));
const axios_1 = __importDefault(require("axios"));
const __1 = require("..");
const agent_1 = require("./agent");
class PushoverAgent extends agent_1.BaseAgent {
    getSettings() {
        if (this.settings) {
            return this.settings;
        }
        const settings = (0, settings_1.getSettings)();
        return settings.notifications.agents.pushover;
    }
    shouldSend() {
        const settings = this.getSettings();
        if (settings.enabled &&
            settings.options.accessToken &&
            settings.options.userToken) {
            return true;
        }
        return false;
    }
    async getImagePayload(imageUrl) {
        try {
            const response = await axios_1.default.get(imageUrl, {
                responseType: 'arraybuffer',
            });
            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            const contentType = (response.headers['Content-Type'] || response.headers['content-type'])?.toString();
            return {
                attachment_base64: base64,
                attachment_type: contentType,
            };
        }
        catch (e) {
            logger_1.default.error('Error getting image payload', {
                label: 'Notifications',
                errorMessage: e.message,
                response: e.response?.data,
            });
            return {};
        }
    }
    async getNotificationPayload(type, payload, locale) {
        const intl = (0, i18n_1.getIntl)(locale);
        const settings = (0, settings_1.getSettings)();
        const { applicationUrl, applicationTitle } = settings.main;
        const { embedPoster } = settings.notifications.agents.pushover;
        const title = payload.event ?? payload.subject;
        let message = payload.event ? `<b>${payload.subject}</b>` : '';
        let priority = 0;
        if (payload.message) {
            message += `<small>${message ? '\n' : ''}${payload.message}</small>`;
        }
        if (payload.request) {
            message += `<small>\n\n<b>${intl.formatMessage(globalMessages_1.default.requestedBy)}:</b> ${payload.request.requestedBy.displayName}</small>`;
            let status = '';
            switch (type) {
                case __1.Notification.MEDIA_AUTO_REQUESTED:
                    status =
                        payload.media?.status === media_1.MediaStatus.PENDING
                            ? intl.formatMessage(globalMessages_1.default.pendingApproval)
                            : intl.formatMessage(globalMessages_1.default.processing);
                    break;
                case __1.Notification.MEDIA_PENDING:
                    status = intl.formatMessage(globalMessages_1.default.pendingApproval);
                    break;
                case __1.Notification.MEDIA_APPROVED:
                case __1.Notification.MEDIA_AUTO_APPROVED:
                    status = intl.formatMessage(globalMessages_1.default.processing);
                    break;
                case __1.Notification.MEDIA_AVAILABLE:
                    status = intl.formatMessage(globalMessages_1.default.available);
                    break;
                case __1.Notification.MEDIA_DECLINED:
                    status = intl.formatMessage(globalMessages_1.default.declined);
                    priority = 1;
                    break;
                case __1.Notification.MEDIA_FAILED:
                    status = intl.formatMessage(globalMessages_1.default.failed);
                    priority = 1;
                    break;
            }
            if (status) {
                message += `<small>\n<b>${intl.formatMessage(globalMessages_1.default.requestStatus)}:</b> ${status}</small>`;
            }
        }
        else if (payload.comment) {
            message += `<small>\n\n<b>${intl.formatMessage(globalMessages_1.default.commentFrom, { userName: payload.comment.user.displayName })}:</b> ${payload.comment.message}</small>`;
        }
        else if (payload.issue) {
            message += `<small>\n\n<b>${intl.formatMessage(globalMessages_1.default.reportedBy)}:</b> ${payload.issue.createdBy.displayName}</small>`;
            message += `<small>\n<b>${intl.formatMessage(globalMessages_1.default.issueType)}:</b> ${issue_1.IssueTypeName[payload.issue.issueType]}</small>`;
            message += `<small>\n<b>${intl.formatMessage(globalMessages_1.default.issueStatus)}:</b> ${payload.issue.status === issue_1.IssueStatus.OPEN
                ? intl.formatMessage(globalMessages_1.default.open)
                : intl.formatMessage(globalMessages_1.default.resolved)}</small>`;
            if (type === __1.Notification.ISSUE_CREATED) {
                priority = 1;
            }
        }
        for (const extra of payload.extra ?? []) {
            message += `<small>\n<b>${extra.name}:</b> ${extra.value}</small>`;
        }
        const url = applicationUrl
            ? payload.issue
                ? `${applicationUrl}/issues/${payload.issue.id}`
                : payload.media
                    ? `${applicationUrl}/${payload.media.mediaType}/${payload.media.tmdbId}`
                    : undefined
            : undefined;
        const url_title = url
            ? intl.formatMessage(payload.issue ? globalMessages_1.default.viewIssue : globalMessages_1.default.viewMedia, { applicationTitle })
            : undefined;
        let attachment_base64;
        let attachment_type;
        if (embedPoster && payload.image) {
            const imagePayload = await this.getImagePayload(payload.image);
            if (imagePayload.attachment_base64 && imagePayload.attachment_type) {
                attachment_base64 = imagePayload.attachment_base64;
                attachment_type = imagePayload.attachment_type;
            }
        }
        return {
            title,
            message,
            url,
            url_title,
            priority,
            html: 1,
            attachment_base64,
            attachment_type,
        };
    }
    async send(type, payload) {
        const settings = this.getSettings();
        const endpoint = 'https://api.pushover.net/1/messages.json';
        // Send system notification
        if (payload.notifySystem &&
            (0, __1.hasNotificationType)(type, settings.types ?? 0) &&
            settings.enabled &&
            settings.options.accessToken &&
            settings.options.userToken) {
            logger_1.default.debug('Sending Pushover notification', {
                label: 'Notifications',
                type: __1.Notification[type],
                subject: payload.subject,
            });
            try {
                const notificationPayload = await this.getNotificationPayload(type, payload);
                await axios_1.default.post(endpoint, {
                    ...notificationPayload,
                    token: settings.options.accessToken,
                    user: settings.options.userToken,
                    sound: settings.options.sound,
                });
            }
            catch (e) {
                logger_1.default.error('Error sending Pushover notification', {
                    label: 'Notifications',
                    type: __1.Notification[type],
                    subject: payload.subject,
                    errorMessage: e.message,
                    response: e.response?.data,
                });
                return false;
            }
        }
        if (payload.notifyUser) {
            if (payload.notifyUser.settings?.hasNotificationType(settings_1.NotificationAgentKey.PUSHOVER, type) &&
                payload.notifyUser.settings.pushoverApplicationToken &&
                payload.notifyUser.settings.pushoverUserKey &&
                (payload.notifyUser.settings.pushoverApplicationToken !==
                    settings.options.accessToken ||
                    payload.notifyUser.settings.pushoverUserKey !==
                        settings.options.userToken)) {
                logger_1.default.debug('Sending Pushover notification', {
                    label: 'Notifications',
                    recipient: payload.notifyUser.displayName,
                    type: __1.Notification[type],
                    subject: payload.subject,
                });
                try {
                    const notificationPayload = await this.getNotificationPayload(type, payload, payload.notifyUser.settings?.locale);
                    await axios_1.default.post(endpoint, {
                        ...notificationPayload,
                        token: payload.notifyUser.settings.pushoverApplicationToken,
                        user: payload.notifyUser.settings.pushoverUserKey,
                        sound: payload.notifyUser.settings.pushoverSound,
                    });
                }
                catch (e) {
                    logger_1.default.error('Error sending Pushover notification', {
                        label: 'Notifications',
                        recipient: payload.notifyUser.displayName,
                        type: __1.Notification[type],
                        subject: payload.subject,
                        errorMessage: e.message,
                        response: e.response?.data,
                    });
                    return false;
                }
            }
        }
        if (payload.notifyAdmin) {
            const userRepository = (0, datasource_1.getRepository)(User_1.User);
            const users = await userRepository.find();
            await Promise.all(users
                .filter((user) => user.settings?.hasNotificationType(settings_1.NotificationAgentKey.PUSHOVER, type) && (0, __1.shouldSendAdminNotification)(type, user, payload))
                .map(async (user) => {
                if (user.settings?.pushoverApplicationToken &&
                    user.settings?.pushoverUserKey &&
                    user.settings.pushoverApplicationToken !==
                        settings.options.accessToken &&
                    user.settings.pushoverUserKey !== settings.options.userToken) {
                    logger_1.default.debug('Sending Pushover notification', {
                        label: 'Notifications',
                        recipient: user.displayName,
                        type: __1.Notification[type],
                        subject: payload.subject,
                    });
                    try {
                        const notificationPayload = await this.getNotificationPayload(type, payload, user.settings?.locale);
                        await axios_1.default.post(endpoint, {
                            ...notificationPayload,
                            token: user.settings.pushoverApplicationToken,
                            user: user.settings.pushoverUserKey,
                        });
                    }
                    catch (e) {
                        logger_1.default.error('Error sending Pushover notification', {
                            label: 'Notifications',
                            recipient: user.displayName,
                            type: __1.Notification[type],
                            subject: payload.subject,
                            errorMessage: e.message,
                            response: e.response?.data,
                        });
                        return false;
                    }
                }
            }));
        }
        return true;
    }
}
exports.default = PushoverAgent;

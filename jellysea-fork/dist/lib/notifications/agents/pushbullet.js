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
class PushbulletAgent extends agent_1.BaseAgent {
    getSettings() {
        if (this.settings) {
            return this.settings;
        }
        const settings = (0, settings_1.getSettings)();
        return settings.notifications.agents.pushbullet;
    }
    shouldSend() {
        return true;
    }
    getNotificationPayload(type, payload, locale) {
        const intl = (0, i18n_1.getIntl)(locale);
        const title = payload.event
            ? `${payload.event} - ${payload.subject}`
            : payload.subject;
        let body = payload.message ?? '';
        if (payload.request) {
            body += `\n\n${intl.formatMessage(globalMessages_1.default.requestedBy)}: ${payload.request.requestedBy.displayName}`;
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
                    break;
                case __1.Notification.MEDIA_FAILED:
                    status = intl.formatMessage(globalMessages_1.default.failed);
                    break;
            }
            if (status) {
                body += `\n${intl.formatMessage(globalMessages_1.default.requestStatus)}: ${status}`;
            }
        }
        else if (payload.comment) {
            body += `\n\n${intl.formatMessage(globalMessages_1.default.commentFrom, { userName: payload.comment.user.displayName })}:\n${payload.comment.message}`;
        }
        else if (payload.issue) {
            body += `\n\n${intl.formatMessage(globalMessages_1.default.reportedBy)}: ${payload.issue.createdBy.displayName}`;
            body += `\n${intl.formatMessage(globalMessages_1.default.issueType)}: ${issue_1.IssueTypeName[payload.issue.issueType]}`;
            body += `\n${intl.formatMessage(globalMessages_1.default.issueStatus)}: ${payload.issue.status === issue_1.IssueStatus.OPEN
                ? intl.formatMessage(globalMessages_1.default.open)
                : intl.formatMessage(globalMessages_1.default.resolved)}`;
        }
        for (const extra of payload.extra ?? []) {
            body += `\n${extra.name}: ${extra.value}`;
        }
        return {
            type: 'note',
            title,
            body,
        };
    }
    async send(type, payload) {
        const settings = this.getSettings();
        const endpoint = 'https://api.pushbullet.com/v2/pushes';
        // Send system notification
        if (payload.notifySystem &&
            (0, __1.hasNotificationType)(type, settings.types ?? 0) &&
            settings.enabled &&
            settings.options.accessToken) {
            logger_1.default.debug('Sending Pushbullet notification', {
                label: 'Notifications',
                type: __1.Notification[type],
                subject: payload.subject,
            });
            try {
                const notificationPayload = this.getNotificationPayload(type, payload);
                await axios_1.default.post(endpoint, { ...notificationPayload, channel_tag: settings.options.channelTag }, {
                    headers: {
                        'Access-Token': settings.options.accessToken,
                    },
                });
            }
            catch (e) {
                logger_1.default.error('Error sending Pushbullet notification', {
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
            if (payload.notifyUser.settings?.hasNotificationType(settings_1.NotificationAgentKey.PUSHBULLET, type) &&
                payload.notifyUser.settings?.pushbulletAccessToken &&
                payload.notifyUser.settings.pushbulletAccessToken !==
                    settings.options.accessToken) {
                logger_1.default.debug('Sending Pushbullet notification', {
                    label: 'Notifications',
                    recipient: payload.notifyUser.displayName,
                    type: __1.Notification[type],
                    subject: payload.subject,
                });
                try {
                    const notificationPayload = this.getNotificationPayload(type, payload, payload.notifyUser.settings?.locale);
                    await axios_1.default.post(endpoint, notificationPayload, {
                        headers: {
                            'Access-Token': payload.notifyUser.settings.pushbulletAccessToken,
                        },
                    });
                }
                catch (e) {
                    logger_1.default.error('Error sending Pushbullet notification', {
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
                .filter((user) => user.settings?.hasNotificationType(settings_1.NotificationAgentKey.PUSHBULLET, type) && (0, __1.shouldSendAdminNotification)(type, user, payload))
                .map(async (user) => {
                if (user.settings?.pushbulletAccessToken &&
                    (settings.options.channelTag ||
                        user.settings.pushbulletAccessToken !==
                            settings.options.accessToken)) {
                    logger_1.default.debug('Sending Pushbullet notification', {
                        label: 'Notifications',
                        recipient: user.displayName,
                        type: __1.Notification[type],
                        subject: payload.subject,
                    });
                    try {
                        const notificationPayload = this.getNotificationPayload(type, payload, user.settings?.locale);
                        await axios_1.default.post(endpoint, notificationPayload, {
                            headers: {
                                'Access-Token': user.settings.pushbulletAccessToken,
                            },
                        });
                    }
                    catch (e) {
                        logger_1.default.error('Error sending Pushbullet notification', {
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
exports.default = PushbulletAgent;

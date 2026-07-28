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
class TelegramAgent extends agent_1.BaseAgent {
    constructor() {
        super(...arguments);
        this.baseUrl = 'https://api.telegram.org/';
    }
    getSettings() {
        if (this.settings) {
            return this.settings;
        }
        const settings = (0, settings_1.getSettings)();
        return settings.notifications.agents.telegram;
    }
    shouldSend() {
        const settings = this.getSettings();
        if (settings.enabled && settings.options.botAPI) {
            return true;
        }
        return false;
    }
    escapeText(text) {
        return text ? text.replace(/[_*[\]()~>#+=|{}.!-]/gi, (x) => '\\' + x) : '';
    }
    getNotificationPayload(type, payload, locale) {
        const intl = (0, i18n_1.getIntl)(locale);
        const settings = (0, settings_1.getSettings)();
        const { applicationUrl, applicationTitle } = settings.main;
        const { embedPoster } = settings.notifications.agents.telegram;
        /* eslint-disable no-useless-escape */
        let message = `\*${this.escapeText(payload.event ? `${payload.event} - ${payload.subject}` : payload.subject)}\*`;
        if (payload.message) {
            message += `\n${this.escapeText(payload.message)}`;
        }
        if (payload.request) {
            message += `\n\n\*${this.escapeText(intl.formatMessage(globalMessages_1.default.requestedBy))}:\* ${this.escapeText(payload.request?.requestedBy.displayName)}`;
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
                message += `\n\*${this.escapeText(intl.formatMessage(globalMessages_1.default.requestStatus))}:\* ${this.escapeText(status)}`;
            }
        }
        else if (payload.comment) {
            message += `\n\n\*${this.escapeText(intl.formatMessage(globalMessages_1.default.commentFrom, {
                userName: payload.comment.user.displayName,
            }))}:\* ${this.escapeText(payload.comment.message)}`;
        }
        else if (payload.issue) {
            message += `\n\n\*${this.escapeText(intl.formatMessage(globalMessages_1.default.reportedBy))}:\* ${this.escapeText(payload.issue.createdBy.displayName)}`;
            message += `\n\*${this.escapeText(intl.formatMessage(globalMessages_1.default.issueType))}:\* ${this.escapeText(issue_1.IssueTypeName[payload.issue.issueType])}`;
            message += `\n\*${this.escapeText(intl.formatMessage(globalMessages_1.default.issueStatus))}:\* ${this.escapeText(payload.issue.status === issue_1.IssueStatus.OPEN
                ? intl.formatMessage(globalMessages_1.default.open)
                : intl.formatMessage(globalMessages_1.default.resolved))}`;
        }
        for (const extra of payload.extra ?? []) {
            message += `\n\*${extra.name}:\* ${extra.value}`;
        }
        const url = applicationUrl
            ? payload.issue
                ? `${applicationUrl}/issues/${payload.issue.id}`
                : payload.media
                    ? `${applicationUrl}/${payload.media.mediaType}/${payload.media.tmdbId}`
                    : undefined
            : undefined;
        if (url) {
            message += `\n\n\[${this.escapeText(intl.formatMessage(payload.issue ? globalMessages_1.default.viewIssue : globalMessages_1.default.viewMedia, { applicationTitle }))}\]\(${url}\)`;
        }
        /* eslint-enable */
        return embedPoster && payload.image
            ? {
                photo: payload.image,
                caption: message,
                parse_mode: 'MarkdownV2',
            }
            : {
                text: message,
                parse_mode: 'MarkdownV2',
            };
    }
    async send(type, payload) {
        const settings = this.getSettings();
        const endpoint = `${this.baseUrl}bot${settings.options.botAPI}/${settings.embedPoster && payload.image ? 'sendPhoto' : 'sendMessage'}`;
        // Send system notification
        if (payload.notifySystem &&
            (0, __1.hasNotificationType)(type, settings.types ?? 0) &&
            settings.options.chatId) {
            logger_1.default.debug('Sending Telegram notification', {
                label: 'Notifications',
                type: __1.Notification[type],
                subject: payload.subject,
            });
            try {
                const notificationPayload = this.getNotificationPayload(type, payload);
                await axios_1.default.post(endpoint, {
                    ...notificationPayload,
                    chat_id: settings.options.chatId,
                    message_thread_id: settings.options.messageThreadId,
                    disable_notification: !!settings.options.sendSilently,
                });
            }
            catch (e) {
                logger_1.default.error('Error sending Telegram notification', {
                    label: 'Notifications',
                    type: __1.Notification[type],
                    subject: payload.subject,
                    errorMessage: e.message,
                    response: e?.response?.data,
                });
                return false;
            }
        }
        if (payload.notifyUser) {
            if (payload.notifyUser.settings?.hasNotificationType(settings_1.NotificationAgentKey.TELEGRAM, type) &&
                payload.notifyUser.settings?.telegramChatId &&
                payload.notifyUser.settings.telegramChatId !== settings.options.chatId) {
                logger_1.default.debug('Sending Telegram notification', {
                    label: 'Notifications',
                    recipient: payload.notifyUser.displayName,
                    type: __1.Notification[type],
                    subject: payload.subject,
                });
                try {
                    const notificationPayload = this.getNotificationPayload(type, payload, payload.notifyUser.settings?.locale);
                    await axios_1.default.post(endpoint, {
                        ...notificationPayload,
                        chat_id: payload.notifyUser.settings.telegramChatId,
                        message_thread_id: payload.notifyUser.settings.telegramMessageThreadId,
                        disable_notification: !!payload.notifyUser.settings.telegramSendSilently,
                    });
                }
                catch (e) {
                    logger_1.default.error('Error sending Telegram notification', {
                        label: 'Notifications',
                        recipient: payload.notifyUser.displayName,
                        type: __1.Notification[type],
                        subject: payload.subject,
                        errorMessage: e.message,
                        response: e?.response?.data,
                    });
                    return false;
                }
            }
        }
        if (payload.notifyAdmin) {
            const userRepository = (0, datasource_1.getRepository)(User_1.User);
            const users = await userRepository.find();
            await Promise.all(users
                .filter((user) => user.settings?.hasNotificationType(settings_1.NotificationAgentKey.TELEGRAM, type) && (0, __1.shouldSendAdminNotification)(type, user, payload))
                .map(async (user) => {
                if (user.settings?.telegramChatId &&
                    user.settings.telegramChatId !== settings.options.chatId) {
                    logger_1.default.debug('Sending Telegram notification', {
                        label: 'Notifications',
                        recipient: user.displayName,
                        type: __1.Notification[type],
                        subject: payload.subject,
                    });
                    try {
                        const notificationPayload = this.getNotificationPayload(type, payload, user.settings?.locale);
                        await axios_1.default.post(endpoint, {
                            ...notificationPayload,
                            chat_id: user.settings.telegramChatId,
                            message_thread_id: user.settings.telegramMessageThreadId,
                            disable_notification: !!user.settings?.telegramSendSilently,
                        });
                    }
                    catch (e) {
                        logger_1.default.error('Error sending Telegram notification', {
                            label: 'Notifications',
                            recipient: user.displayName,
                            type: __1.Notification[type],
                            subject: payload.subject,
                            errorMessage: e.message,
                            response: e?.response?.data,
                        });
                        return false;
                    }
                }
            }));
        }
        return true;
    }
}
exports.default = TelegramAgent;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const issue_1 = require("../../../constants/issue");
const i18n_1 = require("../../../i18n");
const globalMessages_1 = __importDefault(require("../../../i18n/globalMessages"));
const settings_1 = require("../../../lib/settings");
const logger_1 = __importDefault(require("../../../logger"));
const axios_1 = __importDefault(require("axios"));
const __1 = require("..");
const agent_1 = require("./agent");
class GotifyAgent extends agent_1.BaseAgent {
    getSettings() {
        if (this.settings) {
            return this.settings;
        }
        const settings = (0, settings_1.getSettings)();
        return settings.notifications.agents.gotify;
    }
    shouldSend() {
        const settings = this.getSettings();
        if (settings.enabled &&
            settings.options.url &&
            settings.options.token &&
            settings.options.priority !== undefined) {
            return true;
        }
        return false;
    }
    getNotificationPayload(type, payload) {
        const settings = this.getSettings();
        const intl = (0, i18n_1.getIntl)(settings.options.locale);
        const { applicationUrl, applicationTitle } = (0, settings_1.getSettings)().main;
        const priority = settings.options.priority ?? 1;
        const title = payload.event
            ? `${payload.event} - ${payload.subject}`
            : payload.subject;
        let message = payload.message ? `${payload.message}  \n\n` : '';
        if (payload.request) {
            message += `\n**${intl.formatMessage(globalMessages_1.default.requestedBy)}:** ${payload.request.requestedBy.displayName}  `;
            let status = '';
            switch (type) {
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
                message += `\n**${intl.formatMessage(globalMessages_1.default.requestStatus)}:** ${status}  `;
            }
        }
        else if (payload.comment) {
            message += `\n${intl.formatMessage(globalMessages_1.default.commentFrom, { userName: payload.comment.user.displayName })}:\n${payload.comment.message}  `;
        }
        else if (payload.issue) {
            message += `\n\n**${intl.formatMessage(globalMessages_1.default.reportedBy)}:** ${payload.issue.createdBy.displayName}  `;
            message += `\n**${intl.formatMessage(globalMessages_1.default.issueType)}:** ${issue_1.IssueTypeName[payload.issue.issueType]}  `;
            message += `\n**${intl.formatMessage(globalMessages_1.default.issueStatus)}:** ${payload.issue.status === issue_1.IssueStatus.OPEN
                ? intl.formatMessage(globalMessages_1.default.open)
                : intl.formatMessage(globalMessages_1.default.resolved)}  `;
        }
        for (const extra of payload.extra ?? []) {
            message += `\n\n**${extra.name}**\n${extra.value}  `;
        }
        if (applicationUrl && payload.media) {
            const actionUrl = `${applicationUrl}/${payload.media.mediaType}/${payload.media.tmdbId}`;
            const displayUrl = actionUrl.length > 40 ? `${actionUrl.slice(0, 41)}...` : actionUrl;
            message += `\n\n**${intl.formatMessage(globalMessages_1.default.openIn, { applicationTitle })}:** [${displayUrl}](${actionUrl})  `;
        }
        return {
            extras: {
                'client::display': {
                    contentType: 'text/markdown',
                },
            },
            title,
            message,
            priority,
        };
    }
    async send(type, payload) {
        const settings = this.getSettings();
        if (!payload.notifySystem ||
            !(0, __1.hasNotificationType)(type, settings.types ?? 0)) {
            return true;
        }
        logger_1.default.debug('Sending Gotify notification', {
            label: 'Notifications',
            type: __1.Notification[type],
            subject: payload.subject,
        });
        try {
            const endpoint = `${settings.options.url}/message?token=${settings.options.token}`;
            const notificationPayload = this.getNotificationPayload(type, payload);
            await axios_1.default.post(endpoint, notificationPayload);
            return true;
        }
        catch (e) {
            logger_1.default.error('Error sending Gotify notification', {
                label: 'Notifications',
                type: __1.Notification[type],
                subject: payload.subject,
                errorMessage: e.message,
                response: e?.response?.data,
            });
            return false;
        }
    }
}
exports.default = GotifyAgent;

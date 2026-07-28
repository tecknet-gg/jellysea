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
class NtfyAgent extends agent_1.BaseAgent {
    getSettings() {
        if (this.settings) {
            return this.settings;
        }
        const settings = (0, settings_1.getSettings)();
        return settings.notifications.agents.ntfy;
    }
    escapeMarkdown(text) {
        return text.replace(/([\\`*_{}[\]()#+\-.!|>~<])/g, '\\$1');
    }
    buildPayload(type, payload) {
        const settings = this.getSettings();
        const intl = (0, i18n_1.getIntl)(settings.options.locale);
        const { applicationUrl } = (0, settings_1.getSettings)().main;
        const embedPoster = settings.embedPoster;
        const topic = settings.options.topic;
        const priority = settings.options.priority ?? 3;
        const title = payload.event
            ? `${payload.event} - ${payload.subject}`
            : payload.subject;
        let message = payload.message ?? '';
        if (payload.request) {
            message += `${message ? '\n\n' : ''}**${intl.formatMessage(globalMessages_1.default.requestedBy)}:** ${this.escapeMarkdown(payload.request.requestedBy.displayName)}`;
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
                message += `\n**${intl.formatMessage(globalMessages_1.default.requestStatus)}:** ${status}`;
            }
        }
        else if (payload.comment) {
            message += `\n**${this.escapeMarkdown(intl.formatMessage(globalMessages_1.default.commentFrom, {
                userName: payload.comment.user.displayName,
            }))}:**\n${payload.comment.message}`;
        }
        else if (payload.issue) {
            message += `\n\n**${intl.formatMessage(globalMessages_1.default.reportedBy)}:** ${this.escapeMarkdown(payload.issue.createdBy.displayName)}`;
            message += `\n**${intl.formatMessage(globalMessages_1.default.issueType)}:** ${issue_1.IssueTypeName[payload.issue.issueType]}`;
            message += `\n**${intl.formatMessage(globalMessages_1.default.issueStatus)}:** ${payload.issue.status === issue_1.IssueStatus.OPEN
                ? intl.formatMessage(globalMessages_1.default.open)
                : intl.formatMessage(globalMessages_1.default.resolved)}`;
        }
        for (const extra of payload.extra ?? []) {
            message += `\n\n**${extra.name}**\n${extra.value}`;
        }
        const attach = embedPoster ? payload.image : undefined;
        let click;
        if (applicationUrl && payload.media) {
            click = `${applicationUrl}/${payload.media.mediaType}/${payload.media.tmdbId}`;
        }
        const ntfyPayload = {
            topic,
            priority,
            title,
            message,
            markdown: true,
        };
        if (attach) {
            ntfyPayload.attach = attach;
        }
        if (click) {
            ntfyPayload.click = click;
        }
        return ntfyPayload;
    }
    shouldSend() {
        const settings = this.getSettings();
        if (settings.enabled && settings.options.url && settings.options.topic) {
            return true;
        }
        return false;
    }
    async send(type, payload) {
        const settings = this.getSettings();
        if (!payload.notifySystem ||
            !(0, __1.hasNotificationType)(type, settings.types ?? 0)) {
            return true;
        }
        logger_1.default.debug('Sending ntfy notification', {
            label: 'Notifications',
            type: __1.Notification[type],
            subject: payload.subject,
        });
        try {
            let authHeader;
            if (settings.options.authMethodUsernamePassword &&
                settings.options.username &&
                settings.options.password) {
                const encodedAuth = Buffer.from(`${settings.options.username}:${settings.options.password}`).toString('base64');
                authHeader = `Basic ${encodedAuth}`;
            }
            else if (settings.options.authMethodToken) {
                authHeader = `Bearer ${settings.options.token}`;
            }
            await axios_1.default.post(settings.options.url, this.buildPayload(type, payload), authHeader
                ? {
                    headers: {
                        Authorization: authHeader,
                    },
                }
                : undefined);
            return true;
        }
        catch (e) {
            logger_1.default.error('Error sending ntfy notification', {
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
exports.default = NtfyAgent;

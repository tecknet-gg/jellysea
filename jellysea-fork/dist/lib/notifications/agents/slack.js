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
class SlackAgent extends agent_1.BaseAgent {
    getSettings() {
        if (this.settings) {
            return this.settings;
        }
        const settings = (0, settings_1.getSettings)();
        return settings.notifications.agents.slack;
    }
    buildEmbed(type, payload) {
        const settings = this.getSettings();
        const intl = (0, i18n_1.getIntl)(settings.options.locale);
        const { applicationUrl, applicationTitle } = (0, settings_1.getSettings)().main;
        const embedPoster = settings.embedPoster;
        const fields = [];
        if (payload.request) {
            fields.push({
                type: 'mrkdwn',
                text: `*${intl.formatMessage(globalMessages_1.default.requestedBy)}*\n${payload.request.requestedBy.displayName}`,
            });
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
                fields.push({
                    type: 'mrkdwn',
                    text: `*${intl.formatMessage(globalMessages_1.default.requestStatus)}*\n${status}`,
                });
            }
        }
        else if (payload.comment) {
            fields.push({
                type: 'mrkdwn',
                text: `*${intl.formatMessage(globalMessages_1.default.commentFrom, { userName: payload.comment.user.displayName })}*\n${payload.comment.message}`,
            });
        }
        else if (payload.issue) {
            fields.push({
                type: 'mrkdwn',
                text: `*${intl.formatMessage(globalMessages_1.default.reportedBy)}*\n${payload.issue.createdBy.displayName}`,
            }, {
                type: 'mrkdwn',
                text: `*${intl.formatMessage(globalMessages_1.default.issueType)}*\n${issue_1.IssueTypeName[payload.issue.issueType]}`,
            }, {
                type: 'mrkdwn',
                text: `*${intl.formatMessage(globalMessages_1.default.issueStatus)}*\n${payload.issue.status === issue_1.IssueStatus.OPEN
                    ? intl.formatMessage(globalMessages_1.default.open)
                    : intl.formatMessage(globalMessages_1.default.resolved)}`,
            });
        }
        for (const extra of payload.extra ?? []) {
            fields.push({
                type: 'mrkdwn',
                text: `*${extra.name}*\n${extra.value}`,
            });
        }
        const blocks = [];
        if (payload.event) {
            blocks.push({
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `*${payload.event}*`,
                    },
                ],
            });
        }
        blocks.push({
            type: 'header',
            text: {
                type: 'plain_text',
                text: payload.subject,
            },
        });
        if (payload.message) {
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: payload.message,
                },
                accessory: embedPoster && payload.image
                    ? {
                        type: 'image',
                        image_url: payload.image,
                        alt_text: payload.subject,
                    }
                    : undefined,
            });
        }
        if (fields.length > 0) {
            blocks.push({
                type: 'section',
                fields,
            });
        }
        const url = applicationUrl
            ? payload.issue
                ? `${applicationUrl}/issues/${payload.issue.id}`
                : payload.media
                    ? `${applicationUrl}/${payload.media.mediaType}/${payload.media.tmdbId}`
                    : undefined
            : undefined;
        if (url) {
            blocks.push({
                type: 'actions',
                elements: [
                    {
                        action_id: 'open-in-seerr',
                        type: 'button',
                        url,
                        text: {
                            type: 'plain_text',
                            text: intl.formatMessage(payload.issue
                                ? globalMessages_1.default.viewIssue
                                : globalMessages_1.default.viewMedia, { applicationTitle }),
                        },
                    },
                ],
            });
        }
        return {
            text: payload.event ?? payload.subject,
            blocks,
        };
    }
    shouldSend() {
        const settings = this.getSettings();
        if (settings.enabled && settings.options.webhookUrl) {
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
        logger_1.default.debug('Sending Slack notification', {
            label: 'Notifications',
            type: __1.Notification[type],
            subject: payload.subject,
        });
        try {
            await axios_1.default.post(settings.options.webhookUrl, this.buildEmbed(type, payload));
            return true;
        }
        catch (e) {
            logger_1.default.error('Error sending Slack notification', {
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
exports.default = SlackAgent;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const issue_1 = require("../../../constants/issue");
const media_1 = require("../../../constants/media");
const settings_1 = require("../../../lib/settings");
const logger_1 = __importDefault(require("../../../logger"));
const axios_1 = __importDefault(require("axios"));
const lodash_1 = require("lodash");
const __1 = require("..");
const agent_1 = require("./agent");
const KeyMap = {
    notification_type: (_payload, type) => __1.Notification[type],
    event: 'event',
    subject: 'subject',
    message: 'message',
    image: 'image',
    notifyuser_username: 'notifyUser.displayName',
    notifyuser_email: 'notifyUser.email',
    notifyuser_avatar: 'notifyUser.avatar',
    notifyuser_settings_discordIds: 'notifyUser.settings.discordIds',
    notifyuser_settings_telegramChatId: 'notifyUser.settings.telegramChatId',
    media_imdbid: 'media.imdbId',
    media_tmdbid: 'media.tmdbId',
    media_tvdbid: 'media.tvdbId',
    media_type: 'media.mediaType',
    media_jellyfinMediaId: (payload) => payload.media?.jellyfinMediaId ?? payload.media?.jellyfinMediaId4k ?? '',
    media_status: (payload) => payload.media ? media_1.MediaStatus[payload.media.status] : '',
    media_status4k: (payload) => payload.media ? media_1.MediaStatus[payload.media.status4k] : '',
    media_plexRatingKey: (payload) => payload.media?.ratingKey ?? '',
    media_plexRatingKey4k: (payload) => payload.media?.ratingKey4k ?? '',
    request_id: 'request.id',
    requestedBy_jellyfinUserId: 'request.requestedBy.jellyfinUserId',
    requestedBy_username: 'request.requestedBy.displayName',
    requestedBy_email: 'request.requestedBy.email',
    requestedBy_avatar: 'request.requestedBy.avatar',
    requestedBy_settings_discordIds: 'request.requestedBy.settings.discordIds',
    requestedBy_settings_telegramChatId: 'request.requestedBy.settings.telegramChatId',
    issue_id: 'issue.id',
    issue_type: (payload) => payload.issue ? issue_1.IssueType[payload.issue.issueType] : '',
    issue_status: (payload) => payload.issue ? issue_1.IssueStatus[payload.issue.status] : '',
    reportedBy_username: 'issue.createdBy.displayName',
    reportedBy_email: 'issue.createdBy.email',
    reportedBy_avatar: 'issue.createdBy.avatar',
    reportedBy_settings_discordIds: 'issue.createdBy.settings.discordIds',
    reportedBy_settings_telegramChatId: 'issue.createdBy.settings.telegramChatId',
    comment_message: 'comment.message',
    commentedBy_username: 'comment.user.displayName',
    commentedBy_email: 'comment.user.email',
    commentedBy_avatar: 'comment.user.avatar',
    commentedBy_settings_discordIds: 'comment.user.settings.discordIds',
    commentedBy_settings_telegramChatId: 'comment.user.settings.telegramChatId',
};
class WebhookAgent extends agent_1.BaseAgent {
    getSettings() {
        if (this.settings) {
            return this.settings;
        }
        const settings = (0, settings_1.getSettings)();
        return settings.notifications.agents.webhook;
    }
    parseKeys(finalPayload, payload, type) {
        Object.keys(finalPayload).forEach((key) => {
            if (key === '{{extra}}') {
                finalPayload.extra = payload.extra ?? [];
                delete finalPayload[key];
                key = 'extra';
            }
            else if (key === '{{media}}') {
                if (payload.media) {
                    finalPayload.media = finalPayload[key];
                }
                else {
                    finalPayload.media = null;
                }
                delete finalPayload[key];
                key = 'media';
            }
            else if (key === '{{request}}') {
                if (payload.request) {
                    finalPayload.request = finalPayload[key];
                }
                else {
                    finalPayload.request = null;
                }
                delete finalPayload[key];
                key = 'request';
            }
            else if (key === '{{issue}}') {
                if (payload.issue) {
                    finalPayload.issue = finalPayload[key];
                }
                else {
                    finalPayload.issue = null;
                }
                delete finalPayload[key];
                key = 'issue';
            }
            else if (key === '{{comment}}') {
                if (payload.comment) {
                    finalPayload.comment = finalPayload[key];
                }
                else {
                    finalPayload.comment = null;
                }
                delete finalPayload[key];
                key = 'comment';
            }
            if (typeof finalPayload[key] === 'string') {
                Object.keys(KeyMap).forEach((keymapKey) => {
                    const keymapValue = KeyMap[keymapKey];
                    finalPayload[key] = finalPayload[key].replace(`{{${keymapKey}}}`, typeof keymapValue === 'function'
                        ? keymapValue(payload, type)
                        : ((0, lodash_1.get)(payload, keymapValue) ?? ''));
                });
            }
            else if (finalPayload[key] && typeof finalPayload[key] === 'object') {
                finalPayload[key] = this.parseKeys(finalPayload[key], payload, type);
            }
        });
        return finalPayload;
    }
    buildPayload(type, payload) {
        const payloadString = Buffer.from(this.getSettings().options.jsonPayload, 'base64').toString('utf8');
        const parsedJSON = JSON.parse(JSON.parse(payloadString));
        return this.parseKeys(parsedJSON, payload, type);
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
        logger_1.default.debug('Sending webhook notification', {
            label: 'Notifications',
            type: __1.Notification[type],
            subject: payload.subject,
        });
        let webhookUrl = settings.options.webhookUrl;
        if (settings.options.supportVariables) {
            Object.keys(KeyMap).forEach((keymapKey) => {
                const keymapValue = KeyMap[keymapKey];
                const variableValue = type === __1.Notification.TEST_NOTIFICATION
                    ? 'test'
                    : typeof keymapValue === 'function'
                        ? keymapValue(payload, type)
                        : (0, lodash_1.get)(payload, keymapValue) || 'test';
                webhookUrl = webhookUrl.replace(new RegExp(`{{${keymapKey}}}`, 'g'), encodeURIComponent(variableValue));
            });
        }
        try {
            const headers = {};
            if (settings.options.authHeader) {
                headers.Authorization = settings.options.authHeader;
            }
            if (settings.options.customHeaders &&
                settings.options.customHeaders.length > 0) {
                settings.options.customHeaders.forEach((header) => {
                    const key = header.key?.trim();
                    const value = header.value?.trim();
                    if (key && value) {
                        // Don't override Authorization header if it's already set via authHeader
                        if (key.toLowerCase() !== 'authorization' ||
                            !settings.options.authHeader) {
                            headers[key] = value;
                        }
                    }
                });
            }
            await axios_1.default.post(webhookUrl, this.buildPayload(type, payload), Object.keys(headers).length > 0 ? { headers } : undefined);
            return true;
        }
        catch (e) {
            logger_1.default.error('Error sending webhook notification', {
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
exports.default = WebhookAgent;

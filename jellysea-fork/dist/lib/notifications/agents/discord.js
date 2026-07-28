"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_1 = require("../../../constants/discord");
const issue_1 = require("../../../constants/issue");
const datasource_1 = require("../../../datasource");
const User_1 = require("../../../entity/User");
const i18n_1 = require("../../../i18n");
const globalMessages_1 = __importDefault(require("../../../i18n/globalMessages"));
const settings_1 = require("../../../lib/settings");
const logger_1 = __importDefault(require("../../../logger"));
const axios_1 = __importDefault(require("axios"));
const __1 = require("..");
const agent_1 = require("./agent");
const isValidSnowflake = (id) => discord_1.DISCORD_SNOWFLAKE_REGEX.test(id);
class DiscordAgent extends agent_1.BaseAgent {
    getSettings() {
        if (this.settings) {
            return this.settings;
        }
        const settings = (0, settings_1.getSettings)();
        return settings.notifications.agents.discord;
    }
    buildEmbed(type, payload, locale) {
        const intl = (0, i18n_1.getIntl)(locale);
        const settings = (0, settings_1.getSettings)();
        const { applicationUrl } = settings.main;
        const { embedPoster } = settings.notifications.agents.discord;
        const appUrl = applicationUrl || `http://localhost:${process.env.port || 5055}`;
        let color = discord_1.EmbedColors.DARK_PURPLE;
        const fields = [];
        if (payload.request) {
            fields.push({
                name: intl.formatMessage(globalMessages_1.default.requestedBy),
                value: payload.request.requestedBy.displayName,
                inline: true,
            });
            let status = '';
            switch (type) {
                case __1.Notification.MEDIA_PENDING:
                    color = discord_1.EmbedColors.ORANGE;
                    status = `[${intl.formatMessage(globalMessages_1.default.pendingApproval)}](${appUrl}/requests)`;
                    break;
                case __1.Notification.MEDIA_APPROVED:
                case __1.Notification.MEDIA_AUTO_APPROVED:
                    color = discord_1.EmbedColors.PURPLE;
                    status = intl.formatMessage(globalMessages_1.default.processing);
                    break;
                case __1.Notification.MEDIA_AVAILABLE:
                    color = discord_1.EmbedColors.GREEN;
                    status = intl.formatMessage(globalMessages_1.default.available);
                    break;
                case __1.Notification.MEDIA_DECLINED:
                    color = discord_1.EmbedColors.RED;
                    status = intl.formatMessage(globalMessages_1.default.declined);
                    break;
                case __1.Notification.MEDIA_FAILED:
                    color = discord_1.EmbedColors.RED;
                    status = intl.formatMessage(globalMessages_1.default.failed);
                    break;
            }
            if (status) {
                fields.push({
                    name: intl.formatMessage(globalMessages_1.default.requestStatus),
                    value: status,
                    inline: true,
                });
            }
        }
        else if (payload.comment) {
            fields.push({
                name: intl.formatMessage(globalMessages_1.default.commentFrom, {
                    userName: payload.comment.user.displayName,
                }),
                value: payload.comment.message,
                inline: false,
            });
        }
        else if (payload.issue) {
            fields.push({
                name: intl.formatMessage(globalMessages_1.default.reportedBy),
                value: payload.issue.createdBy.displayName,
                inline: true,
            }, {
                name: intl.formatMessage(globalMessages_1.default.issueType),
                value: issue_1.IssueTypeName[payload.issue.issueType],
                inline: true,
            }, {
                name: intl.formatMessage(globalMessages_1.default.issueStatus),
                value: payload.issue.status === issue_1.IssueStatus.OPEN
                    ? intl.formatMessage(globalMessages_1.default.open)
                    : intl.formatMessage(globalMessages_1.default.resolved),
                inline: true,
            });
            switch (type) {
                case __1.Notification.ISSUE_CREATED:
                case __1.Notification.ISSUE_REOPENED:
                    color = discord_1.EmbedColors.RED;
                    break;
                case __1.Notification.ISSUE_COMMENT:
                    color = discord_1.EmbedColors.ORANGE;
                    break;
                case __1.Notification.ISSUE_RESOLVED:
                    color = discord_1.EmbedColors.GREEN;
                    break;
            }
        }
        for (const extra of payload.extra ?? []) {
            fields.push({
                name: extra.name,
                value: extra.value,
                inline: true,
            });
        }
        const url = applicationUrl
            ? payload.issue
                ? `${applicationUrl}/issues/${payload.issue.id}`
                : payload.media
                    ? `${applicationUrl}/${payload.media.mediaType}/${payload.media.tmdbId}`
                    : undefined
            : undefined;
        return {
            title: payload.event
                ? `${payload.event}: ${payload.subject}`
                : payload.subject,
            url,
            description: payload.message,
            color,
            timestamp: new Date().toISOString(),
            fields,
            thumbnail: embedPoster
                ? {
                    url: payload.image,
                }
                : undefined,
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
        logger_1.default.debug('Sending Discord notification', {
            label: 'Notifications',
            type: __1.Notification[type],
            subject: payload.subject,
        });
        const userMentions = [];
        try {
            if (settings.options.enableMentions) {
                if (payload.notifyUser) {
                    if (payload.notifyUser.settings?.hasNotificationType(settings_1.NotificationAgentKey.DISCORD, type) &&
                        payload.notifyUser.settings.discordIds?.length) {
                        const validIds = payload.notifyUser.settings.discordIds.filter((id) => isValidSnowflake(id));
                        userMentions.push(...validIds.map((id) => `<@${id}>`));
                    }
                }
                if (payload.notifyAdmin) {
                    const userRepository = (0, datasource_1.getRepository)(User_1.User);
                    const users = await userRepository.find();
                    userMentions.push(...users
                        .filter((user) => user.settings?.hasNotificationType(settings_1.NotificationAgentKey.DISCORD, type) &&
                        user.settings.discordIds?.length &&
                        (0, __1.shouldSendAdminNotification)(type, user, payload))
                        .flatMap((user) => user
                        .settings.discordIds.filter((id) => isValidSnowflake(id))
                        .map((id) => `<@${id}>`)));
                }
            }
            const allowedUserIds = userMentions.map((mention) => mention.replace(/[<@>]/g, ''));
            const allowedRoleIds = [];
            if (settings.options.webhookRoleId &&
                isValidSnowflake(settings.options.webhookRoleId)) {
                userMentions.push(`<@&${settings.options.webhookRoleId}>`);
                allowedRoleIds.push(settings.options.webhookRoleId);
            }
            // Discord webhooks go to a channel, not per-user,
            // so if use user locale is set, we'll use the locale of the user being notified
            // if not, we'll use the default locale set in the notification settings
            const locale = settings.options.useUserLocale
                ? payload.notifyUser?.settings?.locale
                : settings.options.locale;
            const webhookUrl = new URL(settings.options.webhookUrl);
            if (settings.options.webhookThreadId) {
                webhookUrl.searchParams.set('thread_id', settings.options.webhookThreadId);
            }
            await axios_1.default.post(webhookUrl.toString(), {
                username: settings.options.botUsername
                    ? settings.options.botUsername
                    : (0, settings_1.getSettings)().main.applicationTitle,
                avatar_url: settings.options.botAvatarUrl,
                embeds: [this.buildEmbed(type, payload, locale)],
                content: userMentions.join(' '),
                allowed_mentions: {
                    users: allowedUserIds,
                    roles: allowedRoleIds,
                },
            });
            return true;
        }
        catch (e) {
            logger_1.default.error('Error sending Discord notification', {
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
exports.default = DiscordAgent;

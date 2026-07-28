"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const i18n_1 = require("../../i18n");
const notifications_1 = require("../../lib/notifications");
const discord_1 = __importDefault(require("../../lib/notifications/agents/discord"));
const email_1 = __importDefault(require("../../lib/notifications/agents/email"));
const gotify_1 = __importDefault(require("../../lib/notifications/agents/gotify"));
const ntfy_1 = __importDefault(require("../../lib/notifications/agents/ntfy"));
const pushbullet_1 = __importDefault(require("../../lib/notifications/agents/pushbullet"));
const pushover_1 = __importDefault(require("../../lib/notifications/agents/pushover"));
const slack_1 = __importDefault(require("../../lib/notifications/agents/slack"));
const telegram_1 = __importDefault(require("../../lib/notifications/agents/telegram"));
const webhook_1 = __importDefault(require("../../lib/notifications/agents/webhook"));
const webpush_1 = __importDefault(require("../../lib/notifications/agents/webpush"));
const settings_1 = require("../../lib/settings");
const express_1 = require("express");
const notificationRoutes = (0, express_1.Router)();
const messages = (0, i18n_1.defineMessages)('notifications.test', {
    subject: 'Test Notification',
    message: 'Check check, 1, 2, 3. Are we coming in clear?',
});
const sendTestNotification = async (agent, user) => {
    const intl = (0, i18n_1.getIntl)(user.settings?.locale);
    return await agent.send(notifications_1.Notification.TEST_NOTIFICATION, {
        notifySystem: true,
        notifyAdmin: false,
        notifyUser: user,
        subject: intl.formatMessage(messages.subject),
        message: intl.formatMessage(messages.message),
    });
};
notificationRoutes.get('/discord', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.notifications.agents.discord);
});
notificationRoutes.post('/discord', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    settings.notifications.agents.discord = req.body;
    await settings.save();
    res.status(200).json(settings.notifications.agents.discord);
});
notificationRoutes.post('/discord/test', async (req, res, next) => {
    if (!req.user) {
        return next({
            status: 500,
            message: 'User information is missing from the request.',
        });
    }
    const discordAgent = new discord_1.default(req.body);
    if (await sendTestNotification(discordAgent, req.user)) {
        return res.status(204).send();
    }
    else {
        return next({
            status: 500,
            message: 'Failed to send Discord notification.',
        });
    }
});
notificationRoutes.get('/slack', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.notifications.agents.slack);
});
notificationRoutes.post('/slack', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    settings.notifications.agents.slack = req.body;
    await settings.save();
    res.status(200).json(settings.notifications.agents.slack);
});
notificationRoutes.post('/slack/test', async (req, res, next) => {
    if (!req.user) {
        return next({
            status: 500,
            message: 'User information is missing from the request.',
        });
    }
    const slackAgent = new slack_1.default(req.body);
    if (await sendTestNotification(slackAgent, req.user)) {
        return res.status(204).send();
    }
    else {
        return next({
            status: 500,
            message: 'Failed to send Slack notification.',
        });
    }
});
notificationRoutes.get('/telegram', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.notifications.agents.telegram);
});
notificationRoutes.post('/telegram', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    settings.notifications.agents.telegram = req.body;
    await settings.save();
    res.status(200).json(settings.notifications.agents.telegram);
});
notificationRoutes.post('/telegram/test', async (req, res, next) => {
    if (!req.user) {
        return next({
            status: 500,
            message: 'User information is missing from the request.',
        });
    }
    const telegramAgent = new telegram_1.default(req.body);
    if (await sendTestNotification(telegramAgent, req.user)) {
        return res.status(204).send();
    }
    else {
        return next({
            status: 500,
            message: 'Failed to send Telegram notification.',
        });
    }
});
notificationRoutes.get('/pushbullet', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.notifications.agents.pushbullet);
});
notificationRoutes.post('/pushbullet', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    settings.notifications.agents.pushbullet = req.body;
    await settings.save();
    res.status(200).json(settings.notifications.agents.pushbullet);
});
notificationRoutes.post('/pushbullet/test', async (req, res, next) => {
    if (!req.user) {
        return next({
            status: 500,
            message: 'User information is missing from the request.',
        });
    }
    const pushbulletAgent = new pushbullet_1.default(req.body);
    if (await sendTestNotification(pushbulletAgent, req.user)) {
        return res.status(204).send();
    }
    else {
        return next({
            status: 500,
            message: 'Failed to send Pushbullet notification.',
        });
    }
});
notificationRoutes.get('/pushover', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.notifications.agents.pushover);
});
notificationRoutes.post('/pushover', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    settings.notifications.agents.pushover = req.body;
    await settings.save();
    res.status(200).json(settings.notifications.agents.pushover);
});
notificationRoutes.post('/pushover/test', async (req, res, next) => {
    if (!req.user) {
        return next({
            status: 500,
            message: 'User information is missing from the request.',
        });
    }
    const pushoverAgent = new pushover_1.default(req.body);
    if (await sendTestNotification(pushoverAgent, req.user)) {
        return res.status(204).send();
    }
    else {
        return next({
            status: 500,
            message: 'Failed to send Pushover notification.',
        });
    }
});
notificationRoutes.get('/email', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.notifications.agents.email);
});
notificationRoutes.post('/email', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    settings.notifications.agents.email = req.body;
    await settings.save();
    res.status(200).json(settings.notifications.agents.email);
});
notificationRoutes.post('/email/test', async (req, res, next) => {
    if (!req.user) {
        return next({
            status: 500,
            message: 'User information is missing from the request.',
        });
    }
    const emailAgent = new email_1.default(req.body);
    if (await sendTestNotification(emailAgent, req.user)) {
        return res.status(204).send();
    }
    else {
        return next({
            status: 500,
            message: 'Failed to send email notification.',
        });
    }
});
notificationRoutes.get('/webpush', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.notifications.agents.webpush);
});
notificationRoutes.post('/webpush', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    settings.notifications.agents.webpush = req.body;
    await settings.save();
    res.status(200).json(settings.notifications.agents.webpush);
});
notificationRoutes.post('/webpush/test', async (req, res, next) => {
    if (!req.user) {
        return next({
            status: 500,
            message: 'User information is missing from the request.',
        });
    }
    const webpushAgent = new webpush_1.default(req.body);
    if (await sendTestNotification(webpushAgent, req.user)) {
        return res.status(204).send();
    }
    else {
        return next({
            status: 500,
            message: 'Failed to send web push notification.',
        });
    }
});
notificationRoutes.get('/webhook', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    const webhookSettings = settings.notifications.agents.webhook;
    const response = {
        enabled: webhookSettings.enabled,
        embedPoster: webhookSettings.embedPoster,
        types: webhookSettings.types,
        options: {
            ...webhookSettings.options,
            jsonPayload: JSON.parse(Buffer.from(webhookSettings.options.jsonPayload, 'base64').toString('utf8')),
            customHeaders: webhookSettings.options.customHeaders ?? [],
            supportVariables: webhookSettings.options.supportVariables ?? false,
        },
    };
    res.status(200).json(response);
});
notificationRoutes.post('/webhook', async (req, res, next) => {
    const settings = (0, settings_1.getSettings)();
    try {
        JSON.parse(req.body.options.jsonPayload);
        settings.notifications.agents.webhook = {
            enabled: req.body.enabled,
            embedPoster: req.body.embedPoster,
            types: req.body.types,
            options: {
                jsonPayload: Buffer.from(JSON.stringify(req.body.options.jsonPayload)).toString('base64'),
                webhookUrl: req.body.options.webhookUrl,
                authHeader: req.body.options.authHeader,
                customHeaders: req.body.options.customHeaders ?? [],
                supportVariables: req.body.options.supportVariables ?? false,
            },
        };
        await settings.save();
        res.status(200).json(settings.notifications.agents.webhook);
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
notificationRoutes.post('/webhook/test', async (req, res, next) => {
    if (!req.user) {
        return next({
            status: 500,
            message: 'User information is missing from the request.',
        });
    }
    try {
        JSON.parse(req.body.options.jsonPayload);
        const testBody = {
            enabled: req.body.enabled,
            embedPoster: req.body.embedPoster,
            types: req.body.types,
            options: {
                jsonPayload: Buffer.from(JSON.stringify(req.body.options.jsonPayload)).toString('base64'),
                webhookUrl: req.body.options.webhookUrl,
                authHeader: req.body.options.authHeader,
                customHeaders: req.body.options.customHeaders ?? [],
                supportVariables: req.body.options.supportVariables ?? false,
            },
        };
        const webhookAgent = new webhook_1.default(testBody);
        if (await sendTestNotification(webhookAgent, req.user)) {
            return res.status(204).send();
        }
        else {
            return next({
                status: 500,
                message: 'Failed to send webhook notification.',
            });
        }
    }
    catch (e) {
        next({ status: 500, message: e.message });
    }
});
notificationRoutes.get('/gotify', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.notifications.agents.gotify);
});
notificationRoutes.post('/gotify', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    settings.notifications.agents.gotify = req.body;
    await settings.save();
    res.status(200).json(settings.notifications.agents.gotify);
});
notificationRoutes.post('/gotify/test', async (req, res, next) => {
    if (!req.user) {
        return next({
            status: 500,
            message: 'User information is missing from the request.',
        });
    }
    const gotifyAgent = new gotify_1.default(req.body);
    if (await sendTestNotification(gotifyAgent, req.user)) {
        return res.status(204).send();
    }
    else {
        return next({
            status: 500,
            message: 'Failed to send Gotify notification.',
        });
    }
});
notificationRoutes.get('/ntfy', (_req, res) => {
    const settings = (0, settings_1.getSettings)();
    res.status(200).json(settings.notifications.agents.ntfy);
});
notificationRoutes.post('/ntfy', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    settings.notifications.agents.ntfy = req.body;
    await settings.save();
    res.status(200).json(settings.notifications.agents.ntfy);
});
notificationRoutes.post('/ntfy/test', async (req, res, next) => {
    if (!req.user) {
        return next({
            status: 500,
            message: 'User information is missing from the request.',
        });
    }
    const ntfyAgent = new ntfy_1.default(req.body);
    if (await sendTestNotification(ntfyAgent, req.user)) {
        return res.status(204).send();
    }
    else {
        return next({
            status: 500,
            message: 'Failed to send ntfy notification.',
        });
    }
});
exports.default = notificationRoutes;

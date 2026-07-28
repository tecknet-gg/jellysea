"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = require("../../lib/settings");
const email_templates_1 = __importDefault(require("email-templates"));
const node_net_1 = __importDefault(require("node:net"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const url_1 = require("url");
const openpgpEncrypt_1 = require("./openpgpEncrypt");
const getSocket = (options, callback) => {
    if (!options.host || typeof options.port !== 'number') {
        callback(new Error('SMTP host and port are required'), undefined);
        return;
    }
    const socket = node_net_1.default.connect({
        host: options.host,
        port: options.port,
    });
    const cleanup = () => {
        socket.setTimeout(0);
        socket.removeListener('error', onError);
        socket.removeListener('connect', onConnect);
        socket.removeListener('timeout', onTimeout);
    };
    const onError = (error) => {
        cleanup();
        callback(error, undefined);
    };
    const onConnect = () => {
        cleanup();
        callback(null, { connection: socket });
    };
    const onTimeout = () => {
        cleanup();
        socket.destroy();
        callback(new Error('SMTP connection timed out'), undefined);
    };
    socket.once('error', onError);
    socket.once('connect', onConnect);
    socket.once('timeout', onTimeout);
    socket.setTimeout(10000);
};
class PreparedEmail extends email_templates_1.default {
    constructor(settings, pgpKey) {
        const { applicationUrl } = (0, settings_1.getSettings)().main;
        const transport = nodemailer_1.default.createTransport({
            name: applicationUrl ? new url_1.URL(applicationUrl).hostname : undefined,
            host: settings.options.smtpHost,
            port: settings.options.smtpPort,
            secure: settings.options.secure,
            ignoreTLS: settings.options.ignoreTls,
            requireTLS: settings.options.requireTls,
            tls: settings.options.allowSelfSigned
                ? {
                    rejectUnauthorized: false,
                }
                : undefined,
            auth: settings.options.authUser && settings.options.authPass
                ? {
                    user: settings.options.authUser,
                    pass: settings.options.authPass,
                }
                : undefined,
            getSocket: node_net_1.default.isIP(settings.options.smtpHost) ? undefined : getSocket,
        });
        if (pgpKey) {
            transport.use('stream', (0, openpgpEncrypt_1.openpgpEncrypt)({
                signingKey: settings.options.pgpPrivateKey,
                password: settings.options.pgpPassword,
                encryptionKeys: [pgpKey],
            }));
        }
        super({
            message: {
                from: {
                    name: settings.options.senderName,
                    address: settings.options.emailFrom,
                },
            },
            send: true,
            transport: transport,
            preview: false,
        });
    }
}
exports.default = PreparedEmail;

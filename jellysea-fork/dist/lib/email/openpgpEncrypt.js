"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openpgpEncrypt = void 0;
const logger_1 = __importDefault(require("../../logger"));
const crypto_1 = require("crypto");
const openpgp = __importStar(require("openpgp"));
const stream_1 = require("stream");
class PGPEncryptor extends stream_1.Transform {
    constructor(options) {
        super();
        this._messageChunks = [];
        this._messageLength = 0;
        // just save the whole message
        this._transform = (chunk, _encoding, callback) => {
            this._messageChunks.push(chunk);
            this._messageLength += chunk.length;
            callback();
        };
        // Actually do stuff
        this._flush = async (callback) => {
            const message = Buffer.concat(this._messageChunks, this._messageLength);
            try {
                // Reconstruct message as buffer
                const validPublicKeys = await Promise.all(this._encryptionKeys.map((armoredKey) => openpgp.readKey({ armoredKey })));
                let privateKey;
                // Just return the message if there is no one to encrypt for
                if (!validPublicKeys.length) {
                    this.push(message);
                    return callback();
                }
                // Only sign the message if private key and password exist
                if (this._signingKey && this._password) {
                    privateKey = await openpgp.decryptKey({
                        privateKey: await openpgp.readPrivateKey({
                            armoredKey: this._signingKey,
                        }),
                        passphrase: this._password,
                    });
                }
                const emailPartDelimiter = '\r\n\r\n';
                const messageParts = message.toString().split(emailPartDelimiter);
                /**
                 * In this loop original headers are split up into two parts,
                 * one for the email that is sent
                 * and one for the encrypted content
                 */
                const header = messageParts.shift();
                const emailHeaders = [];
                const contentHeaders = [];
                const linesInHeader = header.split('\r\n');
                let previousHeader = [];
                for (let i = 0; i < linesInHeader.length; i++) {
                    const line = linesInHeader[i];
                    if (/^\s/.test(line) || i === 0) {
                        previousHeader.push(line);
                    }
                    else {
                        if (/^(content-type|content-transfer-encoding):/i.test(previousHeader[0])) {
                            contentHeaders.push(previousHeader);
                        }
                        else {
                            emailHeaders.push(previousHeader);
                        }
                        previousHeader = [line];
                    }
                }
                if (previousHeader.length > 0) {
                    if (/^(content-type|content-transfer-encoding):/i.test(previousHeader[0])) {
                        contentHeaders.push(previousHeader);
                    }
                    else {
                        emailHeaders.push(previousHeader);
                    }
                }
                // Generate a new boundary for the email content
                const boundary = 'nm_' + (0, crypto_1.randomBytes)(14).toString('hex');
                /**
                 * Concatenate everything into single strings
                 * and add pgp headers to the email headers
                 */
                const emailHeadersRaw = emailHeaders.map((line) => line.join('\r\n')).join('\r\n') +
                    '\r\n' +
                    'Content-Type: multipart/encrypted; protocol="application/pgp-encrypted";' +
                    '\r\n' +
                    ' boundary="' +
                    boundary +
                    '"' +
                    '\r\n' +
                    'Content-Description: OpenPGP encrypted message' +
                    '\r\n' +
                    'Content-Transfer-Encoding: 7bit';
                const contentHeadersRaw = contentHeaders
                    .map((line) => line.join('\r\n'))
                    .join('\r\n');
                const encryptedMessage = await openpgp.encrypt({
                    message: await openpgp.createMessage({
                        text: contentHeadersRaw +
                            emailPartDelimiter +
                            messageParts.join(emailPartDelimiter),
                    }),
                    encryptionKeys: validPublicKeys,
                    signingKeys: privateKey,
                });
                const body = '--' +
                    boundary +
                    '\r\n' +
                    'Content-Type: application/pgp-encrypted\r\n' +
                    'Content-Transfer-Encoding: 7bit\r\n' +
                    '\r\n' +
                    'Version: 1\r\n' +
                    '\r\n' +
                    '--' +
                    boundary +
                    '\r\n' +
                    'Content-Type: application/octet-stream; name=encrypted.asc\r\n' +
                    'Content-Disposition: inline; filename=encrypted.asc\r\n' +
                    'Content-Transfer-Encoding: 7bit\r\n' +
                    '\r\n' +
                    encryptedMessage +
                    '\r\n--' +
                    boundary +
                    '--\r\n';
                this.push(Buffer.from(emailHeadersRaw + emailPartDelimiter + body));
                callback();
            }
            catch (e) {
                logger_1.default.error('Something went wrong while encrypting email message with OpenPGP. Sending email without encryption', {
                    label: 'Notifications',
                    errorMessage: e.message,
                });
                this.push(message);
                callback();
            }
        };
        this._signingKey = options.signingKey;
        this._password = options.password;
        this._encryptionKeys = options.encryptionKeys;
    }
}
const openpgpEncrypt = (options) => {
    // Disabling this line because I don't want to fix it but I am tired
    // of seeing the lint warning
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function (mail, callback) {
        if (!options.encryptionKeys.length) {
            setImmediate(callback);
        }
        mail.message.transform(() => new PGPEncryptor({
            signingKey: options.signingKey,
            password: options.password,
            encryptionKeys: options.encryptionKeys,
        }));
        setImmediate(callback);
    };
};
exports.openpgpEncrypt = openpgpEncrypt;

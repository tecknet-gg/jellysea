"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineMessages = exports.getIntl = exports.initI18n = void 0;
const intl_1 = require("@formatjs/intl");
const settings_1 = require("../lib/settings");
const languages_1 = require("../types/languages");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cache = (0, intl_1.createIntlCache)();
const intls = new Map();
function initI18n() {
    for (const locale of languages_1.availableLocales) {
        const filePath = path_1.default.join(__dirname, `locale/${locale}.json`);
        if (!fs_1.default.existsSync(filePath))
            continue;
        const messages = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
        intls.set(locale, (0, intl_1.createIntl)({
            locale,
            messages,
            defaultLocale: 'en',
        }, cache));
    }
    if (!intls.has('en')) {
        throw new Error('Failed to initialize English locale - en.json is required');
    }
}
exports.initI18n = initI18n;
function getIntl(locale) {
    // "Default" stores a falsy locale, so fall back to the server language, then English
    const serverLocale = (0, settings_1.getSettings)().main.locale;
    const resolved = locale || serverLocale || 'en';
    return intls.get(resolved) || intls.get('en');
}
exports.getIntl = getIntl;
function defineMessages(namespace, messages) {
    const result = {};
    for (const key of Object.keys(messages)) {
        result[key] = {
            id: `${namespace}.${String(key)}`,
            defaultMessage: messages[key],
        };
    }
    return result;
}
exports.defineMessages = defineMessages;

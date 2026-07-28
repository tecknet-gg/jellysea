"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppVersion = exports.getCommitTag = void 0;
const logger_1 = __importDefault(require("../logger"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const COMMIT_TAG_PATH = path_1.default.join(__dirname, '../../committag.json');
let commitTag = 'local';
if ((0, fs_1.existsSync)(COMMIT_TAG_PATH)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    commitTag = require(COMMIT_TAG_PATH).commitTag;
    logger_1.default.info(`Commit Tag: ${commitTag}`);
}
const getCommitTag = () => {
    return commitTag;
};
exports.getCommitTag = getCommitTag;
const getAppVersion = () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { version } = require('../../package.json');
    let finalVersion = version;
    if (version === '0.1.0') {
        finalVersion = `develop-${(0, exports.getCommitTag)()}`;
    }
    return finalVersion;
};
exports.getAppVersion = getAppVersion;

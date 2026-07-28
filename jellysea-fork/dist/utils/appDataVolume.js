"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appDataPermissions = exports.appDataPath = exports.appDataStatus = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const CONFIG_PATH = process.env.CONFIG_DIRECTORY
    ? process.env.CONFIG_DIRECTORY
    : path_1.default.join(__dirname, '../../config');
const DOCKER_PATH = `${CONFIG_PATH}/DOCKER`;
const appDataStatus = () => {
    return !(0, fs_1.existsSync)(DOCKER_PATH);
};
exports.appDataStatus = appDataStatus;
const appDataPath = () => {
    return CONFIG_PATH;
};
exports.appDataPath = appDataPath;
const appDataPermissions = () => {
    try {
        (0, fs_1.accessSync)(CONFIG_PATH);
        return true;
    }
    catch {
        return false;
    }
};
exports.appDataPermissions = appDataPermissions;

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
/* eslint-disable no-console */
const path_1 = __importDefault(require("path"));
const winston = __importStar(require("winston"));
require("winston-daily-rotate-file");
const hformat = winston.format.printf(({ level, label, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]${label ? `[${label}]` : ''}: ${message} `;
    if (Object.keys(metadata).length > 0) {
        msg += JSON.stringify(metadata);
    }
    return msg;
});
const seerrFileTransport = new winston.transports.DailyRotateFile({
    filename: process.env.CONFIG_DIRECTORY
        ? `${process.env.CONFIG_DIRECTORY}/logs/seerr-%DATE%.log`
        : path_1.default.join(__dirname, '../config/logs/seerr-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '7d',
    createSymlink: true,
    symlinkName: 'seerr.log',
});
const machineLogFileTransport = new winston.transports.DailyRotateFile({
    filename: process.env.CONFIG_DIRECTORY
        ? `${process.env.CONFIG_DIRECTORY}/logs/.machinelogs-%DATE%.json`
        : path_1.default.join(__dirname, '../config/logs/.machinelogs-%DATE%.json'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '1d',
    createSymlink: true,
    symlinkName: '.machinelogs.json',
    format: winston.format.combine(winston.format.splat(), winston.format.timestamp(), winston.format.json()),
});
seerrFileTransport.on('error', (err) => {
    console.error('Error in seerr file transport:', err);
});
machineLogFileTransport.on('error', (err) => {
    console.error('Error in machine log file transport:', err);
});
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL?.toLowerCase() || 'debug',
    format: winston.format.combine(winston.format.splat(), winston.format.timestamp(), hformat),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.splat(), winston.format.timestamp(), hformat),
        }),
        seerrFileTransport,
        machineLogFileTransport,
    ],
});
exports.default = logger;

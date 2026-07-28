"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../logger"));
const node_test_1 = require("node:test");
(0, node_test_1.before)(() => {
    if (process.env.VERBOSE != 'true')
        logger_1.default.silent = true;
});
(0, node_test_1.after)(() => {
    if (process.env.VERBOSE != 'true')
        logger_1.default.silent = false;
});

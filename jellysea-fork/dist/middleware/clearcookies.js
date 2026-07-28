"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const clearCookies = (_req, res, next) => {
    res.removeHeader('Set-Cookie');
    next();
};
exports.default = clearCookies;

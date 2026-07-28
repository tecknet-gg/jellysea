"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deprecatedRoute = void 0;
const logger_1 = __importDefault(require("../logger"));
/**
 * Mark an API route as deprecated.
 * @see https://datatracker.ietf.org/doc/html/rfc8594
 */
const deprecatedRoute = ({ oldPath, newPath, sunsetDate, documentationUrl, }) => {
    return (req, res, next) => {
        logger_1.default.warn(`Deprecated API endpoint accessed: ${oldPath} → use ${newPath} instead`, {
            label: 'API Deprecation',
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            method: req.method,
            path: req.originalUrl,
        });
        res.setHeader('Deprecation', 'true');
        const links = [`<${newPath}>; rel="successor-version"`];
        if (documentationUrl) {
            links.push(`<${documentationUrl}>; rel="deprecation"`);
        }
        res.setHeader('Link', links.join(', '));
        if (sunsetDate) {
            res.setHeader('Sunset', new Date(sunsetDate).toUTCString());
        }
        next();
    };
};
exports.deprecatedRoute = deprecatedRoute;
exports.default = exports.deprecatedRoute;

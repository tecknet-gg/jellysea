"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOwnProfileOrAdmin = exports.isOwnProfile = void 0;
const permissions_1 = require("../lib/permissions");
const isOwnProfile = () => {
    return (req, res, next) => {
        if (req.user?.id !== Number(req.params.id)) {
            return next({
                status: 403,
                message: "You do not have permission to view this user's settings.",
            });
        }
        next();
    };
};
exports.isOwnProfile = isOwnProfile;
const isOwnProfileOrAdmin = () => {
    const authMiddleware = (req, res, next) => {
        if (!req.user?.hasPermission(permissions_1.Permission.MANAGE_USERS) &&
            req.user?.id !== Number(req.params.id)) {
            return next({
                status: 403,
                message: "You do not have permission to view this user's settings.",
            });
        }
        next();
    };
    return authMiddleware;
};
exports.isOwnProfileOrAdmin = isOwnProfileOrAdmin;

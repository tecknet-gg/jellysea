"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = exports.checkUser = void 0;
const datasource_1 = require("../datasource");
const User_1 = require("../entity/User");
const settings_1 = require("../lib/settings");
const checkUser = async (req, _res, next) => {
    const settings = (0, settings_1.getSettings)();
    let user;
    if (req.header('X-API-Key') === settings.main.apiKey) {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        let userId = 1; // Work on original administrator account
        // If a User ID is provided, we will act on that user's behalf
        if (req.header('X-API-User')) {
            userId = Number(req.header('X-API-User'));
        }
        user = await userRepository.findOne({ where: { id: userId } });
    }
    else if (req.session?.userId) {
        const userRepository = (0, datasource_1.getRepository)(User_1.User);
        user = await userRepository.findOne({
            where: { id: req.session.userId },
        });
    }
    if (user) {
        req.user = user;
    }
    req.locale = user?.settings?.locale
        ? user.settings.locale
        : settings.main.locale;
    next();
};
exports.checkUser = checkUser;
const isAuthenticated = (permissions, options) => {
    const authMiddleware = (req, res, next) => {
        if (!req.user || !req.user.hasPermission(permissions ?? 0, options)) {
            res.status(403).json({
                status: 403,
                error: 'You do not have permission to access this endpoint',
            });
        }
        else {
            next();
        }
    };
    return authMiddleware;
};
exports.isAuthenticated = isAuthenticated;

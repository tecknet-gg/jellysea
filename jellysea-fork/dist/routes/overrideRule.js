"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const datasource_1 = require("../datasource");
const OverrideRule_1 = __importDefault(require("../entity/OverrideRule"));
const permissions_1 = require("../lib/permissions");
const auth_1 = require("../middleware/auth");
const express_1 = require("express");
const overrideRuleRoutes = (0, express_1.Router)();
overrideRuleRoutes.get('/', (0, auth_1.isAuthenticated)(permissions_1.Permission.ADMIN), async (req, res, next) => {
    const overrideRuleRepository = (0, datasource_1.getRepository)(OverrideRule_1.default);
    try {
        const rules = await overrideRuleRepository.find({});
        return res.status(200).json(rules);
    }
    catch (e) {
        next({ status: 404, message: e.message });
    }
});
overrideRuleRoutes.post('/', (0, auth_1.isAuthenticated)(permissions_1.Permission.ADMIN), async (req, res, next) => {
    const overrideRuleRepository = (0, datasource_1.getRepository)(OverrideRule_1.default);
    try {
        const rule = new OverrideRule_1.default({
            users: req.body.users,
            genre: req.body.genre,
            language: req.body.language,
            keywords: req.body.keywords,
            profileId: req.body.profileId,
            rootFolder: req.body.rootFolder,
            tags: req.body.tags,
            radarrServiceId: req.body.radarrServiceId,
            sonarrServiceId: req.body.sonarrServiceId,
        });
        const newRule = await overrideRuleRepository.save(rule);
        return res.status(200).json(newRule);
    }
    catch (e) {
        next({ status: 404, message: e.message });
    }
});
overrideRuleRoutes.put('/:ruleId', (0, auth_1.isAuthenticated)(permissions_1.Permission.ADMIN), async (req, res, next) => {
    const overrideRuleRepository = (0, datasource_1.getRepository)(OverrideRule_1.default);
    try {
        const rule = await overrideRuleRepository.findOne({
            where: {
                id: Number(req.params.ruleId),
            },
        });
        if (!rule) {
            return next({ status: 404, message: 'Override Rule not found.' });
        }
        rule.users = req.body.users;
        rule.genre = req.body.genre;
        rule.language = req.body.language;
        rule.keywords = req.body.keywords;
        rule.profileId = req.body.profileId;
        rule.rootFolder = req.body.rootFolder;
        rule.tags = req.body.tags;
        rule.radarrServiceId = req.body.radarrServiceId;
        rule.sonarrServiceId = req.body.sonarrServiceId;
        const newRule = await overrideRuleRepository.save(rule);
        return res.status(200).json(newRule);
    }
    catch (e) {
        next({ status: 404, message: e.message });
    }
});
overrideRuleRoutes.delete('/:ruleId', (0, auth_1.isAuthenticated)(permissions_1.Permission.ADMIN), async (req, res, next) => {
    const overrideRuleRepository = (0, datasource_1.getRepository)(OverrideRule_1.default);
    try {
        const rule = await overrideRuleRepository.findOne({
            where: {
                id: Number(req.params.ruleId),
            },
        });
        if (!rule) {
            return next({ status: 404, message: 'Override Rule not found.' });
        }
        await overrideRuleRepository.remove(rule);
        return res.status(200).json(rule);
    }
    catch (e) {
        next({ status: 404, message: e.message });
    }
});
exports.default = overrideRuleRoutes;

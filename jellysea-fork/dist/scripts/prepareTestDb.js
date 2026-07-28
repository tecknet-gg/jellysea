"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const seedTestDb_1 = require("../utils/seedTestDb");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const prepareDb = async () => {
    // Copy over test settings.json
    (0, fs_1.copyFileSync)(path_1.default.join(__dirname, '../../cypress/config/settings.cypress.json'), path_1.default.join(__dirname, '../../config/settings.json'));
    await (0, seedTestDb_1.seedTestDb)({
        preserveDb: process.env.PRESERVE_DB === 'true',
        withMigrations: process.env.WITH_MIGRATIONS === 'true',
    });
};
prepareDb();

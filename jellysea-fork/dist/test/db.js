"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTestDb = void 0;
const seedTestDb_1 = require("../utils/seedTestDb");
const node_test_1 = require("node:test");
function setupTestDb() {
    (0, node_test_1.before)(async () => {
        await (0, seedTestDb_1.seedTestDb)();
    });
    (0, node_test_1.beforeEach)(async () => {
        await (0, seedTestDb_1.resetTestDb)();
    });
}
exports.setupTestDb = setupTestDb;

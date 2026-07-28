"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddOverrideRules1734805733535 = void 0;
class AddOverrideRules1734805733535 {
    constructor() {
        this.name = 'AddOverrideRules1734805733535';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "override_rule" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "radarrServiceId" integer, "sonarrServiceId" integer, "users" varchar, "genre" varchar, "language" varchar, "keywords" varchar, "profileId" integer, "rootFolder" varchar, "tags" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "override_rule"`);
    }
}
exports.AddOverrideRules1734805733535 = AddOverrideRules1734805733535;

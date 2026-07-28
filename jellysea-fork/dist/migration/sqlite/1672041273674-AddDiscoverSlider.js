"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddDiscoverSlider1672041273674 = void 0;
class AddDiscoverSlider1672041273674 {
    constructor() {
        this.name = 'AddDiscoverSlider1672041273674';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "discover_slider" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "type" integer NOT NULL, "order" integer NOT NULL, "isBuiltIn" boolean NOT NULL DEFAULT (0), "enabled" boolean NOT NULL DEFAULT (1), "title" varchar, "data" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "discover_slider"`);
    }
}
exports.AddDiscoverSlider1672041273674 = AddDiscoverSlider1672041273674;

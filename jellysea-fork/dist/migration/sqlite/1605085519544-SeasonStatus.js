"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeasonStatus1605085519544 = void 0;
class SeasonStatus1605085519544 {
    constructor() {
        this.name = 'SeasonStatus1605085519544';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "season" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "seasonNumber" integer NOT NULL, "status" integer NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "mediaId" integer)`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "season"`);
    }
}
exports.SeasonStatus1605085519544 = SeasonStatus1605085519544;

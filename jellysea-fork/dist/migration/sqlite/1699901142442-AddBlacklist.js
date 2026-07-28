"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddBlacklist1699901142442 = void 0;
class AddBlacklist1699901142442 {
    constructor() {
        this.name = 'AddBlacklist1699901142442';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "blacklist" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "mediaType" varchar NOT NULL, "title" varchar, "tmdbId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')),"userId" integer, "mediaId" integer,CONSTRAINT "UQ_6bbafa28411e6046421991ea21c" UNIQUE ("tmdbId", "userId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6bbafa28411e6046421991ea21" ON "blacklist" ("tmdbId") `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "blacklist"`);
        await queryRunner.query(`DROP INDEX "IDX_6bbafa28411e6046421991ea21"`);
    }
}
exports.AddBlacklist1699901142442 = AddBlacklist1699901142442;

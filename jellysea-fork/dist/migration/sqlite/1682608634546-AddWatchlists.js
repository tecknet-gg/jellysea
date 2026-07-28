"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddWatchlists1682608634546 = void 0;
class AddWatchlists1682608634546 {
    constructor() {
        this.name = 'AddWatchlists1682608634546';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "watchlist" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "ratingKey" varchar NOT NULL, "mediaType" varchar NOT NULL, "title" varchar NOT NULL, "tmdbId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "requestedById" integer, "mediaId" integer, CONSTRAINT "UNIQUE_USER_DB" UNIQUE ("tmdbId", "requestedById"))`);
        await queryRunner.query(`CREATE INDEX "IDX_939f205946256cc0d2a1ac51a8" ON "watchlist" ("tmdbId") `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_939f205946256cc0d2a1ac51a8"`);
        await queryRunner.query(`DROP TABLE "watchlist"`);
    }
}
exports.AddWatchlists1682608634546 = AddWatchlists1682608634546;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUserPushoverSound1697393491630 = void 0;
class AddUserPushoverSound1697393491630 {
    constructor() {
        this.name = 'AddUserPushoverSound1697393491630';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "temporary_user_settings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "notificationTypes" text, "discordId" varchar, "userId" integer, "region" varchar, "originalLanguage" varchar, "telegramChatId" varchar, "telegramSendSilently" boolean, "pgpKey" varchar, "locale" varchar NOT NULL DEFAULT (''), "pushbulletAccessToken" varchar, "pushoverApplicationToken" varchar, "pushoverUserKey" varchar, "watchlistSyncMovies" boolean, "watchlistSyncTv" boolean, "pushoverSound" varchar, CONSTRAINT "UQ_986a2b6d3c05eb4091bb8066f78" UNIQUE ("userId"), CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_user_settings"("id", "notificationTypes", "discordId", "userId", "region", "originalLanguage", "telegramChatId", "telegramSendSilently", "pgpKey", "locale", "pushbulletAccessToken", "pushoverApplicationToken", "pushoverUserKey", "watchlistSyncMovies", "watchlistSyncTv") SELECT "id", "notificationTypes", "discordId", "userId", "region", "originalLanguage", "telegramChatId", "telegramSendSilently", "pgpKey", "locale", "pushbulletAccessToken", "pushoverApplicationToken", "pushoverUserKey", "watchlistSyncMovies", "watchlistSyncTv" FROM "user_settings"`);
        await queryRunner.query(`DROP TABLE "user_settings"`);
        await queryRunner.query(`ALTER TABLE "temporary_user_settings" RENAME TO "user_settings"`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_settings" RENAME TO "temporary_user_settings"`);
        await queryRunner.query(`CREATE TABLE "user_settings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "notificationTypes" text, "discordId" varchar, "userId" integer, "region" varchar, "originalLanguage" varchar, "telegramChatId" varchar, "telegramSendSilently" boolean, "pgpKey" varchar, "locale" varchar NOT NULL DEFAULT (''), "pushbulletAccessToken" varchar, "pushoverApplicationToken" varchar, "pushoverUserKey" varchar, "watchlistSyncMovies" boolean, "watchlistSyncTv" boolean, CONSTRAINT "UQ_986a2b6d3c05eb4091bb8066f78" UNIQUE ("userId"), CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "user_settings"("id", "notificationTypes", "discordId", "userId", "region", "originalLanguage", "telegramChatId", "telegramSendSilently", "pgpKey", "locale", "pushbulletAccessToken", "pushoverApplicationToken", "pushoverUserKey", "watchlistSyncMovies", "watchlistSyncTv") SELECT "id", "notificationTypes", "discordId", "userId", "region", "originalLanguage", "telegramChatId", "telegramSendSilently", "pgpKey", "locale", "pushbulletAccessToken", "pushoverApplicationToken", "pushoverUserKey", "watchlistSyncMovies", "watchlistSyncTv" FROM "temporary_user_settings"`);
        await queryRunner.query(`DROP TABLE "temporary_user_settings"`);
    }
}
exports.AddUserPushoverSound1697393491630 = AddUserPushoverSound1697393491630;

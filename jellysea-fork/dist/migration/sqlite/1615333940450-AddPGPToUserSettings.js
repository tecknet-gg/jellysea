"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPGPToUserSettings1615333940450 = void 0;
class AddPGPToUserSettings1615333940450 {
    constructor() {
        this.name = 'AddPGPToUserSettings1615333940450';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "temporary_user_settings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "enableNotifications" boolean NOT NULL DEFAULT (1), "discordId" varchar, "userId" integer, "region" varchar, "originalLanguage" varchar, "telegramChatId" varchar, "telegramSendSilently" boolean, "pgpKey" varchar, CONSTRAINT "UQ_986a2b6d3c05eb4091bb8066f78" UNIQUE ("userId"), CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_user_settings"("id", "enableNotifications", "discordId", "userId", "region", "originalLanguage", "telegramChatId", "telegramSendSilently") SELECT "id", "enableNotifications", "discordId", "userId", "region", "originalLanguage", "telegramChatId", "telegramSendSilently" FROM "user_settings"`);
        await queryRunner.query(`DROP TABLE "user_settings"`);
        await queryRunner.query(`ALTER TABLE "temporary_user_settings" RENAME TO "user_settings"`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_settings" RENAME TO "temporary_user_settings"`);
        await queryRunner.query(`CREATE TABLE "user_settings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "enableNotifications" boolean NOT NULL DEFAULT (1), "discordId" varchar, "userId" integer, "region" varchar, "originalLanguage" varchar, "telegramChatId" varchar, "telegramSendSilently" boolean, CONSTRAINT "UQ_986a2b6d3c05eb4091bb8066f78" UNIQUE ("userId"), CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "user_settings"("id", "enableNotifications", "discordId", "userId", "region", "originalLanguage", "telegramChatId", "telegramSendSilently") SELECT "id", "enableNotifications", "discordId", "userId", "region", "originalLanguage", "telegramChatId", "telegramSendSilently" FROM "temporary_user_settings"`);
        await queryRunner.query(`DROP TABLE "temporary_user_settings"`);
    }
}
exports.AddPGPToUserSettings1615333940450 = AddPGPToUserSettings1615333940450;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUserSettingsLocale1619239659754 = void 0;
class AddUserSettingsLocale1619239659754 {
    constructor() {
        this.name = 'AddUserSettingsLocale1619239659754';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "temporary_user_settings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "notificationAgents" integer NOT NULL DEFAULT (2), "discordId" varchar, "userId" integer, "region" varchar, "originalLanguage" varchar, "telegramChatId" varchar, "telegramSendSilently" boolean, "pgpKey" varchar, "locale" varchar NOT NULL DEFAULT (''), CONSTRAINT "UQ_986a2b6d3c05eb4091bb8066f78" UNIQUE ("userId"), CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_user_settings"("id", "notificationAgents", "discordId", "userId", "region", "originalLanguage", "telegramChatId", "telegramSendSilently", "pgpKey") SELECT "id", "notificationAgents", "discordId", "userId", "region", "originalLanguage", "telegramChatId", "telegramSendSilently", "pgpKey" FROM "user_settings"`);
        await queryRunner.query(`DROP TABLE "user_settings"`);
        await queryRunner.query(`ALTER TABLE "temporary_user_settings" RENAME TO "user_settings"`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_settings" RENAME TO "temporary_user_settings"`);
        await queryRunner.query(`CREATE TABLE "user_settings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "notificationAgents" integer NOT NULL DEFAULT (2), "discordId" varchar, "userId" integer, "region" varchar, "originalLanguage" varchar, "telegramChatId" varchar, "telegramSendSilently" boolean, "pgpKey" varchar, CONSTRAINT "UQ_986a2b6d3c05eb4091bb8066f78" UNIQUE ("userId"), CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "user_settings"("id", "notificationAgents", "discordId", "userId", "region", "originalLanguage", "telegramChatId", "telegramSendSilently", "pgpKey") SELECT "id", "notificationAgents", "discordId", "userId", "region", "originalLanguage", "telegramChatId", "telegramSendSilently", "pgpKey" FROM "temporary_user_settings"`);
        await queryRunner.query(`DROP TABLE "temporary_user_settings"`);
    }
}
exports.AddUserSettingsLocale1619239659754 = AddUserSettingsLocale1619239659754;

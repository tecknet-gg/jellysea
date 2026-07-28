"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserSettings1613615266968 = void 0;
class CreateUserSettings1613615266968 {
    constructor() {
        this.name = 'CreateUserSettings1613615266968';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "user_settings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "enableNotifications" boolean NOT NULL DEFAULT (1), "discordId" varchar, "userId" integer, CONSTRAINT "REL_986a2b6d3c05eb4091bb8066f7" UNIQUE ("userId"))`);
        await queryRunner.query(`CREATE TABLE "temporary_user_settings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "enableNotifications" boolean NOT NULL DEFAULT (1), "discordId" varchar, "userId" integer, CONSTRAINT "REL_986a2b6d3c05eb4091bb8066f7" UNIQUE ("userId"), CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_user_settings"("id", "enableNotifications", "discordId", "userId") SELECT "id", "enableNotifications", "discordId", "userId" FROM "user_settings"`);
        await queryRunner.query(`DROP TABLE "user_settings"`);
        await queryRunner.query(`ALTER TABLE "temporary_user_settings" RENAME TO "user_settings"`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_settings" RENAME TO "temporary_user_settings"`);
        await queryRunner.query(`CREATE TABLE "user_settings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "enableNotifications" boolean NOT NULL DEFAULT (1), "discordId" varchar, "userId" integer, CONSTRAINT "REL_986a2b6d3c05eb4091bb8066f7" UNIQUE ("userId"))`);
        await queryRunner.query(`INSERT INTO "user_settings"("id", "enableNotifications", "discordId", "userId") SELECT "id", "enableNotifications", "discordId", "userId" FROM "temporary_user_settings"`);
        await queryRunner.query(`DROP TABLE "temporary_user_settings"`);
        await queryRunner.query(`DROP TABLE "user_settings"`);
    }
}
exports.CreateUserSettings1613615266968 = CreateUserSettings1613615266968;

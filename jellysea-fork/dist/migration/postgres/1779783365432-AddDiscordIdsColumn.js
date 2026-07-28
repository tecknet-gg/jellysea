"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddDiscordIdsColumn1779783365432 = void 0;
class AddDiscordIdsColumn1779783365432 {
    constructor() {
        this.name = 'AddDiscordIdsColumn1779783365432';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_settings" ADD "discordIds" text`);
        // same for postgres (convert existing single ID into list with one entry)
        await queryRunner.query(`UPDATE "user_settings" SET "discordIds" = '["' || "discordId" || '"]' WHERE "discordId" IS NOT NULL AND "discordId" != ''`);
        await queryRunner.query(`ALTER TABLE "user_settings" DROP COLUMN "discordId"`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_settings" ADD "discordId" character varying`);
        await queryRunner.query(`UPDATE "user_settings" SET "discordId" = ("discordIds"::jsonb ->> 0) WHERE "discordIds" IS NOT NULL AND "discordIds" != ''`);
        await queryRunner.query(`ALTER TABLE "user_settings" DROP COLUMN "discordIds"`);
    }
}
exports.AddDiscordIdsColumn1779783365432 = AddDiscordIdsColumn1779783365432;

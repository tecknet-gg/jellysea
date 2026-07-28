"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTelegramMessageThreadId1734786596045 = void 0;
class AddTelegramMessageThreadId1734786596045 {
    constructor() {
        this.name = 'AddTelegramMessageThreadId1734786596045';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_settings" ADD "telegramMessageThreadId" character varying`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_settings" DROP COLUMN "telegramMessageThreadId"`);
    }
}
exports.AddTelegramMessageThreadId1734786596045 = AddTelegramMessageThreadId1734786596045;

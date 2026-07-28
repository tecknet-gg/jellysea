"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddIgnoreQuotaToMediaRequest1781732098511 = void 0;
class AddIgnoreQuotaToMediaRequest1781732098511 {
    constructor() {
        this.name = 'AddIgnoreQuotaToMediaRequest1781732098511';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "media_request" ADD "ignoreQuota" boolean NOT NULL DEFAULT false`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "media_request" DROP COLUMN "ignoreQuota"`);
    }
}
exports.AddIgnoreQuotaToMediaRequest1781732098511 = AddIgnoreQuotaToMediaRequest1781732098511;

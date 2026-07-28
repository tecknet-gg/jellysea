"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryLinkExpirationDateTime1771337333450 = void 0;
class RecoveryLinkExpirationDateTime1771337333450 {
    constructor() {
        this.name = 'RecoveryLinkExpirationDateTime1771337333450';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "recoveryLinkExpirationDate" TYPE TIMESTAMP WITH TIME ZONE`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "recoveryLinkExpirationDate" TYPE date USING ("recoveryLinkExpirationDate"::date)`);
    }
}
exports.RecoveryLinkExpirationDateTime1771337333450 = RecoveryLinkExpirationDateTime1771337333450;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpgradeConnectTypeORM1777045867383 = void 0;
class UpgradeConnectTypeORM1777045867383 {
    constructor() {
        this.name = 'UpgradeConnectTypeORM1777045867383';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "session" ADD "destroyedAt" TIMESTAMP`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "destroyedAt"`);
    }
}
exports.UpgradeConnectTypeORM1777045867383 = UpgradeConnectTypeORM1777045867383;

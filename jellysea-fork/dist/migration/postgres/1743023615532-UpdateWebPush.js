"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateWebPush1743023615532 = void 0;
class UpdateWebPush1743023615532 {
    constructor() {
        this.name = 'UpdateWebPush1743023615532';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_push_subscription" ADD "userAgent" character varying`);
        await queryRunner.query(`ALTER TABLE "user_push_subscription" ADD "createdAt" TIMESTAMP DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user_push_subscription" DROP CONSTRAINT "UQ_f90ab5a4ed54905a4bb51a7148b"`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_push_subscription" ADD CONSTRAINT "UQ_f90ab5a4ed54905a4bb51a7148b" UNIQUE ("auth")`);
        await queryRunner.query(`ALTER TABLE "user_push_subscription" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "user_push_subscription" DROP COLUMN "userAgent"`);
    }
}
exports.UpdateWebPush1743023615532 = UpdateWebPush1743023615532;

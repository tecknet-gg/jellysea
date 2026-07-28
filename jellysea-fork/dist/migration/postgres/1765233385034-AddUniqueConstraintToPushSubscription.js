"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUniqueConstraintToPushSubscription1765233385034 = void 0;
class AddUniqueConstraintToPushSubscription1765233385034 {
    constructor() {
        this.name = 'AddUniqueConstraintToPushSubscription1765233385034';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      DELETE FROM "user_push_subscription"
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM "user_push_subscription"
        GROUP BY "endpoint", "userId"
      )
    `);
        await queryRunner.query(`ALTER TABLE "user_push_subscription" ADD CONSTRAINT "UQ_6427d07d9a171a3a1ab87480005" UNIQUE ("endpoint", "userId")`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_push_subscription" DROP CONSTRAINT "UQ_6427d07d9a171a3a1ab87480005"`);
    }
}
exports.AddUniqueConstraintToPushSubscription1765233385034 = AddUniqueConstraintToPushSubscription1765233385034;

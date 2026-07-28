"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateWebPush1745492376568 = void 0;
class UpdateWebPush1745492376568 {
    constructor() {
        this.name = 'UpdateWebPush1745492376568';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "blacklist" RENAME COLUMN "blacklistedtags" TO "blacklistedTags"`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "blacklist" RENAME COLUMN "blacklistedTags" TO "blacklistedtags"`);
    }
}
exports.UpdateWebPush1745492376568 = UpdateWebPush1745492376568;

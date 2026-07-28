"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenameBlacklistToBlocklist1771080196816 = void 0;
class RenameBlacklistToBlocklist1771080196816 {
    constructor() {
        this.name = 'RenameBlacklistToBlocklist1771080196816';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "blacklist" RENAME TO "blocklist"`);
        await queryRunner.query(`ALTER TABLE "blocklist" RENAME COLUMN "blacklistedTags" TO "blocklistedTags"`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "blocklist" RENAME COLUMN "blocklistedTags" TO "blacklistedTags"`);
        await queryRunner.query(`ALTER TABLE "blocklist" RENAME TO "blacklist"`);
    }
}
exports.RenameBlacklistToBlocklist1771080196816 = RenameBlacklistToBlocklist1771080196816;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddBlacklistTagsColumn1737320080282 = void 0;
class AddBlacklistTagsColumn1737320080282 {
    constructor() {
        this.name = 'AddBlacklistTagsColumn1737320080282';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "blacklist" ADD blacklistedTags character varying`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "blacklist" DROP COLUMN blacklistedTags`);
    }
}
exports.AddBlacklistTagsColumn1737320080282 = AddBlacklistTagsColumn1737320080282;

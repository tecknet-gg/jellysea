"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixBlocklistIdDefault1772000000000 = void 0;
class FixBlocklistIdDefault1772000000000 {
    constructor() {
        this.name = 'FixBlocklistIdDefault1772000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "blocklist" ALTER COLUMN "id" SET DEFAULT nextval('public."blocklist_id_seq"'::regclass)`);
        await queryRunner.query(`SELECT setval('public."blocklist_id_seq"', COALESCE((SELECT MAX("id") FROM "blocklist"), 0) + 1, false)`);
    }
    async down() {
        // Intentionally left empty: dropping the DEFAULT on blocklist.id would
        // reintroduce the original bug and break blocklist inserts.
    }
}
exports.FixBlocklistIdDefault1772000000000 = FixBlocklistIdDefault1772000000000;

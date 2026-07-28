"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUserAvatarCacheFields1743107707465 = void 0;
class AddUserAvatarCacheFields1743107707465 {
    constructor() {
        this.name = 'AddUserAvatarCacheFields1743107707465';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user" ADD "avatarETag" character varying`);
        await queryRunner.query(`ALTER TABLE "user" ADD "avatarVersion" character varying`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "avatarVersion"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "avatarETag"`);
    }
}
exports.AddUserAvatarCacheFields1743107707465 = AddUserAvatarCacheFields1743107707465;

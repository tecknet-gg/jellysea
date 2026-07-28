"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddOverrideRules1734805738349 = void 0;
class AddOverrideRules1734805738349 {
    constructor() {
        this.name = 'AddOverrideRules1734805738349';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "override_rule" ("id" SERIAL NOT NULL, "radarrServiceId" integer, "sonarrServiceId" integer, "users" character varying, "genre" character varying, "language" character varying, "keywords" character varying, "profileId" integer, "rootFolder" character varying, "tags" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_657f810c7b20a4fce45aee8f182" PRIMARY KEY ("id"))`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "override_rule"`);
    }
}
exports.AddOverrideRules1734805738349 = AddOverrideRules1734805738349;

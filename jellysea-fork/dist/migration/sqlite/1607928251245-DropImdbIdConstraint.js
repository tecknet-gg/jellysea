"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DropImdbIdConstraint1607928251245 = void 0;
const typeorm_1 = require("typeorm");
class DropImdbIdConstraint1607928251245 {
    async up(queryRunner) {
        await queryRunner.dropUniqueConstraint('media', 'UQ_7ff2d11f6a83cb52386eaebe74b');
    }
    async down(queryRunner) {
        await queryRunner.createUniqueConstraint('media', new typeorm_1.TableUnique({
            name: 'UQ_7ff2d11f6a83cb52386eaebe74b',
            columnNames: ['imdbId'],
        }));
    }
}
exports.DropImdbIdConstraint1607928251245 = DropImdbIdConstraint1607928251245;

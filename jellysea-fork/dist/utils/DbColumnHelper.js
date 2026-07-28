"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbAwareColumn = exports.resolveDbType = void 0;
const datasource_1 = require("../datasource");
const typeorm_1 = require("typeorm");
const pgTypeMapping = {
    datetime: 'timestamp with time zone',
};
function resolveDbType(pgType) {
    if (datasource_1.isPgsql && pgType.toString() in pgTypeMapping) {
        return pgTypeMapping[pgType.toString()];
    }
    return pgType;
}
exports.resolveDbType = resolveDbType;
function DbAwareColumn(columnOptions) {
    if (columnOptions.type) {
        columnOptions.type = resolveDbType(columnOptions.type);
    }
    return (0, typeorm_1.Column)(columnOptions);
}
exports.DbAwareColumn = DbAwareColumn;

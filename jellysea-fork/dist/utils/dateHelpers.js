"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfterDate = void 0;
const typeorm_1 = require("typeorm");
const AfterDate = (date) => {
    const endDate = new Date(date.getTime());
    endDate.setFullYear(endDate.getFullYear() + 100);
    return (0, typeorm_1.Between)(date, endDate);
};
exports.AfterDate = AfterDate;

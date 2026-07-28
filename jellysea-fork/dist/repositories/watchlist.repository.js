"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const datasource_1 = require("../datasource");
const Watchlist_1 = require("../entity/Watchlist");
exports.UserRepository = (0, datasource_1.getRepository)(Watchlist_1.Watchlist).extend({
// findByName(firstName: string, lastName: string) {
//   return this.createQueryBuilder("user")
//     .where("user.firstName = :firstName", { firstName })
//     .andWhere("user.lastName = :lastName", { lastName })
//     .getMany()
// },
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaStatus = exports.MediaType = exports.MediaRequestStatus = void 0;
var MediaRequestStatus;
(function (MediaRequestStatus) {
    MediaRequestStatus[MediaRequestStatus["PENDING"] = 1] = "PENDING";
    MediaRequestStatus[MediaRequestStatus["APPROVED"] = 2] = "APPROVED";
    MediaRequestStatus[MediaRequestStatus["DECLINED"] = 3] = "DECLINED";
    MediaRequestStatus[MediaRequestStatus["FAILED"] = 4] = "FAILED";
    MediaRequestStatus[MediaRequestStatus["COMPLETED"] = 5] = "COMPLETED";
})(MediaRequestStatus || (exports.MediaRequestStatus = MediaRequestStatus = {}));
var MediaType;
(function (MediaType) {
    MediaType["MOVIE"] = "movie";
    MediaType["TV"] = "tv";
})(MediaType || (exports.MediaType = MediaType = {}));
var MediaStatus;
(function (MediaStatus) {
    MediaStatus[MediaStatus["UNKNOWN"] = 1] = "UNKNOWN";
    MediaStatus[MediaStatus["PENDING"] = 2] = "PENDING";
    MediaStatus[MediaStatus["PROCESSING"] = 3] = "PROCESSING";
    MediaStatus[MediaStatus["PARTIALLY_AVAILABLE"] = 4] = "PARTIALLY_AVAILABLE";
    MediaStatus[MediaStatus["AVAILABLE"] = 5] = "AVAILABLE";
    MediaStatus[MediaStatus["BLOCKLISTED"] = 6] = "BLOCKLISTED";
    MediaStatus[MediaStatus["DELETED"] = 7] = "DELETED";
})(MediaStatus || (exports.MediaStatus = MediaStatus = {}));

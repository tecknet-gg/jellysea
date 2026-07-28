"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiErrorCode = void 0;
var ApiErrorCode;
(function (ApiErrorCode) {
    ApiErrorCode["InvalidUrl"] = "INVALID_URL";
    ApiErrorCode["InvalidCredentials"] = "INVALID_CREDENTIALS";
    ApiErrorCode["InvalidAuthToken"] = "INVALID_AUTH_TOKEN";
    ApiErrorCode["InvalidEmail"] = "INVALID_EMAIL";
    ApiErrorCode["NotAdmin"] = "NOT_ADMIN";
    ApiErrorCode["NoAdminUser"] = "NO_ADMIN_USER";
    ApiErrorCode["SyncErrorGroupedFolders"] = "SYNC_ERROR_GROUPED_FOLDERS";
    ApiErrorCode["SyncErrorNoLibraries"] = "SYNC_ERROR_NO_LIBRARIES";
    ApiErrorCode["Unauthorized"] = "UNAUTHORIZED";
    ApiErrorCode["Unknown"] = "UNKNOWN";
})(ApiErrorCode || (exports.ApiErrorCode = ApiErrorCode = {}));

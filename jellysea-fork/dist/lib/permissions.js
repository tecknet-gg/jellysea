"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = exports.Permission = void 0;
var Permission;
(function (Permission) {
    Permission[Permission["NONE"] = 0] = "NONE";
    Permission[Permission["ADMIN"] = 2] = "ADMIN";
    Permission[Permission["MANAGE_SETTINGS"] = 4] = "MANAGE_SETTINGS";
    Permission[Permission["MANAGE_USERS"] = 8] = "MANAGE_USERS";
    Permission[Permission["MANAGE_REQUESTS"] = 16] = "MANAGE_REQUESTS";
    Permission[Permission["REQUEST"] = 32] = "REQUEST";
    Permission[Permission["VOTE"] = 64] = "VOTE";
    Permission[Permission["AUTO_APPROVE"] = 128] = "AUTO_APPROVE";
    Permission[Permission["AUTO_APPROVE_MOVIE"] = 256] = "AUTO_APPROVE_MOVIE";
    Permission[Permission["AUTO_APPROVE_TV"] = 512] = "AUTO_APPROVE_TV";
    Permission[Permission["REQUEST_4K"] = 1024] = "REQUEST_4K";
    Permission[Permission["REQUEST_4K_MOVIE"] = 2048] = "REQUEST_4K_MOVIE";
    Permission[Permission["REQUEST_4K_TV"] = 4096] = "REQUEST_4K_TV";
    Permission[Permission["REQUEST_ADVANCED"] = 8192] = "REQUEST_ADVANCED";
    Permission[Permission["REQUEST_VIEW"] = 16384] = "REQUEST_VIEW";
    Permission[Permission["AUTO_APPROVE_4K"] = 32768] = "AUTO_APPROVE_4K";
    Permission[Permission["AUTO_APPROVE_4K_MOVIE"] = 65536] = "AUTO_APPROVE_4K_MOVIE";
    Permission[Permission["AUTO_APPROVE_4K_TV"] = 131072] = "AUTO_APPROVE_4K_TV";
    Permission[Permission["REQUEST_MOVIE"] = 262144] = "REQUEST_MOVIE";
    Permission[Permission["REQUEST_TV"] = 524288] = "REQUEST_TV";
    Permission[Permission["MANAGE_ISSUES"] = 1048576] = "MANAGE_ISSUES";
    Permission[Permission["VIEW_ISSUES"] = 2097152] = "VIEW_ISSUES";
    Permission[Permission["CREATE_ISSUES"] = 4194304] = "CREATE_ISSUES";
    Permission[Permission["AUTO_REQUEST"] = 8388608] = "AUTO_REQUEST";
    Permission[Permission["AUTO_REQUEST_MOVIE"] = 16777216] = "AUTO_REQUEST_MOVIE";
    Permission[Permission["AUTO_REQUEST_TV"] = 33554432] = "AUTO_REQUEST_TV";
    Permission[Permission["RECENT_VIEW"] = 67108864] = "RECENT_VIEW";
    Permission[Permission["WATCHLIST_VIEW"] = 134217728] = "WATCHLIST_VIEW";
    Permission[Permission["MANAGE_BLOCKLIST"] = 268435456] = "MANAGE_BLOCKLIST";
    Permission[Permission["VIEW_BLOCKLIST"] = 1073741824] = "VIEW_BLOCKLIST";
})(Permission || (exports.Permission = Permission = {}));
/**
 * Takes a Permission and the users permission value and determines
 * if the user has access to the permission provided. If the user has
 * the admin permission, true will always be returned from this check!
 *
 * @param permissions Single permission or array of permissions
 * @param value users current permission value
 * @param options Extra options to control permission check behavior (mainly for arrays)
 */
const hasPermission = (permissions, value, options = { type: 'and' }) => {
    let total = 0;
    // If we are not checking any permissions, bail out and return true
    if (permissions === 0) {
        return true;
    }
    if (Array.isArray(permissions)) {
        if (value & Permission.ADMIN) {
            return true;
        }
        switch (options.type) {
            case 'and':
                return permissions.every((permission) => !!(value & permission));
            case 'or':
                return permissions.some((permission) => !!(value & permission));
        }
    }
    else {
        total = permissions;
    }
    return !!(value & Permission.ADMIN) || !!(value & total);
};
exports.hasPermission = hasPermission;

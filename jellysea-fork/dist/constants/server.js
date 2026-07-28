"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerType = exports.MediaServerType = void 0;
var MediaServerType;
(function (MediaServerType) {
    MediaServerType[MediaServerType["PLEX"] = 1] = "PLEX";
    MediaServerType[MediaServerType["JELLYFIN"] = 2] = "JELLYFIN";
    MediaServerType[MediaServerType["EMBY"] = 3] = "EMBY";
    MediaServerType[MediaServerType["NOT_CONFIGURED"] = 4] = "NOT_CONFIGURED";
})(MediaServerType || (exports.MediaServerType = MediaServerType = {}));
var ServerType;
(function (ServerType) {
    ServerType["JELLYFIN"] = "Jellyfin";
    ServerType["EMBY"] = "Emby";
})(ServerType || (exports.ServerType = ServerType = {}));

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeJellyfinGuid = void 0;
function normalizeJellyfinGuid(value) {
    if (!value) {
        return null;
    }
    const normalized = value.replace(/-/g, '').toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(normalized)) {
        return null;
    }
    return normalized;
}
exports.normalizeJellyfinGuid = normalizeJellyfinGuid;

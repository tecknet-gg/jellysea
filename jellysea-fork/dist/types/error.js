"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    constructor(statusCode, errorCode) {
        super();
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.name = 'apiError';
    }
}
exports.ApiError = ApiError;

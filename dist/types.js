"use strict";
/**
 * Purpose: Core TypeScript types and interfaces for Hazo Connect
 *
 * This file defines all types used throughout the hazo_connect component.
 * Zero dependencies - only TypeScript types.
 *
 * Note: ConfigProvider is imported from hazo_config npm package.
 * Components can work with either direct config or ConfigProvider.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = exports.noOpLogger = void 0;
/**
 * No-op logger implementation (default when no logger provided)
 */
exports.noOpLogger = {
    debug: () => { },
    info: () => { },
    warn: () => { },
    error: () => { }
};
/**
 * Error codes
 */
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["CONFIG_ERROR"] = "HAZO_CONNECT_CONFIG_ERROR";
    ErrorCode["CONNECTION_FAILED"] = "HAZO_CONNECT_CONNECTION_FAILED";
    ErrorCode["QUERY_ERROR"] = "HAZO_CONNECT_QUERY_ERROR";
    ErrorCode["NOT_IMPLEMENTED"] = "HAZO_CONNECT_NOT_IMPLEMENTED";
    ErrorCode["VALIDATION_ERROR"] = "HAZO_CONNECT_VALIDATION_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
//# sourceMappingURL=types.js.map
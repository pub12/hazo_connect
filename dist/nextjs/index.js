"use strict";
/**
 * Purpose: Main export file for Next.js-specific Hazo Connect helpers
 *
 * This file exports Next.js API route helpers and server-only utilities.
 */
'use server';
/**
 * Purpose: Main export file for Next.js-specific Hazo Connect helpers
 *
 * This file exports Next.js API route helpers and server-only utilities.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetHazoConnectSingleton = exports.getHazoConnectSingleton = exports.createHazoConnectFromEnv = exports.getServerHazoConnect = exports.createApiRouteHandler = void 0;
// Re-export API route helpers
var api_route_helpers_1 = require("./api-route-helpers");
Object.defineProperty(exports, "createApiRouteHandler", { enumerable: true, get: function () { return api_route_helpers_1.createApiRouteHandler; } });
Object.defineProperty(exports, "getServerHazoConnect", { enumerable: true, get: function () { return api_route_helpers_1.getServerHazoConnect; } });
// Re-export server-only functionality
__exportStar(require("./server-only"), exports);
// Re-export setup helpers
var setup_helpers_1 = require("./setup-helpers");
Object.defineProperty(exports, "createHazoConnectFromEnv", { enumerable: true, get: function () { return setup_helpers_1.createHazoConnectFromEnv; } });
Object.defineProperty(exports, "getHazoConnectSingleton", { enumerable: true, get: function () { return setup_helpers_1.getHazoConnectSingleton; } });
Object.defineProperty(exports, "resetHazoConnectSingleton", { enumerable: true, get: function () { return setup_helpers_1.resetHazoConnectSingleton; } });
//# sourceMappingURL=index.js.map
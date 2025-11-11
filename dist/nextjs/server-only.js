"use strict";
/**
 * Purpose: Server-only initialization helpers for Next.js
 *
 * This file provides server-only utilities that re-export hazo_connect/server
 * functionality with additional Next.js-specific helpers.
 */
'use server';
/**
 * Purpose: Server-only initialization helpers for Next.js
 *
 * This file provides server-only utilities that re-export hazo_connect/server
 * functionality with additional Next.js-specific helpers.
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
/**
 * Runtime guard to ensure this module is only used on the server
 */
function ensureServerOnly() {
    if (typeof window !== 'undefined') {
        throw new Error('hazo_connect/nextjs/server-only can only be used on the server. ' +
            'This module is designed for Next.js Server Components and API routes only.');
    }
}
// Check immediately when module loads
ensureServerOnly();
// Re-export all server-side functionality from hazo_connect/server
__exportStar(require("../server"), exports);
//# sourceMappingURL=server-only.js.map
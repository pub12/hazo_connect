"use strict";
/**
 * Purpose: Configuration validation utilities for hazo_connect
 *
 * This file provides validation functions to check Next.js configuration
 * and provide helpful error messages for common misconfigurations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateNextJsConfig = validateNextJsConfig;
exports.getConfigurationTips = getConfigurationTips;
/**
 * Validate Next.js configuration for hazo_connect with SQLite
 *
 * Checks for common misconfigurations and provides helpful error messages.
 *
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * import { validateNextJsConfig } from 'hazo_connect/server'
 *
 * const result = validateNextJsConfig()
 * if (!result.valid) {
 *   console.error('Configuration errors:', result.errors)
 * }
 * ```
 */
function validateNextJsConfig() {
    const errors = [];
    const warnings = [];
    // Check if we're in a Next.js environment
    if (typeof process === 'undefined' || !process.env) {
        warnings.push('Unable to validate configuration: not in Node.js environment');
        return { valid: true, errors, warnings };
    }
    // Check for SQLite configuration
    const dbType = process.env.HAZO_CONNECT_TYPE || 'sqlite';
    if (dbType === 'sqlite') {
        const sqlitePath = process.env.HAZO_CONNECT_SQLITE_PATH || process.env.SQLITE_DATABASE_PATH;
        if (!sqlitePath) {
            warnings.push('HAZO_CONNECT_SQLITE_PATH not set. ' +
                'Will use default path: ./database.sqlite');
        }
    }
    // Check for PostgREST configuration
    if (dbType === 'postgrest') {
        if (!process.env.POSTGREST_URL && !process.env.postgrest_url) {
            errors.push('POSTGREST_URL environment variable is required for PostgREST adapter. ' +
                'Set POSTGREST_URL in your .env.local file.');
        }
        if (!process.env.POSTGREST_API_KEY && !process.env.postgrest_api_key) {
            errors.push('POSTGREST_API_KEY environment variable is required for PostgREST adapter. ' +
                'Set POSTGREST_API_KEY in your .env.local file.');
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}
/**
 * Get helpful configuration tips based on current environment
 *
 * @returns Array of configuration tips
 */
function getConfigurationTips() {
    const tips = [];
    // Check if sql.js might be bundled
    if (typeof window !== 'undefined') {
        tips.push('⚠️  You are in a browser environment. ' +
            'Make sure sql.js is excluded from webpack bundling in next.config.mjs');
    }
    // Check for common Next.js configuration issues
    tips.push('💡 Tip: Add sql.js to serverComponentsExternalPackages in next.config.mjs', '💡 Tip: Add sql.js to webpack.externals for server-side code', '💡 Tip: Use API routes instead of calling hazo_connect directly in Server Components', '💡 Tip: Use singleton pattern for multiple API routes (getHazoConnectSingleton)');
    return tips;
}
//# sourceMappingURL=config-validator.js.map
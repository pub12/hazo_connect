"use strict";
/**
 * Purpose: Next.js API route helpers for Hazo Connect
 *
 * This file provides helper functions for creating Next.js API route handlers
 * that automatically initialize and use hazo_connect adapters.
 */
'use server';
/**
 * Purpose: Next.js API route helpers for Hazo Connect
 *
 * This file provides helper functions for creating Next.js API route handlers
 * that automatically initialize and use hazo_connect adapters.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerHazoConnect = getServerHazoConnect;
exports.createApiRouteHandler = createApiRouteHandler;
const server_1 = require("next/server");
const server_2 = require("../server");
/**
 * Runtime guard to ensure this module is only used on the server
 */
function ensureServerOnly() {
    if (typeof window !== 'undefined') {
        throw new Error('hazo_connect/nextjs can only be used on the server. ' +
            'These helpers are designed for Next.js API routes and Server Components only.');
    }
}
// Check immediately when module loads
ensureServerOnly();
/**
 * Create a hazo_connect adapter instance for use in API routes
 *
 * @param config - Hazo Connect configuration
 * @param logger - Optional logger
 * @returns Hazo Connect adapter instance
 *
 * @example
 * ```typescript
 * import { getServerHazoConnect } from 'hazo_connect/nextjs'
 *
 * export async function GET(request: NextRequest) {
 *   const hazo = getServerHazoConnect({
 *     type: 'postgrest',
 *     postgrest: {
 *       base_url: process.env.POSTGREST_URL,
 *       api_key: process.env.POSTGREST_API_KEY
 *     }
 *   })
 *
 *   const users = await hazo.query(
 *     new QueryBuilder().from('users').select('*')
 *   )
 *
 *   return NextResponse.json({ data: users })
 * }
 * ```
 */
function getServerHazoConnect(config, logger) {
    ensureServerOnly();
    return (0, server_2.createHazoConnect)({ ...config, logger });
}
/**
 * Create a Next.js API route handler with automatic hazo_connect initialization
 *
 * @param handler - Handler function that receives hazo_connect adapter and request
 * @param options - Options for handler creation
 * @returns Next.js route handler function
 *
 * @example
 * ```typescript
 * import { createApiRouteHandler } from 'hazo_connect/nextjs'
 * import { QueryBuilder } from 'hazo_connect/server'
 *
 * export const GET = createApiRouteHandler(
 *   async (hazo, request) => {
 *     const users = await hazo.query(
 *       new QueryBuilder().from('users').select('*')
 *     )
 *     return NextResponse.json({ data: users })
 *   },
 *   {
 *     config: {
 *       type: 'postgrest',
 *       postgrest: {
 *         base_url: process.env.POSTGREST_URL,
 *         api_key: process.env.POSTGREST_API_KEY
 *       }
 *     }
 *   }
 * )
 * ```
 */
function createApiRouteHandler(handler, options = {}) {
    ensureServerOnly();
    return async (request) => {
        try {
            // Get configuration
            let config;
            if (options.getConfig) {
                config = await Promise.resolve(options.getConfig(request));
            }
            else if (options.config) {
                config = options.config;
            }
            else {
                // Default: try to infer from environment
                const type = process.env.HAZO_CONNECT_TYPE || 'postgrest';
                if (type === 'postgrest') {
                    config = {
                        type: 'postgrest',
                        postgrest: {
                            base_url: process.env.POSTGREST_URL || process.env.postgrest_url || '',
                            api_key: process.env.POSTGREST_API_KEY || process.env.postgrest_api_key || ''
                        }
                    };
                }
                else if (type === 'sqlite') {
                    config = {
                        type: 'sqlite',
                        sqlite: {
                            database_path: process.env.HAZO_CONNECT_SQLITE_PATH || process.env.SQLITE_DATABASE_PATH || ':memory:',
                            read_only: process.env.HAZO_CONNECT_SQLITE_READONLY === 'true',
                            wasm_directory: process.env.HAZO_CONNECT_SQLITE_WASM_DIR
                        },
                        enable_admin_ui: process.env.HAZO_CONNECT_ENABLE_ADMIN_UI === 'true'
                    };
                }
                else {
                    throw new Error(`Unable to infer hazo_connect configuration. ` +
                        `Please provide 'config' or 'getConfig' option, or set HAZO_CONNECT_TYPE environment variable.`);
                }
            }
            // Create adapter
            const hazo = (0, server_2.createHazoConnect)({
                ...config,
                logger: options.logger
            });
            // Call handler
            const response = await handler(hazo, request);
            return response;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const status = message.includes('required') || message.includes('not found') ? 400 : 500;
            return server_1.NextResponse.json({
                error: message,
                code: 'HAZO_CONNECT_ERROR'
            }, { status });
        }
    };
}
//# sourceMappingURL=api-route-helpers.js.map
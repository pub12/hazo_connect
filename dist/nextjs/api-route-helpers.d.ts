/**
 * Purpose: Next.js API route helpers for Hazo Connect
 *
 * This file provides helper functions for creating Next.js API route handlers
 * that automatically initialize and use hazo_connect adapters.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { type HazoConnectAdapter, type HazoConnectConfig, type Logger } from '../server';
/**
 * Configuration for creating a hazo_connect instance in API routes
 */
export interface ApiRouteHazoConfig extends Omit<HazoConnectConfig, 'type'> {
    type: HazoConnectConfig['type'];
    logger?: Logger;
}
/**
 * Handler function that receives a hazo_connect adapter instance
 */
export type ApiRouteHandler = (hazo: HazoConnectAdapter, request: NextRequest) => Promise<NextResponse | Response>;
/**
 * Options for creating API route handlers
 */
export interface ApiRouteHandlerOptions {
    config?: ApiRouteHazoConfig;
    getConfig?: (request: NextRequest) => Promise<ApiRouteHazoConfig> | ApiRouteHazoConfig;
    logger?: Logger;
}
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
export declare function getServerHazoConnect(config: ApiRouteHazoConfig, logger?: Logger): HazoConnectAdapter;
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
export declare function createApiRouteHandler(handler: ApiRouteHandler, options?: ApiRouteHandlerOptions): (request: NextRequest) => Promise<NextResponse | Response>;
//# sourceMappingURL=api-route-helpers.d.ts.map
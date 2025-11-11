/**
 * Purpose: Next.js setup helpers for hazo_connect
 *
 * This file provides helper functions for easy setup and configuration
 * of hazo_connect in Next.js projects, including singleton pattern support.
 */
import type { HazoConnectAdapter, HazoConnectConfig } from '../server';
/**
 * Options for creating hazo_connect from environment variables
 */
export interface CreateHazoConnectFromEnvOptions {
    /**
     * Override database type (defaults to HAZO_CONNECT_TYPE or 'sqlite')
     */
    type?: 'sqlite' | 'postgrest' | 'supabase' | 'file';
    /**
     * Override SQLite database path
     */
    sqlitePath?: string;
    /**
     * Override read-only setting
     */
    readOnly?: boolean;
    /**
     * Override admin UI enable setting
     */
    enableAdminUi?: boolean;
    /**
     * Custom logger instance
     */
    logger?: HazoConnectConfig['logger'];
}
/**
 * Create a hazo_connect adapter instance from environment variables
 *
 * Automatically reads configuration from environment variables and provides
 * sensible defaults. Handles path resolution for SQLite database files.
 *
 * @param options - Optional overrides for environment-based configuration
 * @returns Configured hazo_connect adapter instance
 *
 * @example
 * ```typescript
 * import { createHazoConnectFromEnv } from 'hazo_connect/nextjs/setup'
 *
 * export async function GET() {
 *   const hazo = createHazoConnectFromEnv()
 *   const users = await hazo.query(new QueryBuilder().from('users'))
 *   return NextResponse.json({ data: users })
 * }
 * ```
 */
export declare function createHazoConnectFromEnv(options?: CreateHazoConnectFromEnvOptions): HazoConnectAdapter;
/**
 * Get a singleton hazo_connect adapter instance
 *
 * Creates the adapter on first call and reuses the same instance
 * for subsequent calls. Thread-safe for Next.js serverless environment.
 *
 * The singleton is keyed by configuration, so if configuration changes,
 * a new instance will be created.
 *
 * @param options - Optional configuration overrides
 * @returns Singleton hazo_connect adapter instance
 *
 * @example
 * ```typescript
 * // lib/hazo_connect.ts
 * import { getHazoConnectSingleton } from 'hazo_connect/nextjs/setup'
 *
 * export const hazo = getHazoConnectSingleton()
 * ```
 *
 * ```typescript
 * // app/api/users/route.ts
 * import { hazo } from '@/lib/hazo_connect'
 * import { QueryBuilder } from 'hazo_connect/server'
 *
 * export async function GET() {
 *   const users = await hazo.query(new QueryBuilder().from('users'))
 *   return NextResponse.json({ data: users })
 * }
 * ```
 */
export declare function getHazoConnectSingleton(options?: CreateHazoConnectFromEnvOptions): HazoConnectAdapter;
//# sourceMappingURL=setup-helpers.d.ts.map
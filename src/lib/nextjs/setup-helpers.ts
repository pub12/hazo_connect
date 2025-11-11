/**
 * Purpose: Next.js setup helpers for hazo_connect
 * 
 * This file provides helper functions for easy setup and configuration
 * of hazo_connect in Next.js projects, including singleton pattern support.
 */

'use server'

import path from 'path'
import type { HazoConnectAdapter, HazoConnectConfig } from '../server'
import { createHazoConnect } from '../server'
import { registerSqliteAdapter } from '../sqlite/admin-service'
import { SqliteAdapter } from '../adapters/sqlite-adapter'

/**
 * Runtime guard to ensure this module is only used on the server
 */
function ensureServerOnly(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'hazo_connect/nextjs/setup can only be used on the server. ' +
      'These helpers are designed for Next.js API routes and Server Components only.'
    )
  }
}

// Check immediately when module loads
ensureServerOnly()

/**
 * Options for creating hazo_connect from environment variables
 */
export interface CreateHazoConnectFromEnvOptions {
  /**
   * Override database type (defaults to HAZO_CONNECT_TYPE or 'sqlite')
   */
  type?: 'sqlite' | 'postgrest' | 'supabase' | 'file'
  
  /**
   * Override SQLite database path
   */
  sqlitePath?: string
  
  /**
   * Override read-only setting
   */
  readOnly?: boolean
  
  /**
   * Override admin UI enable setting
   */
  enableAdminUi?: boolean
  
  /**
   * Custom logger instance
   */
  logger?: HazoConnectConfig['logger']
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
export function createHazoConnectFromEnv(
  options: CreateHazoConnectFromEnvOptions = {}
): HazoConnectAdapter {
  ensureServerOnly()
  
  const dbType = (options.type || process.env.HAZO_CONNECT_TYPE || 'sqlite').toLowerCase() as HazoConnectConfig['type']
  
  if (dbType === 'sqlite') {
    const sqlitePathEnv = options.sqlitePath || process.env.HAZO_CONNECT_SQLITE_PATH || process.env.SQLITE_DATABASE_PATH
    
    let sqlitePath: string
    
    if (sqlitePathEnv) {
      // If path is absolute, use as-is; otherwise resolve relative to process.cwd()
      sqlitePath = path.isAbsolute(sqlitePathEnv)
        ? sqlitePathEnv
        : path.resolve(process.cwd(), sqlitePathEnv)
    } else {
      // Fallback to default database path
      sqlitePath = path.resolve(process.cwd(), 'database.sqlite')
    }
    
    const readOnly = options.readOnly ?? process.env.HAZO_CONNECT_SQLITE_READONLY === 'true'
    const enableAdminUi = options.enableAdminUi ?? process.env.HAZO_CONNECT_ENABLE_ADMIN_UI === 'true'
    const wasmDirectory = process.env.HAZO_CONNECT_SQLITE_WASM_DIR
      ? path.resolve(process.env.HAZO_CONNECT_SQLITE_WASM_DIR)
      : undefined
    
    return createHazoConnect({
      type: 'sqlite',
      enable_admin_ui: enableAdminUi,
      sqlite: {
        database_path: sqlitePath,
        read_only: readOnly,
        wasm_directory: wasmDirectory
      },
      logger: options.logger
    })
  } else if (dbType === 'postgrest') {
    const baseUrl = process.env.POSTGREST_URL || process.env.postgrest_url || ''
    const apiKey = process.env.POSTGREST_API_KEY || process.env.postgrest_api_key || ''
    
    if (!baseUrl || !apiKey) {
      throw new Error(
        'PostgREST configuration requires POSTGREST_URL and POSTGREST_API_KEY environment variables'
      )
    }
    
    return createHazoConnect({
      type: 'postgrest',
      postgrest: {
        base_url: baseUrl,
        api_key: apiKey
      },
      logger: options.logger
    })
  } else {
    throw new Error(
      `Unsupported database type: ${dbType}. ` +
      `Supported types: sqlite, postgrest. ` +
      `Set HAZO_CONNECT_TYPE environment variable or provide type option.`
    )
  }
}

// Singleton instance cache
let singletonInstance: HazoConnectAdapter | null = null
let singletonConfig: string | null = null

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
export function getHazoConnectSingleton(
  options: CreateHazoConnectFromEnvOptions = {}
): HazoConnectAdapter {
  ensureServerOnly()
  
  // Create a configuration signature to detect changes
  const configSignature = JSON.stringify({
    type: options.type || process.env.HAZO_CONNECT_TYPE || 'sqlite',
    sqlitePath: options.sqlitePath || process.env.HAZO_CONNECT_SQLITE_PATH,
    readOnly: options.readOnly ?? process.env.HAZO_CONNECT_SQLITE_READONLY === 'true',
    enableAdminUi: options.enableAdminUi ?? process.env.HAZO_CONNECT_ENABLE_ADMIN_UI === 'true'
  })
  
  // If configuration changed or instance doesn't exist, create new one
  if (!singletonInstance || singletonConfig !== configSignature) {
    singletonInstance = createHazoConnectFromEnv(options)
    singletonConfig = configSignature
    
    // If this is a SQLite adapter, register it with the admin service
    // so the admin UI uses the same instance
    if (singletonInstance instanceof SqliteAdapter) {
      registerSqliteAdapter(singletonInstance)
    }
  }
  
  return singletonInstance
}

/**
 * Reset the singleton instance (useful for testing)
 * 
 * @internal
 */
export function resetHazoConnectSingleton(): void {
  singletonInstance = null
  singletonConfig = null
}


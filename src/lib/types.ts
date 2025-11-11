/**
 * Purpose: Core TypeScript types and interfaces for Hazo Connect
 * 
 * This file defines all types used throughout the hazo_connect component.
 * Zero dependencies - only TypeScript types.
 * 
 * Note: ConfigProvider is imported from hazo_config npm package.
 * Components can work with either direct config or ConfigProvider.
 */

// Import ConfigProvider from hazo_config npm package
import type { ConfigProvider } from 'hazo_config'

/**
 * Optional logger interface for dependency injection
 * If not provided, a no-op logger will be used
 */
export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
}

/**
 * No-op logger implementation (default when no logger provided)
 */
export const noOpLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
}

/**
 * Connection types supported by Hazo Connect
 */
export type ConnectionType = 'postgrest' | 'supabase' | 'sqlite' | 'file'

/**
 * Main configuration interface for Hazo Connect
 * Logger is optional - defaults to no-op if not provided
 * 
 * Can accept either:
 * - Direct config object with type and provider-specific config
 * - ConfigProvider instance (from hazo_config) for dependency injection
 */
export interface HazoConnectConfig {
  type: ConnectionType
  logger?: Logger
  configProvider?: ConfigProvider  // Optional ConfigProvider for dependency injection
  enable_admin_ui?: boolean  // Enable SQLite admin UI (default: false). Only works with SQLite adapter.
  [key: string]: any  // Provider-specific config (postgrest, supabase, sqlite, file) - used if configProvider not provided
}

/**
 * Query operator types supported by the query builder
 */
export type QueryOperator = 
  | 'eq'      // equals
  | 'neq'     // not equals
  | 'gt'      // greater than
  | 'gte'     // greater than or equal
  | 'lt'      // less than
  | 'lte'     // less than or equal
  | 'like'    // like (case-sensitive)
  | 'ilike'   // like (case-insensitive)
  | 'in'      // in array
  | 'is'      // is null/not null
  | 'or'      // or condition

/**
 * Where condition structure
 */
export interface WhereCondition {
  field: string
  operator: QueryOperator
  value: any
}

/**
 * Order direction
 */
export type OrderDirection = 'asc' | 'desc'

/**
 * Join type
 */
export type JoinType = 'inner' | 'left' | 'right'

/**
 * Nested select structure for PostgREST syntax
 */
export interface NestedSelect {
  table: string
  fields: string[]
}

/**
 * Database adapter interface
 * All adapters must implement this interface
 */
export interface HazoConnectAdapter {
  /**
   * Execute a query using the query builder
   * @param builder - The query builder instance
   * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
   * @param body - Request body for POST/PUT/PATCH
   * @returns Promise with query results
   */
  query(
    builder: any, // QueryBuilder type (avoid circular dependency)
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: any
  ): Promise<any>

  /**
   * Execute a raw query (for backward compatibility)
   * @param endpoint - Raw endpoint string (e.g., '/table?id=eq.123')
   * @param options - Request options
   * @returns Promise with query results
   */
  rawQuery(endpoint: string, options?: RequestInit): Promise<any>

  /**
   * Get the adapter's configuration
   * @returns Promise with adapter-specific config
   */
  getConfig(): Promise<any>
}

/**
 * Standardized error response
 * Note: code is a string (ErrorCode enum values are strings)
 */
export interface HazoConnectError {
  code: string  // ErrorCode enum value as string
  message: string
  statusCode?: number
  originalError?: any
}

/**
 * Error codes
 */
export enum ErrorCode {
  CONFIG_ERROR = 'HAZO_CONNECT_CONFIG_ERROR',
  CONNECTION_FAILED = 'HAZO_CONNECT_CONNECTION_FAILED',
  QUERY_ERROR = 'HAZO_CONNECT_QUERY_ERROR',
  NOT_IMPLEMENTED = 'HAZO_CONNECT_NOT_IMPLEMENTED',
  VALIDATION_ERROR = 'HAZO_CONNECT_VALIDATION_ERROR'
}


/**
 * Purpose: Server-only entry point for Hazo Connect
 * 
 * This file exports all server-side functionality with 'use server' directive
 * and runtime guards to prevent client-side usage.
 */

'use server'

/**
 * Runtime guard to ensure this module is only used on the server
 * @throws Error if called in a browser environment
 */
function ensureServerOnly(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'hazo_connect/server can only be used on the server. ' +
      'For client-side usage, import types from "hazo_connect" or "hazo_connect/ui".'
    )
  }
}

// Check immediately when module loads
ensureServerOnly()

// Export types (safe to export - they're compile-time only)
export type {
  Logger,
  ConnectionType,
  HazoConnectConfig,
  HazoConnectAdapter,
  QueryOperator,
  WhereCondition,
  OrderDirection,
  JoinType,
  NestedSelect,
  HazoConnectError
} from '../types'

export { ErrorCode, noOpLogger } from '../types'

// Export query builder
export { QueryBuilder } from '../query-builder'

// Export factory
export { createHazoConnect } from '../factory'

// Export helpers
export {
  attachExecute,
  createCrudService,
  createTableQuery,
  executeQuery
} from '../helpers'
export type {
  CrudService,
  CrudServiceOptions,
  ExecutableQueryBuilder,
  QueryMethod
} from '../helpers'

// Export adapters (for advanced usage)
export { BaseAdapter } from '../adapters/base-adapter'
export { PostgrestAdapter } from '../adapters/postgrest-adapter'
export { SqliteAdapter } from '../adapters/sqlite-adapter'
export { SupabaseAdapter } from '../adapters/supabase-adapter'
export { FileAdapter } from '../adapters/file-adapter'

// Export SQLite admin helpers
export {
  getSqliteAdminService,
  initializeAdminService,
  registerSqliteAdapter,
  clearRegisteredAdapter
} from '../sqlite/admin-service'

// Export configuration validation utilities
export {
  validateNextJsConfig,
  getConfigurationTips,
  type ValidationResult
} from '../utils/config-validator'
export type {
  SqliteAdminService,
  SqliteTableType,
  TableSummary,
  TableSchema,
  TableColumn,
  TableForeignKey,
  RowPage,
  RowQueryOptions,
  SqliteWhereFilter,
  SqliteFilterOperator
} from '../sqlite/admin-service'


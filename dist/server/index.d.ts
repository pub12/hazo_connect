/**
 * Purpose: Server-only entry point for Hazo Connect
 *
 * This file exports all server-side functionality with 'use server' directive
 * and runtime guards to prevent client-side usage.
 */
export type { Logger, ConnectionType, HazoConnectConfig, HazoConnectAdapter, QueryOperator, WhereCondition, OrderDirection, JoinType, NestedSelect, HazoConnectError } from '../types';
export { ErrorCode, noOpLogger } from '../types';
export { QueryBuilder } from '../query-builder';
export { createHazoConnect } from '../factory';
export { attachExecute, createCrudService, createTableQuery, executeQuery } from '../helpers';
export type { CrudService, CrudServiceOptions, ExecutableQueryBuilder, QueryMethod } from '../helpers';
export { BaseAdapter } from '../adapters/base-adapter';
export { PostgrestAdapter } from '../adapters/postgrest-adapter';
export { SqliteAdapter } from '../adapters/sqlite-adapter';
export { SupabaseAdapter } from '../adapters/supabase-adapter';
export { FileAdapter } from '../adapters/file-adapter';
export { getSqliteAdminService, initializeAdminService, registerSqliteAdapter, clearRegisteredAdapter } from '../sqlite/admin-service';
export { validateNextJsConfig, getConfigurationTips, type ValidationResult } from '../utils/config-validator';
export type { SqliteAdminService, SqliteTableType, TableSummary, TableSchema, TableColumn, TableForeignKey, RowPage, RowQueryOptions, SqliteWhereFilter, SqliteFilterOperator } from '../sqlite/admin-service';
//# sourceMappingURL=index.d.ts.map
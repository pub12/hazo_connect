/**
 * Purpose: UI-safe entry point for Hazo Connect
 *
 * This file exports only types and interfaces that are safe to use in client components.
 * No runtime code that requires Node.js APIs is exported.
 */
export type { SqliteTableType, TableSummary, TableSchema, TableColumn, TableForeignKey, RowPage, RowQueryOptions, SqliteWhereFilter, SqliteFilterOperator } from '../sqlite/admin-service';
export type { Logger, ConnectionType, HazoConnectConfig, HazoConnectAdapter, QueryOperator, WhereCondition, OrderDirection, JoinType, NestedSelect, HazoConnectError } from '../types';
export type { ErrorCode } from '../types';
//# sourceMappingURL=index.d.ts.map
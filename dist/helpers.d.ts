/**
 * Purpose: Helper utilities for working with Hazo Connect adapters
 *
 * These helpers provide reusable patterns for building queries,
 * executing CRUD operations, and instrumenting interactions without
 * embedding any project-specific knowledge. They allow downstream
 * applications to compose higher-level services while keeping the
 * hazo_connect component self-contained and reusable.
 */
import { QueryBuilder } from './query-builder';
import type { HazoConnectAdapter, Logger } from './types';
/**
 * Method signature supported by Hazo Connect adapters
 */
export type QueryMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
/**
 * Query builder with an execute helper bound to an adapter.
 */
export type ExecutableQueryBuilder = QueryBuilder & {
    execute: (method?: QueryMethod, body?: unknown) => Promise<unknown>;
};
/**
 * Create a query builder for a table and attach the adapter execute method.
 * @param adapter - Active Hazo Connect adapter
 * @param table - Table name to query
 * @param logger - Optional logger for diagnostics
 * @returns Executable query builder
 */
export declare function createTableQuery(adapter: HazoConnectAdapter, table: string, logger?: Logger): ExecutableQueryBuilder;
/**
 * Attach execute helper to a query builder.
 * @param builder - Query builder instance
 * @param adapter - Active adapter
 * @param logger - Optional logger for diagnostics
 * @returns Executable query builder
 */
export declare function attachExecute(builder: QueryBuilder, adapter: HazoConnectAdapter, logger?: Logger): ExecutableQueryBuilder;
/**
 * Options when generating CRUD helpers.
 */
export interface CrudServiceOptions {
    primaryKeys?: string[];
    logger?: Logger;
}
/**
 * Minimal CRUD interface backed by hazo_connect.
 */
export interface CrudService<T extends Record<string, unknown> = Record<string, unknown>> {
    list(configure?: (qb: QueryBuilder) => QueryBuilder): Promise<T[]>;
    findBy(criteria: Record<string, unknown>): Promise<T[]>;
    findOneBy(criteria: Record<string, unknown>): Promise<T | null>;
    findById(id: unknown): Promise<T | null>;
    insert(data: Partial<T> | Partial<T>[]): Promise<T[]>;
    updateById(id: unknown, patch: Partial<T>): Promise<T[]>;
    deleteById(id: unknown): Promise<void>;
    query(): ExecutableQueryBuilder;
}
/**
 * Create a CRUD service wrapper for a PostgREST table.
 * @param adapter - Hazo Connect adapter
 * @param table - Table name
 * @param options - CRUD helper options
 * @returns CRUD service instance
 */
export declare function createCrudService<T extends Record<string, unknown> = Record<string, unknown>>(adapter: HazoConnectAdapter, table: string, options?: CrudServiceOptions): CrudService<T>;
/**
 * Execute a query builder with optional logging and error wrapping.
 * @param adapter - Hazo Connect adapter
 * @param builder - Configured query builder
 * @param method - HTTP verb / operation
 * @param body - Optional body payload
 * @param logger - Optional logger for diagnostics
 * @returns Result of adapter query
 */
export declare function executeQuery(adapter: HazoConnectAdapter, builder: QueryBuilder, method?: QueryMethod, body?: unknown, logger?: Logger): Promise<unknown>;
//# sourceMappingURL=helpers.d.ts.map
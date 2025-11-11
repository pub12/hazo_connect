/**
 * Purpose: Helper utilities for working with Hazo Connect adapters
 *
 * These helpers provide reusable patterns for building queries,
 * executing CRUD operations, and instrumenting interactions without
 * embedding any project-specific knowledge. They allow downstream
 * applications to compose higher-level services while keeping the
 * hazo_connect component self-contained and reusable.
 */

import { QueryBuilder } from './query-builder'
import type { HazoConnectAdapter, Logger } from './types'

/**
 * Method signature supported by Hazo Connect adapters
 */
export type QueryMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Query builder with an execute helper bound to an adapter.
 */
export type ExecutableQueryBuilder = QueryBuilder & {
  execute: (method?: QueryMethod, body?: unknown) => Promise<unknown>
}

/**
 * Create a query builder for a table and attach the adapter execute method.
 * @param adapter - Active Hazo Connect adapter
 * @param table - Table name to query
 * @param logger - Optional logger for diagnostics
 * @returns Executable query builder
 */
export function createTableQuery(
  adapter: HazoConnectAdapter,
  table: string,
  logger?: Logger
): ExecutableQueryBuilder {
  const builder = new QueryBuilder().from(table)
  return attachExecute(builder, adapter, logger)
}

/**
 * Attach execute helper to a query builder.
 * @param builder - Query builder instance
 * @param adapter - Active adapter
 * @param logger - Optional logger for diagnostics
 * @returns Executable query builder
 */
export function attachExecute(
  builder: QueryBuilder,
  adapter: HazoConnectAdapter,
  logger?: Logger
): ExecutableQueryBuilder {
  const executable = builder as ExecutableQueryBuilder
  executable.execute = async (method: QueryMethod = 'GET', body?: unknown) => {
    logger?.debug?.('Executing Hazo Connect query', {
      method,
      table: builder.getTable(),
      hasBody: Boolean(body)
    })
    return adapter.query(builder, method, body)
  }
  return executable
}

/**
 * Options when generating CRUD helpers.
 */
export interface CrudServiceOptions {
  primaryKeys?: string[] // defaults to ['id']
  logger?: Logger
}

/**
 * Minimal CRUD interface backed by hazo_connect.
 */
export interface CrudService<T extends Record<string, unknown> = Record<string, unknown>> {
  list(configure?: (qb: QueryBuilder) => QueryBuilder): Promise<T[]>
  findBy(criteria: Record<string, unknown>): Promise<T[]>
  findOneBy(criteria: Record<string, unknown>): Promise<T | null>
  findById(id: unknown): Promise<T | null>
  insert(data: Partial<T> | Partial<T>[]): Promise<T[]>
  updateById(id: unknown, patch: Partial<T>): Promise<T[]>
  deleteById(id: unknown): Promise<void>
  query(): ExecutableQueryBuilder
}

/**
 * Create a CRUD service wrapper for a PostgREST table.
 * @param adapter - Hazo Connect adapter
 * @param table - Table name
 * @param options - CRUD helper options
 * @returns CRUD service instance
 */
export function createCrudService<T extends Record<string, unknown> = Record<string, unknown>>(
  adapter: HazoConnectAdapter,
  table: string,
  options: CrudServiceOptions = {}
): CrudService<T> {
  const primaryKeys = options.primaryKeys && options.primaryKeys.length > 0 ? options.primaryKeys : ['id']
  const logger = options.logger

  function buildQuery(): ExecutableQueryBuilder {
    return createTableQuery(adapter, table, logger)
  }

  async function list(configure?: (qb: QueryBuilder) => QueryBuilder): Promise<T[]> {
    let qb = buildQuery()
    if (configure) {
      qb = configure(qb) as ExecutableQueryBuilder
    }
    const result = await qb.execute('GET')
    return Array.isArray(result) ? (result as T[]) : []
  }

  async function findBy(criteria: Record<string, unknown>): Promise<T[]> {
    const qb = buildQuery()
    for (const [field, value] of Object.entries(criteria)) {
      qb.where(field, Array.isArray(value) ? 'in' : 'eq', value)
    }
    return list(() => qb)
  }

  async function findOneBy(criteria: Record<string, unknown>): Promise<T | null> {
    const results = await findBy(criteria)
    return results.length > 0 ? results[0] : null
  }

  async function findById(id: unknown): Promise<T | null> {
    if (primaryKeys.length !== 1) {
      logger?.warn?.('findById called on multi-key table, falling back to first primary key', {
        table,
        primaryKeys
      })
    }
    const key = primaryKeys[0]
    return findOneBy({ [key]: id })
  }

  async function insert(data: Partial<T> | Partial<T>[]): Promise<T[]> {
    const qb = buildQuery()
    const payload = Array.isArray(data) ? data : [data]
    const result = await qb.execute('POST', payload)
    if (Array.isArray(result)) {
      return result as T[]
    }
    return payload as T[]
  }

  async function updateById(id: unknown, patch: Partial<T>): Promise<T[]> {
    const qb = buildQuery()
    if (primaryKeys.length !== 1) {
      logger?.warn?.('updateById called on multi-key table, falling back to first primary key', {
        table,
        primaryKeys
      })
    }
    qb.where(primaryKeys[0], 'eq', id)
    const result = await qb.execute('PATCH', patch)
    if (Array.isArray(result)) {
      return result as T[]
    }
    return [{ ...(patch as Record<string, unknown>), [primaryKeys[0]]: id }] as T[]
  }

  async function deleteById(id: unknown): Promise<void> {
    const qb = buildQuery()
    if (primaryKeys.length !== 1) {
      logger?.warn?.('deleteById called on multi-key table, falling back to first primary key', {
        table,
        primaryKeys
      })
    }
    qb.where(primaryKeys[0], 'eq', id)
    await qb.execute('DELETE')
  }

  return {
    list,
    findBy,
    findOneBy,
    findById,
    insert,
    updateById,
    deleteById,
    query: buildQuery
  }
}

/**
 * Execute a query builder with optional logging and error wrapping.
 * @param adapter - Hazo Connect adapter
 * @param builder - Configured query builder
 * @param method - HTTP verb / operation
 * @param body - Optional body payload
 * @param logger - Optional logger for diagnostics
 * @returns Result of adapter query
 */
export async function executeQuery(
  adapter: HazoConnectAdapter,
  builder: QueryBuilder,
  method: QueryMethod = 'GET',
  body?: unknown,
  logger?: Logger
): Promise<unknown> {
  logger?.debug?.('Executing query via executeQuery helper', {
    method,
    table: builder.getTable()
  })
  return adapter.query(builder, method, body)
}



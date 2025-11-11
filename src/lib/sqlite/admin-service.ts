// admin-service.ts exposes helper utilities for browsing and mutating SQLite databases.
import path from "path"
import { createHazoConnect } from "../factory"
import type { HazoConnectAdapter } from "../types"
import { SqliteAdapter } from "../adapters/sqlite-adapter"
import { quoteIdentifier, normalizeValue, sanitizeTableName } from "../utils/sqlite-utils"
import { buildWhereClause, buildFiltersFromCriteria, type SqliteWhereFilter } from "../utils/where-builder"

export type SqliteTableType = "table" | "view"

export interface TableSummary {
  name: string
  type: SqliteTableType
  row_count: number | null
}

export interface TableColumn {
  cid: number
  name: string
  type: string
  notnull: boolean
  default_value: unknown
  primary_key_position: number
}

export interface TableForeignKey {
  id: number
  seq: number
  table: string
  from: string
  to: string
  on_update: string
  on_delete: string
  match: string
}

export interface TableSchema {
  columns: TableColumn[]
  foreign_keys: TableForeignKey[]
}

// SqliteFilterOperator and SqliteWhereFilter are now imported from utils/where-builder
export type { SqliteFilterOperator, SqliteWhereFilter } from "../utils/where-builder"

export interface RowQueryOptions {
  limit?: number
  offset?: number
  order_by?: string
  order_direction?: "asc" | "desc"
  filters?: SqliteWhereFilter[]
}

export interface RowPage {
  rows: Record<string, unknown>[]
  total: number
}

export interface SqliteAdminService {
  listTables(): Promise<TableSummary[]>
  getTableSchema(table: string): Promise<TableSchema>
  getTableData(table: string, options?: RowQueryOptions): Promise<RowPage>
  insertRow(table: string, data: Record<string, unknown>): Promise<Record<string, unknown>>
  updateRows(
    table: string,
    criteria: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>[]>
  deleteRows(
    table: string,
    criteria: Record<string, unknown>
  ): Promise<Record<string, unknown>[]>
}

interface AdminConfig {
  databasePath: string
  readOnly: boolean
  wasmDirectory?: string
}

const DEFAULT_LIMIT = 50

let cachedAdapter: SqliteAdapter | null = null
let cachedConfigSignature: string | null = null
let adminUiEnabled: boolean = false
let registeredAdapter: SqliteAdapter | null = null

/**
 * Initialize the admin service with configuration
 * This must be called before using the admin UI
 * @param config - HazoConnectConfig with enable_admin_ui flag
 */
export function initializeAdminService(config: { enable_admin_ui?: boolean }): void {
  adminUiEnabled = config.enable_admin_ui === true
}

/**
 * Register a SQLite adapter instance to be used by the admin service
 * This allows the admin UI to use the same adapter instance as the backend
 * @param adapter - The SqliteAdapter instance to register
 */
export function registerSqliteAdapter(adapter: SqliteAdapter): void {
  registeredAdapter = adapter
  // Also update cached adapter to avoid creating a new one
  cachedAdapter = adapter
  // Set a special signature to indicate this is a registered adapter
  cachedConfigSignature = "__registered__"
}

/**
 * Clear the registered adapter (useful for testing)
 * @internal
 */
export function clearRegisteredAdapter(): void {
  registeredAdapter = null
  cachedAdapter = null
  cachedConfigSignature = null
}

/**
 * Check if admin UI is enabled
 * Checks both the initialized flag and environment variable as fallback
 * @throws Error if admin UI is not enabled
 */
function ensureAdminUiEnabled(): void {
  // Check environment variable as fallback
  const envEnabled =
    process.env.HAZO_CONNECT_ENABLE_ADMIN_UI === "true" ||
    process.env.ENABLE_SQLITE_ADMIN_UI === "true"

  if (!adminUiEnabled && !envEnabled) {
    throw new Error(
      "SQLite admin UI is not enabled. " +
      "To enable it:\n" +
      "1. Set 'enable_admin_ui: true' when creating the adapter:\n" +
      "   createHazoConnect({ type: 'sqlite', enable_admin_ui: true, ... })\n" +
      "2. Or set HAZO_CONNECT_ENABLE_ADMIN_UI=true environment variable\n" +
      "3. Restart your development server after making changes\n" +
      "See https://github.com/pub12/hazo_connect for more information."
    )
  }
}

export function getSqliteAdminService(): SqliteAdminService {
  ensureAdminUiEnabled()
  return {
    listTables,
    getTableSchema,
    getTableData,
    insertRow,
    updateRows,
    deleteRows
  }
}

async function listTables(): Promise<TableSummary[]> {
  const adapter = getSqliteAdapter()
  try {
    const records = await adapter.rawQuery(
      "SELECT name, type FROM sqlite_master WHERE (type='table' OR type='view') AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )

    const summaries: TableSummary[] = []
    for (const record of records) {
      const name = String(record.name)
      const type = (record.type as SqliteTableType) || "table"
      let rowCount: number | null = null

      if (type === "table") {
        try {
          const countResult = await adapter.rawQuery(
            `SELECT COUNT(*) AS total FROM ${quoteIdentifier(name)}`
          )
          rowCount = Number(countResult[0]?.total ?? 0)
        } catch (error) {
          rowCount = null
          logSqliteWarning("Failed to compute row count", error)
        }
      }

      summaries.push({
        name,
        type,
        row_count: rowCount
      })
    }

    return summaries
  } catch (error) {
    throw buildAdminError("Failed to list SQLite tables", error)
  }
}

async function getTableSchema(table: string): Promise<TableSchema> {
  const adapter = getSqliteAdapter()
  const tableName = sanitizeTableName(table)

  try {
    const columnsRaw = await adapter.rawQuery(
      `PRAGMA table_info(${quoteIdentifier(tableName)})`
    )
    const foreignKeysRaw = await adapter.rawQuery(
      `PRAGMA foreign_key_list(${quoteIdentifier(tableName)})`
    )

    const columns: TableColumn[] = columnsRaw.map((column: Record<string, unknown>) => ({
      cid: Number(column.cid),
      name: String(column.name),
      type: String(column.type ?? ""),
      notnull: Boolean(column.notnull),
      default_value: column.dflt_value ?? null,
      primary_key_position: Number(column.pk)
    }))

    const foreignKeys: TableForeignKey[] = foreignKeysRaw.map(
      (fk: Record<string, unknown>) => ({
        id: Number(fk.id),
        seq: Number(fk.seq),
        table: String(fk.table),
        from: String(fk.from),
        to: String(fk.to),
        on_update: String(fk.on_update ?? ""),
        on_delete: String(fk.on_delete ?? ""),
        match: String(fk.match ?? "")
      })
    )

    return { columns, foreign_keys: foreignKeys }
  } catch (error) {
    throw buildAdminError(`Failed to fetch schema for table '${tableName}'`, error)
  }
}

async function getTableData(
  table: string,
  options: RowQueryOptions = {}
): Promise<RowPage> {
  const adapter = getSqliteAdapter()
  const tableName = sanitizeTableName(table)

  const limit = validateLimit(options.limit)
  const offset = Math.max(0, options.offset ?? 0)
  const orderClause = buildOrderClause(options.order_by, options.order_direction)
  const whereClause = buildWhereClause(options.filters ?? [])

  try {
    const sql = `SELECT * FROM ${quoteIdentifier(tableName)}${whereClause.clause}${orderClause} LIMIT ${limit} OFFSET ${offset}`
    const rows = await adapter.rawQuery(sql, { params: whereClause.params } as any)

    const countSql = `SELECT COUNT(*) AS total FROM ${quoteIdentifier(tableName)}${whereClause.clause}`
    const totalResult = await adapter.rawQuery(countSql, { params: whereClause.params } as any)
    const total = Number(totalResult[0]?.total ?? 0)

    return { rows, total }
  } catch (error) {
    throw buildAdminError(`Failed to fetch data for table '${tableName}'`, error)
  }
}

async function insertRow(
  table: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const adapter = getSqliteAdapter()
  const tableName = sanitizeTableName(table)
  const { columns, values } = prepareMutationPayload(data)

  const placeholders = columns.map(() => "?").join(", ")
  const sql = `INSERT INTO ${quoteIdentifier(tableName)} (${columns
    .map(quoteIdentifier)
    .join(", ")}) VALUES (${placeholders}) RETURNING *`

  try {
    const rows = await adapter.rawQuery(sql, { params: values } as any)
    return rows[0] ?? {}
  } catch (error) {
    throw buildAdminError(`Failed to insert row into '${tableName}'`, error)
  }
}

async function updateRows(
  table: string,
  criteria: Record<string, unknown>,
  data: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const adapter = getSqliteAdapter()
  const tableName = sanitizeTableName(table)

  if (!Object.keys(criteria).length) {
    throw new Error("Update criteria must include at least one column")
  }

  const { columns, values } = prepareMutationPayload(data)
  if (!columns.length) {
    throw new Error("Update payload must include at least one column")
  }

  const filters = buildFiltersFromCriteria(criteria)
  const whereClause = buildWhereClause(filters)
  const setClause = columns.map(column => `${quoteIdentifier(column)} = ?`).join(", ")

  const sql = `UPDATE ${quoteIdentifier(tableName)} SET ${setClause}${whereClause.clause} RETURNING *`
  const params = [...values, ...whereClause.params]

  try {
    return await adapter.rawQuery(sql, { params } as any)
  } catch (error) {
    throw buildAdminError(`Failed to update rows in '${tableName}'`, error)
  }
}

async function deleteRows(
  table: string,
  criteria: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const adapter = getSqliteAdapter()
  const tableName = sanitizeTableName(table)

  if (!Object.keys(criteria).length) {
    throw new Error("Delete criteria must include at least one column")
  }

  const filters = buildFiltersFromCriteria(criteria)
  const whereClause = buildWhereClause(filters)
  const sql = `DELETE FROM ${quoteIdentifier(tableName)}${whereClause.clause} RETURNING *`

  try {
    return await adapter.rawQuery(sql, { params: whereClause.params } as any)
  } catch (error) {
    throw buildAdminError(`Failed to delete rows from '${tableName}'`, error)
  }
}

function getSqliteAdapter(): SqliteAdapter {
  // First, check if a registered adapter exists (from singleton or factory)
  if (registeredAdapter) {
    return registeredAdapter
  }

  // Fallback to creating adapter from environment variables
  const config = resolveAdminConfig()
  const signature = JSON.stringify(config)

  if (!cachedAdapter || cachedConfigSignature !== signature) {
    const adapter = createHazoConnect({
      type: "sqlite",
      sqlite: {
        database_path: config.databasePath,
        read_only: config.readOnly,
        wasm_directory: config.wasmDirectory
      }
    }) as HazoConnectAdapter

    if (!(adapter instanceof SqliteAdapter)) {
      throw new Error("Unable to initialise SQLite adapter for admin service")
    }

    cachedAdapter = adapter
    cachedConfigSignature = signature
  }

  return cachedAdapter
}

function resolveAdminConfig(): AdminConfig {
  const rawPath =
    process.env.HAZO_CONNECT_SQLITE_PATH || process.env.SQLITE_DATABASE_PATH || ""

  if (!rawPath) {
    throw new Error(
      "Environment variable 'HAZO_CONNECT_SQLITE_PATH' (or 'SQLITE_DATABASE_PATH') is required for the SQLite admin UI."
    )
  }

  const databasePath = path.resolve(rawPath)
  const readOnly = parseBoolean(process.env.HAZO_CONNECT_SQLITE_READONLY)
  const wasmDirectory = process.env.HAZO_CONNECT_SQLITE_WASM_DIR
    ? path.resolve(process.env.HAZO_CONNECT_SQLITE_WASM_DIR)
    : undefined

  return {
    databasePath,
    readOnly,
    wasmDirectory
  }
}

function parseBoolean(value?: string | null): boolean {
  if (!value) {
    return false
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase())
}

// sanitizeTableName and quoteIdentifier are now imported from utils/sqlite-utils

function prepareMutationPayload(data: Record<string, unknown>): {
  columns: string[]
  values: unknown[]
} {
  const entries = Object.entries(data ?? {})
  if (!entries.length) {
    return { columns: [], values: [] }
  }

  const invalidColumns = entries
    .map(([key]) => key)
    .filter(key => {
      try {
        quoteIdentifier(key)
        return false
      } catch {
        return true
      }
    })

  if (invalidColumns.length) {
    throw new Error(
      `Column names contain unsupported characters: ${invalidColumns.join(", ")}`
    )
  }

  const columns = entries.map(([key]) => key)
  const values = entries.map(([, value]) => normalizeValue(value))

  return { columns, values }
}

// buildFiltersFromCriteria is now imported from utils/where-builder

function buildOrderClause(orderBy?: string, direction?: "asc" | "desc"): string {
  if (!orderBy) {
    return ""
  }
  const safeDirection = direction?.toLowerCase() === "desc" ? "DESC" : "ASC"
  return ` ORDER BY ${quoteIdentifier(orderBy)} ${safeDirection}`
}

// buildWhereClause and normalizeValue are now imported from utils/where-builder and utils/sqlite-utils

function validateLimit(rawLimit?: number): number {
  if (rawLimit === undefined || rawLimit === null) {
    return DEFAULT_LIMIT
  }
  if (!Number.isInteger(rawLimit) || rawLimit <= 0) {
    throw new Error("Limit must be a positive integer")
  }
  return rawLimit
}

function buildAdminError(message: string, original: unknown): Error {
  const reason = original instanceof Error ? original.message : String(original)
  return new Error(`${message}: ${reason}`)
}

function logSqliteWarning(context: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[SQLite admin] ${context}:`, error)
  }
}


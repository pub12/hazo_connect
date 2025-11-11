/**
 * Purpose: SQLite adapter powered by sql.js for parity with the PostgREST adapter.
 *
 * The adapter supports in-memory and file-backed databases, translating QueryBuilder
 * instructions into parameterised SQL statements and persisting results when required.
 */

import fs from 'fs'
import path from 'path'
import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js'
import { resolveWasmDirectory, createSqlJsConfig } from '../utils/wasm-resolver'
import { isPlainObject, normalizeValue } from '../utils/sqlite-utils'

import type { HazoConnectAdapter, Logger } from '../types'
import { BaseAdapter } from './base-adapter'
import { QueryBuilder } from '../query-builder'
import { ErrorCode } from '../types'
import {
  SqliteTranslationError,
  translateDelete,
  translateInsert,
  translateSelect,
  translateUpdate,
  type TranslatedQuery
} from '../sqlite/query-translator'

// nodeRequire and WASM resolution moved to wasm-resolver utility

type SqliteAdapterOptions = {
  database_path?: string
  read_only?: boolean
  initial_sql?: string[]
  wasm_directory?: string
}

export class SqliteAdapter extends BaseAdapter implements HazoConnectAdapter {
  private readonly sqliteConfig: SqliteAdapterOptions
  private readonly isReadOnlyMode: boolean
  private readonly wasmDirectory: string
  private readonly sqlJsPromise: Promise<SqlJsStatic>
  private readonly databasePromise: Promise<SqlJsDatabase>
  private dbInstance?: SqlJsDatabase
  private readonly databasePath?: string

  constructor(config: any, logger?: Logger) {
    super(config, logger)

    this.sqliteConfig = this.normalizeConfig(config)
    this.isReadOnlyMode = Boolean(this.sqliteConfig.read_only)
    this.databasePath = this.sqliteConfig.database_path
    this.wasmDirectory = resolveWasmDirectory(this.sqliteConfig)

    if (this.isReadOnlyMode && !this.databasePath) {
      this.throwError(
        ErrorCode.CONFIG_ERROR,
        "SQLite adapter requires 'database_path' when read_only is enabled"
      )
    }

    this.sqlJsPromise = this.loadSqlJs()
    this.databasePromise = this.initializeDatabase()
  }

  async query(
    builder: QueryBuilder,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<any> {
    const normalizedMethod = method.toUpperCase()

    try {
      switch (normalizedMethod) {
        case 'GET':
          return await this.executeSelect(builder)
        case 'POST':
          this.ensureWritable()
          return await this.executeInsert(builder, body)
        case 'PUT':
        case 'PATCH':
          this.ensureWritable()
          return await this.executeUpdate(builder, body)
        case 'DELETE':
          this.ensureWritable()
          return await this.executeDelete(builder)
        default:
          this.throwError(
            ErrorCode.VALIDATION_ERROR,
            `Unsupported method '${method}' for SQLite adapter`
          )
      }
    } catch (error) {
      return this.handleSqliteError(error)
    }
  }

  async rawQuery(
    sql: string,
    options: RequestInit & { params?: unknown[] } = {}
  ): Promise<any> {
    try {
      const params = this.normalizeRawParams((options as any)?.params)
      const mutating = this.isMutatingSql(sql)

      if (mutating) {
        this.ensureWritable()
      }

      const database = await this.getDatabase()
      const rows = this.executeStatement(database, sql, params)

      if (mutating) {
        await this.persistDatabase(database)
      }

      this.logQuery('SQLite raw query', {
        sql,
        params,
        row_count: rows.length
      })

      return rows
    } catch (error) {
      return this.handleSqliteError(error)
    }
  }

  async getConfig(): Promise<any> {
    return { ...this.sqliteConfig }
  }

  // Query execution ---------------------------------------------------------------------------

  private async executeSelect(builder: QueryBuilder): Promise<any[]> {
    const translation = this.translateWithHandling(() => translateSelect(builder))
    const database = await this.getDatabase()
    const rows = this.executeStatements(database, [translation])

    this.logQuery('SQLite select', {
      sql: translation.sql,
      params: translation.params,
      row_count: rows.length
    })

    return rows
  }

  private async executeInsert(
    builder: QueryBuilder,
    body: unknown
  ): Promise<any[]> {
    const payload = this.normalizeInsertBody(body)
    const translation = this.translateWithHandling(() => translateInsert(builder, payload))
    const database = await this.getDatabase()
    const rows = this.executeStatements(database, translation.statements)

    await this.persistDatabase(database)

    this.logQuery('SQLite insert', {
      statements_executed: translation.statements.length,
      row_count: rows.length
    })

    return rows
  }

  private async executeUpdate(
    builder: QueryBuilder,
    body: unknown
  ): Promise<any[]> {
    const updates = this.normalizeUpdateBody(body)
    const translation = this.translateWithHandling(() => translateUpdate(builder, updates))
    const database = await this.getDatabase()
    const rows = this.executeStatements(database, [translation])

    await this.persistDatabase(database)

    this.logQuery('SQLite update', {
      sql: translation.sql,
      params: translation.params,
      row_count: rows.length
    })

    return rows
  }

  private async executeDelete(builder: QueryBuilder): Promise<any[]> {
    const translation = this.translateWithHandling(() => translateDelete(builder))
    const database = await this.getDatabase()
    const rows = this.executeStatements(database, [translation])

    await this.persistDatabase(database)

    this.logQuery('SQLite delete', {
      sql: translation.sql,
      row_count: rows.length
    })

    return rows
  }

  // Database lifecycle -----------------------------------------------------------------------

  private normalizeConfig(config: any): SqliteAdapterOptions {
    const raw = config?.sqlite ? config.sqlite : config

    const initialSqlInput = raw?.initial_sql
    const initialSqlArray = Array.isArray(initialSqlInput)
      ? initialSqlInput
      : initialSqlInput
      ? [initialSqlInput]
      : []

    return {
      database_path: raw?.database_path ? path.resolve(String(raw.database_path)) : undefined,
      read_only: raw?.read_only === true,
      initial_sql: initialSqlArray.map((statement: unknown) => String(statement)).filter(Boolean),
      wasm_directory: raw?.wasm_directory ? path.resolve(String(raw.wasm_directory)) : undefined
    }
  }

  private loadSqlJs(): Promise<SqlJsStatic> {
    const config = createSqlJsConfig(this.wasmDirectory)
    return initSqlJs(config)
  }

  private async initializeDatabase(): Promise<SqlJsDatabase> {
    const SQL = await this.sqlJsPromise
    const databasePath = this.databasePath
    let database: SqlJsDatabase

    const fileExists = Boolean(databasePath && fs.existsSync(databasePath))

    if (fileExists && databasePath) {
      const buffer = await fs.promises.readFile(databasePath)
      database = new SQL.Database(new Uint8Array(buffer))
    } else {
      if (this.isReadOnlyMode && databasePath) {
        this.throwError(
          ErrorCode.CONFIG_ERROR,
          `SQLite database not found at '${databasePath}' while read_only is enabled`
        )
      }

      database = new SQL.Database()

      if (this.sqliteConfig.initial_sql?.length) {
        for (const statement of this.sqliteConfig.initial_sql) {
          database.exec(statement)
        }
      }

      if (databasePath && !this.isReadOnlyMode) {
        await this.persistDatabase(database)
      }
    }

    this.dbInstance = database
    return database
  }

  private async getDatabase(): Promise<SqlJsDatabase> {
    if (this.dbInstance) {
      return this.dbInstance
    }

    this.dbInstance = await this.databasePromise
    return this.dbInstance
  }

  // Statement execution ----------------------------------------------------------------------

  private executeStatements(database: SqlJsDatabase, statements: TranslatedQuery[]): any[] {
    const results: any[] = []

    for (const statement of statements) {
      results.push(...this.executeStatement(database, statement.sql, statement.params))
    }

    return results
  }

  private executeStatement(database: SqlJsDatabase, sql: string, params: unknown[]): any[] {
    let statement: any
    try {
      statement = database.prepare(sql)
      if (params && params.length) {
        statement.bind(params as any[])
      }

      const rows: any[] = []
      while (statement.step()) {
        rows.push(statement.getAsObject())
      }
      return rows
    } catch (error) {
      throw error
    } finally {
      if (statement) {
        statement.free()
      }
    }
  }

  private async persistDatabase(database: SqlJsDatabase): Promise<void> {
    if (!this.databasePath || this.isReadOnlyMode) {
      return
    }

    // Skip persistence for in-memory databases (indicated by :memory: or empty path)
    if (this.databasePath === ":memory:" || !this.databasePath.trim()) {
      return
    }

    const data = database.export()
    const dirPath = path.dirname(this.databasePath)
    
    // Skip persistence if trying to write to root-level directories (likely a misconfiguration)
    // This prevents errors when environment variables point to invalid paths like /tests
    if (path.isAbsolute(dirPath) && dirPath.split(path.sep).filter(Boolean).length === 1) {
      // Path like /tests, /var, etc. - skip persistence to avoid permission errors
      this.logger?.warn(`Skipping database persistence: invalid root-level path ${this.databasePath}`)
      return
    }
    
    // Only create directory if it's not the root directory
    if (dirPath && dirPath !== "/" && dirPath !== "." && dirPath !== path.sep) {
      try {
        await fs.promises.mkdir(dirPath, { recursive: true })
      } catch (error: any) {
        // If it's a permission error or the path is invalid, skip persistence
        if (error.code === "EACCES" || error.code === "EROFS" || error.code === "ENOENT") {
          this.logger?.warn(`Cannot create directory ${dirPath}: ${error.message}. Skipping persistence.`)
          return
        }
        throw error
      }
    }
    
    try {
      await fs.promises.writeFile(this.databasePath, Buffer.from(data))
    } catch (error: any) {
      // If write fails due to permissions or invalid path, log and continue
      if (error.code === "EACCES" || error.code === "EROFS" || error.code === "ENOENT") {
        this.logger?.warn(`Cannot write database file ${this.databasePath}: ${error.message}. Skipping persistence.`)
        return
      }
      throw error
    }
  }

  private ensureWritable() {
    if (this.isReadOnlyMode) {
      this.throwError(
        ErrorCode.CONFIG_ERROR,
        'SQLite database is configured as read-only and cannot accept write operations'
      )
    }
  }

  // Payload helpers --------------------------------------------------------------------------

  private normalizeInsertBody(
    body: unknown
  ): Record<string, unknown> | Array<Record<string, unknown>> {
    if (Array.isArray(body)) {
      if (!body.length) {
        this.throwError(ErrorCode.CONFIG_ERROR, 'Insert payload array cannot be empty')
      }
      return body.map(row => {
        if (!isPlainObject(row)) {
          this.throwError(
            ErrorCode.CONFIG_ERROR,
            'Insert payload array items must be plain objects'
          )
        }
        return row as Record<string, unknown>
      })
    }

    if (isPlainObject(body)) {
      return body as Record<string, unknown>
    }

    this.throwError(ErrorCode.CONFIG_ERROR, 'Insert payload must be an object or array of objects')
  }

  private normalizeUpdateBody(body: unknown): Record<string, unknown> {
    if (!isPlainObject(body)) {
      this.throwError(ErrorCode.CONFIG_ERROR, 'Update payload must be an object')
    }

    const updates = body as Record<string, unknown>
    if (Object.keys(updates).length === 0) {
      this.throwError(ErrorCode.CONFIG_ERROR, 'Update payload must include at least one column')
    }

    return updates
  }

  private normalizeRawParams(params: unknown): unknown[] {
    if (params === undefined || params === null) {
      return []
    }

    if (!Array.isArray(params)) {
      this.throwError(ErrorCode.CONFIG_ERROR, 'SQLite rawQuery params must be an array')
    }

    return params as unknown[]
  }

  private isMutatingSql(sql: string): boolean {
    const keyword = sql.trim().split(/\s+/)[0]?.toUpperCase() ?? ''
    return ['INSERT', 'UPDATE', 'DELETE', 'REPLACE', 'CREATE', 'DROP', 'ALTER'].includes(keyword)
  }

  private translateWithHandling<T>(translate: () => T): T {
    try {
      return translate()
    } catch (error) {
      if (error instanceof SqliteTranslationError) {
        this.throwError(ErrorCode.CONFIG_ERROR, error.message)
      }
      throw error
    }
  }

  private handleSqliteError(error: unknown): never {
    if (error instanceof SqliteTranslationError) {
      this.throwError(ErrorCode.CONFIG_ERROR, error.message)
    }

    if ((error as any)?.code) {
      throw error
    }

    const message = error instanceof Error ? error.message : String(error)
    this.throwError(ErrorCode.QUERY_ERROR, `SQLite request failed: ${message}`, undefined, error)
  }
}

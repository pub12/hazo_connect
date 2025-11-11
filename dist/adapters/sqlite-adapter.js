"use strict";
/**
 * Purpose: SQLite adapter powered by sql.js for parity with the PostgREST adapter.
 *
 * The adapter supports in-memory and file-backed databases, translating QueryBuilder
 * instructions into parameterised SQL statements and persisting results when required.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteAdapter = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sql_js_1 = __importDefault(require("sql.js"));
const wasm_resolver_1 = require("../utils/wasm-resolver");
const sqlite_utils_1 = require("../utils/sqlite-utils");
const base_adapter_1 = require("./base-adapter");
const types_1 = require("../types");
const query_translator_1 = require("../sqlite/query-translator");
class SqliteAdapter extends base_adapter_1.BaseAdapter {
    constructor(config, logger) {
        super(config, logger);
        this.sqliteConfig = this.normalizeConfig(config);
        this.isReadOnlyMode = Boolean(this.sqliteConfig.read_only);
        this.databasePath = this.sqliteConfig.database_path;
        this.wasmDirectory = (0, wasm_resolver_1.resolveWasmDirectory)(this.sqliteConfig);
        if (this.isReadOnlyMode && !this.databasePath) {
            this.throwError(types_1.ErrorCode.CONFIG_ERROR, "SQLite adapter requires 'database_path' when read_only is enabled");
        }
        this.sqlJsPromise = this.loadSqlJs();
        this.databasePromise = this.initializeDatabase();
    }
    async query(builder, method = 'GET', body) {
        const normalizedMethod = method.toUpperCase();
        try {
            switch (normalizedMethod) {
                case 'GET':
                    return await this.executeSelect(builder);
                case 'POST':
                    this.ensureWritable();
                    return await this.executeInsert(builder, body);
                case 'PUT':
                case 'PATCH':
                    this.ensureWritable();
                    return await this.executeUpdate(builder, body);
                case 'DELETE':
                    this.ensureWritable();
                    return await this.executeDelete(builder);
                default:
                    this.throwError(types_1.ErrorCode.VALIDATION_ERROR, `Unsupported method '${method}' for SQLite adapter`);
            }
        }
        catch (error) {
            return this.handleSqliteError(error);
        }
    }
    async rawQuery(sql, options = {}) {
        try {
            const params = this.normalizeRawParams(options?.params);
            const mutating = this.isMutatingSql(sql);
            if (mutating) {
                this.ensureWritable();
            }
            const database = await this.getDatabase();
            const rows = this.executeStatement(database, sql, params);
            if (mutating) {
                await this.persistDatabase(database);
            }
            this.logQuery('SQLite raw query', {
                sql,
                params,
                row_count: rows.length
            });
            return rows;
        }
        catch (error) {
            return this.handleSqliteError(error);
        }
    }
    async getConfig() {
        return { ...this.sqliteConfig };
    }
    // Query execution ---------------------------------------------------------------------------
    async executeSelect(builder) {
        const translation = this.translateWithHandling(() => (0, query_translator_1.translateSelect)(builder));
        const database = await this.getDatabase();
        const rows = this.executeStatements(database, [translation]);
        this.logQuery('SQLite select', {
            sql: translation.sql,
            params: translation.params,
            row_count: rows.length
        });
        return rows;
    }
    async executeInsert(builder, body) {
        const payload = this.normalizeInsertBody(body);
        const translation = this.translateWithHandling(() => (0, query_translator_1.translateInsert)(builder, payload));
        const database = await this.getDatabase();
        const rows = this.executeStatements(database, translation.statements);
        await this.persistDatabase(database);
        this.logQuery('SQLite insert', {
            statements_executed: translation.statements.length,
            row_count: rows.length
        });
        return rows;
    }
    async executeUpdate(builder, body) {
        const updates = this.normalizeUpdateBody(body);
        const translation = this.translateWithHandling(() => (0, query_translator_1.translateUpdate)(builder, updates));
        const database = await this.getDatabase();
        const rows = this.executeStatements(database, [translation]);
        await this.persistDatabase(database);
        this.logQuery('SQLite update', {
            sql: translation.sql,
            params: translation.params,
            row_count: rows.length
        });
        return rows;
    }
    async executeDelete(builder) {
        const translation = this.translateWithHandling(() => (0, query_translator_1.translateDelete)(builder));
        const database = await this.getDatabase();
        const rows = this.executeStatements(database, [translation]);
        await this.persistDatabase(database);
        this.logQuery('SQLite delete', {
            sql: translation.sql,
            row_count: rows.length
        });
        return rows;
    }
    // Database lifecycle -----------------------------------------------------------------------
    normalizeConfig(config) {
        const raw = config?.sqlite ? config.sqlite : config;
        const initialSqlInput = raw?.initial_sql;
        const initialSqlArray = Array.isArray(initialSqlInput)
            ? initialSqlInput
            : initialSqlInput
                ? [initialSqlInput]
                : [];
        return {
            database_path: raw?.database_path ? path_1.default.resolve(String(raw.database_path)) : undefined,
            read_only: raw?.read_only === true,
            initial_sql: initialSqlArray.map((statement) => String(statement)).filter(Boolean),
            wasm_directory: raw?.wasm_directory ? path_1.default.resolve(String(raw.wasm_directory)) : undefined
        };
    }
    loadSqlJs() {
        const config = (0, wasm_resolver_1.createSqlJsConfig)(this.wasmDirectory);
        return (0, sql_js_1.default)(config);
    }
    async initializeDatabase() {
        const SQL = await this.sqlJsPromise;
        const databasePath = this.databasePath;
        let database;
        const fileExists = Boolean(databasePath && fs_1.default.existsSync(databasePath));
        if (fileExists && databasePath) {
            const buffer = await fs_1.default.promises.readFile(databasePath);
            database = new SQL.Database(new Uint8Array(buffer));
        }
        else {
            if (this.isReadOnlyMode && databasePath) {
                this.throwError(types_1.ErrorCode.CONFIG_ERROR, `SQLite database not found at '${databasePath}' while read_only is enabled`);
            }
            database = new SQL.Database();
            if (this.sqliteConfig.initial_sql?.length) {
                for (const statement of this.sqliteConfig.initial_sql) {
                    database.exec(statement);
                }
            }
            if (databasePath && !this.isReadOnlyMode) {
                await this.persistDatabase(database);
            }
        }
        this.dbInstance = database;
        return database;
    }
    async getDatabase() {
        if (this.dbInstance) {
            return this.dbInstance;
        }
        this.dbInstance = await this.databasePromise;
        return this.dbInstance;
    }
    // Statement execution ----------------------------------------------------------------------
    executeStatements(database, statements) {
        const results = [];
        for (const statement of statements) {
            results.push(...this.executeStatement(database, statement.sql, statement.params));
        }
        return results;
    }
    executeStatement(database, sql, params) {
        let statement;
        try {
            statement = database.prepare(sql);
            if (params && params.length) {
                statement.bind(params);
            }
            const rows = [];
            while (statement.step()) {
                rows.push(statement.getAsObject());
            }
            return rows;
        }
        catch (error) {
            throw error;
        }
        finally {
            if (statement) {
                statement.free();
            }
        }
    }
    async persistDatabase(database) {
        if (!this.databasePath || this.isReadOnlyMode) {
            return;
        }
        // Skip persistence for in-memory databases (indicated by :memory: or empty path)
        if (this.databasePath === ":memory:" || !this.databasePath.trim()) {
            return;
        }
        const data = database.export();
        const dirPath = path_1.default.dirname(this.databasePath);
        // Skip persistence if trying to write to root-level directories (likely a misconfiguration)
        // This prevents errors when environment variables point to invalid paths like /tests
        if (path_1.default.isAbsolute(dirPath) && dirPath.split(path_1.default.sep).filter(Boolean).length === 1) {
            // Path like /tests, /var, etc. - skip persistence to avoid permission errors
            this.logger?.warn(`Skipping database persistence: invalid root-level path ${this.databasePath}`);
            return;
        }
        // Only create directory if it's not the root directory
        if (dirPath && dirPath !== "/" && dirPath !== "." && dirPath !== path_1.default.sep) {
            try {
                await fs_1.default.promises.mkdir(dirPath, { recursive: true });
            }
            catch (error) {
                // If it's a permission error or the path is invalid, skip persistence
                if (error.code === "EACCES" || error.code === "EROFS" || error.code === "ENOENT") {
                    this.logger?.warn(`Cannot create directory ${dirPath}: ${error.message}. Skipping persistence.`);
                    return;
                }
                throw error;
            }
        }
        try {
            await fs_1.default.promises.writeFile(this.databasePath, Buffer.from(data));
        }
        catch (error) {
            // If write fails due to permissions or invalid path, log and continue
            if (error.code === "EACCES" || error.code === "EROFS" || error.code === "ENOENT") {
                this.logger?.warn(`Cannot write database file ${this.databasePath}: ${error.message}. Skipping persistence.`);
                return;
            }
            throw error;
        }
    }
    ensureWritable() {
        if (this.isReadOnlyMode) {
            this.throwError(types_1.ErrorCode.CONFIG_ERROR, 'SQLite database is configured as read-only and cannot accept write operations');
        }
    }
    // Payload helpers --------------------------------------------------------------------------
    normalizeInsertBody(body) {
        if (Array.isArray(body)) {
            if (!body.length) {
                this.throwError(types_1.ErrorCode.CONFIG_ERROR, 'Insert payload array cannot be empty');
            }
            return body.map(row => {
                if (!(0, sqlite_utils_1.isPlainObject)(row)) {
                    this.throwError(types_1.ErrorCode.CONFIG_ERROR, 'Insert payload array items must be plain objects');
                }
                return row;
            });
        }
        if ((0, sqlite_utils_1.isPlainObject)(body)) {
            return body;
        }
        this.throwError(types_1.ErrorCode.CONFIG_ERROR, 'Insert payload must be an object or array of objects');
    }
    normalizeUpdateBody(body) {
        if (!(0, sqlite_utils_1.isPlainObject)(body)) {
            this.throwError(types_1.ErrorCode.CONFIG_ERROR, 'Update payload must be an object');
        }
        const updates = body;
        if (Object.keys(updates).length === 0) {
            this.throwError(types_1.ErrorCode.CONFIG_ERROR, 'Update payload must include at least one column');
        }
        return updates;
    }
    normalizeRawParams(params) {
        if (params === undefined || params === null) {
            return [];
        }
        if (!Array.isArray(params)) {
            this.throwError(types_1.ErrorCode.CONFIG_ERROR, 'SQLite rawQuery params must be an array');
        }
        return params;
    }
    isMutatingSql(sql) {
        const keyword = sql.trim().split(/\s+/)[0]?.toUpperCase() ?? '';
        return ['INSERT', 'UPDATE', 'DELETE', 'REPLACE', 'CREATE', 'DROP', 'ALTER'].includes(keyword);
    }
    translateWithHandling(translate) {
        try {
            return translate();
        }
        catch (error) {
            if (error instanceof query_translator_1.SqliteTranslationError) {
                this.throwError(types_1.ErrorCode.CONFIG_ERROR, error.message);
            }
            throw error;
        }
    }
    handleSqliteError(error) {
        if (error instanceof query_translator_1.SqliteTranslationError) {
            this.throwError(types_1.ErrorCode.CONFIG_ERROR, error.message);
        }
        if (error?.code) {
            throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        this.throwError(types_1.ErrorCode.QUERY_ERROR, `SQLite request failed: ${message}`, undefined, error);
    }
}
exports.SqliteAdapter = SqliteAdapter;
//# sourceMappingURL=sqlite-adapter.js.map
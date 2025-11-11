"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAdminService = initializeAdminService;
exports.registerSqliteAdapter = registerSqliteAdapter;
exports.clearRegisteredAdapter = clearRegisteredAdapter;
exports.getSqliteAdminService = getSqliteAdminService;
// admin-service.ts exposes helper utilities for browsing and mutating SQLite databases.
const path_1 = __importDefault(require("path"));
const factory_1 = require("../factory");
const sqlite_adapter_1 = require("../adapters/sqlite-adapter");
const sqlite_utils_1 = require("../utils/sqlite-utils");
const where_builder_1 = require("../utils/where-builder");
const DEFAULT_LIMIT = 50;
let cachedAdapter = null;
let cachedConfigSignature = null;
let adminUiEnabled = false;
let registeredAdapter = null;
/**
 * Initialize the admin service with configuration
 * This must be called before using the admin UI
 * @param config - HazoConnectConfig with enable_admin_ui flag
 */
function initializeAdminService(config) {
    adminUiEnabled = config.enable_admin_ui === true;
}
/**
 * Register a SQLite adapter instance to be used by the admin service
 * This allows the admin UI to use the same adapter instance as the backend
 * Registering an adapter also enables the admin UI
 * @param adapter - The SqliteAdapter instance to register
 */
function registerSqliteAdapter(adapter) {
    registeredAdapter = adapter;
    // Also update cached adapter to avoid creating a new one
    cachedAdapter = adapter;
    // Set a special signature to indicate this is a registered adapter
    cachedConfigSignature = "__registered__";
    // Enable admin UI when adapter is registered (implies admin UI should be available)
    adminUiEnabled = true;
}
/**
 * Clear the registered adapter (useful for testing)
 * @internal
 */
function clearRegisteredAdapter() {
    registeredAdapter = null;
    cachedAdapter = null;
    cachedConfigSignature = null;
}
/**
 * Check if admin UI is enabled
 * Checks both the initialized flag and environment variable as fallback
 * @throws Error if admin UI is not enabled
 */
function ensureAdminUiEnabled() {
    // Check environment variable as fallback
    const envEnabled = process.env.HAZO_CONNECT_ENABLE_ADMIN_UI === "true" ||
        process.env.ENABLE_SQLITE_ADMIN_UI === "true";
    if (!adminUiEnabled && !envEnabled) {
        throw new Error("SQLite admin UI is not enabled. " +
            "To enable it:\n" +
            "1. Set 'enable_admin_ui: true' when creating the adapter:\n" +
            "   createHazoConnect({ type: 'sqlite', enable_admin_ui: true, ... })\n" +
            "2. Or set HAZO_CONNECT_ENABLE_ADMIN_UI=true environment variable\n" +
            "3. Restart your development server after making changes\n" +
            "See https://github.com/pub12/hazo_connect for more information.");
    }
}
function getSqliteAdminService() {
    ensureAdminUiEnabled();
    return {
        listTables,
        getTableSchema,
        getTableData,
        insertRow,
        updateRows,
        deleteRows
    };
}
async function listTables() {
    const adapter = getSqliteAdapter();
    try {
        const records = await adapter.rawQuery("SELECT name, type FROM sqlite_master WHERE (type='table' OR type='view') AND name NOT LIKE 'sqlite_%' ORDER BY name");
        const summaries = [];
        for (const record of records) {
            const name = String(record.name);
            const type = record.type || "table";
            let rowCount = null;
            if (type === "table") {
                try {
                    const countResult = await adapter.rawQuery(`SELECT COUNT(*) AS total FROM ${(0, sqlite_utils_1.quoteIdentifier)(name)}`);
                    rowCount = Number(countResult[0]?.total ?? 0);
                }
                catch (error) {
                    rowCount = null;
                    logSqliteWarning("Failed to compute row count", error);
                }
            }
            summaries.push({
                name,
                type,
                row_count: rowCount
            });
        }
        return summaries;
    }
    catch (error) {
        throw buildAdminError("Failed to list SQLite tables", error);
    }
}
async function getTableSchema(table) {
    const adapter = getSqliteAdapter();
    const tableName = (0, sqlite_utils_1.sanitizeTableName)(table);
    try {
        const columnsRaw = await adapter.rawQuery(`PRAGMA table_info(${(0, sqlite_utils_1.quoteIdentifier)(tableName)})`);
        const foreignKeysRaw = await adapter.rawQuery(`PRAGMA foreign_key_list(${(0, sqlite_utils_1.quoteIdentifier)(tableName)})`);
        const columns = columnsRaw.map((column) => ({
            cid: Number(column.cid),
            name: String(column.name),
            type: String(column.type ?? ""),
            notnull: Boolean(column.notnull),
            default_value: column.dflt_value ?? null,
            primary_key_position: Number(column.pk)
        }));
        const foreignKeys = foreignKeysRaw.map((fk) => ({
            id: Number(fk.id),
            seq: Number(fk.seq),
            table: String(fk.table),
            from: String(fk.from),
            to: String(fk.to),
            on_update: String(fk.on_update ?? ""),
            on_delete: String(fk.on_delete ?? ""),
            match: String(fk.match ?? "")
        }));
        return { columns, foreign_keys: foreignKeys };
    }
    catch (error) {
        throw buildAdminError(`Failed to fetch schema for table '${tableName}'`, error);
    }
}
async function getTableData(table, options = {}) {
    const adapter = getSqliteAdapter();
    const tableName = (0, sqlite_utils_1.sanitizeTableName)(table);
    const limit = validateLimit(options.limit);
    const offset = Math.max(0, options.offset ?? 0);
    const orderClause = buildOrderClause(options.order_by, options.order_direction);
    const whereClause = (0, where_builder_1.buildWhereClause)(options.filters ?? []);
    try {
        const sql = `SELECT * FROM ${(0, sqlite_utils_1.quoteIdentifier)(tableName)}${whereClause.clause}${orderClause} LIMIT ${limit} OFFSET ${offset}`;
        const rows = await adapter.rawQuery(sql, { params: whereClause.params });
        const countSql = `SELECT COUNT(*) AS total FROM ${(0, sqlite_utils_1.quoteIdentifier)(tableName)}${whereClause.clause}`;
        const totalResult = await adapter.rawQuery(countSql, { params: whereClause.params });
        const total = Number(totalResult[0]?.total ?? 0);
        return { rows, total };
    }
    catch (error) {
        throw buildAdminError(`Failed to fetch data for table '${tableName}'`, error);
    }
}
async function insertRow(table, data) {
    const adapter = getSqliteAdapter();
    const tableName = (0, sqlite_utils_1.sanitizeTableName)(table);
    const { columns, values } = prepareMutationPayload(data);
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO ${(0, sqlite_utils_1.quoteIdentifier)(tableName)} (${columns
        .map(sqlite_utils_1.quoteIdentifier)
        .join(", ")}) VALUES (${placeholders}) RETURNING *`;
    try {
        const rows = await adapter.rawQuery(sql, { params: values });
        return rows[0] ?? {};
    }
    catch (error) {
        throw buildAdminError(`Failed to insert row into '${tableName}'`, error);
    }
}
async function updateRows(table, criteria, data) {
    const adapter = getSqliteAdapter();
    const tableName = (0, sqlite_utils_1.sanitizeTableName)(table);
    if (!Object.keys(criteria).length) {
        throw new Error("Update criteria must include at least one column");
    }
    const { columns, values } = prepareMutationPayload(data);
    if (!columns.length) {
        throw new Error("Update payload must include at least one column");
    }
    const filters = (0, where_builder_1.buildFiltersFromCriteria)(criteria);
    const whereClause = (0, where_builder_1.buildWhereClause)(filters);
    const setClause = columns.map(column => `${(0, sqlite_utils_1.quoteIdentifier)(column)} = ?`).join(", ");
    const sql = `UPDATE ${(0, sqlite_utils_1.quoteIdentifier)(tableName)} SET ${setClause}${whereClause.clause} RETURNING *`;
    const params = [...values, ...whereClause.params];
    try {
        return await adapter.rawQuery(sql, { params });
    }
    catch (error) {
        throw buildAdminError(`Failed to update rows in '${tableName}'`, error);
    }
}
async function deleteRows(table, criteria) {
    const adapter = getSqliteAdapter();
    const tableName = (0, sqlite_utils_1.sanitizeTableName)(table);
    if (!Object.keys(criteria).length) {
        throw new Error("Delete criteria must include at least one column");
    }
    const filters = (0, where_builder_1.buildFiltersFromCriteria)(criteria);
    const whereClause = (0, where_builder_1.buildWhereClause)(filters);
    const sql = `DELETE FROM ${(0, sqlite_utils_1.quoteIdentifier)(tableName)}${whereClause.clause} RETURNING *`;
    try {
        return await adapter.rawQuery(sql, { params: whereClause.params });
    }
    catch (error) {
        throw buildAdminError(`Failed to delete rows from '${tableName}'`, error);
    }
}
function getSqliteAdapter() {
    // First, check if a registered adapter exists (from singleton or factory)
    if (registeredAdapter) {
        return registeredAdapter;
    }
    // Fallback to creating adapter from environment variables
    const config = resolveAdminConfig();
    const signature = JSON.stringify(config);
    if (!cachedAdapter || cachedConfigSignature !== signature) {
        const adapter = (0, factory_1.createHazoConnect)({
            type: "sqlite",
            sqlite: {
                database_path: config.databasePath,
                read_only: config.readOnly,
                wasm_directory: config.wasmDirectory
            }
        });
        if (!(adapter instanceof sqlite_adapter_1.SqliteAdapter)) {
            throw new Error("Unable to initialise SQLite adapter for admin service");
        }
        cachedAdapter = adapter;
        cachedConfigSignature = signature;
    }
    return cachedAdapter;
}
function resolveAdminConfig() {
    const rawPath = process.env.HAZO_CONNECT_SQLITE_PATH || process.env.SQLITE_DATABASE_PATH || "";
    if (!rawPath) {
        throw new Error("Environment variable 'HAZO_CONNECT_SQLITE_PATH' (or 'SQLITE_DATABASE_PATH') is required for the SQLite admin UI.");
    }
    const databasePath = path_1.default.resolve(rawPath);
    const readOnly = parseBoolean(process.env.HAZO_CONNECT_SQLITE_READONLY);
    const wasmDirectory = process.env.HAZO_CONNECT_SQLITE_WASM_DIR
        ? path_1.default.resolve(process.env.HAZO_CONNECT_SQLITE_WASM_DIR)
        : undefined;
    return {
        databasePath,
        readOnly,
        wasmDirectory
    };
}
function parseBoolean(value) {
    if (!value) {
        return false;
    }
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}
// sanitizeTableName and quoteIdentifier are now imported from utils/sqlite-utils
function prepareMutationPayload(data) {
    const entries = Object.entries(data ?? {});
    if (!entries.length) {
        return { columns: [], values: [] };
    }
    const invalidColumns = entries
        .map(([key]) => key)
        .filter(key => {
        try {
            (0, sqlite_utils_1.quoteIdentifier)(key);
            return false;
        }
        catch {
            return true;
        }
    });
    if (invalidColumns.length) {
        throw new Error(`Column names contain unsupported characters: ${invalidColumns.join(", ")}`);
    }
    const columns = entries.map(([key]) => key);
    const values = entries.map(([, value]) => (0, sqlite_utils_1.normalizeValue)(value));
    return { columns, values };
}
// buildFiltersFromCriteria is now imported from utils/where-builder
function buildOrderClause(orderBy, direction) {
    if (!orderBy) {
        return "";
    }
    const safeDirection = direction?.toLowerCase() === "desc" ? "DESC" : "ASC";
    return ` ORDER BY ${(0, sqlite_utils_1.quoteIdentifier)(orderBy)} ${safeDirection}`;
}
// buildWhereClause and normalizeValue are now imported from utils/where-builder and utils/sqlite-utils
function validateLimit(rawLimit) {
    if (rawLimit === undefined || rawLimit === null) {
        return DEFAULT_LIMIT;
    }
    if (!Number.isInteger(rawLimit) || rawLimit <= 0) {
        throw new Error("Limit must be a positive integer");
    }
    return rawLimit;
}
function buildAdminError(message, original) {
    const reason = original instanceof Error ? original.message : String(original);
    return new Error(`${message}: ${reason}`);
}
function logSqliteWarning(context, error) {
    if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(`[SQLite admin] ${context}:`, error);
    }
}
//# sourceMappingURL=admin-service.js.map
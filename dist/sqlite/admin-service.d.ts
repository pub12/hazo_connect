import { SqliteAdapter } from "../adapters/sqlite-adapter";
import { type SqliteWhereFilter } from "../utils/where-builder";
export type SqliteTableType = "table" | "view";
export interface TableSummary {
    name: string;
    type: SqliteTableType;
    row_count: number | null;
}
export interface TableColumn {
    cid: number;
    name: string;
    type: string;
    notnull: boolean;
    default_value: unknown;
    primary_key_position: number;
}
export interface TableForeignKey {
    id: number;
    seq: number;
    table: string;
    from: string;
    to: string;
    on_update: string;
    on_delete: string;
    match: string;
}
export interface TableSchema {
    columns: TableColumn[];
    foreign_keys: TableForeignKey[];
}
export type { SqliteFilterOperator, SqliteWhereFilter } from "../utils/where-builder";
export interface RowQueryOptions {
    limit?: number;
    offset?: number;
    order_by?: string;
    order_direction?: "asc" | "desc";
    filters?: SqliteWhereFilter[];
}
export interface RowPage {
    rows: Record<string, unknown>[];
    total: number;
}
export interface SqliteAdminService {
    listTables(): Promise<TableSummary[]>;
    getTableSchema(table: string): Promise<TableSchema>;
    getTableData(table: string, options?: RowQueryOptions): Promise<RowPage>;
    insertRow(table: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
    updateRows(table: string, criteria: Record<string, unknown>, data: Record<string, unknown>): Promise<Record<string, unknown>[]>;
    deleteRows(table: string, criteria: Record<string, unknown>): Promise<Record<string, unknown>[]>;
}
/**
 * Initialize the admin service with configuration
 * This must be called before using the admin UI
 * @param config - HazoConnectConfig with enable_admin_ui flag
 */
export declare function initializeAdminService(config: {
    enable_admin_ui?: boolean;
}): void;
/**
 * Register a SQLite adapter instance to be used by the admin service
 * This allows the admin UI to use the same adapter instance as the backend
 * @param adapter - The SqliteAdapter instance to register
 */
export declare function registerSqliteAdapter(adapter: SqliteAdapter): void;
export declare function getSqliteAdminService(): SqliteAdminService;
//# sourceMappingURL=admin-service.d.ts.map
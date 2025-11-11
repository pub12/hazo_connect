/**
 * Purpose: SQLite adapter powered by sql.js for parity with the PostgREST adapter.
 *
 * The adapter supports in-memory and file-backed databases, translating QueryBuilder
 * instructions into parameterised SQL statements and persisting results when required.
 */
import type { HazoConnectAdapter, Logger } from '../types';
import { BaseAdapter } from './base-adapter';
import { QueryBuilder } from '../query-builder';
export declare class SqliteAdapter extends BaseAdapter implements HazoConnectAdapter {
    private readonly sqliteConfig;
    private readonly isReadOnlyMode;
    private readonly wasmDirectory;
    private readonly sqlJsPromise;
    private readonly databasePromise;
    private dbInstance?;
    private readonly databasePath?;
    constructor(config: any, logger?: Logger);
    query(builder: QueryBuilder, method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown): Promise<any>;
    rawQuery(sql: string, options?: RequestInit & {
        params?: unknown[];
    }): Promise<any>;
    getConfig(): Promise<any>;
    private executeSelect;
    private executeInsert;
    private executeUpdate;
    private executeDelete;
    private normalizeConfig;
    private loadSqlJs;
    private initializeDatabase;
    private getDatabase;
    private executeStatements;
    private executeStatement;
    private persistDatabase;
    private ensureWritable;
    private normalizeInsertBody;
    private normalizeUpdateBody;
    private normalizeRawParams;
    private isMutatingSql;
    private translateWithHandling;
    private handleSqliteError;
}
//# sourceMappingURL=sqlite-adapter.d.ts.map
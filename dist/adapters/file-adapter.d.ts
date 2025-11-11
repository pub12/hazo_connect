/**
 * Purpose: File-based storage adapter stub
 *
 * This adapter will support file-based storage (JSON files).
 * Currently returns NotImplementedError.
 *
 * Expected config structure:
 * {
 *   file: {
 *     base_path: string,     // Base directory for data files
 *     file_format: 'json',    // File format (currently only JSON)
 *     table_to_file?: (table: string) => string  // Optional function to map table to filename
 *   }
 * }
 */
import type { HazoConnectAdapter, Logger } from '../types';
import { BaseAdapter } from './base-adapter';
import { QueryBuilder } from '../query-builder';
/**
 * File adapter implementation (stub)
 */
export declare class FileAdapter extends BaseAdapter implements HazoConnectAdapter {
    /**
     * Constructor
     * @param config - File storage configuration
     * @param logger - Optional logger instance
     */
    constructor(config: any, logger?: Logger);
    /**
     * Execute a query using the query builder
     * @param builder - QueryBuilder instance
     * @param method - HTTP method
     * @param body - Request body
     * @returns Promise with query results
     */
    query(builder: QueryBuilder, method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: any): Promise<any>;
    /**
     * Execute a raw query
     * @param endpoint - Raw endpoint string (not applicable for file storage)
     * @param options - Request options
     * @returns Promise with query results
     */
    rawQuery(endpoint: string, options?: RequestInit): Promise<any>;
    /**
     * Get the adapter's configuration
     * @returns Promise with adapter-specific config
     */
    getConfig(): Promise<any>;
}
//# sourceMappingURL=file-adapter.d.ts.map
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const types_1 = require("../types");
/**
 * File adapter implementation (stub)
 */
class FileAdapter extends base_adapter_1.BaseAdapter {
    /**
     * Constructor
     * @param config - File storage configuration
     * @param logger - Optional logger instance
     */
    constructor(config, logger) {
        super(config, logger);
        // TODO: Validate file config when implemented
    }
    /**
     * Execute a query using the query builder
     * @param builder - QueryBuilder instance
     * @param method - HTTP method
     * @param body - Request body
     * @returns Promise with query results
     */
    async query(builder, method = 'GET', body) {
        this.throwError(types_1.ErrorCode.NOT_IMPLEMENTED, 'File adapter is not yet implemented. Please use PostgREST adapter for now.');
    }
    /**
     * Execute a raw query
     * @param endpoint - Raw endpoint string (not applicable for file storage)
     * @param options - Request options
     * @returns Promise with query results
     */
    async rawQuery(endpoint, options = {}) {
        this.throwError(types_1.ErrorCode.NOT_IMPLEMENTED, 'File adapter is not yet implemented. Please use PostgREST adapter for now.');
    }
    /**
     * Get the adapter's configuration
     * @returns Promise with adapter-specific config
     */
    async getConfig() {
        return Promise.resolve(this.config.file || this.config);
    }
}
exports.FileAdapter = FileAdapter;
//# sourceMappingURL=file-adapter.js.map
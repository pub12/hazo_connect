"use strict";
/**
 * Purpose: Supabase adapter stub
 *
 * This adapter will support Supabase database connections.
 * Currently returns NotImplementedError.
 *
 * Expected config structure:
 * {
 *   supabase: {
 *     url: string,        // Supabase project URL
 *     anon_key: string,  // Supabase anonymous key
 *     service_role_key?: string  // Optional service role key
 *   }
 * }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const types_1 = require("../types");
/**
 * Supabase adapter implementation (stub)
 */
class SupabaseAdapter extends base_adapter_1.BaseAdapter {
    /**
     * Constructor
     * @param config - Supabase configuration
     * @param logger - Optional logger instance
     */
    constructor(config, logger) {
        super(config, logger);
        // TODO: Validate Supabase config when implemented
    }
    /**
     * Execute a query using the query builder
     * @param builder - QueryBuilder instance
     * @param method - HTTP method
     * @param body - Request body
     * @returns Promise with query results
     */
    async query(builder, method = 'GET', body) {
        this.throwError(types_1.ErrorCode.NOT_IMPLEMENTED, 'Supabase adapter is not yet implemented. Please use PostgREST adapter for now.');
    }
    /**
     * Execute a raw query
     * @param endpoint - Raw endpoint string
     * @param options - Request options
     * @returns Promise with query results
     */
    async rawQuery(endpoint, options = {}) {
        this.throwError(types_1.ErrorCode.NOT_IMPLEMENTED, 'Supabase adapter is not yet implemented. Please use PostgREST adapter for now.');
    }
    /**
     * Get the adapter's configuration
     * @returns Promise with adapter-specific config
     */
    async getConfig() {
        return Promise.resolve(this.config.supabase || this.config);
    }
}
exports.SupabaseAdapter = SupabaseAdapter;
//# sourceMappingURL=supabase-adapter.js.map
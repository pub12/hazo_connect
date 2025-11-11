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
import type { HazoConnectAdapter, Logger } from '../types';
import { BaseAdapter } from './base-adapter';
import { QueryBuilder } from '../query-builder';
/**
 * Supabase adapter implementation (stub)
 */
export declare class SupabaseAdapter extends BaseAdapter implements HazoConnectAdapter {
    /**
     * Constructor
     * @param config - Supabase configuration
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
     * @param endpoint - Raw endpoint string
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
//# sourceMappingURL=supabase-adapter.d.ts.map
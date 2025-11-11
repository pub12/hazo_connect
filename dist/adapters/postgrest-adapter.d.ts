/**
 * Purpose: PostgREST adapter implementation
 *
 * This adapter converts QueryBuilder to PostgREST URL format and executes queries.
 * Uses injected config and logger (no file reading or project dependencies).
 * Zero dependencies - only Node.js built-ins (fetch) and types.
 */
import type { HazoConnectAdapter, Logger } from '../types';
import { BaseAdapter } from './base-adapter';
import { QueryBuilder } from '../query-builder';
/**
 * PostgREST adapter configuration
 */
interface PostgrestConfig {
    base_url: string;
    api_key: string;
}
/**
 * PostgREST adapter implementation
 */
export declare class PostgrestAdapter extends BaseAdapter implements HazoConnectAdapter {
    private postgrestConfig;
    /**
     * Constructor
     * @param config - PostgREST configuration (must include postgrest.base_url and postgrest.api_key)
     * @param logger - Optional logger instance
     */
    constructor(config: any, logger?: Logger);
    /**
     * Convert QueryBuilder to PostgREST URL
     * @param builder - QueryBuilder instance
     * @returns PostgREST endpoint URL with query parameters
     */
    private buildPostgrestUrl;
    /**
     * Execute a query using the query builder
     * @param builder - QueryBuilder instance
     * @param method - HTTP method
     * @param body - Request body for POST/PUT/PATCH
     * @returns Promise with query results
     */
    query(builder: QueryBuilder, method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: any): Promise<any>;
    /**
     * Execute a raw query (for backward compatibility)
     * @param endpoint - Raw endpoint string (e.g., '/table?id=eq.123')
     * @param options - Request options
     * @returns Promise with query results
     */
    rawQuery(endpoint: string, options?: RequestInit): Promise<any>;
    /**
     * Get the adapter's configuration
     * @returns Promise with adapter-specific config
     */
    getConfig(): Promise<PostgrestConfig>;
    private parseErrorPayload;
    private buildFriendlyErrorMessage;
    private sanitizeUrl;
}
export {};
//# sourceMappingURL=postgrest-adapter.d.ts.map
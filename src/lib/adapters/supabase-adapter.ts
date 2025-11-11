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

import type { HazoConnectAdapter, Logger } from '../types'
import { BaseAdapter } from './base-adapter'
import { QueryBuilder } from '../query-builder'
import { ErrorCode } from '../types'

/**
 * Supabase adapter implementation (stub)
 */
export class SupabaseAdapter extends BaseAdapter implements HazoConnectAdapter {
  /**
   * Constructor
   * @param config - Supabase configuration
   * @param logger - Optional logger instance
   */
  constructor(config: any, logger?: Logger) {
    super(config, logger)
    // TODO: Validate Supabase config when implemented
  }

  /**
   * Execute a query using the query builder
   * @param builder - QueryBuilder instance
   * @param method - HTTP method
   * @param body - Request body
   * @returns Promise with query results
   */
  async query(
    builder: QueryBuilder,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    this.throwError(
      ErrorCode.NOT_IMPLEMENTED,
      'Supabase adapter is not yet implemented. Please use PostgREST adapter for now.'
    )
  }

  /**
   * Execute a raw query
   * @param endpoint - Raw endpoint string
   * @param options - Request options
   * @returns Promise with query results
   */
  async rawQuery(endpoint: string, options: RequestInit = {}): Promise<any> {
    this.throwError(
      ErrorCode.NOT_IMPLEMENTED,
      'Supabase adapter is not yet implemented. Please use PostgREST adapter for now.'
    )
  }

  /**
   * Get the adapter's configuration
   * @returns Promise with adapter-specific config
   */
  async getConfig(): Promise<any> {
    return Promise.resolve(this.config.supabase || this.config)
  }
}


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

import type { HazoConnectAdapter, Logger } from '../types'
import { BaseAdapter } from './base-adapter'
import { QueryBuilder } from '../query-builder'
import { ErrorCode } from '../types'

/**
 * File adapter implementation (stub)
 */
export class FileAdapter extends BaseAdapter implements HazoConnectAdapter {
  /**
   * Constructor
   * @param config - File storage configuration
   * @param logger - Optional logger instance
   */
  constructor(config: any, logger?: Logger) {
    super(config, logger)
    // TODO: Validate file config when implemented
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
      'File adapter is not yet implemented. Please use PostgREST adapter for now.'
    )
  }

  /**
   * Execute a raw query
   * @param endpoint - Raw endpoint string (not applicable for file storage)
   * @param options - Request options
   * @returns Promise with query results
   */
  async rawQuery(endpoint: string, options: RequestInit = {}): Promise<any> {
    this.throwError(
      ErrorCode.NOT_IMPLEMENTED,
      'File adapter is not yet implemented. Please use PostgREST adapter for now.'
    )
  }

  /**
   * Get the adapter's configuration
   * @returns Promise with adapter-specific config
   */
  async getConfig(): Promise<any> {
    return Promise.resolve(this.config.file || this.config)
  }
}


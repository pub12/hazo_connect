/**
 * Purpose: Abstract base adapter class with common error handling
 * 
 * This file provides a base class for all database adapters.
 * Includes common error handling and optional logger support.
 * Zero dependencies - only Node.js built-ins and types.
 */

import type { Logger, HazoConnectError } from '../types'
import { noOpLogger, ErrorCode } from '../types'

/**
 * Abstract base adapter class
 * All adapters should extend this class
 */
export abstract class BaseAdapter {
  protected logger: Logger
  protected config: any

  /**
   * Constructor
   * @param config - Adapter-specific configuration
   * @param logger - Optional logger instance
   */
  constructor(config: any, logger?: Logger) {
    this.config = config
    this.logger = logger || noOpLogger
  }

  /**
   * Create a standardized error object
   * @param code - Error code
   * @param message - Error message
   * @param statusCode - Optional HTTP status code
   * @param originalError - Optional original error
   * @returns HazoConnectError object
   */
  protected createError(
    code: ErrorCode,
    message: string,
    statusCode?: number,
    originalError?: any
  ): HazoConnectError {
    // Convert enum to string to ensure it's serializable
    const codeString = String(code)
    
    const error: HazoConnectError = {
      code: codeString,
      message,
      statusCode,
      originalError
    }

    // Log the error
    this.logger.error(`[${codeString}] ${message}`, {
      code: codeString,
      message,
      statusCode,
      originalError: originalError instanceof Error ? originalError.message : String(originalError)
    })

    return error
  }

  /**
   * Throw a standardized error
   * @param code - Error code
   * @param message - Error message
   * @param statusCode - Optional HTTP status code
   * @param originalError - Optional original error
   */
  protected throwError(
    code: ErrorCode,
    message: string,
    statusCode?: number,
    originalError?: any
  ): never {
    const error = this.createError(code, message, statusCode, originalError)
    const err: any = new Error(message)
    // Convert enum to string to ensure it's serializable
    err.code = String(code)
    err.statusCode = statusCode
    // Only include serializable error info
    err.originalError = originalError instanceof Error 
      ? originalError.message 
      : (typeof originalError === 'object' ? JSON.stringify(originalError) : String(originalError))
    throw err
  }

  /**
   * Detect if an error is a connection failure
   * @param error - Error to check
   * @returns True if connection failure
   */
  protected isConnectionError(error: any): boolean {
    if (!error) return false
    
    const message = error.message || String(error)
    return (
      message.includes('fetch failed') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND') ||
      message.includes('ETIMEDOUT') ||
      message.includes('Lost connection')
    )
  }

  /**
   * Handle connection errors
   * @param error - Error to handle
   */
  protected handleConnectionError(error: any): never {
    if (this.isConnectionError(error)) {
      this.throwError(
        ErrorCode.CONNECTION_FAILED,
        'Lost connection to database',
        undefined,
        error
      )
    }
    throw error
  }

  /**
   * Validate configuration
   * @param requiredFields - Array of required field names
   * @throws Error if validation fails
   */
  protected validateConfig(requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!this.config || !this.config[field]) {
        this.throwError(
          ErrorCode.CONFIG_ERROR,
          `Missing required configuration field: ${field}`
        )
      }
    }
  }

  /**
   * Log a query operation
   * @param operation - Operation name
   * @param details - Operation details
   */
  protected logQuery(operation: string, details: any): void {
    this.logger.info(`[Query] ${operation}`, {
      operation,
      ...details
    })
  }

  /**
   * Get the adapter's configuration
   * @returns Promise with adapter-specific config
   */
  abstract getConfig(): Promise<any>
}


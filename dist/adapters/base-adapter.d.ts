/**
 * Purpose: Abstract base adapter class with common error handling
 *
 * This file provides a base class for all database adapters.
 * Includes common error handling and optional logger support.
 * Zero dependencies - only Node.js built-ins and types.
 */
import type { Logger, HazoConnectError } from '../types';
import { ErrorCode } from '../types';
/**
 * Abstract base adapter class
 * All adapters should extend this class
 */
export declare abstract class BaseAdapter {
    protected logger: Logger;
    protected config: any;
    /**
     * Constructor
     * @param config - Adapter-specific configuration
     * @param logger - Optional logger instance
     */
    constructor(config: any, logger?: Logger);
    /**
     * Create a standardized error object
     * @param code - Error code
     * @param message - Error message
     * @param statusCode - Optional HTTP status code
     * @param originalError - Optional original error
     * @returns HazoConnectError object
     */
    protected createError(code: ErrorCode, message: string, statusCode?: number, originalError?: any): HazoConnectError;
    /**
     * Throw a standardized error
     * @param code - Error code
     * @param message - Error message
     * @param statusCode - Optional HTTP status code
     * @param originalError - Optional original error
     */
    protected throwError(code: ErrorCode, message: string, statusCode?: number, originalError?: any): never;
    /**
     * Detect if an error is a connection failure
     * @param error - Error to check
     * @returns True if connection failure
     */
    protected isConnectionError(error: any): boolean;
    /**
     * Handle connection errors
     * @param error - Error to handle
     */
    protected handleConnectionError(error: any): never;
    /**
     * Validate configuration
     * @param requiredFields - Array of required field names
     * @throws Error if validation fails
     */
    protected validateConfig(requiredFields: string[]): void;
    /**
     * Log a query operation
     * @param operation - Operation name
     * @param details - Operation details
     */
    protected logQuery(operation: string, details: any): void;
    /**
     * Get the adapter's configuration
     * @returns Promise with adapter-specific config
     */
    abstract getConfig(): Promise<any>;
}
//# sourceMappingURL=base-adapter.d.ts.map
"use strict";
/**
 * Purpose: Abstract base adapter class with common error handling
 *
 * This file provides a base class for all database adapters.
 * Includes common error handling and optional logger support.
 * Zero dependencies - only Node.js built-ins and types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAdapter = void 0;
const types_1 = require("../types");
/**
 * Abstract base adapter class
 * All adapters should extend this class
 */
class BaseAdapter {
    /**
     * Constructor
     * @param config - Adapter-specific configuration
     * @param logger - Optional logger instance
     */
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || types_1.noOpLogger;
    }
    /**
     * Create a standardized error object
     * @param code - Error code
     * @param message - Error message
     * @param statusCode - Optional HTTP status code
     * @param originalError - Optional original error
     * @returns HazoConnectError object
     */
    createError(code, message, statusCode, originalError) {
        // Convert enum to string to ensure it's serializable
        const codeString = String(code);
        const error = {
            code: codeString,
            message,
            statusCode,
            originalError
        };
        // Log the error
        this.logger.error(`[${codeString}] ${message}`, {
            code: codeString,
            message,
            statusCode,
            originalError: originalError instanceof Error ? originalError.message : String(originalError)
        });
        return error;
    }
    /**
     * Throw a standardized error
     * @param code - Error code
     * @param message - Error message
     * @param statusCode - Optional HTTP status code
     * @param originalError - Optional original error
     */
    throwError(code, message, statusCode, originalError) {
        const error = this.createError(code, message, statusCode, originalError);
        const err = new Error(message);
        // Convert enum to string to ensure it's serializable
        err.code = String(code);
        err.statusCode = statusCode;
        // Only include serializable error info
        err.originalError = originalError instanceof Error
            ? originalError.message
            : (typeof originalError === 'object' ? JSON.stringify(originalError) : String(originalError));
        throw err;
    }
    /**
     * Detect if an error is a connection failure
     * @param error - Error to check
     * @returns True if connection failure
     */
    isConnectionError(error) {
        if (!error)
            return false;
        const message = error.message || String(error);
        return (message.includes('fetch failed') ||
            message.includes('ECONNREFUSED') ||
            message.includes('ENOTFOUND') ||
            message.includes('ETIMEDOUT') ||
            message.includes('Lost connection'));
    }
    /**
     * Handle connection errors
     * @param error - Error to handle
     */
    handleConnectionError(error) {
        if (this.isConnectionError(error)) {
            this.throwError(types_1.ErrorCode.CONNECTION_FAILED, 'Lost connection to database', undefined, error);
        }
        throw error;
    }
    /**
     * Validate configuration
     * @param requiredFields - Array of required field names
     * @throws Error if validation fails
     */
    validateConfig(requiredFields) {
        for (const field of requiredFields) {
            if (!this.config || !this.config[field]) {
                this.throwError(types_1.ErrorCode.CONFIG_ERROR, `Missing required configuration field: ${field}`);
            }
        }
    }
    /**
     * Log a query operation
     * @param operation - Operation name
     * @param details - Operation details
     */
    logQuery(operation, details) {
        this.logger.info(`[Query] ${operation}`, {
            operation,
            ...details
        });
    }
}
exports.BaseAdapter = BaseAdapter;
//# sourceMappingURL=base-adapter.js.map
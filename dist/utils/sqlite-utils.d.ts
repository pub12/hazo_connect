/**
 * Purpose: Shared SQLite utility functions used across adapters, query translators, and admin services.
 *
 * This module provides common utilities for SQLite operations including identifier quoting,
 * value normalization, and validation functions.
 */
/**
 * Quote a SQLite identifier (table name, column name, etc.)
 * @param identifier - Identifier to quote
 * @returns Quoted identifier (e.g., "table_name")
 * @throws Error if identifier contains unsupported characters
 */
export declare function quoteIdentifier(identifier: string): string;
/**
 * Normalize a value for SQLite storage
 * - undefined -> null
 * - Date -> ISO string
 * - boolean -> 1 or 0
 * - other values pass through unchanged
 * @param value - Value to normalize
 * @returns Normalized value
 */
export declare function normalizeValue(value: unknown): unknown;
/**
 * Check if a value is a plain object (not array, not null)
 * @param value - Value to check
 * @returns True if value is a plain object
 */
export declare function isPlainObject(value: unknown): value is Record<string, unknown>;
/**
 * Sanitize and validate a table name
 * @param table - Table name to sanitize
 * @returns Sanitized table name
 * @throws Error if table name is empty
 */
export declare function sanitizeTableName(table: string): string;
/**
 * Validate an identifier against SQLite naming rules
 * @param identifier - Identifier to validate
 * @returns True if identifier is valid
 */
export declare function validateIdentifier(identifier: string): boolean;
/**
 * Get the identifier pattern regex (for use in other modules if needed)
 * @returns The identifier pattern regex
 */
export declare function getIdentifierPattern(): RegExp;
//# sourceMappingURL=sqlite-utils.d.ts.map
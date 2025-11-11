/**
 * Purpose: Shared SQLite utility functions used across adapters, query translators, and admin services.
 *
 * This module provides common utilities for SQLite operations including identifier quoting,
 * value normalization, and validation functions.
 */

const identifierPattern = /^[A-Za-z_][A-Za-z0-9_]*$/

/**
 * Quote a SQLite identifier (table name, column name, etc.)
 * @param identifier - Identifier to quote
 * @returns Quoted identifier (e.g., "table_name")
 * @throws Error if identifier contains unsupported characters
 */
export function quoteIdentifier(identifier: string): string {
  const parts = identifier.split(".")
  if (parts.length === 0) {
    throw new Error("Identifier cannot be empty")
  }

  const quoted = parts.map(part => {
    if (!identifierPattern.test(part)) {
      throw new Error(`Identifier '${part}' contains unsupported characters`)
    }
    return `"${part}"`
  })

  return quoted.join(".")
}

/**
 * Normalize a value for SQLite storage
 * - undefined -> null
 * - Date -> ISO string
 * - boolean -> 1 or 0
 * - other values pass through unchanged
 * @param value - Value to normalize
 * @returns Normalized value
 */
export function normalizeValue(value: unknown): unknown {
  if (value === undefined) {
    return null
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0
  }
  return value
}

/**
 * Check if a value is a plain object (not array, not null)
 * @param value - Value to check
 * @returns True if value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Sanitize and validate a table name
 * @param table - Table name to sanitize
 * @returns Sanitized table name
 * @throws Error if table name is empty
 */
export function sanitizeTableName(table: string): string {
  const trimmed = table.trim()
  if (!trimmed) {
    throw new Error("Table name cannot be empty")
  }
  return trimmed
}

/**
 * Validate an identifier against SQLite naming rules
 * @param identifier - Identifier to validate
 * @returns True if identifier is valid
 */
export function validateIdentifier(identifier: string): boolean {
  return identifierPattern.test(identifier)
}

/**
 * Get the identifier pattern regex (for use in other modules if needed)
 * @returns The identifier pattern regex
 */
export function getIdentifierPattern(): RegExp {
  return identifierPattern
}


/**
 * Purpose: Unified WHERE clause builder for SQLite queries.
 *
 * This module provides shared logic for building WHERE clauses from filter conditions,
 * used by both the query translator and admin service.
 */

import type { QueryOperator, WhereCondition } from "../types"
import { quoteIdentifier, normalizeValue } from "./sqlite-utils"

export interface WhereClauseResult {
  clause: string
  params: unknown[]
}

export type SqliteFilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "is"
  | "in"

export interface SqliteWhereFilter {
  column: string
  operator: SqliteFilterOperator
  value: unknown
}

/**
 * Build a WHERE clause from an array of filter conditions
 * @param filters - Array of filter conditions
 * @param quoteField - Function to quote field names (defaults to quoteIdentifier)
 * @returns WHERE clause SQL and parameter array
 */
export function buildWhereClause(
  filters: SqliteWhereFilter[] | WhereCondition[],
  quoteField: (field: string) => string = quoteIdentifier
): WhereClauseResult {
  if (!filters || filters.length === 0) {
    return { clause: "", params: [] }
  }

  const clauses: string[] = []
  const params: unknown[] = []

  for (const filter of filters) {
    const condition = translateCondition(filter, quoteField)
    clauses.push(condition.clause)
    params.push(...condition.params)
  }

  const clauseSql = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""
  return { clause: clauseSql, params }
}

/**
 * Translate a single condition to SQL
 * @param condition - Condition to translate
 * @param quoteField - Function to quote field names
 * @returns SQL clause and parameters
 */
function translateCondition(
  condition: SqliteWhereFilter | WhereCondition,
  quoteField: (field: string) => string
): { clause: string; params: unknown[] } {
  const operator = condition.operator
  // Handle both WhereCondition (has 'field') and SqliteWhereFilter (has 'column')
  const fieldName = 'field' in condition ? condition.field : condition.column
  const field = quoteField(fieldName)
  const value = condition.value
  const params: unknown[] = []

  switch (operator) {
    case "eq": {
      if (value === null || value === undefined) {
        return { clause: `${field} IS NULL`, params }
      }
      return { clause: `${field} = ?`, params: [normalizeValue(value)] }
    }
    case "neq": {
      if (value === null || value === undefined) {
        return { clause: `${field} IS NOT NULL`, params }
      }
      return { clause: `${field} != ?`, params: [normalizeValue(value)] }
    }
    case "gt":
      return { clause: `${field} > ?`, params: [normalizeValue(value)] }
    case "gte":
      return { clause: `${field} >= ?`, params: [normalizeValue(value)] }
    case "lt":
      return { clause: `${field} < ?`, params: [normalizeValue(value)] }
    case "lte":
      return { clause: `${field} <= ?`, params: [normalizeValue(value)] }
    case "like": {
      return { clause: `${field} LIKE ?`, params: [String(value ?? "")] }
    }
    case "ilike": {
      return { clause: `LOWER(${field}) LIKE LOWER(?)`, params: [String(value ?? "")] }
    }
    case "is": {
      const normalized = String(value ?? "null").toLowerCase()
      if (normalized === "null") {
        return { clause: `${field} IS NULL`, params }
      } else if (normalized === "not.null" || normalized === "not null") {
        return { clause: `${field} IS NOT NULL`, params }
      } else {
        throw new Error(
          `Unsupported value '${value}' for IS operator. Use 'null' or 'not.null'.`
        )
      }
    }
    case "in": {
      const values = Array.isArray(value) ? value : [value]
      if (!values.length) {
        return { clause: "1=0", params: [] }
      }
      const placeholders = values.map(() => "?").join(", ")
      return {
        clause: `${field} IN (${placeholders})`,
        params: values.map(normalizeValue)
      }
    }
    default:
      throw new Error(`Unsupported filter operator '${operator}'`)
  }
}

/**
 * Build filters from a criteria object (for admin service)
 * @param criteria - Object with column names as keys and values
 * @returns Array of filter conditions
 */
export function buildFiltersFromCriteria(
  criteria: Record<string, unknown>
): SqliteWhereFilter[] {
  return Object.entries(criteria).map(([column, value]) => ({
    column,
    operator: "eq",
    value
  }))
}


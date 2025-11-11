/**
 * Purpose: Unified WHERE clause builder for SQLite queries.
 *
 * This module provides shared logic for building WHERE clauses from filter conditions,
 * used by both the query translator and admin service.
 */
import type { WhereCondition } from "../types";
export interface WhereClauseResult {
    clause: string;
    params: unknown[];
}
export type SqliteFilterOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "is" | "in";
export interface SqliteWhereFilter {
    column: string;
    operator: SqliteFilterOperator;
    value: unknown;
}
/**
 * Build a WHERE clause from an array of filter conditions
 * @param filters - Array of filter conditions
 * @param quoteField - Function to quote field names (defaults to quoteIdentifier)
 * @returns WHERE clause SQL and parameter array
 */
export declare function buildWhereClause(filters: SqliteWhereFilter[] | WhereCondition[], quoteField?: (field: string) => string): WhereClauseResult;
/**
 * Build filters from a criteria object (for admin service)
 * @param criteria - Object with column names as keys and values
 * @returns Array of filter conditions
 */
export declare function buildFiltersFromCriteria(criteria: Record<string, unknown>): SqliteWhereFilter[];
//# sourceMappingURL=where-builder.d.ts.map
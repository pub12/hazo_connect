import { QueryBuilder } from "../query-builder";
/**
 * Error raised when translation from QueryBuilder to SQL fails due to invalid configuration.
 */
export declare class SqliteTranslationError extends Error {
    constructor(message: string);
}
/**
 * Represents a single SQL statement with bound parameters.
 */
export interface TranslatedQuery {
    sql: string;
    params: unknown[];
}
/**
 * Represents one or more INSERT statements generated from a payload.
 */
export interface InsertTranslation {
    statements: TranslatedQuery[];
}
/**
 * Translate a QueryBuilder instance into a SELECT statement.
 */
export declare function translateSelect(builder: QueryBuilder): TranslatedQuery;
/**
 * Translate an insert payload into one or more INSERT statements.
 */
export declare function translateInsert(builder: QueryBuilder, rowsInput: Record<string, unknown> | Array<Record<string, unknown>>): InsertTranslation;
/**
 * Translate an update payload into an UPDATE statement.
 */
export declare function translateUpdate(builder: QueryBuilder, updates: Record<string, unknown>): TranslatedQuery;
/**
 * Translate delete instructions into a DELETE statement.
 */
export declare function translateDelete(builder: QueryBuilder): TranslatedQuery;
//# sourceMappingURL=query-translator.d.ts.map
/**
 * Purpose: Query builder with fluent API supporting full PostgREST syntax
 *
 * This file provides a query builder class that supports PostgREST operators
 * and syntax, including nested selects, joins, and complex filters.
 * Zero dependencies - only uses types.
 */
import type { QueryOperator, WhereCondition, OrderDirection, JoinType, NestedSelect } from './types';
/**
 * Query builder class with fluent API
 * Supports PostgREST syntax and operators
 */
export declare class QueryBuilder {
    private _table;
    private _selectFields;
    private _whereConditions;
    private _whereOrConditions;
    private _orderBy;
    private _limitValue;
    private _offsetValue;
    private _joins;
    private _nestedSelects;
    /**
     * Set the table name
     * @param table - Table name
     * @returns QueryBuilder instance for chaining
     */
    from(table: string): this;
    /**
     * Set fields to select
     * @param fields - Field names (string or array)
     * @returns QueryBuilder instance for chaining
     */
    select(fields: string | string[]): this;
    /**
     * Add a where condition
     * @param field - Field name
     * @param operator - Query operator
     * @param value - Value to compare
     * @returns QueryBuilder instance for chaining
     */
    where(field: string, operator: QueryOperator, value: any): this;
    /**
     * Add an IN condition
     * @param field - Field name
     * @param values - Array of values
     * @returns QueryBuilder instance for chaining
     */
    whereIn(field: string, values: any[]): this;
    /**
     * Add OR conditions
     * @param conditions - Array of condition objects
     * @returns QueryBuilder instance for chaining
     */
    whereOr(conditions: Array<{
        field: string;
        operator: QueryOperator;
        value: any;
    }>): this;
    /**
     * Add ordering
     * @param field - Field name
     * @param direction - Order direction (asc or desc)
     * @returns QueryBuilder instance for chaining
     */
    order(field: string, direction?: OrderDirection): this;
    /**
     * Set limit
     * @param count - Number of records to return
     * @returns QueryBuilder instance for chaining
     */
    limit(count: number): this;
    /**
     * Set offset
     * @param count - Number of records to skip
     * @returns QueryBuilder instance for chaining
     */
    offset(count: number): this;
    /**
     * Add a join
     * @param table - Table to join
     * @param on - Join condition
     * @param type - Join type (inner, left, right)
     * @returns QueryBuilder instance for chaining
     */
    join(table: string, on: string, type?: JoinType): this;
    /**
     * Add nested select (PostgREST syntax: table:related_table(field1,field2))
     * @param table - Related table name
     * @param fields - Fields to select from related table
     * @returns QueryBuilder instance for chaining
     */
    nestedSelect(table: string, fields: string[]): this;
    /**
     * Get the table name
     */
    getTable(): string | null;
    /**
     * Get select fields
     */
    getSelectFields(): string[];
    /**
     * Get where conditions
     */
    getWhereConditions(): WhereCondition[];
    /**
     * Get OR conditions
     */
    getWhereOrConditions(): WhereCondition[][];
    /**
     * Get order by clauses
     */
    getOrderBy(): Array<{
        field: string;
        direction: OrderDirection;
    }>;
    /**
     * Get limit value
     */
    getLimit(): number | null;
    /**
     * Get offset value
     */
    getOffset(): number | null;
    /**
     * Get joins
     */
    getJoins(): Array<{
        table: string;
        on: string;
        type: JoinType;
    }>;
    /**
     * Get nested selects
     */
    getNestedSelects(): NestedSelect[];
    /**
     * Clone the query builder
     * @returns New QueryBuilder instance with same state
     */
    clone(): QueryBuilder;
}
//# sourceMappingURL=query-builder.d.ts.map
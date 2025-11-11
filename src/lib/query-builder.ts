/**
 * Purpose: Query builder with fluent API supporting full PostgREST syntax
 * 
 * This file provides a query builder class that supports PostgREST operators
 * and syntax, including nested selects, joins, and complex filters.
 * Zero dependencies - only uses types.
 */

import type {
  QueryOperator,
  WhereCondition,
  OrderDirection,
  JoinType,
  NestedSelect
} from './types'

/**
 * Query builder class with fluent API
 * Supports PostgREST syntax and operators
 */
export class QueryBuilder {
  private _table: string | null = null
  private _selectFields: string[] = []
  private _whereConditions: WhereCondition[] = []
  private _whereOrConditions: WhereCondition[][] = []
  private _orderBy: Array<{ field: string; direction: OrderDirection }> = []
  private _limitValue: number | null = null
  private _offsetValue: number | null = null
  private _joins: Array<{ table: string; on: string; type: JoinType }> = []
  private _nestedSelects: NestedSelect[] = []

  /**
   * Set the table name
   * @param table - Table name
   * @returns QueryBuilder instance for chaining
   */
  from(table: string): this {
    this._table = table
    return this
  }

  /**
   * Set fields to select
   * @param fields - Field names (string or array)
   * @returns QueryBuilder instance for chaining
   */
  select(fields: string | string[]): this {
    if (typeof fields === 'string') {
      // Handle comma-separated string or single field
      if (fields.includes(',')) {
        this._selectFields = fields.split(',').map(f => f.trim())
      } else if (fields === '*') {
        this._selectFields = ['*']
      } else {
        this._selectFields = [fields.trim()]
      }
    } else {
      this._selectFields = fields
    }
    return this
  }

  /**
   * Add a where condition
   * @param field - Field name
   * @param operator - Query operator
   * @param value - Value to compare
   * @returns QueryBuilder instance for chaining
   */
  where(field: string, operator: QueryOperator, value: any): this {
    this._whereConditions.push({ field, operator, value })
    return this
  }

  /**
   * Add an IN condition
   * @param field - Field name
   * @param values - Array of values
   * @returns QueryBuilder instance for chaining
   */
  whereIn(field: string, values: any[]): this {
    this._whereConditions.push({ field, operator: 'in', value: values })
    return this
  }

  /**
   * Add OR conditions
   * @param conditions - Array of condition objects
   * @returns QueryBuilder instance for chaining
   */
  whereOr(conditions: Array<{ field: string; operator: QueryOperator; value: any }>): this {
    const orConditions: WhereCondition[] = conditions.map(c => ({
      field: c.field,
      operator: c.operator,
      value: c.value
    }))
    this._whereOrConditions.push(orConditions)
    return this
  }

  /**
   * Add ordering
   * @param field - Field name
   * @param direction - Order direction (asc or desc)
   * @returns QueryBuilder instance for chaining
   */
  order(field: string, direction: OrderDirection = 'asc'): this {
    this._orderBy.push({ field, direction })
    return this
  }

  /**
   * Set limit
   * @param count - Number of records to return
   * @returns QueryBuilder instance for chaining
   */
  limit(count: number): this {
    this._limitValue = count
    return this
  }

  /**
   * Set offset
   * @param count - Number of records to skip
   * @returns QueryBuilder instance for chaining
   */
  offset(count: number): this {
    this._offsetValue = count
    return this
  }

  /**
   * Add a join
   * @param table - Table to join
   * @param on - Join condition
   * @param type - Join type (inner, left, right)
   * @returns QueryBuilder instance for chaining
   */
  join(table: string, on: string, type: JoinType = 'inner'): this {
    this._joins.push({ table, on, type })
    return this
  }

  /**
   * Add nested select (PostgREST syntax: table:related_table(field1,field2))
   * @param table - Related table name
   * @param fields - Fields to select from related table
   * @returns QueryBuilder instance for chaining
   */
  nestedSelect(table: string, fields: string[]): this {
    this._nestedSelects.push({ table, fields })
    return this
  }

  /**
   * Get the table name
   */
  getTable(): string | null {
    return this._table
  }

  /**
   * Get select fields
   */
  getSelectFields(): string[] {
    return this._selectFields
  }

  /**
   * Get where conditions
   */
  getWhereConditions(): WhereCondition[] {
    return this._whereConditions
  }

  /**
   * Get OR conditions
   */
  getWhereOrConditions(): WhereCondition[][] {
    return this._whereOrConditions
  }

  /**
   * Get order by clauses
   */
  getOrderBy(): Array<{ field: string; direction: OrderDirection }> {
    return this._orderBy
  }

  /**
   * Get limit value
   */
  getLimit(): number | null {
    return this._limitValue
  }

  /**
   * Get offset value
   */
  getOffset(): number | null {
    return this._offsetValue
  }

  /**
   * Get joins
   */
  getJoins(): Array<{ table: string; on: string; type: JoinType }> {
    return this._joins
  }

  /**
   * Get nested selects
   */
  getNestedSelects(): NestedSelect[] {
    return this._nestedSelects
  }

  /**
   * Clone the query builder
   * @returns New QueryBuilder instance with same state
   */
  clone(): QueryBuilder {
    const cloned = new QueryBuilder()
    cloned._table = this._table
    cloned._selectFields = [...this._selectFields]
    cloned._whereConditions = [...this._whereConditions]
    cloned._whereOrConditions = this._whereOrConditions.map(conditions => [...conditions])
    cloned._orderBy = [...this._orderBy]
    cloned._limitValue = this._limitValue
    cloned._offsetValue = this._offsetValue
    cloned._joins = [...this._joins]
    cloned._nestedSelects = [...this._nestedSelects]
    return cloned
  }
}


// query-translator.ts converts QueryBuilder instructions into parameterised SQLite statements.
import { QueryBuilder } from "../query-builder"
import type { JoinType, OrderDirection, WhereCondition } from "../types"
import { quoteIdentifier, normalizeValue, validateIdentifier } from "../utils/sqlite-utils"

/**
 * Error raised when translation from QueryBuilder to SQL fails due to invalid configuration.
 */
export class SqliteTranslationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SqliteTranslationError"
  }
}

/**
 * Represents a single SQL statement with bound parameters.
 */
export interface TranslatedQuery {
  sql: string
  params: unknown[]
}

/**
 * Represents one or more INSERT statements generated from a payload.
 */
export interface InsertTranslation {
  statements: TranslatedQuery[]
}

/**
 * Translate a QueryBuilder instance into a SELECT statement.
 */
export function translateSelect(builder: QueryBuilder): TranslatedQuery {
  validateNestedSelects(builder)
  const tableName = resolveTableName(builder)
  const selectClause = buildSelectClause(builder.getSelectFields())
  const joinClause = buildJoinClauses(builder.getJoins())
  const whereClause = buildWhereClause(builder)
  const orderClause = buildOrderClause(builder.getOrderBy())
  const limitOffsetClause = buildLimitOffsetClause(builder.getLimit(), builder.getOffset())

  const sqlParts = [
    `SELECT ${selectClause}`,
    `FROM ${quoteIdentifierLocal(tableName)}`,
    joinClause,
    whereClause.clause,
    orderClause,
    limitOffsetClause
  ].filter(Boolean)

  return {
    sql: sqlParts.join(" ").trim(),
    params: whereClause.params
  }
}

/**
 * Translate an insert payload into one or more INSERT statements.
 */
export function translateInsert(
  builder: QueryBuilder,
  rowsInput: Record<string, unknown> | Array<Record<string, unknown>>
): InsertTranslation {
  const tableName = resolveTableName(builder)
  const rows = Array.isArray(rowsInput) ? rowsInput : [rowsInput]

  if (rows.length === 0) {
    throw new SqliteTranslationError("Insert payload must contain at least one row")
  }

  const columns = Object.keys(rows[0])
  if (columns.length === 0) {
    throw new SqliteTranslationError("Insert payload must include at least one column")
  }

  const quotedColumns = columns.map(quoteColumnName)

  for (const row of rows) {
    const rowColumnNames = Object.keys(row)
    const allColumnsPresent =
      rowColumnNames.length === columns.length &&
      rowColumnNames.every(columnName => columns.includes(columnName))

    if (!allColumnsPresent) {
      throw new SqliteTranslationError("All inserted rows must share the same set of columns")
    }
  }

  const baseSql = `INSERT INTO ${quoteIdentifierLocal(tableName)} (${quotedColumns.join(", ")}) VALUES (${columns
    .map(() => "?")
    .join(", ")}) RETURNING *`

  const statements = rows.map(row => ({
    sql: baseSql,
    params: columns.map(column => normalizeValue(row[column]))
  }))

  return { statements }
}

/**
 * Translate an update payload into an UPDATE statement.
 */
export function translateUpdate(
  builder: QueryBuilder,
  updates: Record<string, unknown>
): TranslatedQuery {
  const tableName = resolveTableName(builder)
  const updateColumns = Object.keys(updates)

  if (updateColumns.length === 0) {
    throw new SqliteTranslationError("Update payload must include at least one column")
  }

  const setFragments = updateColumns.map(column => `${quoteColumnName(column)} = ?`)
  const setParams = updateColumns.map(column => normalizeValue(updates[column]))
  const whereClause = buildWhereClause(builder)

  const sql = `UPDATE ${quoteIdentifierLocal(tableName)} SET ${setFragments.join(", ")}${whereClause.clause} RETURNING *`

  return {
    sql,
    params: [...setParams, ...whereClause.params]
  }
}

/**
 * Translate delete instructions into a DELETE statement.
 */
export function translateDelete(builder: QueryBuilder): TranslatedQuery {
  const tableName = resolveTableName(builder)
  const whereClause = buildWhereClause(builder)

  const sql = `DELETE FROM ${quoteIdentifierLocal(tableName)}${whereClause.clause} RETURNING *`

  return {
    sql,
    params: [...whereClause.params]
  }
}

// Helper functions ---------------------------------------------------------------------------

function resolveTableName(builder: QueryBuilder): string {
  const table = builder.getTable()
  if (!table) {
    throw new SqliteTranslationError("A table name must be specified before executing a query")
  }
  return table
}

function validateNestedSelects(builder: QueryBuilder) {
  if (builder.getNestedSelects().length > 0) {
    throw new SqliteTranslationError("Nested selects are not supported by the SQLite adapter yet")
  }
}

function buildSelectClause(selectFields: string[]): string {
  if (!selectFields.length) {
    return "*"
  }
  return selectFields.map(quoteSelectField).join(", ")
}

function buildJoinClauses(
  joins: Array<{ table: string; on: string; type: JoinType }>
): string {
  if (!joins || joins.length === 0) {
    return ""
  }

  const clauses = joins.map(join => {
    const joinType = normalizeJoinType(join.type)
    const tableSql = quoteJoinTarget(join.table)
    const conditionSql = sanitizeJoinCondition(join.on)
    return `${joinType} ${tableSql} ON ${conditionSql}`
  })

  return ` ${clauses.join(" ")}`
}

function buildWhereClause(builder: QueryBuilder): { clause: string; params: unknown[] } {
  const params: unknown[] = []
  const clauses: string[] = []

  for (const condition of builder.getWhereConditions()) {
    const { clause, params: conditionParams } = translateCondition(condition)
    if (clause) {
      clauses.push(clause)
      params.push(...conditionParams)
    }
  }

  for (const group of builder.getWhereOrConditions()) {
    if (!group || group.length === 0) {
      continue
    }
    const groupClauses: string[] = []
    const groupParams: unknown[] = []

    for (const condition of group) {
      const { clause, params: conditionParams } = translateCondition(condition)
      if (clause) {
        groupClauses.push(clause)
        groupParams.push(...conditionParams)
      }
    }

    if (groupClauses.length === 0) {
      continue
    }

    const joinedGroup =
      groupClauses.length === 1 ? groupClauses[0] : groupClauses.map(c => `(${c})`).join(" OR ")

    clauses.push(`(${joinedGroup})`)
    params.push(...groupParams)
  }

  if (!clauses.length) {
    return { clause: "", params }
  }

  return { clause: ` WHERE ${clauses.join(" AND ")}`, params }
}

function buildOrderClause(
  orderBy: Array<{ field: string; direction: OrderDirection }>
): string {
  if (!orderBy || orderBy.length === 0) {
    return ""
  }

  const parts = orderBy.map(order => {
    const direction = normalizeOrderDirection(order.direction)
    return `${quoteQualifiedIdentifier(order.field)} ${direction}`
  })

  return ` ORDER BY ${parts.join(", ")}`
}

function buildLimitOffsetClause(limit: number | null, offset: number | null): string {
  const parts: string[] = []

  if (limit !== null && limit !== undefined) {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new SqliteTranslationError("Limit must be a non-negative integer")
    }
    parts.push(`LIMIT ${limit}`)
  }

  if (offset !== null && offset !== undefined) {
    if (!Number.isInteger(offset) || offset < 0) {
      throw new SqliteTranslationError("Offset must be a non-negative integer")
    }
    parts.push(`OFFSET ${offset}`)
  }

  if (!parts.length) {
    return ""
  }

  return ` ${parts.join(" ")}`
}

function translateCondition(condition: WhereCondition): { clause: string; params: unknown[] } {
  const operator = condition.operator
  const field = quoteQualifiedIdentifier(condition.field)
  const params: unknown[] = []

  const normalizedValue = normalizeValue(condition.value)

  switch (operator) {
    case "eq": {
      if (condition.value === null || condition.value === undefined) {
        return { clause: `${field} IS NULL`, params }
      }
      return { clause: `${field} = ?`, params: [normalizedValue] }
    }
    case "neq": {
      if (condition.value === null || condition.value === undefined) {
        return { clause: `${field} IS NOT NULL`, params }
      }
      return { clause: `${field} != ?`, params: [normalizedValue] }
    }
    case "gt":
      return { clause: `${field} > ?`, params: [normalizedValue] }
    case "gte":
      return { clause: `${field} >= ?`, params: [normalizedValue] }
    case "lt":
      return { clause: `${field} < ?`, params: [normalizedValue] }
    case "lte":
      return { clause: `${field} <= ?`, params: [normalizedValue] }
    case "like":
      return { clause: `${field} LIKE ?`, params: [String(normalizedValue)] }
    case "ilike":
      return { clause: `LOWER(${field}) LIKE LOWER(?)`, params: [String(normalizedValue)] }
    case "in": {
      const values = Array.isArray(condition.value) ? condition.value : [condition.value]
      if (!values.length) {
        return { clause: "1=0", params: [] }
      }
      const placeholders = values.map(() => "?").join(", ")
      return {
        clause: `${field} IN (${placeholders})`,
        params: values.map(normalizeValue)
      }
    }
    case "is": {
      const valueString =
        condition.value === null || condition.value === undefined
          ? "null"
          : String(condition.value).toLowerCase()

      if (valueString === "null") {
        return { clause: `${field} IS NULL`, params }
      }

      if (valueString === "not.null" || valueString === "not null") {
        return { clause: `${field} IS NOT NULL`, params }
      }

      throw new SqliteTranslationError(
        `Unsupported IS comparison value '${condition.value}'. Use 'null' or 'not.null'.`
      )
    }
    default:
      throw new SqliteTranslationError(
        `Unsupported operator '${operator}' in WHERE clause. Use whereOr() for OR groupings.`
      )
  }
}

function normalizeOrderDirection(direction: OrderDirection): string {
  const normalized = direction?.toString().toLowerCase()
  if (normalized === "asc" || normalized === "desc") {
    return normalized.toUpperCase()
  }
  throw new SqliteTranslationError(`Unsupported ORDER BY direction '${direction}'`)
}

function normalizeJoinType(type: JoinType): string {
  const normalized = type?.toString().toLowerCase() ?? "inner"
  if (normalized === "inner") {
    return "INNER JOIN"
  }
  if (normalized === "left") {
    return "LEFT JOIN"
  }
  if (normalized === "right") {
    throw new SqliteTranslationError("SQLite does not support RIGHT JOIN operations")
  }
  throw new SqliteTranslationError(`Unsupported join type '${type}' for SQLite adapter`)
}

function quoteJoinTarget(target: string): string {
  const trimmed = target.trim()
  const parts = trimmed.split(/\s+/)

  if (parts.length === 1) {
    return quoteIdentifierLocal(parts[0])
  }

  if (parts.length === 2) {
    return `${quoteIdentifierLocal(parts[0])} AS ${quoteIdentifierLocal(parts[1])}`
  }

  if (parts.length === 3 && parts[1].toLowerCase() === "as") {
    return `${quoteIdentifierLocal(parts[0])} AS ${quoteIdentifierLocal(parts[2])}`
  }

  throw new SqliteTranslationError(
    `Unsupported join table format '${target}'. Use 'table', 'table alias', or 'table AS alias'.`
  )
}

function sanitizeJoinCondition(condition: string): string {
  const parts = condition.split("=").map(part => part.trim())
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new SqliteTranslationError(
      `Join conditions must be expressed as single-column equality (e.g. table_a.id = table_b.id). Received '${condition}'.`
    )
  }
  return `${quoteQualifiedIdentifier(parts[0])} = ${quoteQualifiedIdentifier(parts[1])}`
}

function quoteSelectField(field: string): string {
  const trimmed = field.trim()
  const { expression, alias } = extractSelectAlias(trimmed)
  const formattedExpression = formatSelectExpression(expression)

  if (!alias) {
    return formattedExpression
  }

  return `${formattedExpression} AS ${quoteIdentifierLocal(alias)}`
}

function quoteColumnName(column: string): string {
  if (column.includes(".")) {
    throw new SqliteTranslationError(
      `Column names in insert/update payloads must not be qualified. Received '${column}'.`
    )
  }
  return quoteIdentifierLocal(column)
}

// quoteIdentifier is now imported from utils/sqlite-utils
// Local quoteIdentifier wrapper for SqliteTranslationError
function quoteIdentifierLocal(identifier: string): string {
  try {
    return quoteIdentifier(identifier)
  } catch (error) {
    throw new SqliteTranslationError(
      error instanceof Error ? error.message : String(error)
    )
  }
}

function quoteQualifiedIdentifier(identifier: string): string {
  const parts = identifier.split(".")
  if (parts.some(part => part === "*")) {
    throw new SqliteTranslationError(`Wildcard selectors are only supported via 'table.*' syntax`)
  }
  return parts.map(quoteIdentifierLocal).join(".")
}

function extractSelectAlias(field: string): { expression: string; alias?: string } {
  const match = field.match(/^(.*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i)
  if (!match) {
    return { expression: field }
  }

  const alias = match[2].trim()
  if (!validateIdentifier(alias)) {
    throw new SqliteTranslationError(`Alias '${alias}' contains unsupported characters`)
  }

  return { expression: match[1].trim(), alias }
}

function formatSelectExpression(expression: string): string {
  const trimmed = expression.trim()

  if (trimmed === "*") {
    return "*"
  }

  const wildcardMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\.\*$/)
  if (wildcardMatch) {
    return `${quoteIdentifierLocal(wildcardMatch[1])}.*`
  }

  const functionMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/)
  if (functionMatch) {
    return formatFunctionCall(functionMatch[1], functionMatch[2])
  }

  return quoteQualifiedIdentifier(trimmed)
}

function formatFunctionCall(functionName: string, rawArguments: string): string {
  if (!validateIdentifier(functionName)) {
    throw new SqliteTranslationError(
      `Function name '${functionName}' contains unsupported characters`
    )
  }

  const argumentText = rawArguments.trim()
  if (!argumentText.length) {
    throw new SqliteTranslationError(`Function '${functionName}' requires at least one argument`)
  }

  const args = splitFunctionArgs(argumentText).map(formatFunctionArgument)
  return `${functionName}(${args.join(", ")})`
}

function splitFunctionArgs(argumentText: string): string[] {
  const args: string[] = []
  let depth = 0
  let current = ""

  for (const char of argumentText) {
    if (char === "(") {
      depth += 1
      current += char
    } else if (char === ")") {
      depth -= 1
      current += char
    } else if (char === "," && depth === 0) {
      if (current.trim().length > 0) {
        args.push(current.trim())
      }
      current = ""
    } else {
      current += char
    }
  }

  if (current.trim().length > 0) {
    args.push(current.trim())
  }

  return args.length ? args : [argumentText.trim()]
}

function formatFunctionArgument(argument: string): string {
  const trimmed = argument.trim()
  if (!trimmed.length) {
    throw new SqliteTranslationError("Function arguments cannot be empty")
  }

  if (trimmed === "*") {
    return "*"
  }

  if (/^[0-9]+(\.[0-9]+)?$/.test(trimmed)) {
    return trimmed
  }

  if (/^'.*'$/.test(trimmed) || /^".*"$/.test(trimmed)) {
    return trimmed
  }

  if (trimmed.toUpperCase().startsWith("DISTINCT ")) {
    const remainder = trimmed.slice(8).trim()
    return `DISTINCT ${formatFunctionArgument(remainder)}`
  }

  const nestedFunction = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/)
  if (nestedFunction) {
    return formatFunctionCall(nestedFunction[1], nestedFunction[2])
  }

  return quoteQualifiedIdentifier(trimmed)
}

// normalizeValue is now imported from utils/sqlite-utils


"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteTranslationError = void 0;
exports.translateSelect = translateSelect;
exports.translateInsert = translateInsert;
exports.translateUpdate = translateUpdate;
exports.translateDelete = translateDelete;
const sqlite_utils_1 = require("../utils/sqlite-utils");
/**
 * Error raised when translation from QueryBuilder to SQL fails due to invalid configuration.
 */
class SqliteTranslationError extends Error {
    constructor(message) {
        super(message);
        this.name = "SqliteTranslationError";
    }
}
exports.SqliteTranslationError = SqliteTranslationError;
/**
 * Translate a QueryBuilder instance into a SELECT statement.
 */
function translateSelect(builder) {
    validateNestedSelects(builder);
    const tableName = resolveTableName(builder);
    const selectClause = buildSelectClause(builder.getSelectFields());
    const joinClause = buildJoinClauses(builder.getJoins());
    const whereClause = buildWhereClause(builder);
    const orderClause = buildOrderClause(builder.getOrderBy());
    const limitOffsetClause = buildLimitOffsetClause(builder.getLimit(), builder.getOffset());
    const sqlParts = [
        `SELECT ${selectClause}`,
        `FROM ${quoteIdentifierLocal(tableName)}`,
        joinClause,
        whereClause.clause,
        orderClause,
        limitOffsetClause
    ].filter(Boolean);
    return {
        sql: sqlParts.join(" ").trim(),
        params: whereClause.params
    };
}
/**
 * Translate an insert payload into one or more INSERT statements.
 */
function translateInsert(builder, rowsInput) {
    const tableName = resolveTableName(builder);
    const rows = Array.isArray(rowsInput) ? rowsInput : [rowsInput];
    if (rows.length === 0) {
        throw new SqliteTranslationError("Insert payload must contain at least one row");
    }
    const columns = Object.keys(rows[0]);
    if (columns.length === 0) {
        throw new SqliteTranslationError("Insert payload must include at least one column");
    }
    const quotedColumns = columns.map(quoteColumnName);
    for (const row of rows) {
        const rowColumnNames = Object.keys(row);
        const allColumnsPresent = rowColumnNames.length === columns.length &&
            rowColumnNames.every(columnName => columns.includes(columnName));
        if (!allColumnsPresent) {
            throw new SqliteTranslationError("All inserted rows must share the same set of columns");
        }
    }
    const baseSql = `INSERT INTO ${quoteIdentifierLocal(tableName)} (${quotedColumns.join(", ")}) VALUES (${columns
        .map(() => "?")
        .join(", ")}) RETURNING *`;
    const statements = rows.map(row => ({
        sql: baseSql,
        params: columns.map(column => (0, sqlite_utils_1.normalizeValue)(row[column]))
    }));
    return { statements };
}
/**
 * Translate an update payload into an UPDATE statement.
 */
function translateUpdate(builder, updates) {
    const tableName = resolveTableName(builder);
    const updateColumns = Object.keys(updates);
    if (updateColumns.length === 0) {
        throw new SqliteTranslationError("Update payload must include at least one column");
    }
    const setFragments = updateColumns.map(column => `${quoteColumnName(column)} = ?`);
    const setParams = updateColumns.map(column => (0, sqlite_utils_1.normalizeValue)(updates[column]));
    const whereClause = buildWhereClause(builder);
    const sql = `UPDATE ${quoteIdentifierLocal(tableName)} SET ${setFragments.join(", ")}${whereClause.clause} RETURNING *`;
    return {
        sql,
        params: [...setParams, ...whereClause.params]
    };
}
/**
 * Translate delete instructions into a DELETE statement.
 */
function translateDelete(builder) {
    const tableName = resolveTableName(builder);
    const whereClause = buildWhereClause(builder);
    const sql = `DELETE FROM ${quoteIdentifierLocal(tableName)}${whereClause.clause} RETURNING *`;
    return {
        sql,
        params: [...whereClause.params]
    };
}
// Helper functions ---------------------------------------------------------------------------
function resolveTableName(builder) {
    const table = builder.getTable();
    if (!table) {
        throw new SqliteTranslationError("A table name must be specified before executing a query");
    }
    return table;
}
function validateNestedSelects(builder) {
    if (builder.getNestedSelects().length > 0) {
        throw new SqliteTranslationError("Nested selects are not supported by the SQLite adapter yet");
    }
}
function buildSelectClause(selectFields) {
    if (!selectFields.length) {
        return "*";
    }
    return selectFields.map(quoteSelectField).join(", ");
}
function buildJoinClauses(joins) {
    if (!joins || joins.length === 0) {
        return "";
    }
    const clauses = joins.map(join => {
        const joinType = normalizeJoinType(join.type);
        const tableSql = quoteJoinTarget(join.table);
        const conditionSql = sanitizeJoinCondition(join.on);
        return `${joinType} ${tableSql} ON ${conditionSql}`;
    });
    return ` ${clauses.join(" ")}`;
}
function buildWhereClause(builder) {
    const params = [];
    const clauses = [];
    for (const condition of builder.getWhereConditions()) {
        const { clause, params: conditionParams } = translateCondition(condition);
        if (clause) {
            clauses.push(clause);
            params.push(...conditionParams);
        }
    }
    for (const group of builder.getWhereOrConditions()) {
        if (!group || group.length === 0) {
            continue;
        }
        const groupClauses = [];
        const groupParams = [];
        for (const condition of group) {
            const { clause, params: conditionParams } = translateCondition(condition);
            if (clause) {
                groupClauses.push(clause);
                groupParams.push(...conditionParams);
            }
        }
        if (groupClauses.length === 0) {
            continue;
        }
        const joinedGroup = groupClauses.length === 1 ? groupClauses[0] : groupClauses.map(c => `(${c})`).join(" OR ");
        clauses.push(`(${joinedGroup})`);
        params.push(...groupParams);
    }
    if (!clauses.length) {
        return { clause: "", params };
    }
    return { clause: ` WHERE ${clauses.join(" AND ")}`, params };
}
function buildOrderClause(orderBy) {
    if (!orderBy || orderBy.length === 0) {
        return "";
    }
    const parts = orderBy.map(order => {
        const direction = normalizeOrderDirection(order.direction);
        return `${quoteQualifiedIdentifier(order.field)} ${direction}`;
    });
    return ` ORDER BY ${parts.join(", ")}`;
}
function buildLimitOffsetClause(limit, offset) {
    const parts = [];
    if (limit !== null && limit !== undefined) {
        if (!Number.isInteger(limit) || limit < 0) {
            throw new SqliteTranslationError("Limit must be a non-negative integer");
        }
        parts.push(`LIMIT ${limit}`);
    }
    if (offset !== null && offset !== undefined) {
        if (!Number.isInteger(offset) || offset < 0) {
            throw new SqliteTranslationError("Offset must be a non-negative integer");
        }
        parts.push(`OFFSET ${offset}`);
    }
    if (!parts.length) {
        return "";
    }
    return ` ${parts.join(" ")}`;
}
function translateCondition(condition) {
    const operator = condition.operator;
    const field = quoteQualifiedIdentifier(condition.field);
    const params = [];
    const normalizedValue = (0, sqlite_utils_1.normalizeValue)(condition.value);
    switch (operator) {
        case "eq": {
            if (condition.value === null || condition.value === undefined) {
                return { clause: `${field} IS NULL`, params };
            }
            return { clause: `${field} = ?`, params: [normalizedValue] };
        }
        case "neq": {
            if (condition.value === null || condition.value === undefined) {
                return { clause: `${field} IS NOT NULL`, params };
            }
            return { clause: `${field} != ?`, params: [normalizedValue] };
        }
        case "gt":
            return { clause: `${field} > ?`, params: [normalizedValue] };
        case "gte":
            return { clause: `${field} >= ?`, params: [normalizedValue] };
        case "lt":
            return { clause: `${field} < ?`, params: [normalizedValue] };
        case "lte":
            return { clause: `${field} <= ?`, params: [normalizedValue] };
        case "like":
            return { clause: `${field} LIKE ?`, params: [String(normalizedValue)] };
        case "ilike":
            return { clause: `LOWER(${field}) LIKE LOWER(?)`, params: [String(normalizedValue)] };
        case "in": {
            const values = Array.isArray(condition.value) ? condition.value : [condition.value];
            if (!values.length) {
                return { clause: "1=0", params: [] };
            }
            const placeholders = values.map(() => "?").join(", ");
            return {
                clause: `${field} IN (${placeholders})`,
                params: values.map(sqlite_utils_1.normalizeValue)
            };
        }
        case "is": {
            const valueString = condition.value === null || condition.value === undefined
                ? "null"
                : String(condition.value).toLowerCase();
            if (valueString === "null") {
                return { clause: `${field} IS NULL`, params };
            }
            if (valueString === "not.null" || valueString === "not null") {
                return { clause: `${field} IS NOT NULL`, params };
            }
            throw new SqliteTranslationError(`Unsupported IS comparison value '${condition.value}'. Use 'null' or 'not.null'.`);
        }
        default:
            throw new SqliteTranslationError(`Unsupported operator '${operator}' in WHERE clause. Use whereOr() for OR groupings.`);
    }
}
function normalizeOrderDirection(direction) {
    const normalized = direction?.toString().toLowerCase();
    if (normalized === "asc" || normalized === "desc") {
        return normalized.toUpperCase();
    }
    throw new SqliteTranslationError(`Unsupported ORDER BY direction '${direction}'`);
}
function normalizeJoinType(type) {
    const normalized = type?.toString().toLowerCase() ?? "inner";
    if (normalized === "inner") {
        return "INNER JOIN";
    }
    if (normalized === "left") {
        return "LEFT JOIN";
    }
    if (normalized === "right") {
        throw new SqliteTranslationError("SQLite does not support RIGHT JOIN operations");
    }
    throw new SqliteTranslationError(`Unsupported join type '${type}' for SQLite adapter`);
}
function quoteJoinTarget(target) {
    const trimmed = target.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
        return quoteIdentifierLocal(parts[0]);
    }
    if (parts.length === 2) {
        return `${quoteIdentifierLocal(parts[0])} AS ${quoteIdentifierLocal(parts[1])}`;
    }
    if (parts.length === 3 && parts[1].toLowerCase() === "as") {
        return `${quoteIdentifierLocal(parts[0])} AS ${quoteIdentifierLocal(parts[2])}`;
    }
    throw new SqliteTranslationError(`Unsupported join table format '${target}'. Use 'table', 'table alias', or 'table AS alias'.`);
}
function sanitizeJoinCondition(condition) {
    const parts = condition.split("=").map(part => part.trim());
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new SqliteTranslationError(`Join conditions must be expressed as single-column equality (e.g. table_a.id = table_b.id). Received '${condition}'.`);
    }
    return `${quoteQualifiedIdentifier(parts[0])} = ${quoteQualifiedIdentifier(parts[1])}`;
}
function quoteSelectField(field) {
    const trimmed = field.trim();
    const { expression, alias } = extractSelectAlias(trimmed);
    const formattedExpression = formatSelectExpression(expression);
    if (!alias) {
        return formattedExpression;
    }
    return `${formattedExpression} AS ${quoteIdentifierLocal(alias)}`;
}
function quoteColumnName(column) {
    if (column.includes(".")) {
        throw new SqliteTranslationError(`Column names in insert/update payloads must not be qualified. Received '${column}'.`);
    }
    return quoteIdentifierLocal(column);
}
// quoteIdentifier is now imported from utils/sqlite-utils
// Local quoteIdentifier wrapper for SqliteTranslationError
function quoteIdentifierLocal(identifier) {
    try {
        return (0, sqlite_utils_1.quoteIdentifier)(identifier);
    }
    catch (error) {
        throw new SqliteTranslationError(error instanceof Error ? error.message : String(error));
    }
}
function quoteQualifiedIdentifier(identifier) {
    const parts = identifier.split(".");
    if (parts.some(part => part === "*")) {
        throw new SqliteTranslationError(`Wildcard selectors are only supported via 'table.*' syntax`);
    }
    return parts.map(quoteIdentifierLocal).join(".");
}
function extractSelectAlias(field) {
    const match = field.match(/^(.*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (!match) {
        return { expression: field };
    }
    const alias = match[2].trim();
    if (!(0, sqlite_utils_1.validateIdentifier)(alias)) {
        throw new SqliteTranslationError(`Alias '${alias}' contains unsupported characters`);
    }
    return { expression: match[1].trim(), alias };
}
function formatSelectExpression(expression) {
    const trimmed = expression.trim();
    if (trimmed === "*") {
        return "*";
    }
    const wildcardMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\.\*$/);
    if (wildcardMatch) {
        return `${quoteIdentifierLocal(wildcardMatch[1])}.*`;
    }
    const functionMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
    if (functionMatch) {
        return formatFunctionCall(functionMatch[1], functionMatch[2]);
    }
    return quoteQualifiedIdentifier(trimmed);
}
function formatFunctionCall(functionName, rawArguments) {
    if (!(0, sqlite_utils_1.validateIdentifier)(functionName)) {
        throw new SqliteTranslationError(`Function name '${functionName}' contains unsupported characters`);
    }
    const argumentText = rawArguments.trim();
    if (!argumentText.length) {
        throw new SqliteTranslationError(`Function '${functionName}' requires at least one argument`);
    }
    const args = splitFunctionArgs(argumentText).map(formatFunctionArgument);
    return `${functionName}(${args.join(", ")})`;
}
function splitFunctionArgs(argumentText) {
    const args = [];
    let depth = 0;
    let current = "";
    for (const char of argumentText) {
        if (char === "(") {
            depth += 1;
            current += char;
        }
        else if (char === ")") {
            depth -= 1;
            current += char;
        }
        else if (char === "," && depth === 0) {
            if (current.trim().length > 0) {
                args.push(current.trim());
            }
            current = "";
        }
        else {
            current += char;
        }
    }
    if (current.trim().length > 0) {
        args.push(current.trim());
    }
    return args.length ? args : [argumentText.trim()];
}
function formatFunctionArgument(argument) {
    const trimmed = argument.trim();
    if (!trimmed.length) {
        throw new SqliteTranslationError("Function arguments cannot be empty");
    }
    if (trimmed === "*") {
        return "*";
    }
    if (/^[0-9]+(\.[0-9]+)?$/.test(trimmed)) {
        return trimmed;
    }
    if (/^'.*'$/.test(trimmed) || /^".*"$/.test(trimmed)) {
        return trimmed;
    }
    if (trimmed.toUpperCase().startsWith("DISTINCT ")) {
        const remainder = trimmed.slice(8).trim();
        return `DISTINCT ${formatFunctionArgument(remainder)}`;
    }
    const nestedFunction = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
    if (nestedFunction) {
        return formatFunctionCall(nestedFunction[1], nestedFunction[2]);
    }
    return quoteQualifiedIdentifier(trimmed);
}
// normalizeValue is now imported from utils/sqlite-utils
//# sourceMappingURL=query-translator.js.map
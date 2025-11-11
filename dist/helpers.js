"use strict";
/**
 * Purpose: Helper utilities for working with Hazo Connect adapters
 *
 * These helpers provide reusable patterns for building queries,
 * executing CRUD operations, and instrumenting interactions without
 * embedding any project-specific knowledge. They allow downstream
 * applications to compose higher-level services while keeping the
 * hazo_connect component self-contained and reusable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTableQuery = createTableQuery;
exports.attachExecute = attachExecute;
exports.createCrudService = createCrudService;
exports.executeQuery = executeQuery;
const query_builder_1 = require("./query-builder");
/**
 * Create a query builder for a table and attach the adapter execute method.
 * @param adapter - Active Hazo Connect adapter
 * @param table - Table name to query
 * @param logger - Optional logger for diagnostics
 * @returns Executable query builder
 */
function createTableQuery(adapter, table, logger) {
    const builder = new query_builder_1.QueryBuilder().from(table);
    return attachExecute(builder, adapter, logger);
}
/**
 * Attach execute helper to a query builder.
 * @param builder - Query builder instance
 * @param adapter - Active adapter
 * @param logger - Optional logger for diagnostics
 * @returns Executable query builder
 */
function attachExecute(builder, adapter, logger) {
    const executable = builder;
    executable.execute = async (method = 'GET', body) => {
        logger?.debug?.('Executing Hazo Connect query', {
            method,
            table: builder.getTable(),
            hasBody: Boolean(body)
        });
        return adapter.query(builder, method, body);
    };
    return executable;
}
/**
 * Create a CRUD service wrapper for a PostgREST table.
 * @param adapter - Hazo Connect adapter
 * @param table - Table name
 * @param options - CRUD helper options
 * @returns CRUD service instance
 */
function createCrudService(adapter, table, options = {}) {
    const primaryKeys = options.primaryKeys && options.primaryKeys.length > 0 ? options.primaryKeys : ['id'];
    const logger = options.logger;
    function buildQuery() {
        return createTableQuery(adapter, table, logger);
    }
    async function list(configure) {
        let qb = buildQuery();
        if (configure) {
            qb = configure(qb);
        }
        const result = await qb.execute('GET');
        return Array.isArray(result) ? result : [];
    }
    async function findBy(criteria) {
        const qb = buildQuery();
        for (const [field, value] of Object.entries(criteria)) {
            qb.where(field, Array.isArray(value) ? 'in' : 'eq', value);
        }
        return list(() => qb);
    }
    async function findOneBy(criteria) {
        const results = await findBy(criteria);
        return results.length > 0 ? results[0] : null;
    }
    async function findById(id) {
        if (primaryKeys.length !== 1) {
            logger?.warn?.('findById called on multi-key table, falling back to first primary key', {
                table,
                primaryKeys
            });
        }
        const key = primaryKeys[0];
        return findOneBy({ [key]: id });
    }
    async function insert(data) {
        const qb = buildQuery();
        const payload = Array.isArray(data) ? data : [data];
        const result = await qb.execute('POST', payload);
        if (Array.isArray(result)) {
            return result;
        }
        return payload;
    }
    async function updateById(id, patch) {
        const qb = buildQuery();
        if (primaryKeys.length !== 1) {
            logger?.warn?.('updateById called on multi-key table, falling back to first primary key', {
                table,
                primaryKeys
            });
        }
        qb.where(primaryKeys[0], 'eq', id);
        const result = await qb.execute('PATCH', patch);
        if (Array.isArray(result)) {
            return result;
        }
        return [{ ...patch, [primaryKeys[0]]: id }];
    }
    async function deleteById(id) {
        const qb = buildQuery();
        if (primaryKeys.length !== 1) {
            logger?.warn?.('deleteById called on multi-key table, falling back to first primary key', {
                table,
                primaryKeys
            });
        }
        qb.where(primaryKeys[0], 'eq', id);
        await qb.execute('DELETE');
    }
    return {
        list,
        findBy,
        findOneBy,
        findById,
        insert,
        updateById,
        deleteById,
        query: buildQuery
    };
}
/**
 * Execute a query builder with optional logging and error wrapping.
 * @param adapter - Hazo Connect adapter
 * @param builder - Configured query builder
 * @param method - HTTP verb / operation
 * @param body - Optional body payload
 * @param logger - Optional logger for diagnostics
 * @returns Result of adapter query
 */
async function executeQuery(adapter, builder, method = 'GET', body, logger) {
    logger?.debug?.('Executing query via executeQuery helper', {
        method,
        table: builder.getTable()
    });
    return adapter.query(builder, method, body);
}
//# sourceMappingURL=helpers.js.map
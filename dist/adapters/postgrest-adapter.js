"use strict";
/**
 * Purpose: PostgREST adapter implementation
 *
 * This adapter converts QueryBuilder to PostgREST URL format and executes queries.
 * Uses injected config and logger (no file reading or project dependencies).
 * Zero dependencies - only Node.js built-ins (fetch) and types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgrestAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const types_1 = require("../types");
/**
 * PostgREST adapter implementation
 */
class PostgrestAdapter extends base_adapter_1.BaseAdapter {
    /**
     * Constructor
     * @param config - PostgREST configuration (must include postgrest.base_url and postgrest.api_key)
     * @param logger - Optional logger instance
     */
    constructor(config, logger) {
        super(config, logger);
        // Extract PostgREST-specific config
        this.postgrestConfig = config.postgrest || config;
        // Validate required fields in postgrestConfig, not the main config
        if (!this.postgrestConfig.base_url || !this.postgrestConfig.api_key) {
            this.throwError(types_1.ErrorCode.CONFIG_ERROR, 'PostgREST base_url and api_key are required in configuration');
        }
        // Ensure base_url doesn't end with /
        if (this.postgrestConfig.base_url.endsWith('/')) {
            this.postgrestConfig.base_url = this.postgrestConfig.base_url.slice(0, -1);
        }
    }
    /**
     * Convert QueryBuilder to PostgREST URL
     * @param builder - QueryBuilder instance
     * @returns PostgREST endpoint URL with query parameters
     */
    buildPostgrestUrl(builder) {
        const table = builder.getTable();
        if (!table) {
            this.throwError(types_1.ErrorCode.VALIDATION_ERROR, 'Table name is required');
        }
        const params = [];
        // Select fields
        const selectFields = builder.getSelectFields();
        const nestedSelects = builder.getNestedSelects();
        if (selectFields.length > 0 || nestedSelects.length > 0) {
            const selectParts = [];
            // Add regular select fields
            if (selectFields.length > 0) {
                selectParts.push(...selectFields);
            }
            // Add nested selects (PostgREST syntax: table:related_table(field1,field2))
            if (nestedSelects.length > 0) {
                const nestedParts = nestedSelects.map(ns => {
                    const fields = ns.fields.join(',');
                    return `${table}:${ns.table}(${fields})`;
                });
                selectParts.push(...nestedParts);
            }
            if (selectParts.length > 0) {
                params.push(`select=${encodeURIComponent(selectParts.join(','))}`);
            }
        }
        // Where conditions
        const whereConditions = builder.getWhereConditions();
        for (const condition of whereConditions) {
            const { field, operator, value } = condition;
            let paramValue;
            if (operator === 'in') {
                // IN operator: field=in.(value1,value2)
                const values = Array.isArray(value) ? value : [value];
                paramValue = `in.(${values.map(v => String(v)).join(',')})`;
            }
            else if (operator === 'is') {
                // IS operator: field=is.null or field=is.not.null
                paramValue = value === null || value === 'null' ? 'is.null' : 'is.not.null';
            }
            else {
                // Standard operators: field=operator.value
                paramValue = `${operator}.${String(value)}`;
            }
            params.push(`${field}=${encodeURIComponent(paramValue)}`);
        }
        // OR conditions
        const whereOrConditions = builder.getWhereOrConditions();
        if (whereOrConditions.length > 0) {
            const orParts = [];
            for (const orGroup of whereOrConditions) {
                const groupParts = orGroup.map(condition => {
                    const { field, operator, value } = condition;
                    if (operator === 'in') {
                        const values = Array.isArray(value) ? value : [value];
                        return `${field}.in.(${values.map(v => String(v)).join(',')})`;
                    }
                    else if (operator === 'is') {
                        return `${field}.is.${value === null || value === 'null' ? 'null' : 'not.null'}`;
                    }
                    else {
                        return `${field}.${operator}.${String(value)}`;
                    }
                });
                orParts.push(`(${groupParts.join(',')})`);
            }
            params.push(`or=${encodeURIComponent(orParts.join(','))}`);
        }
        // Order by
        const orderBy = builder.getOrderBy();
        if (orderBy.length > 0) {
            const orderParts = orderBy.map(o => `${o.field}.${o.direction}`);
            params.push(`order=${encodeURIComponent(orderParts.join(','))}`);
        }
        // Limit
        const limit = builder.getLimit();
        if (limit !== null) {
            params.push(`limit=${limit}`);
        }
        // Offset
        const offset = builder.getOffset();
        if (offset !== null) {
            params.push(`offset=${offset}`);
        }
        // Build final URL
        const queryString = params.length > 0 ? `?${params.join('&')}` : '';
        return `/${table}${queryString}`;
    }
    /**
     * Execute a query using the query builder
     * @param builder - QueryBuilder instance
     * @param method - HTTP method
     * @param body - Request body for POST/PUT/PATCH
     * @returns Promise with query results
     */
    async query(builder, method = 'GET', body) {
        const endpoint = this.buildPostgrestUrl(builder);
        this.logQuery('PostgREST query', {
            method,
            endpoint,
            hasBody: !!body,
            bodySize: body ? JSON.stringify(body).length : 0
        });
        return this.rawQuery(endpoint, {
            method,
            body: body ? JSON.stringify(body) : undefined,
            headers: {
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
    }
    /**
     * Execute a raw query (for backward compatibility)
     * @param endpoint - Raw endpoint string (e.g., '/table?id=eq.123')
     * @param options - Request options
     * @returns Promise with query results
     */
    async rawQuery(endpoint, options = {}) {
        const url = `${this.postgrestConfig.base_url}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.postgrestConfig.api_key}`,
            ...options.headers,
        };
        // Log request (redact sensitive data)
        this.logQuery('PostgREST raw query', {
            url: url.replace(this.postgrestConfig.api_key, '...REDACTED...'),
            method: options.method || 'GET',
            hasBody: !!options.body
        });
        try {
            const response = await fetch(url, { ...options, headers });
            if (!response.ok) {
                const errorData = await response.text();
                const parsedDetails = this.parseErrorPayload(errorData);
                const sanitizedUrl = this.sanitizeUrl(url);
                const friendlyMessage = this.buildFriendlyErrorMessage(response.status, response.statusText, endpoint, parsedDetails, sanitizedUrl);
                this.logger.error('PostgREST request failed', {
                    status: response.status,
                    statusText: response.statusText,
                    error: parsedDetails ?? errorData,
                    url: sanitizedUrl
                });
                this.throwError(types_1.ErrorCode.QUERY_ERROR, friendlyMessage, response.status, parsedDetails ?? errorData);
            }
            // Handle empty response
            const responseBody = await response.text();
            if (!responseBody) {
                return null;
            }
            const parsedData = JSON.parse(responseBody);
            // Log successful response
            this.logger.info('PostgREST request succeeded', {
                status: response.status,
                dataType: Array.isArray(parsedData) ? 'array' : typeof parsedData,
                dataLength: Array.isArray(parsedData) ? parsedData.length : 1
            });
            return parsedData;
        }
        catch (error) {
            // Handle connection errors
            if (this.isConnectionError(error)) {
                this.throwError(types_1.ErrorCode.CONNECTION_FAILED, 'Lost connection to database', undefined, error);
            }
            // Re-throw with error code if not already set
            if (error.code) {
                throw error;
            }
            this.throwError(types_1.ErrorCode.QUERY_ERROR, `PostgREST request error: ${error.message || String(error)}`, undefined, error);
        }
    }
    /**
     * Get the adapter's configuration
     * @returns Promise with adapter-specific config
     */
    async getConfig() {
        return Promise.resolve(this.postgrestConfig);
    }
    parseErrorPayload(raw) {
        if (!raw) {
            return undefined;
        }
        try {
            return JSON.parse(raw);
        }
        catch {
            return raw;
        }
    }
    buildFriendlyErrorMessage(status, statusText, endpoint, parsedDetails, sanitizedUrl) {
        const resource = endpoint.replace(/^\//, '').split('?')[0] || 'resource';
        const detailMessage = parsedDetails && typeof parsedDetails === 'object' && parsedDetails.message
            ? ` Details: ${parsedDetails.message}`
            : '';
        const requestInfo = ` Request: ${sanitizedUrl}`;
        if (status === 404) {
            return `PostgREST could not find resource '${resource}'. Verify the table or view name and ensure the schema is correct. (${statusText}).${detailMessage}${requestInfo}`;
        }
        if (status === 401) {
            return `PostgREST rejected the request (401 Unauthorized). Check that the provided API key has access to '${resource}'.${detailMessage}${requestInfo}`;
        }
        return `PostgREST request failed (${status} ${statusText}).${detailMessage}${requestInfo}`;
    }
    sanitizeUrl(url) {
        return this.postgrestConfig.api_key
            ? url.replace(this.postgrestConfig.api_key, '...REDACTED...')
            : url;
    }
}
exports.PostgrestAdapter = PostgrestAdapter;
//# sourceMappingURL=postgrest-adapter.js.map
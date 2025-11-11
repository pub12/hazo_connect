"use strict";
/**
 * Purpose: Server-only entry point for Hazo Connect
 *
 * This file exports all server-side functionality with 'use server' directive
 * and runtime guards to prevent client-side usage.
 */
'use server';
/**
 * Purpose: Server-only entry point for Hazo Connect
 *
 * This file exports all server-side functionality with 'use server' directive
 * and runtime guards to prevent client-side usage.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigurationTips = exports.validateNextJsConfig = exports.clearRegisteredAdapter = exports.registerSqliteAdapter = exports.initializeAdminService = exports.getSqliteAdminService = exports.FileAdapter = exports.SupabaseAdapter = exports.SqliteAdapter = exports.PostgrestAdapter = exports.BaseAdapter = exports.executeQuery = exports.createTableQuery = exports.createCrudService = exports.attachExecute = exports.createHazoConnect = exports.QueryBuilder = exports.noOpLogger = exports.ErrorCode = void 0;
/**
 * Runtime guard to ensure this module is only used on the server
 * @throws Error if called in a browser environment
 */
function ensureServerOnly() {
    if (typeof window !== 'undefined') {
        throw new Error('hazo_connect/server can only be used on the server. ' +
            'For client-side usage, import types from "hazo_connect" or "hazo_connect/ui".');
    }
}
// Check immediately when module loads
ensureServerOnly();
var types_1 = require("../types");
Object.defineProperty(exports, "ErrorCode", { enumerable: true, get: function () { return types_1.ErrorCode; } });
Object.defineProperty(exports, "noOpLogger", { enumerable: true, get: function () { return types_1.noOpLogger; } });
// Export query builder
var query_builder_1 = require("../query-builder");
Object.defineProperty(exports, "QueryBuilder", { enumerable: true, get: function () { return query_builder_1.QueryBuilder; } });
// Export factory
var factory_1 = require("../factory");
Object.defineProperty(exports, "createHazoConnect", { enumerable: true, get: function () { return factory_1.createHazoConnect; } });
// Export helpers
var helpers_1 = require("../helpers");
Object.defineProperty(exports, "attachExecute", { enumerable: true, get: function () { return helpers_1.attachExecute; } });
Object.defineProperty(exports, "createCrudService", { enumerable: true, get: function () { return helpers_1.createCrudService; } });
Object.defineProperty(exports, "createTableQuery", { enumerable: true, get: function () { return helpers_1.createTableQuery; } });
Object.defineProperty(exports, "executeQuery", { enumerable: true, get: function () { return helpers_1.executeQuery; } });
// Export adapters (for advanced usage)
var base_adapter_1 = require("../adapters/base-adapter");
Object.defineProperty(exports, "BaseAdapter", { enumerable: true, get: function () { return base_adapter_1.BaseAdapter; } });
var postgrest_adapter_1 = require("../adapters/postgrest-adapter");
Object.defineProperty(exports, "PostgrestAdapter", { enumerable: true, get: function () { return postgrest_adapter_1.PostgrestAdapter; } });
var sqlite_adapter_1 = require("../adapters/sqlite-adapter");
Object.defineProperty(exports, "SqliteAdapter", { enumerable: true, get: function () { return sqlite_adapter_1.SqliteAdapter; } });
var supabase_adapter_1 = require("../adapters/supabase-adapter");
Object.defineProperty(exports, "SupabaseAdapter", { enumerable: true, get: function () { return supabase_adapter_1.SupabaseAdapter; } });
var file_adapter_1 = require("../adapters/file-adapter");
Object.defineProperty(exports, "FileAdapter", { enumerable: true, get: function () { return file_adapter_1.FileAdapter; } });
// Export SQLite admin helpers
var admin_service_1 = require("../sqlite/admin-service");
Object.defineProperty(exports, "getSqliteAdminService", { enumerable: true, get: function () { return admin_service_1.getSqliteAdminService; } });
Object.defineProperty(exports, "initializeAdminService", { enumerable: true, get: function () { return admin_service_1.initializeAdminService; } });
Object.defineProperty(exports, "registerSqliteAdapter", { enumerable: true, get: function () { return admin_service_1.registerSqliteAdapter; } });
Object.defineProperty(exports, "clearRegisteredAdapter", { enumerable: true, get: function () { return admin_service_1.clearRegisteredAdapter; } });
// Export configuration validation utilities
var config_validator_1 = require("../utils/config-validator");
Object.defineProperty(exports, "validateNextJsConfig", { enumerable: true, get: function () { return config_validator_1.validateNextJsConfig; } });
Object.defineProperty(exports, "getConfigurationTips", { enumerable: true, get: function () { return config_validator_1.getConfigurationTips; } });
//# sourceMappingURL=index.js.map
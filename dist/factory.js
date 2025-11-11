"use strict";
/**
 * Purpose: Factory function to create Hazo Connect adapter instances
 *
 * This file provides the factory function that creates the appropriate
 * adapter based on configuration type.
 * Zero dependencies - only uses types and adapters.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHazoConnect = createHazoConnect;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const postgrest_adapter_1 = require("./adapters/postgrest-adapter");
const supabase_adapter_1 = require("./adapters/supabase-adapter");
const sqlite_adapter_1 = require("./adapters/sqlite-adapter");
const file_adapter_1 = require("./adapters/file-adapter");
const admin_service_1 = require("./sqlite/admin-service");
// Ensure environment variables from .env.local are loaded before resolving configuration
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env.local') });
/**
 * Extract PostgREST API key from environment variables
 * @returns API key or empty string
 */
function extractPostgrestApiKey() {
    return process.env.postgrest_api_key || process.env.POSTGREST_API_KEY || '';
}
/**
 * Extract PostgREST configuration
 * @param configProvider - Optional ConfigProvider instance
 * @returns PostgREST configuration object
 */
function extractPostgrestConfig(configProvider) {
    const envApiKey = extractPostgrestApiKey();
    if (!envApiKey) {
        throw new Error('Environment variable postgrest_api_key is required for PostgREST connections');
    }
    const baseUrl = configProvider
        ? configProvider.get('postgrest', 'base_url') || ''
        : '';
    return {
        postgrest: {
            base_url: baseUrl,
            api_key: envApiKey
        }
    };
}
/**
 * Extract configuration from ConfigProvider if provided
 * @param configProvider - ConfigProvider instance
 * @param type - Connection type
 * @returns Provider-specific configuration object
 */
function extractConfigFromProvider(configProvider, type) {
    if (type === 'postgrest') {
        return extractPostgrestConfig(configProvider);
    }
    else if (type === 'supabase') {
        return { supabase: configProvider.getSection('supabase') || {} };
    }
    else if (type === 'sqlite') {
        return { sqlite: configProvider.getSection('sqlite') || {} };
    }
    else if (type === 'file') {
        return { file: configProvider.getSection('file') || {} };
    }
    return {};
}
/**
 * Create a Hazo Connect adapter instance based on configuration
 * @param config - Hazo Connect configuration (can include ConfigProvider or direct config)
 * @returns Adapter instance implementing HazoConnectAdapter
 * @throws Error if configuration is invalid or required values are missing
 */
function createHazoConnect(config) {
    const { type, logger, configProvider, ...directProviderConfig } = config;
    // Validate type
    if (!type) {
        throw new Error('Connection type is required. ' +
            'Set type to one of: postgrest, supabase, sqlite, file. ' +
            'Or set HAZO_CONNECT_TYPE environment variable.');
    }
    // Extract config from ConfigProvider if provided, otherwise use direct config
    let providerConfig;
    if (configProvider) {
        providerConfig = extractConfigFromProvider(configProvider, type);
    }
    else {
        providerConfig = { ...directProviderConfig };
        // Auto-detect SQLite type from environment if not specified
        if (!type && process.env.HAZO_CONNECT_TYPE) {
            const envType = process.env.HAZO_CONNECT_TYPE.toLowerCase();
            if (['postgrest', 'supabase', 'sqlite', 'file'].includes(envType)) {
                providerConfig.type = envType;
            }
        }
        if (type === 'postgrest') {
            const postgrestConfig = extractPostgrestConfig();
            // Merge: preserve direct config's postgrest values, add API key from env
            providerConfig.postgrest = {
                ...postgrestConfig.postgrest,
                ...(providerConfig.postgrest || {})
            };
        }
        else if (type === 'sqlite') {
            // Support path resolution from environment variables
            if (providerConfig.sqlite?.database_path) {
                const dbPath = providerConfig.sqlite.database_path;
                // If relative path, resolve it
                if (!path_1.default.isAbsolute(dbPath) && !dbPath.startsWith(':memory:')) {
                    providerConfig.sqlite.database_path = path_1.default.resolve(process.cwd(), dbPath);
                }
            }
            else if (process.env.HAZO_CONNECT_SQLITE_PATH || process.env.SQLITE_DATABASE_PATH) {
                const envPath = process.env.HAZO_CONNECT_SQLITE_PATH || process.env.SQLITE_DATABASE_PATH || '';
                providerConfig.sqlite = providerConfig.sqlite || {};
                if (path_1.default.isAbsolute(envPath)) {
                    providerConfig.sqlite.database_path = envPath;
                }
                else {
                    providerConfig.sqlite.database_path = path_1.default.resolve(process.cwd(), envPath);
                }
            }
        }
    }
    // Initialize admin service if enabled (only for SQLite)
    if (type === 'sqlite' && config.enable_admin_ui === true) {
        (0, admin_service_1.initializeAdminService)({ enable_admin_ui: true });
    }
    let adapter;
    switch (type) {
        case 'postgrest':
            adapter = new postgrest_adapter_1.PostgrestAdapter(providerConfig, logger);
            break;
        case 'supabase':
            adapter = new supabase_adapter_1.SupabaseAdapter(providerConfig, logger);
            break;
        case 'sqlite':
            adapter = new sqlite_adapter_1.SqliteAdapter(providerConfig, logger);
            // If admin UI is enabled, register this adapter so admin service uses the same instance
            if (config.enable_admin_ui === true && adapter instanceof sqlite_adapter_1.SqliteAdapter) {
                (0, admin_service_1.registerSqliteAdapter)(adapter);
            }
            break;
        case 'file':
            adapter = new file_adapter_1.FileAdapter(providerConfig, logger);
            break;
        default:
            throw new Error(`Unsupported connection type: ${type}. ` +
                `Supported types: postgrest, supabase, sqlite, file. ` +
                `Set HAZO_CONNECT_TYPE environment variable or provide type in configuration.`);
    }
    return adapter;
}
//# sourceMappingURL=factory.js.map
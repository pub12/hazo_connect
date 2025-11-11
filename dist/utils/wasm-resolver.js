"use strict";
/**
 * Purpose: WASM file path resolution for sql.js in various environments (Node.js, Next.js, etc.)
 *
 * This module handles locating the sql-wasm.wasm file needed by sql.js,
 * with special handling for Next.js server components and different deployment scenarios.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWasmDirectory = resolveWasmDirectory;
exports.createSqlJsConfig = createSqlJsConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const module_1 = require("module");
const nodeRequire = (0, module_1.createRequire)(__filename);
(function () {
    // @ts-ignore - Define module for sql.js compatibility
    if (typeof module === 'undefined' || !module || typeof module.exports === 'undefined') {
        // @ts-ignore
        globalThis.module = { exports: {} };
        // @ts-ignore - Also set in current scope if possible
        if (typeof global !== 'undefined') {
            // @ts-ignore
            global.module = globalThis.module;
        }
    }
})();
/**
 * Resolve the directory containing the sql-wasm.wasm file
 * @param config - Configuration with optional wasm_directory
 * @returns Path to WASM directory (file system path or URL indicator)
 */
function resolveWasmDirectory(config) {
    if (config.wasm_directory) {
        // If it's already a URL path (starts with /), return as-is for Next.js
        if (config.wasm_directory.startsWith('/') && !path_1.default.isAbsolute(config.wasm_directory)) {
            return config.wasm_directory;
        }
        // Otherwise resolve as file system path
        return path_1.default.resolve(config.wasm_directory);
    }
    // Try multiple strategies to find the WASM file
    const strategies = [
        // Strategy 1: Try node_modules via require.resolve
        () => {
            try {
                const resolved = nodeRequire.resolve('sql.js/dist/sql-wasm.wasm');
                if (fs_1.default.existsSync(resolved)) {
                    return path_1.default.dirname(resolved);
                }
            }
            catch {
                // Ignore
            }
            return null;
        },
        // Strategy 2: Try public directory (for Next.js)
        () => {
            const publicPath = path_1.default.join(process.cwd(), 'public', 'sql-wasm.wasm');
            if (fs_1.default.existsSync(publicPath)) {
                return path_1.default.join(process.cwd(), 'public');
            }
            return null;
        },
        // Strategy 3: Try node_modules relative to cwd
        () => {
            const nodeModulesPath = path_1.default.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
            if (fs_1.default.existsSync(nodeModulesPath)) {
                return path_1.default.join(process.cwd(), 'node_modules', 'sql.js', 'dist');
            }
            return null;
        }
    ];
    for (const strategy of strategies) {
        const result = strategy();
        if (result) {
            return result;
        }
    }
    // Final fallback: use public URL path for Next.js
    return '/';
}
/**
 * Create sql.js configuration with locateFile function
 * @param wasmDirectory - Directory path (file system or URL indicator)
 * @returns sql.js configuration object
 */
function createSqlJsConfig(wasmDirectory) {
    return {
        locateFile: (file) => {
            // sql.js in Node.js uses fs.readFileSync, so we need actual file system paths
            // If wasmDirectory is a URL path indicator (starts with /), resolve to actual file path
            if (wasmDirectory === '/' || (wasmDirectory.startsWith('/') && !path_1.default.isAbsolute(wasmDirectory))) {
                // Try public directory first (where we copied the WASM file)
                const publicPath = path_1.default.join(process.cwd(), 'public', file);
                if (fs_1.default.existsSync(publicPath)) {
                    return publicPath;
                }
                // Fallback to node_modules
                const nodeModulesPath = path_1.default.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file);
                if (fs_1.default.existsSync(nodeModulesPath)) {
                    return nodeModulesPath;
                }
                // Return public path anyway (sql.js will show a clearer error)
                return publicPath;
            }
            // Use file system path directly
            const fullPath = path_1.default.join(wasmDirectory, file);
            // Verify the file exists
            if (fs_1.default.existsSync(fullPath)) {
                return fullPath;
            }
            // Fallback: try public directory
            const publicPath = path_1.default.join(process.cwd(), 'public', file);
            if (fs_1.default.existsSync(publicPath)) {
                return publicPath;
            }
            // Last resort: return the constructed path
            return fullPath;
        }
    };
}
//# sourceMappingURL=wasm-resolver.js.map
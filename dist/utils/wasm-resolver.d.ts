/**
 * Purpose: WASM file path resolution for sql.js in various environments (Node.js, Next.js, etc.)
 *
 * This module handles locating the sql-wasm.wasm file needed by sql.js,
 * with special handling for Next.js server components and different deployment scenarios.
 */
export interface WasmResolverConfig {
    wasm_directory?: string;
}
export interface SqlJsConfig {
    locateFile: (file: string) => string;
}
/**
 * Resolve the directory containing the sql-wasm.wasm file
 * @param config - Configuration with optional wasm_directory
 * @returns Path to WASM directory (file system path or URL indicator)
 */
export declare function resolveWasmDirectory(config: WasmResolverConfig): string;
/**
 * Create sql.js configuration with locateFile function
 * @param wasmDirectory - Directory path (file system or URL indicator)
 * @returns sql.js configuration object
 */
export declare function createSqlJsConfig(wasmDirectory: string): SqlJsConfig;
//# sourceMappingURL=wasm-resolver.d.ts.map
/**
 * Purpose: WASM file path resolution for sql.js in various environments (Node.js, Next.js, etc.)
 *
 * This module handles locating the sql-wasm.wasm file needed by sql.js,
 * with special handling for Next.js server components and different deployment scenarios.
 */

import fs from "fs"
import path from "path"
import { createRequire } from "module"

const nodeRequire = createRequire(__filename)

// Ensure CommonJS module object exists for sql.js compatibility in Next.js ESM context
// sql.js checks typeof module !== 'undefined' but then tries to set module.exports
// In Next.js bundling, module may be defined but undefined, causing the error
// We need to ensure module is a proper object before sql.js loads
;(function() {
  // @ts-ignore - Define module for sql.js compatibility
  if (typeof module === 'undefined' || !module || typeof module.exports === 'undefined') {
    // @ts-ignore
    globalThis.module = { exports: {} }
    // @ts-ignore - Also set in current scope if possible
    if (typeof global !== 'undefined') {
      // @ts-ignore
      global.module = globalThis.module
    }
  }
})()

export interface WasmResolverConfig {
  wasm_directory?: string
}

export interface SqlJsConfig {
  locateFile: (file: string) => string
}

/**
 * Resolve the directory containing the sql-wasm.wasm file
 * @param config - Configuration with optional wasm_directory
 * @returns Path to WASM directory (file system path or URL indicator)
 */
export function resolveWasmDirectory(config: WasmResolverConfig): string {
  if (config.wasm_directory) {
    // If it's already a URL path (starts with /), return as-is for Next.js
    if (config.wasm_directory.startsWith('/') && !path.isAbsolute(config.wasm_directory)) {
      return config.wasm_directory
    }
    // Otherwise resolve as file system path
    return path.resolve(config.wasm_directory)
  }

  // Try multiple strategies to find the WASM file
  const strategies = [
    // Strategy 1: Try node_modules via require.resolve
    () => {
      try {
        const resolved = nodeRequire.resolve('sql.js/dist/sql-wasm.wasm')
        if (fs.existsSync(resolved)) {
          return path.dirname(resolved)
        }
      } catch {
        // Ignore
      }
      return null
    },
    // Strategy 2: Try public directory (for Next.js)
    () => {
      const publicPath = path.join(process.cwd(), 'public', 'sql-wasm.wasm')
      if (fs.existsSync(publicPath)) {
        return path.join(process.cwd(), 'public')
      }
      return null
    },
    // Strategy 3: Try node_modules relative to cwd
    () => {
      const nodeModulesPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
      if (fs.existsSync(nodeModulesPath)) {
        return path.join(process.cwd(), 'node_modules', 'sql.js', 'dist')
      }
      return null
    }
  ]

  for (const strategy of strategies) {
    const result = strategy()
    if (result) {
      return result
    }
  }

  // Final fallback: use public URL path for Next.js
  return '/'
}

/**
 * Create sql.js configuration with locateFile function
 * @param wasmDirectory - Directory path (file system or URL indicator)
 * @returns sql.js configuration object
 */
export function createSqlJsConfig(wasmDirectory: string): SqlJsConfig {
  return {
    locateFile: (file: string) => {
      // sql.js in Node.js uses fs.readFileSync, so we need actual file system paths
      // If wasmDirectory is a URL path indicator (starts with /), resolve to actual file path
      if (wasmDirectory === '/' || (wasmDirectory.startsWith('/') && !path.isAbsolute(wasmDirectory))) {
        // Try public directory first (where we copied the WASM file)
        const publicPath = path.join(process.cwd(), 'public', file)
        if (fs.existsSync(publicPath)) {
          return publicPath
        }
        // Fallback to node_modules
        const nodeModulesPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
        if (fs.existsSync(nodeModulesPath)) {
          return nodeModulesPath
        }
        // Return public path anyway (sql.js will show a clearer error)
        return publicPath
      }

      // Use file system path directly
      const fullPath = path.join(wasmDirectory, file)

      // Verify the file exists
      if (fs.existsSync(fullPath)) {
        return fullPath
      }

      // Fallback: try public directory
      const publicPath = path.join(process.cwd(), 'public', file)
      if (fs.existsSync(publicPath)) {
        return publicPath
      }

      // Last resort: return the constructed path
      return fullPath
    }
  }
}


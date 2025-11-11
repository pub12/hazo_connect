/**
 * Purpose: Configuration validation utilities for hazo_connect
 *
 * This file provides validation functions to check Next.js configuration
 * and provide helpful error messages for common misconfigurations.
 */
/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Validate Next.js configuration for hazo_connect with SQLite
 *
 * Checks for common misconfigurations and provides helpful error messages.
 *
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * import { validateNextJsConfig } from 'hazo_connect/server'
 *
 * const result = validateNextJsConfig()
 * if (!result.valid) {
 *   console.error('Configuration errors:', result.errors)
 * }
 * ```
 */
export declare function validateNextJsConfig(): ValidationResult;
/**
 * Get helpful configuration tips based on current environment
 *
 * @returns Array of configuration tips
 */
export declare function getConfigurationTips(): string[];
//# sourceMappingURL=config-validator.d.ts.map
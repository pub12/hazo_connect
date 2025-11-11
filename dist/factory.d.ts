/**
 * Purpose: Factory function to create Hazo Connect adapter instances
 *
 * This file provides the factory function that creates the appropriate
 * adapter based on configuration type.
 * Zero dependencies - only uses types and adapters.
 */
import type { HazoConnectConfig, HazoConnectAdapter } from './types';
/**
 * Create a Hazo Connect adapter instance based on configuration
 * @param config - Hazo Connect configuration (can include ConfigProvider or direct config)
 * @returns Adapter instance implementing HazoConnectAdapter
 * @throws Error if configuration is invalid or required values are missing
 */
export declare function createHazoConnect(config: HazoConnectConfig): HazoConnectAdapter;
//# sourceMappingURL=factory.d.ts.map
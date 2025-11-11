/**
 * Purpose: Main export file for Next.js-specific Hazo Connect helpers
 * 
 * This file exports Next.js API route helpers and server-only utilities.
 */

'use server'

// Re-export API route helpers
export {
  createApiRouteHandler,
  getServerHazoConnect,
  type ApiRouteHandler,
  type ApiRouteHandlerOptions,
  type ApiRouteHazoConfig
} from './api-route-helpers'

// Re-export server-only functionality
export * from './server-only'

// Re-export setup helpers
export {
  createHazoConnectFromEnv,
  getHazoConnectSingleton,
  resetHazoConnectSingleton,
  type CreateHazoConnectFromEnvOptions
} from './setup-helpers'


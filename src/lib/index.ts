/**
 * Purpose: Main export file for Hazo Connect (Types Only)
 * 
 * This file exports only TypeScript types and interfaces.
 * For runtime code, use:
 * - `hazo_connect/server` - Server-side functionality (Node.js, API routes, Server Components)
 * - `hazo_connect/nextjs` - Next.js-specific helpers (API route handlers, Server Components)
 * - `hazo_connect/ui` - UI-safe types for client components
 * 
 * Zero dependencies - only type exports.
 */

// Export all types from types.ts
export type {
  Logger,
  ConnectionType,
  HazoConnectConfig,
  HazoConnectAdapter,
  QueryOperator,
  WhereCondition,
  OrderDirection,
  JoinType,
  NestedSelect,
  HazoConnectError
} from './types'

// Note: ErrorCode enum and runtime code have been moved to hazo_connect/server
// Import runtime functionality from 'hazo_connect/server' or 'hazo_connect/nextjs'
// For types only, use the type exports above


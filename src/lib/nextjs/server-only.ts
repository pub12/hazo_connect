/**
 * Purpose: Server-only initialization helpers for Next.js
 * 
 * This file provides server-only utilities that re-export hazo_connect/server
 * functionality with additional Next.js-specific helpers.
 */

'use server'

/**
 * Runtime guard to ensure this module is only used on the server
 */
function ensureServerOnly(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'hazo_connect/nextjs/server-only can only be used on the server. ' +
      'This module is designed for Next.js Server Components and API routes only.'
    )
  }
}

// Check immediately when module loads
ensureServerOnly()

// Re-export all server-side functionality from hazo_connect/server
export * from '../server'


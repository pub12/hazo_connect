/**
 * Example: Singleton Pattern for hazo_connect in Next.js
 * 
 * This example shows how to use a singleton pattern to share
 * a single hazo_connect instance across multiple API routes.
 */

// ============================================================================
// Step 1: Create singleton instance
// ============================================================================

// lib/hazo_connect.ts
import { getHazoConnectSingleton } from 'hazo_connect/nextjs/setup'
import type { HazoConnectAdapter } from 'hazo_connect/server'

/**
 * Get the singleton hazo_connect adapter instance
 * 
 * This instance is created on first call and reused for all subsequent calls.
 * Thread-safe for Next.js serverless environment.
 */
export const hazo: HazoConnectAdapter = getHazoConnectSingleton()

// ============================================================================
// Step 2: Use singleton in API routes
// ============================================================================

// app/api/users/route.ts
import { NextResponse } from 'next/server'
import { hazo } from '@/lib/hazo_connect'
import { QueryBuilder } from 'hazo_connect/server'

export async function GET() {
  try {
    // Use the shared singleton instance
    const users = await hazo.query(
      new QueryBuilder()
        .from('users')
        .select('*')
        .order('name', 'asc')
    )
    
    return NextResponse.json({ data: users })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// app/api/posts/route.ts
import { NextResponse } from 'next/server'
import { hazo } from '@/lib/hazo_connect'
import { QueryBuilder } from 'hazo_connect/server'

export async function GET() {
  try {
    // Same singleton instance, different query
    const posts = await hazo.query(
      new QueryBuilder()
        .from('posts')
        .select('*')
        .order('created_at', 'desc')
        .limit(10)
    )
    
    return NextResponse.json({ data: posts })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// app/api/comments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { hazo } from '@/lib/hazo_connect'
import { QueryBuilder } from 'hazo_connect/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('post_id')
    
    let builder = new QueryBuilder()
      .from('comments')
      .select('*')
    
    if (postId) {
      builder = builder.where('post_id', 'eq', postId)
    }
    
    // Same singleton instance, filtered query
    const comments = await hazo.query(builder)
    
    return NextResponse.json({ data: comments })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Alternative: Manual Singleton Pattern
// ============================================================================

// lib/hazo_connect-manual.ts
import { createHazoConnect } from 'hazo_connect/server'
import type { HazoConnectAdapter } from 'hazo_connect/server'
import path from 'path'

let hazoInstance: HazoConnectAdapter | null = null

/**
 * Get or create the singleton hazo_connect adapter instance
 */
export function getHazoConnect(): HazoConnectAdapter {
  if (!hazoInstance) {
    hazoInstance = createHazoConnect({
      type: 'sqlite',
      sqlite: {
        database_path: process.env.HAZO_CONNECT_SQLITE_PATH
          ? path.resolve(process.env.HAZO_CONNECT_SQLITE_PATH)
          : path.resolve(process.cwd(), 'database.sqlite'),
        read_only: process.env.HAZO_CONNECT_SQLITE_READONLY === 'true'
      },
      enable_admin_ui: process.env.HAZO_CONNECT_ENABLE_ADMIN_UI === 'true'
    })
  }
  
  return hazoInstance
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetHazoConnect(): void {
  hazoInstance = null
}

// Usage:
// import { getHazoConnect } from '@/lib/hazo_connect-manual'
// const hazo = getHazoConnect()

// ============================================================================
// Benefits of Singleton Pattern
// ============================================================================

/**
 * Benefits:
 * 
 * 1. Single database connection shared across all API routes
 * 2. Reduced memory usage (one instance instead of many)
 * 3. Faster response times (no connection overhead per request)
 * 4. Thread-safe in Next.js serverless environment
 * 5. Configuration is centralized in one place
 * 
 * Note: The singleton is automatically created on first use and
 * reused for all subsequent calls. If configuration changes,
 * a new instance will be created automatically.
 */


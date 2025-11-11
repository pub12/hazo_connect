/**
 * Example: Next.js API Route using hazo_connect with SQLite
 * 
 * This example shows how to use hazo_connect in a Next.js API route
 * with proper error handling and environment variable configuration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHazoConnectFromEnv } from 'hazo_connect/nextjs/setup'
import { QueryBuilder } from 'hazo_connect/server'

/**
 * GET /api/users
 * 
 * Fetch all users from the database
 */
export async function GET(request: NextRequest) {
  try {
    // Create adapter instance (reads from environment variables)
    const hazo = createHazoConnectFromEnv()
    
    // Build and execute query
    const users = await hazo.query(
      new QueryBuilder()
        .from('users')
        .select(['id', 'name', 'email'])
        .order('name', 'asc')
    )
    
    return NextResponse.json({ 
      data: users,
      count: users.length 
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FETCH_USERS_ERROR'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users
 * 
 * Create a new user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email } = body
    
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }
    
    const hazo = createHazoConnectFromEnv()
    
    const newUser = await hazo.query(
      new QueryBuilder().from('users'),
      'POST',
      { name, email }
    )
    
    return NextResponse.json({ data: newUser }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CREATE_USER_ERROR'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/users/[id]
 * 
 * Fetch a single user by ID
 */
export async function GET_USER(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hazo = createHazoConnectFromEnv()
    
    const users = await hazo.query(
      new QueryBuilder()
        .from('users')
        .where('id', 'eq', params.id)
        .limit(1)
    )
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ data: users[0] })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FETCH_USER_ERROR'
      },
      { status: 500 }
    )
  }
}


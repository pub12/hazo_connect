/**
 * Example: Next.js Server Component fetching data via API route
 * 
 * This example shows the recommended pattern for using hazo_connect
 * in Server Components: fetch data from API routes instead of calling
 * hazo_connect directly.
 */

import { headers } from 'next/headers'

/**
 * Server Component that fetches data from API route
 * 
 * This is the recommended pattern because:
 * 1. API routes run in Node.js context where SQLite works
 * 2. Server Components can still go through webpack bundling
 * 3. Clear separation of concerns
 */
export default async function UsersPage() {
  // Get the host for building API URL
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = `${protocol}://${host}`
  
  // Fetch from API route (which uses hazo_connect)
  const response = await fetch(`${baseUrl}/api/users`, {
    cache: 'no-store', // Ensure fresh data
    headers: {
      // If you need to pass authentication, add headers here
    }
  })
  
  if (!response.ok) {
    return (
      <div>
        <h1>Error</h1>
        <p>Failed to load users: {response.statusText}</p>
      </div>
    )
  }
  
  const { data: users } = await response.json()
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <ul className="space-y-2">
          {users.map((user: { id: number; name: string; email: string }) => (
            <li key={user.id} className="border p-2 rounded">
              <div className="font-semibold">{user.name}</div>
              <div className="text-sm text-gray-600">{user.email}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Alternative: Server Component with Server Actions
 * 
 * If you prefer to use Server Actions instead of API routes:
 */

// app/users/page-with-actions.tsx
import { getUsers } from './actions'

export default async function UsersPageWithActions() {
  const users = await getUsers()
  
  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}

// app/users/actions.ts
'use server'

import { createHazoConnectFromEnv } from 'hazo_connect/nextjs/setup'
import { QueryBuilder } from 'hazo_connect/server'

export async function getUsers() {
  const hazo = createHazoConnectFromEnv()
  
  const users = await hazo.query(
    new QueryBuilder()
      .from('users')
      .select('*')
      .order('name', 'asc')
  )
  
  return users
}

/**
 * Why fetch from API routes instead of calling hazo_connect directly?
 * 
 * 1. Server Components can still be processed by webpack, which can cause
 *    issues with sql.js (Node.js module.exports)
 * 
 * 2. API routes always run in pure Node.js context where SQLite works reliably
 * 
 * 3. Better separation of concerns - data fetching logic in API routes,
 *    presentation logic in components
 * 
 * 4. Easier to add caching, authentication, rate limiting, etc. in API routes
 * 
 * 5. Can be reused by client components as well
 */


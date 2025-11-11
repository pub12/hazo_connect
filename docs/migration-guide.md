# Migration Guide for hazo_connect

This guide helps you migrate existing code to use the new server-side entry points and patterns.

## Table of Contents

- [From Old Import Paths](#from-old-import-paths)
- [From Client-Side to Server-Side](#from-client-side-to-server-side)
- [From Direct Calls to API Routes](#from-direct-calls-to-api-routes)
- [Testing Considerations](#testing-considerations)

## From Old Import Paths

### Before (Old Import)

```typescript
import { createHazoConnect, QueryBuilder } from 'hazo_connect'
```

### After (New Import)

```typescript
// For server-side code (API routes, Server Components, Server Actions)
import { createHazoConnect, QueryBuilder } from 'hazo_connect/server'

// For types in client components
import type { HazoConnectConfig, HazoConnectAdapter } from 'hazo_connect'
import type { TableSummary } from 'hazo_connect/ui'
```

### Migration Steps

1. **Find all imports** of `hazo_connect` in your codebase
2. **Replace server-side imports** with `hazo_connect/server`
3. **Replace type imports** in client components with `hazo_connect` or `hazo_connect/ui`
4. **Update test files** to use `hazo_connect/server`

## From Client-Side to Server-Side

### Before (Client Component - Won't Work)

```typescript
'use client'

import { createHazoConnect } from 'hazo_connect'  // ❌ Old import

export function MyComponent() {
  const [data, setData] = useState([])
  
  useEffect(() => {
    const hazo = createHazoConnect({ ... })
    hazo.query(...).then(setData)
  }, [])
  
  return <div>{/* render data */}</div>
}
```

### After (Client Component - Correct Pattern)

```typescript
'use client'

export function MyComponent() {
  const [data, setData] = useState([])
  
  useEffect(() => {
    // Fetch from API route instead
    fetch('/api/data')
      .then(res => res.json())
      .then(json => setData(json.data))
  }, [])
  
  return <div>{/* render data */}</div>
}
```

```typescript
// app/api/data/route.ts
import { createHazoConnect } from 'hazo_connect/server'
import { QueryBuilder } from 'hazo_connect/server'

export async function GET() {
  const hazo = createHazoConnect({ ... })
  const data = await hazo.query(new QueryBuilder().from('table'))
  return NextResponse.json({ data })
}
```

## From Direct Calls to API Routes

### Before (Direct Call in Server Component)

```typescript
// app/users/page.tsx
import { createHazoConnect } from 'hazo_connect'  // ❌ Old import

export default async function UsersPage() {
  const hazo = createHazoConnect({ ... })
  const users = await hazo.query(...)
  
  return <div>{/* render users */}</div>
}
```

### After (Fetch from API Route)

```typescript
// app/users/page.tsx
import { headers } from 'next/headers'

export default async function UsersPage() {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  
  const response = await fetch(`http://${host}/api/users`, {
    cache: 'no-store'
  })
  const { data: users } = await response.json()
  
  return <div>{/* render users */}</div>
}
```

```typescript
// app/api/users/route.ts
import { createHazoConnect } from 'hazo_connect/server'
import { QueryBuilder } from 'hazo_connect/server'

export async function GET() {
  const hazo = createHazoConnect({ ... })
  const users = await hazo.query(new QueryBuilder().from('users'))
  return NextResponse.json({ data: users })
}
```

## Testing Considerations

### Unit Tests

Update test imports:

```typescript
// Before
import { createHazoConnect } from 'hazo_connect'

// After
import { createHazoConnect } from 'hazo_connect/server'
```

### Integration Tests

No changes needed - integration tests already use relative imports:

```typescript
// tests/integration/test.ts
import { createHazoConnect } from '../../src/lib/factory'  // ✅ Still works
```

### Mocking in Tests

```typescript
// tests/setup.ts
import { resetHazoConnectSingleton } from 'hazo_connect/nextjs/setup'

beforeEach(() => {
  resetHazoConnectSingleton()  // Reset singleton between tests
})
```

## Common Migration Patterns

### Pattern 1: API Route Migration

**Before:**
```typescript
// pages/api/users.ts (Pages Router)
import { createHazoConnect } from 'hazo_connect'

export default async function handler(req, res) {
  const hazo = createHazoConnect({ ... })
  const users = await hazo.query(...)
  res.json({ data: users })
}
```

**After:**
```typescript
// app/api/users/route.ts (App Router)
import { createHazoConnect } from 'hazo_connect/server'
import { QueryBuilder } from 'hazo_connect/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const hazo = createHazoConnect({ ... })
  const users = await hazo.query(new QueryBuilder().from('users'))
  return NextResponse.json({ data: users })
}
```

### Pattern 2: Server Component Migration

**Before:**
```typescript
// components/UsersList.tsx
import { createHazoConnect } from 'hazo_connect'

export async function UsersList() {
  const hazo = createHazoConnect({ ... })
  const users = await hazo.query(...)
  return <ul>{/* render */}</ul>
}
```

**After:**
```typescript
// app/users/page.tsx
import { headers } from 'next/headers'

export default async function UsersPage() {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const response = await fetch(`http://${host}/api/users`, { cache: 'no-store' })
  const { data: users } = await response.json()
  return <ul>{/* render */}</ul>
}
```

### Pattern 3: Singleton Pattern Migration

**Before:**
```typescript
// Multiple API routes each creating their own instance
// app/api/users/route.ts
const hazo = createHazoConnect({ ... })

// app/api/posts/route.ts
const hazo = createHazoConnect({ ... })  // New instance each time
```

**After:**
```typescript
// lib/hazo_connect.ts
import { getHazoConnectSingleton } from 'hazo_connect/nextjs/setup'
export const hazo = getHazoConnectSingleton()

// app/api/users/route.ts
import { hazo } from '@/lib/hazo_connect'  // Shared instance

// app/api/posts/route.ts
import { hazo } from '@/lib/hazo_connect'  // Same shared instance
```

## Checklist

When migrating:

- [ ] Update all imports from `hazo_connect` to `hazo_connect/server` for runtime code
- [ ] Update type imports in client components to `hazo_connect` or `hazo_connect/ui`
- [ ] Move direct `hazo_connect` calls from Server Components to API routes
- [ ] Update client components to fetch from API routes instead of calling `hazo_connect`
- [ ] Update test files to use `hazo_connect/server`
- [ ] Consider using singleton pattern for multiple API routes
- [ ] Update Next.js configuration (see [Next.js Setup Guide](./nextjs-setup.md))
- [ ] Test in development and production environments

## Need Help?

- See [Troubleshooting Guide](./troubleshooting.md) for common issues
- See [Next.js Setup Guide](./nextjs-setup.md) for configuration
- See [Code Examples](./examples/) for working patterns


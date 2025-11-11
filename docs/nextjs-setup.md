# Next.js Setup Guide for hazo_connect

This guide provides complete setup instructions for using `hazo_connect` with SQLite in Next.js projects.

## Table of Contents

- [Quick Start](#quick-start)
- [Next.js Configuration](#nextjs-configuration)
- [Environment Variables](#environment-variables)
- [Setup Patterns](#setup-patterns)
- [Singleton Pattern](#singleton-pattern)
- [Common Patterns](#common-patterns)
- [Admin UI Setup](#admin-ui-setup)

## Quick Start

1. **Install hazo_connect:**
   ```bash
   npm install hazo_connect
   ```

2. **Configure Next.js** (see [Next.js Configuration](#nextjs-configuration))

3. **Set environment variables** (see [Environment Variables](#environment-variables))

4. **Create adapter instance** in your API routes:
   ```typescript
   import { createHazoConnect } from 'hazo_connect/server'
   import { QueryBuilder } from 'hazo_connect/server'
   
   const hazo = createHazoConnect({
     type: 'sqlite',
     sqlite: {
       database_path: process.env.HAZO_CONNECT_SQLITE_PATH || './database.sqlite'
     }
   })
   ```

## Next.js Configuration

### Required Configuration

Add the following to your `next.config.mjs`:

```javascript
import path from 'path'

/** @type {import('next').NextConfig} */
const next_config = {
  reactStrictMode: true,
  
  // CRITICAL: Exclude sql.js from server component bundling
  // sql.js uses Node.js module.exports which doesn't work in webpack context
  serverComponentsExternalPackages: [
    "sql.js",
    "better-sqlite3",
  ],
  
  // CRITICAL: Exclude sql.js from webpack bundling for API routes
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push("sql.js")
      } else {
        config.externals = [config.externals, "sql.js"]
      }
    }
    
    // Enable WebAssembly support for sql.js
    config.experiments = {
      ...(config.experiments ?? {}),
      asyncWebAssembly: true,
    }
    
    return config
  },
  
  // Optional: Set environment variables for SQLite configuration
  env: {
    HAZO_CONNECT_ENABLE_ADMIN_UI: process.env.HAZO_CONNECT_ENABLE_ADMIN_UI || "false",
    HAZO_CONNECT_SQLITE_PATH: process.env.HAZO_CONNECT_SQLITE_PATH 
      ? path.resolve(process.env.HAZO_CONNECT_SQLITE_PATH)
      : path.resolve(process.cwd(), "database.sqlite"),
  },
}

export default next_config
```

### Why This Configuration is Needed

1. **`serverComponentsExternalPackages`**: Prevents Next.js from bundling `sql.js` for Server Components. SQLite uses Node.js `module.exports`, which webpack cannot handle.

2. **`webpack.externals`**: Excludes `sql.js` from webpack bundling for API routes, allowing it to run in the Node.js runtime where it works correctly.

3. **`asyncWebAssembly: true`**: Enables WebAssembly support required by `sql.js` for database operations.

### Configuration Options Explained

| Option | Purpose | Required |
|--------|---------|----------|
| `serverComponentsExternalPackages` | Prevents bundling of Node.js-only packages | Yes |
| `webpack.externals` | Excludes packages from webpack bundling | Yes |
| `asyncWebAssembly` | Enables WASM support for sql.js | Yes |
| `env` | Makes environment variables available at build time | Optional |

## Environment Variables

### SQLite Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HAZO_CONNECT_TYPE` | No | `"sqlite"` | Database type: `"sqlite"` or `"postgrest"` |
| `HAZO_CONNECT_SQLITE_PATH` | No* | `"./database.sqlite"` | Path to SQLite database file (absolute or relative to `process.cwd()`) |
| `HAZO_CONNECT_SQLITE_READONLY` | No | `"false"` | Enable read-only mode (`"true"` or `"false"`) |
| `HAZO_CONNECT_SQLITE_WASM_DIR` | No | Auto-detected | Directory containing `sql-wasm.wasm` file |
| `HAZO_CONNECT_ENABLE_ADMIN_UI` | No | `"false"` | Enable SQLite admin UI (`"true"` or `"false"`) |

\* Required if `HAZO_CONNECT_TYPE=sqlite` and no fallback path is provided

### PostgREST Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGREST_URL` | Yes* | - | PostgREST API base URL |
| `POSTGREST_API_KEY` | Yes* | - | PostgREST API key |

\* Required if using PostgREST adapter

### Example `.env.local`

```bash
# SQLite Configuration
HAZO_CONNECT_TYPE=sqlite
HAZO_CONNECT_SQLITE_PATH=./data/database.sqlite
HAZO_CONNECT_SQLITE_READONLY=false
HAZO_CONNECT_ENABLE_ADMIN_UI=true

# Optional: Custom WASM directory
# HAZO_CONNECT_SQLITE_WASM_DIR=./public
```

## Setup Patterns

### Pattern 1: Direct Configuration (Recommended for Simple Cases)

```typescript
// app/api/users/route.ts
import { createHazoConnect } from 'hazo_connect/server'
import { QueryBuilder } from 'hazo_connect/server'
import { NextResponse } from 'next/server'
import path from 'path'

export async function GET() {
  const hazo = createHazoConnect({
    type: 'sqlite',
    sqlite: {
      database_path: process.env.HAZO_CONNECT_SQLITE_PATH 
        ? path.resolve(process.env.HAZO_CONNECT_SQLITE_PATH)
        : path.resolve(process.cwd(), 'database.sqlite')
    }
  })
  
  const users = await hazo.query(
    new QueryBuilder().from('users').select('*')
  )
  
  return NextResponse.json({ data: users })
}
```

### Pattern 2: Using Setup Helper (Recommended)

```typescript
// app/api/users/route.ts
import { createHazoConnectFromEnv } from 'hazo_connect/nextjs/setup'
import { QueryBuilder } from 'hazo_connect/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const hazo = createHazoConnectFromEnv()
  
  const users = await hazo.query(
    new QueryBuilder().from('users').select('*')
  )
  
  return NextResponse.json({ data: users })
}
```

## Singleton Pattern

For multiple API routes that need database access, use a singleton pattern to reuse a single adapter instance:

### Using Singleton Helper

```typescript
// lib/hazo_connect.ts
import { getHazoConnectSingleton } from 'hazo_connect/nextjs/setup'

export const hazo = getHazoConnectSingleton()
```

```typescript
// app/api/users/route.ts
import { hazo } from '@/lib/hazo_connect'
import { QueryBuilder } from 'hazo_connect/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const users = await hazo.query(
    new QueryBuilder().from('users').select('*')
  )
  
  return NextResponse.json({ data: users })
}
```

```typescript
// app/api/posts/route.ts
import { hazo } from '@/lib/hazo_connect'
import { QueryBuilder } from 'hazo_connect/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const posts = await hazo.query(
    new QueryBuilder().from('posts').select('*')
  )
  
  return NextResponse.json({ data: posts })
}
```

### Manual Singleton Pattern

If you prefer to create your own singleton:

```typescript
// lib/hazo_connect.ts
import { createHazoConnect } from 'hazo_connect/server'
import type { HazoConnectAdapter } from 'hazo_connect/server'
import path from 'path'

let hazoInstance: HazoConnectAdapter | null = null

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
```

**Benefits of Singleton Pattern:**
- Single database connection shared across all API routes
- Reduced memory usage
- Faster response times (no connection overhead per request)
- Thread-safe in Next.js serverless environment

## Common Patterns

### API Route Pattern (Recommended)

```typescript
// app/api/users/route.ts
import { createHazoConnect } from 'hazo_connect/server'
import { QueryBuilder } from 'hazo_connect/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const hazo = createHazoConnect({
    type: 'sqlite',
    sqlite: {
      database_path: process.env.HAZO_CONNECT_SQLITE_PATH || './database.sqlite'
    }
  })
  
  try {
    const users = await hazo.query(
      new QueryBuilder().from('users').select('*')
    )
    return NextResponse.json({ data: users })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

### Server Component Pattern (Fetch from API Route)

```typescript
// app/users/page.tsx
import { headers } from 'next/headers'

export default async function UsersPage() {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const baseUrl = `http://${host}`
  
  const response = await fetch(`${baseUrl}/api/users`, {
    cache: 'no-store'
  })
  
  const { data } = await response.json()
  
  return (
    <div>
      <h1>Users</h1>
      <ul>
        {data.map((user: any) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Client Component Pattern (Fetch from API Route)

```typescript
// app/users/client-page.tsx
'use client'

import { useEffect, useState } from 'react'

export default function UsersClientPage() {
  const [users, setUsers] = useState([])
  
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data.data))
  }, [])
  
  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user: any) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

## Admin UI Setup

### Enable Admin UI

1. **Set environment variable:**
   ```bash
   HAZO_CONNECT_ENABLE_ADMIN_UI=true
   ```

2. **Initialize in your adapter creation:**
   ```typescript
   const hazo = createHazoConnect({
     type: 'sqlite',
     enable_admin_ui: true,
     sqlite: {
       database_path: process.env.HAZO_CONNECT_SQLITE_PATH || './database.sqlite'
     }
   })
   ```

3. **Access the admin UI:**
   - Navigate to `/hazo_connect/sqlite_admin` in your browser
   - The UI is automatically included when you install `hazo_connect`

### Admin UI API Routes

The admin UI uses these API routes (automatically included):

- `GET /hazo_connect/api/sqlite/tables` - List all tables
- `GET /hazo_connect/api/sqlite/schema?table=TABLE_NAME` - Get table schema
- `GET /hazo_connect/api/sqlite/data?table=TABLE_NAME` - Get table data
- `POST /hazo_connect/api/sqlite/data` - Insert row
- `PATCH /hazo_connect/api/sqlite/data` - Update rows
- `DELETE /hazo_connect/api/sqlite/data` - Delete rows

## Next Steps

- See [Troubleshooting Guide](./troubleshooting.md) for common issues
- See [Code Examples](./examples/) for complete working examples
- See [Migration Guide](./migration-guide.md) for migrating existing code


# Hazo Connect

A fully independent database abstraction layer with query builder interface. Designed to be extractable to external package with zero project dependencies.

> **📚 New to hazo_connect?** Start with the [Next.js Setup Guide](./docs/nextjs-setup.md) for complete setup instructions.

## Features

- **Query Builder API**: Fluent interface supporting full PostgREST syntax
- **Multiple Adapters**: Support for PostgREST, Supabase, SQLite, and file storage
- **Server-Side Only**: Enforced server-side usage with runtime guards and Next.js 'use server' directives
- **Zero Dependencies**: Core component has no external dependencies (only Node.js built-ins)
- **Dependency Injection**: Logger and configuration injected, not imported
- **Type Safe**: Full TypeScript support

## Installation

```bash
npm install hazo_connect
```

### Peer Dependencies

If you're using the SQLite admin UI (optional feature), you'll need to install the following peer dependencies:

```bash
npm install next@>=14.0.0 react@>=18.0.0 react-dom@>=18.0.0 lucide-react@^0.553.0 sonner@^2.0.7
```

**Note:** The core `hazo_connect` library (database adapters and query builder) has no peer dependencies. Only the optional SQLite admin UI requires Next.js and React.

## Entry Points

`hazo_connect` provides multiple entry points for different use cases:

- **`hazo_connect`** - Types only (safe for client components)
- **`hazo_connect/server`** - Server-side functionality (Node.js, API routes, Server Components)
- **`hazo_connect/nextjs`** - Next.js-specific helpers (API route handlers, setup utilities)
- **`hazo_connect/nextjs/setup`** - Setup helpers (environment-based config, singleton pattern)
- **`hazo_connect/ui`** - UI-safe types for client components

## Quick Start for Next.js

If you're using Next.js with SQLite, see the [Next.js Setup Guide](./docs/nextjs-setup.md) for complete configuration instructions.

**Quick setup:**

1. Configure `next.config.mjs` (see [Next.js Setup Guide](./docs/nextjs-setup.md))
2. Set environment variables in `.env.local`
3. Use in API routes:

```typescript
import { createHazoConnectFromEnv } from 'hazo_connect/nextjs/setup'
import { QueryBuilder } from 'hazo_connect/server'

export async function GET() {
  const hazo = createHazoConnectFromEnv()
  const users = await hazo.query(new QueryBuilder().from('users'))
  return NextResponse.json({ data: users })
}
```

**Singleton pattern for multiple API routes:**

```typescript
// lib/hazo_connect.ts
import { getHazoConnectSingleton } from 'hazo_connect/nextjs/setup'
export const hazo = getHazoConnectSingleton()
```

```typescript
// app/api/users/route.ts
import { hazo } from '@/lib/hazo_connect'
// Use hazo instance...
```

## Server-Side Enforcement

All runtime code in `hazo_connect` is server-side only. The library uses:
- Next.js `'use server'` directives
- Runtime guards that check for browser environment
- Separate entry points to prevent accidental client-side usage

If you try to use server-side code in a client component, you'll get a clear error message.

## Usage

### Server-Side Setup (Node.js, API Routes, Server Components)

```typescript
import { createHazoConnect } from 'hazo_connect/server'

// Create adapter with configuration
const hazo = createHazoConnect({
  type: 'postgrest',
  logger: myLogger,  // Optional
  postgrest: {
    base_url: 'http://localhost:3000',
    api_key: 'your-api-key'
  }
})
```

### Next.js API Route Helpers

```typescript
import { createApiRouteHandler, getServerHazoConnect } from 'hazo_connect/nextjs'
import { QueryBuilder } from 'hazo_connect/server'
import { NextResponse } from 'next/server'

// Option 1: Use createApiRouteHandler for automatic initialization
export const GET = createApiRouteHandler(
  async (hazo, request) => {
    const users = await hazo.query(
      new QueryBuilder().from('users').select('*')
    )
    return NextResponse.json({ data: users })
  },
  {
    config: {
      type: 'postgrest',
      postgrest: {
        base_url: process.env.POSTGREST_URL,
        api_key: process.env.POSTGREST_API_KEY
      }
    }
  }
)

// Option 2: Use getServerHazoConnect for manual initialization
export async function GET(request: Request) {
  const hazo = getServerHazoConnect({
    type: 'postgrest',
    postgrest: {
      base_url: process.env.POSTGREST_URL,
      api_key: process.env.POSTGREST_API_KEY
    }
  })
  
  const users = await hazo.query(
    new QueryBuilder().from('users').select('*')
  )
  
  return NextResponse.json({ data: users })
}
```

### Client Component Types

```typescript
// In client components, import types only
import type { HazoConnectConfig, HazoConnectAdapter } from 'hazo_connect'
// Or use UI-specific types
import type { TableSummary, TableSchema } from 'hazo_connect/ui'
```

### Query Builder API

```typescript
import { QueryBuilder } from 'hazo_connect/server'
import { createHazoConnect } from 'hazo_connect/server'

const hazo = createHazoConnect({
  type: 'postgrest',
  postgrest: {
    base_url: 'http://localhost:3000',
    api_key: 'your-api-key'
  }
})

// Simple select
const users = await hazo.query(
  new QueryBuilder()
    .from('users')
    .select(['id', 'name', 'email'])
)

// With filters
const user = await hazo.query(
  new QueryBuilder()
    .from('users')
    .where('id', 'eq', '123')
)

// With ordering
const users = await hazo.query(
  new QueryBuilder()
    .from('users')
    .order('name', 'asc')
    .limit(10)
)

// With nested selects (PostgREST)
const pages = await hazo.query(
  new QueryBuilder()
    .from('template_pages')
    .nestedSelect('images', ['id', 'filename'])
)

// Create record
const newUser = await hazo.query(
  new QueryBuilder().from('users'),
  'POST',
  {
    name: 'John Doe',
    email: 'john@example.com'
  }
)

// Update record
const updated = await hazo.query(
  new QueryBuilder()
    .from('users')
    .where('id', 'eq', '123'),
  'PATCH',
  {
    name: 'Jane Doe'
  }
)

// Delete record
await hazo.query(
  new QueryBuilder()
    .from('users')
    .where('id', 'eq', '123'),
  'DELETE'
)
```

### Supported Operators

- `eq` - equals
- `neq` - not equals
- `gt` - greater than
- `gte` - greater than or equal
- `lt` - less than
- `lte` - less than or equal
- `like` - like (case-sensitive)
- `ilike` - like (case-insensitive)
- `in` - in array
- `is` - is null/not null
- `or` - or condition

## Configuration

### PostgREST

```typescript
import { createHazoConnect } from 'hazo_connect/server'

const hazo = createHazoConnect({
  type: 'postgrest',
  postgrest: {
    base_url: 'http://localhost:3000',
    api_key: 'your-api-key'
  }
})
```

### Supabase (Stub - Not Yet Implemented)

```typescript
import { createHazoConnect } from 'hazo_connect/server'

const hazo = createHazoConnect({
  type: 'supabase',
  supabase: {
    url: 'https://your-project.supabase.co',
    anon_key: 'your-anon-key',
    service_role_key: 'your-service-role-key'  // Optional
  }
})
```

### SQLite (sql.js-backed)

```typescript
import { createHazoConnect } from 'hazo_connect/server'

const hazo = createHazoConnect({
  type: 'sqlite',
  sqlite: {
    database_path: '/path/to/database.db', // optional - in-memory when omitted
    read_only: false,                      // prevent writes when true
    initial_sql: [                         // optional seed statements when database is first created
      `CREATE TABLE todos(id integer primary key, title text);`
    ],
    wasm_directory: '/absolute/path/to/sql.js/dist' // optional override for sql-wasm.wasm lookup
  }
})
```

When `database_path` is supplied and `read_only` is `false`, the adapter persists changes back to that file after each write. Omitting `database_path` keeps the database fully in-memory, which is ideal for serverless usage and tests.

**⚠️ Important for Next.js:** SQLite requires special Next.js configuration to avoid webpack bundling issues. See [Next.js Setup Guide](./docs/nextjs-setup.md) for complete configuration instructions.

#### Admin UI & API

The SQLite admin UI is **disabled by default** for security. To enable it, set `enable_admin_ui: true` in your configuration:

```typescript
import { createHazoConnect } from 'hazo_connect/server'

const hazo = createHazoConnect({
  type: 'sqlite',
  enable_admin_ui: true,  // Enable the admin UI
  sqlite: {
    database_path: './data.db',
    // ... other options
  }
})
```

Alternatively, you can enable it via environment variable:
```bash
HAZO_CONNECT_ENABLE_ADMIN_UI=true
```

**Note:** The admin UI requires Next.js configuration. See [Next.js Setup Guide](./docs/nextjs-setup.md) for complete setup instructions.

The admin UI routes are automatically included in the package when you install `hazo_connect`. They are located at:
- UI: `/hazo_connect/sqlite_admin`
- API: `/hazo_connect/api/sqlite/*`

**Configuration:**
- Set `HAZO_CONNECT_SQLITE_PATH` (or `SQLITE_DATABASE_PATH`) to the path of your SQLite database file
- Optionally set `HAZO_CONNECT_SQLITE_READONLY=true` to enable read-only mode
- Optionally set `HAZO_CONNECT_SQLITE_WASM_DIR` to specify the directory containing `sql-wasm.wasm`

**Features:**
- Navigate to `/hazo_connect/sqlite_admin` to view schema metadata, browse table data, and perform insert/update/delete operations
- REST endpoints exposed under `/hazo_connect/api/sqlite`:
  - `GET /hazo_connect/api/sqlite/tables` — list tables and views.
  - `GET /hazo_connect/api/sqlite/schema?table=people` — retrieve column definitions and foreign keys.
  - `GET /hazo_connect/api/sqlite/data?table=people&limit=20&offset=0&filter[name]=Alice` — page through table rows. Filtering syntax supports `filter[column]=value` (equals) or `filter[column][operator]=value` where `operator` is one of `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `is`.
  - `POST /hazo_connect/api/sqlite/data` with `{ table, data }` — insert a row.
  - `PATCH /hazo_connect/api/sqlite/data` with `{ table, criteria, data }` — update rows matching the criteria object.
  - `DELETE /hazo_connect/api/sqlite/data` with `{ table, criteria }` — delete rows matching the criteria object.

All API responses follow the `{ data, total? }` envelope and surface meaningful error messages for invalid configuration or unsupported SQL operations.

### File Storage (Stub - Not Yet Implemented)

```typescript
import { createHazoConnect } from 'hazo_connect/server'

const hazo = createHazoConnect({
  type: 'file',
  file: {
    base_path: '/path/to/data',
    file_format: 'json'
  }
})
```

## Logger Interface

The logger is optional and follows this interface:

```typescript
interface Logger {
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
}
```

If not provided, a no-op logger is used.

## Migration Guide

### From Direct Fetch Calls

**Before:**
```typescript
const response = await fetch(`${baseUrl}/users?id=eq.123`, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
})
const users = await response.json()
```

**After:**
```typescript
import { createHazoConnect } from 'hazo_connect/server'
import { QueryBuilder } from 'hazo_connect/server'

const hazo = createHazoConnect({
  type: 'postgrest',
  postgrest: {
    base_url: baseUrl,
    api_key: apiKey
  }
})

const users = await hazo.query(
  new QueryBuilder()
    .from('users')
    .where('id', 'eq', '123')
)
```

### From Old hazo_connect Import

**Before:**
```typescript
import { createHazoConnect } from 'hazo_connect'
```

**After:**
```typescript
import { createHazoConnect } from 'hazo_connect/server'
```

For types in client components:
```typescript
import type { HazoConnectConfig } from 'hazo_connect'
// or
import type { TableSummary } from 'hazo_connect/ui'
```

## Architecture

- **types.ts**: All TypeScript interfaces and types
- **query-builder.ts**: Query builder with fluent API
- **factory.ts**: Factory function to create adapters
- **adapters/**: Adapter implementations
  - **base-adapter.ts**: Abstract base class
  - **postgrest-adapter.ts**: PostgREST implementation
  - **supabase-adapter.ts**: Stub
  - **sqlite-adapter.ts**: SQLite implementation (sql.js-backed)
  - **file-adapter.ts**: Stub
- **server/**: Server-only entry point
- **nextjs/**: Next.js-specific helpers
  - **api-route-helpers.ts**: API route handler utilities
  - **setup-helpers.ts**: Environment-based setup and singleton pattern
- **ui/**: UI-safe types entry point

## Documentation

- **[Next.js Setup Guide](./docs/nextjs-setup.md)** - Complete Next.js configuration and setup
- **[Troubleshooting Guide](./docs/troubleshooting.md)** - Common issues and solutions
- **[Code Examples](./docs/examples/)** - Working examples for common patterns
- **[Migration Guide](./docs/migration-guide.md)** - Migrating from older code

## Architecture Decision: Why SQLite Can't Run in Browser

SQLite via `sql.js` uses Node.js `module.exports`, which webpack cannot bundle correctly. Additionally:

1. **File System Access**: SQLite needs file system access to read/write database files, which browsers don't provide
2. **WebAssembly Loading**: The WASM file must be loaded from the file system, not bundled
3. **Module System**: `sql.js` uses CommonJS `module.exports`, which conflicts with webpack's ESM bundling

**Solution:** Use hazo_connect only in:
- ✅ API routes (pure Node.js context)
- ✅ Server Components (with proper Next.js configuration)
- ✅ Server Actions
- ❌ NOT in Client Components (fetch from API routes instead)

See [Next.js Setup Guide](./docs/nextjs-setup.md) for complete configuration.

## Independence Verification

- ✅ No `@/lib/*` imports in core
- ✅ No hardcoded file paths
- ✅ Logger is interface, not concrete
- ✅ Config accepted as object, not file
- ✅ Only Node.js built-ins in core
- ✅ Can copy folder to new project
- ✅ Works without project-specific code
- ✅ Server-side enforcement with runtime guards
- ✅ Separate entry points for different use cases

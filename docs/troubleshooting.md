# Troubleshooting Guide for hazo_connect

This guide helps you resolve common issues when using `hazo_connect` in Next.js projects.

## Table of Contents

- [Common Errors](#common-errors)
- [Configuration Issues](#configuration-issues)
- [Admin UI Issues](#admin-ui-issues)
- [Verification Steps](#verification-steps)
- [Debugging Tips](#debugging-tips)

## Common Errors

### Error: "Cannot set properties of undefined (setting 'exports')"

**Symptoms:**
```
TypeError: Cannot set properties of undefined (setting 'exports')
```

**Cause:** `sql.js` is being bundled by webpack, which doesn't support Node.js `module.exports`.

**Solution:**

1. **Check `next.config.mjs`** - Ensure `sql.js` is excluded from bundling:

```javascript
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals = config.externals || []
    if (Array.isArray(config.externals)) {
      config.externals.push("sql.js")
    } else {
      config.externals = [config.externals, "sql.js"]
    }
  }
  return config
}
```

2. **Add `serverComponentsExternalPackages`** (if using Next.js 13+):

```javascript
serverComponentsExternalPackages: [
  "sql.js",
  "better-sqlite3",
]
```

3. **Restart your development server** after making changes.

**Verification:**
- Check that `sql.js` is not in your `.next` bundle
- Verify the error no longer occurs

### Error: SQLite works in API routes but not in Server Components

**Symptoms:**
- API routes work correctly
- Server Components throw errors or fail to load data

**Cause:** Server Components still go through webpack bundling, which can cause issues with `sql.js`.

**Solution:**

**Pattern 1: Fetch from API routes (Recommended)**

Instead of calling `hazo_connect` directly in Server Components:

```typescript
// ❌ DON'T DO THIS in Server Components
import { createHazoConnect } from 'hazo_connect/server'

export default async function Page() {
  const hazo = createHazoConnect({ ... })
  const data = await hazo.query(...)
}
```

Do this:

```typescript
// ✅ DO THIS - Fetch from API route
import { headers } from 'next/headers'

export default async function Page() {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const response = await fetch(`http://${host}/api/data`, {
    cache: 'no-store'
  })
  const { data } = await response.json()
  return <div>{/* render data */}</div>
}
```

**Pattern 2: Use API route handler**

Create an API route that uses `hazo_connect`, then fetch from it in your Server Component.

### Error: Admin UI not loading

**Symptoms:**
- Admin UI page shows error message
- API routes return 403 or error about admin UI not enabled

**Cause:** Admin service not initialized or adapter not created.

**Solution:**

1. **Enable admin UI in configuration:**

```typescript
const hazo = createHazoConnect({
  type: 'sqlite',
  enable_admin_ui: true,  // ← This is required
  sqlite: {
    database_path: './database.sqlite'
  }
})
```

2. **Or set environment variable:**

```bash
HAZO_CONNECT_ENABLE_ADMIN_UI=true
```

3. **Ensure adapter is created before accessing admin service:**

```typescript
// app/api/sqlite/tables/route.ts
import { getSqliteAdminService } from 'hazo_connect/server'
import { createHazoConnect } from 'hazo_connect/server'

export async function GET() {
  // Create adapter first (this initializes admin service if enabled)
  const hazo = createHazoConnect({
    type: 'sqlite',
    enable_admin_ui: true,
    sqlite: {
      database_path: process.env.HAZO_CONNECT_SQLITE_PATH || './database.sqlite'
    }
  })
  
  // Now get admin service
  const service = getSqliteAdminService()
  const tables = await service.listTables()
  
  return NextResponse.json({ data: tables })
}
```

**Verification:**
- Check that `enable_admin_ui: true` is set
- Verify environment variable is set correctly
- Ensure adapter is created before calling `getSqliteAdminService()`

### Error: "SQLite database not found"

**Symptoms:**
```
Error: SQLite database not found at '/path/to/database.sqlite'
```

**Cause:** Database file doesn't exist and `read_only: true` is set.

**Solution:**

1. **Create the database file first:**
   - Run a migration script
   - Or create it programmatically with `read_only: false`

2. **Or set `read_only: false`** to allow automatic creation:

```typescript
const hazo = createHazoConnect({
  type: 'sqlite',
  sqlite: {
    database_path: './database.sqlite',
    read_only: false  // Allows creation if file doesn't exist
  }
})
```

### Error: "hazo_connect/server can only be used on the server"

**Symptoms:**
```
Error: hazo_connect/server can only be used on the server.
```

**Cause:** Trying to use server-side code in a client component.

**Solution:**

1. **Use API routes** - Create API routes that use `hazo_connect`, then fetch from them in client components.

2. **Use Server Components** - If you need server-side data fetching, use Server Components (not Client Components).

3. **Import types only** - In client components, only import types:

```typescript
// ✅ In client components
import type { HazoConnectConfig } from 'hazo_connect'
import type { TableSummary } from 'hazo_connect/ui'

// ❌ DON'T import runtime code
import { createHazoConnect } from 'hazo_connect/server'  // This will fail
```

## Configuration Issues

### Issue: Environment variables not being read

**Symptoms:**
- Configuration defaults are used instead of environment variables
- Changes to `.env.local` don't take effect

**Solution:**

1. **Check file location:**
   - `.env.local` should be in the project root (same level as `package.json`)

2. **Restart development server:**
   - Environment variables are loaded at startup
   - Changes require a restart

3. **Check variable names:**
   - Use exact names: `HAZO_CONNECT_SQLITE_PATH` (not `SQLITE_PATH`)
   - Case-sensitive

4. **Verify in `next.config.mjs`:**
   - If using `env` field, ensure variables are listed there

### Issue: Database path resolution problems

**Symptoms:**
- Database file not found even though path looks correct
- Different behavior in development vs production

**Solution:**

1. **Use absolute paths:**
   ```typescript
   import path from 'path'
   
   const dbPath = path.resolve(process.cwd(), 'database.sqlite')
   ```

2. **Or use environment variable with resolution:**
   ```typescript
   const dbPath = process.env.HAZO_CONNECT_SQLITE_PATH
     ? path.isAbsolute(process.env.HAZO_CONNECT_SQLITE_PATH)
       ? process.env.HAZO_CONNECT_SQLITE_PATH
       : path.resolve(process.cwd(), process.env.HAZO_CONNECT_SQLITE_PATH)
     : path.resolve(process.cwd(), 'database.sqlite')
   ```

3. **Use setup helper:**
   ```typescript
   import { createHazoConnectFromEnv } from 'hazo_connect/nextjs/setup'
   
   const hazo = createHazoConnectFromEnv()  // Handles path resolution automatically
   ```

## Admin UI Issues

### Issue: Admin UI routes return 403

**Cause:** Admin UI is not enabled.

**Solution:**

1. Set `enable_admin_ui: true` when creating adapter
2. Or set `HAZO_CONNECT_ENABLE_ADMIN_UI=true` environment variable
3. Restart development server

### Issue: Admin UI shows "Failed to list SQLite tables"

**Cause:** Database path not configured or database doesn't exist.

**Solution:**

1. Verify `HAZO_CONNECT_SQLITE_PATH` is set correctly
2. Ensure database file exists
3. Check file permissions

## Verification Steps

### 1. Verify Next.js Configuration

Check `next.config.mjs`:

```javascript
// Should have:
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals.push("sql.js")
  }
  return config
}

serverComponentsExternalPackages: ["sql.js"]
```

### 2. Verify Environment Variables

Create a test API route:

```typescript
// app/api/test-config/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    HAZO_CONNECT_TYPE: process.env.HAZO_CONNECT_TYPE,
    HAZO_CONNECT_SQLITE_PATH: process.env.HAZO_CONNECT_SQLITE_PATH,
    HAZO_CONNECT_ENABLE_ADMIN_UI: process.env.HAZO_CONNECT_ENABLE_ADMIN_UI,
  })
}
```

Visit `/api/test-config` to verify variables are loaded.

### 3. Verify Database Connection

Create a test API route:

```typescript
// app/api/test-connection/route.ts
import { createHazoConnectFromEnv } from 'hazo_connect/nextjs/setup'
import { QueryBuilder } from 'hazo_connect/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const hazo = createHazoConnectFromEnv()
    const result = await hazo.query(
      new QueryBuilder().rawQuery("SELECT 1 as test")
    )
    return NextResponse.json({ success: true, result })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
```

### 4. Verify Admin UI

1. Navigate to `/hazo_connect/sqlite_admin`
2. Should see list of tables (or empty state if no tables)
3. If error, check browser console and server logs

## Debugging Tips

### 1. Enable Debug Logging

Add a logger to see what's happening:

```typescript
const hazo = createHazoConnect({
  type: 'sqlite',
  sqlite: { database_path: './database.sqlite' },
  logger: {
    debug: (msg, data) => console.log('[DEBUG]', msg, data),
    info: (msg, data) => console.log('[INFO]', msg, data),
    warn: (msg, data) => console.warn('[WARN]', msg, data),
    error: (msg, data) => console.error('[ERROR]', msg, data),
  }
})
```

### 2. Check Server Logs

- Look for errors in terminal where `next dev` is running
- Check for webpack bundling warnings
- Look for SQLite initialization errors

### 3. Test in Isolation

Create a minimal test file:

```typescript
// test-hazo.ts
import { createHazoConnect } from 'hazo_connect/server'
import { QueryBuilder } from 'hazo_connect/server'

async function test() {
  const hazo = createHazoConnect({
    type: 'sqlite',
    sqlite: {
      database_path: './test.db'
    }
  })
  
  const result = await hazo.query(
    new QueryBuilder().rawQuery("SELECT 1")
  )
  console.log('Success:', result)
}

test().catch(console.error)
```

Run with: `npx tsx test-hazo.ts`

### 4. Check Package Versions

Ensure compatible versions:

```bash
npm list hazo_connect next sql.js
```

### 5. Clear Next.js Cache

If issues persist:

```bash
rm -rf .next
npm run dev
```

## Getting Help

If you're still experiencing issues:

1. Check the [Next.js Setup Guide](./nextjs-setup.md)
2. Review [Code Examples](./examples/)
3. Check [Migration Guide](./migration-guide.md) if migrating from older code
4. Open an issue on GitHub with:
   - Error message
   - Next.js version
   - `next.config.mjs` configuration
   - Environment variables (redacted)
   - Steps to reproduce


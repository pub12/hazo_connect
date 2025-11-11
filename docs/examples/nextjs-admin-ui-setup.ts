/**
 * Example: SQLite Admin UI Setup in Next.js
 * 
 * This example shows how to set up and use the SQLite admin UI
 * that comes with hazo_connect.
 */

// ============================================================================
// Step 1: Enable Admin UI in Configuration
// ============================================================================

// Option A: Using environment variable
// .env.local
// HAZO_CONNECT_ENABLE_ADMIN_UI=true
// HAZO_CONNECT_SQLITE_PATH=./database.sqlite

// Option B: Using code configuration
import { createHazoConnect } from 'hazo_connect/server'

const hazo = createHazoConnect({
  type: 'sqlite',
  enable_admin_ui: true,  // Enable the admin UI
  sqlite: {
    database_path: process.env.HAZO_CONNECT_SQLITE_PATH || './database.sqlite'
  }
})

// ============================================================================
// Step 2: Admin UI API Routes (Automatically Included)
// ============================================================================

// The following routes are automatically available when you install hazo_connect:
// - GET /hazo_connect/api/sqlite/tables
// - GET /hazo_connect/api/sqlite/schema?table=TABLE_NAME
// - GET /hazo_connect/api/sqlite/data?table=TABLE_NAME
// - POST /hazo_connect/api/sqlite/data
// - PATCH /hazo_connect/api/sqlite/data
// - DELETE /hazo_connect/api/sqlite/data

// ============================================================================
// Step 3: Custom Admin UI API Route (Optional)
// ============================================================================

// app/api/admin/tables/route.ts
import { NextResponse } from 'next/server'
import { getSqliteAdminService } from 'hazo_connect/server'
import { createHazoConnectFromEnv } from 'hazo_connect/nextjs/setup'

export async function GET() {
  try {
    // Create adapter first (this initializes admin service if enabled)
    const hazo = createHazoConnectFromEnv({
      enableAdminUi: true  // Ensure admin UI is enabled
    })
    
    // Get admin service
    const service = getSqliteAdminService()
    const tables = await service.listTables()
    
    return NextResponse.json({ data: tables })
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ADMIN_UI_ERROR'
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// Step 4: Access Admin UI
// ============================================================================

/**
 * The admin UI is automatically available at:
 * 
 * http://localhost:3000/hazo_connect/sqlite_admin
 * 
 * Features:
 * - View all tables and their row counts
 * - View table schema (columns, types, constraints, foreign keys)
 * - Browse table data with pagination
 * - Filter and sort data
 * - Insert new rows
 * - Update existing rows
 * - Delete rows
 */

// ============================================================================
// Step 5: Custom Admin UI Page (Optional)
// ============================================================================

// app/admin/page.tsx
import { headers } from 'next/headers'
import type { TableSummary } from 'hazo_connect/ui'

export default async function AdminPage() {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const baseUrl = `http://${host}`
  
  // Fetch tables from admin API
  const response = await fetch(`${baseUrl}/hazo_connect/api/sqlite/tables`, {
    cache: 'no-store'
  })
  
  if (!response.ok) {
    return (
      <div>
        <h1>Admin UI Error</h1>
        <p>Failed to load tables: {response.statusText}</p>
        <p>Make sure HAZO_CONNECT_ENABLE_ADMIN_UI=true is set</p>
      </div>
    )
  }
  
  const { data: tables } = await response.json() as { data: TableSummary[] }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Database Admin</h1>
      
      <div className="grid gap-4">
        {tables.map((table) => (
          <div key={table.name} className="border p-4 rounded">
            <h2 className="font-semibold">{table.name}</h2>
            <p className="text-sm text-gray-600">
              Type: {table.type} | Rows: {table.row_count ?? 'N/A'}
            </p>
            <a 
              href={`/hazo_connect/sqlite_admin?table=${table.name}`}
              className="text-blue-600 hover:underline"
            >
              View Details →
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Step 6: Using Admin Service Programmatically
// ============================================================================

// app/api/admin/schema/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSqliteAdminService } from 'hazo_connect/server'
import { createHazoConnectFromEnv } from 'hazo_connect/nextjs/setup'

export async function GET(request: NextRequest) {
  try {
    // Initialize adapter
    const hazo = createHazoConnectFromEnv({ enableAdminUi: true })
    
    // Get table name from query params
    const { searchParams } = new URL(request.url)
    const tableName = searchParams.get('table')
    
    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      )
    }
    
    // Get admin service
    const service = getSqliteAdminService()
    const schema = await service.getTableSchema(tableName)
    
    return NextResponse.json({ data: schema })
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SCHEMA_ERROR'
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// Troubleshooting
// ============================================================================

/**
 * If admin UI is not working:
 * 
 * 1. Check that enable_admin_ui: true is set when creating adapter
 * 2. Verify HAZO_CONNECT_ENABLE_ADMIN_UI=true environment variable
 * 3. Ensure adapter is created before calling getSqliteAdminService()
 * 4. Check that database path is correct and database exists
 * 5. Restart development server after configuration changes
 */


# Type Definitions Reference for hazo_connect

Complete TypeScript type reference for `hazo_connect`.

## Table of Contents

- [Core Types](#core-types)
- [Configuration Types](#configuration-types)
- [Query Builder Types](#query-builder-types)
- [Adapter Types](#adapter-types)
- [Error Types](#error-types)
- [SQLite Admin Types](#sqlite-admin-types)

## Core Types

### HazoConnectConfig

Main configuration interface for creating adapters.

```typescript
import type { HazoConnectConfig } from 'hazo_connect'

interface HazoConnectConfig {
  type: ConnectionType
  logger?: Logger
  configProvider?: ConfigProvider
  enable_admin_ui?: boolean  // For SQLite admin UI
  [key: string]: any  // Provider-specific config
}
```

**Example:**
```typescript
const config: HazoConnectConfig = {
  type: 'sqlite',
  enable_admin_ui: true,
  sqlite: {
    database_path: './database.sqlite'
  }
}
```

### ConnectionType

Supported database connection types.

```typescript
type ConnectionType = 'postgrest' | 'supabase' | 'sqlite' | 'file'
```

### HazoConnectAdapter

Interface that all adapters implement.

```typescript
import type { HazoConnectAdapter } from 'hazo_connect'

interface HazoConnectAdapter {
  query(
    builder: QueryBuilder,
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: any
  ): Promise<any>
  
  rawQuery(endpoint: string, options?: RequestInit): Promise<any>
  
  getConfig(): Promise<any>
}
```

**Return Types:**
- `query()`: Returns `Promise<any[]>` for GET requests, `Promise<any>` for mutations
- `rawQuery()`: Returns `Promise<any[]>` for SELECT, `Promise<any>` for mutations
- `getConfig()`: Returns `Promise<AdapterSpecificConfig>`

## Configuration Types

### PostgREST Configuration

```typescript
interface PostgrestConfig {
  postgrest: {
    base_url: string
    api_key: string
  }
}
```

### SQLite Configuration

```typescript
interface SqliteConfig {
  sqlite: {
    database_path?: string  // Optional - in-memory if omitted
    read_only?: boolean      // Default: false
    initial_sql?: string[]   // Optional seed statements
    wasm_directory?: string // Optional WASM file directory
  }
}
```

### Supabase Configuration

```typescript
interface SupabaseConfig {
  supabase: {
    url: string
    anon_key: string
    service_role_key?: string
  }
}
```

## Query Builder Types

### QueryOperator

Supported query operators.

```typescript
type QueryOperator = 
  | 'eq'      // equals
  | 'neq'     // not equals
  | 'gt'      // greater than
  | 'gte'     // greater than or equal
  | 'lt'      // less than
  | 'lte'     // less than or equal
  | 'like'    // like (case-sensitive)
  | 'ilike'   // like (case-insensitive)
  | 'in'      // in array
  | 'is'      // is null/not null
  | 'or'      // or condition
```

### WhereCondition

Condition structure for WHERE clauses.

```typescript
interface WhereCondition {
  field: string
  operator: QueryOperator
  value: any
}
```

### OrderDirection

Sort direction.

```typescript
type OrderDirection = 'asc' | 'desc'
```

### JoinType

Join types for table joins.

```typescript
type JoinType = 'inner' | 'left' | 'right'
```

### NestedSelect

Nested select structure (PostgREST).

```typescript
interface NestedSelect {
  table: string
  fields: string[]
}
```

## Adapter Types

### PostgrestAdapter

```typescript
import { PostgrestAdapter } from 'hazo_connect/server'

const adapter = new PostgrestAdapter(config, logger)
```

### SqliteAdapter

```typescript
import { SqliteAdapter } from 'hazo_connect/server'

const adapter = new SqliteAdapter(config, logger)
```

## Error Types

### ErrorCode

Error code enumeration.

```typescript
import { ErrorCode } from 'hazo_connect/server'

enum ErrorCode {
  CONFIG_ERROR = 'HAZO_CONNECT_CONFIG_ERROR',
  CONNECTION_FAILED = 'HAZO_CONNECT_CONNECTION_FAILED',
  QUERY_ERROR = 'HAZO_CONNECT_QUERY_ERROR',
  NOT_IMPLEMENTED = 'HAZO_CONNECT_NOT_IMPLEMENTED',
  VALIDATION_ERROR = 'HAZO_CONNECT_VALIDATION_ERROR'
}
```

### HazoConnectError

Standardized error response.

```typescript
interface HazoConnectError {
  code: string  // ErrorCode enum value
  message: string
  statusCode?: number
  originalError?: any
}
```

**Error Handling Example:**
```typescript
try {
  const result = await hazo.query(builder)
} catch (error) {
  if (error instanceof Error) {
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
  }
}
```

## SQLite Admin Types

### TableSummary

Summary information about a table.

```typescript
import type { TableSummary } from 'hazo_connect/ui'

interface TableSummary {
  name: string
  type: 'table' | 'view'
  row_count: number | null
}
```

### TableSchema

Complete table schema information.

```typescript
import type { TableSchema } from 'hazo_connect/ui'

interface TableSchema {
  columns: TableColumn[]
  foreign_keys: TableForeignKey[]
}
```

### TableColumn

Column definition.

```typescript
import type { TableColumn } from 'hazo_connect/ui'

interface TableColumn {
  cid: number
  name: string
  type: string
  notnull: boolean
  default_value: unknown
  primary_key_position: number
}
```

### TableForeignKey

Foreign key definition.

```typescript
import type { TableForeignKey } from 'hazo_connect/ui'

interface TableForeignKey {
  id: number
  seq: number
  table: string
  from: string
  to: string
  on_update: string
  on_delete: string
  match: string
}
```

### RowPage

Paginated row data.

```typescript
import type { RowPage } from 'hazo_connect/ui'

interface RowPage {
  rows: Record<string, unknown>[]
  total: number
}
```

### SqliteWhereFilter

Filter for SQLite queries.

```typescript
import type { SqliteWhereFilter } from 'hazo_connect/ui'

interface SqliteWhereFilter {
  column: string
  operator: SqliteFilterOperator
  value: unknown
}
```

### SqliteFilterOperator

Supported filter operators for SQLite.

```typescript
import type { SqliteFilterOperator } from 'hazo_connect/ui'

type SqliteFilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'is'
```

## Logger Interface

### Logger

Optional logger interface for dependency injection.

```typescript
import type { Logger } from 'hazo_connect'

interface Logger {
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
}
```

**Example:**
```typescript
const logger: Logger = {
  debug: (msg, data) => console.log('[DEBUG]', msg, data),
  info: (msg, data) => console.log('[INFO]', msg, data),
  warn: (msg, data) => console.warn('[WARN]', msg, data),
  error: (msg, data) => console.error('[ERROR]', msg, data),
}

const hazo = createHazoConnect({ type: 'sqlite', logger, ... })
```

## Next.js Helper Types

### CreateHazoConnectFromEnvOptions

Options for environment-based adapter creation.

```typescript
import type { CreateHazoConnectFromEnvOptions } from 'hazo_connect/nextjs/setup'

interface CreateHazoConnectFromEnvOptions {
  type?: 'sqlite' | 'postgrest' | 'supabase' | 'file'
  sqlitePath?: string
  readOnly?: boolean
  enableAdminUi?: boolean
  logger?: Logger
}
```

### ApiRouteHandler

Handler function for API route helpers.

```typescript
import type { ApiRouteHandler } from 'hazo_connect/nextjs'

type ApiRouteHandler = (
  hazo: HazoConnectAdapter,
  request: NextRequest
) => Promise<NextResponse | Response>
```

## Type Usage Examples

### Type-Safe Configuration

```typescript
import type { HazoConnectConfig } from 'hazo_connect'
import { createHazoConnect } from 'hazo_connect/server'

const config: HazoConnectConfig = {
  type: 'sqlite',
  sqlite: {
    database_path: './db.sqlite'
  }
}

const hazo = createHazoConnect(config)
```

### Type-Safe Query Results

```typescript
interface User {
  id: number
  name: string
  email: string
}

const users = await hazo.query(
  new QueryBuilder().from('users').select('*')
) as User[]
```

### Type-Safe Error Handling

```typescript
import { ErrorCode } from 'hazo_connect/server'

try {
  await hazo.query(builder)
} catch (error: any) {
  if (error.code === ErrorCode.CONFIG_ERROR) {
    // Handle configuration error
  } else if (error.code === ErrorCode.QUERY_ERROR) {
    // Handle query error
  }
}
```

## Import Paths

### Server-Side Types

```typescript
import type {
  HazoConnectConfig,
  HazoConnectAdapter,
  Logger,
  ConnectionType
} from 'hazo_connect/server'
```

### Client-Side Types

```typescript
import type {
  HazoConnectConfig,
  HazoConnectAdapter
} from 'hazo_connect'

import type {
  TableSummary,
  TableSchema,
  TableColumn
} from 'hazo_connect/ui'
```

### Next.js Helper Types

```typescript
import type {
  CreateHazoConnectFromEnvOptions,
  ApiRouteHandler
} from 'hazo_connect/nextjs'
```


// sqlite.integration.test.ts verifies sql.js-backed adapter behaviour with file persistence.
import fs from "fs"
import os from "os"
import path from "path"
import { createHazoConnect } from "../../src/lib/factory"
import { QueryBuilder } from "../../src/lib/query-builder"
import { getSqliteAdminService, clearRegisteredAdapter } from "../../src/lib/sqlite/admin-service"
import { SqliteAdapter } from "../../src/lib/adapters/sqlite-adapter"

const SQLITE_TEST_DIR = path.join(os.tmpdir(), "hazo_connect_sqlite_it")

function tempDatabasePath(testName: string) {
  if (!fs.existsSync(SQLITE_TEST_DIR)) {
    fs.mkdirSync(SQLITE_TEST_DIR, { recursive: true })
  }
  const timestamp = Date.now()
  const random = Math.round(Math.random() * 10_000)
  return path.join(SQLITE_TEST_DIR, `${testName}-${timestamp}-${random}.sqlite`)
}

describe("SQLite integration", () => {
  let databasePath = ""

  afterEach(async () => {
    if (databasePath && fs.existsSync(databasePath)) {
      await fs.promises.unlink(databasePath)
    }
    databasePath = ""
  })

  it("persists data across adapter instances using a file-backed database", async () => {
    databasePath = tempDatabasePath("persistence")

    const initialSql = [
      "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL)",
      "INSERT INTO notes (title) VALUES ('seeded note')"
    ]

    const writeAdapter = createHazoConnect({
      type: "sqlite",
      sqlite: {
        database_path: databasePath,
        initial_sql: initialSql
      }
    })

    await writeAdapter.query(new QueryBuilder().from("notes"), "POST", { title: "persisted" })

    const readAdapter = createHazoConnect({
      type: "sqlite",
      sqlite: {
        database_path: databasePath,
        read_only: true
      }
    })

    const rows = await readAdapter.query(
      new QueryBuilder()
        .from("notes")
        .select(["title"])
        .order("id", "asc")
    )

    expect(rows).toEqual([{ title: "seeded note" }, { title: "persisted" }])
  })

  it("rejects write operations when read_only flag is enabled", async () => {
    databasePath = tempDatabasePath("readonly")

    const initialSql = [
      "CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL)"
    ]

    const seedAdapter = createHazoConnect({
      type: "sqlite",
      sqlite: {
        database_path: databasePath,
        initial_sql: initialSql
      }
    })
    await seedAdapter.query(new QueryBuilder().from("todos"), "POST", { label: "first" })

    const readOnlyAdapter = createHazoConnect({
      type: "sqlite",
      sqlite: {
        database_path: databasePath,
        read_only: true
      }
    })

    await expect(
      readOnlyAdapter.query(new QueryBuilder().from("todos"), "POST", { label: "second" })
    ).rejects.toThrow("read-only")

    const rows = await readOnlyAdapter.rawQuery("SELECT COUNT(*) AS total FROM todos")
    expect(rows).toEqual([{ total: 1 }])
  })
})

describe("SQLite admin service", () => {
  let databasePath = ""

  beforeEach(async () => {
    // Clear any registered adapter from previous tests
    clearRegisteredAdapter()
    
    databasePath = tempDatabasePath("admin-service")
    process.env.HAZO_CONNECT_SQLITE_PATH = databasePath
    delete process.env.HAZO_CONNECT_SQLITE_READONLY

    const seedAdapter = createHazoConnect({
      type: "sqlite",
      sqlite: {
        database_path: databasePath,
        initial_sql: [
          "CREATE TABLE IF NOT EXISTS people (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, age INTEGER NOT NULL)",
          "INSERT INTO people (name, age) VALUES ('Alice', 31)"
        ]
      }
    })

    await seedAdapter.query(
      new QueryBuilder().from("people"),
      "POST",
      { name: "Charlie", age: 22 }
    )
  })

  afterEach(async () => {
    // Clear registered adapter after each test
    clearRegisteredAdapter()
    
    delete process.env.HAZO_CONNECT_SQLITE_PATH
    delete process.env.HAZO_CONNECT_SQLITE_READONLY

    if (databasePath && fs.existsSync(databasePath)) {
      await fs.promises.unlink(databasePath)
    }
    databasePath = ""
  })

  it("uses registered adapter when available", async () => {
    const testDbPath = tempDatabasePath("registered-adapter")
    process.env.HAZO_CONNECT_SQLITE_PATH = testDbPath
    process.env.HAZO_CONNECT_ENABLE_ADMIN_UI = "true"

    // Create adapter with admin UI enabled
    const adapter = createHazoConnect({
      type: "sqlite",
      enable_admin_ui: true,
      sqlite: {
        database_path: testDbPath,
        initial_sql: [
          "CREATE TABLE IF NOT EXISTS test_registered (id INTEGER PRIMARY KEY, name TEXT)"
        ]
      }
    }) as SqliteAdapter

    expect(adapter).toBeInstanceOf(SqliteAdapter)

    // Admin service should use the registered adapter
    const adminService = getSqliteAdminService()
    const tables = await adminService.listTables()

    // Should see the table created by the registered adapter
    const testTable = tables.find(t => t.name === "test_registered")
    expect(testTable).toBeDefined()
    
    // Clean up
    clearRegisteredAdapter()
    delete process.env.HAZO_CONNECT_ENABLE_ADMIN_UI
    if (fs.existsSync(testDbPath)) {
      await fs.promises.unlink(testDbPath)
    }
  })

  it("lists tables, returns schema, and performs CRUD operations", async () => {
    const service = getSqliteAdminService()

    const tables = await service.listTables()
    expect(tables.map(table => table.name)).toContain("people")

    const schema = await service.getTableSchema("people")
    expect(schema.columns).toHaveLength(3)
    const primaryColumns = schema.columns.filter(column => column.primary_key_position > 0)
    expect(primaryColumns).toHaveLength(1)
    expect(primaryColumns[0]?.name).toBe("id")

    const page = await service.getTableData("people", {
      limit: 10,
      offset: 0,
      order_by: "id",
      order_direction: "asc"
    })
    expect(page.total).toBeGreaterThanOrEqual(2)

    const inserted = (await service.insertRow("people", {
      name: "Bob",
      age: 27
    })) as any
    expect(inserted.name).toBe("Bob")

    const updatedRows = await service.updateRows(
      "people",
      { id: inserted.id },
      { age: 29 }
    )
    expect(Number((updatedRows[0] as any)?.age)).toBe(29)

    const filteredPage = await service.getTableData("people", {
      filters: [{ column: "name", operator: "like", value: "Bob%" }]
    })
    expect(filteredPage.rows.some(row => (row as any).name === "Bob")).toBe(true)

    const deletedRows = await service.deleteRows("people", { id: inserted.id })
    expect(deletedRows).toHaveLength(1)

    const remaining = await service.getTableData("people")
    expect(remaining.rows.every(row => (row as any).name !== "Bob")).toBe(true)
  })
})


/**
 * sqlite-singleton.test.ts verifies that the singleton adapter and admin service
 * share the same SQLite adapter instance, ensuring data consistency between
 * backend operations and admin UI operations.
 */

import fs from "fs"
import os from "os"
import path from "path"
import { getHazoConnectSingleton, resetHazoConnectSingleton } from "../../src/lib/nextjs/setup-helpers"
import { getSqliteAdminService } from "../../src/lib/sqlite/admin-service"
import { QueryBuilder } from "../../src/lib/query-builder"
import { SqliteAdapter } from "../../src/lib/adapters/sqlite-adapter"

const SQLITE_TEST_DIR = path.join(os.tmpdir(), "hazo_connect_sqlite_singleton_it")

function tempDatabasePath(testName: string) {
  if (!fs.existsSync(SQLITE_TEST_DIR)) {
    fs.mkdirSync(SQLITE_TEST_DIR, { recursive: true })
  }
  const timestamp = Date.now()
  const random = Math.round(Math.random() * 10_000)
  return path.join(SQLITE_TEST_DIR, `${testName}-${timestamp}-${random}.sqlite`)
}

describe("SQLite Singleton and Admin Service Integration", () => {
  let databasePath = ""

  beforeEach(() => {
    // Reset singleton before each test
    resetHazoConnectSingleton()
    databasePath = tempDatabasePath("singleton-test")
    process.env.HAZO_CONNECT_TYPE = "sqlite"
    process.env.HAZO_CONNECT_SQLITE_PATH = databasePath
    process.env.HAZO_CONNECT_ENABLE_ADMIN_UI = "true"
    delete process.env.HAZO_CONNECT_SQLITE_READONLY
  })

  afterEach(async () => {
    resetHazoConnectSingleton()
    delete process.env.HAZO_CONNECT_TYPE
    delete process.env.HAZO_CONNECT_SQLITE_PATH
    delete process.env.HAZO_CONNECT_ENABLE_ADMIN_UI
    delete process.env.HAZO_CONNECT_SQLITE_READONLY

    if (databasePath && fs.existsSync(databasePath)) {
      await fs.promises.unlink(databasePath)
    }
    databasePath = ""
  })

  it("should use the same adapter instance for singleton and admin service", async () => {
    // Create singleton instance
    const singleton = getHazoConnectSingleton({
      enableAdminUi: true
    })

    expect(singleton).toBeInstanceOf(SqliteAdapter)

    // Get admin service
    const adminService = getSqliteAdminService()

    // Verify they use the same database by checking table creation
    // Create table via singleton
    await singleton.rawQuery(
      "CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)"
    )

    // Verify table exists via admin service
    const tables = await adminService.listTables()
    const testTable = tables.find(t => t.name === "test_table")
    expect(testTable).toBeDefined()
    expect(testTable?.name).toBe("test_table")
  })

  it("should allow inserting record via backend singleton and reading via admin service frontend", async () => {
    // Create singleton instance
    const singleton = getHazoConnectSingleton({
      enableAdminUi: true
    })

    // Create table via singleton
    await singleton.rawQuery(
      "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL)"
    )

    // Insert record via backend singleton
    const insertResult = await singleton.query(
      new QueryBuilder().from("users"),
      "POST",
      {
        name: "John Doe",
        email: "john@example.com"
      }
    )

    expect(insertResult).toBeDefined()
    // SQLite adapter returns array for POST operations
    const insertedRecord = Array.isArray(insertResult) ? insertResult[0] : insertResult
    expect(insertedRecord).toBeDefined()
    expect(insertedRecord.id).toBeDefined()
    expect(insertedRecord.name).toBe("John Doe")
    expect(insertedRecord.email).toBe("john@example.com")

    // Read record via admin service (frontend)
    const adminService = getSqliteAdminService()
    const data = await adminService.getTableData("users", {
      limit: 10,
      offset: 0
    })

    expect(data.rows).toHaveLength(1)
    expect(data.total).toBe(1)
    expect(data.rows[0].name).toBe("John Doe")
    expect(data.rows[0].email).toBe("john@example.com")
    expect(data.rows[0].id).toBe(insertedRecord.id)
  })

  it("should allow inserting record via admin service frontend and reading via backend singleton", async () => {
    // Create singleton instance
    const singleton = getHazoConnectSingleton({
      enableAdminUi: true
    })

    // Create table via singleton
    await singleton.rawQuery(
      "CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL)"
    )

    // Insert record via admin service (frontend)
    const adminService = getSqliteAdminService()
    const insertResult = await adminService.insertRow("products", {
      name: "Widget",
      price: 19.99
    })

    expect(insertResult).toBeDefined()
    expect(insertResult.id).toBeDefined()
    expect(insertResult.name).toBe("Widget")
    expect(insertResult.price).toBe(19.99)

    // Read record via backend singleton
    const rows = await singleton.query(
      new QueryBuilder()
        .from("products")
        .where("id", "eq", insertResult.id)
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe("Widget")
    expect(rows[0].price).toBe(19.99)
    expect(rows[0].id).toBe(insertResult.id)
  })

  it("should maintain data consistency across multiple operations", async () => {
    // Create singleton instance
    const singleton = getHazoConnectSingleton({
      enableAdminUi: true
    })

    // Create table via singleton
    await singleton.rawQuery(
      "CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL, amount REAL NOT NULL, status TEXT NOT NULL)"
    )

    const adminService = getSqliteAdminService()

    // Insert via singleton
    const order1Result = await singleton.query(
      new QueryBuilder().from("orders"),
      "POST",
      {
        customer_name: "Alice",
        amount: 100.0,
        status: "pending"
      }
    )
    const order1 = Array.isArray(order1Result) ? order1Result[0] : order1Result

    // Insert via admin service
    const order2 = await adminService.insertRow("orders", {
      customer_name: "Bob",
      amount: 200.0,
      status: "pending"
    })

    // Update via singleton
    await singleton.query(
      new QueryBuilder()
        .from("orders")
        .where("id", "eq", order1.id),
      "PATCH",
      {
        status: "completed"
      }
    )

    // Update via admin service
    await adminService.updateRows(
      "orders",
      { id: order2.id },
      { status: "completed" }
    )

    // Verify all data via admin service
    const allOrders = await adminService.getTableData("orders", {
      limit: 10
    })

    expect(allOrders.total).toBe(2)
    expect(allOrders.rows).toHaveLength(2)

    const aliceOrder = allOrders.rows.find((o: any) => o.customer_name === "Alice")
    const bobOrder = allOrders.rows.find((o: any) => o.customer_name === "Bob")

    expect(aliceOrder).toBeDefined()
    expect(aliceOrder.status).toBe("completed")
    expect(aliceOrder.amount).toBe(100.0)

    expect(bobOrder).toBeDefined()
    expect(bobOrder.status).toBe("completed")
    expect(bobOrder.amount).toBe(200.0)

    // Verify via singleton as well
    const completedOrders = await singleton.query(
      new QueryBuilder()
        .from("orders")
        .where("status", "eq", "completed")
    )

    expect(completedOrders).toHaveLength(2)
  })

  it("should use the same database file for both singleton and admin service", async () => {
    // Create singleton instance
    const singleton = getHazoConnectSingleton({
      enableAdminUi: true
    })

    // Create and populate table
    await singleton.rawQuery(
      "CREATE TABLE IF NOT EXISTS test_data (id INTEGER PRIMARY KEY, value TEXT)"
    )
    await singleton.rawQuery("INSERT INTO test_data (id, value) VALUES (1, 'test1')")
    await singleton.rawQuery("INSERT INTO test_data (id, value) VALUES (2, 'test2')")

    // Verify file exists
    expect(fs.existsSync(databasePath)).toBe(true)

    // Get admin service and verify it sees the same data
    const adminService = getSqliteAdminService()
    const data = await adminService.getTableData("test_data", {
      limit: 10
    })

    expect(data.total).toBe(2)
    expect(data.rows).toHaveLength(2)
    expect(data.rows.find((r: any) => r.id === 1)?.value).toBe("test1")
    expect(data.rows.find((r: any) => r.id === 2)?.value).toBe("test2")
  })

  it("should handle configuration changes correctly", async () => {
    // Create initial singleton
    const singleton1 = getHazoConnectSingleton({
      enableAdminUi: true
    })

    await singleton1.rawQuery(
      "CREATE TABLE IF NOT EXISTS config_test (id INTEGER PRIMARY KEY, data TEXT)"
    )

    // Change configuration (simulate different path)
    const newPath = tempDatabasePath("config-change")
    process.env.HAZO_CONNECT_SQLITE_PATH = newPath

    // Reset singleton to force new instance
    resetHazoConnectSingleton()

    // Create new singleton with new config
    const singleton2 = getHazoConnectSingleton({
      enableAdminUi: true,
      sqlitePath: newPath
    })

    // New singleton should use new database
    await singleton2.rawQuery(
      "CREATE TABLE IF NOT EXISTS config_test (id INTEGER PRIMARY KEY, data TEXT)"
    )

    // Admin service should now use the new singleton instance
    const adminService = getSqliteAdminService()
    const tables = await adminService.listTables()
    const configTable = tables.find(t => t.name === "config_test")

    expect(configTable).toBeDefined()

    // Clean up
    if (fs.existsSync(newPath)) {
      await fs.promises.unlink(newPath)
    }
  })
})


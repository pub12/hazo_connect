// sqlite_adapter.test.ts exercises the sql.js-backed adapter against core CRUD flows.
import { createHazoConnect } from "../factory"
import { QueryBuilder } from "../query-builder"

const defaultInitialSql = [
  "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, age INTEGER NOT NULL);",
  "CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT NOT NULL);",
  "INSERT INTO users (name, age) VALUES ('Alice', 30), ('Bob', 25);",
  "INSERT INTO posts (user_id, title) VALUES (1, 'GraphQL Rocks'), (1, 'Hello World'), (2, 'Sqlite Adapter');"
]

function createAdapter(initialSql: string[] = defaultInitialSql) {
  return createHazoConnect({
    type: "sqlite",
    sqlite: {
      initial_sql: [...initialSql]
    }
  })
}

describe("SqliteAdapter", () => {
  it("selects rows with ordering applied", async () => {
    const adapter = createAdapter()
    const builder = new QueryBuilder()
      .from("users")
      .select(["id", "name", "age"])
      .order("age", "desc")

    const rows = await adapter.query(builder)

    expect(rows).toEqual([
      { id: 1, name: "Alice", age: 30 },
      { id: 2, name: "Bob", age: 25 }
    ])
  })

  it("filters rows using ilike and in operators", async () => {
    const adapter = createAdapter()
    const builder = new QueryBuilder()
      .from("users")
      .select(["id", "name"])
      .where("name", "ilike", "%o%")
      .where("age", "in", [25])

    const rows = await adapter.query(builder)

    expect(rows).toEqual([{ id: 2, name: "Bob" }])
  })

  it("supports OR groupings with limits", async () => {
    const adapter = createAdapter()
    const builder = new QueryBuilder()
      .from("users")
      .select(["name"])
      .whereOr([
        { field: "age", operator: "eq", value: 25 },
        { field: "age", operator: "eq", value: 30 }
      ])
      .order("name", "asc")
      .limit(1)

    const rows = await adapter.query(builder)

    expect(rows).toEqual([{ name: "Alice" }])
  })

  it("returns join results across related tables", async () => {
    const adapter = createAdapter()
    const builder = new QueryBuilder()
      .from("users")
      .select(["users.name AS user_name", "posts.title AS post_title"])
      .join("posts", "posts.user_id=users.id", "left")
      .order("posts.title", "asc")

    const rows = await adapter.query(builder)

    expect(rows).toEqual([
      { user_name: "Alice", post_title: "GraphQL Rocks" },
      { user_name: "Alice", post_title: "Hello World" },
      { user_name: "Bob", post_title: "Sqlite Adapter" }
    ])
  })

  it("inserts rows and returns inserted payloads", async () => {
    const adapter = createAdapter()
    const insertBuilder = new QueryBuilder().from("users")
    const inserted = await adapter.query(insertBuilder, "POST", { name: "Charlie", age: 22 })

    expect(inserted).toEqual([{ id: 3, name: "Charlie", age: 22 }])

    const verifyBuilder = new QueryBuilder()
      .from("users")
      .select(["COUNT(*) AS total"])
    const totals = await adapter.query(verifyBuilder)

    expect(totals[0].total).toBe(3)
  })

  it("updates rows based on where conditions", async () => {
    const adapter = createAdapter()
    const updateBuilder = new QueryBuilder()
      .from("users")
      .where("name", "eq", "Alice")

    const updated = await adapter.query(updateBuilder, "PATCH", { age: 31 })

    expect(updated).toEqual([{ id: 1, name: "Alice", age: 31 }])

    const verifyBuilder = new QueryBuilder()
      .from("users")
      .select(["age"])
      .where("id", "eq", 1)
    const verifyRows = await adapter.query(verifyBuilder)

    expect(verifyRows).toEqual([{ age: 31 }])
  })

  it("deletes rows and returns affected data", async () => {
    const adapter = createAdapter()
    const deleteBuilder = new QueryBuilder()
      .from("users")
      .where("name", "eq", "Bob")

    const removed = await adapter.query(deleteBuilder, "DELETE")

    expect(removed).toEqual([{ id: 2, name: "Bob", age: 25 }])

    const remaining = await adapter.query(
      new QueryBuilder().from("users").select(["COUNT(*) AS total"])
    )

    expect(remaining[0].total).toBe(1)
  })

  it("executes raw SQL with positional parameters", async () => {
    const adapter = createAdapter()

    const rows = await adapter.rawQuery(
      "SELECT COUNT(*) AS total FROM users WHERE age > ?",
      { params: [26] } as any
    )

    expect(rows).toEqual([{ total: 1 }])
  })
})


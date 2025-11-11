 "use client"
 
import { useEffect, useMemo, useState } from "react"
import {
  Filter,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X
} from "lucide-react"
import { Toaster, toast } from "sonner"
import type {
  SqliteFilterOperator,
  TableColumn,
  TableSchema,
  TableSummary
} from "hazo_connect/ui"

type FilterState = {
  column?: string
  operator: SqliteFilterOperator
  value: string
}

type SqlValue = Record<string, unknown>
type DataResponse = {
  data: SqlValue[]
  total: number
}

const DEFAULT_LIMIT = 20
const filterOperators: { label: string; value: SqliteFilterOperator }[] = [
  { label: "Equals", value: "eq" },
  { label: "Not equal", value: "neq" },
  { label: "Greater than", value: "gt" },
  { label: "Greater or equal", value: "gte" },
  { label: "Less than", value: "lt" },
  { label: "Less or equal", value: "lte" },
  { label: "Contains", value: "like" },
  { label: "Contains (case-insensitive)", value: "ilike" },
  { label: "Is / Is Not", value: "is" }
]

export default function SqliteAdminClient({
  initialTables
}: {
  initialTables: TableSummary[]
}) {
  const [tables, setTables] = useState<TableSummary[]>(initialTables)
  const [selectedTable, setSelectedTable] = useState<TableSummary | null>(
    initialTables[0] ?? null
  )
  const [schema, setSchema] = useState<TableSchema | null>(null)
  const [rows, setRows] = useState<SqlValue[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [offset, setOffset] = useState(0)
  const [orderBy, setOrderBy] = useState<string | undefined>()
  const [orderDirection, setOrderDirection] = useState<"asc" | "desc">("asc")
  const [filterState, setFilterState] = useState<FilterState>({
    operator: "eq",
    value: ""
  })

  const [isLoadingSchema, setIsLoadingSchema] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isRefreshingTables, setIsRefreshingTables] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<SqlValue | null>(null)

  const columns = useMemo<TableColumn[]>(() => schema?.columns ?? [], [schema])
  const filterColumns = useMemo(
    () => columns.filter(column => identifierIsFilterable(column.name)),
    [columns]
  )

  useEffect(() => {
    if (!selectedTable) {
      return
    }
    void loadSchemaAndData(selectedTable.name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable?.name])

  async function loadSchemaAndData(tableName: string) {
    setIsLoadingSchema(true)
    try {
      const schemaResponse = await fetch(`/hazo_connect/api/sqlite/schema?table=${encodeURIComponent(tableName)}`)
      if (!schemaResponse.ok) {
        throw new Error(await schemaResponse.text())
      }
      const schemaJson = await schemaResponse.json()
      setSchema(schemaJson.data as TableSchema)
      const preferredFilterColumn =
        filterState.column && schemaJson.data?.columns?.some((col: TableColumn) => col.name === filterState.column)
          ? filterState.column
          : schemaJson.data?.columns?.[0]?.name
      setFilterState(current => ({
        ...current,
        column: preferredFilterColumn
      }))
      setLimit(DEFAULT_LIMIT)
      setOffset(0)
      setOrderBy(undefined)
      setOrderDirection("asc")
      await loadData(tableName, {
        limit: DEFAULT_LIMIT,
        offset: 0,
        orderBy: undefined,
        orderDirection: "asc",
        filterOverride: {
          ...filterState,
          column: preferredFilterColumn
        }
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to load schema for table '${tableName}'`
      )
    } finally {
      setIsLoadingSchema(false)
    }
  }

  async function loadData(
    tableName: string,
    overrides?: {
      limit?: number
      offset?: number
      orderBy?: string
      orderDirection?: "asc" | "desc"
      filterOverride?: FilterState
    }
  ) {
    setIsLoadingData(true)
    const nextLimit = overrides?.limit ?? limit
    const nextOffset = overrides?.offset ?? offset
    const nextOrderBy = overrides?.orderBy ?? orderBy
    const nextOrderDirection = overrides?.orderDirection ?? orderDirection
    const nextFilter = overrides?.filterOverride ?? filterState

    try {
      const params = new URLSearchParams({
        table: tableName,
        limit: String(nextLimit),
        offset: String(nextOffset)
      })

      if (nextOrderBy) {
        params.set("orderBy", nextOrderBy)
        params.set("orderDirection", nextOrderDirection)
      }

      if (nextFilter.column && nextFilter.value.trim().length) {
        const key =
          nextFilter.operator === "eq"
            ? `filter[${nextFilter.column}]`
            : `filter[${nextFilter.column}][${nextFilter.operator}]`
        params.set(key, nextFilter.value)
      } else if (nextFilter.operator === "is" && nextFilter.column) {
        const key = `filter[${nextFilter.column}][is]`
        params.set(key, nextFilter.value || "null")
      }

      const response = await fetch(`/hazo_connect/api/sqlite/data?${params.toString()}`)
      if (!response.ok) {
        throw new Error(await response.text())
      }

      const json = (await response.json()) as DataResponse
      setRows(json.data ?? [])
      setTotalRows(json.total ?? 0)
      setLimit(nextLimit)
      setOffset(nextOffset)
      setOrderBy(nextOrderBy)
      setOrderDirection(nextOrderDirection)
      setFilterState(nextFilter)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to load data for table '${tableName}'`
      )
    } finally {
      setIsLoadingData(false)
    }
  }

  async function refreshTables() {
    setIsRefreshingTables(true)
    try {
      const response = await fetch("/hazo_connect/api/sqlite/tables")
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const json = await response.json()
      setTables(json.data ?? [])
      toast.success("Tables refreshed")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to refresh tables"
      )
    } finally {
      setIsRefreshingTables(false)
    }
  }

  function handleSelectTable(table: TableSummary) {
    setSelectedTable(table)
  }

  function handleChangePage(nextOffset: number) {
    if (!selectedTable) {
      return
    }
    void loadData(selectedTable.name, { offset: Math.max(0, nextOffset) })
  }

  function handleChangeLimit(nextLimit: number) {
    if (!selectedTable) {
      return
    }
    void loadData(selectedTable.name, { limit: nextLimit, offset: 0 })
  }

  function handleChangeOrder(column?: string) {
    if (!selectedTable) {
      return
    }
    const nextDirection =
      orderBy === column
        ? orderDirection === "asc"
          ? "desc"
          : "asc"
        : "asc"
    void loadData(selectedTable.name, {
      orderBy: column,
      orderDirection: nextDirection
    })
  }

  function handleApplyFilter() {
    if (!selectedTable) {
      return
    }
    void loadData(selectedTable.name, { offset: 0 })
  }

  async function handleInsertRow(data: Record<string, unknown>) {
    if (!selectedTable) {
      return
    }

    try {
      const response = await fetch("/hazo_connect/api/sqlite/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ table: selectedTable.name, data })
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      toast.success("Row inserted")
      setIsCreateOpen(false)
      await Promise.all([
        refreshTables(),
        loadData(selectedTable.name, { offset: 0 })
      ])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Insert failed")
    }
  }

  async function handleUpdateRow(
    row: SqlValue,
    data: Record<string, unknown>
  ) {
    if (!selectedTable || !schema) {
      return
    }

    const criteria = buildCriteriaFromRow(row, schema.columns)
    try {
      const response = await fetch("/hazo_connect/api/sqlite/data", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          table: selectedTable.name,
          data,
          criteria
        })
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      toast.success("Row updated")
      setEditingRow(null)
      await loadData(selectedTable.name)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed")
    }
  }

  async function handleDeleteRow(row: SqlValue) {
    if (!selectedTable || !schema) {
      return
    }

    const criteria = buildCriteriaFromRow(row, schema.columns)
    if (!Object.keys(criteria).length) {
      toast.error("Unable to determine primary key for row deletion")
      return
    }

    if (!window.confirm("Delete this row? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch("/hazo_connect/api/sqlite/data", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          table: selectedTable.name,
          criteria
        })
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      toast.success("Row deleted")
      await loadData(selectedTable.name, { offset: 0 })
      await refreshTables()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed")
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalRows / limit))
  const currentPage = Math.min(totalPages, Math.floor(offset / limit) + 1)

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-4 p-6 lg:flex-row">
        <aside className="w-full max-w-xs rounded-lg border border-slate-200 bg-white shadow-sm lg:sticky lg:top-6 lg:h-[calc(100vh-6rem)]">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-medium text-slate-700">Tables</h2>
            <button
              type="button"
              onClick={refreshTables}
              disabled={isRefreshingTables}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshingTables ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Refresh
            </button>
          </header>
          <nav className="max-h-[calc(100vh-9rem)] overflow-auto px-2 py-3 text-sm">
            {tables.length === 0 ? (
              <p className="rounded-md bg-slate-50 p-3 text-slate-500">
                No tables detected.
              </p>
            ) : (
              <ul className="space-y-1">
                {tables.map(table => {
                  const isActive = selectedTable?.name === table.name
                  return (
                    <li key={table.name}>
                      <button
                        type="button"
                        onClick={() => handleSelectTable(table)}
                        className={[
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition",
                          isActive
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-white text-slate-700 hover:bg-slate-100"
                        ].join(" ")}
                      >
                        <span className="truncate font-medium">{table.name}</span>
                        {typeof table.row_count === "number" && (
                          <span
                            className={[
                              "ml-2 inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 text-xs",
                              isActive
                                ? "bg-slate-800 text-slate-100"
                                : "bg-slate-100 text-slate-600"
                            ].join(" ")}
                          >
                            {table.row_count}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </nav>
        </aside>

        <section className="flex-1 space-y-6">
          <header className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  SQLite Admin
                </h1>
                <p className="text-sm text-slate-500">
                  Browse tables, inspect schema, and edit data safely.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectedTable && loadSchemaAndData(selectedTable.name)}
                  disabled={isLoadingSchema || isLoadingData}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoadingSchema || isLoadingData ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  disabled={!selectedTable || !schema}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <Plus className="h-4 w-4" />
                  Add Row
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              <Filter className="h-4 w-4 text-slate-500" />
              <select
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                value={filterState.column ?? ""}
                onChange={event =>
                  setFilterState(current => ({
                    ...current,
                    column: event.target.value || undefined
                  }))
                }
              >
                {filterColumns.length === 0 ? (
                  <option value="">No filterable columns</option>
                ) : (
                  filterColumns.map(column => (
                    <option key={column.name} value={column.name}>
                      {column.name}
                    </option>
                  ))
                )}
              </select>
              <select
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                value={filterState.operator}
                onChange={event =>
                  setFilterState(current => ({
                    ...current,
                    operator: event.target.value as SqliteFilterOperator
                  }))
                }
              >
                {filterOperators.map(operator => (
                  <option key={operator.value} value={operator.value}>
                    {operator.label}
                  </option>
                ))}
              </select>
              {filterState.operator === "is" ? (
                <select
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                  value={filterState.value}
                  onChange={event =>
                    setFilterState(current => ({
                      ...current,
                      value: event.target.value
                    }))
                  }
                >
                  <option value="null">NULL</option>
                  <option value="not.null">NOT NULL</option>
                </select>
              ) : (
                <input
                  type="text"
                  className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="Filter value…"
                  value={filterState.value}
                  onChange={event =>
                    setFilterState(current => ({
                      ...current,
                      value: event.target.value
                    }))
                  }
                />
              )}
              <button
                type="button"
                onClick={handleApplyFilter}
                disabled={!selectedTable || !schema}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </header>

          {selectedTable ? (
            <>
              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-800">
                      {selectedTable.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {schema?.columns.length ?? 0} columns
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      Rows per page
                      <select
                        value={limit}
                        onChange={event =>
                          handleChangeLimit(Number.parseInt(event.target.value, 10))
                        }
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm"
                      >
                        {[10, 20, 50, 100].map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 shadow-sm">
                      <button
                        type="button"
                        onClick={() => handleChangeOrder(orderBy)}
                        className="inline-flex items-center gap-1"
                        disabled={!schema}
                      >
                        Order:{" "}
                        {orderBy ? `${orderBy} • ${orderDirection}` : "not set"}
                      </button>
                      {schema && schema.columns.length > 0 && (
                        <select
                          value={orderBy ?? ""}
                          onChange={event =>
                            handleChangeOrder(event.target.value || undefined)
                          }
                          className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                        >
                          <option value="">None</option>
                          {schema.columns.map(column => (
                            <option key={column.name} value={column.name}>
                              {column.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </header>

                <div className="overflow-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {columns.map(column => (
                          <th key={column.name} className="px-3 py-2 text-left">
                            {column.name}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right text-slate-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
                      {isLoadingData ? (
                        <tr>
                          <td colSpan={columns.length + 1} className="px-3 py-8 text-center">
                            <div className="inline-flex items-center gap-2 text-slate-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading data…
                            </div>
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-slate-400">
                            No rows to display.
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, index) => (
                          <tr key={index} className="hover:bg-slate-50/60">
                            {columns.map(column => (
                              <td key={column.name} className="max-w-[200px] truncate px-3 py-2">
                                {formatCellValue(row[column.name])}
                              </td>
                            ))}
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingRow(row)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row)}
                                  className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                  <span>
                    Page {currentPage} of {totalPages} • {totalRows} rows
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleChangePage(Math.max(0, offset - limit))}
                      disabled={offset === 0 || isLoadingData}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangePage(offset + limit)}
                      disabled={offset + limit >= totalRows || isLoadingData}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </footer>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <header className="border-b border-slate-100 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-700">Schema</h3>
                </header>
                <div className="overflow-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Column</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Not null</th>
                        <th className="px-3 py-2 text-left">Default</th>
                        <th className="px-3 py-2 text-left">Primary key</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
                      {columns.map(column => (
                        <tr key={column.name}>
                          <td className="px-3 py-2 font-medium">{column.name}</td>
                          <td className="px-3 py-2">{column.type || "TEXT"}</td>
                          <td className="px-3 py-2">
                            {column.notnull ? "Yes" : "No"}
                          </td>
                          <td className="px-3 py-2">
                            {column.default_value === null
                              ? "NULL"
                              : String(column.default_value)}
                          </td>
                          <td className="px-3 py-2">
                            {column.primary_key_position
                              ? `Yes (#${column.primary_key_position})`
                              : "No"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              Select a table to begin.
            </p>
          )}
        </section>
      </div>

      {schema && selectedTable && (
        <RowModal
          title={`Insert into ${selectedTable.name}`}
          open={isCreateOpen}
          columns={schema.columns}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleInsertRow}
        />
      )}

      {schema && selectedTable && editingRow && (
        <RowModal
          title={`Edit row in ${selectedTable.name}`}
          open={Boolean(editingRow)}
          columns={schema.columns}
          initialValues={editingRow}
          onClose={() => setEditingRow(null)}
          onSubmit={data => handleUpdateRow(editingRow, data)}
          primaryKeys={schema.columns.filter(column => column.primary_key_position > 0)}
        />
      )}
    </>
  )
}

function RowModal({
  title,
  open,
  columns,
  primaryKeys,
  initialValues,
  onClose,
  onSubmit
}: {
  title: string
  open: boolean
  columns: TableColumn[]
  primaryKeys?: TableColumn[]
  initialValues?: SqlValue
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
}) {
  const [formValues, setFormValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      const nextValues: Record<string, string> = {}
      columns.forEach(column => {
        const rawValue = initialValues?.[column.name]
        nextValues[column.name] =
          rawValue === null || rawValue === undefined ? "" : String(rawValue)
      })
      setFormValues(nextValues)
    }
  }, [open, columns, initialValues])

  if (!open) {
    return null
  }

  function handleChange(column: string, value: string) {
    setFormValues(current => ({
      ...current,
      [column]: value
    }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload: Record<string, unknown> = {}

    for (const column of columns) {
      const value = formValues[column.name]
      payload[column.name] = coerceValue(column, value)
    }

    onSubmit(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur">
      <div className="relative w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {primaryKeys && primaryKeys.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Warning: table has no primary key defined. Updates/deletes rely on full row
                matching.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-1 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid max-h-[50vh] grid-cols-1 gap-4 overflow-auto pr-2 sm:grid-cols-2">
            {columns.map(column => (
              <label key={column.name} className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">
                  {column.name}
                  {column.notnull && (
                    <sup className="ml-1 text-amber-600" title="Required">
                      *
                    </sup>
                  )}
                </span>
                <input
                  type="text"
                  value={formValues[column.name] ?? ""}
                  onChange={event => handleChange(column.name, event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                  placeholder={
                    column.default_value === null
                      ? column.type || "TEXT"
                      : String(column.default_value)
                  }
                />
                <span className="text-xs text-slate-400">
                  {column.type || "TEXT"}
                  {column.primary_key_position ? " • Primary key" : ""}
                </span>
              </label>
            ))}
          </div>

          <footer className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function buildCriteriaFromRow(row: SqlValue, columns: TableColumn[]) {
  const criteria: Record<string, unknown> = {}
  const primaryKeys = columns.filter(column => column.primary_key_position > 0)

  if (primaryKeys.length) {
    for (const primary of primaryKeys) {
      criteria[primary.name] = row[primary.name]
    }
    return criteria
  }

  for (const column of columns) {
    criteria[column.name] = row[column.name]
  }
  return criteria
}

function coerceValue(column: TableColumn, rawValue: string): unknown {
  if (rawValue === "") {
    return column.notnull ? "" : null
  }

  const normalisedType = (column.type ?? "").toLowerCase()

  if (normalisedType.includes("int")) {
    const parsed = Number.parseInt(rawValue, 10)
    return Number.isNaN(parsed) ? rawValue : parsed
  }

  if (
    normalisedType.includes("real") ||
    normalisedType.includes("double") ||
    normalisedType.includes("float") ||
    normalisedType.includes("numeric")
  ) {
    const parsed = Number.parseFloat(rawValue)
    return Number.isNaN(parsed) ? rawValue : parsed
  }

  if (normalisedType.includes("bool")) {
    return rawValue === "true" || rawValue === "1" ? 1 : 0
  }

  return rawValue
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL"
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function identifierIsFilterable(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
}


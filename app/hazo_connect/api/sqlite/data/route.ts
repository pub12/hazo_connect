import { NextRequest, NextResponse } from "next/server"
import {
  getSqliteAdminService,
  type RowQueryOptions,
  type SqliteFilterOperator,
  type SqliteWhereFilter
} from "hazo_connect/server"

export const dynamic = "force-dynamic"
const allowedOperators: SqliteFilterOperator[] = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "is"
]

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const table = url.searchParams.get("table")
  if (!table) {
    return NextResponse.json(
      { error: "Query parameter 'table' is required." },
      { status: 400 }
    )
  }

  try {
    const service = getSqliteAdminService()
    const options = parseRowQueryOptions(url.searchParams)
    const page = await service.getTableData(table, options)
    return NextResponse.json({ data: page.rows, total: page.total })
  } catch (error) {
    return toErrorResponse(error, `Failed to fetch data for table '${table}'`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = getSqliteAdminService()
    const payload = await request.json()
    const table = payload?.table
    const data = payload?.data

    if (!table || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json(
        { error: "Request body must include 'table' and a 'data' object." },
        { status: 400 }
      )
    }

    const inserted = await service.insertRow(table, data)
    return NextResponse.json({ data: inserted })
  } catch (error) {
    return toErrorResponse(error, "Failed to insert row")
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const service = getSqliteAdminService()
    const payload = await request.json()
    const table = payload?.table
    const data = payload?.data
    const criteria = payload?.criteria

    if (
      !table ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      typeof criteria !== "object" ||
      criteria === null ||
      Array.isArray(criteria)
    ) {
      return NextResponse.json(
        {
          error:
            "Request body must include 'table', 'data' object, and a 'criteria' object for the rows to update."
        },
        { status: 400 }
      )
    }

    const rows = await service.updateRows(table, criteria, data)
    return NextResponse.json({ data: rows, updated: rows.length })
  } catch (error) {
    return toErrorResponse(error, "Failed to update rows")
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const service = getSqliteAdminService()
    const payload = await request.json()
    const table = payload?.table
    const criteria = payload?.criteria

    if (
      !table ||
      typeof criteria !== "object" ||
      criteria === null ||
      Array.isArray(criteria)
    ) {
      return NextResponse.json(
        {
          error:
            "Request body must include 'table' and a 'criteria' object for the rows to delete."
        },
        { status: 400 }
      )
    }

    const rows = await service.deleteRows(table, criteria)
    return NextResponse.json({ data: rows, deleted: rows.length })
  } catch (error) {
    return toErrorResponse(error, "Failed to delete rows")
  }
}

function parseRowQueryOptions(params: URLSearchParams): RowQueryOptions {
  const limitParam = params.get("limit")
  const offsetParam = params.get("offset")
  const orderBy = params.get("orderBy") ?? undefined
  const orderDirection = parseOrderDirection(params.get("orderDirection"))
  const filters = parseFilters(params)

  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined
  const offset = offsetParam ? Number.parseInt(offsetParam, 10) : undefined

  return {
    limit: Number.isNaN(limit) ? undefined : limit,
    offset: Number.isNaN(offset) ? undefined : offset,
    order_by: orderBy ?? undefined,
    order_direction: orderDirection,
    filters: filters.length ? filters : undefined
  }
}

function parseFilters(params: URLSearchParams): SqliteWhereFilter[] {
  const filters: SqliteWhereFilter[] = []

  params.forEach((value, key) => {
    const match = key.match(/^filter\[(.+?)\](?:\[(.+)\])?$/)
    if (!match) {
      return
    }
    const column = match[1]
    const operatorValue = (match[2] ?? "eq").toLowerCase()
    if (!isAllowedOperator(operatorValue)) {
      throw new Error(`Unsupported filter operator '${operatorValue}'`)
    }
    filters.push({
      column,
      operator: operatorValue as SqliteFilterOperator,
      value
    })
  })

  return filters
}

function parseOrderDirection(
  direction: string | null
): "asc" | "desc" | undefined {
  if (!direction) {
    return undefined
  }
  const normalized = direction.toLowerCase()
  if (normalized === "asc" || normalized === "desc") {
    return normalized
  }
  throw new Error(`Unsupported order direction '${direction}'`)
}

function isAllowedOperator(value: string): value is SqliteFilterOperator {
  return allowedOperators.includes(value as SqliteFilterOperator)
}

function toErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  const status = message.toLowerCase().includes("required") ? 400 : 500
  return NextResponse.json({ error: message }, { status })
}


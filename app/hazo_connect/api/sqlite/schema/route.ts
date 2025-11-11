import { NextRequest, NextResponse } from "next/server"
import { getSqliteAdminService } from "hazo_connect/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const service = getSqliteAdminService()
  const url = new URL(request.url)
  const table = url.searchParams.get("table")

  if (!table) {
    return NextResponse.json(
      { error: "Query parameter 'table' is required." },
      { status: 400 }
    )
  }

  try {
    const schema = await service.getTableSchema(table)
    return NextResponse.json({ data: schema })
  } catch (error) {
    return toErrorResponse(error, `Failed to load schema for table '${table}'`)
  }
}

function toErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  const status = message.toLowerCase().includes("required") ? 400 : 500
  return NextResponse.json({ error: message }, { status })
}


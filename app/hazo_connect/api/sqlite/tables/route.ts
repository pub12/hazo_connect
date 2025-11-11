import { NextResponse } from "next/server"
import { getSqliteAdminService } from "hazo_connect/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const service = getSqliteAdminService()
    const tables = await service.listTables()
    return NextResponse.json({ data: tables })
  } catch (error) {
    return toErrorResponse(error, "Failed to list SQLite tables")
  }
}

function toErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  const status = message.toLowerCase().includes("required") ? 400 : 500
  return NextResponse.json({ error: message }, { status })
}


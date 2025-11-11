/**
 * Purpose: Middleware to check if SQLite admin UI is enabled before allowing access to routes.
 *
 * This middleware ensures that the admin UI routes are only accessible when explicitly enabled
 * in the hazo_connect configuration.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Check if this is an admin UI route
  if (
    request.nextUrl.pathname.startsWith("/hazo_connect/sqlite_admin") ||
    request.nextUrl.pathname.startsWith("/hazo_connect/api/sqlite")
  ) {
    // Check if admin UI is enabled via environment variable or config
    // The admin service will throw an error if not enabled, but we can provide a better message here
    const adminUiEnabled =
      process.env.HAZO_CONNECT_ENABLE_ADMIN_UI === "true" ||
      process.env.ENABLE_SQLITE_ADMIN_UI === "true"

    if (!adminUiEnabled) {
      return NextResponse.json(
        {
          error:
            "SQLite admin UI is not enabled. Set 'enable_admin_ui: true' in your hazo_connect configuration or set HAZO_CONNECT_ENABLE_ADMIN_UI=true environment variable."
        },
        { status: 403 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/hazo_connect/sqlite_admin/:path*", "/hazo_connect/api/sqlite/:path*"]
}


import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware: Minimal pass-through.
 * The old UUID-to-slug redirect for /listing/ routes is no longer needed
 * since we now use Google Place IDs directly.
 */
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.[^/]+$).*)',
  ],
}

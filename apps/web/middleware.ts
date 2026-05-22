import { NextResponse, type NextRequest } from 'next/server'

/**
 * Simplified middleware — no server-side auth checks.
 * Auth is handled client-side via Firebase + Zustand authStore.
 * Protected routes redirect on the client if no token is found.
 */
export async function middleware(request: NextRequest) {
  // Just pass through all requests — auth is handled client-side
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.[^/]+$).*)',
  ],
}

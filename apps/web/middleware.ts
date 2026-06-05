import { NextResponse, type NextRequest } from 'next/server'

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Middleware handles:
 * 1. 301 redirect from /listing/{uuid} to /listing/{slug} for SEO (Requirement 2.6)
 * 2. Pass-through for all other requests (auth handled client-side)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if this is a listing route with a UUID identifier
  if (pathname.startsWith('/listing/')) {
    // Extract the identifier (first segment after /listing/)
    const segments = pathname.split('/')
    const identifier = segments[2]

    if (identifier && UUID_V4_REGEX.test(identifier)) {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
        const res = await fetch(`${apiUrl}/businesses/${identifier}`, {
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
        })

        if (res.ok) {
          const body = await res.json()
          const slug = body?.data?.slug

          if (slug) {
            // Rebuild path replacing UUID with slug, preserving any sub-paths
            segments[2] = slug
            const redirectPath = segments.join('/')
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = redirectPath
            return NextResponse.redirect(redirectUrl, { status: 301 })
          }
        }
      } catch {
        // API error or timeout — fall through to let the page handle it
      }
    }
  }

  // Pass through all other requests
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.[^/]+$).*)',
  ],
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Google OAuth callback handler.
 *
 * Flow:
 *  1. Receive the `code` query param from Supabase Auth after Google consent.
 *  2. Exchange the code for a Supabase session (sets httpOnly cookies).
 *  3. Upsert the authenticated user into the public `users` table so that
 *     the row exists even if this is the user's first OAuth sign-in.
 *  4. Read the user's role and redirect to the role-appropriate entry screen:
 *       business → /dashboard
 *       admin    → /admin
 *       customer → /
 *  5. On any error, redirect to /login?error=oauth_failed.
 *
 * Requirements: 1.5, 1.7
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Exchange the OAuth code for a session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[auth/callback] exchangeCodeForSession error:', exchangeError.message)
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  // Retrieve the authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('[auth/callback] getUser error:', userError?.message)
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  // Upsert the user row in the public users table.
  // This ensures a row exists for OAuth users who bypass the OTP flow.
  // We only set name/email/avatar_url on insert (conflict = do nothing for
  // those fields so existing profile edits are preserved).
  const { error: upsertError } = await supabase.from('users').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      // role defaults to 'customer' in the DB schema; do not override here
    },
    {
      onConflict: 'id',
      // Only update email/name/avatar if they are currently null so we don't
      // clobber data the user has already edited.
      ignoreDuplicates: false,
    }
  )

  if (upsertError) {
    // Non-fatal: log and continue — the session is valid even if the upsert
    // fails (e.g. RLS policy edge case). The user row may already exist.
    console.warn('[auth/callback] users upsert warning:', upsertError.message)
  }

  // Read the user's role from the public users table
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role: string =
    userRow?.role ??
    (user.user_metadata?.role as string | undefined) ??
    (user.app_metadata?.role as string | undefined) ??
    'customer'

  // Redirect to the role-appropriate entry screen (Requirement 1.7)
  const destination = roleHome(role, origin)
  return NextResponse.redirect(destination)
}

/**
 * Returns the role-appropriate home URL.
 *  business → /dashboard
 *  admin    → /admin
 *  customer → /
 */
function roleHome(role: string, origin: string): string {
  if (role === 'business') return `${origin}/dashboard`
  if (role === 'admin') return `${origin}/admin`
  return `${origin}/`
}

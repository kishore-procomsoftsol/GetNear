'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import { Skeleton } from '@/components/ui/skeleton'

interface AuthGuardProps {
  children: React.ReactNode
  /** Where to redirect if not authenticated. Defaults to /login */
  redirectTo?: string
}

/**
 * AuthGuard — wraps pages that require authentication.
 * Shows a loading skeleton while checking auth state.
 * Redirects to login if no session is found after hydration.
 */
export function AuthGuard({ children, redirectTo = '/login' }: AuthGuardProps) {
  const router = useRouter()
  const session = useAuthStore((s) => s.session)
  const isLoading = useAuthStore((s) => s.isLoading)
  const _hydrated = useAuthStore((s) => s._hydrated)

  // Hydrate auth on mount if not already done
  React.useEffect(() => {
    useAuthStore.getState()._hydrate()
  }, [])

  // Redirect if hydrated and no session
  React.useEffect(() => {
    if (_hydrated && !isLoading && !session) {
      router.replace(redirectTo)
    }
  }, [_hydrated, isLoading, session, router, redirectTo])

  // Still loading / hydrating — show skeleton
  if (!_hydrated || isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-24 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  // Not authenticated — don't render children (redirect is happening)
  if (!session) {
    return null
  }

  // Authenticated — render children
  return <>{children}</>
}

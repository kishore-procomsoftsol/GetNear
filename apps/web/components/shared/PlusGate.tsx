'use client'

import * as React from 'react'
import { Lock } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { isPlus } from '@getnear/types'
import { cn } from '@/lib/utils'

interface PlusGateProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  feature?: string
  className?: string
}

/**
 * PlusGate — wraps content that requires GetNear Plus subscription.
 * Shows children if user is Plus, otherwise shows an upsell prompt.
 * Requirements: 16.1, 16.4
 */
export function PlusGate({ children, fallback, feature, className }: PlusGateProps) {
  const { user } = useAuthStore()
  const userIsPlus = user ? isPlus(user as Parameters<typeof isPlus>[0]) : false

  if (userIsPlus) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div className={cn('rounded-xl border border-amber-200 bg-amber-50 p-4 text-center', className)}>
      <Lock className="h-6 w-6 text-amber-600 mx-auto mb-2" />
      <p className="text-sm font-semibold text-dark">GetNear Plus Required</p>
      <p className="text-xs text-muted mt-1">
        {feature ? `${feature} is a Plus feature.` : 'This feature requires GetNear Plus.'}
        {' '}Upgrade to unlock.
      </p>
      <button className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 transition-colors">
        Upgrade to Plus
      </button>
    </div>
  )
}

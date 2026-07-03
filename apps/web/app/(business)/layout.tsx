'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Business layout - redirects to homepage.
 * The business dashboard has been removed; all /dashboard and /add-business
 * routes are permanently redirected to / via next.config.mjs redirects.
 * This layout acts as a fallback for any edge case where the config redirect
 * is bypassed during client-side navigation.
 */
export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return null
}

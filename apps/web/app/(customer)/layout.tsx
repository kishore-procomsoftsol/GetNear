'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useLocationStore } from '@/lib/stores/locationStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { ManualLocationPicker } from '@/components/location/ManualLocationPicker'
import { BottomNav } from '@/components/shared/BottomNav'

/**
 * Customer layout — wraps all customer-facing screens.
 *
 * On mount:
 *  1. Requests GPS via navigator.geolocation.getCurrentPosition
 *  2. On success: reverse-geocodes via Google Geocoding API to get city name,
 *     then calls locationStore.setLocation(lat, lng, city)
 *  3. On permission denied / error: shows ManualLocationPicker modal
 *
 * Renders children + BottomNav + ManualLocationPicker modal when needed.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const setLocation = useLocationStore((s) => s.setLocation)
  const setLocating = useLocationStore((s) => s.setLocating)

  const [showLocationPicker, setShowLocationPicker] = React.useState(false)

  React.useEffect(() => {
    // Hydrate persisted auth from localStorage (avoids logout on refresh)
    useAuthStore.getState()._hydrate()

    // Hydrate persisted location from sessionStorage (avoids SSR mismatch)
    useLocationStore.getState()._hydrate()

    // Skip if location is already set (persisted from session)
    const { lat, lng } = useLocationStore.getState()
    if (lat != null && lng != null) {
      return
    }

    if (!navigator.geolocation) {
      // Geolocation not supported — fall back to manual picker
      setShowLocationPicker(true)
      return
    }

    setLocating(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords

        // Attempt reverse-geocoding to resolve city name
        try {
          const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          if (!apiKey) {
            // No API key — store coords without city name
            setLocation(lat, lng)
            return
          }

          const url = new URL(
            'https://maps.googleapis.com/maps/api/geocode/json'
          )
          url.searchParams.set('latlng', `${lat},${lng}`)
          url.searchParams.set('key', apiKey)

          const res = await fetch(url.toString())
          if (!res.ok) throw new Error('Geocoding request failed')

          const json = await res.json()

          let city: string | undefined

          if (json.status === 'OK' && json.results?.length > 0) {
            // Walk address_components to find locality or administrative_area_level_2
            const components: Array<{ long_name: string; types: string[] }> =
              json.results[0].address_components ?? []

            const locality = components.find((c) =>
              c.types.includes('locality')
            )
            const adminArea2 = components.find((c) =>
              c.types.includes('administrative_area_level_2')
            )
            const adminArea1 = components.find((c) =>
              c.types.includes('administrative_area_level_1')
            )

            city =
              locality?.long_name ??
              adminArea2?.long_name ??
              adminArea1?.long_name
          }

          setLocation(lat, lng, city)
        } catch {
          // Geocoding failed — still store coords without city
          setLocation(lat, lng)
        }
      },
      (_error) => {
        // Permission denied or position unavailable — show manual picker
        setLocating(false)
        setShowLocationPicker(true)
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 5 * 60 * 1000, // 5 minutes
      }
    )
  }, [setLocation, setLocating])

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Page content — bottom padding accounts for the fixed nav bar */}
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>

      {/* Fixed bottom navigation */}
      <BottomNav />

      {/* Manual location picker modal */}
      <AnimatePresence>
        {showLocationPicker && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Modal panel */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className={cn(
                'fixed inset-x-4 top-1/2 -translate-y-1/2 z-50',
                'bg-white rounded-2xl shadow-xl p-6',
                'max-w-sm mx-auto'
              )}
            >
              <ManualLocationPicker
                onClose={() => setShowLocationPicker(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

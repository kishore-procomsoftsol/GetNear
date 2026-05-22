'use client'

import * as React from 'react'
import { MapPin, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocationStore } from '@/lib/stores/locationStore'

interface ManualLocationPickerProps {
  onClose?: () => void
}

/**
 * ManualLocationPicker — uses Google Maps Geocoding API (via server proxy)
 * to let the user search for a city/address and resolve lat/lng.
 *
 * Requirements: 2.3, 2.4
 */
export function ManualLocationPicker({ onClose }: ManualLocationPickerProps) {
  const setLocation = useLocationStore((s) => s.setLocation)
  const setLocating = useLocationStore((s) => s.setLocating)

  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<Array<{ name: string; lat: number; lng: number }>>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Geocode search using the Geocoding API via our API proxy
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      setError(null)

      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!apiKey) throw new Error('No API key')

        // Call Geocoding API directly from browser (works with referrer-restricted keys)
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query.trim())}&key=${apiKey}&components=country:IN`
        )
        const data = await res.json()

        if (data.status === 'OK' && data.results?.length > 0) {
          setResults(
            data.results.slice(0, 5).map((r: any) => ({
              name: r.formatted_address,
              lat: r.geometry.location.lat,
              lng: r.geometry.location.lng,
            }))
          )
        } else if (data.status === 'REQUEST_DENIED') {
          setError('Geocoding API not enabled. Please enable it in Google Cloud Console.')
        } else {
          setResults([])
        }
      } catch {
        setError('Could not fetch suggestions. Please try again.')
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function handleSelect(result: { name: string; lat: number; lng: number }) {
    const cityName = result.name.split(',')[0].trim()
    setLocation(result.lat, result.lng, cityName)
    onClose?.()
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Set your location" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-dark">Set your location</h2>
          <p className="text-sm text-muted mt-0.5">Search for your city or neighbourhood.</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:text-dark hover:bg-gray-100 transition-colors" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city or address…"
          aria-label="Search for a city or address"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {results.length > 0 && (
        <ul className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
          {results.map((r, i) => (
            <li key={i}>
              <button
                onClick={() => handleSelect(r)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-primary-50 transition-colors"
              >
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-dark">{r.name}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && query.trim().length >= 2 && results.length === 0 && !error && (
        <p className="text-sm text-muted text-center py-2">No locations found.</p>
      )}
    </div>
  )
}

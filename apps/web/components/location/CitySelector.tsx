'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, ChevronDown, X } from 'lucide-react'
import { useLocationStore } from '@/lib/stores/locationStore'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Popular cities with coordinates
// ---------------------------------------------------------------------------

const POPULAR_CITIES = [
  { name: 'Visakhapatnam', slug: 'visakhapatnam', lat: 17.6868, lng: 83.2185 },
  { name: 'Hyderabad', slug: 'hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Bangalore', slug: 'bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', slug: 'chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Mumbai', slug: 'mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', slug: 'delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Pune', slug: 'pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Kolkata', slug: 'kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Ahmedabad', slug: 'ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur', slug: 'jaipur', lat: 26.9124, lng: 75.7873 },
] as const

// ---------------------------------------------------------------------------
// CitySelector Component
// ---------------------------------------------------------------------------

export function CitySelector() {
  const router = useRouter()
  const { city, setLocation } = useLocationStore()
  const [open, setOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleCitySelect = (selectedCity: typeof POPULAR_CITIES[number]) => {
    setLocation(selectedCity.lat, selectedCity.lng, selectedCity.name)
    setOpen(false)
    router.push(`/${selectedCity.slug}`)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1 rounded-lg px-2 py-1',
          'text-sm text-primary font-medium',
          'hover:bg-primary/5 active:bg-primary/10 transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select city"
      >
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="truncate max-w-[120px]">{city ?? 'Select City'}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full left-0 mt-1 z-50',
            'w-64 rounded-xl border border-gray-200 bg-white shadow-lg',
            'animate-in fade-in slide-in-from-top-2 duration-150'
          )}
          role="listbox"
          aria-label="Popular cities"
        >
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">
              Popular Cities
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5 text-muted" />
            </button>
          </div>
          <div className="px-1 pb-2 max-h-64 overflow-y-auto">
            {POPULAR_CITIES.map((c) => (
              <button
                key={c.slug}
                type="button"
                role="option"
                aria-selected={city === c.name}
                onClick={() => handleCitySelect(c)}
                className={cn(
                  'flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-left',
                  'hover:bg-gray-50 active:bg-gray-100 transition-colors',
                  city === c.name && 'bg-primary/5 text-primary font-medium'
                )}
              >
                <MapPin className="h-3.5 w-3.5 text-muted flex-shrink-0" aria-hidden="true" />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

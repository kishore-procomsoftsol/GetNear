'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { MapPin, Search, Bell, ChevronDown, Navigation2 } from 'lucide-react'
import { useLocationStore } from '@/lib/stores/locationStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { CATEGORIES } from '@getnear/config'
import { CitySelector } from '@/components/location/CitySelector'
import { PopularNearYou } from '@/components/home/PopularNearYou'
import { LazyMapView } from '@/components/maps/LazyMapView'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Greeting
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning!'
  if (hour < 17) return 'Good afternoon!'
  return 'Good evening!'
}

// ---------------------------------------------------------------------------
// Quick Access Category
// ---------------------------------------------------------------------------

function QuickAccessItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 min-w-[64px]"
    >
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl shadow-sm border border-blue-100">
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Search Filter Pill
// ---------------------------------------------------------------------------

function FilterPill({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-all',
        active
          ? 'bg-primary text-white border-primary shadow-sm'
          : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
      )}
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { city, lat, lng, radius, setRadius, isLocating } = useLocationStore()
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)

  const greeting = getGreeting()
  const topCategories = CATEGORIES.filter((c) => c.parent_id === null).slice(0, 5)

  const quickAccessItems = [
    { icon: '🍽️', label: 'Restaurants', slug: 'restaurants' },
    { icon: '☕', label: 'Cafes', slug: 'cafes' },
    { icon: '🛒', label: 'Grocery', slug: 'grocery' },
    { icon: '💊', label: 'Pharmacy', slug: 'pharmacies' },
    { icon: '🏧', label: 'ATM', slug: 'atm' },
    { icon: '⋯', label: 'More', slug: '' },
  ]

  return (
    <div className="flex flex-col gap-0 bg-white min-h-dvh">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
            GN
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-base font-bold text-gray-900">Get Near</span>
              <span className="text-yellow-500 text-xs">●</span>
            </div>
            <span className="text-xs text-gray-500">Nearby discovery</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-full hover:bg-gray-100">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          </button>
          {user ? (
            <Link href="/account" className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <span className="text-xs">👤</span> Account
            </Link>
          ) : (
            <Link href="/login" className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <span className="text-xs">👤</span> Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="px-4 pt-4 pb-6">
        <p className="text-primary font-semibold text-sm mb-1">{greeting} 👋</p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              Find trusted places<br />
              <span className="text-primary">near you</span> 📍
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Explore restaurants, shops, services<br />and more around you.
            </p>
          </div>
          <div className="w-24 h-20 flex items-center justify-center opacity-80">
            <span className="text-5xl">🏙️</span>
          </div>
        </div>
      </div>

      {/* Location Section */}
      <div className="mx-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Location</span>
          <button
            onClick={() => {
              if (navigator.geolocation) {
                const { setLocating, setLocation } = useLocationStore.getState()
                setLocating(true)
                navigator.geolocation.getCurrentPosition(
                  async (position) => {
                    const { latitude: lat, longitude: lng } = position.coords
                    try {
                      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.getnear.ai/api/v1'
                      const res = await fetch(`${apiUrl}/reverse-geocode?lat=${lat}&lng=${lng}`)
                      let cityName: string | undefined
                      if (res.ok) {
                        const json = await res.json()
                        if (json.data?.city) {
                          cityName = json.data.city
                        }
                      }
                      setLocation(lat, lng, cityName)
                    } catch {
                      setLocation(lat, lng)
                    }
                  },
                  () => { setLocating(false) },
                  { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 }
                )
              }
            }}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Navigation2 className="h-3 w-3" /> Use my location
          </button>
        </div>
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {city ? city : isLocating ? 'Detecting location...' : lat != null ? 'Location detected' : 'Location not set'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {city ? `${city}, India` : isLocating ? 'Please wait...' : lat != null ? 'Tap "Use my location" to refresh' : 'Allow location access for better results'}
            </p>
          </div>
          <CitySelector />
        </div>
      </div>

      {/* Search Filters */}
      <div className="px-4 pt-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Search for</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {topCategories.map((cat) => (
            <FilterPill
              key={cat.id}
              icon={cat.icon}
              label={cat.name}
              active={selectedCategory === cat.slug}
              onClick={() => setSelectedCategory(selectedCategory === cat.slug ? null : cat.slug)}
            />
          ))}
          <FilterPill icon="📋" label="More" onClick={() => router.push('/search')} />
        </div>

        {/* Radius + Sort + Search Button */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
            >
              <option value={1}>1 km</option>
              <option value={3}>3 km</option>
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
            </select>
          </div>
          <div className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm">
            <span className="text-gray-400 text-xs">↕️</span>
            <span className="text-sm font-medium text-gray-700">Relevance</span>
          </div>
          <button
            onClick={() => router.push(selectedCategory ? `/search?category=${selectedCategory}` : '/search')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-md hover:bg-primary-700 transition-colors"
          >
            <Search className="h-4 w-4" /> Search
          </button>
        </div>
      </div>

      {/* Quick Access */}
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Quick access</h2>
          <Link href="/search" className="text-xs font-semibold text-primary">See all</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {quickAccessItems.map((item) => (
            <QuickAccessItem
              key={item.slug}
              icon={item.icon}
              label={item.label}
              onClick={() => item.slug ? router.push(`/search?category=${item.slug}`) : router.push('/search')}
            />
          ))}
        </div>
      </div>

      {/* Popular Near You */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Popular near you</h2>
          <Link href="/search" className="text-xs font-semibold text-primary">See all</Link>
        </div>
        {lat && lng ? (
          <PopularNearYou />
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            Enable location to see popular places near you.
          </p>
        )}
      </div>

      {/* Explore on Map */}
      <div className="mx-4 mt-4 mb-6 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 p-4 bg-white">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Explore on map</p>
            <p className="text-xs text-gray-500">See all places around you</p>
          </div>
          <Link href="/search/map" className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-sm">→</span>
          </Link>
        </div>
        {lat && lng ? (
          <LazyMapView
            center={{ lat, lng }}
            zoom={13}
            className="h-32"
          />
        ) : (
          <div className="h-32 bg-blue-50 flex items-center justify-center text-gray-400 text-sm">
            <span>Enable location to see map</span>
          </div>
        )}
      </div>
    </div>
  )
}

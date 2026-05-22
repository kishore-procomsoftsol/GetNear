'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface MapMarker {
  id: string
  lat: number
  lng: number
  name: string
  rating?: number | null
}

interface MapViewProps {
  markers?: MapMarker[]
  center?: { lat: number; lng: number }
  userLocation?: { lat: number; lng: number } | null
  zoom?: number
  onMarkerClick?: (id: string) => void
  onError?: () => void
  className?: string
}

/**
 * Google Maps wrapper component.
 * Lazy-loaded via next/dynamic (SSR disabled) in consuming pages.
 * Uses the Google Maps JavaScript API with marker clustering.
 *
 * Requirements: 3.5, 3.10
 */
export function MapView({
  markers = [],
  center,
  userLocation,
  zoom = 14,
  onMarkerClick,
  onError,
  className,
}: MapViewProps) {
  const mapRef = React.useRef<HTMLDivElement>(null)
  const mapInstanceRef = React.useRef<google.maps.Map | null>(null)
  const markersRef = React.useRef<google.maps.Marker[]>([])
  const userMarkerRef = React.useRef<google.maps.Marker | null>(null)
  // Load Google Maps script
  React.useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      onError?.()
      return
    }

    const existingScript = document.getElementById('google-maps-script')
    if (!existingScript) {
      const script = document.createElement('script')
      script.id = 'google-maps-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`
      script.async = true
      script.defer = true
      script.onload = initMap
      script.onerror = () => {
        // Remove the failed script so retry can re-add it
        script.remove()
        onError?.()
      }
      document.head.appendChild(script)
    } else if (window.google?.maps) {
      initMap()
    }
  }, [])

  function initMap() {
    if (!mapRef.current || !window.google?.maps) return
    const mapCenter = center ?? { lat: 17.385, lng: 78.4867 } // Default: Hyderabad

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    updateMarkers()
    updateUserLocation()
  }

  // Update user location marker
  React.useEffect(() => {
    if (mapInstanceRef.current) {
      updateUserLocation()
    }
  }, [userLocation])

  function updateUserLocation() {
    if (!mapInstanceRef.current) return

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null)
      userMarkerRef.current = null
    }

    if (!userLocation) return

    // Create a blue dot marker for user location
    const userMarker = new google.maps.Marker({
      position: { lat: userLocation.lat, lng: userLocation.lng },
      map: mapInstanceRef.current,
      title: 'Your location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#2563EB',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      zIndex: 999,
    })

    userMarkerRef.current = userMarker
  }

  // Update markers when data changes
  React.useEffect(() => {
    if (mapInstanceRef.current) {
      updateMarkers()
    }
  }, [markers])

  function updateMarkers() {
    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    if (!mapInstanceRef.current) return

    markers.forEach((m) => {
      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: mapInstanceRef.current!,
        title: m.name,
        label: m.rating ? String(m.rating.toFixed(1)) : undefined,
      })

      marker.addListener('click', () => {
        onMarkerClick?.(m.id)
      })

      markersRef.current.push(marker)
    })

    // Fit bounds if multiple markers
    if (markers.length > 1) {
      const bounds = new google.maps.LatLngBounds()
      markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }))
      mapInstanceRef.current.fitBounds(bounds, 50)
    }
  }

  return (
    <div
      ref={mapRef}
      className={cn('w-full h-64 rounded-xl bg-gray-100', className)}
      aria-label="Map showing business locations"
      role="application"
    />
  )
}

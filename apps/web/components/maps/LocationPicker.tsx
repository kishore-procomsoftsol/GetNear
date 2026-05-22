'use client'

import * as React from 'react'
import { Navigation2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { extractAddressComponents, matchStateToList } from './geocodingUtils'
import { INDIAN_STATES } from './indianStates'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocationData {
  lat: number
  lng: number
  address: string
  city: string
  state: string
  pinCode: string
}

export interface LocationPickerProps {
  /** Initial location values (for edit mode) */
  initialValues?: Partial<LocationData>
  /** Callback fired whenever location data changes */
  onChange: (data: LocationData) => void
  /** Optional error messages for inline validation display */
  errors?: Partial<Record<keyof LocationData, string>>
  /** Optional CSS class for the container */
  className?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }
const DEFAULT_ZOOM = 5
const INITIAL_VALUES_ZOOM = 15
const PIN_CODE_DEBOUNCE_MS = 500

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Interactive Google Maps-based location picker.
 * Supports map click, pin drag, and reverse geocoding.
 * Falls back to manual lat/lng inputs when Google Maps API fails to load.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5,
 *              3.1, 3.2, 3.3, 3.4, 10.1, 10.2
 */
export function LocationPicker({
  initialValues,
  onChange,
  errors,
  className,
}: LocationPickerProps) {
  // Refs
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const mapInstanceRef = React.useRef<google.maps.Map | null>(null)
  const markerRef = React.useRef<google.maps.Marker | null>(null)
  const geocoderRef = React.useRef<google.maps.Geocoder | null>(null)
  const autocompleteInputRef = React.useRef<HTMLInputElement>(null)
  const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null)

  // State
  const [mapLoaded, setMapLoaded] = React.useState(false)
  const [mapLoadFailed, setMapLoadFailed] = React.useState(false)

  // Form field state (for rendering inputs)
  const [address, setAddress] = React.useState(initialValues?.address ?? '')
  const [city, setCity] = React.useState(initialValues?.city ?? '')
  const [state, setState] = React.useState(initialValues?.state ?? '')
  const [pinCode, setPinCode] = React.useState(initialValues?.pinCode ?? '')

  // Debounce timer for PIN code forward geocoding
  const pinCodeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [gpsLoading, setGpsLoading] = React.useState(false)
  const [gpsError, setGpsError] = React.useState<string | null>(null)

  // Current location data (internal state)
  const locationDataRef = React.useRef<LocationData>({
    lat: initialValues?.lat ?? 0,
    lng: initialValues?.lng ?? 0,
    address: initialValues?.address ?? '',
    city: initialValues?.city ?? '',
    state: initialValues?.state ?? '',
    pinCode: initialValues?.pinCode ?? '',
  })

  // Fallback manual inputs state
  const [manualLat, setManualLat] = React.useState(
    initialValues?.lat?.toString() ?? ''
  )
  const [manualLng, setManualLng] = React.useState(
    initialValues?.lng?.toString() ?? ''
  )

  // -------------------------------------------
  // Google Maps Script Loading
  // -------------------------------------------

  React.useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setMapLoadFailed(true)
      return
    }

    const existingScript = document.getElementById('google-maps-script')
    if (!existingScript) {
      const script = document.createElement('script')
      script.id = 'google-maps-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,places`
      script.async = true
      script.defer = true
      script.onload = () => {
        setMapLoaded(true)
      }
      script.onerror = () => {
        script.remove()
        setMapLoadFailed(true)
      }
      document.head.appendChild(script)
    } else if (window.google?.maps) {
      setMapLoaded(true)
    } else {
      // Script exists but hasn't loaded yet — wait for it
      const existingEl = document.getElementById(
        'google-maps-script'
      ) as HTMLScriptElement | null
      if (existingEl) {
        const originalOnload = existingEl.onload
        existingEl.onload = (e) => {
          if (typeof originalOnload === 'function') {
            originalOnload.call(existingEl, e)
          }
          setMapLoaded(true)
        }
        existingEl.onerror = () => {
          setMapLoadFailed(true)
        }
      }
    }
  }, [])

  // -------------------------------------------
  // Map Initialization
  // -------------------------------------------

  React.useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !window.google?.maps) return

    const hasInitialCoords =
      initialValues?.lat !== undefined && initialValues?.lng !== undefined

    const center = hasInitialCoords
      ? { lat: initialValues.lat!, lng: initialValues.lng! }
      : DEFAULT_CENTER

    const zoom = hasInitialCoords ? INITIAL_VALUES_ZOOM : DEFAULT_ZOOM

    const map = new google.maps.Map(mapContainerRef.current, {
      center,
      zoom,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    mapInstanceRef.current = map
    geocoderRef.current = new google.maps.Geocoder()

    // Place initial marker if coordinates provided
    if (hasInitialCoords) {
      placeMarker({ lat: initialValues.lat!, lng: initialValues.lng! })
    }

    // Map click handler
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return
      const position = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      placeMarker(position)
      reverseGeocode(position)
    })

    // -------------------------------------------
    // Places Autocomplete Initialization
    // -------------------------------------------

    if (
      autocompleteInputRef.current &&
      window.google?.maps?.places &&
      !autocompleteRef.current
    ) {
      const autocomplete = new google.maps.places.Autocomplete(
        autocompleteInputRef.current,
        {
          componentRestrictions: { country: 'in' },
          fields: ['geometry', 'address_components', 'formatted_address'],
        }
      )

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place.geometry?.location) return

        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        const position = { lat, lng }

        // Move pin and center map at zoom 16
        placeMarker(position)
        map.setCenter(position)
        map.setZoom(16)

        // Extract address components
        const extracted = extractAddressComponents(
          (place.address_components ?? []) as Array<{
            long_name: string
            short_name: string
            types: string[]
          }>,
          place.formatted_address ?? ''
        )

        const matchedState = matchStateToList(extracted.state)

        // Update location data with all extracted fields
        const currentData = locationDataRef.current
        updateLocationData({
          lat,
          lng,
          address: extracted.formattedAddress || currentData.address,
          city: extracted.city || currentData.city,
          state: matchedState ?? (extracted.state || currentData.state),
          pinCode: extracted.pinCode || currentData.pinCode,
        })
      })

      autocompleteRef.current = autocomplete
    }
  }, [mapLoaded])

  // -------------------------------------------
  // Marker Management
  // -------------------------------------------

  function placeMarker(position: { lat: number; lng: number }) {
    if (!mapInstanceRef.current) return

    if (markerRef.current) {
      markerRef.current.setPosition(position)
    } else {
      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        draggable: true,
        title: 'Business Location',
      })

      marker.addListener('dragend', () => {
        const pos = marker.getPosition()
        if (!pos) return
        const newPosition = { lat: pos.lat(), lng: pos.lng() }
        reverseGeocode(newPosition)
      })

      markerRef.current = marker
    }
  }

  // -------------------------------------------
  // Reverse Geocoding
  // -------------------------------------------

  function reverseGeocode(position: { lat: number; lng: number }) {
    const geocoder = geocoderRef.current
    if (!geocoder) {
      // No geocoder available — just update coordinates
      updateLocationData({ lat: position.lat, lng: position.lng })
      return
    }

    geocoder.geocode({ location: position }, (results: any, status: any) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const result = results[0]
        const extracted = extractAddressComponents(
          result.address_components as Array<{
            long_name: string
            short_name: string
            types: string[]
          }>,
          result.formatted_address
        )

        const matchedState = matchStateToList(extracted.state)

        // Build updated data, preserving fields the geocoder didn't return
        const currentData = locationDataRef.current
        const updatedData: LocationData = {
          lat: position.lat,
          lng: position.lng,
          address: extracted.formattedAddress || currentData.address,
          city: extracted.city || currentData.city,
          state: matchedState ?? (extracted.state || currentData.state),
          pinCode: extracted.pinCode || currentData.pinCode,
        }

        updateLocationData(updatedData)
      } else {
        // Geocoding failed or no results — retain coordinates, skip address update
        updateLocationData({ lat: position.lat, lng: position.lng })
      }
    })
  }

  // -------------------------------------------
  // Location Data Update
  // -------------------------------------------

  function updateLocationData(partial: Partial<LocationData>) {
    const currentData = locationDataRef.current
    const newData: LocationData = {
      ...currentData,
      ...partial,
    }
    locationDataRef.current = newData

    // Sync React state for form fields
    if (partial.address !== undefined) setAddress(newData.address)
    if (partial.city !== undefined) setCity(newData.city)
    if (partial.state !== undefined) setState(newData.state)
    if (partial.pinCode !== undefined) setPinCode(newData.pinCode)

    onChange(newData)
  }

  // -------------------------------------------
  // Forward Geocoding (PIN Code)
  // Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
  // -------------------------------------------

  function forwardGeocodePin(pin: string) {
    const geocoder = geocoderRef.current
    if (!geocoder) return

    geocoder.geocode(
      { address: pin, componentRestrictions: { country: 'IN' } },
      (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          const result = results[0]
          const location = result.geometry.location
          const coords = { lat: location.lat(), lng: location.lng() }

          const extracted = extractAddressComponents(
            result.address_components as Array<{
              long_name: string
              short_name: string
              types: string[]
            }>,
            result.formatted_address
          )

          const matchedState = matchStateToList(extracted.state)

          // Move pin and center map
          placeMarker(coords)
          mapInstanceRef.current?.setCenter(coords)
          mapInstanceRef.current?.setZoom(INITIAL_VALUES_ZOOM)

          // Update location data with geocoded results
          const currentData = locationDataRef.current
          updateLocationData({
            lat: coords.lat,
            lng: coords.lng,
            address: extracted.formattedAddress || currentData.address,
            city: extracted.city || currentData.city,
            state: matchedState ?? (extracted.state || currentData.state),
            pinCode: pin,
          })
        }
        // On no results: leave city/state unchanged (requirement 8.5)
      }
    )
  }

  // -------------------------------------------
  // Field Change Handlers
  // Requirements: 7.1, 7.2, 7.3, 7.4, 8.6, 9.5
  // -------------------------------------------

  function handlePinCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setPinCode(value)
    locationDataRef.current = { ...locationDataRef.current, pinCode: value }
    onChange({ ...locationDataRef.current, pinCode: value })

    // Clear existing debounce timer
    if (pinCodeTimerRef.current) {
      clearTimeout(pinCodeTimerRef.current)
      pinCodeTimerRef.current = null
    }

    // Trigger forward geocoding on valid 6-digit PIN after debounce
    if (value.length === 6) {
      pinCodeTimerRef.current = setTimeout(() => {
        forwardGeocodePin(value)
      }, PIN_CODE_DEBOUNCE_MS)
    }
  }

  function handleCityChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setCity(value)
    locationDataRef.current = { ...locationDataRef.current, city: value }
    onChange({ ...locationDataRef.current, city: value })
  }

  function handleStateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    setState(value)
    locationDataRef.current = { ...locationDataRef.current, state: value }
    onChange({ ...locationDataRef.current, state: value })
  }

  function handleAddressChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setAddress(value)
    locationDataRef.current = { ...locationDataRef.current, address: value }
    onChange({ ...locationDataRef.current, address: value })
  }

  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (pinCodeTimerRef.current) {
        clearTimeout(pinCodeTimerRef.current)
      }
    }
  }, [])

  // -------------------------------------------
  // Fallback Manual Input Handlers
  // -------------------------------------------

  function handleManualSubmit() {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)

    if (isNaN(lat) || isNaN(lng)) return
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return

    updateLocationData({ lat, lng })
  }

  // -------------------------------------------
  // GPS Current Location
  // -------------------------------------------

  // Auto-dismiss GPS error after 5 seconds
  React.useEffect(() => {
    if (!gpsError) return
    const timer = setTimeout(() => {
      setGpsError(null)
    }, 5000)
    return () => clearTimeout(timer)
  }, [gpsError])

  function handleGpsClick() {
    if (!navigator.geolocation) {
      setGpsError('Could not determine your location. Try again or select manually.')
      return
    }

    setGpsLoading(true)
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false)
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        // Move pin to GPS coordinates
        placeMarker(coords)

        // Center map at zoom 15
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(coords)
          mapInstanceRef.current.setZoom(15)
        }

        // Reverse geocode and update fields
        reverseGeocode(coords)
      },
      (error) => {
        setGpsLoading(false)
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('Location access denied. Please enable location permissions.')
        } else {
          setGpsError('Could not determine your location. Try again or select manually.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  // -------------------------------------------
  // Render: Fallback UI
  // -------------------------------------------

  if (mapLoadFailed) {
    return (
      <div
        className={cn(
          'w-full rounded-xl border border-gray-200 bg-gray-50 p-6',
          className
        )}
      >
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600">
            Map unavailable. Enter coordinates manually.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="manual-lat"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Latitude
            </label>
            <input
              id="manual-lat"
              type="number"
              step="any"
              min={-90}
              max={90}
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="e.g. 17.385"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors?.lat && (
              <p className="mt-1 text-xs text-red-500">{errors.lat}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="manual-lng"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Longitude
            </label>
            <input
              id="manual-lng"
              type="number"
              step="any"
              min={-180}
              max={180}
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              placeholder="e.g. 78.4867"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors?.lng && (
              <p className="mt-1 text-xs text-red-500">{errors.lng}</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleManualSubmit}
            className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Set Location
          </button>
        </div>
      </div>
    )
  }

  // -------------------------------------------
  // Render: Map UI
  // -------------------------------------------

  return (
    <div className={cn('w-full flex flex-col gap-4', className)}>
      {/* Address Autocomplete Input */}
      <div>
        <label
          htmlFor="location-autocomplete"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Search Address
        </label>
        <input
          ref={autocompleteInputRef}
          id="location-autocomplete"
          type="text"
          placeholder="Type an address to search..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search for an address"
        />
        {errors?.address && (
          <p className="mt-1 text-xs text-red-500">{errors.address}</p>
        )}
      </div>

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="w-full rounded-xl bg-gray-100"
        style={{ minHeight: '250px', height: '350px' }}
        aria-label="Interactive map for selecting business location"
        role="application"
      />

      {/* GPS Current Location Button */}
      <button
        type="button"
        onClick={handleGpsClick}
        disabled={gpsLoading}
        className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {gpsLoading ? (
          <div className="h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Navigation2 className="h-4 w-4" />
        )}
        Select current location
      </button>

      {/* GPS Error Message */}
      {gpsError && (
        <div
          className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <span>{gpsError}</span>
          <button
            type="button"
            onClick={() => setGpsError(null)}
            className="ml-3 text-red-500 hover:text-red-700 focus:outline-none"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Address Fields Below Map */}
      <div className="flex flex-col gap-3">
        {/* Address */}
        <div>
          <label
            htmlFor="location-address"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Address
          </label>
          <input
            id="location-address"
            type="text"
            value={address}
            onChange={handleAddressChange}
            placeholder="Street address"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors?.address && (
            <p className="mt-1 text-xs text-red-500">{errors.address}</p>
          )}
        </div>

        {/* City */}
        <div>
          <label
            htmlFor="location-city"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            City
          </label>
          <input
            id="location-city"
            type="text"
            value={city}
            onChange={handleCityChange}
            placeholder="City"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors?.city && (
            <p className="mt-1 text-xs text-red-500">{errors.city}</p>
          )}
        </div>

        {/* State Dropdown */}
        <div>
          <label
            htmlFor="location-state"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            State
          </label>
          <select
            id="location-state"
            value={state}
            onChange={handleStateChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s.code} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          {errors?.state && (
            <p className="mt-1 text-xs text-red-500">{errors.state}</p>
          )}
        </div>

        {/* PIN Code */}
        <div>
          <label
            htmlFor="location-pincode"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            PIN Code
          </label>
          <input
            id="location-pincode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pinCode}
            onChange={handlePinCodeChange}
            placeholder="6-digit PIN code"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors?.pinCode && (
            <p className="mt-1 text-xs text-red-500">{errors.pinCode}</p>
          )}
        </div>
      </div>
    </div>
  )
}

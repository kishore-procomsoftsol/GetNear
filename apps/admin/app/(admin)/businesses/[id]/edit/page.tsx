'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { INDIAN_STATES } from '@/lib/indianStates'

interface Category {
  id: string
  name: string
  icon: string | null
  parent_id: string | null
}

interface Photo {
  id: string
  url: string
  is_primary: boolean
  display_order: number
}

const BUSINESS_TYPES = [
  { value: 'physical', label: 'Physical Store', description: 'Storefront business', emoji: '🏪' },
  { value: 'service', label: 'Service Business', description: 'Visit to customer', emoji: '🔧' },
  { value: 'online', label: 'Online Business', description: 'Online only', emoji: '💻' },
]

export default function EditBusinessPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    name: '', category_id: '', type: 'physical', description: '',
    phone: '', email: '', website: '', whatsapp: '',
    address: '', city: '', state: '', pin: '',
    lat: '', lng: '',
  })
  const [existingPhotos, setExistingPhotos] = useState<Photo[]>([])
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([])

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Map refs and state
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)
  const addressAutocompleteRef = useRef<HTMLInputElement>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // Load business data and categories
  useEffect(() => {
    Promise.all([
      api.get(`/admin/businesses/${id}`),
      api.get('/admin/categories'),
    ]).then(([bizRes, catRes]) => {
      const biz = bizRes.data.data
      if (biz) {
        setForm({
          name: biz.name || '',
          category_id: biz.category_id || '',
          type: biz.type || 'physical',
          description: biz.description || '',
          phone: biz.phone || '',
          email: biz.email || '',
          website: biz.website || '',
          whatsapp: biz.whatsapp || '',
          address: biz.address || '',
          city: biz.city || '',
          state: biz.state || '',
          pin: biz.pin || '',
          lat: biz.lat ? String(biz.lat) : '',
          lng: biz.lng ? String(biz.lng) : '',
        })
        if (biz.business_photos) {
          setExistingPhotos(biz.business_photos)
        }
      }
      setCategories(catRes.data.data ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  // Google Maps Initialization
  useEffect(() => {
    if (loading) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return

    const existingScript = document.getElementById('google-maps-script')
    if (!existingScript) {
      const script = document.createElement('script')
      script.id = 'google-maps-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = initMap
      document.head.appendChild(script)
    } else if ((window as any).google?.maps) {
      initMap()
    }
  }, [loading])

  function initMap() {
    if (!mapContainerRef.current || !(window as any).google?.maps) return
    const google = (window as any).google

    const initialLat = form.lat ? parseFloat(form.lat) : 20.5937
    const initialLng = form.lng ? parseFloat(form.lng) : 78.9629
    const initialZoom = form.lat ? 15 : 5

    const map = new google.maps.Map(mapContainerRef.current, {
      center: { lat: initialLat, lng: initialLng },
      zoom: initialZoom,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    mapInstanceRef.current = map
    geocoderRef.current = new google.maps.Geocoder()

    // Place existing marker if lat/lng exist
    if (form.lat && form.lng) {
      placeMarker({ lat: parseFloat(form.lat), lng: parseFloat(form.lng) })
    }

    // Click to place pin
    map.addListener('click', (e: any) => {
      if (!e.latLng) return
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      placeMarker(pos)
      reverseGeocode(pos)
    })

    // Places Autocomplete
    if (addressAutocompleteRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(
        addressAutocompleteRef.current,
        { componentRestrictions: { country: 'in' }, fields: ['geometry', 'address_components', 'formatted_address'] }
      )
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place.geometry?.location) return
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        placeMarker({ lat, lng })
        map.setCenter({ lat, lng })
        map.setZoom(16)
        extractAndFillAddress(place.address_components, place.formatted_address)
        setForm((prev) => ({ ...prev, lat: String(lat), lng: String(lng) }))
      })
    }
  }

  function placeMarker(pos: { lat: number; lng: number }) {
    const google = (window as any).google
    if (!mapInstanceRef.current) return

    if (markerRef.current) {
      markerRef.current.setPosition(pos)
    } else {
      const marker = new google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        draggable: true,
        title: 'Business Location',
      })
      marker.addListener('dragend', () => {
        const p = marker.getPosition()
        if (!p) return
        const newPos = { lat: p.lat(), lng: p.lng() }
        reverseGeocode(newPos)
      })
      markerRef.current = marker
    }

    setForm((prev) => ({ ...prev, lat: String(pos.lat), lng: String(pos.lng) }))
  }

  function reverseGeocode(pos: { lat: number; lng: number }) {
    if (!geocoderRef.current) return
    geocoderRef.current.geocode({ location: pos }, (results: any, status: any) => {
      if (status === 'OK' && results?.[0]) {
        extractAndFillAddress(results[0].address_components, results[0].formatted_address)
        setForm((prev) => ({ ...prev, lat: String(pos.lat), lng: String(pos.lng) }))
      }
    })
  }

  function extractAndFillAddress(components: any[], formattedAddress?: string) {
    let city = '', state = '', pinCode = ''
    for (const c of components || []) {
      if (c.types.includes('locality')) city = c.long_name
      else if (!city && c.types.includes('administrative_area_level_2')) city = c.long_name
      if (c.types.includes('administrative_area_level_1')) state = c.long_name
      if (c.types.includes('postal_code')) pinCode = c.long_name
    }
    const matchedState = INDIAN_STATES.find(
      (s) => s.name.toLowerCase() === state.toLowerCase()
    )?.name ?? ''

    setForm((prev) => ({
      ...prev,
      address: formattedAddress || prev.address,
      city: city || prev.city,
      state: matchedState || prev.state,
      pin: pinCode || prev.pin,
    }))
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported')
      return
    }
    setGpsLoading(true)
    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false)
        setGpsError(null)
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude }
        placeMarker(pos)
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(pos)
          mapInstanceRef.current.setZoom(15)
        }
        reverseGeocode(pos)
      },
      (err) => {
        setGpsLoading(false)
        if (err.code === 1) {
          setGpsError('Location access denied. Make sure the site is loaded over HTTPS and location is allowed.')
        } else {
          setGpsError('Could not get location. Try clicking on the map instead.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      const payload: any = {
        ...form,
        lat: form.lat ? parseFloat(form.lat) : undefined,
        lng: form.lng ? parseFloat(form.lng) : undefined,
        category_id: form.category_id || undefined,
      }
      await api.put(`/admin/businesses/${id}/update`, payload)

      // Upload new photos if any
      if (newPhotos.length > 0) {
        for (let i = 0; i < newPhotos.length; i++) {
          const file = newPhotos[i]
          const base64 = await fileToBase64(file)
          await api.post(`/admin/businesses/${id}/photos`, {
            image: base64,
            filename: file.name,
            is_primary: existingPhotos.length === 0 && i === 0,
          })
        }
      }

      // Refresh photos from server after upload
      const refreshRes = await api.get(`/admin/businesses/${id}`)
      if (refreshRes.data.data?.business_photos) {
        setExistingPhotos(refreshRes.data.data.business_photos)
      }

      setSuccess(true)
      setNewPhotos([])
      setNewPhotoPreviews([])
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update business')
    } finally {
      setSaving(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const totalPhotos = existingPhotos.length + newPhotos.length
    const files = Array.from(e.target.files || []).slice(0, 10 - totalPhotos)
    setNewPhotos([...newPhotos, ...files])
    const previews = files.map((f) => URL.createObjectURL(f))
    setNewPhotoPreviews([...newPhotoPreviews, ...previews])
  }

  const removeNewPhoto = (index: number) => {
    setNewPhotos(newPhotos.filter((_, i) => i !== index))
    setNewPhotoPreviews(newPhotoPreviews.filter((_, i) => i !== index))
  }

  const deleteExistingPhoto = async (photoId: string) => {
    try {
      await api.delete(`/admin/businesses/${id}/photos/${photoId}`)
      setExistingPhotos(existingPhotos.filter((p) => p.id !== photoId))
    } catch {}
  }

  if (loading) {
    return <div className="p-8"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded mb-4" /><div className="animate-pulse h-64 w-full bg-gray-100 rounded" /></div>
  }

  const topCategories = categories.filter((c) => c.parent_id === null)

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/businesses" className="hover:text-blue-600 transition-colors">Businesses</Link>
        <span>/</span>
        <Link href={`/businesses/${id}`} className="hover:text-blue-600 transition-colors">Details</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Edit</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Business</h1>
        <p className="text-sm text-gray-500 mt-1">Update the business listing details.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Section 1: Basic Information */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
              <span className="text-lg">🏢</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>
              <p className="text-sm text-gray-500">Business details</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Business Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Chai Point"
                required
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Business Category</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
              >
                <option value="">Select primary category</option>
                {topCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Business Type *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {BUSINESS_TYPES.map((bt) => {
                  const isSelected = form.type === bt.value
                  return (
                    <button
                      key={bt.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: bt.value })}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-center transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{bt.emoji}</span>
                      <span className={`text-sm font-medium ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>{bt.label}</span>
                      <span className="text-xs text-gray-500">{bt.description}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 500) })}
                rows={4}
                maxLength={500}
                placeholder="Tell customers about this business…"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
              />
              <div className="flex justify-end">
                <span className="text-xs text-gray-400">{form.description.length}/500</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Contact Information */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
              <span className="text-lg">📞</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Contact Information</h2>
              <p className="text-sm text-gray-500">How customers can reach this business</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Phone Number</label>
              <div className="flex">
                <div className="flex items-center gap-1 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-600">
                  <span className="text-sm">🇮🇳</span><span>+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="9876543210"
                  className="h-10 flex-1 rounded-r-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="business@example.com" className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Website</label>
              <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">WhatsApp</label>
              <div className="flex">
                <div className="flex items-center gap-1 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-600">
                  <span className="text-sm">🇮🇳</span><span>+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="9876543210"
                  className="h-10 flex-1 rounded-r-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Business Location */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
              <span className="text-lg">📍</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Business Location</h2>
              <p className="text-sm text-gray-500">Where is this business located?</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Search Address</label>
              <input
                ref={addressAutocompleteRef}
                type="text"
                placeholder="Type an address to search on map..."
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div ref={mapContainerRef} className="w-full rounded-xl bg-gray-100 border border-gray-200" style={{ height: '300px' }} />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={gpsLoading}
                className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gpsLoading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (<span>📍</span>)}
                Use My Current Location
              </button>
              {gpsError && <p className="text-xs text-red-600">{gpsError}</p>}
              <p className="text-xs text-gray-400">Click on the map to place a pin, or drag the pin to adjust location.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Address *</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" required className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">City *</label>
                <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Visakhapatnam" required className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">State</label>
                <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (<option key={s.code} value={s.name}>{s.name}</option>))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">PIN Code</label>
                <input type="text" inputMode="numeric" maxLength={6} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} placeholder="530048" className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400" />
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Photos */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pink-100">
              <span className="text-lg">📷</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Photos</h2>
              <p className="text-sm text-gray-500">Manage business photos (max 10)</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Existing photos */}
            {existingPhotos.map((photo) => (
              <div key={photo.id} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group">
                <img src={photo.url} alt="Business photo" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => deleteExistingPhoto(photo.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >×</button>
                {photo.is_primary && (
                  <span className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-[10px] text-center py-0.5 font-medium">Primary</span>
                )}
              </div>
            ))}

            {/* New photo previews */}
            {newPhotoPreviews.map((preview, i) => (
              <div key={`new-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group">
                <img src={preview} alt={`New photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewPhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >×</button>
                <span className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-[10px] text-center py-0.5 font-medium">New</span>
              </div>
            ))}

            {/* Add photo button */}
            {existingPhotos.length + newPhotos.length < 10 && (
              <label className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                <span className="text-2xl text-gray-400">+</span>
                <span className="text-xs text-gray-400 mt-0.5">Add Photo</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoSelect} className="hidden" />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3">First photo will be the primary image. Hover to delete.</p>
        </section>

        {/* Messages */}
        {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">Business updated successfully!</div>}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 h-11 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</>
            ) : ('Save Changes →')}
          </button>
          <button type="button" onClick={() => router.push(`/businesses/${id}`)} className="h-11 px-6 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  )
}

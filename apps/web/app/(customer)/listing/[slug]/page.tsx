'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Phone, Navigation, Bookmark, Globe, Share2,
  MessageCircle, Clock, MapPin, Flag,
  Heart, Truck, BadgeCheck,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { RatingStars } from '@/components/shared/RatingStars'
import { EnquiryForm } from '@/components/listings/EnquiryForm'
import { PhotoGallery } from '@/components/listings/PhotoGallery'
import { LazyMapView } from '@/components/maps/LazyMapView'
import { ReviewsSection } from '@/components/listings/ReviewsSection'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BusinessDetail {
  id: string
  name: string
  slug?: string | null
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
  whatsapp: string | null
  address: string | null
  city: string | null
  lat?: number | null
  lng?: number | null
  verified: boolean
  rating_avg: number
  review_count: number
  status: string
  distance_m?: number | null
  business_photos: Array<{ id: string; url: string; is_primary: boolean; display_order: number }>
  business_hours: Array<{ day: number; open_time: string | null; close_time: string | null; is_closed: boolean }>
  business_services: Array<{ id: string; name: string; price: number | null }>
  categories: { id: string; name: string; slug: string; icon: string | null; color: string | null } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUUID(value: string): boolean {
  return UUID_V4_REGEX.test(value)
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getOpenStatus(hours: BusinessDetail['business_hours']): { status: 'open' | 'closed' | null; closesAt?: string } {
  if (!hours || hours.length === 0) return { status: null }
  const now = new Date()
  const today = hours.find((h) => h.day === now.getDay())
  if (!today || today.is_closed) return { status: 'closed' }
  if (!today.open_time || !today.close_time) return { status: null }
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  if (hhmm >= today.open_time && hhmm <= today.close_time) {
    return { status: 'open', closesAt: today.close_time }
  }
  return { status: 'closed' }
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ListingDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [business, setBusiness] = React.useState<BusinessDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saved, setSaved] = React.useState(false)
  const [showAllHours, setShowAllHours] = React.useState(false)
  const [showEnquiry, setShowEnquiry] = React.useState(false)
  const [mapError, setMapError] = React.useState(false)

  // Determine the URL identifier for this business (slug or fallback to id)
  const businessSlug = business?.slug ?? business?.id ?? slug

  React.useEffect(() => {
    // If the param is a UUID, fetch business by UUID and redirect to slug URL
    if (isUUID(slug)) {
      apiClient.get<{ data: BusinessDetail }>(`/businesses/${slug}`)
        .then((res) => {
          const biz = res.data.data
          if (biz.slug) {
            // Redirect to the slug-based URL (requirement 2.6)
            router.replace(`/listing/${biz.slug}`)
          } else {
            // Business has no slug — fallback to UUID URL (requirement 2.7)
            setBusiness(biz)
            setLoading(false)
          }
        })
        .catch(() => {
          setBusiness(null)
          setLoading(false)
        })
    } else {
      // Non-UUID: fetch business directly using slug (requirement 2.2)
      apiClient.get<{ data: BusinessDetail }>(`/businesses/${slug}`)
        .then((res) => setBusiness(res.data.data))
        .catch(() => setBusiness(null))
        .finally(() => setLoading(false))
    }

    // Check if business is already saved
    apiClient.get<{ data: Array<{ businesses: { id: string } }> }>('/user/saved')
      .then((res) => {
        const savedIds = (res.data.data ?? []).map((s: any) => s.businesses?.id).filter(Boolean)
        const businessId = slug // Will be checked with current param
        if (savedIds.includes(businessId)) {
          setSaved(true)
        }
      })
      .catch(() => {})
  }, [slug, router])

  // Update saved state when business loads (for UUID case where slug != id)
  React.useEffect(() => {
    if (!business) return
    apiClient.get<{ data: Array<{ businesses: { id: string } }> }>('/user/saved')
      .then((res) => {
        const savedIds = (res.data.data ?? []).map((s: any) => s.businesses?.id).filter(Boolean)
        if (savedIds.includes(business.id)) {
          setSaved(true)
        }
      })
      .catch(() => {})
  }, [business?.id])

  const recordLead = async (type: string) => {
    if (!business) return
    await apiClient.post(`/businesses/${business.id}/leads`, { type }).catch(() => {})
  }

  const handleCall = () => { recordLead('call'); if (business?.phone) window.open(`tel:${business.phone}`) }
  const handleDirections = () => { recordLead('direction'); if (business?.lat && business?.lng) { window.open(`https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`) } else { window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(business?.address ?? business?.name ?? '')}`) } }
  const handleWebsite = () => { recordLead('website'); if (business?.website) window.open(business.website, '_blank') }
  const handleWhatsApp = () => { recordLead('whatsapp'); if (business?.whatsapp) window.open(`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`) }

  const handleSave = async () => {
    if (saved || !business) return
    try {
      await apiClient.post('/user/saved', { business_id: business.id })
      setSaved(true)
      recordLead('save')
    } catch (err: any) {
      if (err?.response?.data?.error?.code === 'SAVE_LIMIT_REACHED') {
        alert('Save limit reached. Please remove some saved places to add more.')
      } else if (err?.response?.data?.error?.code === 'ALREADY_SAVED') {
        setSaved(true)
      }
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: business?.name, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <p className="text-lg font-semibold text-gray-900">Business not found</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Go back
        </button>
      </div>
    )
  }

  const photos = [...business.business_photos].sort((a, b) => a.display_order - b.display_order)
  const { status: openStatus, closesAt } = getOpenStatus(business.business_hours)

  return (
    <div className="flex flex-col pb-24 bg-white min-h-dvh">
      {/* Full-width photo gallery */}
      <div className="relative">
        <PhotoGallery
          photos={photos}
          businessName={business.name}
          className="h-72 w-full"
        />

        {/* Top overlay buttons */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-gray-900" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className={cn(
                'w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm',
                saved ? 'bg-red-50' : 'bg-white/90'
              )}
              aria-label="Save"
            >
              <Heart className={cn('h-4 w-4', saved ? 'text-red-500 fill-red-500' : 'text-gray-900')} />
            </button>
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4 text-gray-900" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Name + badges */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{business.name}</h1>
            {business.verified && (
              <BadgeCheck className="h-5 w-5 text-primary flex-shrink-0" />
            )}
            {business.rating_avg >= 4.0 && business.review_count >= 5 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold ml-auto">
                Highly Rated
              </span>
            )}
          </div>

          {/* Rating + open status */}
          <div className="flex items-center gap-2 mt-2">
            <RatingStars rating={business.rating_avg} size="md" mode="display" />
            <span className="text-sm text-gray-500">({business.review_count})</span>
            {openStatus && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold',
                openStatus === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              )}>
                {openStatus === 'open' ? 'Open' : 'Closed'}
              </span>
            )}
            {closesAt && (
              <span className="text-xs text-gray-500">Closes {closesAt}</span>
            )}
          </div>

          {/* Category tags */}
          <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
            {business.categories && (
              <span>{business.categories.name}</span>
            )}
            <span>•</span>
            <span>₹</span>
            {business.distance_m && (
              <>
                <span>•</span>
                <span>{formatDistance(business.distance_m)}</span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCall}
            disabled={!business.phone}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Phone className="h-4 w-4 text-primary" />
            Call
          </button>
          <button
            onClick={handleDirections}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Navigation className="h-4 w-4 text-primary" />
            Directions
          </button>
          <button
            onClick={handleSave}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50',
              saved ? 'border-primary bg-blue-50 text-primary' : 'border-gray-200 text-gray-700'
            )}
          >
            <Bookmark className={cn('h-4 w-4', saved ? 'text-primary fill-primary' : 'text-primary')} />
            {saved ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={handleWebsite}
            disabled={!business.website}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Globe className="h-4 w-4 text-primary" />
            Website
          </button>
        </div>

        {/* Address card with map thumbnail */}
        {business.address && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            {business.lat && business.lng && !mapError ? (
              <LazyMapView
                markers={[{
                  id: business.id,
                  lat: business.lat,
                  lng: business.lng,
                  name: business.name,
                  rating: business.rating_avg,
                }]}
                center={{ lat: business.lat, lng: business.lng }}
                zoom={15}
                onError={() => setMapError(true)}
                className="h-24 rounded-none"
              />
            ) : (
              <div className="h-24 bg-blue-50 flex items-center justify-center text-gray-400 text-sm">
                Map not available
              </div>
            )}
            <div className="p-3 flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-900">{business.address}{business.city ? `, ${business.city}` : ''}</p>
                <button
                  onClick={handleDirections}
                  className="text-xs text-primary font-medium mt-1"
                >
                  Get directions →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info chips row */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {business.distance_m && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-gray-700 font-medium">{formatDistance(business.distance_m)}</span>
            </div>
          )}
          {business.distance_m && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0">
              <Truck className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs text-gray-700 font-medium">🚶 {Math.round(business.distance_m / 80)} min walk</span>
            </div>
          )}
          {business.business_services.length > 0 && (() => {
            const prices = business.business_services.filter(s => s.price != null).map(s => s.price!)
            if (prices.length === 0) return null
            const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
            return (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0">
                <span className="text-xs">₹</span>
                <span className="text-xs text-gray-700 font-medium">₹{avg} avg</span>
              </div>
            )
          })()}
        </div>

        {/* About section */}
        {business.description && (
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-2">About</h2>
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{business.description}</p>
            <button className="text-xs text-primary font-medium mt-1">Show more</button>
          </div>
        )}

        {/* Popular Items */}
        {business.business_services.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Popular Items</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {business.business_services.slice(0, 6).map((service) => (
                <div key={service.id} className="flex-shrink-0 w-28">
                  <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-orange-50 to-yellow-50 border border-gray-100 flex items-center justify-center">
                    <span className="text-3xl">🍽️</span>
                  </div>
                  <p className="text-xs font-medium text-gray-900 mt-1.5 truncate">{service.name}</p>
                  {service.price && (
                    <p className="text-[11px] text-gray-500">₹{service.price}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hours */}
        {business.business_hours.length > 0 && (
          <div>
            <button
              onClick={() => setShowAllHours(!showAllHours)}
              className="flex items-center gap-2 text-sm font-bold text-gray-900"
            >
              <Clock className="h-4 w-4 text-gray-600" /> Hours of Operation
            </button>
            {showAllHours && (
              <div className="mt-2 space-y-1.5 pl-6">
                {DAY_NAMES.map((name, i) => {
                  const h = business.business_hours.find((x) => x.day === i)
                  return (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-500">{name}</span>
                      <span className="text-gray-900 font-medium">
                        {h?.is_closed ? 'Closed' : h?.open_time && h?.close_time ? `${h.open_time} – ${h.close_time}` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Reviews section */}
        <ReviewsSection businessId={business.id} reviewCount={business.review_count} slug={businessSlug} />

        {/* WhatsApp */}
        {business.whatsapp && (
          <button
            onClick={handleWhatsApp}
            className="w-full h-11 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700 flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
          >
            <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
          </button>
        )}

        {/* Report */}
        <button className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-500 mt-2" aria-label="Report this listing">
          <Flag className="h-3.5 w-3.5" /> Report this listing
        </button>
      </div>

      {/* Bottom sticky bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3 safe-bottom">
        <div className="flex-1">
          {business.business_services.length > 0 && (() => {
            const prices = business.business_services.filter(s => s.price != null).map(s => s.price!)
            if (prices.length === 0) return null
            const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
            return (
              <>
                <p className="text-xs text-gray-500">Avg. cost</p>
                <p className="text-sm font-bold text-gray-900">₹{avg} per item</p>
              </>
            )
          })()}
        </div>
        <button
          onClick={() => setShowEnquiry(true)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Enquire
        </button>
        <button
          onClick={handleDirections}
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Directions
        </button>
      </div>

      {/* Enquiry Form Dialog */}
      {showEnquiry && business && (
        <EnquiryForm
          businessId={business.id}
          businessName={business.name}
          onClose={() => setShowEnquiry(false)}
        />
      )}
    </div>
  )
}

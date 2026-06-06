import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { optionalAuth } from '../middleware/auth'
import { searchLimiter } from '../middleware/rateLimit'
import { sendSuccess, sendError } from '../utils/response'
import { enforceRadius } from '../utils/search'
import { isUUID } from '../utils/identifiers'

const router = Router()

/**
 * GET /businesses/search
 *
 * Full-text + geospatial business search backed by the `search_businesses`
 * PostgreSQL function (migration 006_search_function.sql).
 *
 * Query params:
 *   q            - free-text search query (optional)
 *   lat          - user latitude (required)
 *   lng          - user longitude (required)
 *   radius       - search radius in km (default 5, max 10 free / 50 Plus)
 *   category_id  - filter by category UUID (optional)
 *   sort         - 'relevance' | 'distance' | 'rating' | 'newest' (default 'relevance')
 *   min_rating   - minimum average rating filter (optional)
 *   page         - page number, 1-based (default 1)
 *   limit        - results per page, max 50 (default 20)
 *
 * Requirements: 3.1, 3.2, 3.3, 3.7, 3.8, 3.11
 */
router.get('/search', searchLimiter, optionalAuth, async (req, res) => {
  const {
    q = '',
    lat,
    lng,
    radius = '5',
    category_id,
    category,
    sort = 'relevance',
    min_rating,
    page = '1',
    limit = '20',
  } = req.query

  // lat and lng are required
  if (!lat || !lng) {
    return sendError(res, 'VALIDATION_ERROR', 'lat and lng are required', 400)
  }

  const latNum = parseFloat(lat as string)
  const lngNum = parseFloat(lng as string)

  if (isNaN(latNum) || isNaN(lngNum)) {
    return sendError(res, 'VALIDATION_ERROR', 'lat and lng must be numbers', 400)
  }

  const pageNum = Math.max(1, parseInt(page as string) || 1)
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20))
  const offset = (pageNum - 1) * limitNum

  // Determine Plus status for the authenticated user (if any)
  let isPlus = false
  if (req.user) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('plus_expires_at')
      .eq('id', req.user.id)
      .single()
    isPlus = !!(data?.plus_expires_at && new Date(data.plus_expires_at) > new Date())
  }

  const radiusKm = enforceRadius(parseFloat(radius as string) || 5, isPlus)

  // Resolve category slug to UUID if category_id not provided directly
  let resolvedCategoryId = (category_id as string) || null
  if (!resolvedCategoryId && category) {
    const { data: catData } = await supabaseAdmin
      .from('categories')
      .select('id')
      .or(`slug.eq.${category},name.ilike.%${category}%`)
      .limit(1)
      .single()
    if (catData?.id) {
      resolvedCategoryId = catData.id
    }
  }

  // Execute the search via the PostgreSQL RPC function
  const { data, error } = await supabaseAdmin.rpc('search_businesses', {
    search_query: (q as string).trim(),
    user_lat: latNum,
    user_lng: lngNum,
    radius_meters: radiusKm * 1000,
    filter_category_id: resolvedCategoryId,
    filter_min_rating: min_rating ? parseFloat(min_rating as string) : null,
    sort_by: sort as string,
    page_limit: limitNum,
    page_offset: offset,
  })

  if (error) {
    return sendError(res, 'SEARCH_FAILED', error.message, 500)
  }

  const rows = data ?? []
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0

  // Record search history for authenticated users with a non-empty query
  if (req.user && (q as string).trim()) {
    await supabaseAdmin.from('search_history').insert({
      user_id: req.user.id,
      query: (q as string).trim(),
      lat: latNum,
      lng: lngNum,
    })
  }

  // Strip the internal total_count field from each result row
  let results = rows.map(({ total_count, ...b }: { total_count: unknown; [key: string]: unknown }) => b)

  // Fetch active offers for the result businesses
  const businessIds = results.map((b: any) => b.id).filter(Boolean)
  let offersMap: Record<string, Array<{ title: string; valid_until: string | null }>> = {}
  if (businessIds.length > 0) {
    const { data: offersData } = await supabaseAdmin
      .from('offers')
      .select('business_id, title, valid_until')
      .in('business_id', businessIds)
      .eq('is_active', true)
    if (offersData) {
      for (const offer of offersData) {
        if (!offersMap[offer.business_id]) offersMap[offer.business_id] = []
        offersMap[offer.business_id].push({ title: offer.title, valid_until: offer.valid_until })
      }
    }
  }

  // Attach offers and is_sponsored to results, then sort sponsored to top
  results = results.map((b: any) => ({
    ...b,
    offers: offersMap[b.id] ?? null,
    is_sponsored: b.is_sponsored ?? false,
  }))

  // Move sponsored businesses to the top while preserving relative order
  const sponsored = results.filter((b: any) => b.is_sponsored)
  const nonSponsored = results.filter((b: any) => !b.is_sponsored)
  results = [...sponsored, ...nonSponsored]

  sendSuccess(res, results, {
    page: pageNum,
    pageSize: limitNum,
    total,
    hasNextPage: offset + limitNum < total,
  })
})

/**
 * GET /businesses/:id
 *
 * Returns a single business with all related data (photos, hours, services, category).
 * Supports lookup by UUID (id column) or slug (slug column).
 * Non-active businesses are hidden from non-owners (returns 404).
 *
 * Requirements: 2.2, 2.4, 2.8, 4.1, 4.2, 4.5
 */
router.get('/:id', optionalAuth, async (req, res) => {
  const { id } = req.params
  const column = isUUID(id) ? 'id' : 'slug'

  const { data: business, error } = await supabaseAdmin
    .from('businesses')
    .select(`
      *,
      business_photos(*),
      business_hours(*),
      business_services(*),
      categories(id, name, slug, icon, color)
    `)
    .eq(column, id)
    .single()

  if (error || !business) return sendError(res, 'NOT_FOUND', 'Business not found', 404)

  // Non-active businesses only visible to owner or admin
  if (business.status !== 'active') {
    const isOwner = req.user?.id === business.owner_id
    const isAdmin = false // check via DB if needed
    if (!isOwner && !isAdmin) return sendError(res, 'NOT_FOUND', 'Business not found', 404)
  }

  // Extract lat/lng from PostGIS location column
  let lat: number | null = null
  let lng: number | null = null
  if (business.location) {
    const loc = business.location as any
    if (typeof loc === 'string') {
      // Check for WKT format: POINT(lng lat)
      const wktMatch = loc.match(/POINT\(([^ ]+) ([^ ]+)\)/)
      if (wktMatch) {
        lng = parseFloat(wktMatch[1])
        lat = parseFloat(wktMatch[2])
      } else if (/^[0-9a-fA-F]+$/.test(loc) && loc.length >= 42) {
        // WKB hex format (EWKB with SRID): parse lng/lat as IEEE 754 doubles
        // EWKB structure: byte order (2) + type (8) + SRID (8) + X/lng (16) + Y/lat (16) = 50 hex chars minimum
        try {
          const buf = Buffer.from(loc, 'hex')
          // Byte 0: endianness (01 = little-endian)
          const le = buf[0] === 1
          // For EWKB with SRID (type has 0x20000000 flag), coords start at offset 21 bytes
          // Standard EWKB: 1 (endian) + 4 (type) + 4 (srid) + 8 (x) + 8 (y) = 25 bytes
          const offset = buf.length >= 25 ? 9 : 5 // skip endian(1) + type(4) + srid(4) OR endian(1) + type(4)
          if (le) {
            lng = buf.readDoubleLE(offset)
            lat = buf.readDoubleLE(offset + 8)
          } else {
            lng = buf.readDoubleBE(offset)
            lat = buf.readDoubleBE(offset + 8)
          }
        } catch {
          // Failed to parse WKB — leave lat/lng as null
        }
      }
    } else if (loc?.coordinates) {
      // GeoJSON format: [lng, lat]
      lng = loc.coordinates[0]
      lat = loc.coordinates[1]
    }
  }

  sendSuccess(res, { ...business, lat, lng })
})

/**
 * POST /businesses/:id/leads
 *
 * Records a lead interaction (call, direction, whatsapp, save, view, website)
 * for a business. Works for both authenticated and anonymous users.
 *
 * Requirements: 4.4, 14.4
 */
router.post('/:id/leads', optionalAuth, async (req, res) => {
  const { id } = req.params
  const { type, metadata } = req.body
  const validTypes = ['call', 'direction', 'whatsapp', 'save', 'view', 'website', 'enquiry']

  if (!type || !validTypes.includes(type)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid lead type', 400)
  }

  // Enquiry type requires metadata with at least name and phone
  if (type === 'enquiry') {
    if (!metadata || !metadata.name || !metadata.phone) {
      return sendError(res, 'VALIDATION_ERROR', 'Enquiry requires name and phone in metadata', 400)
    }
  }

  // Check business exists and is active
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id, status')
    .eq('id', id)
    .single()

  if (!business || business.status !== 'active') {
    return sendError(res, 'NOT_FOUND', 'Business not found', 404)
  }

  await supabaseAdmin.from('leads').insert({
    business_id: id,
    type,
    user_id: req.user?.id ?? null,
    metadata: metadata ?? null,
  })

  sendSuccess(res, { recorded: true })
})

export default router

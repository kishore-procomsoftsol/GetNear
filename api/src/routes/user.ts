import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { sendSuccess, sendError } from '../utils/response'
import { PLUS_LIMITS } from '@getnear/config'
import { cacheService } from '../lib/placesCache'
import * as googlePlaces from '../lib/googlePlaces'

const router = Router()

// All user routes require authentication
router.use(authenticate)

// ---------------------------------------------------------------------------
// Helper: check if user has active Plus subscription
// ---------------------------------------------------------------------------

async function isUserPlus(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('plus_expires_at')
    .eq('id', userId)
    .single()
  return !!(data?.plus_expires_at && new Date(data.plus_expires_at) > new Date())
}

// ---------------------------------------------------------------------------
// Saved Places
// ---------------------------------------------------------------------------

/**
 * GET /user/saved
 *
 * Returns the authenticated user's saved places with resolved place data
 * from cache or Google Places API.
 *
 * Requirements: 6.1, 6.2
 */
router.get('/saved', async (req, res) => {
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('saved_places')
    .select('id, place_id, collection_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return sendError(res, 'FETCH_FAILED', error.message, 500)
  }

  const savedEntries = data ?? []

  // Resolve Place IDs to display data via cache/Google
  const results = await Promise.all(
    savedEntries.map(async (entry) => {
      const cacheKey = cacheService.buildKey('details', { placeId: entry.place_id })
      const cached = await cacheService.get(cacheKey)

      if (cached) {
        const placeData = cached.response_data as googlePlaces.PlaceDetailsResult
        return {
          id: entry.id,
          place_id: entry.place_id,
          collection_id: entry.collection_id,
          created_at: entry.created_at,
          place: placeData,
        }
      }

      // Cache miss — fetch from Google
      try {
        const fields = [
          'place_id',
          'name',
          'formatted_address',
          'rating',
          'user_ratings_total',
          'photos',
          'business_status',
          'types',
          'geometry',
        ]
        const details = await googlePlaces.placeDetails(entry.place_id, fields)

        // Store in cache for future lookups
        await cacheService.set(cacheKey, entry.place_id, 'details', details)

        return {
          id: entry.id,
          place_id: entry.place_id,
          collection_id: entry.collection_id,
          created_at: entry.created_at,
          place: details,
        }
      } catch {
        // If Google lookup fails, return entry without place data
        return {
          id: entry.id,
          place_id: entry.place_id,
          collection_id: entry.collection_id,
          created_at: entry.created_at,
          place: null,
        }
      }
    })
  )

  sendSuccess(res, results)
})

/**
 * POST /user/saved
 *
 * Saves a place for the authenticated user using Google Place ID.
 * Enforces 10-item free-tier limit (403 SAVE_LIMIT_REACHED).
 * Returns 409 ALREADY_SAVED on duplicate.
 *
 * Requirements: 6.1, 6.4, 6.5
 */
router.post('/saved', async (req, res) => {
  const { placeId, collection_id } = req.body
  const userId = req.user!.id

  if (!placeId || typeof placeId !== 'string' || !placeId.trim()) {
    return sendError(res, 'VALIDATION_ERROR', 'placeId is required', 400)
  }

  // Check for duplicate (unique constraint on user_id + place_id)
  const { data: existing } = await supabaseAdmin
    .from('saved_places')
    .select('id')
    .eq('user_id', userId)
    .eq('place_id', placeId)
    .maybeSingle()

  if (existing) {
    return sendError(res, 'ALREADY_SAVED', 'Place already saved', 409)
  }

  // Enforce free-tier limit
  const plus = await isUserPlus(userId)
  if (!plus) {
    const { count } = await supabaseAdmin
      .from('saved_places')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if ((count ?? 0) >= PLUS_LIMITS.free.savedPlaces) {
      return sendError(
        res,
        'SAVE_LIMIT_REACHED',
        `Free tier allows up to ${PLUS_LIMITS.free.savedPlaces} saved places. Upgrade to GetNear Plus for unlimited saves.`,
        403
      )
    }
  }

  const { data, error } = await supabaseAdmin
    .from('saved_places')
    .insert({
      user_id: userId,
      place_id: placeId,
      collection_id: collection_id ?? null,
    })
    .select()
    .single()

  if (error) {
    // Handle unique constraint violation at DB level as fallback
    if (error.code === '23505') {
      return sendError(res, 'ALREADY_SAVED', 'Place already saved', 409)
    }
    return sendError(res, 'SAVE_FAILED', error.message, 500)
  }

  sendSuccess(res, data, undefined, 201)
})

/**
 * DELETE /user/saved/:placeId
 *
 * Removes a saved place by its Google Place ID. Verifies ownership before deletion.
 *
 * Requirements: 6.3
 */
router.delete('/saved/:placeId', async (req, res) => {
  const { placeId } = req.params
  const userId = req.user!.id

  // Verify ownership by place_id
  const { data: existing } = await supabaseAdmin
    .from('saved_places')
    .select('id')
    .eq('place_id', placeId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    return sendError(res, 'NOT_FOUND', 'Saved place not found', 404)
  }

  const { error } = await supabaseAdmin
    .from('saved_places')
    .delete()
    .eq('place_id', placeId)
    .eq('user_id', userId)

  if (error) {
    return sendError(res, 'DELETE_FAILED', error.message, 500)
  }

  sendSuccess(res, { deleted: true })
})

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

/**
 * GET /user/collections
 *
 * Returns the authenticated user's collections with item counts.
 *
 * Requirements: 5.6
 */
router.get('/collections', async (req, res) => {
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('collections')
    .select(`
      id,
      name,
      icon,
      created_at,
      saved_places (count)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    return sendError(res, 'FETCH_FAILED', error.message, 500)
  }

  // Normalize the count from the nested array
  const results = (data ?? []).map((col: any) => ({
    ...col,
    item_count: Array.isArray(col.saved_places) ? col.saved_places[0]?.count ?? 0 : 0,
    saved_places: undefined,
  }))

  sendSuccess(res, results)
})

/**
 * POST /user/collections
 *
 * Creates a new collection.
 * Enforces 2-collection free-tier limit (403 COLLECTION_LIMIT_REACHED).
 *
 * Requirements: 5.6, 5.9, 16.1
 */
router.post('/collections', async (req, res) => {
  const { name } = req.body
  const userId = req.user!.id

  if (!name || typeof name !== 'string' || !name.trim()) {
    return sendError(res, 'VALIDATION_ERROR', 'name is required', 400)
  }

  // Enforce free-tier limit
  const plus = await isUserPlus(userId)
  if (!plus) {
    const { count } = await supabaseAdmin
      .from('collections')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if ((count ?? 0) >= PLUS_LIMITS.free.collections) {
      return sendError(
        res,
        'COLLECTION_LIMIT_REACHED',
        `Free tier allows up to ${PLUS_LIMITS.free.collections} collections. Upgrade to GetNear Plus for unlimited collections.`,
        403
      )
    }
  }

  const { data, error } = await supabaseAdmin
    .from('collections')
    .insert({
      user_id: userId,
      name: name.trim(),
    })
    .select()
    .single()

  if (error) {
    return sendError(res, 'CREATE_FAILED', error.message, 500)
  }

  sendSuccess(res, data, undefined, 201)
})

/**
 * PUT /user/collections/:id
 *
 * Renames a collection. Verifies ownership.
 *
 * Requirements: 5.7
 */
router.put('/collections/:id', async (req, res) => {
  const { id } = req.params
  const { name } = req.body
  const userId = req.user!.id

  if (!name || typeof name !== 'string' || !name.trim()) {
    return sendError(res, 'VALIDATION_ERROR', 'name is required', 400)
  }

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('collections')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    return sendError(res, 'NOT_FOUND', 'Collection not found', 404)
  }

  const { data, error } = await supabaseAdmin
    .from('collections')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    return sendError(res, 'UPDATE_FAILED', error.message, 500)
  }

  sendSuccess(res, data)
})

/**
 * DELETE /user/collections/:id
 *
 * Deletes a collection and reassigns its saved_places to null collection_id.
 * Verifies ownership.
 *
 * Requirements: 5.8
 */
router.delete('/collections/:id', async (req, res) => {
  const { id } = req.params
  const userId = req.user!.id

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('collections')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    return sendError(res, 'NOT_FOUND', 'Collection not found', 404)
  }

  // Reassign saved_places in this collection to null collection_id
  await supabaseAdmin
    .from('saved_places')
    .update({ collection_id: null })
    .eq('collection_id', id)
    .eq('user_id', userId)

  // Delete the collection
  const { error } = await supabaseAdmin
    .from('collections')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    return sendError(res, 'DELETE_FAILED', error.message, 500)
  }

  sendSuccess(res, { deleted: true })
})

// ---------------------------------------------------------------------------
// Recently Viewed
// ---------------------------------------------------------------------------

/**
 * GET /user/recently-viewed
 *
 * Returns businesses the user has recently viewed (based on leads with type 'view').
 * Deduplicates by business_id and returns the most recent view per business.
 */
router.get('/recently-viewed', async (req, res) => {
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('leads')
    .select(`
      id,
      business_id,
      created_at,
      businesses (
        id,
        name,
        slug,
        rating_avg,
        review_count,
        address,
        city,
        categories (
          id,
          name,
          icon,
          color
        ),
        business_photos (
          id,
          url,
          is_primary
        )
      )
    `)
    .eq('user_id', userId)
    .eq('type', 'view')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return sendError(res, 'FETCH_FAILED', error.message, 500)
  }

  // Deduplicate by business_id — keep only most recent view per business
  const seen = new Set<string>()
  const unique = (data ?? []).filter((entry: any) => {
    if (seen.has(entry.business_id)) return false
    seen.add(entry.business_id)
    return true
  })

  sendSuccess(res, unique)
})

// ---------------------------------------------------------------------------
// User Reviews
// ---------------------------------------------------------------------------

/**
 * GET /user/reviews
 *
 * Returns the authenticated user's approved reviews with joined business data.
 */
router.get('/reviews', async (req, res) => {
  const userId = req.user!.id

  const { data, error, count } = await supabaseAdmin
    .from('reviews')
    .select(`
      id,
      rating,
      text,
      status,
      created_at,
      businesses (
        id,
        name,
        slug
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return sendError(res, 'FETCH_FAILED', error.message, 500)
  }

  sendSuccess(res, data ?? [], { page: 1, pageSize: 50, total: count ?? 0, hasNextPage: false })
})

// ---------------------------------------------------------------------------
// User Profile (Task 11.1)
// ---------------------------------------------------------------------------

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
  email: z.string().email().optional(),
})

/**
 * GET /user/profile
 *
 * Returns the authenticated user's profile row.
 *
 * Requirements: 6.9
 */
router.get('/profile', async (req, res) => {
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, phone, avatar_url, role, plus_expires_at, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return sendError(res, 'NOT_FOUND', 'User not found', 404)
  }

  sendSuccess(res, data)
})

/**
 * PUT /user/profile
 *
 * Updates the authenticated user's profile (name, avatar_url, email).
 * Validates with Zod via the validate middleware.
 *
 * Requirements: 6.9
 */
router.put('/profile', validate(updateProfileSchema), async (req, res) => {
  const userId = req.user!.id
  const updates = req.body as z.infer<typeof updateProfileSchema>

  // Nothing to update
  if (Object.keys(updates).length === 0) {
    return sendError(res, 'VALIDATION_ERROR', 'At least one field must be provided', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id, name, email, phone, avatar_url, role, plus_expires_at, created_at, updated_at')
    .single()

  if (error) {
    return sendError(res, 'UPDATE_FAILED', error.message, 500)
  }

  sendSuccess(res, data)
})

export default router

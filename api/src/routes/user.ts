import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { sendSuccess, sendError } from '../utils/response'
import { PLUS_LIMITS } from '@getnear/config'

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
 * Returns the authenticated user's saved places with joined business data.
 * Supports sort query param: recently_added | nearest | rating
 *
 * Requirements: 5.1, 5.5
 */
router.get('/saved', async (req, res) => {
  const { sort = 'recently_added', lat, lng } = req.query
  const userId = req.user!.id

  let query = supabaseAdmin
    .from('saved_places')
    .select(`
      id,
      collection_id,
      created_at,
      businesses (
        id,
        name,
        slug,
        description,
        rating_avg,
        review_count,
        address,
        city,
        status,
        business_photos (
          id,
          url,
          is_primary
        ),
        categories (
          id,
          name,
          slug,
          icon,
          color
        )
      )
    `)
    .eq('user_id', userId)

  if (sort === 'rating') {
    // Sort by business rating descending — done client-side after fetch
    // since Supabase doesn't support ordering by joined columns directly
  }

  const { data, error } = await query.order('created_at', { ascending: sort !== 'recently_added' ? true : false })

  if (error) {
    return sendError(res, 'FETCH_FAILED', error.message, 500)
  }

  let results = data ?? []

  // Apply rating sort post-fetch
  if (sort === 'rating') {
    results = results.sort((a: any, b: any) => {
      const ratingA = (a.businesses as any)?.rating_avg ?? 0
      const ratingB = (b.businesses as any)?.rating_avg ?? 0
      return ratingB - ratingA
    })
  }

  // Apply nearest sort if lat/lng provided
  if (sort === 'nearest' && lat && lng) {
    const userLat = parseFloat(lat as string)
    const userLng = parseFloat(lng as string)
    if (!isNaN(userLat) && !isNaN(userLng)) {
      results = results.sort((a: any, b: any) => {
        const bA = a.businesses as any
        const bB = b.businesses as any
        const distA = bA ? Math.hypot(bA.lat - userLat, bA.lng - userLng) : Infinity
        const distB = bB ? Math.hypot(bB.lat - userLat, bB.lng - userLng) : Infinity
        return distA - distB
      })
    }
  }

  sendSuccess(res, results)
})

/**
 * POST /user/saved
 *
 * Saves a business for the authenticated user.
 * Enforces 10-item free-tier limit (403 SAVE_LIMIT_REACHED).
 * Returns 409 ALREADY_SAVED on duplicate.
 *
 * Requirements: 5.1, 5.5, 5.10, 16.1
 */
router.post('/saved', async (req, res) => {
  const { business_id, collection_id } = req.body
  const userId = req.user!.id

  if (!business_id) {
    return sendError(res, 'VALIDATION_ERROR', 'business_id is required', 400)
  }

  // Check for duplicate
  const { data: existing } = await supabaseAdmin
    .from('saved_places')
    .select('id')
    .eq('user_id', userId)
    .eq('business_id', business_id)
    .maybeSingle()

  if (existing) {
    return sendError(res, 'ALREADY_SAVED', 'Business is already saved', 409)
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
      business_id,
      collection_id: collection_id ?? null,
    })
    .select()
    .single()

  if (error) {
    return sendError(res, 'SAVE_FAILED', error.message, 500)
  }

  sendSuccess(res, data, undefined, 201)
})

/**
 * DELETE /user/saved/:id
 *
 * Removes a saved place. Verifies ownership before deletion.
 *
 * Requirements: 5.5
 */
router.delete('/saved/:id', async (req, res) => {
  const { id } = req.params
  const userId = req.user!.id

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('saved_places')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    return sendError(res, 'NOT_FOUND', 'Saved place not found', 404)
  }

  const { error } = await supabaseAdmin
    .from('saved_places')
    .delete()
    .eq('id', id)
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

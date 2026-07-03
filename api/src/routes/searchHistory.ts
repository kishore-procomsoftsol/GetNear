import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { authenticate } from '../middleware/auth'
import { sendSuccess, sendError } from '../utils/response'

const router = Router()
router.use(authenticate)

/**
 * POST /user/search-history
 * Records a new search history entry with 60-second deduplication.
 * If the same query text was recorded within the last 60 seconds, skip insertion.
 * Requirements: 7.1, 7.4
 */
router.post('/', async (req, res) => {
  const userId = req.user!.id
  const { query, lat, lng } = req.body

  if (!query || typeof query !== 'string' || !query.trim()) {
    return sendError(res, 'VALIDATION_ERROR', 'Query text is required', 400)
  }

  const trimmedQuery = query.trim()

  // Deduplication: check if same query was recorded within the last 60 seconds
  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString()

  const { data: existing } = await supabaseAdmin
    .from('search_history')
    .select('id')
    .eq('user_id', userId)
    .eq('query', trimmedQuery)
    .gte('created_at', sixtySecondsAgo)
    .limit(1)

  if (existing && existing.length > 0) {
    // Duplicate within 60 seconds — skip insertion
    return sendSuccess(res, { recorded: false, reason: 'duplicate' })
  }

  const { error } = await supabaseAdmin
    .from('search_history')
    .insert({
      user_id: userId,
      query: trimmedQuery,
      lat: lat ?? null,
      lng: lng ?? null,
    })

  if (error) return sendError(res, 'INSERT_FAILED', error.message, 500)

  sendSuccess(res, { recorded: true })
})

/**
 * GET /user/search-history
 * Returns user's search history ordered by created_at DESC, max 50 entries.
 * Requirements: 7.2
 */
router.get('/', async (req, res) => {
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('search_history')
    .select('id, query, lat, lng, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500)

  sendSuccess(res, data ?? [])
})

/**
 * DELETE /user/search-history
 * Clears all search history for the user.
 * Requirements: 7.3
 */
router.delete('/', async (req, res) => {
  const userId = req.user!.id

  const { error } = await supabaseAdmin
    .from('search_history')
    .delete()
    .eq('user_id', userId)

  if (error) return sendError(res, 'DELETE_FAILED', error.message, 500)

  sendSuccess(res, { cleared: true })
})

export default router

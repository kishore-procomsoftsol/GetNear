import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { authenticate } from '../middleware/auth'
import { sendSuccess, sendError } from '../utils/response'

const router = Router()
router.use(authenticate)

/**
 * GET /user/search-history
 * Returns user's search history ordered by created_at DESC.
 * Requirements: 3.8
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
 * Requirements: 3.8
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

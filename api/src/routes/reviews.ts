import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { authenticate, optionalAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { sendSuccess, sendError } from '../utils/response'
import { createReviewSchema } from '@getnear/validation'

const router = Router()

/**
 * POST /businesses/:id/reviews
 * Submits a review. Returns 409 on duplicate.
 * Requirements: 15.1, 15.2, 15.4
 */
router.post('/:id/reviews', authenticate, validate(createReviewSchema), async (req, res) => {
  const userId = req.user!.id
  const businessId = req.params.id
  const { rating, text, photos } = req.body

  // Check for duplicate
  const { data: existing } = await supabaseAdmin
    .from('reviews')
    .select('id')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .maybeSingle()

  if (existing) {
    return sendError(res, 'REVIEW_EXISTS', 'You have already reviewed this business', 409)
  }

  // Verify business exists and is active
  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('id, status')
    .eq('id', businessId)
    .single()

  if (!biz || biz.status !== 'active') {
    return sendError(res, 'NOT_FOUND', 'Business not found', 404)
  }

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .insert({
      user_id: userId,
      business_id: businessId,
      rating,
      text: text ?? null,
      photos: photos ?? null,
    })
    .select()
    .single()

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return sendError(res, 'REVIEW_EXISTS', 'You have already reviewed this business', 409)
    }
    return sendError(res, 'CREATE_FAILED', error.message, 500)
  }

  // Explicitly recalculate rating in case the trigger didn't fire
  await supabaseAdmin.rpc('recalculate_business_rating', { p_business_id: businessId }).catch(() => {})

  sendSuccess(res, data, undefined, 201)
})

/**
 * GET /businesses/:id/reviews
 * Paginated reviews list (20 per page).
 * Requirements: 15.3
 */
router.get('/:id/reviews', optionalAuth, async (req, res) => {
  const businessId = req.params.id
  const { page = '1', limit = '20' } = req.query
  const pageNum = Math.max(1, parseInt(page as string) || 1)
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20))
  const offset = (pageNum - 1) * limitNum

  const { data, error, count } = await supabaseAdmin
    .from('reviews')
    .select('*, users(id, name, avatar_url)', { count: 'exact' })
    .eq('business_id', businessId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(offset, offset + limitNum - 1)

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500)

  sendSuccess(res, data ?? [], {
    page: pageNum,
    pageSize: limitNum,
    total: count ?? 0,
    hasNextPage: offset + limitNum < (count ?? 0),
  })
})

export default router

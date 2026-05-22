import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { authenticate } from '../middleware/auth'
import { sendSuccess, sendError } from '../utils/response'

const router = Router()
router.use(authenticate)

/**
 * GET /user/notifications
 * Returns notifications ordered by created_at DESC.
 * Requirements: 14.2
 */
router.get('/', async (req, res) => {
  const userId = req.user!.id
  const { page = '1', limit = '20' } = req.query
  const pageNum = Math.max(1, parseInt(page as string) || 1)
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20))
  const offset = (pageNum - 1) * limitNum

  const { data, error, count } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
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

/**
 * PATCH /user/notifications/:id/read
 * Marks a single notification as read.
 * Requirements: 14.3
 */
router.patch('/:id/read', async (req, res) => {
  const userId = req.user!.id
  const { id } = req.params

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return sendError(res, 'UPDATE_FAILED', error.message, 500)

  sendSuccess(res, { marked_read: true })
})

/**
 * PATCH /user/notifications/read-all
 * Marks all notifications as read.
 * Requirements: 14.5
 */
router.patch('/read-all', async (req, res) => {
  const userId = req.user!.id

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) return sendError(res, 'UPDATE_FAILED', error.message, 500)

  sendSuccess(res, { marked_all_read: true })
})

export default router

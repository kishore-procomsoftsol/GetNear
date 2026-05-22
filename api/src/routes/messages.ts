import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { authenticate } from '../middleware/auth'
import { sendSuccess, sendError } from '../utils/response'

const router = Router()
router.use(authenticate)

/**
 * GET /user/messages
 * Returns thread list using canonical pair query.
 * Requirements: 13.1
 */
router.get('/', async (req, res) => {
  const userId = req.user!.id

  // Get distinct threads where user is sender or receiver
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('id, sender_id, receiver_id, business_id, text, is_read, created_at')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500)

  // Group into threads by the other user
  const threads = new Map<string, {
    thread_id: string
    other_user_id: string
    business_id: string | null
    last_message: string
    last_message_at: string
    unread_count: number
  }>()

  for (const msg of data ?? []) {
    const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
    const threadKey = [userId, otherUserId].sort().join(':')

    if (!threads.has(threadKey)) {
      threads.set(threadKey, {
        thread_id: threadKey,
        other_user_id: otherUserId,
        business_id: msg.business_id,
        last_message: msg.text,
        last_message_at: msg.created_at,
        unread_count: 0,
      })
    }

    // Count unread messages where user is receiver
    if (msg.receiver_id === userId && !msg.is_read) {
      threads.get(threadKey)!.unread_count++
    }
  }

  sendSuccess(res, Array.from(threads.values()))
})

/**
 * POST /user/messages
 * Sends a message. Delivered via Supabase Realtime.
 * Requirements: 13.2
 */
router.post('/', async (req, res) => {
  const userId = req.user!.id
  const { receiver_id, business_id, text } = req.body

  if (!receiver_id || !text?.trim()) {
    return sendError(res, 'VALIDATION_ERROR', 'receiver_id and text are required', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      sender_id: userId,
      receiver_id,
      business_id: business_id ?? null,
      text: text.trim(),
      is_read: false,
    })
    .select()
    .single()

  if (error) return sendError(res, 'SEND_FAILED', error.message, 500)

  sendSuccess(res, data, undefined, 201)
})

/**
 * PATCH /user/messages/thread/:threadId/read
 * Marks all unread messages in a thread as read.
 * Requirements: 13.3
 */
router.patch('/thread/:threadId/read', async (req, res) => {
  const userId = req.user!.id
  const { threadId } = req.params

  // threadId format: "userId1:userId2" (sorted)
  const parts = threadId.split(':')
  if (parts.length !== 2) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid thread ID', 400)
  }

  const otherUserId = parts[0] === userId ? parts[1] : parts[0]

  const { error } = await supabaseAdmin
    .from('messages')
    .update({ is_read: true })
    .eq('receiver_id', userId)
    .eq('sender_id', otherUserId)
    .eq('is_read', false)

  if (error) return sendError(res, 'UPDATE_FAILED', error.message, 500)

  sendSuccess(res, { marked_read: true })
})

export default router

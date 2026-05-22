import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { sendSuccess, sendError } from '../utils/response'
import { createBookingSchema } from '@getnear/validation'

const router = Router()
router.use(authenticate)

/**
 * GET /user/bookings
 * Returns bookings split into Upcoming and Past.
 * Requirements: 12.1, 12.6
 */
router.get('/', async (req, res) => {
  const userId = req.user!.id
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*, businesses(id, name, slug, business_photos(url, is_primary))')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500)

  const rows = data ?? []
  const upcoming = rows.filter((b) => b.date >= today && !['cancelled', 'completed', 'no_show'].includes(b.status))
  const past = rows.filter((b) => b.date < today || ['cancelled', 'completed', 'no_show'].includes(b.status))

  sendSuccess(res, { upcoming, past })
})

/**
 * POST /user/bookings
 * Creates a new booking with status=pending.
 * Requirements: 12.1, 12.2, 12.3
 */
router.post('/', validate(createBookingSchema), async (req, res) => {
  const userId = req.user!.id
  const { business_id, date, time, party_size, notes } = req.body

  // Verify business exists and is active
  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('id, status, owner_id')
    .eq('id', business_id)
    .single()

  if (!biz || biz.status !== 'active') {
    return sendError(res, 'NOT_FOUND', 'Business not found', 404)
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert({ user_id: userId, business_id, date, time, party_size: party_size ?? null, notes: notes ?? null, status: 'pending' })
    .select()
    .single()

  if (error) return sendError(res, 'CREATE_FAILED', error.message, 500)

  // Send notification to business owner
  await supabaseAdmin.from('notifications').insert({
    user_id: biz.owner_id,
    title: 'New Booking Request',
    body: `A customer has requested a booking for ${date} at ${time}.`,
    type: 'booking',
    data: { booking_id: data.id, business_id },
  })

  sendSuccess(res, data, undefined, 201)
})

/**
 * PATCH /user/bookings/:id/cancel
 * Cancels a booking (must be > 2 hours before booking time).
 * Requirements: 12.7
 */
router.patch('/:id/cancel', async (req, res) => {
  const userId = req.user!.id
  const { id } = req.params

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!booking) return sendError(res, 'NOT_FOUND', 'Booking not found', 404)

  if (booking.status === 'cancelled') {
    return sendError(res, 'ALREADY_CANCELLED', 'Booking is already cancelled', 400)
  }

  // Enforce 2-hour cancellation window
  const bookingDateTime = new Date(`${booking.date}T${booking.time}`)
  const now = new Date()
  const hoursUntil = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntil < 2) {
    return sendError(res, 'CANCELLATION_TOO_LATE', 'Cannot cancel within 2 hours of booking time', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return sendError(res, 'UPDATE_FAILED', error.message, 500)

  sendSuccess(res, data)
})

export default router

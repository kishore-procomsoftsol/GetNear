import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { validate } from '../middleware/validate'
import { sendSuccess, sendError } from '../utils/response'
import { createBusinessSchema, createOfferSchema } from '@getnear/validation'

const router = Router()
router.use(authenticate)
router.use(requireRole('business', 'admin', 'agent'))

// ---------------------------------------------------------------------------
// Helper: get the business owned by the current user
// ---------------------------------------------------------------------------
async function getOwnedBusiness(userId: string) {
  const { data } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .single()
  return data
}

// ---------------------------------------------------------------------------
// POST /businesses (Task 19.1)
// Creates a new business listing with status=pending
// Requirements: 7.3, 7.4, 7.6, 7.7, 7.8, 7.9, 7.12
// ---------------------------------------------------------------------------
router.post('/businesses', validate(createBusinessSchema), async (req, res) => {
  const userId = req.user!.id
  const { name, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, lat, lng, hours, services } = req.body

  // Create the business record
  const { data: business, error } = await supabaseAdmin
    .from('businesses')
    .insert({
      owner_id: userId,
      name,
      category_id,
      type,
      description: description ?? null,
      phone: phone ?? null,
      email: email ?? null,
      website: website ?? null,
      whatsapp: whatsapp ?? null,
      address,
      city,
      state: state ?? null,
      pin: pin ?? null,
      location: `POINT(${lng} ${lat})`,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return sendError(res, 'CREATE_FAILED', error.message, 500)

  // Insert business hours if provided
  if (hours?.length) {
    await supabaseAdmin.from('business_hours').insert(
      hours.map((h: any) => ({ business_id: business.id, day: h.day, open_time: h.open_time ?? null, close_time: h.close_time ?? null, is_closed: h.is_closed ?? false }))
    )
  }

  // Insert services if provided
  if (services?.length) {
    await supabaseAdmin.from('business_services').insert(
      services.map((s: any, i: number) => ({ business_id: business.id, name: s.name, price: s.price ?? null, description: s.description ?? null, display_order: s.display_order ?? i }))
    )
  }

  // Send notification to business owner
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    title: 'Business Submitted',
    body: `Your listing "${name}" has been submitted for review.`,
    type: 'system',
    data: { business_id: business.id },
  })

  sendSuccess(res, business, undefined, 201)
})

// ---------------------------------------------------------------------------
// GET /dashboard/stats (Task 20.1)
// Returns Views, Calls, Direction Requests, Saves for last 7 days
// Requirements: 8.1
// ---------------------------------------------------------------------------
router.get('/stats', async (req, res) => {
  const biz = await getOwnedBusiness(req.user!.id)
  if (!biz) return sendError(res, 'NOT_FOUND', 'No business found', 404)

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // Current period
  const { data: current } = await supabaseAdmin
    .from('leads')
    .select('type')
    .eq('business_id', biz.id)
    .gte('created_at', sevenDaysAgo)

  // Previous period
  const { data: previous } = await supabaseAdmin
    .from('leads')
    .select('type')
    .eq('business_id', biz.id)
    .gte('created_at', fourteenDaysAgo)
    .lt('created_at', sevenDaysAgo)

  const count = (arr: any[], type: string) => arr?.filter((l) => l.type === type).length ?? 0
  const pctChange = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100)

  const stats = {
    views: { count: count(current ?? [], 'view'), change: pctChange(count(current ?? [], 'view'), count(previous ?? [], 'view')) },
    calls: { count: count(current ?? [], 'call'), change: pctChange(count(current ?? [], 'call'), count(previous ?? [], 'call')) },
    directions: { count: count(current ?? [], 'direction'), change: pctChange(count(current ?? [], 'direction'), count(previous ?? [], 'direction')) },
    saves: { count: count(current ?? [], 'save'), change: pctChange(count(current ?? [], 'save'), count(previous ?? [], 'save')) },
  }

  sendSuccess(res, stats)
})

// ---------------------------------------------------------------------------
// GET /dashboard/leads (Task 20.1)
// Returns 10 most recent leads
// Requirements: 8.4
// ---------------------------------------------------------------------------
router.get('/leads', async (req, res) => {
  const biz = await getOwnedBusiness(req.user!.id)
  if (!biz) return sendError(res, 'NOT_FOUND', 'No business found', 404)

  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('id, type, created_at, user_id')
    .eq('business_id', biz.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500)
  sendSuccess(res, data ?? [])
})

// ---------------------------------------------------------------------------
// GET /dashboard/reviews (Task 20.1)
// Returns 5 most recent reviews
// Requirements: 8.5
// ---------------------------------------------------------------------------
router.get('/reviews', async (req, res) => {
  const biz = await getOwnedBusiness(req.user!.id)
  if (!biz) return sendError(res, 'NOT_FOUND', 'No business found', 404)

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('*, users(id, name, avatar_url)')
    .eq('business_id', biz.id)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500)
  sendSuccess(res, data ?? [])
})

// ---------------------------------------------------------------------------
// POST /dashboard/reviews/:id/reply (Task 20.1)
// Requirements: 8.6
// ---------------------------------------------------------------------------
router.post('/reviews/:id/reply', async (req, res) => {
  const { id } = req.params
  const { text } = req.body
  if (!text?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Reply text is required', 400)

  const { error } = await supabaseAdmin
    .from('reviews')
    .update({ reply_text: text.trim(), replied_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return sendError(res, 'UPDATE_FAILED', error.message, 500)
  sendSuccess(res, { replied: true })
})

// ---------------------------------------------------------------------------
// Offers CRUD (Task 21.1)
// Requirements: 8.7, 8.8
// ---------------------------------------------------------------------------
router.get('/offers', async (req, res) => {
  const biz = await getOwnedBusiness(req.user!.id)
  if (!biz) return sendError(res, 'NOT_FOUND', 'No business found', 404)

  const { data, error } = await supabaseAdmin
    .from('offers')
    .select('*')
    .eq('business_id', biz.id)
    .order('created_at', { ascending: false })

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500)
  sendSuccess(res, data ?? [])
})

router.post('/offers', validate(createOfferSchema), async (req, res) => {
  const biz = await getOwnedBusiness(req.user!.id)
  if (!biz) return sendError(res, 'NOT_FOUND', 'No business found', 404)

  const { title, description, valid_until, is_active } = req.body
  const { data, error } = await supabaseAdmin
    .from('offers')
    .insert({ business_id: biz.id, title, description: description ?? null, valid_until: valid_until ?? null, is_active: is_active ?? true })
    .select()
    .single()

  if (error) return sendError(res, 'CREATE_FAILED', error.message, 500)
  sendSuccess(res, data, undefined, 201)
})

router.put('/offers/:id', async (req, res) => {
  const { id } = req.params
  const { title, description, valid_until, is_active } = req.body

  const { data, error } = await supabaseAdmin
    .from('offers')
    .update({ title, description, valid_until, is_active })
    .eq('id', id)
    .select()
    .single()

  if (error) return sendError(res, 'UPDATE_FAILED', error.message, 500)
  sendSuccess(res, data)
})

router.delete('/offers/:id', async (req, res) => {
  const { error } = await supabaseAdmin.from('offers').delete().eq('id', req.params.id)
  if (error) return sendError(res, 'DELETE_FAILED', error.message, 500)
  sendSuccess(res, { deleted: true })
})

// ---------------------------------------------------------------------------
// Business Bookings (Task 23.1)
// Requirements: 12.4, 12.5
// ---------------------------------------------------------------------------
router.get('/bookings', async (req, res) => {
  const biz = await getOwnedBusiness(req.user!.id)
  if (!biz) return sendError(res, 'NOT_FOUND', 'No business found', 404)

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*, users(id, name, phone)')
    .eq('business_id', biz.id)
    .order('date', { ascending: true })

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500)
  sendSuccess(res, data ?? [])
})

router.patch('/bookings/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  const validStatuses = ['confirmed', 'completed', 'no_show']
  if (!status || !validStatuses.includes(status)) {
    return sendError(res, 'VALIDATION_ERROR', `Status must be one of: ${validStatuses.join(', ')}`, 400)
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return sendError(res, 'UPDATE_FAILED', error.message, 500)

  // Notify customer
  if (data) {
    await supabaseAdmin.from('notifications').insert({
      user_id: data.user_id,
      title: `Booking ${status}`,
      body: `Your booking has been ${status}.`,
      type: 'booking',
      data: { booking_id: id },
    })
  }

  sendSuccess(res, data)
})

// ---------------------------------------------------------------------------
// Photos Management
// ---------------------------------------------------------------------------

/**
 * GET /dashboard/photos
 * Returns all photos for the business.
 */
router.get('/photos', async (req, res) => {
  const biz = await getOwnedBusiness(req.user!.id)
  if (!biz) return sendError(res, 'NOT_FOUND', 'No business found', 404)

  const { data, error } = await supabaseAdmin
    .from('business_photos')
    .select('id, url, is_primary, created_at')
    .eq('business_id', biz.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500)
  sendSuccess(res, data ?? [])
})

/**
 * POST /dashboard/photos
 * Uploads photos (handled via S3 presigned or direct upload).
 * For now, accepts a JSON body with urls.
 */
router.post('/photos', async (req, res) => {
  const biz = await getOwnedBusiness(req.user!.id)
  if (!biz) return sendError(res, 'NOT_FOUND', 'No business found', 404)

  const { urls } = req.body
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return sendError(res, 'VALIDATION_ERROR', 'urls array is required', 400)
  }

  // Check if business has any photos (first upload becomes primary)
  const { count } = await supabaseAdmin
    .from('business_photos')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', biz.id)

  const rows = urls.map((url: string, i: number) => ({
    business_id: biz.id,
    url,
    is_primary: (count ?? 0) === 0 && i === 0,
  }))

  const { data, error } = await supabaseAdmin
    .from('business_photos')
    .insert(rows)
    .select()

  if (error) return sendError(res, 'CREATE_FAILED', error.message, 500)
  sendSuccess(res, data ?? [], undefined, 201)
})

/**
 * DELETE /dashboard/photos/:id
 * Deletes a photo.
 */
router.delete('/photos/:id', async (req, res) => {
  const biz = await getOwnedBusiness(req.user!.id)
  if (!biz) return sendError(res, 'NOT_FOUND', 'No business found', 404)

  const { error } = await supabaseAdmin
    .from('business_photos')
    .delete()
    .eq('id', req.params.id)
    .eq('business_id', biz.id)

  if (error) return sendError(res, 'DELETE_FAILED', error.message, 500)
  sendSuccess(res, { deleted: true })
})

/**
 * PATCH /dashboard/photos/:id/primary
 * Sets a photo as the primary photo.
 */
router.patch('/photos/:id/primary', async (req, res) => {
  const biz = await getOwnedBusiness(req.user!.id)
  if (!biz) return sendError(res, 'NOT_FOUND', 'No business found', 404)

  // Unset current primary
  await supabaseAdmin
    .from('business_photos')
    .update({ is_primary: false })
    .eq('business_id', biz.id)
    .eq('is_primary', true)

  // Set new primary
  const { error } = await supabaseAdmin
    .from('business_photos')
    .update({ is_primary: true })
    .eq('id', req.params.id)
    .eq('business_id', biz.id)

  if (error) return sendError(res, 'UPDATE_FAILED', error.message, 500)
  sendSuccess(res, { updated: true })
})

// ---------------------------------------------------------------------------
// Listing Management
// ---------------------------------------------------------------------------

/**
 * GET /dashboard/listing
 * Returns the full business listing for the owner.
 */
router.get('/listing', async (req, res) => {
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select(`
      id, name, slug, description, phone, email, website, whatsapp,
      address, city, state, pin, status, verified, rating_avg, review_count,
      category_id, type,
      categories (id, name, slug, icon),
      business_photos (id, url, is_primary),
      business_hours (day, open_time, close_time, is_closed),
      business_services (id, name, price, description, display_order)
    `)
    .eq('owner_id', userId)
    .limit(1)
    .single()

  if (error) return sendError(res, 'NOT_FOUND', 'No business found', 404)
  sendSuccess(res, data)
})

/**
 * PUT /dashboard/listing
 * Updates the business listing fields.
 */
router.put('/listing', async (req, res) => {
  const biz = await getOwnedBusiness(req.user!.id)
  if (!biz) return sendError(res, 'NOT_FOUND', 'No business found', 404)

  const { name, description, phone, email, website, whatsapp, address, city, state, pin } = req.body

  const updates: Record<string, any> = {}
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (phone !== undefined) updates.phone = phone
  if (email !== undefined) updates.email = email
  if (website !== undefined) updates.website = website
  if (whatsapp !== undefined) updates.whatsapp = whatsapp
  if (address !== undefined) updates.address = address
  if (city !== undefined) updates.city = city
  if (state !== undefined) updates.state = state
  if (pin !== undefined) updates.pin = pin

  if (Object.keys(updates).length === 0) {
    return sendError(res, 'VALIDATION_ERROR', 'At least one field must be provided', 400)
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('businesses')
    .update(updates)
    .eq('id', biz.id)
    .select()
    .single()

  if (error) return sendError(res, 'UPDATE_FAILED', error.message, 500)
  sendSuccess(res, data)
})

export default router

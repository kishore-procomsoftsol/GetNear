import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// Most routes require admin role — agent-accessible routes are marked individually
router.use((req: Request, res: Response, next) => {
  // Agent-accessible paths
  const agentPaths = ['/businesses', '/dashboard/stats', '/categories'];
  const isAgentPath = agentPaths.some(p => req.path.startsWith(p));

  if (isAgentPath) {
    // Allow admin and agent
    requireRole('admin', 'agent')(req, res, next);
  } else {
    // Admin only
    requireRole('admin')(req, res, next);
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  note?: string
) {
  await supabaseAdmin.from('admin_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    note: note ?? null,
  });
}

async function sendNotification(
  userId: string,
  title: string,
  body: string,
  type: string,
  data?: Record<string, unknown>
) {
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    title,
    body,
    type,
    data: data ?? null,
    is_read: false,
  });
}

// ─── Validation Schemas ─────────────────────────────────────────────────────

const rejectBusinessSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

const resolveReportSchema = z.object({
  action: z.enum(['dismiss', 'warn', 'suspend', 'remove']),
  note: z.string().min(1, 'Resolution note is required'),
});

const changeRoleSchema = z.object({
  role: z.enum(['customer', 'business', 'admin', 'agent']),
});

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  icon: z.string().optional(),
  color: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  display_order: z.number().int().min(0).default(0),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

const broadcastNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  target: z.enum(['all', 'by_city', 'by_role', 'individual']),
  city: z.string().optional(),
  role: z.enum(['customer', 'business', 'admin']).optional(),
  user_id: z.string().uuid().optional(),
  schedule_at: z.string().datetime().optional(),
});

// ─── 1. Dashboard Stats ─────────────────────────────────────────────────────
// GET /admin/dashboard/stats
// Requirements: 11.1

router.get('/dashboard/stats', async (req: Request, res: Response) => {
  try {
    const [businessesRes, usersRes, searchesRes, pendingRes] = await Promise.all([
      supabaseAdmin
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabaseAdmin
        .from('search_history')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]),
      supabaseAdmin
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ]);

    sendSuccess(res, {
      total_active_businesses: businessesRes.count ?? 0,
      total_users: usersRes.count ?? 0,
      searches_today: searchesRes.count ?? 0,
      pending_approvals: pendingRes.count ?? 0,
    });
  } catch {
    sendError(res, 'FETCH_FAILED', 'Failed to fetch dashboard stats', 500);
  }
});

// ─── 2. Businesses List ─────────────────────────────────────────────────────
// GET /admin/businesses
// Requirements: 9.1, 9.7

router.get('/businesses', async (req: Request, res: Response) => {
  const { status, category, city, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
  const offset = (pageNum - 1) * limitNum;

  let query = supabaseAdmin
    .from('businesses')
    .select('*, categories(name)', { count: 'exact' });

  if (status) query = query.eq('status', status as string);
  if (category) query = query.eq('category_id', category as string);
  if (city) query = query.ilike('city', `%${city}%`);

  query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500);

  sendSuccess(res, data ?? [], {
    page: pageNum,
    pageSize: limitNum,
    total: count ?? 0,
    hasNextPage: offset + limitNum < (count ?? 0),
  });
});

// ─── 3. Approve Business ────────────────────────────────────────────────────
// PUT /admin/businesses/:id/approve
// Requirements: 9.3, 9.11

router.put('/businesses/:id/approve', async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from('businesses')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status, owner_id')
    .single();

  if (error || !data) return sendError(res, 'NOT_FOUND', 'Business not found', 404);

  await logAdminAction(adminId, 'approve', 'business', id);
  await sendNotification(
    data.owner_id,
    'Business Approved',
    'Your business listing has been approved and is now live.',
    'system',
    { business_id: id }
  );

  sendSuccess(res, { id: data.id, status: data.status });
});

// ─── 4. Reject Business ─────────────────────────────────────────────────────
// PUT /admin/businesses/:id/reject
// Requirements: 9.4, 9.11

router.put('/businesses/:id/reject', async (req: Request, res: Response) => {
  const parsed = rejectBusinessSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', 'Rejection reason is required', 400);
  }

  const { id } = req.params;
  const adminId = req.user!.id;
  const { reason } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from('businesses')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status, owner_id')
    .single();

  if (error || !data) return sendError(res, 'NOT_FOUND', 'Business not found', 404);

  await logAdminAction(adminId, 'reject', 'business', id, reason);
  await sendNotification(
    data.owner_id,
    'Business Rejected',
    `Your business listing was rejected. Reason: ${reason}`,
    'system',
    { business_id: id, reason }
  );

  sendSuccess(res, { id: data.id, status: data.status });
});

// ─── 5. Suspend Business ────────────────────────────────────────────────────
// PUT /admin/businesses/:id/suspend
// Requirements: 9.10, 9.11

router.put('/businesses/:id/suspend', async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from('businesses')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status, owner_id')
    .single();

  if (error || !data) return sendError(res, 'NOT_FOUND', 'Business not found', 404);

  await logAdminAction(adminId, 'suspend', 'business', id);
  await sendNotification(
    data.owner_id,
    'Business Suspended',
    'Your business listing has been suspended. Please contact support for more information.',
    'system',
    { business_id: id }
  );

  sendSuccess(res, { id: data.id, status: data.status });
});

// ─── 6. Verify Business (Toggle) ───────────────────────────────────────────
// PUT /admin/businesses/:id/verify
// Requirements: 9.11

router.put('/businesses/:id/verify', async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.id;

  // Fetch current verified status
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('businesses')
    .select('id, verified, owner_id')
    .eq('id', id)
    .single();

  if (fetchError || !current) return sendError(res, 'NOT_FOUND', 'Business not found', 404);

  const newVerified = !current.verified;

  const { error } = await supabaseAdmin
    .from('businesses')
    .update({ verified: newVerified, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return sendError(res, 'UPDATE_FAILED', error.message, 500);

  await logAdminAction(adminId, newVerified ? 'verify' : 'unverify', 'business', id);

  sendSuccess(res, { id, verified: newVerified });
});

// ─── 6b. Toggle Sponsored (Toggle) ─────────────────────────────────────────
// PUT /admin/businesses/:id/sponsored

router.put('/businesses/:id/sponsored', async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.id;

  // Fetch current sponsored status
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('businesses')
    .select('id, is_sponsored')
    .eq('id', id)
    .single();

  if (fetchError || !current) return sendError(res, 'NOT_FOUND', 'Business not found', 404);

  const newSponsored = !current.is_sponsored;

  const { error } = await supabaseAdmin
    .from('businesses')
    .update({
      is_sponsored: newSponsored,
      sponsored_until: newSponsored ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return sendError(res, 'UPDATE_FAILED', error.message, 500);

  await logAdminAction(adminId, newSponsored ? 'mark_sponsored' : 'remove_sponsored', 'business', id);

  sendSuccess(res, { id, is_sponsored: newSponsored });
});

// ─── 7. Users List ──────────────────────────────────────────────────────────
// GET /admin/users
// Requirements: 10.1, 10.2

router.get('/users', async (req: Request, res: Response) => {
  const { role, search, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
  const offset = (pageNum - 1) * limitNum;

  let query = supabaseAdmin
    .from('users')
    .select('*', { count: 'exact' });

  if (role) query = query.eq('role', role as string);

  if (search) {
    const searchStr = `%${search}%`;
    query = query.or(`name.ilike.${searchStr},phone.ilike.${searchStr},email.ilike.${searchStr}`);
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500);

  sendSuccess(res, data ?? [], {
    page: pageNum,
    pageSize: limitNum,
    total: count ?? 0,
    hasNextPage: offset + limitNum < (count ?? 0),
  });
});

// ─── 8. Suspend User ────────────────────────────────────────────────────────

// GET /admin/users/:id — Get single user
router.get('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return sendError(res, 'NOT_FOUND', 'User not found', 404);
  sendSuccess(res, data);
});

// GET /admin/businesses/:id — Get single business
router.get('/businesses/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('*, categories(id, name, slug, icon), business_photos(id, url, storage_path, is_primary, display_order)')
    .eq('id', id)
    .single();

  if (error || !data) return sendError(res, 'NOT_FOUND', 'Business not found', 404);
  sendSuccess(res, data);
});

// PUT /admin/businesses/:id — Update business fields
router.put('/businesses/:id/update', async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.id;
  const { name, description, phone, email, website, whatsapp, address, city, state, pin, category_id, type, lat, lng, owner_id } = req.body;

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email;
  if (website !== undefined) updates.website = website;
  if (whatsapp !== undefined) updates.whatsapp = whatsapp;
  if (address !== undefined) updates.address = address;
  if (city !== undefined) updates.city = city;
  if (state !== undefined) updates.state = state;
  if (pin !== undefined) updates.pin = pin;
  if (category_id !== undefined) updates.category_id = category_id;
  if (type !== undefined) updates.type = type;
  if (owner_id !== undefined) updates.owner_id = owner_id;
  if (lat !== undefined && lng !== undefined) {
    updates.location = `POINT(${lng} ${lat})`;
  }

  const { data, error } = await supabaseAdmin
    .from('businesses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'UPDATE_FAILED', error?.message ?? 'Failed to update', 500);

  await logAdminAction(adminId, 'update_business', 'business', id, `Updated business: ${data.name}`);
  sendSuccess(res, data);
});
// PUT /admin/users/:id/suspend
// Requirements: 10.3

router.put('/users/:id/suspend', async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, is_active')
    .single();

  if (error || !data) return sendError(res, 'NOT_FOUND', 'User not found', 404);

  await logAdminAction(adminId, 'suspend_user', 'user', id);

  sendSuccess(res, { id: data.id, is_active: data.is_active });
});

// ─── 9. Change User Role ────────────────────────────────────────────────────
// PUT /admin/users/:id/role
// Requirements: 10.4

router.put('/users/:id/role', async (req: Request, res: Response) => {
  const parsed = changeRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', 'Valid role is required', 400);
  }

  const { id } = req.params;
  const adminId = req.user!.id;
  const { role } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, role')
    .single();

  if (error || !data) return sendError(res, 'NOT_FOUND', 'User not found', 404);

  await logAdminAction(adminId, 'role_change', 'user', id, `Changed role to ${role}`);

  sendSuccess(res, { id: data.id, role: data.role });
});

// ─── 9b. Create User (Admin) ────────────────────────────────────────────────
// POST /admin/users
// Admin can create agents, business users, or customers with email+password

router.post('/users', async (req: Request, res: Response) => {
  const { email, password, name, phone, role } = req.body as {
    email?: string; password?: string; name?: string; phone?: string; role?: string;
  };

  if (!email || !password) {
    return sendError(res, 'VALIDATION_ERROR', 'Email and password are required', 400);
  }
  if (password.length < 6) {
    return sendError(res, 'VALIDATION_ERROR', 'Password must be at least 6 characters', 400);
  }

  const validRoles = ['customer', 'business', 'admin', 'agent'];
  const userRole = validRoles.includes(role ?? '') ? role! : 'customer';
  const adminId = req.user!.id;

  // Create in Supabase Auth
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name ?? null },
  });

  if (authError || !authUser.user) {
    // If user already exists in Supabase Auth, try to find them and link to our users table
    if (authError?.message?.includes('already been registered') || authError?.message?.includes('already exists')) {
      // Look up the existing auth user by email
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = existingUsers?.users?.find((u: any) => u.email === email);

      if (existingAuthUser) {
        // Check if they already exist in our users table
        const { data: existingRow } = await supabaseAdmin.from('users').select('id').eq('id', existingAuthUser.id).single();

        if (existingRow) {
          return sendError(res, 'USER_EXISTS', 'A user with this email address has already been registered', 409);
        }

        // Auth user exists but not in our users table — create the row
        const { data, error } = await supabaseAdmin.from('users').insert({
          id: existingAuthUser.id,
          email,
          name: name || null,
          phone: phone?.trim() || null,
          role: userRole,
        }).select().single();

        if (error) {
          return sendError(res, 'CREATE_FAILED', error.message, 500);
        }

        // Update password if provided
        await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, { password });

        await logAdminAction(adminId, 'create_user', 'user', existingAuthUser.id, `Linked existing auth user as ${userRole}: ${email}`);
        return sendSuccess(res, data, undefined, 201);
      }
    }

    return sendError(res, 'CREATE_FAILED', authError?.message ?? 'Failed to create user', 400);
  }

  // Create in public users table
  const { data, error } = await supabaseAdmin.from('users').insert({
    id: authUser.user.id,
    email,
    name: name || null,
    phone: phone?.trim() || null,
    role: userRole,
  }).select().single();

  if (error) {
    return sendError(res, 'CREATE_FAILED', error.message, 500);
  }

  await logAdminAction(adminId, 'create_user', 'user', authUser.user.id, `Created ${userRole}: ${email}`);

  sendSuccess(res, data, undefined, 201);
});

// ─── 9c. Add Business (Admin/Agent) ─────────────────────────────────────────
// POST /admin/businesses
// Admin can add businesses directly (auto-approved)

router.post('/businesses', async (req: Request, res: Response) => {
  const adminId = req.user!.id;
  const { name, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, lat, lng, owner_id } = req.body;

  if (!name || !address || !city) {
    return sendError(res, 'VALIDATION_ERROR', 'name, address, and city are required', 400);
  }

  const { data, error } = await supabaseAdmin.from('businesses').insert({
    owner_id: owner_id || adminId,
    name,
    category_id: category_id ?? null,
    type: type ?? 'physical',
    description: description ?? null,
    phone: phone ?? null,
    email: email ?? null,
    website: website ?? null,
    whatsapp: whatsapp ?? null,
    address,
    city,
    state: state ?? null,
    pin: pin ?? null,
    location: lat && lng ? `POINT(${lng} ${lat})` : null,
    status: 'active', // Admin-added businesses are auto-approved
    verified: true,
  }).select().single();

  if (error) {
    return sendError(res, 'CREATE_FAILED', error.message, 500);
  }

  await logAdminAction(adminId, 'add_business', 'business', data.id, `Added business: ${name}`);

  sendSuccess(res, data, undefined, 201);
});

// ─── 9d. Upload Business Photo ───────────────────────────────────────────────
// POST /admin/businesses/:id/photos
// Accepts base64 image data, uploads to AWS S3

router.post('/businesses/:id/photos', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { image, filename, is_primary } = req.body as {
    image?: string; // base64 encoded image data
    filename?: string;
    is_primary?: boolean;
  };

  if (!image) {
    return sendError(res, 'VALIDATION_ERROR', 'image (base64) is required', 400);
  }

  // Verify business exists
  const { data: biz } = await supabaseAdmin.from('businesses').select('id').eq('id', id).single();
  if (!biz) return sendError(res, 'NOT_FOUND', 'Business not found', 404);

  // Decode base64 and upload to S3
  const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const ext = filename?.split('.').pop() || 'jpg';
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const storagePath = `business-photos/${id}/${Date.now()}.${ext}`;

  try {
    const { uploadToS3 } = await import('../lib/s3');
    const publicUrl = await uploadToS3(buffer, storagePath, contentType);

    // If marking as primary, unset other primaries first
    if (is_primary) {
      await supabaseAdmin.from('business_photos').update({ is_primary: false }).eq('business_id', id);
    }

    // Get current photo count for display_order
    const { count } = await supabaseAdmin
      .from('business_photos')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', id);

    // Insert photo record
    const { data: photo, error: insertError } = await supabaseAdmin
      .from('business_photos')
      .insert({
        business_id: id,
        url: publicUrl,
        storage_path: storagePath,
        is_primary: is_primary ?? (count === 0), // First photo is primary by default
        display_order: count ?? 0,
      })
      .select()
      .single();

    if (insertError) {
      return sendError(res, 'INSERT_FAILED', insertError.message, 500);
    }

    sendSuccess(res, photo, undefined, 201);
  } catch (err: any) {
    return sendError(res, 'UPLOAD_FAILED', err.message || 'Failed to upload to S3', 500);
  }
});

// DELETE /admin/businesses/:id/photos/:photoId
router.delete('/businesses/:id/photos/:photoId', async (req: Request, res: Response) => {
  const { id, photoId } = req.params;

  // Get the photo to find storage path
  const { data: photo } = await supabaseAdmin
    .from('business_photos')
    .select('storage_path')
    .eq('id', photoId)
    .eq('business_id', id)
    .single();

  if (!photo) return sendError(res, 'NOT_FOUND', 'Photo not found', 404);

  // Delete from S3
  try {
    const { deleteFromS3 } = await import('../lib/s3');
    await deleteFromS3(photo.storage_path);
  } catch {
    // Continue even if S3 delete fails — still remove DB record
  }

  // Delete record
  await supabaseAdmin.from('business_photos').delete().eq('id', photoId);

  sendSuccess(res, { deleted: true });
});

// ─── 10. Reports Queue ──────────────────────────────────────────────────────
// GET /admin/reports
// Requirements: 9.8

router.get('/reports', async (req: Request, res: Response) => {
  const { status = 'open', page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
  const offset = (pageNum - 1) * limitNum;

  const { data, error, count } = await supabaseAdmin
    .from('reports')
    .select('*, businesses(name), reporter:users!reporter_id(name, email)', { count: 'exact' })
    .eq('status', status as string)
    .order('created_at', { ascending: true })
    .range(offset, offset + limitNum - 1);

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500);

  sendSuccess(res, data ?? [], {
    page: pageNum,
    pageSize: limitNum,
    total: count ?? 0,
    hasNextPage: offset + limitNum < (count ?? 0),
  });
});

// ─── 11. Resolve Report ─────────────────────────────────────────────────────
// PUT /admin/reports/:id/resolve
// Requirements: 9.9

router.put('/reports/:id/resolve', async (req: Request, res: Response) => {
  const parsed = resolveReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', 'Action and note are required', 400);
  }

  const { id } = req.params;
  const adminId = req.user!.id;
  const { action, note } = parsed.data;

  const newStatus = action === 'dismiss' ? 'dismissed' : 'actioned';

  const { data, error } = await supabaseAdmin
    .from('reports')
    .update({
      status: newStatus,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, status, business_id')
    .single();

  if (error || !data) return sendError(res, 'NOT_FOUND', 'Report not found', 404);

  // If action is suspend or remove, update the business
  if (action === 'suspend' && data.business_id) {
    await supabaseAdmin
      .from('businesses')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', data.business_id);
  }

  await logAdminAction(adminId, `report_${action}`, 'report', id, note);

  sendSuccess(res, { id: data.id, status: data.status, action });
});

// ─── 12. Categories List ────────────────────────────────────────────────────
// GET /admin/categories
// Requirements: 10.5

router.get('/categories', async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500);

  sendSuccess(res, data ?? []);
});

// ─── 13. Create Category ────────────────────────────────────────────────────
// POST /admin/categories
// Requirements: 10.6

router.post('/categories', async (req: Request, res: Response) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid category data', 400);
  }

  const adminId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return sendError(res, 'CONFLICT', 'Category with this name or slug already exists', 409);
    }
    return sendError(res, 'CREATE_FAILED', error.message, 500);
  }

  await logAdminAction(adminId, 'create_category', 'category', data.id, `Created category: ${data.name}`);

  sendSuccess(res, data, undefined, 201);
});

// ─── 14. Update Category ────────────────────────────────────────────────────
// PUT /admin/categories/:id
// Requirements: 10.7

router.put('/categories/:id', async (req: Request, res: Response) => {
  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid category data', 400);
  }

  const { id } = req.params;
  const adminId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from('categories')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'NOT_FOUND', 'Category not found', 404);

  await logAdminAction(adminId, 'update_category', 'category', id);

  sendSuccess(res, data);
});

// ─── 15. Delete Category ────────────────────────────────────────────────────
// DELETE /admin/categories/:id
// Requirements: 10.9

router.delete('/categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.id;

  // Check if any businesses use this category
  const { count } = await supabaseAdmin
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);

  if (count && count > 0) {
    return sendError(
      res,
      'CATEGORY_IN_USE',
      `Cannot delete category: ${count} business(es) are using it`,
      400
    );
  }

  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) return sendError(res, 'DELETE_FAILED', error.message, 500);

  await logAdminAction(adminId, 'delete_category', 'category', id);

  sendSuccess(res, { deleted: true });
});

// ─── 16. Broadcast Notification ─────────────────────────────────────────────
// POST /admin/notifications/broadcast
// Requirements: 11.5, 11.6

router.post('/notifications/broadcast', async (req: Request, res: Response) => {
  const parsed = broadcastNotificationSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid broadcast data', 400);
  }

  const adminId = req.user!.id;
  const { title, body, target, city, role, user_id, schedule_at } = parsed.data;

  // Build target user query
  let userQuery = supabaseAdmin.from('users').select('id').eq('is_active', true);

  switch (target) {
    case 'by_city':
      if (!city) return sendError(res, 'VALIDATION_ERROR', 'City is required for by_city target', 400);
      // Get users who own businesses in the specified city
      const { data: cityBusinesses } = await supabaseAdmin
        .from('businesses')
        .select('owner_id')
        .ilike('city', `%${city}%`);
      const cityUserIds = cityBusinesses?.map((b) => b.owner_id) ?? [];
      if (cityUserIds.length === 0) return sendSuccess(res, { queued: 0 });
      userQuery = userQuery.in('id', cityUserIds);
      break;
    case 'by_role':
      if (!role) return sendError(res, 'VALIDATION_ERROR', 'Role is required for by_role target', 400);
      userQuery = userQuery.eq('role', role);
      break;
    case 'individual':
      if (!user_id) return sendError(res, 'VALIDATION_ERROR', 'user_id is required for individual target', 400);
      userQuery = userQuery.eq('id', user_id);
      break;
    // 'all' — no additional filter
  }

  const { data: targetUsers, error: userError } = await userQuery;

  if (userError) return sendError(res, 'FETCH_FAILED', userError.message, 500);
  if (!targetUsers || targetUsers.length === 0) return sendSuccess(res, { queued: 0 });

  // Create notification records for all target users
  const notifications = targetUsers.map((u) => ({
    user_id: u.id,
    title,
    body,
    type: 'broadcast' as const,
    data: { target, schedule_at: schedule_at ?? null },
    is_read: false,
  }));

  // Insert in batches of 500
  let queued = 0;
  for (let i = 0; i < notifications.length; i += 500) {
    const batch = notifications.slice(i, i + 500);
    const { error: insertError } = await supabaseAdmin.from('notifications').insert(batch);
    if (!insertError) queued += batch.length;
  }

  await logAdminAction(
    adminId,
    'broadcast_notification',
    'notification',
    null,
    `Broadcast to ${target}: "${title}" (${queued} recipients)`
  );

  sendSuccess(res, { queued });
});

// ─── 17. Platform Analytics ─────────────────────────────────────────────────
// GET /admin/analytics
// Requirements: 11.2

router.get('/analytics', async (req: Request, res: Response) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [searchesRes, usersRes, businessesRes, reviewsRes] = await Promise.all([
      // Daily searches (last 30 days)
      supabaseAdmin
        .from('search_history')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo),
      // New user registrations (last 30 days)
      supabaseAdmin
        .from('users')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo),
      // New businesses (last 30 days)
      supabaseAdmin
        .from('businesses')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo),
      // Reviews written (last 30 days)
      supabaseAdmin
        .from('reviews')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo),
    ]);

    // Aggregate by day
    const aggregateByDay = (records: { created_at: string }[] | null) => {
      const counts: Record<string, number> = {};
      (records ?? []).forEach((r) => {
        const day = r.created_at.split('T')[0];
        counts[day] = (counts[day] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    };

    sendSuccess(res, {
      daily_searches: aggregateByDay(searchesRes.data),
      new_registrations: aggregateByDay(usersRes.data),
      new_businesses: aggregateByDay(businessesRes.data),
      reviews_written: aggregateByDay(reviewsRes.data),
    });
  } catch {
    sendError(res, 'FETCH_FAILED', 'Failed to fetch analytics', 500);
  }
});

// ─── 18. Admin Activity Logs ────────────────────────────────────────────────
// GET /admin/logs
// Requirements: 11.8

router.get('/logs', async (req: Request, res: Response) => {
  const { admin_id, action, start_date, end_date, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
  const offset = (pageNum - 1) * limitNum;

  let query = supabaseAdmin
    .from('admin_logs')
    .select('*, admin:users!admin_id(name, email)', { count: 'exact' });

  if (admin_id) query = query.eq('admin_id', admin_id as string);
  if (action) query = query.eq('action', action as string);
  if (start_date) query = query.gte('created_at', start_date as string);
  if (end_date) query = query.lte('created_at', end_date as string);

  query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;

  if (error) return sendError(res, 'FETCH_FAILED', error.message, 500);

  sendSuccess(res, data ?? [], {
    page: pageNum,
    pageSize: limitNum,
    total: count ?? 0,
    hasNextPage: offset + limitNum < (count ?? 0),
  });
});

export default router;

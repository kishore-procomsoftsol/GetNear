import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import * as admin from 'firebase-admin';
import { supabaseAdmin } from '../lib/supabase';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { otpLimiter } from '../middleware/rateLimit';
import { sendSuccess, sendError } from '../utils/response';
import { sendOtpSchema, verifyOtpSchema } from '@getnear/validation';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  const path = require('path');
  const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * Auth router — handles all authentication flows.
 *
 * Routes:
 *   POST /auth/send-otp    — Send OTP via Twilio Verify (Req 1.1, 1.10)
 *   POST /auth/verify-otp  — Verify OTP, issue JWT session (Req 1.2, 1.3, 1.4, 1.7)
 *   POST /auth/google      — Exchange Google OAuth code for session (Req 1.5)
 *   POST /auth/refresh     — Refresh access token (Req 1.8)
 *   POST /auth/logout      — Invalidate session (Req 1.9)
 */

const router = Router();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const VERIFY_SID = process.env.TWILIO_VERIFY_SID!;

// ---------------------------------------------------------------------------
// POST /auth/send-otp
// Validates phone in E.164 format, sends OTP via Twilio Verify.
// Rate-limited to 5 requests per 15 minutes per IP.
// Requirements: 1.1, 1.10
// ---------------------------------------------------------------------------
router.post(
  '/send-otp',
  otpLimiter,
  validate(sendOtpSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { phone } = req.body as { phone: string };

    try {
      await twilioClient.verify.v2
        .services(VERIFY_SID)
        .verifications.create({ to: phone, channel: 'sms' });

      sendSuccess(res, { message: 'OTP sent' });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send OTP';
      sendError(res, 'OTP_SEND_FAILED', message, 500);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /auth/verify-otp
// Verifies OTP with Twilio, finds or creates the Supabase user, issues JWT.
// Requirements: 1.2, 1.3, 1.4, 1.7
// ---------------------------------------------------------------------------
router.post(
  '/verify-otp',
  validate(verifyOtpSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { phone, otp } = req.body as { phone: string; otp: string };

    // 1. Check OTP with Twilio Verify
    let verificationCheck;
    try {
      verificationCheck = await twilioClient.verify.v2
        .services(VERIFY_SID)
        .verificationChecks.create({ to: phone, code: otp });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'OTP verification failed';
      sendError(res, 'OTP_VERIFICATION_FAILED', message, 500);
      return;
    }

    if (verificationCheck.status !== 'approved') {
      sendError(res, 'INVALID_OTP', 'Invalid or expired OTP', 400);
      return;
    }

    // 2. Find or create the user in Supabase Auth by phone
    //    We use a synthetic email derived from the phone number as a stable
    //    identifier since Supabase Auth phone-only flows require a Twilio
    //    integration at the Supabase project level. Using admin.createUser
    //    with phone_confirm: true lets us manage verification ourselves.
    const syntheticEmail = `${phone.replace('+', '')}@phone.getnear.in`;

    let authUserId: string;

    // Try to find an existing auth user by the synthetic email
    const { data: existingUsers, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      sendError(res, 'AUTH_ERROR', 'Failed to look up user', 500);
      return;
    }

    const existingAuthUser = existingUsers.users.find(
      (u) => u.email === syntheticEmail || u.phone === phone
    );

    if (existingAuthUser) {
      authUserId = existingAuthUser.id;
    } else {
      // Create a new auth user
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: syntheticEmail,
          phone,
          phone_confirm: true,
          email_confirm: true,
          user_metadata: { phone },
        });

      if (createError || !newUser.user) {
        sendError(
          res,
          'USER_CREATE_FAILED',
          createError?.message ?? 'Failed to create user',
          500
        );
        return;
      }

      authUserId = newUser.user.id;
    }

    // 3. Ensure a row exists in the public users table
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('id, role, name')
      .eq('id', authUserId)
      .single();

    if (!existingProfile) {
      const { error: insertError } = await supabaseAdmin.from('users').insert({
        id: authUserId,
        phone,
        role: 'customer',
      });

      if (insertError) {
        sendError(
          res,
          'PROFILE_CREATE_FAILED',
          insertError.message,
          500
        );
        return;
      }
    }

    // 4. Generate a session (access_token + refresh_token) for the user
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: syntheticEmail,
      });

    if (linkError || !linkData) {
      sendError(
        res,
        'SESSION_CREATE_FAILED',
        linkError?.message ?? 'Failed to create session',
        500
      );
      return;
    }

    // Exchange the magic link token for a real session
    const { data: sessionData, error: sessionError } =
      await supabaseAdmin.auth.admin.getUserById(authUserId);

    if (sessionError || !sessionData.user) {
      sendError(res, 'SESSION_CREATE_FAILED', 'Failed to retrieve user', 500);
      return;
    }

    // Use the generated link's hashed_token to sign in
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: syntheticEmail,
        // We cannot sign in with password here since no password was set.
        // Instead, use the admin generateLink approach and extract tokens.
        password: '',
      });

    // The signInWithPassword approach won't work without a password.
    // Use the correct approach: create a session directly via admin API.
    // Supabase JS v2 admin does not expose createSession directly, so we
    // use the generateLink token to exchange for a session via the REST API.
    if (signInError || !signInData?.session) {
      // Fallback: use the properties from generateLink
      // linkData contains action_link which has the token embedded.
      // Parse the token from the action_link URL.
      const actionLink = linkData.properties?.action_link ?? '';
      const url = new URL(actionLink);
      const token = url.searchParams.get('token') ?? '';
      const type = url.searchParams.get('type') ?? 'magiclink';

      if (!token) {
        sendError(res, 'SESSION_CREATE_FAILED', 'Failed to generate session token', 500);
        return;
      }

      // Verify the OTP token to get a session
      const { data: otpSession, error: otpError } =
        await supabaseAdmin.auth.verifyOtp({
          email: syntheticEmail,
          token,
          type: type as 'magiclink',
        });

      if (otpError || !otpSession.session) {
        sendError(
          res,
          'SESSION_CREATE_FAILED',
          otpError?.message ?? 'Failed to create session',
          500
        );
        return;
      }

      // 5. Read role from users table
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('id, role, name')
        .eq('id', authUserId)
        .single();

      sendSuccess(res, {
        access_token: otpSession.session.access_token,
        refresh_token: otpSession.session.refresh_token,
        user: {
          id: authUserId,
          role: profile?.role ?? 'customer',
          name: profile?.name ?? null,
        },
      });
      return;
    }

    // 5. Read role from users table
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, role, name')
      .eq('id', authUserId)
      .single();

    sendSuccess(res, {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      user: {
        id: authUserId,
        role: profile?.role ?? 'customer',
        name: profile?.name ?? null,
      },
    });
  }
);

// ---------------------------------------------------------------------------
// POST /auth/google
// Exchanges a Google OAuth authorization code for a Supabase session.
// Upserts the user row in the public users table.
// Requirements: 1.5, 1.7
// ---------------------------------------------------------------------------
router.post(
  '/google',
  async (req: Request, res: Response): Promise<void> => {
    const { code, redirect_uri } = req.body as {
      code?: string;
      redirect_uri?: string;
    };

    if (!code) {
      sendError(res, 'VALIDATION_ERROR', 'code is required', 400);
      return;
    }

    if (!redirect_uri) {
      sendError(res, 'VALIDATION_ERROR', 'redirect_uri is required', 400);
      return;
    }

    // Exchange the authorization code for a Supabase session.
    // Supabase handles the Google token exchange internally.
    const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      sendError(
        res,
        'OAUTH_EXCHANGE_FAILED',
        error?.message ?? 'Failed to exchange OAuth code',
        400
      );
      return;
    }

    const { session, user: authUser } = data;

    // Upsert the user row in the public users table
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: authUser.id,
          email: authUser.email ?? null,
          name:
            authUser.user_metadata?.full_name ??
            authUser.user_metadata?.name ??
            null,
          avatar_url: authUser.user_metadata?.avatar_url ?? null,
          role: 'customer',
        },
        { onConflict: 'id', ignoreDuplicates: false }
      );

    if (upsertError) {
      sendError(res, 'PROFILE_UPSERT_FAILED', upsertError.message, 500);
      return;
    }

    // Read the current role (may have been set to 'business' or 'admin' previously)
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, role, name')
      .eq('id', authUser.id)
      .single();

    sendSuccess(res, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: authUser.id,
        role: profile?.role ?? 'customer',
        name: profile?.name ?? null,
      },
    });
  }
);

// ---------------------------------------------------------------------------
// POST /auth/refresh
// Proxies a Supabase token refresh using the provided refresh_token.
// Requirements: 1.8
// ---------------------------------------------------------------------------
router.post(
  '/refresh',
  async (req: Request, res: Response): Promise<void> => {
    const { refresh_token } = req.body as { refresh_token?: string };

    if (!refresh_token) {
      sendError(res, 'VALIDATION_ERROR', 'refresh_token is required', 400);
      return;
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      sendError(
        res,
        'REFRESH_FAILED',
        error?.message ?? 'Failed to refresh session',
        401
      );
      return;
    }

    sendSuccess(res, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }
);

// ---------------------------------------------------------------------------
// POST /auth/logout
// Invalidates the current Supabase session for the authenticated user.
// Requirements: 1.9
// ---------------------------------------------------------------------------
router.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const { error } = await supabaseAdmin.auth.admin.signOut(userId);

    if (error) {
      sendError(res, 'LOGOUT_FAILED', error.message, 500);
      return;
    }

    sendSuccess(res, { message: 'Logged out' });
  }
);

// ---------------------------------------------------------------------------
// POST /auth/firebase
// Verifies a Firebase ID token (from phone OTP or Google Sign-In),
// finds or creates the user in Supabase, and returns a Supabase session.
// ---------------------------------------------------------------------------
router.post(
  '/firebase',
  async (req: Request, res: Response): Promise<void> => {
    const { idToken } = req.body as { idToken?: string };

    if (!idToken) {
      sendError(res, 'VALIDATION_ERROR', 'idToken is required', 400);
      return;
    }

    // Verify the Firebase ID token
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().verifyIdToken(idToken);
    } catch (err: any) {
      console.error('[auth/firebase] Token verification failed:', err.message);
      sendError(res, 'INVALID_TOKEN', 'Invalid or expired Firebase token: ' + err.message, 401);
      return;
    }

    const { uid, phone_number, email, name, picture } = firebaseUser;

    // Determine the user's email for Supabase Auth
    // Phone users get a synthetic email, Google users use their real email
    const userEmail = email || `${(phone_number || uid).replace(/[^a-zA-Z0-9]/g, '')}@firebase.getnear.in`;
    const userName = name || firebaseUser.name || null;
    const avatarUrl = picture || null;
    const userPhone = phone_number || null;

    // Find or create user in Supabase Auth
    let authUserId: string;
    const fixedPassword = `fb_${uid}_getnear_2024`; // Deterministic password per Firebase user

    // Check if user already exists by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(
      (u) => u.email === userEmail || (userPhone && u.phone === userPhone)
    );

    if (existingUser) {
      authUserId = existingUser.id;
    } else {
      // Create new Supabase Auth user with a deterministic password
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        phone: userPhone || undefined,
        email_confirm: true,
        phone_confirm: true,
        password: fixedPassword,
        user_metadata: { name: userName, avatar_url: avatarUrl, firebase_uid: uid },
      });

      if (createError || !newUser.user) {
        console.error('[auth/firebase] User create failed:', createError?.message);
        sendError(res, 'USER_CREATE_FAILED', createError?.message ?? 'Failed to create user', 500);
        return;
      }
      authUserId = newUser.user.id;
    }

    // Ensure public users table row exists
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('id, role, name')
      .eq('id', authUserId)
      .single();

    if (!existingProfile) {
      const { error: insertErr } = await supabaseAdmin.from('users').insert({
        id: authUserId,
        phone: userPhone,
        email: email || null,
        name: userName,
        avatar_url: avatarUrl,
        role: 'customer',
      });
      if (insertErr) console.error('[auth/firebase] Profile insert failed:', insertErr.message);
    }

    // Try signInWithPassword first (works for users we created)
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: userEmail,
      password: fixedPassword,
    });

    if (signInData?.session) {
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('id, role, name')
        .eq('id', authUserId)
        .single();

      sendSuccess(res, {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user: {
          id: authUserId,
          role: profile?.role ?? 'customer',
          name: profile?.name ?? userName,
        },
      });
      return;
    }

    // Fallback: update the user's password and try again
    console.log('[auth/firebase] signInWithPassword failed, updating password...');
    await supabaseAdmin.auth.admin.updateUserById(authUserId, { password: fixedPassword });

    const { data: retryData, error: retryError } = await supabaseAdmin.auth.signInWithPassword({
      email: userEmail,
      password: fixedPassword,
    });

    if (retryError || !retryData?.session) {
      console.error('[auth/firebase] Session creation failed:', retryError?.message);
      sendError(res, 'SESSION_CREATE_FAILED', retryError?.message ?? 'Failed to create session', 500);
      return;
    }

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, role, name')
      .eq('id', authUserId)
      .single();

    sendSuccess(res, {
      access_token: retryData.session.access_token,
      refresh_token: retryData.session.refresh_token,
      user: {
        id: authUserId,
        role: profile?.role ?? 'customer',
        name: profile?.name ?? userName,
      },
    });
  }
);

// ---------------------------------------------------------------------------
// POST /auth/login
// Email + password login using Supabase Auth.
// Used by the admin panel.
// ---------------------------------------------------------------------------
router.post(
  '/login',
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      sendError(res, 'VALIDATION_ERROR', 'Email and password are required', 400);
      return;
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      sendError(res, 'INVALID_CREDENTIALS', error?.message ?? 'Invalid email or password', 401);
      return;
    }

    // Read role from users table
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, role, name')
      .eq('id', data.user.id)
      .single();

    sendSuccess(res, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        role: profile?.role ?? 'customer',
        name: profile?.name ?? null,
      },
    });
  }
);

// ---------------------------------------------------------------------------
// POST /auth/register
// Email + password registration using Supabase Auth.
// Creates a user with the specified role.
// ---------------------------------------------------------------------------
router.post(
  '/register',
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, name, role } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      role?: string;
    };

    if (!email || !password) {
      sendError(res, 'VALIDATION_ERROR', 'Email and password are required', 400);
      return;
    }

    if (password.length < 6) {
      sendError(res, 'VALIDATION_ERROR', 'Password must be at least 6 characters', 400);
      return;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name ?? null },
    });

    if (error || !data.user) {
      sendError(res, 'REGISTRATION_FAILED', error?.message ?? 'Failed to create account', 400);
      return;
    }

    // Create user row in public users table
    const userRole = role === 'business' ? 'business' : 'customer';
    await supabaseAdmin.from('users').insert({
      id: data.user.id,
      email,
      name: name ?? null,
      role: userRole,
    });

    // Sign in to get tokens
    const { data: signIn, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signIn.session) {
      sendSuccess(res, { message: 'Account created. Please log in.' }, undefined, 201);
      return;
    }

    sendSuccess(res, {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      user: {
        id: data.user.id,
        role: userRole,
        name: name ?? null,
      },
    }, undefined, 201);
  }
);

export default router;

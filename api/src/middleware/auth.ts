import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

/**
 * Extracts and validates a Bearer JWT from the Authorization header.
 * On success, attaches the authenticated user to req.user and calls next().
 * On failure, returns 401 with an UNAUTHORIZED error envelope.
 *
 * Requirement: 17.6 (authentication middleware)
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
    return;
  }

  req.user = {
    id: data.user.id,
    email: data.user.email ?? undefined,
    phone: data.user.phone ?? undefined,
  };

  next();
}

/**
 * Same as authenticate, but does not reject the request if no token is provided.
 * Useful for endpoints that have optional authentication (e.g. public search).
 * If a token is present but invalid, still returns 401.
 *
 * Requirement: 17.6
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  // No token — proceed as unauthenticated
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    // Token was provided but is invalid — reject
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
    return;
  }

  req.user = {
    id: data.user.id,
    email: data.user.email ?? undefined,
    phone: data.user.phone ?? undefined,
  };

  next();
}

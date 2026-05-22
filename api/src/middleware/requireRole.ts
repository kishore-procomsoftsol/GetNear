import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

/**
 * Middleware factory that enforces role-based access control.
 * Must be used after the `authenticate` middleware (requires req.user to be set).
 *
 * Looks up the user's role from the `users` table and checks it against
 * the allowed roles. Returns 403 if the user's role is not permitted.
 *
 * Usage:
 *   router.post('/admin/...', authenticate, requireRole('admin'), handler)
 *   router.post('/dashboard/...', authenticate, requireRole('business', 'admin'), handler)
 *
 * Requirement: 19.2 (role-based access control)
 */
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // authenticate middleware must run first
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !data) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    if (!roles.includes(data.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    next();
  };
}

import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

/**
 * Centralized Express error handler (4-argument signature required by Express).
 *
 * - Known `AppError` subclasses (NotFoundError, ValidationError, etc.) are
 *   surfaced directly to the client with their code, message, and optional
 *   field errors.
 * - Unknown errors are captured with Sentry and returned as a generic 500 so
 *   that internal details are never leaked to clients.
 *
 * Must be registered AFTER all routes and after Sentry.setupExpressErrorHandler().
 *
 * Requirements: 17.5, 19.3, 19.6
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // next is required for Express to recognise this as an error handler
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    // Operational error — safe to expose details to the client
    sendError(res, err.code, err.message, err.statusCode, err.fields);
    return;
  }

  // Unexpected error — capture with Sentry and return a generic 500
  Sentry.captureException(err);

  const isDev = process.env.NODE_ENV !== 'production';

  sendError(
    res,
    'INTERNAL_ERROR',
    isDev ? err.message : 'An unexpected error occurred',
    500
  );
}

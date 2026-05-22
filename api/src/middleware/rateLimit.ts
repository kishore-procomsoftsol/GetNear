import rateLimit from 'express-rate-limit';

const rateLimitErrorResponse = (code: string, message: string) => ({
  error: { code, message },
});

/**
 * OTP rate limiter — 5 requests per 15 minutes per IP.
 * Applied to POST /auth/send-otp to prevent SMS abuse.
 *
 * Design §13.3 specifies 3 per 10 min; task spec overrides to 5 per 15 min.
 * Using the task spec values as the authoritative source.
 *
 * Requirement: 17.5
 */
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  message: rateLimitErrorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests'),
  statusCode: 429,
});

/**
 * Search rate limiter — 60 requests per minute per IP.
 * Applied to GET /businesses/search.
 *
 * Requirement: 17.5
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitErrorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests'),
  statusCode: 429,
});

/**
 * General API rate limiter — 100 requests per minute per IP.
 * Applied globally to all /api/v1 routes.
 *
 * Requirement: 17.5
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitErrorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests'),
  statusCode: 429,
});

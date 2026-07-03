import rateLimit from 'express-rate-limit';

const rateLimitErrorResponse = (code: string, message: string) => ({
  error: { code, message },
});

/**
 * Places rate limiter — 30 requests per minute per IP.
 * Applied to all /places/* endpoints to prevent abuse.
 *
 * Requirements: 5.3, 5.4
 */
export const placesLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  message: rateLimitErrorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests'),
  statusCode: 429,
});

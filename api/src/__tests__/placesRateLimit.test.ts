/**
 * Feature: google-places-integration, Property 7: Rate limit enforcement
 *
 * For any client IP and request sequence of length N within a 1-minute window,
 * if N exceeds the configured maximum (30 for places endpoints), requests N+1
 * onward within that window should all receive a 429 status code with
 * "Too many requests" message.
 *
 * Validates: Requirements 5.3, 5.4
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';

/**
 * Creates a fresh Express app with a rate limiter matching the production
 * configuration (30 req/min per IP) applied to all /places routes.
 * We recreate the limiter per property run to avoid state leaking between iterations.
 */
function createTestApp() {
  const app = express();

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
    statusCode: 429,
  });

  app.use('/places', limiter);

  // Minimal endpoints that always succeed — avoids needing real Google calls
  app.get('/places/nearby', (_req, res) => {
    res.status(200).json({ data: [], error: null });
  });

  app.get('/places/search', (_req, res) => {
    res.status(200).json({ data: [], meta: {}, error: null });
  });

  return app;
}

describe('Property 7: Rate limit enforcement', () => {
  it('requests beyond the 30-request limit within 1 minute all receive 429', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a number of over-limit requests to verify (1–10 extra beyond 30)
        fc.integer({ min: 1, max: 10 }),
        async (overLimitCount) => {
          const app = createTestApp();

          // Send exactly 30 requests — all should succeed (status 200)
          for (let i = 0; i < 30; i++) {
            const res = await request(app).get('/places/nearby');
            expect(res.status).toBe(200);
          }

          // Every request beyond the 30 limit should get 429
          for (let i = 0; i < overLimitCount; i++) {
            const res = await request(app).get('/places/nearby');
            expect(res.status).toBe(429);
            expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
            expect(res.body.error.message).toBe('Too many requests');
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 120_000);

  it('rate limit applies equally across different places endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Split 30 allowed requests between two endpoints
        fc.integer({ min: 1, max: 29 }),
        async (nearbyCount) => {
          const app = createTestApp();
          const searchCount = 30 - nearbyCount;

          // Send nearbyCount requests to /places/nearby
          for (let i = 0; i < nearbyCount; i++) {
            const res = await request(app).get('/places/nearby');
            expect(res.status).toBe(200);
          }

          // Send searchCount requests to /places/search
          for (let i = 0; i < searchCount; i++) {
            const res = await request(app).get('/places/search');
            expect(res.status).toBe(200);
          }

          // The 31st request (regardless of endpoint) should be rate limited
          const res = await request(app).get('/places/nearby');
          expect(res.status).toBe(429);
          expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
          expect(res.body.error.message).toBe('Too many requests');
        }
      ),
      { numRuns: 5 }
    );
  }, 120_000);
});

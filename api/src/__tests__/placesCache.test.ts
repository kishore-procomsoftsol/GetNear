/**
 * Feature: google-places-integration, Property 2: Cache key determinism and uniqueness
 * Feature: google-places-integration, Property 3: Coordinate spatial bucketing
 * Validates: Requirements 4.1, 4.2
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock the supabase module to avoid env var requirement during pure-function tests
vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {},
  supabaseClient: {},
}));

import { buildCacheKey, roundCoordinate } from '../lib/placesCache';

describe('Property 2: Cache key determinism and uniqueness', () => {
  it('same inputs always produce the same cache key (nearby)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 100, max: 50000 }),
        fc.string({ minLength: 0, maxLength: 20 }),
        fc.string({ minLength: 0, maxLength: 20 }),
        (lat, lng, radius, type, keyword) => {
          const params = { lat, lng, radius, type, keyword };
          const key1 = buildCacheKey('nearby', params);
          const key2 = buildCacheKey('nearby', params);
          expect(key1).toBe(key2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('same inputs always produce the same cache key (search)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 100, max: 50000 }),
        fc.boolean(),
        (query, lat, lng, radius, openNow) => {
          const params = { query, lat, lng, radius, type: '', openNow, pageToken: '' };
          const key1 = buildCacheKey('search', params);
          const key2 = buildCacheKey('search', params);
          expect(key1).toBe(key2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('same inputs always produce the same cache key (details)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 50 }),
        (placeId) => {
          const params = { placeId };
          const key1 = buildCacheKey('details', params);
          const key2 = buildCacheKey('details', params);
          expect(key1).toBe(key2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('different lat values produce different cache keys', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -89, max: 89, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 100, max: 50000 }),
        (lat, lng, radius) => {
          // Ensure lat values differ by more than rounding threshold (0.001)
          const lat2 = lat + 0.01;
          if (lat2 > 90) return; // skip invalid latitude
          const params1 = { lat, lng, radius, type: '', keyword: '' };
          const params2 = { lat: lat2, lng, radius, type: '', keyword: '' };
          const key1 = buildCacheKey('nearby', params1);
          const key2 = buildCacheKey('nearby', params2);
          expect(key1).not.toBe(key2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('different lng values produce different cache keys', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -179, max: 179, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 100, max: 50000 }),
        (lat, lng, radius) => {
          // Ensure lng values differ by more than rounding threshold (0.001)
          const lng2 = lng + 0.01;
          if (lng2 > 180) return;
          const params1 = { lat, lng, radius, type: '', keyword: '' };
          const params2 = { lat, lng: lng2, radius, type: '', keyword: '' };
          const key1 = buildCacheKey('nearby', params1);
          const key2 = buildCacheKey('nearby', params2);
          expect(key1).not.toBe(key2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('different radius values produce different cache keys', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 100, max: 25000 }),
        (lat, lng, radius) => {
          const radius2 = radius + 1000;
          const params1 = { lat, lng, radius, type: '', keyword: '' };
          const params2 = { lat, lng, radius: radius2, type: '', keyword: '' };
          const key1 = buildCacheKey('nearby', params1);
          const key2 = buildCacheKey('nearby', params2);
          expect(key1).not.toBe(key2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('different endpoint types produce different cache keys for same params', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 100, max: 50000 }),
        (lat, lng, radius) => {
          const params = { lat, lng, radius, type: '', keyword: '', query: '', openNow: false, pageToken: '' };
          const keyNearby = buildCacheKey('nearby', params);
          const keySearch = buildCacheKey('search', params);
          expect(keyNearby).not.toBe(keySearch);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 3: Coordinate spatial bucketing', () => {
  it('coordinates that round to the same 3-decimal value produce identical cache keys', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -89, max: 89, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -179, max: 179, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 100, max: 50000 }),
        fc.string({ minLength: 0, maxLength: 10 }),
        fc.string({ minLength: 0, maxLength: 10 }),
        (baseLat, baseLng, radius, type, keyword) => {
          // Round the base values to 3 decimal places and create small variations
          const roundedLat = roundCoordinate(baseLat);
          const roundedLng = roundCoordinate(baseLng);

          // Generate two coordinates within the same bucket
          // Any value that rounds to the same 3-decimal result is within ±0.0005 of the rounded value
          const lat1 = roundedLat + 0.0001;
          const lat2 = roundedLat + 0.0004;
          const lng1 = roundedLng + 0.0001;
          const lng2 = roundedLng + 0.0004;

          const params1 = { lat: lat1, lng: lng1, radius, type, keyword };
          const params2 = { lat: lat2, lng: lng2, radius, type, keyword };

          const key1 = buildCacheKey('nearby', params1);
          const key2 = buildCacheKey('nearby', params2);
          expect(key1).toBe(key2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('coordinates that round to different 3-decimal values produce different cache keys', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -89, max: 89, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -179, max: 179, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 100, max: 50000 }),
        (baseLat, baseLng, radius) => {
          // Coordinates in different buckets (separated by at least 0.001)
          const lat1 = baseLat;
          const lat2 = baseLat + 0.002; // guaranteed different bucket
          if (lat2 > 90) return;

          const params1 = { lat: lat1, lng: baseLng, radius, type: '', keyword: '' };
          const params2 = { lat: lat2, lng: baseLng, radius, type: '', keyword: '' };

          const key1 = buildCacheKey('nearby', params1);
          const key2 = buildCacheKey('nearby', params2);

          // Only assert difference if the rounded values are actually different
          if (roundCoordinate(lat1) !== roundCoordinate(lat2)) {
            expect(key1).not.toBe(key2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('roundCoordinate is idempotent — applying it twice equals once', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const once = roundCoordinate(value);
          const twice = roundCoordinate(once);
          expect(once).toBe(twice);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('roundCoordinate produces values with at most 3 decimal places', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const rounded = roundCoordinate(value);
          // Multiply by 1000 and check it's an integer (within floating point tolerance)
          const scaled = rounded * 1000;
          expect(Math.abs(scaled - Math.round(scaled))).toBeLessThan(1e-9);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('spatial bucketing works for search endpoint too', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -89, max: 89, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -179, max: 179, noNaN: true, noDefaultInfinity: true }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 100, max: 50000 }),
        (baseLat, baseLng, query, radius) => {
          const roundedLat = roundCoordinate(baseLat);
          const roundedLng = roundCoordinate(baseLng);

          // Two coordinates within the same spatial bucket
          const lat1 = roundedLat + 0.0002;
          const lat2 = roundedLat + 0.0003;
          const lng1 = roundedLng + 0.0002;
          const lng2 = roundedLng + 0.0003;

          const params1 = { query, lat: lat1, lng: lng1, radius, type: '', openNow: false, pageToken: '' };
          const params2 = { query, lat: lat2, lng: lng2, radius, type: '', openNow: false, pageToken: '' };

          const key1 = buildCacheKey('search', params1);
          const key2 = buildCacheKey('search', params2);
          expect(key1).toBe(key2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

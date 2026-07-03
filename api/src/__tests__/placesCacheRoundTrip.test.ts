/**
 * Feature: google-places-integration, Property 1: Cache round-trip preserves data
 * Feature: google-places-integration, Property 4: Cache TTL correctness
 *
 * Validates: Requirements 4.1, 4.2, 4.3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// --- In-memory store to simulate Supabase ---

let memoryStore: Record<string, {
  id: string;
  cache_key: string;
  place_id: string | null;
  endpoint_type: string;
  response_data: unknown;
  created_at: string;
  expires_at: string;
}> = {};

// Mock the supabase module before importing cacheService
vi.mock('../lib/supabase', () => {
  // Build a chainable query builder that operates on the in-memory store
  const createQueryBuilder = () => {
    let filters: Array<{ type: string; column: string; value: string }> = [];
    let isHead = false;
    let countMode: string | null = null;

    const builder: any = {
      select(cols: string, opts?: { count?: string; head?: boolean }) {
        if (opts?.count) countMode = opts.count;
        if (opts?.head) isHead = true;
        return builder;
      },
      eq(column: string, value: string) {
        filters.push({ type: 'eq', column, value });
        return builder;
      },
      gt(column: string, value: string) {
        filters.push({ type: 'gt', column, value });
        return builder;
      },
      lte(column: string, value: string) {
        filters.push({ type: 'lte', column, value });
        return builder;
      },
      maybeSingle() {
        let results = Object.values(memoryStore);

        for (const filter of filters) {
          if (filter.type === 'eq') {
            results = results.filter((r: any) => String(r[filter.column]) === String(filter.value));
          } else if (filter.type === 'gt') {
            results = results.filter((r: any) => r[filter.column] > filter.value);
          } else if (filter.type === 'lte') {
            results = results.filter((r: any) => r[filter.column] <= filter.value);
          }
        }

        const data = results.length > 0 ? results[0] : null;
        return Promise.resolve({ data, error: null });
      },
      upsert(record: any, opts?: { onConflict?: string }) {
        const conflictKey = opts?.onConflict;
        if (conflictKey && record[conflictKey]) {
          // Find existing by conflict key
          const existing = Object.values(memoryStore).find(
            (r: any) => r[conflictKey] === record[conflictKey]
          );
          if (existing) {
            const id = existing.id;
            memoryStore[id] = { ...existing, ...record, id };
            return Promise.resolve({ data: memoryStore[id], error: null });
          }
        }
        // Insert new
        const id = record.id || `uuid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        memoryStore[id] = { ...record, id };
        return Promise.resolve({ data: memoryStore[id], error: null });
      },
      delete() {
        // Apply filters and delete matching entries
        let results = Object.values(memoryStore);

        for (const filter of filters) {
          if (filter.type === 'eq') {
            results = results.filter((r: any) => String(r[filter.column]) === String(filter.value));
          } else if (filter.type === 'lte') {
            results = results.filter((r: any) => r[filter.column] <= filter.value);
          }
        }

        for (const entry of results) {
          delete memoryStore[entry.id];
        }

        const deleteResult = results;
        return {
          select(_cols: string) {
            return Promise.resolve({ data: deleteResult, error: null });
          },
        };
      },
      // Make the builder thenable for awaiting (used by count queries)
      then(resolve: any, reject?: any) {
        const result = isHead && countMode
          ? { count: Object.keys(memoryStore).length, error: null }
          : { data: Object.values(memoryStore), error: null };
        return Promise.resolve(result).then(resolve, reject);
      },
    };

    return builder;
  };

  const supabaseAdmin = {
    from(_table: string) {
      return createQueryBuilder();
    },
  };

  return { supabaseAdmin };
});

// Import after mock is set up
import { cacheService } from '../lib/placesCache';

// --- Helpers ---

/** Arbitrary for valid JSON-like response data (nested objects, arrays, primitives) */
const jsonArb = fc.jsonValue().map((v) => (v === undefined ? null : v));

/** Arbitrary for endpoint types used in the cache */
const endpointTypeArb = fc.constantFrom('nearby', 'search', 'details', 'photo');

/** Arbitrary for cache keys (non-empty alphanumeric with colons) */
const cacheKeyArb = fc.tuple(
  endpointTypeArb,
  fc.string({ minLength: 1, maxLength: 30 }).map((s) => s.replace(/[^a-zA-Z0-9.:_-]/g, 'x'))
).map(([type, suffix]) => `${type}:${suffix}`);

/** Arbitrary for place IDs (nullable) */
const placeIdArb = fc.option(
  fc.string({ minLength: 5, maxLength: 40 }).map((s) => `ChIJ${s.replace(/[^a-zA-Z0-9_-]/g, 'a')}`),
  { nil: null }
);

// --- Tests ---

beforeEach(() => {
  memoryStore = {};
});

describe('Feature: google-places-integration, Property 1: Cache round-trip preserves data', () => {
  it('storing and retrieving by the same cache key produces JSON-equal data', async () => {
    await fc.assert(
      fc.asyncProperty(
        cacheKeyArb,
        placeIdArb,
        endpointTypeArb,
        jsonArb,
        async (cacheKey, placeId, endpointType, responseData) => {
          // Clear store before each iteration
          memoryStore = {};

          // Store data with a generous TTL so it won't expire
          await cacheService.set(cacheKey, placeId, endpointType, responseData, 3600);

          // Retrieve data
          const cached = await cacheService.get(cacheKey);

          // Should not be null
          expect(cached).not.toBeNull();

          // The response_data should be JSON-equal to what we stored
          expect(cached!.response_data).toEqual(responseData);

          // Other fields should also match
          expect(cached!.cache_key).toBe(cacheKey);
          expect(cached!.place_id).toBe(placeId);
          expect(cached!.endpoint_type).toBe(endpointType);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: google-places-integration, Property 4: Cache TTL correctness', () => {
  it('cache lookup returns data if and only if current time is strictly before expires_at', async () => {
    await fc.assert(
      fc.asyncProperty(
        cacheKeyArb,
        endpointTypeArb,
        jsonArb,
        // TTL between 1 and 7200 seconds
        fc.integer({ min: 1, max: 7200 }),
        // Offset from "now" to simulate time passage: negative = before expiry, positive = after expiry
        fc.integer({ min: -7200, max: 7200 }),
        async (cacheKey, endpointType, responseData, ttlSeconds, timeOffsetSeconds) => {
          memoryStore = {};

          // Fix the "storage time" to a known value
          const storageTime = new Date('2025-01-15T12:00:00.000Z');
          const expiresAt = new Date(storageTime.getTime() + ttlSeconds * 1000);

          // Manually insert into the in-memory store to control expires_at precisely
          const id = `test-${Math.random().toString(36).slice(2)}`;
          memoryStore[id] = {
            id,
            cache_key: cacheKey,
            place_id: null,
            endpoint_type: endpointType,
            response_data: responseData,
            created_at: storageTime.toISOString(),
            expires_at: expiresAt.toISOString(),
          };

          // The "current time" for the lookup
          const lookupTime = new Date(expiresAt.getTime() + timeOffsetSeconds * 1000);

          // Mock Date to control "now" during the get() call
          const originalDate = globalThis.Date;
          const MockDate = class extends originalDate {
            constructor(...args: any[]) {
              if (args.length === 0) {
                super(lookupTime.getTime());
              } else {
                // @ts-ignore
                super(...args);
              }
            }
            static now() {
              return lookupTime.getTime();
            }
          } as any;
          // Preserve static methods
          MockDate.parse = originalDate.parse;
          MockDate.UTC = originalDate.UTC;

          globalThis.Date = MockDate;

          try {
            const result = await cacheService.get(cacheKey);

            if (timeOffsetSeconds < 0) {
              // Current time is BEFORE expiry → should be a cache hit
              expect(result).not.toBeNull();
              expect(result!.response_data).toEqual(responseData);
            } else {
              // Current time is AT or AFTER expiry → should be a cache miss
              expect(result).toBeNull();
            }
          } finally {
            globalThis.Date = originalDate;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

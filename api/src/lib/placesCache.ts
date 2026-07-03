import { supabaseAdmin } from './supabase';

// --- Interfaces ---

export interface CachedEntry {
  id: string;
  cache_key: string;
  place_id: string | null;
  response_data: unknown;
  endpoint_type: string;
  created_at: string;
  expires_at: string;
}

export interface CacheService {
  get(cacheKey: string): Promise<CachedEntry | null>;
  set(
    cacheKey: string,
    placeId: string | null,
    endpointType: string,
    data: unknown,
    ttlSeconds?: number
  ): Promise<void>;
  buildKey(endpointType: string, params: Record<string, unknown>): string;
  cleanup(): Promise<number>;
}

// --- Constants ---

const DEFAULT_TTL_SECONDS = 86400; // 24 hours
const CLEANUP_THRESHOLD = 10000;

// --- Helpers ---

/**
 * Round a coordinate value to 3 decimal places (~111m precision).
 * Uses Math.round to avoid floating point drift.
 */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Build a deterministic cache key from an endpoint type and parameters.
 *
 * Cache Key Patterns:
 *  - nearby:{lat}:{lng}:{radius}:{type}:{keyword}
 *  - search:{query}:{lat}:{lng}:{radius}:{type}:{openNow}:{pageToken}
 *  - details:{placeId}
 */
export function buildCacheKey(
  endpointType: string,
  params: Record<string, unknown>
): string {
  switch (endpointType) {
    case 'nearby': {
      const lat = params.lat != null ? roundCoordinate(Number(params.lat)) : '';
      const lng = params.lng != null ? roundCoordinate(Number(params.lng)) : '';
      const radius = params.radius ?? '';
      const type = params.type ?? '';
      const keyword = params.keyword ?? '';
      return `nearby:${lat}:${lng}:${radius}:${type}:${keyword}`;
    }
    case 'search': {
      const query = params.query ?? '';
      const lat = params.lat != null ? roundCoordinate(Number(params.lat)) : '';
      const lng = params.lng != null ? roundCoordinate(Number(params.lng)) : '';
      const radius = params.radius ?? '';
      const type = params.type ?? '';
      const openNow = params.openNow ?? '';
      const pageToken = params.pageToken ?? '';
      return `search:${query}:${lat}:${lng}:${radius}:${type}:${openNow}:${pageToken}`;
    }
    case 'details': {
      const placeId = params.placeId ?? '';
      return `details:${placeId}`;
    }
    default: {
      // Fallback: join all param values sorted by key
      const parts = Object.keys(params)
        .sort()
        .map((k) => {
          const v = params[k];
          if (typeof v === 'number' && (k === 'lat' || k === 'lng')) {
            return roundCoordinate(v);
          }
          return v ?? '';
        });
      return `${endpointType}:${parts.join(':')}`;
    }
  }
}

// --- CacheService Implementation ---

export const cacheService: CacheService = {
  /**
   * Retrieve a cached entry by key. Returns null if not found or expired.
   */
  async get(cacheKey: string): Promise<CachedEntry | null> {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('places_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', now)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as CachedEntry;
  },

  /**
   * Store or update a cache entry. Triggers cleanup if threshold exceeded.
   */
  async set(
    cacheKey: string,
    placeId: string | null,
    endpointType: string,
    data: unknown,
    ttlSeconds: number = DEFAULT_TTL_SECONDS
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const { error } = await supabaseAdmin.from('places_cache').upsert(
      {
        cache_key: cacheKey,
        place_id: placeId,
        endpoint_type: endpointType,
        response_data: data,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'cache_key' }
    );

    if (error) {
      console.error('[CacheService] Failed to set cache entry:', error.message);
    }

    // Trigger cleanup if table exceeds threshold
    try {
      const { count } = await supabaseAdmin
        .from('places_cache')
        .select('*', { count: 'exact', head: true });

      if (count != null && count > CLEANUP_THRESHOLD) {
        await cacheService.cleanup();
      }
    } catch (err) {
      // Non-critical: cleanup failure shouldn't break the set operation
      console.error('[CacheService] Cleanup check failed:', err);
    }
  },

  /**
   * Build a deterministic cache key for the given endpoint type and params.
   */
  buildKey(endpointType: string, params: Record<string, unknown>): string {
    return buildCacheKey(endpointType, params);
  },

  /**
   * Delete expired entries from the cache. Returns the number of deleted rows.
   */
  async cleanup(): Promise<number> {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('places_cache')
      .delete()
      .lte('expires_at', now)
      .select('id');

    if (error) {
      console.error('[CacheService] Cleanup failed:', error.message);
      return 0;
    }

    const deletedCount = data?.length ?? 0;
    if (deletedCount > 0) {
      console.log(`[CacheService] Cleaned up ${deletedCount} expired entries`);
    }

    return deletedCount;
  },
};

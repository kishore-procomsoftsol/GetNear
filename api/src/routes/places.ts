import { Router, Request, Response, NextFunction } from 'express';
import { placesLimiter } from '../middleware/placesRateLimit';
import { cacheService } from '../lib/placesCache';
import * as googlePlaces from '../lib/googlePlaces';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// Apply rate limiter to all places routes
router.use(placesLimiter);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validate that a string looks like a Google Place ID.
 * Google Place IDs start with "ChIJ" or are alphanumeric strings of reasonable length.
 */
function isValidPlaceId(id: string): boolean {
  return /^[A-Za-z0-9_-]{20,300}$/.test(id);
}

/**
 * Async route wrapper that forwards errors to the Express error handler.
 */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ---------------------------------------------------------------------------
// GET /places/nearby
// ---------------------------------------------------------------------------

router.get(
  '/nearby',
  asyncHandler(async (req, res) => {
    const { lat, lng, radius, type, keyword } = req.query;

    // Validate required params
    if (lat == null || lat === '' || lng == null || lng === '') {
      return sendError(res, 'VALIDATION_ERROR', 'lat and lng are required', 400);
    }

    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return sendError(res, 'VALIDATION_ERROR', 'lat and lng must be valid numbers', 400);
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return sendError(res, 'VALIDATION_ERROR', 'lat must be between -90 and 90, lng between -180 and 180', 400);
    }

    // Radius: default 5000, max 50000
    let radiusNum = 5000;
    if (radius != null && radius !== '') {
      radiusNum = parseFloat(radius as string);
      if (isNaN(radiusNum) || radiusNum <= 0) {
        return sendError(res, 'VALIDATION_ERROR', 'radius must be a positive number', 400);
      }
      radiusNum = Math.min(radiusNum, 50000);
    }

    // Build cache key
    const cacheKey = cacheService.buildKey('nearby', {
      lat: latNum,
      lng: lngNum,
      radius: radiusNum,
      type: type || undefined,
      keyword: keyword || undefined,
    });

    // Cache-first pattern
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      const data = cached.response_data as googlePlaces.PlaceSummary[];
      return sendSuccess(res, data.slice(0, 10));
    }

    // Cache miss — call Google
    const result = await googlePlaces.nearbySearch({
      lat: latNum,
      lng: lngNum,
      radius: radiusNum,
      type: type as string | undefined,
      keyword: keyword as string | undefined,
    });

    // Cap at 10 items
    const places = result.places.slice(0, 10);

    // Store in cache (use first place's ID if available)
    const firstPlaceId = places.length > 0 ? places[0].placeId : null;
    await cacheService.set(cacheKey, firstPlaceId, 'nearby', places);

    return sendSuccess(res, places);
  })
);

// ---------------------------------------------------------------------------
// GET /places/search
// ---------------------------------------------------------------------------

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { q, lat, lng, radius, type, openNow, pageToken } = req.query;

    // Validate required params
    if (!q || (q as string).trim() === '') {
      return sendError(res, 'VALIDATION_ERROR', 'q (search query) is required', 400);
    }

    const query = (q as string).trim();

    // Optional lat/lng
    let latNum: number | undefined;
    let lngNum: number | undefined;

    if (lat != null && lat !== '') {
      latNum = parseFloat(lat as string);
      if (isNaN(latNum)) {
        return sendError(res, 'VALIDATION_ERROR', 'lat must be a valid number', 400);
      }
    }
    if (lng != null && lng !== '') {
      lngNum = parseFloat(lng as string);
      if (isNaN(lngNum)) {
        return sendError(res, 'VALIDATION_ERROR', 'lng must be a valid number', 400);
      }
    }

    // Optional radius (default 5000)
    let radiusNum: number | undefined;
    if (radius != null && radius !== '') {
      radiusNum = parseFloat(radius as string);
      if (isNaN(radiusNum) || radiusNum <= 0) {
        return sendError(res, 'VALIDATION_ERROR', 'radius must be a positive number', 400);
      }
    } else if (latNum !== undefined && lngNum !== undefined) {
      radiusNum = 5000;
    }

    // Optional openNow
    const openNowBool = openNow === 'true' || openNow === '1';

    // Build cache key
    const cacheKey = cacheService.buildKey('search', {
      query,
      lat: latNum,
      lng: lngNum,
      radius: radiusNum,
      type: type || undefined,
      openNow: openNowBool || undefined,
      pageToken: pageToken || undefined,
    });

    // Cache-first pattern
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      const cachedData = cached.response_data as {
        places: googlePlaces.PlaceSummary[];
        nextPageToken?: string;
      };
      const meta: { nextPageToken?: string } = {};
      if (cachedData.nextPageToken) meta.nextPageToken = cachedData.nextPageToken;
      res.status(200).json({ data: cachedData.places, meta, error: null });
      return;
    }

    // Cache miss — call Google
    const result = await googlePlaces.textSearch({
      query,
      lat: latNum,
      lng: lngNum,
      radius: radiusNum,
      type: type as string | undefined,
      openNow: openNowBool,
      pageToken: pageToken as string | undefined,
    });

    // Store in cache
    const firstPlaceId = result.places.length > 0 ? result.places[0].placeId : null;
    await cacheService.set(cacheKey, firstPlaceId, 'search', {
      places: result.places,
      nextPageToken: result.nextPageToken,
    });

    const meta: { nextPageToken?: string } = {};
    if (result.nextPageToken) meta.nextPageToken = result.nextPageToken;

    res.status(200).json({ data: result.places, meta, error: null });
  })
);

// ---------------------------------------------------------------------------
// GET /places/photo
// NOTE: Must be registered BEFORE /:placeId to avoid being caught by the
//       dynamic param route.
// ---------------------------------------------------------------------------

router.get(
  '/photo',
  asyncHandler(async (req, res) => {
    const { ref, maxWidth } = req.query;

    // Validate required ref param
    if (!ref || (ref as string).trim() === '') {
      return sendError(res, 'VALIDATION_ERROR', 'ref (photo reference) is required', 400);
    }

    // Optional maxWidth (default 400, max 1600)
    let maxWidthNum = 400;
    if (maxWidth != null && maxWidth !== '') {
      maxWidthNum = parseInt(maxWidth as string, 10);
      if (isNaN(maxWidthNum) || maxWidthNum <= 0) {
        maxWidthNum = 400;
      }
      maxWidthNum = Math.min(maxWidthNum, 1600);
    }

    // Proxy image from Google (no DB caching — browser caches via headers)
    const imageBuffer = await googlePlaces.placePhoto(
      ref as string,
      maxWidthNum
    );

    // Set cache headers for browser caching
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Content-Type', 'image/jpeg');
    res.send(imageBuffer);
  })
);

// ---------------------------------------------------------------------------
// GET /places/:placeId
// ---------------------------------------------------------------------------

router.get(
  '/:placeId',
  asyncHandler(async (req, res) => {
    const { placeId } = req.params;

    // Validate placeId format
    if (!placeId || !isValidPlaceId(placeId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid place ID format', 400);
    }

    // Build cache key
    const cacheKey = cacheService.buildKey('details', { placeId });

    // Cache-first pattern
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      const details = cached.response_data as googlePlaces.PlaceDetailsResult;
      // Cap reviews at 5
      if (details.reviews && details.reviews.length > 5) {
        details.reviews = details.reviews.slice(0, 5);
      }
      return sendSuccess(res, details);
    }

    // Cache miss — call Google with standard fields
    const fields = [
      'place_id',
      'name',
      'formatted_address',
      'formatted_phone_number',
      'international_phone_number',
      'website',
      'rating',
      'user_ratings_total',
      'opening_hours',
      'reviews',
      'photos',
      'business_status',
      'types',
      'geometry',
    ];

    const details = await googlePlaces.placeDetails(placeId, fields);

    // Cap reviews at 5
    if (details.reviews && details.reviews.length > 5) {
      details.reviews = details.reviews.slice(0, 5);
    }

    // Store in cache
    await cacheService.set(cacheKey, placeId, 'details', details);

    return sendSuccess(res, details);
  })
);

export default router;

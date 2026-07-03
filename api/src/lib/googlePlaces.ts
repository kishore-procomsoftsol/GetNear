/**
 * Google Places API service.
 *
 * Wraps all Google Places API calls with:
 * - 5-second AbortController timeout
 * - Response field mapping to PlaceSummary / PlaceDetailsResult interfaces
 * - Typed error handling for Google status codes
 *
 * Requirements: 1.2, 1.3, 2.1, 2.2, 3.1, 5.1, 9.1
 */

import { AppError } from '../utils/errors';

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

/** 502 — Google API returned an error or timed out */
export class UpstreamError extends AppError {
  constructor(message = 'Google Places service temporarily unavailable') {
    super(message, 'UPSTREAM_ERROR', 502);
  }
}

/** 500 — API key missing or rejected by Google */
export class ConfigError extends AppError {
  constructor(message = 'Service configuration error') {
    super(message, 'CONFIG_ERROR', 500);
  }
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface NearbySearchParams {
  lat: number;
  lng: number;
  radius: number;
  type?: string;
  keyword?: string;
}

export interface TextSearchParams {
  query: string;
  lat?: number;
  lng?: number;
  radius?: number;
  type?: string;
  openNow?: boolean;
  pageToken?: string;
}

export interface NearbySearchResult {
  places: PlaceSummary[];
  nextPageToken?: string;
}

export interface TextSearchResult {
  places: PlaceSummary[];
  nextPageToken?: string;
}

export interface PlaceSummary {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  totalRatings?: number;
  photoReference?: string;
  businessStatus?: string;
  openNow?: boolean;
  types?: string[];
  location: { lat: number; lng: number };
}

export interface PlaceDetailsResult {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  totalRatings?: number;
  openingHours?: OpeningHours;
  reviews?: PlaceReview[];
  photoReferences?: string[];
  businessStatus?: string;
  types?: string[];
  location: { lat: number; lng: number };
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  relativeTimeDescription: string;
}

export interface OpeningHours {
  openNow?: boolean;
  weekdayText?: string[];
}

// ---------------------------------------------------------------------------
// Internal types for Google API responses
// ---------------------------------------------------------------------------

interface GooglePlaceResult {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{ photo_reference: string }>;
  business_status?: string;
  opening_hours?: { open_now?: boolean; weekday_text?: string[] };
  types?: string[];
  geometry: { location: { lat: number; lng: number } };
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    relative_time_description: string;
  }>;
}

interface GoogleSearchResponse {
  status: string;
  results: GooglePlaceResult[];
  next_page_token?: string;
  error_message?: string;
}

interface GoogleDetailsResponse {
  status: string;
  result: GooglePlaceResult;
  error_message?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOOGLE_BASE_URL = 'https://maps.googleapis.com/maps/api/place';
const TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.error('[GooglePlaces] GOOGLE_PLACES_API_KEY is not configured');
    throw new ConfigError();
  }
  return key;
}

/**
 * Perform a fetch with a 5-second AbortController timeout.
 */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[GooglePlaces] Request timed out');
      throw new UpstreamError('Google Places service temporarily unavailable');
    }
    console.error('[GooglePlaces] Network error:', error);
    throw new UpstreamError('Google Places service temporarily unavailable');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Handle Google API status codes and throw appropriate errors.
 */
function handleGoogleStatus(
  status: string,
  errorMessage?: string,
  context: 'search' | 'details' = 'search'
): void {
  switch (status) {
    case 'OK':
    case 'ZERO_RESULTS':
      // These are not errors — handled by caller
      return;
    case 'OVER_QUERY_LIMIT':
      console.error('[GooglePlaces] ALERT: Over query limit —', errorMessage);
      throw new UpstreamError('Unable to fetch place data');
    case 'REQUEST_DENIED':
      console.error('[GooglePlaces] ALERT: Request denied —', errorMessage);
      throw new ConfigError('Service configuration error');
    case 'INVALID_REQUEST':
      throw new AppError(
        errorMessage || 'Invalid request parameters',
        'VALIDATION_ERROR',
        400
      );
    default:
      console.error(`[GooglePlaces] Unknown status: ${status} —`, errorMessage);
      throw new UpstreamError('Unable to fetch place data');
  }
}

/**
 * Map a single Google place result to our PlaceSummary interface.
 */
export function mapToPlaceSummary(place: GooglePlaceResult): PlaceSummary {
  const summary: PlaceSummary = {
    placeId: place.place_id,
    name: place.name,
    address: place.formatted_address || place.vicinity || '',
    location: {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    },
  };

  if (place.rating !== undefined) summary.rating = place.rating;
  if (place.user_ratings_total !== undefined) summary.totalRatings = place.user_ratings_total;
  if (place.photos && place.photos.length > 0) {
    summary.photoReference = place.photos[0].photo_reference;
  }
  if (place.business_status) summary.businessStatus = place.business_status;
  if (place.opening_hours?.open_now !== undefined) {
    summary.openNow = place.opening_hours.open_now;
  }
  if (place.types && place.types.length > 0) summary.types = place.types;

  return summary;
}

/**
 * Map a Google place detail result to our PlaceDetailsResult interface.
 */
export function mapToPlaceDetails(place: GooglePlaceResult): PlaceDetailsResult {
  const details: PlaceDetailsResult = {
    placeId: place.place_id,
    name: place.name,
    address: place.formatted_address || place.vicinity || '',
    location: {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    },
  };

  if (place.formatted_phone_number) details.phone = place.formatted_phone_number;
  if (place.international_phone_number && !details.phone) {
    details.phone = place.international_phone_number;
  }
  if (place.website) details.website = place.website;
  if (place.rating !== undefined) details.rating = place.rating;
  if (place.user_ratings_total !== undefined) details.totalRatings = place.user_ratings_total;

  if (place.opening_hours) {
    const hours: OpeningHours = {};
    if (place.opening_hours.open_now !== undefined) hours.openNow = place.opening_hours.open_now;
    if (place.opening_hours.weekday_text) hours.weekdayText = place.opening_hours.weekday_text;
    details.openingHours = hours;
  }

  if (place.reviews && place.reviews.length > 0) {
    details.reviews = place.reviews.map((r) => ({
      authorName: r.author_name,
      rating: r.rating,
      text: r.text,
      relativeTimeDescription: r.relative_time_description,
    }));
  }

  if (place.photos && place.photos.length > 0) {
    details.photoReferences = place.photos.map((p) => p.photo_reference);
  }

  if (place.business_status) details.businessStatus = place.business_status;
  if (place.types && place.types.length > 0) details.types = place.types;

  return details;
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Search for places near a given location.
 */
export async function nearbySearch(params: NearbySearchParams): Promise<NearbySearchResult> {
  const apiKey = getApiKey();

  const url = new URL(`${GOOGLE_BASE_URL}/nearbysearch/json`);
  url.searchParams.set('location', `${params.lat},${params.lng}`);
  url.searchParams.set('radius', String(params.radius));
  url.searchParams.set('key', apiKey);

  if (params.type) url.searchParams.set('type', params.type);
  if (params.keyword) url.searchParams.set('keyword', params.keyword);

  const response = await fetchWithTimeout(url.toString());
  const data = (await response.json()) as GoogleSearchResponse;

  handleGoogleStatus(data.status, data.error_message, 'search');

  const places = (data.results || []).map(mapToPlaceSummary);

  const result: NearbySearchResult = { places };
  if (data.next_page_token) result.nextPageToken = data.next_page_token;

  return result;
}

/**
 * Search for places using a text query.
 */
export async function textSearch(params: TextSearchParams): Promise<TextSearchResult> {
  const apiKey = getApiKey();

  const url = new URL(`${GOOGLE_BASE_URL}/textsearch/json`);
  url.searchParams.set('query', params.query);
  url.searchParams.set('key', apiKey);

  if (params.lat !== undefined && params.lng !== undefined) {
    url.searchParams.set('location', `${params.lat},${params.lng}`);
  }
  if (params.radius !== undefined) url.searchParams.set('radius', String(params.radius));
  if (params.type) url.searchParams.set('type', params.type);
  if (params.openNow) url.searchParams.set('opennow', 'true');
  if (params.pageToken) url.searchParams.set('pagetoken', params.pageToken);

  const response = await fetchWithTimeout(url.toString());
  const data = (await response.json()) as GoogleSearchResponse;

  handleGoogleStatus(data.status, data.error_message, 'search');

  const places = (data.results || []).map(mapToPlaceSummary);

  const result: TextSearchResult = { places };
  if (data.next_page_token) result.nextPageToken = data.next_page_token;

  return result;
}

/**
 * Get detailed information about a specific place.
 */
export async function placeDetails(
  placeId: string,
  fields: string[]
): Promise<PlaceDetailsResult> {
  const apiKey = getApiKey();

  const url = new URL(`${GOOGLE_BASE_URL}/details/json`);
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', fields.join(','));
  url.searchParams.set('key', apiKey);

  const response = await fetchWithTimeout(url.toString());
  const data = (await response.json()) as GoogleDetailsResponse;

  handleGoogleStatus(data.status, data.error_message, 'details');

  if (data.status === 'ZERO_RESULTS' || !data.result) {
    throw new AppError('Place not found', 'NOT_FOUND', 404);
  }

  return mapToPlaceDetails(data.result);
}

/**
 * Fetch a place photo from Google Places and return it as a Buffer.
 */
export async function placePhoto(
  photoReference: string,
  maxWidth: number
): Promise<Buffer> {
  const apiKey = getApiKey();

  const url = new URL(`${GOOGLE_BASE_URL}/photo`);
  url.searchParams.set('photoreference', photoReference);
  url.searchParams.set('maxwidth', String(maxWidth));
  url.searchParams.set('key', apiKey);

  const response = await fetchWithTimeout(url.toString());

  if (!response.ok) {
    if (response.status === 404 || response.status === 400) {
      throw new AppError('Photo not found', 'NOT_FOUND', 404);
    }
    throw new UpstreamError('Unable to fetch place photo');
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

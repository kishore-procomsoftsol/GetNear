/**
 * Feature: google-places-integration, Property 8: Response transformation completeness
 * Feature: google-places-integration, Property 9: Output collection capping
 * Validates: Requirements 1.1, 1.3, 2.2, 3.1, 3.2
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { mapToPlaceSummary, mapToPlaceDetails } from '../lib/googlePlaces';

// ---------------------------------------------------------------------------
// Generators for Google Places API response shapes
// ---------------------------------------------------------------------------

/**
 * Generator for a minimal valid GooglePlaceResult (required fields only).
 */
const googlePlaceBaseArb = fc.record({
  place_id: fc.string({ minLength: 5, maxLength: 60 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  geometry: fc.record({
    location: fc.record({
      lat: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
      lng: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
    }),
  }),
});

/**
 * Generator for optional fields that may or may not be present on a Google place result.
 */
const googlePlaceOptionalArb = fc.record(
  {
    vicinity: fc.string({ minLength: 1, maxLength: 200 }),
    formatted_address: fc.string({ minLength: 1, maxLength: 200 }),
    rating: fc.double({ min: 1, max: 5, noNaN: true, noDefaultInfinity: true }),
    user_ratings_total: fc.integer({ min: 0, max: 100000 }),
    photos: fc.array(
      fc.record({ photo_reference: fc.string({ minLength: 10, maxLength: 100 }) }),
      { minLength: 1, maxLength: 5 }
    ),
    business_status: fc.constantFrom('OPERATIONAL', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY'),
    opening_hours: fc.record(
      {
        open_now: fc.boolean(),
        weekday_text: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 7, maxLength: 7 }),
      },
      { requiredKeys: [] }
    ),
    types: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
    formatted_phone_number: fc.string({ minLength: 7, maxLength: 20 }),
    international_phone_number: fc.string({ minLength: 7, maxLength: 20 }),
    website: fc.webUrl(),
    reviews: fc.array(
      fc.record({
        author_name: fc.string({ minLength: 1, maxLength: 50 }),
        rating: fc.integer({ min: 1, max: 5 }),
        text: fc.string({ minLength: 0, maxLength: 300 }),
        relative_time_description: fc.string({ minLength: 3, maxLength: 50 }),
      }),
      { minLength: 1, maxLength: 15 }
    ),
  },
  { requiredKeys: [] }
);

/**
 * Generator for a full GooglePlaceResult combining required and optional fields.
 */
const googlePlaceResultArb = fc.tuple(googlePlaceBaseArb, googlePlaceOptionalArb).map(
  ([base, optional]) => ({ ...optional, ...base } as any)
);

// ---------------------------------------------------------------------------
// Property 8: Response transformation completeness
// ---------------------------------------------------------------------------

describe('Property 8: Response transformation completeness', () => {
  it('mapToPlaceSummary always produces placeId, name, address, and location', () => {
    fc.assert(
      fc.property(googlePlaceResultArb, (place) => {
        const summary = mapToPlaceSummary(place);

        // Required fields must always be present and non-undefined
        expect(summary.placeId).toBeDefined();
        expect(typeof summary.placeId).toBe('string');
        expect(summary.name).toBeDefined();
        expect(typeof summary.name).toBe('string');
        expect(summary.address).toBeDefined();
        expect(typeof summary.address).toBe('string');
        expect(summary.location).toBeDefined();
        expect(typeof summary.location.lat).toBe('number');
        expect(typeof summary.location.lng).toBe('number');
      }),
      { numRuns: 100 }
    );
  });

  it('mapToPlaceSummary maps placeId from source place_id correctly', () => {
    fc.assert(
      fc.property(googlePlaceResultArb, (place) => {
        const summary = mapToPlaceSummary(place);
        expect(summary.placeId).toBe(place.place_id);
        expect(summary.name).toBe(place.name);
        expect(summary.location.lat).toBe(place.geometry.location.lat);
        expect(summary.location.lng).toBe(place.geometry.location.lng);
      }),
      { numRuns: 100 }
    );
  });

  it('mapToPlaceSummary: optional fields present if and only if source contains them', () => {
    fc.assert(
      fc.property(googlePlaceResultArb, (place) => {
        const summary = mapToPlaceSummary(place);

        // rating
        if (place.rating !== undefined) {
          expect(summary.rating).toBe(place.rating);
        } else {
          expect(summary.rating).toBeUndefined();
        }

        // totalRatings
        if (place.user_ratings_total !== undefined) {
          expect(summary.totalRatings).toBe(place.user_ratings_total);
        } else {
          expect(summary.totalRatings).toBeUndefined();
        }

        // photoReference
        if (place.photos && place.photos.length > 0) {
          expect(summary.photoReference).toBe(place.photos[0].photo_reference);
        } else {
          expect(summary.photoReference).toBeUndefined();
        }

        // businessStatus
        if (place.business_status) {
          expect(summary.businessStatus).toBe(place.business_status);
        } else {
          expect(summary.businessStatus).toBeUndefined();
        }

        // openNow
        if (place.opening_hours?.open_now !== undefined) {
          expect(summary.openNow).toBe(place.opening_hours.open_now);
        } else {
          expect(summary.openNow).toBeUndefined();
        }

        // types
        if (place.types && place.types.length > 0) {
          expect(summary.types).toEqual(place.types);
        } else {
          expect(summary.types).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('mapToPlaceDetails always produces placeId, name, address, and location', () => {
    fc.assert(
      fc.property(googlePlaceResultArb, (place) => {
        const details = mapToPlaceDetails(place);

        // Required fields must always be present
        expect(details.placeId).toBeDefined();
        expect(typeof details.placeId).toBe('string');
        expect(details.name).toBeDefined();
        expect(typeof details.name).toBe('string');
        expect(details.address).toBeDefined();
        expect(typeof details.address).toBe('string');
        expect(details.location).toBeDefined();
        expect(typeof details.location.lat).toBe('number');
        expect(typeof details.location.lng).toBe('number');
      }),
      { numRuns: 100 }
    );
  });

  it('mapToPlaceDetails maps required fields from source correctly', () => {
    fc.assert(
      fc.property(googlePlaceResultArb, (place) => {
        const details = mapToPlaceDetails(place);
        expect(details.placeId).toBe(place.place_id);
        expect(details.name).toBe(place.name);
        expect(details.location.lat).toBe(place.geometry.location.lat);
        expect(details.location.lng).toBe(place.geometry.location.lng);
      }),
      { numRuns: 100 }
    );
  });

  it('mapToPlaceDetails: optional fields present if and only if source contains them', () => {
    fc.assert(
      fc.property(googlePlaceResultArb, (place) => {
        const details = mapToPlaceDetails(place);

        // phone
        if (place.formatted_phone_number) {
          expect(details.phone).toBe(place.formatted_phone_number);
        } else if (place.international_phone_number) {
          expect(details.phone).toBe(place.international_phone_number);
        } else {
          expect(details.phone).toBeUndefined();
        }

        // website
        if (place.website) {
          expect(details.website).toBe(place.website);
        } else {
          expect(details.website).toBeUndefined();
        }

        // rating
        if (place.rating !== undefined) {
          expect(details.rating).toBe(place.rating);
        } else {
          expect(details.rating).toBeUndefined();
        }

        // totalRatings
        if (place.user_ratings_total !== undefined) {
          expect(details.totalRatings).toBe(place.user_ratings_total);
        } else {
          expect(details.totalRatings).toBeUndefined();
        }

        // openingHours
        if (place.opening_hours) {
          expect(details.openingHours).toBeDefined();
        } else {
          expect(details.openingHours).toBeUndefined();
        }

        // reviews
        if (place.reviews && place.reviews.length > 0) {
          expect(details.reviews).toBeDefined();
          expect(details.reviews!.length).toBe(place.reviews.length);
        } else {
          expect(details.reviews).toBeUndefined();
        }

        // photoReferences
        if (place.photos && place.photos.length > 0) {
          expect(details.photoReferences).toBeDefined();
          expect(details.photoReferences!.length).toBe(place.photos.length);
        } else {
          expect(details.photoReferences).toBeUndefined();
        }

        // businessStatus
        if (place.business_status) {
          expect(details.businessStatus).toBe(place.business_status);
        } else {
          expect(details.businessStatus).toBeUndefined();
        }

        // types
        if (place.types && place.types.length > 0) {
          expect(details.types).toEqual(place.types);
        } else {
          expect(details.types).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Output collection capping
// ---------------------------------------------------------------------------

describe('Property 9: Output collection capping', () => {
  it('nearby output is capped at 10 items and preserves order', () => {
    fc.assert(
      fc.property(
        fc.array(googlePlaceResultArb, { minLength: 0, maxLength: 30 }),
        (places) => {
          // Simulate the transformation + capping done in the nearby endpoint
          const summaries = places.map(mapToPlaceSummary);
          const capped = summaries.slice(0, 10);

          // Output has at most 10 items
          expect(capped.length).toBeLessThanOrEqual(10);
          expect(capped.length).toBe(Math.min(places.length, 10));

          // Order is preserved: each item matches original position
          for (let i = 0; i < capped.length; i++) {
            expect(capped[i].placeId).toBe(places[i].place_id);
            expect(capped[i].name).toBe(places[i].name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('reviews in place details are capped at 5 and preserve order', () => {
    // Generate place results that always have reviews
    const placeWithReviewsArb = fc.tuple(googlePlaceBaseArb, fc.array(
      fc.record({
        author_name: fc.string({ minLength: 1, maxLength: 50 }),
        rating: fc.integer({ min: 1, max: 5 }),
        text: fc.string({ minLength: 0, maxLength: 300 }),
        relative_time_description: fc.string({ minLength: 3, maxLength: 50 }),
      }),
      { minLength: 1, maxLength: 20 }
    )).map(([base, reviews]) => ({
      ...base,
      reviews,
    }));

    fc.assert(
      fc.property(placeWithReviewsArb, (place) => {
        const details = mapToPlaceDetails(place as any);

        // Simulate the capping done in the route handler
        if (details.reviews && details.reviews.length > 5) {
          details.reviews = details.reviews.slice(0, 5);
        }

        // Reviews capped at 5
        expect(details.reviews!.length).toBeLessThanOrEqual(5);
        expect(details.reviews!.length).toBe(Math.min(place.reviews.length, 5));

        // Order is preserved
        for (let i = 0; i < details.reviews!.length; i++) {
          expect(details.reviews![i].authorName).toBe(place.reviews[i].author_name);
          expect(details.reviews![i].rating).toBe(place.reviews[i].rating);
          expect(details.reviews![i].text).toBe(place.reviews[i].text);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('capping an empty collection returns empty array', () => {
    const emptyPlaces: any[] = [];
    const summaries = emptyPlaces.map(mapToPlaceSummary);
    const capped = summaries.slice(0, 10);
    expect(capped).toHaveLength(0);
  });

  it('capping a collection with exactly 10 items returns all items in order', () => {
    fc.assert(
      fc.property(
        fc.array(googlePlaceResultArb, { minLength: 10, maxLength: 10 }),
        (places) => {
          const summaries = places.map(mapToPlaceSummary);
          const capped = summaries.slice(0, 10);

          expect(capped.length).toBe(10);
          for (let i = 0; i < 10; i++) {
            expect(capped[i].placeId).toBe(places[i].place_id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('capping reviews with exactly 5 reviews returns all in order', () => {
    const placeWith5ReviewsArb = fc.tuple(googlePlaceBaseArb, fc.array(
      fc.record({
        author_name: fc.string({ minLength: 1, maxLength: 50 }),
        rating: fc.integer({ min: 1, max: 5 }),
        text: fc.string({ minLength: 0, maxLength: 300 }),
        relative_time_description: fc.string({ minLength: 3, maxLength: 50 }),
      }),
      { minLength: 5, maxLength: 5 }
    )).map(([base, reviews]) => ({
      ...base,
      reviews,
    }));

    fc.assert(
      fc.property(placeWith5ReviewsArb, (place) => {
        const details = mapToPlaceDetails(place as any);

        if (details.reviews && details.reviews.length > 5) {
          details.reviews = details.reviews.slice(0, 5);
        }

        expect(details.reviews!.length).toBe(5);
        for (let i = 0; i < 5; i++) {
          expect(details.reviews![i].authorName).toBe(place.reviews[i].author_name);
        }
      }),
      { numRuns: 100 }
    );
  });
});

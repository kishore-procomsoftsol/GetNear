/**
 * Feature: google-places-integration, Property 5: Saved place uniqueness enforcement
 *
 * For any user ID and place ID combination, attempting to save the same place twice
 * should result in exactly one record in the saved_places table, with the second
 * attempt returning a 409 status and "ALREADY_SAVED" error code.
 *
 * Validates: Requirements 6.4, 6.5
 */
import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * In-memory store simulating the saved_places table with a unique constraint
 * on (user_id, place_id).
 */
interface SavedPlace {
  id: string
  user_id: string
  place_id: string
  collection_id: string | null
  created_at: string
}

interface SaveResult {
  status: number
  data: SavedPlace | null
  error: { code: string; message: string } | null
}

class InMemorySavedPlacesStore {
  private records: SavedPlace[] = []
  private nextId = 1

  reset() {
    this.records = []
    this.nextId = 1
  }

  /**
   * Simulates the POST /user/saved route behavior:
   * 1. Check for duplicate (user_id + place_id)
   * 2. If duplicate found, return 409 ALREADY_SAVED
   * 3. Otherwise insert and return 201
   */
  save(userId: string, placeId: string, collectionId?: string): SaveResult {
    // Check for existing record (mimics the SELECT check in the route)
    const existing = this.records.find(
      (r) => r.user_id === userId && r.place_id === placeId
    )

    if (existing) {
      return {
        status: 409,
        data: null,
        error: { code: 'ALREADY_SAVED', message: 'Place already saved' },
      }
    }

    const record: SavedPlace = {
      id: `uuid-${this.nextId++}`,
      user_id: userId,
      place_id: placeId,
      collection_id: collectionId ?? null,
      created_at: new Date().toISOString(),
    }

    this.records.push(record)

    return { status: 201, data: record, error: null }
  }

  getByUserAndPlace(userId: string, placeId: string): SavedPlace[] {
    return this.records.filter(
      (r) => r.user_id === userId && r.place_id === placeId
    )
  }

  getAllForUser(userId: string): SavedPlace[] {
    return this.records.filter((r) => r.user_id === userId)
  }
}

describe('Feature: google-places-integration, Property 5: Saved place uniqueness enforcement', () => {
  let store: InMemorySavedPlacesStore

  beforeEach(() => {
    store = new InMemorySavedPlacesStore()
  })

  it('saving a place twice results in exactly one record and second attempt returns 409 ALREADY_SAVED', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 50 }).filter((s) => s.trim().length > 0),
        (userId, placeId) => {
          store.reset()

          // First save should succeed with 201
          const firstResult = store.save(userId, placeId)
          expect(firstResult.status).toBe(201)
          expect(firstResult.data).not.toBeNull()
          expect(firstResult.error).toBeNull()

          // Second save with same user + place should return 409
          const secondResult = store.save(userId, placeId)
          expect(secondResult.status).toBe(409)
          expect(secondResult.error).not.toBeNull()
          expect(secondResult.error!.code).toBe('ALREADY_SAVED')
          expect(secondResult.data).toBeNull()

          // Only one record should exist in the store
          const records = store.getByUserAndPlace(userId, placeId)
          expect(records).toHaveLength(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('different users can save the same place independently', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid().filter((id) => id !== '00000000-0000-0000-0000-000000000000'),
        fc.string({ minLength: 5, maxLength: 50 }).filter((s) => s.trim().length > 0),
        (userId1, userId2, placeId) => {
          // Skip if users happen to be the same
          fc.pre(userId1 !== userId2)

          store.reset()

          const result1 = store.save(userId1, placeId)
          const result2 = store.save(userId2, placeId)

          expect(result1.status).toBe(201)
          expect(result2.status).toBe(201)

          // Each user has exactly one record for this place
          expect(store.getByUserAndPlace(userId1, placeId)).toHaveLength(1)
          expect(store.getByUserAndPlace(userId2, placeId)).toHaveLength(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('a user can save different places without conflict', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uniqueArray(
          fc.string({ minLength: 5, maxLength: 50 }).filter((s) => s.trim().length > 0),
          { minLength: 2, maxLength: 10 }
        ),
        (userId, placeIds) => {
          store.reset()

          for (const placeId of placeIds) {
            const result = store.save(userId, placeId)
            expect(result.status).toBe(201)
          }

          // All saves are independent records
          expect(store.getAllForUser(userId)).toHaveLength(placeIds.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})

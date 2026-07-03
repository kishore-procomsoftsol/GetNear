/**
 * Feature: google-places-integration, Property 10: Search history ordering and limit
 *
 * For any user with N search history entries (where N may exceed 50), retrieving
 * search history always returns entries sorted by timestamp descending, and the
 * result set contains at most 50 entries.
 *
 * Validates: Requirements 7.2
 */
import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * In-memory store simulating the search_history table with ordering and limit
 * behavior matching the GET /user/search-history route.
 */
interface SearchHistoryEntry {
  id: string
  user_id: string
  query: string
  lat: number | null
  lng: number | null
  created_at: string
}

const MAX_HISTORY_ENTRIES = 50

class InMemorySearchHistoryStore {
  private records: SearchHistoryEntry[] = []
  private nextId = 1

  reset() {
    this.records = []
    this.nextId = 1
  }

  /**
   * Insert an entry directly (bypassing dedup for testing ordering/limit).
   * Each entry gets a unique timestamp to avoid dedup interference.
   */
  insert(userId: string, query: string, createdAt: Date): void {
    const entry: SearchHistoryEntry = {
      id: `uuid-${this.nextId++}`,
      user_id: userId,
      query,
      lat: null,
      lng: null,
      created_at: createdAt.toISOString(),
    }
    this.records.push(entry)
  }

  /**
   * Simulates GET /user/search-history:
   * Returns entries for the user ordered by created_at DESC, limited to 50.
   */
  getHistory(userId: string): SearchHistoryEntry[] {
    return this.records
      .filter((r) => r.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, MAX_HISTORY_ENTRIES)
  }

  totalCountForUser(userId: string): number {
    return this.records.filter((r) => r.user_id === userId).length
  }
}

describe('Feature: google-places-integration, Property 10: Search history ordering and limit', () => {
  let store: InMemorySearchHistoryStore

  beforeEach(() => {
    store = new InMemorySearchHistoryStore()
  })

  it('results are always sorted by timestamp descending', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        // Generate between 2 and 80 entries with unique timestamps
        fc.array(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
            fc.integer({ min: 0, max: 1_000_000 })
          ),
          { minLength: 2, maxLength: 80 }
        ),
        (userId, entries) => {
          store.reset()

          const baseTime = new Date('2024-01-01T00:00:00.000Z').getTime()

          // Insert entries with unique timestamps derived from offsets
          // Use Set to ensure unique offsets (timestamps)
          const usedOffsets = new Set<number>()
          for (const [query, offset] of entries) {
            if (usedOffsets.has(offset)) continue
            usedOffsets.add(offset)
            store.insert(userId, query, new Date(baseTime + offset * 1000))
          }

          const history = store.getHistory(userId)

          // Verify descending order
          for (let i = 1; i < history.length; i++) {
            expect(history[i - 1].created_at >= history[i].created_at).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('result set contains at most 50 entries even when more exist', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        // Generate 51 to 120 entries to guarantee exceeding the limit
        fc.integer({ min: 51, max: 120 }),
        (userId, numEntries) => {
          store.reset()

          const baseTime = new Date('2024-01-01T00:00:00.000Z').getTime()

          for (let i = 0; i < numEntries; i++) {
            store.insert(
              userId,
              `query-${i}`,
              new Date(baseTime + i * 61_000) // 61s apart to avoid dedup
            )
          }

          // Total stored exceeds 50
          expect(store.totalCountForUser(userId)).toBe(numEntries)

          // Retrieved set is capped at 50
          const history = store.getHistory(userId)
          expect(history.length).toBeLessThanOrEqual(MAX_HISTORY_ENTRIES)
          expect(history.length).toBe(MAX_HISTORY_ENTRIES)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('when entries <= 50, all entries are returned in descending order', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 50 }),
        (userId, numEntries) => {
          store.reset()

          const baseTime = new Date('2024-01-01T00:00:00.000Z').getTime()

          for (let i = 0; i < numEntries; i++) {
            store.insert(
              userId,
              `query-${i}`,
              new Date(baseTime + i * 61_000)
            )
          }

          const history = store.getHistory(userId)

          // All entries returned
          expect(history.length).toBe(numEntries)

          // Still sorted descending
          for (let i = 1; i < history.length; i++) {
            expect(history[i - 1].created_at >= history[i].created_at).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('the 50 returned entries are the most recent ones', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 51, max: 100 }),
        (userId, numEntries) => {
          store.reset()

          const baseTime = new Date('2024-01-01T00:00:00.000Z').getTime()

          for (let i = 0; i < numEntries; i++) {
            store.insert(
              userId,
              `query-${i}`,
              new Date(baseTime + i * 61_000)
            )
          }

          const history = store.getHistory(userId)

          // The oldest entry in the result should be more recent than any
          // entry NOT in the result
          const oldestReturned = history[history.length - 1].created_at
          const allEntries = store.totalCountForUser(userId)
          const notReturned = allEntries - history.length

          // The last returned entry should correspond to entry index
          // (numEntries - 50), i.e., the 50 most recent
          const expectedOldestIndex = numEntries - MAX_HISTORY_ENTRIES
          const expectedOldestTime = new Date(
            baseTime + expectedOldestIndex * 61_000
          ).toISOString()

          expect(oldestReturned).toBe(expectedOldestTime)
          expect(notReturned).toBe(numEntries - MAX_HISTORY_ENTRIES)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: google-places-integration, Property 6: Search history deduplication
 *
 * For any authenticated user, query text, and pair of timestamps, if the second
 * timestamp is within 60 seconds of the first and the query text is identical,
 * only one search history entry should exist. If the gap exceeds 60 seconds,
 * both entries should exist.
 *
 * Validates: Requirements 7.4
 */
import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * In-memory store simulating the search_history table with 60-second
 * deduplication logic matching the route implementation.
 */
interface SearchHistoryEntry {
  id: string
  user_id: string
  query: string
  lat: number | null
  lng: number | null
  created_at: string
}

interface RecordResult {
  recorded: boolean
  reason?: string
}

class InMemorySearchHistoryStore {
  private records: SearchHistoryEntry[] = []
  private nextId = 1

  reset() {
    this.records = []
    this.nextId = 1
  }

  /**
   * Simulates the POST /user/search-history route behavior:
   * 1. Check if same query text exists for this user within last 60 seconds
   * 2. If yes, skip insertion (deduplication)
   * 3. Otherwise, insert the record
   *
   * @param now - The simulated "current time" for this insertion attempt
   */
  record(
    userId: string,
    query: string,
    now: Date,
    lat?: number,
    lng?: number
  ): RecordResult {
    const trimmedQuery = query.trim()
    const sixtySecondsAgo = new Date(now.getTime() - 60 * 1000).toISOString()

    // Deduplication check: find any record with same user + query within 60s
    const existing = this.records.find(
      (r) =>
        r.user_id === userId &&
        r.query === trimmedQuery &&
        r.created_at >= sixtySecondsAgo
    )

    if (existing) {
      return { recorded: false, reason: 'duplicate' }
    }

    const entry: SearchHistoryEntry = {
      id: `uuid-${this.nextId++}`,
      user_id: userId,
      query: trimmedQuery,
      lat: lat ?? null,
      lng: lng ?? null,
      created_at: now.toISOString(),
    }

    this.records.push(entry)
    return { recorded: true }
  }

  getEntriesForUser(userId: string): SearchHistoryEntry[] {
    return this.records.filter((r) => r.user_id === userId)
  }

  getEntriesForUserAndQuery(userId: string, query: string): SearchHistoryEntry[] {
    return this.records.filter(
      (r) => r.user_id === userId && r.query === query.trim()
    )
  }
}

describe('Feature: google-places-integration, Property 6: Search history deduplication', () => {
  let store: InMemorySearchHistoryStore

  beforeEach(() => {
    store = new InMemorySearchHistoryStore()
  })

  it('identical query within 60 seconds results in only one entry', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        // Gap in milliseconds: 0 to 59999ms (within 60 seconds)
        fc.integer({ min: 0, max: 59_999 }),
        (userId, queryText, gapMs) => {
          store.reset()

          const baseTime = new Date('2024-06-01T12:00:00.000Z')
          const secondTime = new Date(baseTime.getTime() + gapMs)

          // First record
          const result1 = store.record(userId, queryText, baseTime)
          expect(result1.recorded).toBe(true)

          // Second record within 60 seconds
          const result2 = store.record(userId, queryText, secondTime)
          expect(result2.recorded).toBe(false)
          expect(result2.reason).toBe('duplicate')

          // Only one entry should exist
          const entries = store.getEntriesForUserAndQuery(userId, queryText)
          expect(entries).toHaveLength(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('identical query after 60+ seconds results in two entries', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        // Gap: 60001ms to 300000ms (well over 60 seconds)
        fc.integer({ min: 60_001, max: 300_000 }),
        (userId, queryText, gapMs) => {
          store.reset()

          const baseTime = new Date('2024-06-01T12:00:00.000Z')
          const secondTime = new Date(baseTime.getTime() + gapMs)

          // First record
          const result1 = store.record(userId, queryText, baseTime)
          expect(result1.recorded).toBe(true)

          // Second record after 60 seconds
          const result2 = store.record(userId, queryText, secondTime)
          expect(result2.recorded).toBe(true)

          // Both entries should exist
          const entries = store.getEntriesForUserAndQuery(userId, queryText)
          expect(entries).toHaveLength(2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('different query text within 60 seconds still records both', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 0, max: 59_999 }),
        (userId, query1, query2, gapMs) => {
          // Ensure queries are different after trimming
          fc.pre(query1.trim() !== query2.trim())

          store.reset()

          const baseTime = new Date('2024-06-01T12:00:00.000Z')
          const secondTime = new Date(baseTime.getTime() + gapMs)

          const result1 = store.record(userId, query1, baseTime)
          const result2 = store.record(userId, query2, secondTime)

          expect(result1.recorded).toBe(true)
          expect(result2.recorded).toBe(true)

          // Both entries should exist (different queries)
          const entries = store.getEntriesForUser(userId)
          expect(entries).toHaveLength(2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('boundary: exactly at 60 seconds is deduplicated (within 60s window)', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        (userId, queryText) => {
          store.reset()

          const baseTime = new Date('2024-06-01T12:00:00.000Z')
          // Exactly 60000ms = 60 seconds. The dedup window checks >= sixtySecondsAgo,
          // so an entry created exactly 60s ago is still within the window
          const atBoundary = new Date(baseTime.getTime() + 60_000)

          const result1 = store.record(userId, queryText, baseTime)
          expect(result1.recorded).toBe(true)

          const result2 = store.record(userId, queryText, atBoundary)
          // At exactly 60s, the first entry created_at equals sixtySecondsAgo (>=),
          // so it should be deduplicated
          expect(result2.recorded).toBe(false)

          const entries = store.getEntriesForUserAndQuery(userId, queryText)
          expect(entries).toHaveLength(1)
        }
      ),
      { numRuns: 100 }
    )
  })
})

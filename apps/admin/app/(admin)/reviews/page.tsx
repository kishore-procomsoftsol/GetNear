'use client'

import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'

interface Review {
  id: string
  rating: number
  text: string | null
  status: string
  created_at: string
  businesses: { name: string } | null
  users: { name: string; email: string; avatar_url: string | null } | null
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  hasNextPage: boolean
}

interface Toast {
  id: number
  type: 'success' | 'error'
  message: string
}

const STATUS_OPTIONS = ['all', 'pending', 'approved', 'rejected']
const RATING_OPTIONS = [
  { label: 'All Ratings', min: '', max: '' },
  { label: '5 Stars', min: '5', max: '5' },
  { label: '4+ Stars', min: '4', max: '5' },
  { label: '3+ Stars', min: '3', max: '5' },
  { label: '2 Stars & below', min: '1', max: '2' },
  { label: '1 Star', min: '1', max: '1' },
]

function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function truncateText(text: string | null, maxLength: number = 80): string {
  if (!text) return '—'
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    hasNextPage: false,
  })

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState(0) // index into RATING_OPTIONS
  const [businessSearch, setBusinessSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastIdRef = useRef(0)

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editReview, setEditReview] = useState<Review | null>(null)
  const [editText, setEditText] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // Delete confirmation state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteReview, setDeleteReview] = useState<Review | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Toast helpers
  function showToast(type: 'success' | 'error', message: string) {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(businessSearch)
      setPage(1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [businessSearch])

  useEffect(() => {
    fetchReviews()
  }, [page, statusFilter, ratingFilter, debouncedSearch, startDate, endDate])

  async function fetchReviews() {
    try {
      setLoading(true)
      const params: Record<string, string> = { page: String(page), limit: '20' }

      if (statusFilter !== 'all') params.status = statusFilter

      const rating = RATING_OPTIONS[ratingFilter]
      if (rating.min) params.rating_min = rating.min
      if (rating.max) params.rating_max = rating.max

      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate

      const res = await api.get('/admin/reviews', { params })
      let data: Review[] = res.data.data ?? []

      // Client-side business name filtering
      if (debouncedSearch.trim()) {
        data = data.filter((r) =>
          r.businesses?.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
      }

      setReviews(data)
      setPagination(res.data.pagination ?? {
        page,
        pageSize: 20,
        total: 0,
        hasNextPage: false,
      })
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  // --- Moderation Actions ---

  async function handleApprove(review: Review) {
    try {
      setActionLoading(review.id)
      await api.put(`/admin/reviews/${review.id}/approve`)
      showToast('success', 'Review approved successfully')
      await fetchReviews()
    } catch (err: any) {
      const status = err.response?.status
      if (status === 404) {
        showToast('error', 'Review not found. It may have been deleted.')
      } else {
        showToast('error', err.response?.data?.error?.message || 'Failed to approve review')
      }
    } finally {
      setActionLoading(null)
    }
  }

  function openEditModal(review: Review) {
    setEditReview(review)
    setEditText(review.text || '')
    setEditError(null)
    setEditModalOpen(true)
  }

  async function handleEditSubmit() {
    if (!editReview) return

    // Client-side validation
    if (editText.length === 0) {
      setEditError('Review text cannot be empty.')
      return
    }
    if (editText.length > 1000) {
      setEditError('Review text cannot exceed 1000 characters.')
      return
    }

    try {
      setEditSaving(true)
      setEditError(null)
      await api.put(`/admin/reviews/${editReview.id}`, { text: editText })
      showToast('success', 'Review updated successfully')
      setEditModalOpen(false)
      setEditReview(null)
      await fetchReviews()
    } catch (err: any) {
      const status = err.response?.status
      if (status === 404) {
        setEditError('Review not found. It may have been deleted.')
      } else if (status === 400) {
        setEditError(err.response?.data?.error?.message || 'Validation error: check the review text.')
      } else {
        setEditError(err.response?.data?.error?.message || 'Failed to update review')
      }
    } finally {
      setEditSaving(false)
    }
  }

  function openDeleteModal(review: Review) {
    setDeleteReview(review)
    setDeleteModalOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteReview) return

    try {
      setDeleteLoading(true)
      await api.delete(`/admin/reviews/${deleteReview.id}`)
      showToast('success', 'Review deleted successfully')
      setDeleteModalOpen(false)
      setDeleteReview(null)
      await fetchReviews()
    } catch (err: any) {
      const status = err.response?.status
      setDeleteModalOpen(false)
      setDeleteReview(null)
      if (status === 404) {
        showToast('error', 'Review not found. It may have already been deleted.')
      } else {
        showToast('error', err.response?.data?.error?.message || 'Failed to delete review')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  // --- UI Helpers ---

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      approved: 'bg-green-100 text-green-700 border border-green-200',
      pending: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      rejected: 'bg-red-100 text-red-700 border border-red-200',
    }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
        {status}
      </span>
    )
  }

  function renderStars(rating: number) {
    return (
      <span className="text-sm" title={`${rating} star${rating !== 1 ? 's' : ''}`}>
        {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
      </span>
    )
  }

  function handleFilterReset() {
    setStatusFilter('all')
    setRatingFilter(0)
    setBusinessSearch('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  if (loading && page === 1 && reviews.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div>
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium animate-slide-in ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span>{toast.type === 'success' ? '✓' : '✕'}</span>
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editModalOpen && editReview && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Edit Review</h2>
            <p className="text-sm text-gray-500 mb-4">
              By {editReview.users?.name || 'Unknown'} for {editReview.businesses?.name || 'Unknown business'}
            </p>

            <textarea
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value)
                setEditError(null)
              }}
              maxLength={1000}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
              placeholder="Review text..."
            />
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs ${editText.length > 1000 ? 'text-red-500' : 'text-gray-400'}`}>
                {editText.length}/1000 characters
              </span>
              {editError && (
                <span className="text-xs text-red-600">{editError}</span>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={editSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deleteReview && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-lg">🗑️</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Delete Review</h2>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Are you sure you want to delete this review?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              By <strong>{deleteReview.users?.name || 'Unknown'}</strong> for{' '}
              <strong>{deleteReview.businesses?.name || 'Unknown'}</strong>
              {deleteReview.text && (
                <span className="block mt-1 italic text-gray-400">
                  &quot;{truncateText(deleteReview.text, 60)}&quot;
                </span>
              )}
            </p>
            <p className="text-xs text-red-600 mb-4">
              This action cannot be undone. The business rating will be recalculated.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
          <span className="text-lg">💬</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500">{pagination.total} total reviews</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          {/* Business search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={businessSearch}
              onChange={(e) => setBusinessSearch(e.target.value)}
              placeholder="Search by business name..."
              className="w-full px-3 h-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Rating filter */}
          <select
            value={ratingFilter}
            onChange={(e) => { setRatingFilter(Number(e.target.value)); setPage(1) }}
            className="h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          >
            {RATING_OPTIONS.map((option, idx) => (
              <option key={idx} value={idx}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>

          {/* Date range */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
            className="h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            placeholder="Start date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
            className="h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            placeholder="End date"
          />

          {/* Reset button */}
          <button
            onClick={handleFilterReset}
            className="h-10 px-4 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          No reviews found matching your filters.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Business</th>
                  <th className="table-header">Reviewer</th>
                  <th className="table-header">Rating</th>
                  <th className="table-header">Review</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-900">
                      {review.businesses?.name || '—'}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        {review.users?.avatar_url ? (
                          <img
                            src={review.users.avatar_url}
                            alt={review.users.name}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                            {review.users?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-sm text-gray-700">{review.users?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-yellow-500">{renderStars(review.rating)}</span>
                    </td>
                    <td className="table-cell max-w-xs">
                      <span className="text-sm text-gray-600" title={review.text || undefined}>
                        {truncateText(review.text, 80)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">
                          {getRelativeTime(review.created_at)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">{getStatusBadge(review.status)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        {(review.status === 'pending' || review.status === 'rejected') && (
                          <button
                            onClick={() => handleApprove(review)}
                            disabled={actionLoading === review.id}
                            title="Approve"
                            className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(review)}
                          disabled={actionLoading === review.id}
                          title="Edit review text"
                          className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(review)}
                          disabled={actionLoading === review.id}
                          title="Delete review"
                          className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize) || 1}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  )
}

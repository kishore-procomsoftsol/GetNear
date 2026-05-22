'use client'

import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'

interface Business {
  id: string
  name: string
  category: string
  owner_name: string
  city: string
  status: string
  verified: boolean
  created_at: string
}

const STATUS_OPTIONS = ['all', 'pending', 'active', 'rejected', 'suspended']

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchBusinesses()
  }, [statusFilter, searchQuery])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  async function fetchBusinesses() {
    try {
      setLoading(true)
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (searchQuery.trim()) params.search = searchQuery.trim()
      const res = await api.get('/admin/businesses', { params })
      setBusinesses(res.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load businesses')
    } finally {
      setLoading(false)
    }
  }

  async function handleSuspend(id: string) {
    if (!confirm('Are you sure you want to suspend this business?')) return
    try {
      await api.put(`/admin/businesses/${id}/suspend`)
      fetchBusinesses()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to suspend')
    }
  }

  async function handleVerify(id: string) {
    try {
      await api.put(`/admin/businesses/${id}/verify`)
      fetchBusinesses()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to toggle verification')
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      rejected: 'bg-red-100 text-red-700',
      suspended: 'bg-gray-100 text-gray-700',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
        <a href="/businesses/add" className="btn-primary">+ Add Business</a>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by business name or city..."
          className="w-full max-w-md px-3 h-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-6 animate-pulse">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="card p-6 text-red-600">{error}</div>
      ) : businesses.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          No businesses found{searchQuery ? ` for "${searchQuery}"` : ' for this filter'}.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Business</th>
                <th className="table-header">Category</th>
                <th className="table-header">Owner</th>
                <th className="table-header">City</th>
                <th className="table-header">Status</th>
                <th className="table-header">Verified</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {businesses.map((biz) => (
                <tr key={biz.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-gray-900">{biz.name}</td>
                  <td className="table-cell">{biz.category}</td>
                  <td className="table-cell">{biz.owner_name}</td>
                  <td className="table-cell">{biz.city}</td>
                  <td className="table-cell">{getStatusBadge(biz.status)}</td>
                  <td className="table-cell">
                    {biz.verified ? (
                      <span className="text-green-600 font-medium">✓ Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <a
                        href={`/businesses/${biz.id}`}
                        className="btn-primary text-xs px-3 py-1"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleVerify(biz.id)}
                        className="btn-secondary text-xs px-3 py-1"
                      >
                        {biz.verified ? 'Unverify' : 'Verify'}
                      </button>
                      {biz.status === 'active' && (
                        <button
                          onClick={() => handleSuspend(biz.id)}
                          className="btn-danger text-xs px-3 py-1"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

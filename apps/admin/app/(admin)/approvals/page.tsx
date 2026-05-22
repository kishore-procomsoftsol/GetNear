'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface PendingBusiness {
  id: string
  name: string
  category: string
  owner_name: string
  city: string
  created_at: string
}

export default function ApprovalsPage() {
  const [businesses, setBusinesses] = useState<PendingBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchPending()
  }, [])

  async function fetchPending() {
    try {
      setLoading(true)
      const res = await api.get('/admin/businesses', { params: { status: 'pending' } })
      setBusinesses(res.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load pending businesses')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string) {
    try {
      setActionLoading(id)
      await api.put(`/admin/businesses/${id}/approve`)
      setBusinesses((prev) => prev.filter((b) => b.id !== id))
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(id: string) {
    const reason = prompt('Rejection reason:')
    if (!reason) return
    try {
      setActionLoading(id)
      await api.put(`/admin/businesses/${id}/reject`, { reason })
      setBusinesses((prev) => prev.filter((b) => b.id !== id))
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to reject')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Pending Approvals</h1>
        <div className="card p-6 animate-pulse">
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Pending Approvals</h1>
        <div className="card p-6 text-danger">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Pending Approvals
        {businesses.length > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({businesses.length} pending)
          </span>
        )}
      </h1>

      {businesses.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          No pending approvals 🎉
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
                <th className="table-header">Submitted</th>
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
                  <td className="table-cell">
                    {new Date(biz.created_at).toLocaleDateString()}
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(biz.id)}
                        disabled={actionLoading === biz.id}
                        className="btn-primary text-xs px-3 py-1"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(biz.id)}
                        disabled={actionLoading === biz.id}
                        className="btn-danger text-xs px-3 py-1"
                      >
                        Reject
                      </button>
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

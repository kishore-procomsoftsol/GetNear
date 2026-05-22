'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function EditBusinessPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api.get(`/admin/businesses/${id}`).then((res) => {
      setBusiness(res.data.data || null)
    }).catch(() => setBusiness(null)).finally(() => setLoading(false))
  }, [id])

  const handleAction = async (action: string) => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      if (action === 'approve') {
        await api.put(`/admin/businesses/${id}/approve`)
        setBusiness({ ...business, status: 'active' })
      } else if (action === 'suspend') {
        await api.put(`/admin/businesses/${id}/suspend`)
        setBusiness({ ...business, status: 'suspended' })
      } else if (action === 'verify') {
        await api.put(`/admin/businesses/${id}/verify`)
        setBusiness({ ...business, verified: !business.verified })
      } else if (action === 'reject') {
        const reason = prompt('Rejection reason:')
        if (!reason) { setSaving(false); return }
        await api.put(`/admin/businesses/${id}/reject`, { reason })
        setBusiness({ ...business, status: 'rejected' })
      } else if (action === 'toggle_sponsored') {
        await api.put(`/admin/businesses/${id}/sponsored`)
        setBusiness({ ...business, is_sponsored: !business.is_sponsored })
      }
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || `Failed to ${action}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded mb-4" /><div className="animate-pulse h-64 w-full bg-gray-100 rounded" /></div>
  if (!business) return <div className="p-8"><p className="text-gray-500">Business not found</p><button onClick={() => router.push('/businesses')} className="btn-secondary mt-4">Back</button></div>

  const statusColors: Record<string, string> = {
    active: 'text-green-600 bg-green-50',
    pending: 'text-yellow-600 bg-yellow-50',
    rejected: 'text-red-600 bg-red-50',
    suspended: 'text-red-600 bg-red-50',
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Business Details</h1>
        <button onClick={() => router.push('/businesses')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{business.name}</h2>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[business.status] || 'text-gray-600 bg-gray-50'}`}>
              {business.status}
            </span>
            {business.verified && <span className="px-2 py-1 text-xs font-medium rounded-full text-blue-600 bg-blue-50">Verified ✓</span>}
            {business.is_sponsored && <span className="px-2 py-1 text-xs font-medium rounded-full text-yellow-700 bg-yellow-50">Sponsored ⭐</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Category:</span> <span className="text-gray-900">{business.categories?.name || '—'}</span></div>
          <div><span className="text-gray-500">Type:</span> <span className="text-gray-900 capitalize">{business.type}</span></div>
          <div><span className="text-gray-500">Phone:</span> <span className="text-gray-900">{business.phone || '—'}</span></div>
          <div><span className="text-gray-500">Email:</span> <span className="text-gray-900">{business.email || '—'}</span></div>
          <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="text-gray-900">{business.address || '—'}, {business.city || ''}</span></div>
          <div><span className="text-gray-500">Rating:</span> <span className="text-gray-900">{business.rating_avg ?? 0} ({business.review_count ?? 0} reviews)</span></div>
          <div><span className="text-gray-500">Created:</span> <span className="text-gray-900">{new Date(business.created_at).toLocaleDateString()}</span></div>
        </div>

        {business.description && (
          <div>
            <span className="text-sm text-gray-500">Description:</span>
            <p className="text-sm text-gray-900 mt-1">{business.description}</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">Action completed!</p>}

        <hr className="border-gray-100" />

        <div className="flex flex-wrap gap-2">
          <a href={`/businesses/${id}/edit`} className="btn-primary text-sm">✏️ Edit Details</a>
          {business.status === 'pending' && (
            <>
              <button onClick={() => handleAction('approve')} disabled={saving} className="btn-primary text-sm">✅ Approve</button>
              <button onClick={() => handleAction('reject')} disabled={saving} className="btn-danger text-sm">❌ Reject</button>
            </>
          )}
          {business.status === 'active' && (
            <button onClick={() => handleAction('suspend')} disabled={saving} className="btn-danger text-sm">⛔ Suspend</button>
          )}
          {business.status === 'suspended' && (
            <button onClick={() => handleAction('approve')} disabled={saving} className="btn-primary text-sm">✅ Reactivate</button>
          )}
          <button onClick={() => handleAction('verify')} disabled={saving} className="btn-secondary text-sm">
            {business.verified ? '🚫 Remove Verified' : '✓ Mark Verified'}
          </button>
          <button onClick={() => handleAction('toggle_sponsored')} disabled={saving} className="btn-secondary text-sm">
            {business.is_sponsored ? '⭐ Remove Sponsored' : '⭐ Mark Sponsored'}
          </button>
        </div>
      </div>
    </div>
  )
}

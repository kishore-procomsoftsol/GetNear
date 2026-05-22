'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api.get(`/admin/users/${id}`).then((res) => {
      setUser(res.data.data || null)
    }).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [id])

  const handleRoleChange = async (newRole: string) => {
    setSaving(true)
    setError(null)
    try {
      await api.put(`/admin/users/${id}/role`, { role: newRole })
      setUser({ ...user, role: newRole })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  const handleSuspend = async () => {
    if (!confirm('Suspend this user? They will not be able to log in.')) return
    setSaving(true)
    try {
      await api.put(`/admin/users/${id}/suspend`)
      setUser({ ...user, is_active: false })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to suspend')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded mb-4" /><div className="animate-pulse h-64 w-full bg-gray-100 rounded" /></div>
  if (!user) return <div className="p-8"><p className="text-gray-500">User not found</p><button onClick={() => router.push('/users')} className="btn-secondary mt-4">Back to Users</button></div>

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
        <button onClick={() => router.push('/users')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Name</label>
          <p className="text-sm text-gray-900">{user.name || '—'}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
          <p className="text-sm text-gray-900">{user.email || '—'}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
          <p className="text-sm text-gray-900">{user.phone || '—'}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
          <p className={`text-sm font-medium ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
            {user.is_active ? 'Active' : 'Suspended'}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Joined</label>
          <p className="text-sm text-gray-900">{new Date(user.created_at).toLocaleDateString()}</p>
        </div>

        <hr className="border-gray-100" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
          <div className="flex gap-2 flex-wrap">
            {['customer', 'business', 'agent', 'admin'].map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                disabled={saving || user.role === role}
                className={`px-3 py-1.5 text-sm rounded-lg border font-medium capitalize transition-colors ${
                  user.role === role
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                } disabled:opacity-50`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">Updated successfully!</p>}

        <hr className="border-gray-100" />

        <div className="flex gap-3">
          {user.is_active && (
            <button onClick={handleSuspend} disabled={saving} className="btn-danger text-sm">
              Suspend User
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

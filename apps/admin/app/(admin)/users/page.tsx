'use client'

import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'

interface User {
  id: string
  name: string
  phone: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

const ROLE_OPTIONS = ['all', 'customer', 'business', 'admin']

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [roleFilter, searchQuery])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  async function fetchUsers() {
    try {
      setLoading(true)
      const params: any = {}
      if (roleFilter !== 'all') params.role = roleFilter
      if (searchQuery.trim()) params.search = searchQuery.trim()
      const res = await api.get('/admin/users', { params })
      setUsers(res.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function handleSuspend(id: string) {
    if (!confirm('Are you sure you want to suspend this user?')) return
    try {
      await api.put(`/admin/users/${id}/suspend`)
      fetchUsers()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to suspend user')
    }
  }

  async function handleRoleChange(id: string, currentRole: string) {
    const newRole = prompt(`Change role (current: ${currentRole}). Enter new role (customer/business/admin):`)
    if (!newRole || !['customer', 'business', 'admin'].includes(newRole)) return
    try {
      await api.put(`/admin/users/${id}/role`, { role: newRole })
      fetchUsers()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to change role')
    }
  }

  function getRoleBadge(role: string) {
    const styles: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      business: 'bg-blue-100 text-blue-700',
      customer: 'bg-green-100 text-green-700',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role] || 'bg-gray-100 text-gray-600'}`}>
        {role}
      </span>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <a href="/users/create" className="btn-primary">+ Create User</a>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, phone, or email..."
          className="w-full max-w-md px-3 h-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Role Filter */}
      <div className="flex gap-2 mb-6">
        {ROLE_OPTIONS.map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              roleFilter === role
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
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
      ) : users.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          No users found{searchQuery ? ` for "${searchQuery}"` : ' for this filter'}.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Email</th>
                <th className="table-header">Role</th>
                <th className="table-header">Status</th>
                <th className="table-header">Joined</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-gray-900">
                    {user.name || 'Unnamed'}
                  </td>
                  <td className="table-cell">{user.phone}</td>
                  <td className="table-cell">{user.email || '—'}</td>
                  <td className="table-cell">{getRoleBadge(user.role)}</td>
                  <td className="table-cell">
                    {user.is_active ? (
                      <span className="text-green-600 text-sm">Active</span>
                    ) : (
                      <span className="text-red-600 text-sm">Suspended</span>
                    )}
                  </td>
                  <td className="table-cell">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <a
                        href={`/users/${user.id}`}
                        className="btn-primary text-xs px-3 py-1"
                      >
                        Edit
                      </a>
                      <button
                        onClick={() => handleRoleChange(user.id, user.role)}
                        className="btn-secondary text-xs px-3 py-1"
                      >
                        Role
                      </button>
                      {user.is_active && (
                        <button
                          onClick={() => handleSuspend(user.id)}
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

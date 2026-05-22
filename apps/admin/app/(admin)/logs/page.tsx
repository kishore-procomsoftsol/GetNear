'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface AdminLog {
  id: string
  admin_name: string
  action: string
  target_type: string
  target_id: string | null
  note: string | null
  created_at: string
}

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

export default function LogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [actionFilter, setActionFilter] = useState('all')
  const [adminFilter, setAdminFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [page])

  async function fetchLogs() {
    try {
      setLoading(true)
      const res = await api.get('/admin/logs', { params: { page, limit: 50 } })
      setLogs(res.data.data)
      setHasMore(res.data.data.length === 50)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  function getActionBadge(action: string) {
    const styles: Record<string, string> = {
      approve: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      reject: 'bg-red-100 text-red-700 border border-red-200',
      suspend: 'bg-orange-100 text-orange-700 border border-orange-200',
      verify: 'bg-blue-100 text-blue-700 border border-blue-200',
      role_change: 'bg-purple-100 text-purple-700 border border-purple-200',
      delete: 'bg-red-100 text-red-700 border border-red-200',
      create: 'bg-green-100 text-green-700 border border-green-200',
      resolve: 'bg-teal-100 text-teal-700 border border-teal-200',
      broadcast: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[action] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
        {action.replace('_', ' ')}
      </span>
    )
  }

  // Get unique action types and admin names for filters
  const actionTypes = ['all', ...Array.from(new Set(logs.map((l) => l.action)))]
  const adminNames = ['all', ...Array.from(new Set(logs.map((l) => l.admin_name)))]

  // Apply client-side filters
  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false
    if (adminFilter !== 'all' && log.admin_name !== adminFilter) return false
    if (searchQuery && !(log.note || '').toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  if (loading && page === 1) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Activity Logs</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Activity Logs</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-lg">📋</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Activity Logs</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by note text..."
            className="w-full px-3 h-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
        >
          {actionTypes.map((action) => (
            <option key={action} value={action}>
              {action === 'all' ? 'All Actions' : action.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          value={adminFilter}
          onChange={(e) => setAdminFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
        >
          {adminNames.map((name) => (
            <option key={name} value={name}>
              {name === 'all' ? 'All Admins' : name}
            </option>
          ))}
        </select>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          No activity logs match your filters.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Admin</th>
                  <th className="table-header">Action</th>
                  <th className="table-header">Target Type</th>
                  <th className="table-header">Target ID</th>
                  <th className="table-header">Note</th>
                  <th className="table-header">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-900">
                      {log.admin_name}
                    </td>
                    <td className="table-cell">{getActionBadge(log.action)}</td>
                    <td className="table-cell capitalize">{log.target_type}</td>
                    <td className="table-cell font-mono text-xs text-gray-500">
                      {log.target_id ? log.target_id.slice(0, 8) + '...' : '—'}
                    </td>
                    <td className="table-cell max-w-xs truncate text-gray-500">
                      {log.note || '—'}
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">
                          {getRelativeTime(log.created_at)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
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
            <span className="text-sm text-gray-500">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
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

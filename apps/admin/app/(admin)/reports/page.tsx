'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface Report {
  id: string
  reporter_name: string
  business_name: string
  reason: string
  status: string
  created_at: string
}

const STATUS_TABS = ['all', 'open', 'dismissed', 'actioned']

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    try {
      setLoading(true)
      const res = await api.get('/admin/reports')
      setReports(res.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  async function handleResolve(id: string, action: 'dismissed' | 'actioned') {
    try {
      setActionLoading(id)
      setOpenDropdown(null)
      await api.put(`/admin/reports/${id}/resolve`, { status: action })
      fetchReports()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to resolve report')
    } finally {
      setActionLoading(null)
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      open: 'bg-yellow-100 text-yellow-700',
      dismissed: 'bg-gray-100 text-gray-700',
      actioned: 'bg-green-100 text-green-700',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    )
  }

  const filteredReports = statusFilter === 'all'
    ? reports
    : reports.filter((r) => r.status === statusFilter)

  const statusCounts = {
    all: reports.length,
    open: reports.filter((r) => r.status === 'open').length,
    dismissed: reports.filter((r) => r.status === 'dismissed').length,
    actioned: reports.filter((r) => r.status === 'actioned').length,
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header with badge */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-lg">🚩</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          {statusCounts.open} open
        </span>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">({statusCounts[tab as keyof typeof statusCounts]})</span>
          </button>
        ))}
      </div>

      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          No reports found for this filter.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Reporter</th>
                <th className="table-header">Business</th>
                <th className="table-header">Reason</th>
                <th className="table-header">Status</th>
                <th className="table-header">Date</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReports.map((report) => (
                <>
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="table-cell">{report.reporter_name}</td>
                    <td className="table-cell font-medium text-gray-900">
                      {report.business_name}
                    </td>
                    <td className="table-cell max-w-xs">
                      <button
                        onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                        className="text-left text-sm text-gray-600 hover:text-gray-900 truncate block max-w-[200px]"
                        title="Click to expand"
                      >
                        {report.reason}
                        <span className="ml-1 text-blue-500 text-xs">
                          {expandedId === report.id ? '▲' : '▼'}
                        </span>
                      </button>
                    </td>
                    <td className="table-cell">{getStatusBadge(report.status)}</td>
                    <td className="table-cell">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="table-cell">
                      {report.status === 'open' && (
                        <div className="flex gap-2 relative">
                          {/* Action Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenDropdown(openDropdown === report.id ? null : report.id)}
                              disabled={actionLoading === report.id}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              Action
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {openDropdown === report.id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                <button
                                  onClick={() => handleResolve(report.id, 'actioned')}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700"
                                >
                                  ⚠️ Warn Business
                                </button>
                                <button
                                  onClick={() => handleResolve(report.id, 'actioned')}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                                >
                                  🚫 Suspend Listing
                                </button>
                                <button
                                  onClick={() => handleResolve(report.id, 'actioned')}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700"
                                >
                                  🗑️ Remove Listing
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleResolve(report.id, 'dismissed')}
                            disabled={actionLoading === report.id}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedId === report.id && (
                    <tr key={`${report.id}-expanded`}>
                      <td colSpan={6} className="px-6 py-3 bg-gray-50">
                        <div className="text-sm text-gray-700">
                          <span className="font-medium text-gray-900">Full Reason: </span>
                          {report.reason}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

interface DashboardStats {
  activeBusinesses: number
  totalUsers: number
  searchesToday: number
  pendingApprovals: number
}

interface RecentActivity {
  id: string
  action: string
  target: string
  time: string
  icon: string
}

const KPI_CONFIG = [
  { key: 'activeBusinesses' as const, label: 'Active Businesses', icon: '🏪', color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%' },
  { key: 'totalUsers' as const, label: 'Total Users', icon: '👥', color: 'text-green-600', bg: 'bg-green-50', trend: '+8%' },
  { key: 'searchesToday' as const, label: 'Searches Today', icon: '🔍', color: 'text-purple-600', bg: 'bg-purple-50', trend: '+24%' },
  { key: 'pendingApprovals' as const, label: 'Pending Approvals', icon: '⏳', color: 'text-orange-600', bg: 'bg-orange-50', trend: '' },
]

const QUICK_ACTIONS = [
  { href: '/businesses/add', icon: '🏪', iconBg: 'bg-blue-50', label: 'Add Business', description: 'Add a new business listing' },
  { href: '/users/create', icon: '👤', iconBg: 'bg-green-50', label: 'Create User', description: 'Create agent or business user' },
  { href: '/approvals', icon: '✅', iconBg: 'bg-orange-50', label: 'Approvals', description: 'Review pending businesses' },
  { href: '/categories', icon: '📂', iconBg: 'bg-purple-50', label: 'Categories', description: 'Manage business categories' },
]

const MOCK_ACTIVITY: RecentActivity[] = [
  { id: '1', action: 'Approved business', target: 'Chai Point - Dwaraka Nagar', time: '2m ago', icon: '✅' },
  { id: '2', action: 'Created user', target: 'Ravi Kumar (business)', time: '15m ago', icon: '👤' },
  { id: '3', action: 'Suspended business', target: 'Fake Store XYZ', time: '1h ago', icon: '🚫' },
  { id: '4', action: 'Verified business', target: 'Sri Sai Electronics', time: '2h ago', icon: '✓' },
  { id: '5', action: 'Updated category', target: 'Food & Dining', time: '3h ago', icon: '📂' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      setLoading(true)
      const res = await api.get('/admin/dashboard/stats')
      setStats(res.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load dashboard stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here&apos;s your platform overview.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-white p-5 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-gray-100"></div>
                <div className="h-4 w-10 bg-gray-100 rounded"></div>
              </div>
              <div className="h-8 w-16 bg-gray-100 rounded mt-2"></div>
              <div className="h-3 w-24 bg-gray-100 rounded mt-2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here&apos;s your platform overview.</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back! Here&apos;s your platform overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CONFIG.map(({ key, label, icon, color, bg, trend }) => {
          const value = stats?.[key] ?? 0
          return (
            <div key={key} className="rounded-xl border border-gray-100 bg-white p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bg}`}>
                  <span className="text-lg">{icon}</span>
                </div>
                {trend && (
                  <div className="flex items-center gap-0.5 text-xs font-medium text-green-600">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    {trend}
                  </div>
                )}
              </div>
              <span className={`text-2xl font-bold text-gray-900 mt-1`}>
                {value.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-xl border border-gray-100 bg-white p-4 hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-3 group"
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${action.iconBg} group-hover:scale-110 transition-transform`}>
                <span className="text-lg">{action.icon}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{action.label}</p>
                <p className="text-xs text-gray-500">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
          <Link href="/logs" className="text-xs text-blue-600 hover:underline">View All</Link>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
          {MOCK_ACTIVITY.map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">{activity.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.action}</span>
                  {' — '}
                  <span className="text-gray-600">{activity.target}</span>
                </p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

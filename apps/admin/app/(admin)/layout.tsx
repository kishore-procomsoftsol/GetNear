'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import api from '@/lib/api'

interface NavItem {
  href: string
  label: string
  icon: string
  iconBg: string
  iconColor: string
  adminOnly?: boolean
  badgeKey?: 'approvals' | 'reports'
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { href: '/approvals', label: 'Approvals', icon: '✅', iconBg: 'bg-orange-50', iconColor: 'text-orange-600', adminOnly: true, badgeKey: 'approvals' },
  { href: '/businesses', label: 'Businesses', icon: '🏪', iconBg: 'bg-green-50', iconColor: 'text-green-600' },
  { href: '/reviews', label: 'Reviews', icon: '💬', iconBg: 'bg-teal-50', iconColor: 'text-teal-600', adminOnly: true },
  { href: '/users', label: 'Users', icon: '👥', iconBg: 'bg-purple-50', iconColor: 'text-purple-600', adminOnly: true },
  { href: '/reports', label: 'Reports', icon: '🚩', iconBg: 'bg-red-50', iconColor: 'text-red-600', adminOnly: true, badgeKey: 'reports' },
  { href: '/categories', label: 'Categories', icon: '📂', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  { href: '/analytics', label: 'Analytics', icon: '📈', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', adminOnly: true },
  { href: '/notifications', label: 'Notifications', icon: '🔔', iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600', adminOnly: true },
  { href: '/logs', label: 'Logs', icon: '📋', iconBg: 'bg-gray-100', iconColor: 'text-gray-600', adminOnly: true },
  { href: '/settings', label: 'Settings', icon: '⚙️', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', adminOnly: true },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [badges, setBadges] = useState<{ approvals: number; reports: number }>({ approvals: 0, reports: 0 })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUserRole(payload.role || null)
      } catch {
        // If can't decode, use stored role
      }
    }

    const storedRole = localStorage.getItem('admin_user_role')
    if (storedRole) {
      setUserRole(storedRole)
    }

    fetchBadges()
  }, [])

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  async function fetchBadges() {
    try {
      const res = await api.get('/admin/dashboard/stats')
      const data = res.data.data
      setBadges({
        approvals: data?.pendingApprovals ?? 0,
        reports: data?.pendingReports ?? 0,
      })
    } catch {
      // Silently fail
    }
  }

  const visibleItems = navItems.filter((item) => {
    if (!item.adminOnly) return true
    return userRole === 'admin'
  })

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden h-10 w-10 rounded-lg bg-white shadow-md border border-gray-200 flex items-center justify-center"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">G</span>
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">GetNear</h1>
                <p className="text-[10px] text-gray-400 -mt-0.5">Admin Panel</p>
              </div>
            </div>
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden h-8 w-8 rounded-lg flex items-center justify-center hover:bg-gray-100"
              aria-label="Close menu"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <div className="flex flex-col gap-1">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className={`h-7 w-7 rounded-md flex items-center justify-center ${isActive ? 'bg-blue-100' : item.iconBg}`}>
                    <span className="text-sm">{item.icon}</span>
                  </div>
                  <span className="flex-1">{item.label}</span>
                  {badgeCount > 0 && (
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                      {badgeCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Platform Health Card */}
        <div className="p-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">💡</span>
              <span className="text-xs font-semibold text-blue-800">Platform Health</span>
            </div>
            <p className="text-[11px] text-blue-600 leading-relaxed">
              All systems operational. {badges.approvals > 0 ? `${badges.approvals} pending approvals need attention.` : 'No pending actions.'}
            </p>
          </div>
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => {
              localStorage.removeItem('admin_token')
              localStorage.removeItem('admin_user_role')
              window.location.href = '/login'
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <div className="h-7 w-7 rounded-md flex items-center justify-center bg-gray-100">
              <span className="text-sm">🚪</span>
            </div>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 pt-16 md:pt-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}

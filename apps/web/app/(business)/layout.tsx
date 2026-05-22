'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Store, BarChart3, Users, Star,
  MessageCircle, Image, Tag, Calendar, Settings, HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Listing', href: '/dashboard/listing', icon: Store },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Leads', href: '/dashboard/leads', icon: Users },
  { label: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { label: 'Messages', href: '/dashboard/messages', icon: MessageCircle },
  { label: 'Photos', href: '/dashboard/photos', icon: Image },
  { label: 'Offers', href: '/dashboard/offers', icon: Tag },
  { label: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
]

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar — hidden on mobile, shown on md+ */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-gray-100 md:bg-white md:p-4">
        <Link href="/dashboard" className="text-xl font-bold text-primary mb-6">GetNear</Link>
        <nav className="flex flex-col gap-1" aria-label="Business navigation">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-gray-50 hover:text-dark'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}

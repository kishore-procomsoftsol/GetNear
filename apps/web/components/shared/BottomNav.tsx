'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Search,
  Bookmark,
  MessageCircle,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/lib/stores/chatStore'
import { useNotificationStore } from '@/lib/stores/notificationStore'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  ariaLabel: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: Home, ariaLabel: 'Home' },
  { label: 'Search', href: '/search', icon: Search, ariaLabel: 'Search' },
  { label: 'Saved', href: '/saved', icon: Bookmark, ariaLabel: 'Saved places' },
  { label: 'Chats', href: '/chats', icon: MessageCircle, ariaLabel: 'Chats' },
  { label: 'Account', href: '/account', icon: User, ariaLabel: 'Account' },
]

/**
 * BottomNav — fixed bottom navigation bar for all customer-facing screens.
 *
 * - 5 items: Home, Search, Saved, Chats, Account
 * - Active item has blue color + blue line indicator under the icon
 * - Unread badge on Chats and Account
 * - Safe-area padding for iOS home indicator
 */
export function BottomNav() {
  const pathname = usePathname()

  const chatUnread = useChatStore((s) =>
    s.threads.reduce((acc, t) => acc + t.unread_count, 0)
  )
  const notificationUnread = useNotificationStore((s) => s.unreadCount)

  function getBadgeCount(href: string): number {
    if (href === '/chats') return chatUnread
    if (href === '/account') return notificationUnread
    return 0
  }

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        'fixed bottom-0 inset-x-0 z-30',
        'bg-white border-t border-gray-100',
        'safe-bottom'
      )}
    >
      <ul className="flex items-stretch h-16" role="list">
        {NAV_ITEMS.map(({ label, href, icon: Icon, ariaLabel }) => {
          const active = isActive(href)
          const badge = getBadgeCount(href)

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={ariaLabel}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 h-full w-full',
                  'text-[11px] font-medium transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                  active ? 'text-primary' : 'text-gray-400'
                )}
              >
                {/* Active indicator line */}
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-primary" />
                )}

                {/* Icon wrapper with badge */}
                <span className="relative">
                  <Icon
                    className={cn('h-5 w-5', active && 'text-primary')}
                    aria-hidden="true"
                    strokeWidth={active ? 2.5 : 1.8}
                  />

                  {badge > 0 && (
                    <span
                      aria-label={`${badge} unread`}
                      className={cn(
                        'absolute -top-1.5 -right-1.5',
                        'flex items-center justify-center',
                        'min-w-[16px] h-[16px] px-0.5',
                        'rounded-full bg-red-500 text-white',
                        'text-[9px] font-bold leading-none'
                      )}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>

                <span className={cn(active ? 'font-semibold' : 'font-normal')}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronRight,
  LogOut,
  Bookmark,
  Clock,
  MessageCircle,
  Settings,
  HelpCircle,
  UserPlus,
  Star,
  Edit,
  Bell,
  Heart,
  Tag,
  Search,
  Eye,
  Calendar,
  Camera,
  BadgeCheck,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/lib/stores/authStore'
import { AuthGuard } from '@/components/shared/AuthGuard'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserProfile {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  avatar_url: string | null
  role: string
  plus_expires_at: string | null
}

interface Collection {
  id: string
  name: string
  item_count: number
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  loading,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  label: string
  value: number | null
  loading: boolean
  icon: React.ElementType
  iconColor: string
  iconBg: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-3 gap-1.5 shadow-sm">
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', iconBg)}>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      {loading ? (
        <Skeleton className="h-5 w-8 rounded" />
      ) : (
        <span className="text-lg font-bold text-gray-900">{value ?? 0}</span>
      )}
      <span className="text-[10px] text-gray-500 text-center leading-tight">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Activity card
// ---------------------------------------------------------------------------

function ActivityCard({
  label,
  icon: Icon,
  iconColor,
  iconBg,
  href,
}: {
  label: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', iconBg)}>
        <Icon className={cn('h-5 w-5', iconColor)} />
      </div>
      <span className="text-[11px] text-gray-700 font-medium text-center leading-tight">{label}</span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Link row
// ---------------------------------------------------------------------------

function LinkRow({
  href,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  href?: string
  icon: React.ElementType
  label: string
  badge?: string
  onClick?: () => void
}) {
  const inner = (
    <div className="flex items-center justify-between py-3.5 px-1">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <Icon className="h-4 w-4 text-gray-600" aria-hidden="true" />
        </div>
        <span className="text-sm text-gray-900 font-medium">{label}</span>
        {badge && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold">
            {badge}
          </span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        {inner}
      </button>
    )
  }

  return (
    <Link href={href!} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
      {inner}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AccountPage() {
  const router = useRouter()
  const { user: storeUser, setUser, setSession } = useAuthStore()

  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [savedCount, setSavedCount] = React.useState<number | null>(null)
  const [searchCount, setSearchCount] = React.useState<number | null>(null)
  const [reviewCount, setReviewCount] = React.useState<number | null>(null)
  const [collections, setCollections] = React.useState<Collection[]>([])
  const [loading, setLoading] = React.useState(true)
  const [signingOut, setSigningOut] = React.useState(false)

  React.useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, savedRes, collectionsRes] = await Promise.allSettled([
          apiClient.get<{ data: UserProfile }>('/user/profile'),
          apiClient.get<{ data: unknown[]; meta?: { total: number } }>('/user/saved'),
          apiClient.get<{ data: Collection[] }>('/user/collections'),
        ])

        if (profileRes.status === 'fulfilled') {
          setProfile(profileRes.value.data.data)
        }
        if (savedRes.status === 'fulfilled') {
          const d = savedRes.value.data
          setSavedCount(d.meta?.total ?? d.data?.length ?? 0)
        }
        if (collectionsRes.status === 'fulfilled') {
          setCollections(collectionsRes.value.data.data ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // ignore
    }
    setUser(null)
    setSession(null)
    router.push('/login')
  }

  const handleInviteFriends = async () => {
    const shareData = {
      title: 'GetNear',
      text: 'Discover local businesses near you!',
      url: window.location.origin,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.origin)
    }
  }

  const displayUser = profile ?? storeUser

  const initials = displayUser?.name
    ? displayUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <div className="flex flex-col gap-0 pb-24 bg-gray-50 min-h-dvh">
      {/* Profile header */}
      <div className="bg-white px-4 pt-6 pb-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-900">My Account</h1>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center relative" aria-label="Notifications">
              <Bell className="h-4 w-4 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>
            <Link href="/account/edit" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" aria-label="Settings">
              <Settings className="h-4 w-4 text-gray-600" />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar size="lg">
              {displayUser?.avatar_url && (
                <AvatarImage src={displayUser.avatar_url} alt={displayUser.name ?? 'Avatar'} />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-white" aria-label="Change photo">
              <Camera className="h-3 w-3 text-white" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            {loading ? (
              <>
                <Skeleton className="h-5 w-32 rounded mb-1" />
                <Skeleton className="h-4 w-24 rounded" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-gray-900 truncate">
                    {displayUser?.name ?? 'User'}
                  </h2>
                  {displayUser?.phone && (
                    <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {displayUser?.phone ?? ''}
                </p>
                <p className="text-xs text-gray-400">
                  {displayUser?.email ?? ''}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Saved Places" value={savedCount} loading={loading} icon={Heart} iconColor="text-red-500" iconBg="bg-red-50" />
          <StatCard label="Searches" value={searchCount} loading={loading} icon={Clock} iconColor="text-blue-500" iconBg="bg-blue-50" />
          <StatCard label="Reviews" value={reviewCount} loading={loading} icon={Star} iconColor="text-yellow-500" iconBg="bg-yellow-50" />
          <StatCard label="Offers" value={0} loading={loading} icon={Tag} iconColor="text-purple-500" iconBg="bg-purple-50" />
        </div>
      </div>

      {/* My Activity */}
      <div className="px-4 mt-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">My Activity</h3>
        <div className="grid grid-cols-4 gap-2">
          <ActivityCard label="Search History" icon={Search} iconColor="text-blue-500" iconBg="bg-blue-50" href="/account/history" />
          <ActivityCard label="Recently Viewed" icon={Eye} iconColor="text-emerald-500" iconBg="bg-emerald-50" href="/account/history" />
          <ActivityCard label="Bookings" icon={Calendar} iconColor="text-orange-500" iconBg="bg-orange-50" href="/account/bookings" />
          <ActivityCard label="Messages" icon={MessageCircle} iconColor="text-violet-500" iconBg="bg-violet-50" href="/chats" />
        </div>
      </div>

      {/* My Collections */}
      {collections.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between px-4 mb-3">
            <h3 className="text-sm font-bold text-gray-900">My Collections</h3>
            <Link href="/saved" className="text-xs text-primary font-medium">View all</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
            {collections.slice(0, 6).map((col) => (
              <Link
                key={col.id}
                href={`/saved/${col.id}`}
                className="flex-shrink-0 w-32 rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-16 bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center">
                  <Bookmark className="h-6 w-6 text-primary/50" />
                </div>
                <div className="p-2">
                  <p className="text-[11px] font-semibold text-gray-900 truncate">{col.name}</p>
                  <p className="text-[10px] text-gray-500">{col.item_count} places</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Account & Support */}
      <div className="mx-4 mt-5 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-1">
          <h3 className="text-sm font-bold text-gray-900">Account & Support</h3>
        </div>
        <div className="px-3 divide-y divide-gray-100">
          <LinkRow href="/account/edit" icon={Edit} label="Edit Profile" />
          <LinkRow href="/account/notifications" icon={Bell} label="Notifications" />
          <LinkRow href="/help" icon={HelpCircle} label="Help & Support" />
          <LinkRow icon={UserPlus} label="Invite Friends" badge="Earn Rewards" onClick={handleInviteFriends} />
        </div>
      </div>

      {/* Sign out */}
      <div className="px-4 mt-5">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full h-11 rounded-xl border border-red-200 text-red-600 text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>
    </div>
  )
}

'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  Phone,
  Navigation,
  Eye,
  Bookmark,
  Star,
  ExternalLink,
  Pencil,
  ChevronDown,
  CheckCircle,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface StatData {
  count: number
  change: number
}

interface DashboardStats {
  views: StatData
  calls: StatData
  directions: StatData
  saves: StatData
}

interface Lead {
  id: string
  type: string
  created_at: string
  user_id: string | null
}

interface Review {
  id: string
  rating: number
  text: string
  created_at: string
  users: { id: string; name: string; avatar_url: string | null } | null
}

interface Offer {
  id: string
  title: string
  description: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
}

// ─── Mock data for display (will be replaced by real API data) ──────────────

const MOCK_LEADS = [
  { id: '1', initials: 'RK', name: 'Ravi Kumar', message: 'Interested in booking a table for 4 people.', time: '2m ago', unread: true },
  { id: '2', initials: 'SP', name: 'Sneha Patel', message: 'Asked about weekend offers and menu.', time: '15m ago', unread: true },
  { id: '3', initials: 'AK', name: 'Anil Kumar', message: 'Requested location and parking availability.', time: '1h ago', unread: false },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function BusinessCard() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Business photo */}
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">☕</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">Cafe Brew</h1>
            <Badge variant="success" className="text-[10px] px-2 py-0.5">Open</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Cafe • Dwaraka Nagar, Visakhapatnam</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-sm text-gray-700">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              4.5 <span className="text-gray-400">(128 Reviews)</span>
            </span>
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-3.5 w-3.5" />
              Verified Business
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5">
            View Listing <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" className="gap-1.5">
            Edit Listing <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

const KPI_CONFIG = [
  { key: 'views' as const, label: 'Listing Views', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'calls' as const, label: 'Calls', icon: Phone, color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'directions' as const, label: 'Direction Requests', icon: Navigation, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'saves' as const, label: 'Saves', icon: Bookmark, color: 'text-orange-600', bg: 'bg-orange-50' },
]

function KPICards({ stats, loading }: { stats: DashboardStats | null; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {KPI_CONFIG.map(({ key, label, icon: Icon, color, bg }) => {
        const stat = stats?.[key] ?? null
        return (
          <div key={key} className="rounded-xl border border-gray-100 bg-white p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', bg)}>
                <Icon className={cn('h-4.5 w-4.5', color)} />
              </div>
              {!loading && stat && (
                <div className="flex items-center gap-0.5 text-xs font-medium text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  {Math.abs(stat.change)}%
                </div>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <span className="text-2xl font-bold text-gray-900 mt-1">{stat?.count?.toLocaleString() ?? '0'}</span>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-[10px] text-gray-400">vs last 7 days</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ViewsChart() {
  // Placeholder chart using SVG path
  const points = [
    { x: 0, y: 60 },
    { x: 16.6, y: 45 },
    { x: 33.3, y: 70 },
    { x: 50, y: 40 },
    { x: 66.6, y: 55 },
    { x: 83.3, y: 30 },
    { x: 100, y: 20 },
  ]

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  const areaD = pathD + ` L 100 100 L 0 100 Z`

  const dates = ['May 12', 'May 13', 'May 14', 'May 15', 'May 16', 'May 17', 'May 18']

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Views Overview</h2>
        <button className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
          Last 7 Days <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Chart area */}
      <div className="relative h-48 w-full">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-gray-400 w-8">
          <span>1.5K</span>
          <span>1.0K</span>
          <span>500</span>
          <span>0</span>
        </div>

        {/* Chart SVG */}
        <div className="ml-10 h-[calc(100%-24px)] relative">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            {/* Grid lines */}
            <line x1="0" y1="25" x2="100" y2="25" stroke="#f3f4f6" strokeWidth="0.5" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="0.5" />
            <line x1="0" y1="75" x2="100" y2="75" stroke="#f3f4f6" strokeWidth="0.5" />

            {/* Area fill */}
            <path d={areaD} fill="url(#blueGradient)" opacity="0.15" />

            {/* Line */}
            <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

            {/* Dots */}
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3b82f6" vectorEffect="non-scaling-stroke" />
            ))}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Tooltip */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none">
            May 15 • 1,248 Views
          </div>
        </div>

        {/* X-axis labels */}
        <div className="ml-10 flex justify-between text-[10px] text-gray-400 mt-1">
          {dates.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function TopActionsDonut({ stats }: { stats: DashboardStats | null }) {
  const total = (stats?.views.count ?? 0) + (stats?.calls.count ?? 0) + (stats?.directions.count ?? 0) + (stats?.saves.count ?? 0)
  const views = stats?.views.count ?? 0
  const calls = stats?.calls.count ?? 0
  const directions = stats?.directions.count ?? 0
  const websiteClicks = stats?.saves.count ?? 0

  const segments = [
    { label: 'Views', value: views, color: '#3b82f6', pct: Math.round((views / total) * 100) },
    { label: 'Calls', value: calls, color: '#22c55e', pct: Math.round((calls / total) * 100) },
    { label: 'Directions', value: directions, color: '#a855f7', pct: Math.round((directions / total) * 100) },
    { label: 'Website Clicks', value: websiteClicks, color: '#f97316', pct: Math.round((websiteClicks / total) * 100) },
  ]

  // Build donut segments using stroke-dasharray
  const radius = 40
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Top Actions</h2>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Donut chart */}
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {segments.map((seg, i) => {
              const dashLength = (seg.pct / 100) * circumference
              const dashGap = circumference - dashLength
              const currentOffset = offset
              offset += dashLength

              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="10"
                  strokeDasharray={`${dashLength} ${dashGap}`}
                  strokeDashoffset={-currentOffset}
                  strokeLinecap="round"
                />
              )
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-gray-900">{total.toLocaleString()}</span>
            <span className="text-[10px] text-gray-500">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-xs text-gray-600">{seg.label}</span>
              <span className="text-xs font-medium text-gray-900 ml-auto">{seg.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RecentLeads({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  // Use real API data when available, fall back to mock data
  const displayLeads = leads.length > 0
    ? leads.slice(0, 3).map((lead) => {
        const label = lead.type.charAt(0).toUpperCase() + lead.type.slice(1)
        const initials = label.slice(0, 2).toUpperCase()
        return {
          id: lead.id,
          initials,
          name: `${label} Lead`,
          message: `New ${lead.type} lead received.`,
          time: formatTimeAgo(lead.created_at),
          unread: Date.now() - new Date(lead.created_at).getTime() < 3600000,
        }
      })
    : MOCK_LEADS

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Recent Leads</h2>
        <Link href="/dashboard/leads" className="text-xs text-blue-600 hover:underline">View All</Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {displayLeads.map((lead) => (
            <div key={lead.id} className="flex items-start gap-3 py-2">
              {/* Avatar */}
              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-blue-700">{lead.initials}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                <p className="text-xs text-gray-500 truncate">{lead.message}</p>
              </div>

              {/* Time + unread dot */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-gray-400">{lead.time}</span>
                {lead.unread && <div className="h-2 w-2 rounded-full bg-red-500" />}
              </div>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full mt-4">
        View All Leads
      </Button>
    </div>
  )
}

function RecentReviews({ reviews, loading }: { reviews: Review[]; loading: boolean }) {
  const displayReviews = reviews.length > 0 ? reviews.slice(0, 2) : [
    { id: '1', rating: 5, text: 'Amazing coffee and cozy ambiance. Loved the service!', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), users: { id: '1', name: 'Priya Sharma', avatar_url: null } },
    { id: '2', rating: 4, text: 'Great place to work and chill. Definitely coming back!', created_at: new Date(Date.now() - 4 * 86400000).toISOString(), users: { id: '2', name: 'Vikram Reddy', avatar_url: null } },
  ]

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Recent Reviews</h2>
        <Link href="/dashboard/reviews" className="text-xs text-blue-600 hover:underline">View All</Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {displayReviews.map((review) => (
            <div key={review.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{review.users?.name ?? 'Anonymous'}</span>
                <span className="text-[10px] text-gray-400">{formatTimeAgo(review.created_at)}</span>
              </div>
              <div className="flex items-center gap-0.5 mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-3 w-3',
                      i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{review.text}</p>
            </div>
          ))}
        </div>
      )}

      <Link href="/dashboard/reviews" className="block text-center text-xs text-blue-600 hover:underline mt-4">
        Manage Reviews
      </Link>
    </div>
  )
}

function ActiveOffers({ offers, loading }: { offers: Offer[]; loading: boolean }) {
  const displayOffers = offers.length > 0 ? offers.filter((o) => o.is_active).slice(0, 2) : [
    { id: '1', title: 'Flat 20% off on all Coffees', description: null, valid_until: '2024-05-31', is_active: true, created_at: '' },
    { id: '2', title: 'Buy 1 Get 1 on Desserts', description: null, valid_until: '2024-05-25', is_active: true, created_at: '' },
  ]

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Active Offers</h2>
        <Link href="/dashboard/offers" className="text-xs text-blue-600 hover:underline">View All</Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {displayOffers.map((offer) => (
            <div key={offer.id} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
              {/* Offer image placeholder */}
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🎉</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{offer.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="success" className="text-[10px] px-1.5 py-0">Active</Badge>
                  {offer.valid_until && (
                    <span className="text-[10px] text-gray-400">Valid till {formatDate(offer.valid_until)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button size="sm" className="w-full mt-4">
        Create New Offer
      </Button>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function BusinessDashboardPage() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [leads, setLeads] = React.useState<Lead[]>([])
  const [reviews, setReviews] = React.useState<Review[]>([])
  const [offers, setOffers] = React.useState<Offer[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    Promise.all([
      apiClient.get<{ data: DashboardStats }>('/dashboard/stats').then((res) => setStats(res.data.data)).catch(() => {}),
      apiClient.get<{ data: Lead[] }>('/dashboard/leads').then((res) => setLeads(res.data.data ?? [])).catch(() => {}),
      apiClient.get<{ data: Review[] }>('/dashboard/reviews').then((res) => setReviews(res.data.data ?? [])).catch(() => {}),
      apiClient.get<{ data: Offer[] }>('/dashboard/offers').then((res) => setOffers(res.data.data ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-gray-50 min-h-full">
      {/* Business Card */}
      <BusinessCard />

      {/* KPI Stats */}
      <KPICards stats={stats} loading={loading} />

      {/* Views Overview Chart */}
      <ViewsChart />

      {/* Top Actions + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopActionsDonut stats={stats} />
        <RecentLeads leads={leads} loading={loading} />
      </div>

      {/* Recent Reviews + Active Offers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentReviews reviews={reviews} loading={loading} />
        <ActiveOffers offers={offers} loading={loading} />
      </div>
    </div>
  )
}

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import apiClient from '@/lib/api'

interface Booking {
  id: string
  date: string
  time: string
  party_size: number | null
  status: string
  notes: string | null
  businesses: { id: string; name: string } | null
}

const statusVariant: Record<string, 'default' | 'success' | 'danger' | 'warning'> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'danger',
  completed: 'default',
  no_show: 'danger',
}

export default function BookingsPage() {
  const router = useRouter()
  const [upcoming, setUpcoming] = React.useState<Booking[]>([])
  const [past, setPast] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiClient.get<{ data: { upcoming: Booking[]; past: Booking[] } }>('/user/bookings')
      .then((res) => {
        setUpcoming(res.data.data.upcoming ?? [])
        setPast(res.data.data.past ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this booking?')) return
    try {
      await apiClient.patch(`/user/bookings/${id}/cancel`)
      setUpcoming((prev) => prev.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b))
    } catch (err: any) {
      alert(err?.response?.data?.error?.message ?? 'Failed to cancel')
    }
  }

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <div className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-dark">{booking.businesses?.name ?? 'Business'}</p>
        <Badge variant={statusVariant[booking.status] ?? 'default'} className="text-[10px] capitalize">{booking.status}</Badge>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span>{booking.date}</span>
        <span>{booking.time}</span>
        {booking.party_size && <span>{booking.party_size} guests</span>}
      </div>
      {booking.status === 'pending' && (
        <Button variant="outline" size="sm" className="self-start mt-1 text-danger border-danger" onClick={() => handleCancel(booking.id)}>
          Cancel
        </Button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-gray-100" aria-label="Go back">
          <ArrowLeft className="h-5 w-5 text-dark" />
        </button>
        <h1 className="text-lg font-semibold text-dark">My Bookings</h1>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1">Upcoming</TabsTrigger>
          <TabsTrigger value="past" className="flex-1">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-3 space-y-3">
          {loading && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          {!loading && upcoming.length === 0 && <p className="text-sm text-muted text-center py-8">No upcoming bookings.</p>}
          {!loading && upcoming.map((b) => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
        <TabsContent value="past" className="mt-3 space-y-3">
          {loading && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          {!loading && past.length === 0 && <p className="text-sm text-muted text-center py-8">No past bookings.</p>}
          {!loading && past.map((b) => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
      </Tabs>
    </div>
  )
}

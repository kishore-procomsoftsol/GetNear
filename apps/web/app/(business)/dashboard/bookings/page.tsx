'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import apiClient from '@/lib/api'

interface Booking {
  id: string
  date: string
  time: string
  party_size: number | null
  status: string
  notes: string | null
  users: { id: string; name: string | null; phone: string | null } | null
}

const statusVariant: Record<string, 'default' | 'success' | 'danger' | 'warning'> = {
  pending: 'warning', confirmed: 'success', cancelled: 'danger', completed: 'default', no_show: 'danger',
}

export default function BusinessBookingsPage() {
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiClient.get<{ data: Booking[] }>('/dashboard/bookings')
      .then((res) => setBookings(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (id: string, status: string) => {
    await apiClient.patch(`/dashboard/bookings/${id}/status`, { status }).catch(() => {})
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b))
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-bold text-dark">Bookings</h1>

      {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}

      {!loading && bookings.length === 0 && <p className="text-sm text-muted text-center py-8">No bookings yet.</p>}

      {!loading && bookings.map((b) => (
        <div key={b.id} className="border border-gray-100 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-dark">{b.users?.name ?? 'Customer'}</p>
            <Badge variant={statusVariant[b.status] ?? 'default'} className="text-[10px] capitalize">{b.status}</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>{b.date}</span><span>{b.time}</span>
            {b.party_size && <span>{b.party_size} guests</span>}
          </div>
          {b.notes && <p className="text-xs text-muted">{b.notes}</p>}
          {b.status === 'pending' && (
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={() => handleStatusChange(b.id, 'confirmed')}>Confirm</Button>
              <Button size="sm" variant="outline" className="text-danger border-danger" onClick={() => handleStatusChange(b.id, 'cancelled')}>Decline</Button>
            </div>
          )}
          {b.status === 'confirmed' && (
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={() => handleStatusChange(b.id, 'completed')}>Mark Complete</Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange(b.id, 'no_show')}>No Show</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

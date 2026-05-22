'use client'

import * as React from 'react'
import { Bell, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

export default function NotificationsPage() {
  const { notifications, setNotifications, markRead, markAllRead } = useNotificationStore()
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiClient.get<{ data: any[] }>('/user/notifications?limit=50')
      .then((res) => setNotifications(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [setNotifications])

  const handleMarkRead = async (id: string) => {
    markRead(id)
    await apiClient.patch(`/user/notifications/${id}/read`).catch(() => {})
  }

  const handleMarkAllRead = async () => {
    markAllRead()
    await apiClient.patch('/user/notifications/read-all').catch(() => {})
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-dark">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-primary font-medium">
            <Check className="h-3 w-3" /> Mark all read
          </button>
        )}
      </div>

      {loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}

      {!loading && notifications.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Bell className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm text-muted">No notifications yet.</p>
        </div>
      )}

      {!loading && notifications.map((n) => (
        <button
          key={n.id}
          onClick={() => !n.is_read && handleMarkRead(n.id)}
          className={cn(
            'flex items-start gap-3 rounded-xl border px-4 py-3 text-left w-full transition-colors',
            n.is_read ? 'border-gray-100 bg-white' : 'border-primary/20 bg-primary/5'
          )}
        >
          <div className={cn('mt-1 h-2 w-2 rounded-full flex-shrink-0', n.is_read ? 'bg-transparent' : 'bg-primary')} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-dark">{n.title}</p>
            {n.body && <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>}
            <p className="text-xs text-muted mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

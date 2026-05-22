'use client'

import * as React from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import apiClient from '@/lib/api'

interface Thread {
  thread_id: string
  other_user_id: string
  other_user_name?: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

export default function BusinessMessagesPage() {
  const [threads, setThreads] = React.useState<Thread[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiClient.get<{ data: Thread[] }>('/user/messages')
      .then((res) => setThreads(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-bold text-dark">Messages</h1>

      {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}

      {!loading && threads.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <MessageCircle className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-muted">No messages yet.</p>
        </div>
      )}

      {!loading && threads.map((t) => (
        <Link key={t.thread_id} href={`/chats/${t.thread_id}`} className="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3 hover:bg-gray-50">
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-muted flex-shrink-0">
            {t.other_user_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-dark truncate">{t.other_user_name ?? 'Customer'}</p>
              {t.last_message_at && <span className="text-xs text-muted">{new Date(t.last_message_at).toLocaleDateString()}</span>}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xs text-muted truncate">{t.last_message ?? ''}</p>
              {t.unread_count > 0 && <Badge variant="danger" className="text-[10px] ml-2">{t.unread_count}</Badge>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

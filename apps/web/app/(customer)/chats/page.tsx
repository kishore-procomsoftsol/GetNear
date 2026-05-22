'use client'

import * as React from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { useChatStore } from '@/lib/stores/chatStore'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

export default function ChatsPage() {
  const { threads, setThreads } = useChatStore()
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiClient.get<{ data: any[] }>('/user/messages')
      .then((res) => setThreads(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [setThreads])

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-dark">Messages</h1>

      {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}

      {!loading && threads.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <MessageCircle className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm text-muted">No conversations yet.</p>
        </div>
      )}

      {!loading && threads.map((thread) => (
        <Link
          key={thread.id}
          href={`/chats/${thread.id}`}
          className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-muted flex-shrink-0">
            {(thread as any).other_user_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-dark truncate">{(thread as any).other_user_name ?? 'User'}</p>
              {(thread as any).last_message_at && (
                <span className="text-xs text-muted flex-shrink-0">{new Date((thread as any).last_message_at).toLocaleDateString()}</span>
              )}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xs text-muted truncate">{(thread as any).last_message ?? ''}</p>
              {thread.unread_count > 0 && (
                <Badge variant="danger" className="text-[10px] ml-2 flex-shrink-0">{thread.unread_count}</Badge>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

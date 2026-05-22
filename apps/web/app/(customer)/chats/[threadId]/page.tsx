'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import { useChatStore } from '@/lib/stores/chatStore'
import { useAuthStore } from '@/lib/stores/authStore'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

export default function ChatThreadPage() {
  const { threadId } = useParams<{ threadId: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const { messages, addMessage, markThreadRead } = useChatStore()
  const [text, setText] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const threadMessages = messages[threadId] ?? []

  // Mark thread as read on mount
  React.useEffect(() => {
    markThreadRead(threadId)
    apiClient.patch(`/user/messages/thread/${threadId}/read`).catch(() => {})
  }, [threadId, markThreadRead])

  // Scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages.length])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const parts = threadId.split(':')
    const receiverId = parts[0] === user?.id ? parts[1] : parts[0]

    try {
      const res = await apiClient.post<{ data: any }>('/user/messages', {
        receiver_id: receiverId,
        text: text.trim(),
      })
      addMessage(threadId, res.data.data)
      setText('')
    } catch {}
    setSending(false)
  }

  return (
    <div className="flex flex-col h-dvh">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-gray-100" aria-label="Go back">
          <ArrowLeft className="h-5 w-5 text-dark" />
        </button>
        <h1 className="text-base font-semibold text-dark">Chat</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {threadMessages.map((msg) => {
          const isMine = msg.sender_id === user?.id
          return (
            <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
                isMine ? 'bg-primary text-white rounded-br-md' : 'bg-gray-100 text-dark rounded-bl-md'
              )}>
                <p>{msg.text}</p>
                <p className={cn('text-[10px] mt-1', isMine ? 'text-white/70' : 'text-muted')}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3 bg-white safe-bottom">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message…"
            className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="rounded-full bg-primary p-2.5 text-white disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

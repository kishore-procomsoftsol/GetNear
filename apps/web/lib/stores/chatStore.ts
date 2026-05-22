import { create } from 'zustand'
import type { Message } from '@getnear/types'

/**
 * A conversation thread between two users, optionally in the context of a business.
 * The thread id is canonical: `LEAST(sender_id, receiver_id):GREATEST(sender_id, receiver_id)`.
 */
export interface Thread {
  id: string
  business_id: string | null
  other_user_id: string
  other_user_name: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

interface ChatStore {
  threads: Thread[]
  activeThread: string | null
  messages: Record<string, Message[]>
  setThreads: (threads: Thread[]) => void
  setActiveThread: (id: string | null) => void
  addMessage: (threadId: string, msg: Message) => void
  setMessages: (threadId: string, messages: Message[]) => void
  markThreadRead: (threadId: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  threads: [],
  activeThread: null,
  messages: {},

  setThreads: (threads) => set({ threads }),

  setActiveThread: (id) => set({ activeThread: id }),

  addMessage: (threadId, msg) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [threadId]: [...(state.messages[threadId] ?? []), msg],
      },
      // Update the thread's last_message preview
      threads: state.threads.map((t) =>
        t.id === threadId
          ? { ...t, last_message: msg.text, last_message_at: msg.created_at }
          : t
      ),
    })),

  setMessages: (threadId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [threadId]: messages },
    })),

  markThreadRead: (threadId) =>
    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === threadId ? { ...t, unread_count: 0 } : t
      ),
    })),
}))

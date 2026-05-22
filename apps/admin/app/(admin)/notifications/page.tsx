'use client'

import { useState } from 'react'
import api from '@/lib/api'

interface SentNotification {
  id: string
  title: string
  target: string
  sentAt: string
}

export default function NotificationsPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetRole, setTargetRole] = useState('all')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentNotifications, setSentNotifications] = useState<SentNotification[]>([])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    try {
      setSending(true)
      setError(null)
      setSuccess(false)
      await api.post('/admin/notifications/broadcast', {
        title,
        body,
        target_role: targetRole === 'all' ? null : targetRole,
      })
      setSuccess(true)
      setSentNotifications((prev) => [
        {
          id: Date.now().toString(),
          title: title,
          target: targetRole === 'all' ? 'All Users' : targetRole === 'customer' ? 'Customers' : 'Business Owners',
          sentAt: new Date().toLocaleString(),
        },
        ...prev,
      ])
      setTitle('')
      setBody('')
      setTargetRole('all')
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
          <span className="text-lg">🔔</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcast Notifications</h1>
          <p className="text-sm text-gray-500">Send push notifications to your users</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <form onSubmit={handleSend} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Audience
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-3 h-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              <option value="customer">Customers Only</option>
              <option value="business">Business Owners Only</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <span className={`text-xs ${title.length > 100 ? 'text-red-500' : 'text-gray-400'}`}>
                {title.length}/100
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              placeholder="Notification title..."
              className="w-full px-3 h-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              maxLength={100}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Message Body
              </label>
              <span className={`text-xs ${body.length > 500 ? 'text-red-500' : 'text-gray-400'}`}>
                {body.length}/500
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 500))}
              placeholder="Write your notification message..."
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
              maxLength={500}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          {success && (
            <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
              ✓ Notification sent successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !title.trim() || !body.trim()}
            className="w-full h-10 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </form>
      </div>

      {/* Sent Notifications History */}
      <div className="mt-8 max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sent Notifications</h2>
        {sentNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">📭</span>
            </div>
            <p className="text-gray-500 text-sm">No notifications sent this session.</p>
            <p className="text-gray-400 text-xs mt-1">Sent broadcasts will appear here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            {sentNotifications.map((notif) => (
              <div key={notif.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    To: {notif.target} · {notif.sentAt}
                  </p>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Sent
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

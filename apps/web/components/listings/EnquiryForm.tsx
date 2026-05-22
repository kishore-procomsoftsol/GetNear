'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

interface EnquiryFormProps {
  businessId: string
  businessName: string
  onClose: () => void
}

export function EnquiryForm({ businessId, businessName, onClose }: EnquiryFormProps) {
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !phone.trim()) {
      setError('Name and phone are required.')
      return
    }

    setSubmitting(true)
    try {
      await apiClient.post(`/businesses/${businessId}/leads`, {
        type: 'enquiry',
        metadata: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          message: message.trim() || null,
        },
      })
      setSubmitted(true)
    } catch {
      setError('Failed to submit enquiry. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
        <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl animate-in slide-in-from-bottom">
          <div className="flex flex-col items-center gap-3 text-center py-4">
            <span className="text-4xl" aria-hidden="true">✅</span>
            <h3 className="text-lg font-semibold text-dark">Enquiry Sent!</h3>
            <p className="text-sm text-muted">
              Your enquiry has been sent to {businessName}. They will get back to you soon.
            </p>
            <Button onClick={onClose} className="mt-2 w-full">
              Done
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark">Get Quote</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>

        <p className="text-sm text-muted mb-4">
          Send an enquiry to <span className="font-medium text-dark">{businessName}</span>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="enquiry-name" className="text-xs font-medium text-dark mb-1 block">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="enquiry-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className={cn(
                'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white',
                'transition-all'
              )}
            />
          </div>

          <div>
            <label htmlFor="enquiry-phone" className="text-xs font-medium text-dark mb-1 block">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              id="enquiry-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your phone number"
              required
              className={cn(
                'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white',
                'transition-all'
              )}
            />
          </div>

          <div>
            <label htmlFor="enquiry-email" className="text-xs font-medium text-dark mb-1 block">
              Email <span className="text-muted">(optional)</span>
            </label>
            <input
              id="enquiry-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className={cn(
                'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white',
                'transition-all'
              )}
            />
          </div>

          <div>
            <label htmlFor="enquiry-message" className="text-xs font-medium text-dark mb-1 block">
              Message <span className="text-muted">(optional)</span>
            </label>
            <textarea
              id="enquiry-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you need…"
              rows={3}
              className={cn(
                'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm resize-none',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white',
                'transition-all'
              )}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button type="submit" size="lg" className="w-full mt-1" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send Enquiry'}
          </Button>
        </form>
      </div>
    </div>
  )
}

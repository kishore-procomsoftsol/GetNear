'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, BellOff } from 'lucide-react'

export default function NotificationSettingsPage() {
  const [pushEnabled, setPushEnabled] = React.useState(false)
  const [emailEnabled, setEmailEnabled] = React.useState(true)
  const [bookingAlerts, setBookingAlerts] = React.useState(true)
  const [messageAlerts, setMessageAlerts] = React.useState(true)
  const [offerAlerts, setOfferAlerts] = React.useState(true)
  const [reviewAlerts, setReviewAlerts] = React.useState(false)

  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <Link href="/account" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft className="h-4 w-4 text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Notification Settings</h1>
      </div>

      <div className="px-4 py-6 flex flex-col gap-6">
        {/* Push Notifications */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
              <Bell className="h-4 w-4 text-blue-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Push Notifications</h2>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable Push Notifications</p>
              <p className="text-xs text-gray-500">Receive alerts on your device</p>
            </div>
            <Toggle checked={pushEnabled} onChange={setPushEnabled} />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Email Notifications</p>
              <p className="text-xs text-gray-500">Receive updates via email</p>
            </div>
            <Toggle checked={emailEnabled} onChange={setEmailEnabled} />
          </div>
        </section>

        {/* Alert Types */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center">
              <BellOff className="h-4 w-4 text-purple-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Alert Preferences</h2>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Booking Updates</p>
              <p className="text-xs text-gray-500">Confirmations, cancellations, reminders</p>
            </div>
            <Toggle checked={bookingAlerts} onChange={setBookingAlerts} />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">New Messages</p>
              <p className="text-xs text-gray-500">When a business replies to you</p>
            </div>
            <Toggle checked={messageAlerts} onChange={setMessageAlerts} />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Offers & Deals</p>
              <p className="text-xs text-gray-500">New offers from saved businesses</p>
            </div>
            <Toggle checked={offerAlerts} onChange={setOfferAlerts} />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Review Replies</p>
              <p className="text-xs text-gray-500">When a business replies to your review</p>
            </div>
            <Toggle checked={reviewAlerts} onChange={setReviewAlerts} />
          </div>
        </section>
      </div>
    </div>
  )
}

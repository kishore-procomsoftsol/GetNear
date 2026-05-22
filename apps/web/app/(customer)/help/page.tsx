'use client'

import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MessageCircle } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="min-h-dvh bg-white pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <Link href="/account" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft className="h-4 w-4 text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Help & Support</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Contact Options */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4">Contact Us</h2>
          <div className="flex flex-col gap-3">
            <a href="mailto:support@getnear.in" className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Email Support</p>
                <p className="text-xs text-gray-500">support@getnear.in</p>
              </div>
            </a>
            <a href="tel:+919876543210" className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Phone Support</p>
                <p className="text-xs text-gray-500">Mon-Sat, 9 AM - 6 PM</p>
              </div>
            </a>
            <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">WhatsApp</p>
                <p className="text-xs text-gray-500">Quick responses</p>
              </div>
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-3">
            {[
              { q: 'How do I add my business?', a: 'Go to the Business section and tap "Add Your Business". Fill in the details and submit for review.' },
              { q: 'How do I save a business?', a: 'Tap the heart icon on any business card or the Save button on the listing detail page.' },
              { q: 'How do I write a review?', a: 'Open a business listing and scroll down to the reviews section. Tap "Write a review".' },
              { q: 'How do I change my location?', a: 'Tap the location label on the home page or use the "Change" button in the search bar.' },
              { q: 'How do I delete my account?', a: 'Go to Account > Settings or contact support@getnear.in for account deletion.' },
            ].map((faq, i) => (
              <details key={i} className="rounded-xl border border-gray-200 overflow-hidden group">
                <summary className="px-4 py-3 text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-50 list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="px-4 pb-3 text-sm text-gray-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Links */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4">Legal</h2>
          <div className="flex flex-col gap-2">
            <Link href="/terms" className="text-sm text-primary hover:underline">Terms & Conditions</Link>
            <Link href="/privacy" className="text-sm text-primary hover:underline">Privacy Policy</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-white pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <Link href="/" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft className="h-4 w-4 text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Privacy Policy</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-sm text-gray-500 mb-6">Last updated: May 2026</p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">1. Information We Collect</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">We collect the following types of information:</p>
        <ul className="text-sm text-gray-600 leading-relaxed list-disc pl-5 space-y-1 mb-4">
          <li>Account information (name, phone number, email)</li>
          <li>Location data (GPS coordinates for nearby search)</li>
          <li>Search history and saved places</li>
          <li>Reviews and ratings you submit</li>
          <li>Device information and usage analytics</li>
        </ul>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">2. How We Use Your Information</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          We use your information to provide location-based search results, personalize your experience, send relevant notifications, and improve our services.
        </p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">3. Location Data</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          We use your device's GPS to show nearby businesses. Location access is optional — you can use manual location selection instead. We do not track your location in the background.
        </p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">4. Data Sharing</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          We do not sell your personal data. We may share anonymized analytics with business owners (e.g., view counts, search trends). Your reviews are publicly visible on business listings.
        </p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">5. Data Security</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          We use industry-standard encryption and security measures to protect your data. All data is stored securely with row-level security policies.
        </p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">6. Your Rights</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          You can access, update, or delete your account data at any time from your Account settings. To request complete data deletion, contact support@getnear.in.
        </p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">7. Contact</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          For privacy-related questions, contact us at privacy@getnear.in.
        </p>
      </div>
    </div>
  )
}

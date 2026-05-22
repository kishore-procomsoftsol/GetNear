'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <Link href="/" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft className="h-4 w-4 text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Terms & Conditions</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 prose prose-sm prose-gray">
        <p className="text-sm text-gray-500 mb-6">Last updated: May 2026</p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">1. Acceptance of Terms</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          By accessing or using GetNear ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Platform.
        </p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">2. Description of Service</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          GetNear is a hyperlocal discovery platform that connects users with nearby businesses, restaurants, hospitals, cafes, pharmacies, gyms, and local services through location-based search.
        </p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">3. User Accounts</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          You may be required to create an account to access certain features. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
        </p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">4. Business Listings</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Business owners are responsible for the accuracy of their listing information. GetNear reserves the right to remove or modify listings that violate our policies or contain inaccurate information.
        </p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">5. User Content</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Users may submit reviews, ratings, and other content. By submitting content, you grant GetNear a non-exclusive, royalty-free license to use, display, and distribute such content on the Platform.
        </p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">6. Privacy</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Your use of the Platform is also governed by our Privacy Policy. We collect location data to provide location-based services. You can manage your location preferences in your device settings.
        </p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">7. Prohibited Conduct</h2>
        <ul className="text-sm text-gray-600 leading-relaxed list-disc pl-5 space-y-1">
          <li>Submitting false or misleading business information</li>
          <li>Writing fake reviews or manipulating ratings</li>
          <li>Harassing other users or business owners</li>
          <li>Attempting to access other users' accounts</li>
          <li>Using the Platform for any illegal purpose</li>
        </ul>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">8. Limitation of Liability</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          GetNear provides the Platform "as is" without warranties of any kind. We are not responsible for the accuracy of business listings, user reviews, or any transactions between users and businesses.
        </p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">9. Changes to Terms</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          We may update these Terms from time to time. Continued use of the Platform after changes constitutes acceptance of the updated Terms.
        </p>

        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">10. Contact</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          For questions about these Terms, contact us at support@getnear.in.
        </p>
      </div>
    </div>
  )
}

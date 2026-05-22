import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'GetNear — Discover Local Businesses',
    template: '%s | GetNear',
  },
  description:
    'Find restaurants, cafes, hospitals, pharmacies, gyms, and local services near you. GetNear connects you with the best local businesses in your area.',
  keywords: ['local business', 'nearby', 'restaurants', 'services', 'discovery'],
  authors: [{ name: 'GetNear' }],
  creator: 'GetNear',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://getnear.in'
  ),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://getnear.in',
    siteName: 'GetNear',
    title: 'GetNear — Discover Local Businesses',
    description: 'Find the best local businesses near you.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GetNear — Discover Local Businesses',
    description: 'Find the best local businesses near you.',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr" className={inter.variable}>
      <body className={inter.className}>
        {/* Skip to content link for keyboard/screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg"
        >
          Skip to content
        </a>
        <main id="main-content">{children}</main>
      </body>
    </html>
  )
}

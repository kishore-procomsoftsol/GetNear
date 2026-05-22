'use client'

import Link from 'next/link'

export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="text-5xl mb-5" aria-hidden="true">
        😕
      </span>
      <h1 className="text-lg font-bold text-gray-900 mb-2">
        Something went wrong
      </h1>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        We couldn&apos;t load this page. Please try again.
      </p>
      {process.env.NODE_ENV === 'development' && error?.message && (
        <pre className="mb-6 max-w-sm rounded-lg bg-red-50 p-3 text-xs text-red-700 overflow-auto text-left">
          {error.message}
        </pre>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}

/**
 * Auth layout — unauthenticated screens (login, onboarding).
 * No bottom navigation bar. Centered content on a white background.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { signInWithPopup, signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { useAuthStore } from '@/lib/stores/authStore'
import apiClient from '@/lib/api'
import { ArrowLeft, Shield, CheckCircle } from 'lucide-react'
import Link from 'next/link'

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
}

export default function LoginPage() {
  const router = useRouter()
  const { setSession, setUser } = useAuthStore()

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [direction, setDirection] = useState(1)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null)

  const authenticateWithApi = async (idToken: string) => {
    const res = await apiClient.post('/auth/firebase', { idToken })
    const { access_token, refresh_token, user } = res.data.data
    setSession({ access_token, refresh_token } as any)
    setUser(user)
    if (user.role === 'business') router.push('/dashboard')
    else if (user.role === 'admin') router.push('/admin')
    else router.push('/')
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      await authenticateWithApi(idToken)
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.')
      } else if (err.response?.data?.error?.message) {
        setError(err.response.data.error.message)
      } else {
        setError(err.message || 'Google sign-in failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit phone number')
      return
    }

    const fullPhone = `+91${digits}`
    setLoading(true)

    try {
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      })

      const confirmation = await signInWithPhoneNumber(auth, fullPhone, recaptchaVerifier)
      setConfirmResult(confirmation)
      setDirection(1)
      setStep('otp')
    } catch (err: any) {
      if (err.code === 'auth/invalid-app-credential') {
        setError('Phone auth configuration error. Please use Google Sign-In instead.')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.')
      } else {
        setError(err.message || 'Failed to send OTP')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmResult) return
    setError(null)
    setLoading(true)

    try {
      const credential = await confirmResult.confirm(otp)
      const idToken = await credential.user.getIdToken()
      await authenticateWithApi(idToken)
    } catch (err: any) {
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid OTP. Please check and try again.')
      } else {
        setError(err.response?.data?.error?.message || err.message || 'Verification failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <div id="recaptcha-container" />

      {/* Top: Back arrow */}
      <div className="px-4 pt-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4 text-gray-700" />
        </button>
      </div>

      {/* Illustration */}
      <div className="flex justify-center py-6">
        <div className="w-28 h-28 rounded-full bg-blue-50 flex items-center justify-center">
          <span className="text-5xl">📍</span>
        </div>
      </div>

      {/* Heading */}
      <div className="px-6 text-center">
        <h1 className="text-2xl font-bold text-primary">
          Welcome to GetNear <span className="text-blue-400">●</span>
        </h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Login to save your searches, favorites &amp; get better recommendations.
        </p>
      </div>

      {/* Card Section */}
      <div className="mx-4 mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 'phone' ? (
            <motion.div key="phone" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Login / Sign up</h2>
              <p className="text-sm text-gray-500 mb-5">Enter your mobile number to receive OTP</p>

              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                {/* Phone input */}
                <div className="flex items-stretch gap-2">
                  <div className="flex h-12 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700 gap-1.5">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

                {/* Send OTP button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Sending OTP…' : 'Send OTP →'}
                </button>

                {/* Privacy note */}
                <div className="flex items-center gap-2 justify-center">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs text-gray-500">We never share your number with anyone.</span>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-1">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400">or continue with</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* Google button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full h-12 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Apple button */}
                <button
                  type="button"
                  disabled={loading}
                  className="w-full h-12 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div key="otp" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Verify OTP</h2>
              <p className="text-sm text-gray-500 mb-5">
                Enter the 6-digit code sent to <span className="font-semibold text-gray-900">+91 {phone}</span>
              </p>

              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="● ● ● ● ● ●"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoComplete="one-time-code"
                  className="h-14 w-full rounded-xl border border-gray-200 bg-white px-4 text-center text-xl tracking-[0.5em] text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />

                {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full h-12 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Verifying…' : 'Verify OTP →'}
                </button>

                <button
                  type="button"
                  onClick={() => { setDirection(-1); setStep('phone'); setError(null); setOtp('') }}
                  className="text-center text-sm text-primary font-medium hover:underline"
                >
                  ← Change number
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Why login info card */}
      <div className="mx-4 mt-5 rounded-xl bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Why login?</p>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            Save your favorite places, get personalized recommendations, sync across devices, and access exclusive deals.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-6 py-5 text-center">
        <p className="text-[11px] text-gray-400 leading-relaxed">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-primary underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}

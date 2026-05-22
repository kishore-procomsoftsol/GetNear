import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/lib/stores/authStore'

// Extend the Axios request config to support the retry flag
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

// Singleton Axios instance for all API calls
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request Interceptor ────────────────────────────────────────────────────
// Reads the current access_token from authStore and injects it as a Bearer
// token on every outgoing request. No-ops if there is no active session.
apiClient.interceptors.request.use(
  (config) => {
    const session = useAuthStore.getState().session
    if (session?.access_token) {
      config.headers['Authorization'] = `Bearer ${session.access_token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response Interceptor ───────────────────────────────────────────────────
// On a 401 response:
//   1. Attempt a token refresh using the stored refresh_token.
//   2. On success: update authStore and retry the original request once.
//   3. On failure: sign the user out and redirect to /login.
//
// The `_retry` flag prevents infinite refresh loops — if the retried request
// also returns 401 we reject immediately instead of refreshing again.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true

      const refreshToken = useAuthStore.getState().session?.refresh_token

      if (!refreshToken) {
        // No refresh token available — sign out and redirect
        useAuthStore.getState().signOut()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      try {
        // Call the refresh endpoint directly (no auth header needed)
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        )

        const { access_token, refresh_token: newRefreshToken } = data.data

        // Persist the new tokens in authStore
        useAuthStore.getState().setSession({
          ...useAuthStore.getState().session!,
          access_token,
          refresh_token: newRefreshToken ?? refreshToken,
        })

        // Retry the original request with the new access token
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed — clear session and redirect to login
        useAuthStore.getState().signOut()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient

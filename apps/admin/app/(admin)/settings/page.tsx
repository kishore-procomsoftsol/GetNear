'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'

interface PlatformSettings {
  freeSearchRadius: number
  plusSearchRadius: number
  freeSaveLimit: number
  freeCollectionLimit: number
  maxPhotosPerBusiness: number
  autoApproveBusinesses: boolean
  maintenanceMode: boolean
}

const DEFAULT_SETTINGS: PlatformSettings = {
  freeSearchRadius: 10,
  plusSearchRadius: 50,
  freeSaveLimit: 10,
  freeCollectionLimit: 2,
  maxPhotosPerBusiness: 10,
  autoApproveBusinesses: false,
  maintenanceMode: false,
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [adminProfile, setAdminProfile] = useState({ name: '', email: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    // Load settings from localStorage (in a real app, this would be an API call)
    const stored = localStorage.getItem('getnear_platform_settings')
    if (stored) {
      try { setSettings(JSON.parse(stored)) } catch {}
    }

    // Load admin profile
    const token = localStorage.getItem('admin_token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setAdminProfile({
          name: payload.user_metadata?.name || payload.name || '',
          email: payload.email || '',
          phone: payload.phone || '',
        })
      } catch {}
    }
  }, [])

  function handleSaveSettings() {
    setSaving(true)
    setSaved(false)
    // Simulate save (in production, this would be a POST /admin/settings)
    setTimeout(() => {
      localStorage.setItem('getnear_platform_settings', JSON.stringify(settings))
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }, 500)
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (passwordForm.newPass.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordError('Passwords do not match')
      return
    }

    // In production, call API to change password
    setPasswordSuccess(true)
    setPasswordForm({ current: '', newPass: '', confirm: '' })
    setTimeout(() => setPasswordSuccess(false), 3000)
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Platform configuration and admin preferences.</p>
      </div>

      {/* ─── Platform Limits ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
            <span className="text-lg">⚙️</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Platform Limits</h2>
            <p className="text-sm text-gray-500">Configure free tier and Plus tier limits</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Free Search Radius (km)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.freeSearchRadius}
              onChange={(e) => setSettings({ ...settings, freeSearchRadius: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Plus Search Radius (km)</label>
            <input
              type="number"
              min={1}
              max={200}
              value={settings.plusSearchRadius}
              onChange={(e) => setSettings({ ...settings, plusSearchRadius: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Free Tier Save Limit</label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.freeSaveLimit}
              onChange={(e) => setSettings({ ...settings, freeSaveLimit: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Free Tier Collection Limit</label>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.freeCollectionLimit}
              onChange={(e) => setSettings({ ...settings, freeCollectionLimit: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Max Photos Per Business</label>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.maxPhotosPerBusiness}
              onChange={(e) => setSettings({ ...settings, maxPhotosPerBusiness: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* ─── Feature Flags ───────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
            <span className="text-lg">🚀</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Feature Flags</h2>
            <p className="text-sm text-gray-500">Toggle platform features on or off</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Auto-approve */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Auto-Approve Businesses</p>
              <p className="text-xs text-gray-500">Skip manual review for new business submissions</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.autoApproveBusinesses}
              onClick={() => setSettings({ ...settings, autoApproveBusinesses: !settings.autoApproveBusinesses })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoApproveBusinesses ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.autoApproveBusinesses ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Maintenance Mode */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Maintenance Mode</p>
              <p className="text-xs text-gray-500">Show maintenance page to all non-admin users</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.maintenanceMode}
              onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="h-10 px-6 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">✓ Settings saved</span>
          )}
        </div>
      </section>

      {/* ─── Admin Profile ───────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
            <span className="text-lg">👤</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Admin Profile</h2>
            <p className="text-sm text-gray-500">Your account information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={adminProfile.name}
              onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={adminProfile.email}
              disabled
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              value={adminProfile.phone}
              onChange={(e) => setAdminProfile({ ...adminProfile, phone: e.target.value })}
              placeholder="+919876543210"
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* ─── Change Password ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
            <span className="text-lg">🔒</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
            <p className="text-sm text-gray-500">Update your admin password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="flex flex-col gap-4 max-w-sm">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Current Password</label>
            <input
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
              required
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              value={passwordForm.newPass}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
              required
              minLength={6}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              required
              minLength={6}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {passwordError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">Password updated successfully!</p>
          )}

          <button
            type="submit"
            className="h-10 w-fit px-6 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Update Password
          </button>
        </form>
      </section>

      {/* ─── Danger Zone ─────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
            <span className="text-lg">⚠️</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-red-700">Danger Zone</h2>
            <p className="text-sm text-gray-500">Irreversible actions</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-lg border border-red-200 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Clear All Search History</p>
              <p className="text-xs text-gray-500">Remove all user search history from the database</p>
            </div>
            <button
              type="button"
              onClick={() => { if (confirm('Are you sure? This cannot be undone.')) { /* API call */ } }}
              className="px-4 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-red-200 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Reset Platform Analytics</p>
              <p className="text-xs text-gray-500">Clear all analytics data and start fresh</p>
            </div>
            <button
              type="button"
              onClick={() => { if (confirm('Are you sure? This cannot be undone.')) { /* API call */ } }}
              className="px-4 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

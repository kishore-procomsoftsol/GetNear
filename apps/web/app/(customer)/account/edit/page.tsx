'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/lib/stores/authStore'
import apiClient from '@/lib/api'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const editProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
})

type EditProfileValues = z.infer<typeof editProfileSchema>

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EditProfilePage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const [saving, setSaving] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)

  const form = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
    },
  })

  const onSubmit = async (values: EditProfileValues) => {
    setSaving(true)
    setApiError(null)
    setSuccess(false)
    try {
      const payload: Record<string, string> = {}
      if (values.name) payload.name = values.name
      if (values.email) payload.email = values.email

      const res = await apiClient.put<{ data: typeof user }>('/user/profile', payload)
      if (res.data.data) {
        setUser(res.data.data as any)
      }
      setSuccess(true)
    } catch (err: any) {
      setApiError(err?.response?.data?.error?.message ?? 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-dark" />
        </button>
        <h1 className="text-lg font-semibold text-dark">Edit Profile</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <Avatar size="lg">
            {user?.avatar_url && <AvatarImage src={user.avatar_url} alt="Avatar" />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-white shadow-md"
            aria-label="Change avatar"
          >
            <Camera className="h-3 w-3" />
          </button>
        </div>
        <p className="text-xs text-muted">Tap to change photo</p>
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="Your name"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />

        <div>
          <label className="text-sm font-medium text-dark">Phone</label>
          <p className="mt-1 text-sm text-muted bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            {user?.phone ?? 'Not set'}
          </p>
          <p className="mt-0.5 text-xs text-muted">Phone number cannot be changed</p>
        </div>

        {apiError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
            {apiError}
          </p>
        )}

        {success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success" role="status">
            Profile updated successfully!
          </p>
        )}

        <Button type="submit" size="lg" className="w-full mt-2" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
}

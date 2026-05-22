'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import apiClient from '@/lib/api'

export default function EditListingPage() {
  const router = useRouter()
  const [business, setBusiness] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    // Fetch the business owned by the current user
    apiClient.get('/dashboard/stats')
      .then(() => {
        // The dashboard routes require a business — if stats work, we have one
        // For now, show a placeholder edit form
        setBusiness({ name: '', description: '', phone: '', email: '', website: '', address: '' })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    // PUT /businesses/:id would be called here
    setTimeout(() => setSaving(false), 1000)
  }

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full rounded-xl" /></div>

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-dark">My Listing</h1>
        <Badge variant="warning" className="text-[10px]">Pending Review</Badge>
      </div>

      <div className="space-y-4">
        <Input label="Business Name" placeholder="Your business name" defaultValue={business?.name} />
        <div>
          <label className="text-sm font-medium text-dark mb-1 block">Description</label>
          <textarea
            rows={4}
            placeholder="Describe your business…"
            defaultValue={business?.description}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>
        <Input label="Phone" placeholder="+91 9876543210" defaultValue={business?.phone} />
        <Input label="Email" type="email" placeholder="business@example.com" defaultValue={business?.email} />
        <Input label="Website" placeholder="https://example.com" defaultValue={business?.website} />
        <Input label="Address" placeholder="Full address" defaultValue={business?.address} />
      </div>

      <Button size="lg" className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  )
}

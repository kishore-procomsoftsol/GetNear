'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import apiClient from '@/lib/api'

interface BusinessListing {
  id: string
  name: string
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
  whatsapp: string | null
  address: string | null
  city: string | null
  state: string | null
  pin: string | null
  status: string
  verified: boolean
  categories?: { name: string; icon: string } | null
}

export default function EditListingPage() {
  const router = useRouter()
  const [business, setBusiness] = React.useState<BusinessListing | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Form state
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [website, setWebsite] = React.useState('')
  const [whatsapp, setWhatsapp] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [city, setCity] = React.useState('')
  const [state, setState] = React.useState('')
  const [pin, setPin] = React.useState('')

  React.useEffect(() => {
    apiClient
      .get<{ data: BusinessListing }>('/dashboard/listing')
      .then((res) => {
        const biz = res.data.data
        setBusiness(biz)
        setName(biz.name ?? '')
        setDescription(biz.description ?? '')
        setPhone(biz.phone ?? '')
        setEmail(biz.email ?? '')
        setWebsite(biz.website ?? '')
        setWhatsapp(biz.whatsapp ?? '')
        setAddress(biz.address ?? '')
        setCity(biz.city ?? '')
        setState(biz.state ?? '')
        setPin(biz.pin ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await apiClient.put<{ data: BusinessListing }>('/dashboard/listing', {
        name, description, phone, email, website, whatsapp, address, city, state, pin,
      })
      setBusiness(res.data.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const statusBadge = business?.status === 'active'
    ? <Badge variant="success" className="text-[10px]">Active</Badge>
    : business?.status === 'pending'
    ? <Badge variant="warning" className="text-[10px]">Pending Review</Badge>
    : <Badge variant="destructive" className="text-[10px]">{business?.status}</Badge>

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Listing</h1>
        {statusBadge}
      </div>

      <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-5">
        <Input
          label="Business Name"
          placeholder="Your business name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <label className="text-sm font-medium text-gray-900 mb-1 block">Description</label>
          <textarea
            rows={4}
            placeholder="Describe your business…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Phone" placeholder="+91 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="WhatsApp" placeholder="+91 9876543210" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Email" type="email" placeholder="business@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Website" placeholder="https://example.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <Input label="Address" placeholder="Full address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="City" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input label="State" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
          <Input label="PIN Code" placeholder="530001" value={pin} onChange={(e) => setPin(e.target.value)} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-green-600">Changes saved successfully!</p>
      )}

      <Button size="lg" className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  )
}

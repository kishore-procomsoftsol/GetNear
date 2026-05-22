'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import apiClient from '@/lib/api'
import { CATEGORIES } from '@getnear/config'
import { cn } from '@/lib/utils'
import { LocationPicker, type LocationData } from '@/components/maps/LocationPicker'
import { INDIAN_STATES } from '@/components/maps/indianStates'
import {
  ArrowLeft,
  Building2,
  Phone,
  MapPin,
  Camera,
  ClipboardCheck,
  Mail,
  Globe,
  Store,
  Briefcase,
  Laptop,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const step1Schema = z.object({
  name: z.string().min(1, 'Business name is required').max(100),
  category_id: z.string().min(1, 'Category is required'),
  type: z.enum(['physical', 'service', 'online']),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
})

export const locationStepSchema = z.object({
  lat: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  lng: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
  address: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pin: z.string().regex(/^\d{6}$/, 'PIN code must be exactly 6 digits').or(z.literal('')),
})

const contactSchema = z.object({
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(10, 'Phone number must be 10 digits'),
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  whatsapp: z.string().max(10).optional(),
})

const formSchema = step1Schema.merge(locationStepSchema).merge(contactSchema)

type FormValues = z.infer<typeof formSchema>

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { label: 'Business Info', icon: Building2 },
  { label: 'Contact & Location', icon: Phone },
  { label: 'Business Details', icon: Store },
  { label: 'Photos & More', icon: Camera },
  { label: 'Review & Submit', icon: ClipboardCheck },
]

const BUSINESS_TYPES = [
  {
    value: 'physical' as const,
    label: 'Physical Store',
    description: 'Storefront business',
    icon: Store,
  },
  {
    value: 'service' as const,
    label: 'Service Business',
    description: 'Visit to customer',
    icon: Briefcase,
  },
  {
    value: 'online' as const,
    label: 'Online Business',
    description: 'Online only',
    icon: Laptop,
  },
]

const DRAFT_KEY = 'getnear_add_business_draft'

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function AddBusinessPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [useCurrentLocation, setUseCurrentLocation] = React.useState(false)

  // Load draft from localStorage on mount
  const savedDraft = React.useMemo(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: savedDraft?.name ?? '',
      category_id: savedDraft?.category_id ?? '',
      type: savedDraft?.type ?? 'physical',
      description: savedDraft?.description ?? '',
      phone: savedDraft?.phone ?? '',
      email: savedDraft?.email ?? '',
      website: savedDraft?.website ?? '',
      whatsapp: savedDraft?.whatsapp ?? '',
      lat: savedDraft?.lat ?? 0,
      lng: savedDraft?.lng ?? 0,
      address: savedDraft?.address ?? '',
      address2: savedDraft?.address2 ?? '',
      city: savedDraft?.city ?? '',
      state: savedDraft?.state ?? '',
      pin: savedDraft?.pin ?? '',
    },
    mode: 'onTouched',
  })

  const topCategories = CATEGORIES.filter((c) => c.parent_id === null)
  const descriptionValue = form.watch('description') ?? ''

  // -------------------------------------------
  // Save Draft
  // -------------------------------------------

  function handleSaveDraft() {
    const values = form.getValues()
    localStorage.setItem(DRAFT_KEY, JSON.stringify(values))
  }

  // -------------------------------------------
  // LocationPicker Integration
  // -------------------------------------------

  const handleLocationChange = React.useCallback(
    (data: LocationData) => {
      form.setValue('lat', data.lat, { shouldValidate: true })
      form.setValue('lng', data.lng, { shouldValidate: true })
      form.setValue('address', data.address, { shouldValidate: true })
      form.setValue('city', data.city, { shouldValidate: true })
      form.setValue('state', data.state, { shouldValidate: true })
      form.setValue('pin', data.pinCode, { shouldValidate: true })
    },
    [form]
  )

  // -------------------------------------------
  // Form Submission
  // -------------------------------------------

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    setError(null)
    try {
      await apiClient.post('/dashboard/businesses', {
        name: values.name,
        category_id: values.category_id,
        type: values.type,
        description: values.description,
        phone: values.phone,
        email: values.email,
        website: values.website,
        whatsapp: values.whatsapp,
        address: values.address,
        city: values.city,
        state: values.state,
        pin: values.pin,
        lat: values.lat,
        lng: values.lng,
      })
      // Clear draft on successful submission
      localStorage.removeItem(DRAFT_KEY)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* ================================================================ */}
      {/* Header                                                           */}
      {/* ================================================================ */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Add Your Business</h1>
          <Button variant="outline" size="sm" onClick={handleSaveDraft}>
            Save Draft
          </Button>
        </div>
        <p className="max-w-3xl mx-auto mt-1 text-sm text-gray-500 text-center">
          Add your business details and start getting discovered by thousands of nearby customers.
        </p>
      </header>

      {/* ================================================================ */}
      {/* Step Progress Indicator                                           */}
      {/* ================================================================ */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === 0
            return (
              <React.Fragment key={s.label}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-full',
                      isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium text-center max-w-[70px]',
                      isActive ? 'text-blue-600' : 'text-gray-400'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-200 mx-2 mt-[-20px]" />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Form                                                             */}
      {/* ================================================================ */}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-3xl mx-auto px-4 pb-8 flex flex-col gap-6"
      >
        {/* ============================================================== */}
        {/* Section 1: Basic Information                                    */}
        {/* ============================================================== */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>
              <p className="text-sm text-gray-500">Tell us about your business</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Business Name */}
            <Input
              label="Business Name *"
              placeholder="e.g. Chai Point"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />

            {/* Business Category */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-dark">Business Category *</label>
              <select
                {...form.register('category_id')}
                className={cn(
                  'h-10 w-full rounded-lg border bg-white px-3 text-sm text-dark',
                  'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                  form.formState.errors.category_id
                    ? 'border-danger focus:ring-danger'
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                <option value="">Select primary category</option>
                {topCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.category_id && (
                <p className="text-xs text-danger" role="alert">
                  {form.formState.errors.category_id.message}
                </p>
              )}
            </div>

            {/* Business Type */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-dark">Business Type *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {BUSINESS_TYPES.map((bt) => {
                  const Icon = bt.icon
                  const isSelected = form.watch('type') === bt.value
                  return (
                    <button
                      key={bt.value}
                      type="button"
                      onClick={() => form.setValue('type', bt.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-center transition-all',
                        isSelected
                          ? 'border-blue-600 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-6 w-6',
                          isSelected ? 'text-blue-600' : 'text-gray-400'
                        )}
                      />
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isSelected ? 'text-blue-600' : 'text-gray-700'
                        )}
                      >
                        {bt.label}
                      </span>
                      <span className="text-xs text-gray-500">{bt.description}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Business Description */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-dark">Business Description *</label>
              <textarea
                {...form.register('description')}
                rows={4}
                maxLength={500}
                placeholder="Tell customers about your business…"
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm text-dark placeholder:text-muted resize-none',
                  'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                  form.formState.errors.description
                    ? 'border-danger focus:ring-danger'
                    : 'border-gray-300 hover:border-gray-400'
                )}
              />
              <div className="flex justify-end">
                <span className="text-xs text-gray-400">
                  {descriptionValue.length}/500
                </span>
              </div>
              {form.formState.errors.description && (
                <p className="text-xs text-danger" role="alert">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* Section 2: Contact Information                                  */}
        {/* ============================================================== */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
              <Phone className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Contact Information</h2>
              <p className="text-sm text-gray-500">How customers can reach you</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Phone Number */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-dark">Phone Number *</label>
              <div className="flex">
                <div className="flex items-center gap-1.5 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-600">
                  <span className="text-base">🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  {...form.register('phone')}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  className={cn(
                    'h-10 flex-1 rounded-r-lg border bg-white px-3 text-sm text-dark placeholder:text-muted',
                    'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                    form.formState.errors.phone
                      ? 'border-danger focus:ring-danger'
                      : 'border-gray-300 hover:border-gray-400'
                  )}
                />
              </div>
              {form.formState.errors.phone && (
                <p className="text-xs text-danger" role="alert">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-dark">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  {...form.register('email')}
                  type="email"
                  placeholder="business@example.com"
                  className={cn(
                    'h-10 w-full rounded-lg border bg-white pl-10 pr-3 text-sm text-dark placeholder:text-muted',
                    'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                    form.formState.errors.email
                      ? 'border-danger focus:ring-danger'
                      : 'border-gray-300 hover:border-gray-400'
                  )}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-xs text-danger" role="alert">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Website */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-dark">Website (Optional)</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  {...form.register('website')}
                  type="url"
                  placeholder="https://yourwebsite.com"
                  className={cn(
                    'h-10 w-full rounded-lg border bg-white pl-10 pr-3 text-sm text-dark placeholder:text-muted',
                    'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                    form.formState.errors.website
                      ? 'border-danger focus:ring-danger'
                      : 'border-gray-300 hover:border-gray-400'
                  )}
                />
              </div>
              {form.formState.errors.website && (
                <p className="text-xs text-danger" role="alert">
                  {form.formState.errors.website.message}
                </p>
              )}
            </div>

            {/* WhatsApp Number */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-dark">WhatsApp Number (Optional)</label>
              <div className="flex">
                <div className="flex items-center gap-1.5 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-600">
                  <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span className="text-base">🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  {...form.register('whatsapp')}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  className={cn(
                    'h-10 flex-1 rounded-r-lg border bg-white px-3 text-sm text-dark placeholder:text-muted',
                    'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                    'border-gray-300 hover:border-gray-400'
                  )}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* Section 3: Business Location                                    */}
        {/* ============================================================== */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Business Location</h2>
              <p className="text-sm text-gray-500">Where is your business located?</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Use Current Location Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Use My Current Location</p>
                <p className="text-xs text-gray-500">Detect my location automatically</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={useCurrentLocation}
                onClick={() => setUseCurrentLocation(!useCurrentLocation)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  useCurrentLocation ? 'bg-blue-600' : 'bg-gray-300'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    useCurrentLocation ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* OR Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Or Enter Manually
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Manual Address Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Address Line 1 *"
                placeholder="Street address"
                error={form.formState.errors.address?.message}
                {...form.register('address')}
              />
              <Input
                label="Address Line 2 (Optional)"
                placeholder="Apt, suite, floor"
                {...form.register('address2')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="City *"
                placeholder="City"
                error={form.formState.errors.city?.message}
                {...form.register('city')}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-dark">State *</label>
                <select
                  {...form.register('state')}
                  className={cn(
                    'h-10 w-full rounded-lg border bg-white px-3 text-sm text-dark',
                    'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                    form.formState.errors.state
                      ? 'border-danger focus:ring-danger'
                      : 'border-gray-300 hover:border-gray-400'
                  )}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.state && (
                  <p className="text-xs text-danger" role="alert">
                    {form.formState.errors.state.message}
                  </p>
                )}
              </div>
              <Input
                label="PIN Code *"
                placeholder="6-digit PIN"
                maxLength={6}
                error={form.formState.errors.pin?.message}
                {...form.register('pin')}
              />
            </div>

            {/* LocationPicker Map */}
            <LocationPicker
              initialValues={{
                lat: form.getValues('lat'),
                lng: form.getValues('lng'),
                address: form.getValues('address'),
                city: form.getValues('city'),
                state: form.getValues('state'),
                pinCode: form.getValues('pin'),
              }}
              onChange={handleLocationChange}
              errors={{
                lat: form.formState.errors.lat?.message,
                lng: form.formState.errors.lng?.message,
                address: form.formState.errors.address?.message,
                city: form.formState.errors.city?.message,
                state: form.formState.errors.state?.message,
                pinCode: form.formState.errors.pin?.message,
              }}
            />
          </div>
        </section>

        {/* ============================================================== */}
        {/* Error Message                                                   */}
        {/* ============================================================== */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ============================================================== */}
        {/* Submit Button                                                   */}
        {/* ============================================================== */}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Continue →'}
        </Button>
      </form>
    </div>
  )
}

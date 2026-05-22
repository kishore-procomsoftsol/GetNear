'use client'

import * as React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

export default function AnalyticsPage() {
  const [period, setPeriod] = React.useState<'7d' | '30d' | '90d'>('7d')
  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<any>(null)

  React.useEffect(() => {
    setLoading(true)
    apiClient.get(`/dashboard/stats`)
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-dark">Analytics</h1>
        <div className="flex gap-1 rounded-lg border border-gray-200 p-0.5">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                period === p ? 'bg-primary text-white' : 'text-muted hover:text-dark'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-6">
            <h2 className="text-sm font-semibold text-dark mb-4">Views Over Time</h2>
            <div className="h-40 flex items-center justify-center text-sm text-muted bg-gray-50 rounded-lg">
              Chart visualization — integrate Recharts here
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-6">
            <h2 className="text-sm font-semibold text-dark mb-4">Lead Distribution</h2>
            <div className="grid grid-cols-2 gap-3">
              {data && Object.entries(data).map(([key, val]: [string, any]) => (
                <div key={key} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <span className="text-xs text-muted capitalize">{key}</span>
                  <span className="text-sm font-semibold text-dark">{val?.count ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import * as React from 'react'
import { Phone, Navigation, Globe, Bookmark, Eye, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import apiClient from '@/lib/api'

interface Lead {
  id: string
  type: string
  created_at: string
  user_id: string | null
}

const typeIcons: Record<string, React.ElementType> = {
  call: Phone, direction: Navigation, website: Globe,
  save: Bookmark, view: Eye, whatsapp: MessageCircle,
}

const typeColors: Record<string, string> = {
  call: 'bg-blue-100 text-blue-700', direction: 'bg-green-100 text-green-700',
  website: 'bg-purple-100 text-purple-700', save: 'bg-amber-100 text-amber-700',
  view: 'bg-gray-100 text-gray-700', whatsapp: 'bg-emerald-100 text-emerald-700',
}

export default function LeadsPage() {
  const [leads, setLeads] = React.useState<Lead[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiClient.get<{ data: Lead[] }>('/dashboard/leads')
      .then((res) => setLeads(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-bold text-dark">Recent Leads</h1>

      {loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}

      {!loading && leads.length === 0 && <p className="text-sm text-muted text-center py-8">No leads recorded yet.</p>}

      {!loading && leads.map((lead) => {
        const Icon = typeIcons[lead.type] ?? Eye
        return (
          <div key={lead.id} className="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3">
            <div className={`rounded-lg p-2 ${typeColors[lead.type] ?? 'bg-gray-100 text-gray-700'}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-dark capitalize">{lead.type}</p>
              <p className="text-xs text-muted">{new Date(lead.created_at).toLocaleString()}</p>
            </div>
            {lead.user_id && <Badge variant="outline" className="text-[10px]">Registered</Badge>}
          </div>
        )
      })}
    </div>
  )
}

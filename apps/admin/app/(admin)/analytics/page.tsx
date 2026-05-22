'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface AnalyticsData {
  totalSearches: number
  totalLeads: number
  newUsersThisWeek: number
  newBusinessesThisWeek: number
  topCategories: { name: string; count: number }[]
  topCities: { city: string; count: number }[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('7d')

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  async function fetchAnalytics() {
    try {
      setLoading(true)
      const res = await api.get('/admin/analytics', { params: { period } })
      setData(res.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Analytics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Analytics</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-red-600">{error}</div>
      </div>
    )
  }

  const kpiCards = [
    { label: 'Total Searches', value: data?.totalSearches ?? 0, icon: '🔍', bg: 'bg-blue-50', color: 'text-blue-600' },
    { label: 'Total Leads', value: data?.totalLeads ?? 0, icon: '📞', bg: 'bg-green-50', color: 'text-green-600' },
    { label: 'New Users (week)', value: data?.newUsersThisWeek ?? 0, icon: '👥', bg: 'bg-purple-50', color: 'text-purple-600' },
    { label: 'New Businesses (week)', value: data?.newBusinessesThisWeek ?? 0, icon: '🏪', bg: 'bg-orange-50', color: 'text-orange-600' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-lg">📈</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-10 w-10 rounded-full ${card.bg} flex items-center justify-center`}>
                <span className="text-lg">{card.icon}</span>
              </div>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Daily Searches Chart Placeholder */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Searches</h3>
        <div className="h-48 flex items-end justify-between gap-1 px-4">
          <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,100 L57,80 L114,90 L171,50 L228,60 L285,30 L342,40 L400,20"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M0,100 L57,80 L114,90 L171,50 L228,60 L285,30 L342,40 L400,20 L400,120 L0,120 Z"
              fill="url(#chartGradient)"
            />
          </svg>
        </div>
        <div className="flex justify-between mt-2 px-4 text-xs text-gray-400">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Categories</h3>
          {data?.topCategories && data.topCategories.length > 0 ? (
            <div className="space-y-3">
              {data.topCategories.map((cat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{cat.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${(cat.count / (data.topCategories[0]?.count || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-8 text-right">
                      {cat.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data available</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Cities</h3>
          {data?.topCities && data.topCities.length > 0 ? (
            <div className="space-y-3">
              {data.topCities.map((city, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{city.city}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${(city.count / (data.topCities[0]?.count || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-8 text-right">
                      {city.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data available</p>
          )}
        </div>
      </div>
    </div>
  )
}

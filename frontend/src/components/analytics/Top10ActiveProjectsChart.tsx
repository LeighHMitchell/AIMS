"use client"

import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { BarChart3, Activity, Table as TableIcon } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch';

interface Top10ActiveProjectsChartProps {
  filters?: {
    country?: string
    sector?: string
  }
  refreshKey: number
  onDataChange?: (data: PartnerData[]) => void
  compact?: boolean
}

interface PartnerData {
  orgId: string
  name: string
  acronym: string | null
  projectCount: number
  shortName: string
}

// Custom tooltip component for consistent styling
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-slate-800 px-3 py-2 rounded-lg shadow-lg border border-slate-700">
        <p className="text-white font-medium text-sm">{data.name}</p>
        <p className="text-slate-300 text-sm mt-1">
          {data.projectCount} active project{data.projectCount !== 1 ? 's' : ''}
        </p>
      </div>
    )
  }
  return null
}

type ViewMode = 'bar' | 'table'

export function Top10ActiveProjectsChart({
  filters,
  refreshKey,
  onDataChange,
  compact = false
}: Top10ActiveProjectsChartProps) {
  const [data, setData] = useState<PartnerData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('bar')

  useEffect(() => {
    fetchData()
  }, [filters, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        limit: '10'
      })

      if (filters?.country && filters.country !== 'all') {
        params.append('country', filters.country)
      }
      if (filters?.sector && filters.sector !== 'all') {
        params.append('sector', filters.sector)
      }

      const response = await apiFetch(`/api/analytics/top-10/active-projects?${params}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Top10ActiveProjectsChart] API error:', response.status, errorText)
        throw new Error('Failed to fetch data')
      }

      const result = await response.json()
      console.log('[Top10ActiveProjectsChart] API response:', result)

      const partners = (result.partners || []).map((p: any) => ({
        ...p,
        shortName: p.acronym || p.name.split(' ').slice(0, 2).join(' ')
      }))

      console.log('[Top10ActiveProjectsChart] Processed partners:', partners.length)
      setData(partners)
      onDataChange?.(partners)
    } catch (error) {
      console.error('[Top10ActiveProjectsChart] Error:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const BAR_COLOR = '#4C5568'
  const OTHERS_COLOR = '#94a3b8'

  // Compact mode renders just the chart
  if (compact) {
    if (loading) {
      return <Skeleton className="h-full w-full" />
    }
    if (!data || data.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          <p className="text-sm">No data available</p>
        </div>
      )
    }
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="shortName" tick={{ fontSize: 9 }} width={55} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Bar dataKey="projectCount" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.orgId === 'others' ? OTHERS_COLOR : BAR_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[400px] w-full bg-slate-100" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg">
        <div className="text-center">
          <Activity className="h-8 w-8 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No active project data available</p>
          <p className="text-sm text-slate-500 mt-2">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex justify-end">
        <div className="flex gap-1 border rounded-lg p-1 bg-white">
          <Button
            variant={viewMode === 'bar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('bar')}
            className="h-8"
            title="Bar Chart"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-8"
            title="Table"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'bar' ? (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#cbd5e1' }}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Bar dataKey="projectCount" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.orgId === 'others' ? OTHERS_COLOR : BAR_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Organization</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Active Projects</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry, index) => (
                <tr key={entry.orgId} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="py-3 px-4 text-slate-900">
                    {entry.name}{entry.acronym ? ` (${entry.acronym})` : ''}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-900 font-medium">
                    {entry.projectCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-slate-600 leading-relaxed">
        This chart ranks development partners by the number of activities where they are listed as a funding or implementing organization.
        Use this to identify the most active partners in your country's development landscape and to facilitate coordination
        with key stakeholders who have significant operational presence.
      </p>
    </div>
  )
}
















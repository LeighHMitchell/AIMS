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
import { BarChart3, Activity } from 'lucide-react'

interface Top10ActiveProjectsChartProps {
  filters?: {
    country?: string
    sector?: string
  }
  refreshKey: number
  onDataChange?: (data: PartnerData[]) => void
}

interface PartnerData {
  orgId: string
  name: string
  acronym: string | null
  projectCount: number
  shortName: string
}

export function Top10ActiveProjectsChart({
  filters,
  refreshKey,
  onDataChange
}: Top10ActiveProjectsChartProps) {
  const [data, setData] = useState<PartnerData[]>([])
  const [loading, setLoading] = useState(true)

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

      const response = await fetch(`/api/analytics/top-10/active-projects?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }

      const result = await response.json()
      
      const partners = (result.partners || []).map((p: any) => ({
        ...p,
        shortName: p.acronym || p.name.split(' ').slice(0, 2).join(' ')
      }))

      setData(partners)
      onDataChange?.(partners)
    } catch (error) {
      console.error('[Top10ActiveProjectsChart] Error:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // Generate shades of green for bars
  const barColors = [
    '#15803d', // green-700
    '#16a34a', // green-600
    '#22c55e', // green-500
    '#4ade80', // green-400
    '#86efac', // green-300
    '#bbf7d0', // green-200
    '#15803d', // repeat
    '#16a34a',
    '#22c55e',
    '#4ade80',
    '#94a3b8' // slate-400 for "Others"
  ]

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
    <ResponsiveContainer width="100%" height={400}>
      <BarChart 
        data={data}
        layout="horizontal"
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
        <Tooltip 
          formatter={(value: number) => `${value} project${value !== 1 ? 's' : ''}`}
          contentStyle={{
            backgroundColor: '#1e293b',
            border: 'none',
            borderRadius: '8px',
            color: '#fff'
          }}
          labelStyle={{ color: '#94a3b8' }}
          cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
        />
        <Bar dataKey="projectCount" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.orgId === 'others' ? '#94a3b8' : barColors[index % (barColors.length - 1)]} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}












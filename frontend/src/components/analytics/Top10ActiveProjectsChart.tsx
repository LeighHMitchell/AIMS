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
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { Button } from '@/components/ui/button'
import { BarChart3, Activity, Table as TableIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS, OTHERS_COLOR } from '@/lib/chart-colors'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'

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
  organisationId: string | null
  name: string
  acronym: string | null
  projectCount: number
  shortName: string
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const orgDisplay = data.acronym ? `${data.name} (${data.acronym})` : data.name
    const swatchColor = data.orgId === 'others' ? OTHERS_COLOR : '#4c5568'
    return (
      <ChartTooltipCard
        title={orgDisplay}
        rows={[{ label: 'Active Projects', value: data.projectCount, color: swatchColor }]}
      />
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

      const partners = (result.partners || []).map((p: any) => ({
        ...p,
        shortName: p.acronym || p.name.split(' ').slice(0, 2).join(' ')
      }))

      setData(partners)
      // Table-friendly shape with explicit, spaced column names so the
      // expanded dialog's table view shows "Organisation ID" with the
      // IATI org id rather than the internal UUID.
      onDataChange?.(partners.map((p: PartnerData) => ({
        'Organisation ID': p.organisationId ?? '',
        'Name': p.acronym ? `${p.name} (${p.acronym})` : p.name,
        'Active Projects': p.projectCount,
      })) as any)
    } catch (error) {
      console.error('[Top10ActiveProjectsChart] Error:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // Custom Y-axis tick that never wraps text
  const NoWrapTick = ({ x, y, payload, fontSize = 11 }: any) => {
    const label = payload?.value || ''
    return (
      <text x={x} y={y} textAnchor="end" dominantBaseline="central" fill="#64748b" fontSize={fontSize}>
        {label}
      </text>
    )
  }

  // Single Blue Slate fill for all bars — bar length already encodes
  // ranking, so a varying ramp would just add noise. "Others" stays a
  // lighter shade for contrast.
  const BAR_COLOR = '#4c5568'

  // Compact mode renders just the chart
  if (compact) {
    if (loading) {
      return <ChartLoadingPlaceholder />
    }
    if (!data || data.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-body">No data available</p>
        </div>
      )
    }
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="shortName" tick={<NoWrapTick fontSize={9} />} width={55} />
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
      <ChartLoadingPlaceholder />
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <div className="text-center">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No active project data available</p>
          <p className="text-body text-muted-foreground mt-2">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex justify-end">
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('bar')}
            className={cn("h-8 w-8", viewMode === 'bar' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            title="Bar Chart"
            aria-label="Bar Chart"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('table')}
            className={cn("h-8 w-8", viewMode === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            title="Table View"
            aria-label="Table View"
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
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis
              type="number"
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              tick={<NoWrapTick fontSize={12} />}
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
          <table className="w-full text-body">
            <thead className="bg-surface-muted">
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Organisation</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Active Projects</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry, index) => (
                <tr key={entry.orgId} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 text-foreground">
                    {entry.name}{entry.acronym ? ` (${entry.acronym})` : ''}
                  </td>
                  <td className="py-3 px-4 text-right text-foreground font-medium">
                    {entry.projectCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Explanatory text */}
      <p className="text-body text-muted-foreground leading-relaxed">
        This chart ranks development partners by the number of activities where they are listed as a funding or implementing organization.
        Use this to identify the most active partners in your country's development landscape and to facilitate coordination with key stakeholders who have significant operational presence.
      </p>
    </div>
  )
}
















"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
  Label,
  Cell,
  Legend,
  LabelList,
} from 'recharts'
import { LoadingText } from '@/components/ui/loading-text'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle } from 'lucide-react'
import { getOrgTypeLabel } from '@/lib/org-type-mappings'
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'

/**
 * Organizational Positioning Map
 *
 * Figure 2 equivalent: "hidden geometry of the aid ecosystem"
 *
 * This chart creates a 2D positioning map of organisations that reveals their
 * functional role in the aid ecosystem using explicit behavioural metrics
 * rather than ML embeddings like UMAP or node2vec.
 *
 * Axes:
 * - X-axis: Humanitarian ←→ Development orientation
 *   Score ranges from -100 (fully humanitarian) to +100 (fully development)
 *   Calculated from transaction humanitarian flags with activity fallback
 *
 * - Y-axis: Funder ←→ Implementer role
 *   Positive values = net funder (more outgoing than incoming)
 *   Negative values = net implementer (more incoming than outgoing)
 *   Normalized across all organisations
 *
 * Visual encoding:
 * - Node colour = organisation type (using standard AIMS palette)
 * - Node size = total transaction volume (scaled logarithmically)
 * - Labels shown for top N organisations by volume
 *
 * TODO: Optional future node2vec/UMAP pipeline for latent dimension analysis
 * TODO: Export as image or CSV
 */

/**
 * Custom color palette for Aid Ecosystem visualization
 * Primary: #dc2625 (red), #c9a24d (gold), #5f7f7a (teal), #7b95a7 (blue-gray)
 * Neutral: #4c5568 (dark slate), #cfd0d5 (light gray), #f1f4f8 (off-white)
 */
const ORG_TYPE_COLORS: Record<string, string> = {
  // Government family - blue-gray tones
  '10': '#5a7a8a',   // Government - darker blue-gray
  '11': '#7b95a7',   // Local Government - blue-gray (primary)
  '15': '#9ab0bc',   // Other Public Sector - lighter blue-gray

  // NGO family - teal/sage tones
  '21': '#4a6b66',   // International NGO - darker teal
  '22': '#5f7f7a',   // National NGO - teal (primary)
  '23': '#7a9994',   // Regional NGO - medium teal
  '24': '#96b3ae',   // Partner Country NGO - lighter teal

  // Partnership & Multilateral - accent colors
  '30': '#8b6d5c',   // Public Private Partnership - warm brown
  '40': '#dc2625',   // Multilateral - red (primary)

  // Foundation - gold
  '60': '#c9a24d',   // Foundation - gold (primary)

  // Private Sector family - slate tones
  '70': '#4c5568',   // Private Sector - dark slate (primary)
  '71': '#3d4555',   // Private Sector Provider - darker slate
  '72': '#6b7280',   // Private Sector Recipient - medium slate
  '73': '#9ca3af',   // Private Sector Third - light slate

  // Academic & Other
  '80': '#7c6f9c',   // Academic - muted purple
  '90': '#8b9298',   // Other - neutral gray

  // Fallback for text-based types
  'Government': '#7b95a7',
  'International Financial Institution': '#dc2625',
  'Other Multilateral': '#e05a59',
}

interface EcosystemOrganization {
  id: string
  name: string
  acronym: string | null
  organisationType: string | null
  totalValue: number
  humanitarianValue: number
  developmentValue: number
  outgoingValue: number
  incomingValue: number
  humanitarianScore: number
  funderScore: number
  rank: number
  ringTier: 'inner' | 'middle' | 'outer'
}

interface OrganizationalPositioningMapProps {
  dateRange?: { from: Date; to: Date }
  refreshKey?: number
  flowType?: string
  includeHumanitarian?: boolean
  compact?: boolean
  onDataChange?: (data: EcosystemOrganization[]) => void
}

// Format currency for display
const formatCurrency = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function OrganizationalPositioningMap({
  dateRange,
  refreshKey = 0,
  flowType = 'all',
  includeHumanitarian = true,
  compact = false,
  onDataChange
}: OrganizationalPositioningMapProps) {
  const [data, setData] = useState<EcosystemOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [topNLabels, setTopNLabels] = useState(15)

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        flowType,
        includeHumanitarian: includeHumanitarian.toString(),
        transactionType: '3', // Disbursements only
        minValueUSD: '100000' // $100K threshold (lower for smaller datasets)
      })

      if (dateRange?.from) {
        params.set('dateFrom', dateRange.from.toISOString())
      }
      if (dateRange?.to) {
        params.set('dateTo', dateRange.to.toISOString())
      }

      const response = await apiFetch(`/api/analytics/ecosystem?${params}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch ecosystem data')
      }

      setData(result.data || [])
      onDataChange?.(result.data || [])
    } catch (err) {
      console.error('[OrganizationalPositioningMap] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [dateRange, flowType, includeHumanitarian, onDataChange])

  useEffect(() => {
    fetchData()
  }, [fetchData, refreshKey])

  // Prepare chart data with scaled sizes
  const chartData = useMemo(() => {
    if (!data.length) return []

    // Calculate size scaling (logarithmic to handle wide value ranges)
    const maxValue = Math.max(...data.map(d => d.totalValue))
    const minSize = 40
    const maxSize = 400

    return data.map(org => ({
      ...org,
      x: org.humanitarianScore,
      y: org.funderScore,
      // Logarithmic scaling for bubble size
      size: minSize + (Math.log10(org.totalValue + 1) / Math.log10(maxValue + 1)) * (maxSize - minSize),
      color: ORG_TYPE_COLORS[org.organisationType || '90'] || '#6b7280',
      displayName: org.acronym || (org.name.length > 20 ? org.name.substring(0, 20) + '...' : org.name)
    }))
  }, [data])

  // Get unique org types for legend
  const legendItems = useMemo(() => {
    const types = new Set(data.map(d => d.organisationType || '90'))
    return Array.from(types).map(type => ({
      value: type,
      color: ORG_TYPE_COLORS[type] || '#6b7280',
      label: getOrgTypeLabel(type)
    })).sort((a, b) => a.label.localeCompare(b.label))
  }, [data])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null

    const org = payload[0].payload as EcosystemOrganization & { color: string }
    const humanitarianPct = org.totalValue > 0
      ? ((org.humanitarianValue / org.totalValue) * 100).toFixed(1)
      : '0'

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: org.color }}
          />
          <span className="font-semibold text-slate-900 text-sm truncate">
            {org.name}
          </span>
        </div>
        {org.organisationType && (
          <p className="text-xs text-slate-500 mb-2">
            {getOrgTypeLabel(org.organisationType)}
          </p>
        )}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-600">Total Value:</span>
            <span className="font-medium text-slate-900">{formatCurrency(org.totalValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Humanitarian Share:</span>
            <span className="font-medium text-slate-900">{humanitarianPct}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Position:</span>
            <span className="font-medium text-slate-900">
              {org.funderScore > 0 ? 'Net Funder' : 'Net Implementer'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Rank:</span>
            <span className="font-medium text-slate-900">#{org.rank}</span>
          </div>
        </div>
      </div>
    )
  }

  // Render loading state
  if (loading) {
    return <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  // Render empty state
  if (!chartData.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-sm">No organization data available</p>
      </div>
    )
  }

  // Compact view - no controls, simplified
  if (compact) {
    return (
      <div className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[-100, 100]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(v) => v === 0 ? '0' : v > 0 ? 'Dev' : 'Hum'}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[-100, 100]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(v) => v === 0 ? '0' : v > 0 ? 'Fund' : 'Impl'}
            />
            <ZAxis type="number" dataKey="size" range={[20, 200]} />
            <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="5 5" />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="5 5" />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={chartData} shape="circle">
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Full view with controls and legend
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Show labels for top:</span>
          <Select
            value={topNLabels.toString()}
            onValueChange={(v) => setTopNLabels(parseInt(v))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-600">organizations</span>
        </div>

      </div>

      {/* Chart */}
      <div className="rounded-lg p-4" style={{ backgroundColor: '#ffffff', border: '1px solid #cfd0d5' }}>
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 30, right: 40, bottom: 50, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[-100, 100]}
              tick={{ fontSize: 11, fill: '#7b95a7' }}
              tickFormatter={(v) => `${v}`}
            >
              <Label
                value="Humanitarian ← → Development"
                position="bottom"
                offset={15}
                style={{ fontSize: 12, fill: '#4c5568' }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              domain={[-100, 100]}
              tick={{ fontSize: 11, fill: '#7b95a7' }}
              tickFormatter={(v) => `${v}`}
            >
              <Label
                value="Implementer ← → Funder"
                angle={-90}
                position="left"
                offset={20}
                style={{ fontSize: 12, fill: '#4c5568' }}
              />
            </YAxis>
            <ZAxis type="number" dataKey="size" range={[40, 400]} />

            {/* Quadrant reference lines */}
            <ReferenceLine
              x={0}
              stroke="#cfd0d5"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <ReferenceLine
              y={0}
              stroke="#cfd0d5"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />

            <Tooltip content={<CustomTooltip />} />

            <Scatter data={chartData} shape="circle">
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.color}
                  fillOpacity={0.7}
                  stroke={entry.rank <= topNLabels ? entry.color : 'none'}
                  strokeWidth={entry.rank <= topNLabels ? 2 : 0}
                />
              ))}
              <LabelList
                dataKey="displayName"
                position="top"
                offset={8}
                style={{ fontSize: 10, fill: '#4c5568', fontWeight: 500 }}
                content={(props: any) => {
                  const { x, y, value, index } = props
                  const entry = chartData[index]
                  if (!entry || entry.rank > topNLabels) return null
                  return (
                    <text
                      x={x}
                      y={y - 8}
                      textAnchor="middle"
                      fill="#4c5568"
                      fontSize={10}
                      fontWeight={500}
                    >
                      {value}
                    </text>
                  )
                }}
              />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Quadrant labels */}
        <div className="grid grid-cols-2 gap-4 mt-4 text-xs" style={{ color: '#7b95a7' }}>
          <div className="text-center">
            <span className="font-medium" style={{ color: '#4c5568' }}>Top-Left:</span> Humanitarian Funders
          </div>
          <div className="text-center">
            <span className="font-medium" style={{ color: '#4c5568' }}>Top-Right:</span> Development Funders
          </div>
          <div className="text-center">
            <span className="font-medium" style={{ color: '#4c5568' }}>Bottom-Left:</span> Humanitarian Implementers
          </div>
          <div className="text-center">
            <span className="font-medium" style={{ color: '#4c5568' }}>Bottom-Right:</span> Development Implementers
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-lg p-4" style={{ backgroundColor: '#f1f4f8' }}>
        <p className="text-xs font-medium mb-2" style={{ color: '#4c5568' }}>Organization Types</p>
        <div className="flex flex-wrap gap-3">
          {legendItems.map(item => (
            <div key={item.value} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs" style={{ color: '#4c5568' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="text-sm text-slate-600 leading-relaxed space-y-3">
        <p>
          This chart shows where organisations sit in the aid ecosystem based on observed financial behaviour, rather than stated mandates or organisational labels. Each organisation is positioned using two dimensions derived from transaction data. The horizontal axis reflects whether an organisation's funding is directed primarily toward humanitarian activities such as emergency relief and disaster response, or toward development activities such as infrastructure, education, and long-term service delivery. The vertical axis reflects whether an organisation acts mainly as a net funder, providing resources to others, or as a net implementer, receiving funding to deliver programmes. Together, these axes form four quadrants that highlight different functional roles within the system, including humanitarian funders, development funders, humanitarian implementers, and development implementers. The size of each bubble represents the total volume of disbursement transactions associated with that organisation over the selected period. Positions are calculated from actual financial flows, using transaction-level data with activity-level fallback where needed, ensuring that organisational roles reflect how money moves in practice rather than how organisations self-identify.
        </p>
        <p className="text-xs text-slate-500">
          <strong>METHODOLOGY:</strong> X-axis (Humanitarian ↔ Development) is calculated from transaction humanitarian flags with activity-level fallback. Y-axis (Funder ↔ Implementer) shows net provider vs receiver transaction flows, normalized across all organizations. Data source is disbursement transactions only, reflecting realized behavior.
        </p>
      </div>
    </div>
  )
}

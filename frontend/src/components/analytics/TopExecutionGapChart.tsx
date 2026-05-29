"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { InlineToolbarButtons, useChartCardTableMode } from '@/components/ui/inline-toolbar-buttons'
import { AlertTriangle } from 'lucide-react'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'
import { IATI_ORGANIZATION_TYPES } from '@/data/iati-organization-types'
import { apiFetch } from '@/lib/api-fetch'
import { CHART_STRUCTURE_COLORS, DATA_COLORS } from '@/lib/chart-colors'
import { formatAxisCurrency, formatTooltipCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'

// Spent portion (delivered) + unspent gap (committed but undelivered) = committed total.
const SPENT_COLOR = DATA_COLORS.disbursements
const GAP_COLOR = '#DC2625' // scarlet — signals undelivered commitment
const GAP_COLOR_LIGHT = '#F87171' // lighter red for the stripe
// The gap bars use diagonal dark/light-red stripes (defined once, below).
const GAP_FILL = 'url(#executionGapStripes)'

const ORG_TYPE_OPTIONS: MultiSelectOption[] = IATI_ORGANIZATION_TYPES.map((t) => ({
  value: t.code,
  label: t.name,
  subtitle: t.code,
}))

interface ExecutionGapRow {
  id: string
  iatiIdentifier: string | null
  title: string
  acronym: string | null
  committed: number
  spent: number
  gap: number
  executionRate: number
  status: string
  reportingOrgName: string
  reportingOrgAcronym: string | null
}

interface TopExecutionGapChartProps {
  refreshKey: number
  onDataChange?: (rows: any[]) => void
  compact?: boolean
}

export function TopExecutionGapChart({ refreshKey, onDataChange, compact = true }: TopExecutionGapChartProps) {
  const [data, setData] = useState<ExecutionGapRow[]>([])
  const [loading, setLoading] = useState(true)
  const tableMode = useChartCardTableMode()
  const [orgTypes, setOrgTypes] = useState<string[]>([])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, orgTypes])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: '10' })
      if (orgTypes.length > 0) params.append('orgTypes', orgTypes.join(','))
      const response = await apiFetch(`/api/analytics/top-execution-gap?${params.toString()}`)
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch data')
      }
      const rows: ExecutionGapRow[] = result.data || []
      setData(rows)
      onDataChange?.(
        rows.map(r => ({
          Activity: r.acronym ? `${r.title} (${r.acronym})` : r.title,
          'IATI Identifier': r.iatiIdentifier || '',
          Organisation: r.reportingOrgAcronym ? `${r.reportingOrgName} (${r.reportingOrgAcronym})` : r.reportingOrgName,
          'Committed (USD)': r.committed,
          'Spent (USD)': r.spent,
          'Execution Gap (USD)': r.gap,
          'Execution Rate (%)': r.executionRate,
        })),
      )
    } catch (error) {
      console.error('[TopExecutionGapChart] Error:', error)
      setData([])
      onDataChange?.([])
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() => {
    const maxTitleLength = compact ? 16 : 28
    return data.map(a => ({
      ...a,
      displayTitle: a.acronym
        ? a.acronym
        : a.title.length > maxTitleLength
          ? a.title.substring(0, maxTitleLength) + '...'
          : a.title,
    }))
  }, [data, compact])

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const item = payload[0].payload as ExecutionGapRow
    const orgDisplay = item.reportingOrgAcronym
      ? `${item.reportingOrgName} (${item.reportingOrgAcronym})`
      : item.reportingOrgName
    return (
      <ChartTooltipCard
        title={item.acronym ? `${item.title} (${item.acronym})` : item.title}
        subtitle={orgDisplay}
        maxWidth={340}
        rows={[
          { label: 'Committed', value: formatTooltipCurrency(item.committed, !compact) },
          { label: 'Spent', value: formatTooltipCurrency(item.spent, !compact), color: SPENT_COLOR },
          { label: 'Execution gap', value: formatTooltipCurrency(item.gap, !compact), color: GAP_COLOR },
          { label: 'Execution rate', value: `${item.executionRate.toFixed(1)}%` },
        ]}
      />
    )
  }

  if (loading) {
    return <ChartLoadingPlaceholder />
  }

  const hasNoData = !chartData || chartData.length === 0

  if (hasNoData && compact) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
        <AlertTriangle className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-body">No commitment data available</p>
      </div>
    )
  }

  const chartHeight = compact ? '100%' : 500

  return (
    <div className="h-full w-full flex flex-col" style={!compact ? { minHeight: 600 } : undefined}>
      {/* Diagonal dark/light-red stripes for the execution-gap bars. Standalone
          hidden SVG so both the chart bars and the legend swatch can reference it. */}
      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <pattern id="executionGapStripes" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <rect width="8" height="8" fill={GAP_COLOR} />
            <rect width="4" height="8" fill={GAP_COLOR_LIGHT} />
          </pattern>
        </defs>
      </svg>
      {/* Expanded controls row — org-type multi-select (left), table/CSV (right). */}
      {!compact && (
        <div className="flex items-center gap-3 mb-4">
          <MultiSelect
            options={ORG_TYPE_OPTIONS}
            selected={orgTypes}
            onChange={setOrgTypes}
            placeholder="All organisation types"
            selectedLabel="organisation types"
            searchable
            showSelectAll
            onClear={() => setOrgTypes([])}
            className="min-w-[220px]"
            renderOption={(opt) => (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  {opt.subtitle}
                </span>
                <span>{opt.label}</span>
              </div>
            )}
          />
          <div className="ml-auto flex items-center gap-2">
            <InlineToolbarButtons />
          </div>
        </div>
      )}

      {!tableMode && (
        <div className="flex-1">
          {hasNoData ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
              <AlertTriangle className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-body">No commitment data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: compact ? 10 : 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
                <XAxis
                  type="number"
                  fontSize={compact ? 10 : 12}
                  tick={{ fill: '#64748b' }}
                  tickFormatter={formatAxisCurrency}
                />
                <YAxis
                  type="category"
                  dataKey="displayTitle"
                  width={compact ? 120 : 200}
                  tick={{ fontSize: compact ? 9 : 11, fill: '#64748b' }}
                  interval={0}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                {!compact && <Legend />}
                {/* Stacked: delivered (spent) + undelivered (gap) = total committed. */}
                <Bar dataKey="spent" name="Spent" stackId="commit" fill={SPENT_COLOR} radius={[0, 0, 0, 0]} />
                <Bar dataKey="gap" name="Execution gap" stackId="commit" fill={GAP_FILL} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {!compact && !hasNoData && (
        <p className="mt-4 text-body text-muted-foreground leading-relaxed">
          This chart ranks the top 10 activities by execution gap — the value committed (outgoing commitments) but
          not yet delivered (disbursements + expenditures). Each bar shows total commitment, split into the spent
          portion and the remaining gap (red). A large gap points to commitments that haven&apos;t yet been spent.
          Use the organisation-type filter to focus on a kind of publisher, and table view for the exact figures.
        </p>
      )}
    </div>
  )
}

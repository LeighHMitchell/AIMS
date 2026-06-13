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
  ResponsiveContainer
} from 'recharts'
import { AlertCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, DollarSign, CalendarDays } from 'lucide-react'
import { CHART_STRUCTURE_COLORS, BUDGET_COLOR, getTransactionTypeColor } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { InlineViewToggle, InlineCsvButton, useChartCardTableMode } from '@/components/ui/inline-toolbar-buttons'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import { CustomYear } from '@/types/custom-years'
import { useYearRangeDefault } from '@/hooks/useYearRangeDefault'

interface BudgetVsActualChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
    donor?: string
    sector?: string
  }
  refreshKey: number
  onDataChange?: (data: ChartData[]) => void
}

interface ChartData {
  period: string
  budget: number
  disbursed: number
  expenditure: number
}

type GroupByMode = 'calendar' | 'fiscal' | 'quarter'

export function BudgetVsActualChart({ dateRange, filters, refreshKey, onDataChange }: BudgetVsActualChartProps) {
  const isExpanded = useChartExpansion()
  const tableMode = useChartCardTableMode()
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<GroupByMode>('calendar')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  // Custom (fiscal) years, used to drive the server's fiscal-year bucketing
  // when groupBy === 'fiscal'. Fetched once on mount.
  const [customYears, setCustomYears] = useState<CustomYear[]>([])

  useEffect(() => {
    apiFetch('/api/custom-years')
      .then((r) => r.json())
      .then((result) => setCustomYears(result.data || []))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, filters, refreshKey, groupBy, customYears])

  // Pick a fiscal (non-calendar) custom year to hand the server when the user
  // switches to Financial Year grouping. Falls back to undefined → the server
  // then buckets by calendar year, which is a safe degradation.
  const fiscalCustomYearId = (() => {
    const fiscal = customYears.find((cy) =>
      cy.name?.toLowerCase().includes('financial') ||
      cy.name?.toLowerCase().includes('fiscal') ||
      (typeof (cy as any).startMonth === 'number' && (cy as any).startMonth !== 1)
    )
    return fiscal?.id
  })()

  // Calendar short code (e.g. "CY") for the X-axis + tooltip labels — derived
  // from the Gregorian custom year so a "2024" period reads as "CY2024".
  const yearPrefix =
    customYears.find((cy) => /gregorian/i.test(cy.name || ''))?.shortName?.trim() || 'CY'
  const formatPeriodTick = (period: string | number) =>
    /^\d{4}$/.test(String(period)) ? `${yearPrefix}${period}` : String(period)

  // The chart pulls from the server route (service-role access) so it isn't
  // subject to the client RLS that hides `transactions` from the browser, and
  // so budget USD + period-spanning allocation are handled server-side.
  const fetchData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      params.set('timePeriod', groupBy === 'quarter' ? 'quarter' : 'year')
      if (groupBy === 'fiscal' && fiscalCustomYearId) {
        params.set('customYearId', fiscalCustomYearId)
      }
      if (filters?.donor && filters.donor !== 'all') {
        params.set('donor', filters.donor)
      }

      const response = await apiFetch(`/api/analytics/budget-vs-spending?${params}`)
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      // Map the server shape (disbursements/expenditures) to this chart's
      // shape (disbursed/expenditure).
      // Format the period to reflect the selected year type (e.g. "CY2023")
      // at the source, so the chart x-axis, tooltip, table view and CSV all
      // read consistently. formatPeriodTick only prefixes bare 4-digit years,
      // so quarter/fiscal labels pass through unchanged.
      // Fetch the full available span so the year picker reflects all years that have data.
      // The server returns every year it has data for; the per-chart year picker
      // (not the dashboard date filter) controls this chart's span.
      const rows: ChartData[] = (result.data || []).map((d: any) => ({
        period: formatPeriodTick(d.period),
        budget: Number(d.budget) || 0,
        disbursed: Number(d.disbursements) || 0,
        expenditure: Number(d.expenditures) || 0,
      }))

      setData(rows)
      onDataChange?.(rows)
    } catch (error) {
      console.error('Error fetching budget vs actual data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // Gregorian calendar years present in the loaded data (parsed from each
  // period label) — used to default the year picker to the full span of years
  // that actually have data.
  const dataYears = useMemo(
    () =>
      data
        .map((d) => {
          const m = d.period.match(/\d{4}/)
          return m ? parseInt(m[0], 10) : NaN
        })
        .filter((y) => Number.isFinite(y)),
    [data],
  )
  const actualDataRange = useYearRangeDefault(dataYears, selectedYears, setSelectedYears)

  // Narrow the displayed periods to the selected year range. The picker
  // defaults to the full data span, so by default every period is shown.
  const filteredData = useMemo(() => {
    if (selectedYears.length === 0) return data
    const minY = Math.min(...selectedYears)
    const maxY = Math.max(...selectedYears)
    return data.filter((d) => {
      const m = d.period.match(/\d{4}/)
      if (!m) return true
      const y = parseInt(m[0], 10)
      return y >= minY && y <= maxY
    })
  }, [data, selectedYears])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const rows = payload.map((entry: any) => ({
        label: entry.name,
        value: formatTooltipCurrency(Number(entry.value) || 0, isExpanded),
        color: entry.color || entry.fill,
      }))
      return <ChartTooltipCard title={formatPeriodTick(label)} rows={rows} />
    }
    return null
  }

  if (loading) {
    return (
      <ChartLoadingPlaceholder />
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No data available</p>
          <p className="text-body">No published budgets or spending found for this period.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Calendar + year selector on its own row at the top (expanded only). */}
      {isExpanded && (
        <YearRangeChip
          selectedYears={selectedYears}
          onYearsChange={setSelectedYears}
          actualDataRange={actualDataRange}
        />
      )}

      {/* Controls row — filters + toggles left, CSV right (expanded only). */}
      {isExpanded && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {/* No dropdowns here — view toggle + CSV are right-aligned. */}
          <InlineViewToggle />
          <InlineCsvButton />
        </div>
      )}

      {/* Chart */}
      {!tableMode && (
      <ResponsiveContainer width="100%" height={isExpanded ? 400 : 260}>
        <BarChart
          data={filteredData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          key={`budget-vs-actual-${groupBy}`}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_STRUCTURE_COLORS.grid}
            vertical={false}
          />
          <XAxis
            dataKey="period"
            tickFormatter={formatPeriodTick}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            tickFormatter={(value) => formatAxisCurrency(value)}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
          />
          <Legend
            wrapperStyle={{
              paddingTop: '20px'
            }}
            iconType="rect"
          />
          <Bar
            dataKey="budget"
            fill={BUDGET_COLOR}
            name="Budget"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-in-out"
          />
          <Bar
            dataKey="disbursed"
            fill={getTransactionTypeColor('3')}
            name="Disbursed"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-in-out"
          />
          <Bar
            dataKey="expenditure"
            fill={getTransactionTypeColor('4')}
            name="Expenditure"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-in-out"
          />
        </BarChart>
      </ResponsiveContainer>
      )}

      {/* Explanatory text — only in expanded view */}
      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed">
          This chart compares planned budgets against actual disbursements and expenditures for each period. Bars that fall short of the budget indicate under-spending, while those exceeding it suggest budget overruns. Use the period selector to switch between calendar year, financial year, and quarterly views to identify trends in budget execution.
        </p>
      )}
    </div>
  )
} 
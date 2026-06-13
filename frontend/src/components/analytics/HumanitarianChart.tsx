"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { getYear } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { BarChart3, LineChart, Table as TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { cn } from '@/lib/utils'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import { ChartDataTable } from '@/components/ui/chart-data-table'
import { apiFetch } from '@/lib/api-fetch'
import { CustomYear, getCustomYearLabel, pickDefaultCalendarYearId } from '@/types/custom-years'
import { getFiscalYearForDate } from '@/utils/year-allocation'
import { useYearRangeDefault } from '@/hooks/useYearRangeDefault'

// Humanitarian is shown in red across the humanitarian charts.
const HUMANITARIAN_COLOR = '#dc2625'
const DEVELOPMENT_COLOR = '#4c5568'

interface HumanitarianChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  refreshKey: number
  onDataChange?: (data: ChartData[]) => void
  compact?: boolean
}

interface ChartData {
  period: string
  humanitarian: number
  development: number
  sortKey?: string
}

type GroupByMode = 'calendar' | 'fiscal' | 'quarter'
type ViewMode = 'area' | 'bar' | 'table'

export function HumanitarianChart({ dateRange, refreshKey, onDataChange, compact = false }: HumanitarianChartProps) {
  const isExpanded = useChartExpansion()
  // Raw classified rows; bucketed client-side by the selected calendar below.
  const [rawRows, setRawRows] = useState<Array<{ date: string; value: number; humanitarian: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('area')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  // Calendar selection drives the X-axis (CY2022 / FY22-23). Owned here so the
  // YearRangeChip is the single calendar control (no separate group-by dropdown).
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [calendarType, setCalendarType] = useState<string>('')

  // Fetch custom-year calendars + default.
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await apiFetch('/api/custom-years')
        if (!res.ok) return
        const result = await res.json()
        const ys = (result.data || []) as CustomYear[]
        if (cancelled) return
        setCustomYears(ys)
        // Default to the Gregorian Calendar Year regardless of the DB default.
        const defaultId = pickDefaultCalendarYearId(ys, result.defaultId)
        if (defaultId) setCalendarType(defaultId)
      } catch { /* swallow */ }
    }
    run()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    fetchData()
  }, [dateRange, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)

      const { data: transactions, error: queryError } = await supabase
        .from('transactions')
        .select('value, value_usd, currency, transaction_date, is_humanitarian, transaction_type, status')
        .in('transaction_type', ['2', '3', '4']) // Commitments, Disbursements, Expenditures
        .eq('status', 'actual')
        // Fetch the full available span so the year picker reflects all years that have data.
        .gte('transaction_date', new Date(2010, 0, 1).toISOString())
        .lte('transaction_date', new Date(new Date().getFullYear() + 10, 11, 31).toISOString())

      if (queryError) {
        console.error('[HumanitarianChart] Query error:', queryError)
        setRawRows([])
        return
      }

      const humanitarianAidTypes = ['01', '02', '03']
      const humanitarianKeywords = ['humanitarian', 'emergency', 'disaster', 'relief', 'crisis']

      const rows: Array<{ date: string; value: number; humanitarian: boolean }> = []
      transactions?.forEach((t: any) => {
        let value = parseFloat(t.value_usd) || 0
        if (!value && t.currency === 'USD' && t.value) value = parseFloat(t.value) || 0
        if (isNaN(value) || value === 0 || !t.transaction_date) return

        const description = t.description?.toLowerCase() || ''
        const isHumanitarian =
          t.is_humanitarian ||
          humanitarianAidTypes.includes(t.aid_type) ||
          humanitarianKeywords.some(keyword => description.includes(keyword))

        rows.push({ date: t.transaction_date, value, humanitarian: !!isHumanitarian })
      })

      setRawRows(rows)
    } catch (error) {
      console.error('Error fetching humanitarian data:', error)
      setRawRows([])
    } finally {
      setLoading(false)
    }
  }

  const activeCustomYear = customYears.find(cy => cy.id === calendarType)

  // Gregorian calendar years present in the loaded data — used to default the
  // year picker to the full span of years that actually have data.
  const dataYears = useMemo(
    () => rawRows.map(r => getYear(new Date(r.date))),
    [rawRows],
  )
  const actualDataRange = useYearRangeDefault(dataYears, selectedYears, setSelectedYears)

  // Bucket raw rows by the selected calendar's (fiscal) year and filter to the
  // selected year range. X labels read e.g. "CY2022" / "FY22-23".
  const data = useMemo<ChartData[]>(() => {
    const minY = selectedYears.length ? Math.min(...selectedYears) : -Infinity
    const maxY = selectedYears.length ? Math.max(...selectedYears) : Infinity
    const byYear = new Map<number, { humanitarian: number; development: number }>()
    for (const r of rawRows) {
      const d = new Date(r.date)
      if (isNaN(d.getTime())) continue
      const fy = activeCustomYear ? getFiscalYearForDate(d, activeCustomYear) : getYear(d)
      if (fy < minY || fy > maxY) continue
      if (!byYear.has(fy)) byYear.set(fy, { humanitarian: 0, development: 0 })
      const b = byYear.get(fy)!
      if (r.humanitarian) b.humanitarian += r.value
      else b.development += r.value
    }
    return Array.from(byYear.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([y, v]) => ({
        period: activeCustomYear ? getCustomYearLabel(activeCustomYear, y) : String(y),
        humanitarian: v.humanitarian,
        development: v.development,
      }))
  }, [rawRows, activeCustomYear, selectedYears])

  useEffect(() => {
    onDataChange?.(data)
  }, [data, onDataChange])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (Number(entry.value) || 0), 0)
      const rows: any[] = payload.map((entry: any) => ({
        label: entry.name,
        value: formatTooltipCurrency(Number(entry.value) || 0, isExpanded),
        color: entry.color || entry.fill,
      }))
      if (payload.length > 1) {
        rows[rows.length - 1].bordered = true
        rows.push({
          label: 'Total',
          value: formatTooltipCurrency(total, isExpanded),
        })
      }
      return <ChartTooltipCard title={label} rows={rows} />
    }
    return null
  }

  // Compact mode renders just the chart without filters
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
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis
              dataKey="period"
              stroke="#94A3B8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94A3B8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxisCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="development"
              stackId="1"
              stroke="#4c5568"
              fill="#4c5568"
              fillOpacity={0.8}
              name="Development"
            />
            <Area
              type="monotone"
              dataKey="humanitarian"
              stackId="1"
              stroke={HUMANITARIAN_COLOR}
              fill={HUMANITARIAN_COLOR}
              fillOpacity={0.8}
              name="Humanitarian"
            />
          </AreaChart>
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
      <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
        <div className="text-center">
          <p className="text-muted-foreground">No humanitarian/development aid data available</p>
          <p className="text-body text-muted-foreground mt-2">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_STRUCTURE_COLORS.grid}
          vertical={false}
        />
        <XAxis
          dataKey="period"
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#94a3b8' }}
        />
        <YAxis
          tickFormatter={formatAxisCurrency}
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#94a3b8' }}
          allowDecimals={false}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }}
        />
        <Legend
          wrapperStyle={{
            paddingTop: '20px',
            color: '#64748b'
          }}
          iconType="rect"
        />
        <Area
          type="monotone"
          dataKey="development"
          stackId="1"
          stroke="#4c5568"
          fill="#4c5568"
          name="Development"
        />
        <Area
          type="monotone"
          dataKey="humanitarian"
          stackId="1"
          stroke={HUMANITARIAN_COLOR}
          fill={HUMANITARIAN_COLOR}
          name="Humanitarian"
        />
      </AreaChart>
    </ResponsiveContainer>
  )

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_STRUCTURE_COLORS.grid}
          vertical={false}
        />
        <XAxis
          dataKey="period"
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#94a3b8' }}
        />
        <YAxis
          tickFormatter={formatAxisCurrency}
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#94a3b8' }}
          allowDecimals={false}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
        />
        <Legend
          wrapperStyle={{
            paddingTop: '20px',
            color: '#64748b'
          }}
          iconType="rect"
        />
        <Bar
          dataKey="development"
          stackId="1"
          fill="#4c5568"
          name="Development"
        />
        <Bar
          dataKey="humanitarian"
          stackId="1"
          fill={HUMANITARIAN_COLOR}
          name="Humanitarian"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )

  const renderTable = () => (
    <ChartDataTable
      rows={data}
      columns={[
        { key: 'period', label: 'Period', numeric: false },
        { key: 'development', label: 'Development', numeric: true, currency: 'USD', color: '#4c5568' },
        { key: 'humanitarian', label: 'Humanitarian', numeric: true, currency: 'USD', color: HUMANITARIAN_COLOR },
      ]}
      currency="USD"
      totalsColumn
    />
  )

  return (
    <div className="space-y-4">
      {/* Calendar + year selector on its own row at the top (expanded only) —
          the single calendar control; the X-axis follows the selected type. */}
      {isExpanded && (
        <YearRangeChip
          selectedYears={selectedYears}
          onYearsChange={setSelectedYears}
          actualDataRange={actualDataRange}
          customYears={customYears}
          calendarType={calendarType}
          onCalendarTypeChange={setCalendarType}
        />
      )}
      {/* Controls row — view toggle + CSV, right-aligned. */}
      <div className="flex items-center justify-end flex-wrap gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('area')}
              className={cn("h-8 w-8", viewMode === 'area' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Area Chart"
              aria-label="Area Chart"
            >
              <LineChart className="h-4 w-4" />
            </Button>
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
          <CsvExportButton rows={data} title="Humanitarian vs Development Aid" />
      </div>

      {/* Chart/Table */}
      {viewMode === 'area' && renderAreaChart()}
      {viewMode === 'bar' && renderBarChart()}
      {viewMode === 'table' && renderTable()}

      {/* Explanatory text */}
      <p className="text-body text-muted-foreground leading-relaxed">
        This chart breaks down total aid spending into humanitarian and development categories over time. Transactions are classified as humanitarian based on the is_humanitarian flag, aid type codes, or keyword matching. Use the period selector to group by calendar year, financial year, or quarter, and switch between area, bar, and table views to explore the data.
      </p>
    </div>
  )
} 
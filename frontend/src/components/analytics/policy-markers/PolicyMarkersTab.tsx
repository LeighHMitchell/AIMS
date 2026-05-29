"use client"

import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { LineChart as LineChartIcon, BarChart3 as BarChartIcon, AreaChart as AreaChartIcon } from 'lucide-react'
import { CompactChartCard } from '@/components/ui/compact-chart-card'
import { ChartGrid } from '@/components/ui/chart-grid'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { apiFetch } from '@/lib/api-fetch'
import { CHART_STRUCTURE_COLORS, getSectorColor } from '@/lib/chart-colors'
import { formatAxisCurrency, formatTooltipCurrency } from '@/lib/format'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import { CodeChip } from '@/components/ui/chart-data-table'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { CustomYear, getCustomYearLabel, pickDefaultCalendarYearId } from '@/types/custom-years'
import { cn } from '@/lib/utils'

// Significance filter applied across all policy-marker charts. Maps to the
// `significanceLevels` query param (1 = Significant, 2 = Principal objective).
type SignificanceFilter = 'all' | 'significant' | 'principal'
const SIGNIFICANCE_OPTIONS: { value: SignificanceFilter; label: string; levels: string }[] = [
  { value: 'all', label: 'All objectives', levels: '1,2' },
  { value: 'significant', label: 'Significant objective', levels: '1' },
  { value: 'principal', label: 'Principal objective', levels: '2' },
]

// Sort order for the marker bar charts (by chart value). Defaults to descending
// (largest → smallest).
type SortDirection = 'desc' | 'asc'
const SORT_OPTIONS: { value: SortDirection; label: string }[] = [
  { value: 'desc', label: 'Largest first' },
  { value: 'asc', label: 'Smallest first' },
]

// Significance palette — kept in sync with PolicyMarkersChart so the same
// significance level reads as the same colour everywhere.
const SIG_SIGNIFICANT = { key: 'significant', label: 'Significant objective', color: '#7b95a7' }
const SIG_PRINCIPAL = { key: 'principal', label: 'Principal objective', color: '#334155' }

// Shared tooltip for the policy-marker charts — same styled header + rows as
// the rest of the dashboard (via ChartTooltipCard), instead of the default
// recharts tooltip.
function PolicyMarkerTooltip({ active, payload, label, formatValue, subtitle }: any) {
  if (!active || !payload?.length) return null
  return (
    <ChartTooltipCard
      title={String(label ?? '')}
      subtitle={subtitle}
      rows={payload.map((e: any) => ({
        label: e.name,
        value: formatValue(Number(e.value) || 0),
        color: e.color || e.fill,
      }))}
    />
  )
}

interface PolicyMarkerAnalyticsRow {
  policy_marker_id: string
  policy_marker_code: string
  policy_marker_name: string
  significance: number // 0, 1, or 2
  activity_count: number
  total_budget_usd: number
}

interface PolicyMarkerTimeSeriesRow {
  policy_marker_id: string
  policy_marker_code: string
  policy_marker_name: string
  years: Record<string, number>
  total: number
}

// One row per policy marker, with significance 1/2 counts and budgets split out.
interface MarkerRow {
  id: string
  name: string
  code: string
  significant: number
  principal: number
  significantValue: number
  principalValue: number
}

interface PolicyMarkersTabProps {
  refreshKey?: number
}

const formatCount = (value: number) => (Number.isInteger(value) ? value.toLocaleString() : '')
const formatPercentTick = (value: number) => `${Math.round(value * 100)}%`

// Shorten long marker names for axis labels while keeping them recognisable.
const shortLabel = (name: string) => (name.length > 18 ? `${name.slice(0, 16)}…` : name)

export function PolicyMarkersTab({ refreshKey = 0 }: PolicyMarkersTabProps) {
  const [rows, setRows] = useState<PolicyMarkerAnalyticsRow[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch both significance levels once; each chart filters client-side via its
  // own (expanded-only) significance dropdown.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ significanceLevels: '1,2' })
        const analyticsRes = await apiFetch(`/api/analytics/policy-markers?${params}`)
        const analytics = await analyticsRes.json()
        if (cancelled) return
        setRows(analytics?.data || [])
      } catch (err) {
        console.error('[PolicyMarkersTab] Error loading policy marker data:', err)
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  // Collapse the significance-split rows into one row per marker.
  const markerRows = useMemo<MarkerRow[]>(() => {
    const map = new Map<string, MarkerRow>()
    rows.forEach(r => {
      let m = map.get(r.policy_marker_id)
      if (!m) {
        m = {
          id: r.policy_marker_id,
          name: r.policy_marker_name,
          code: r.policy_marker_code,
          significant: 0,
          principal: 0,
          significantValue: 0,
          principalValue: 0,
        }
        map.set(r.policy_marker_id, m)
      }
      if (r.significance === 1) {
        m.significant = r.activity_count
        m.significantValue = r.total_budget_usd
      } else if (r.significance === 2) {
        m.principal = r.activity_count
        m.principalValue = r.total_budget_usd
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [rows])

  const hasData = markerRows.length > 0

  return (
    <ChartGrid>
      <CompactChartCard
        title="Activities by Policy Marker"
        shortDescription="Count of activities per marker, split by significance"
        fullDescription="Number of distinct activities tagged with each policy marker, stacked by significance level (Significant vs Principal objective)."
        mathTooltip="Counts distinct activities per policy marker and significance level. An activity tagged with multiple markers is counted under each. Policy markers reflect policy intent, not financial allocation."
        className="w-full"
        compactHeight={320}
      >
        <ActivityCountChart data={markerRows} loading={loading} hasData={hasData} />
      </CompactChartCard>

      <CompactChartCard
        title="Budget Value by Policy Marker"
        shortDescription="Total activity budget per marker, split by significance"
        fullDescription="Total activity budget (USD) for activities tagged with each policy marker, stacked by significance level."
        mathTooltip="Sums total activity budget (USD) per policy marker and significance level. Budgets are not apportioned across markers — an activity's full budget is counted under each marker it carries. Activities without a budget are excluded."
        className="w-full"
        compactHeight={320}
      >
        <BudgetValueChart data={markerRows} loading={loading} hasData={hasData} />
      </CompactChartCard>

      <CompactChartCard
        title="Policy Marker Spend Over Time"
        shortDescription="Annual spend per policy marker"
        fullDescription="Actual spend (disbursements + expenditures) by year, one line per policy marker."
        mathTooltip="Sums USD disbursements and expenditures by year for activities tagged with each policy marker, bucketed by the selected calendar (Gregorian or fiscal year). An activity's full spend is counted for each marker it carries; values reflect policy intent, not apportioned allocation."
        className="w-full"
        compactHeight={320}
      >
        <SpendOverTimeChart refreshKey={refreshKey} />
      </CompactChartCard>

      <CompactChartCard
        title="Significance Mix per Marker"
        shortDescription="Share of Significant vs Principal within each marker"
        fullDescription="Within each policy marker, the proportion of tagged activities that treat it as a Significant vs a Principal objective."
        mathTooltip="For each policy marker, expresses Significant- and Principal-objective activity counts as a share of that marker's total (100% stacked). Shows how central the objective is to the activities that carry it."
        className="w-full"
        compactHeight={320}
      >
        <SignificanceMixChart data={markerRows} loading={loading} hasData={hasData} />
      </CompactChartCard>
    </ChartGrid>
  )
}

// Per-chart significance filter (Significant / Principal / All) — rendered only
// in expanded view, left-aligned above the chart.
function SignificanceFilter({ value, onChange }: {
  value: SignificanceFilter; onChange: (v: SignificanceFilter) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          {SIGNIFICANCE_OPTIONS.find(o => o.value === value)?.label}
          <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {SIGNIFICANCE_OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt.value}
            className={cn('gap-2', value === opt.value ? 'bg-muted font-medium' : '')}
            onClick={() => onChange(opt.value)}
          >
            <CodeChip>{opt.levels}</CodeChip>
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Per-chart sort control (largest → smallest by chart value) — rendered only in
// expanded view, beside the significance filter. Defaults to descending.
function SortFilter({ value, onChange }: {
  value: SortDirection; onChange: (v: SortDirection) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          Sort: {SORT_OPTIONS.find(o => o.value === value)?.label}
          <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {SORT_OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt.value}
            className={value === opt.value ? 'bg-muted font-medium' : ''}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Chart 1 — Activities by marker & significance (stacked count bar)
// ---------------------------------------------------------------------------
function ActivityCountChart({ data, loading, hasData, compact }: {
  data: MarkerRow[]; loading: boolean; hasData: boolean; compact?: boolean
}) {
  const isExpanded = useChartExpansion()
  const [sig, setSig] = useState<SignificanceFilter>('all')
  const [sort, setSort] = useState<SortDirection>('desc')
  // Sort by the count actually shown given the significance filter.
  const sortedData = useMemo(() => {
    const value = (d: MarkerRow) =>
      (sig !== 'principal' ? d.significant : 0) + (sig !== 'significant' ? d.principal : 0)
    return [...data].sort((a, b) => (sort === 'desc' ? value(b) - value(a) : value(a) - value(b)))
  }, [data, sig, sort])
  if (loading) return <ChartLoadingPlaceholder />
  if (!hasData) return <EmptyState />
  const chart = (
    <ResponsiveContainer width="100%" height={isExpanded ? 440 : "100%"}>
      <BarChart data={sortedData} margin={{ top: 10, right: 20, left: 10, bottom: compact ? 40 : 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={compact ? 60 : 100}
          tickFormatter={shortLabel}
          tick={{ fontSize: compact ? 10 : 12, fill: '#64748b' }}
          interval={0}
        />
        <YAxis tickFormatter={formatCount} allowDecimals={false} tick={{ fontSize: compact ? 10 : 12, fill: '#64748b' }} />
        <Tooltip content={(p: any) => <PolicyMarkerTooltip {...p} formatValue={formatCount} />} />
        {isExpanded && <Legend wrapperStyle={{ paddingTop: 12 }} iconType="rect" />}
        {sig !== 'principal' && <Bar dataKey="significant" stackId="1" fill={SIG_SIGNIFICANT.color} name={SIG_SIGNIFICANT.label} />}
        {sig !== 'significant' && <Bar dataKey="principal" stackId="1" fill={SIG_PRINCIPAL.color} name={SIG_PRINCIPAL.label} />}
      </BarChart>
    </ResponsiveContainer>
  )
  if (!isExpanded) return chart
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <SignificanceFilter value={sig} onChange={setSig} />
        <SortFilter value={sort} onChange={setSort} />
      </div>
      {chart}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart 2 — Budget value by marker & significance (stacked USD bar)
// ---------------------------------------------------------------------------
function BudgetValueChart({ data, loading, hasData, compact }: {
  data: MarkerRow[]; loading: boolean; hasData: boolean; compact?: boolean
}) {
  const isExpanded = useChartExpansion()
  const [sig, setSig] = useState<SignificanceFilter>('all')
  const [sort, setSort] = useState<SortDirection>('desc')
  // Sort by the budget actually shown given the significance filter.
  const sortedData = useMemo(() => {
    const value = (d: MarkerRow) =>
      (sig !== 'principal' ? d.significantValue : 0) + (sig !== 'significant' ? d.principalValue : 0)
    return [...data].sort((a, b) => (sort === 'desc' ? value(b) - value(a) : value(a) - value(b)))
  }, [data, sig, sort])
  if (loading) return <ChartLoadingPlaceholder />
  if (!hasData) return <EmptyState />
  const chart = (
    <ResponsiveContainer width="100%" height={isExpanded ? 440 : "100%"}>
      <BarChart data={sortedData} margin={{ top: 10, right: 20, left: 10, bottom: compact ? 40 : 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={compact ? 60 : 100}
          tickFormatter={shortLabel}
          tick={{ fontSize: compact ? 10 : 12, fill: '#64748b' }}
          interval={0}
        />
        <YAxis tickFormatter={(v) => formatAxisCurrency(v)} tick={{ fontSize: compact ? 10 : 12, fill: '#64748b' }} />
        <Tooltip content={(p: any) => <PolicyMarkerTooltip {...p} formatValue={(val: number) => formatTooltipCurrency(val, isExpanded)} />} />
        {isExpanded && <Legend wrapperStyle={{ paddingTop: 12 }} iconType="rect" />}
        {sig !== 'principal' && <Bar dataKey="significantValue" stackId="1" fill={SIG_SIGNIFICANT.color} name={SIG_SIGNIFICANT.label} />}
        {sig !== 'significant' && <Bar dataKey="principalValue" stackId="1" fill={SIG_PRINCIPAL.color} name={SIG_PRINCIPAL.label} />}
      </BarChart>
    </ResponsiveContainer>
  )
  if (!isExpanded) return chart
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <SignificanceFilter value={sig} onChange={setSig} />
        <SortFilter value={sort} onChange={setSort} />
      </div>
      {chart}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart 3 — Spend over time by marker (multi-line). Self-contained: owns its
// calendar/year selection (so the X-axis can bucket by CY or FY) and a policy
// marker filter, fetching its own time-series with the chosen customYearId.
// ---------------------------------------------------------------------------
function SpendOverTimeChart({ refreshKey }: { refreshKey: number }) {
  const isExpanded = useChartExpansion()
  const [series, setSeries] = useState<PolicyMarkerTimeSeriesRow[]>([])
  const [years, setYears] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  // Empty set = all markers shown.
  const [markerSelection, setMarkerSelection] = useState<Set<string>>(new Set())
  const [significance, setSignificance] = useState<SignificanceFilter>('all')
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line')

  const significanceLevels = SIGNIFICANCE_OPTIONS.find(o => o.value === significance)?.levels ?? '1,2'

  // Custom-year calendars (for the CY/FY selector + X-axis bucketing).
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

  // Time series — re-fetched when the calendar, significance, or refresh changes
  // so the server buckets by the selected fiscal/calendar year.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ significanceLevels })
        if (calendarType) params.set('customYearId', calendarType)
        const res = await apiFetch(`/api/analytics/policy-markers-time-series?${params}`)
        const ts = await res.json()
        if (cancelled) return
        setSeries(ts?.data || [])
        setYears(ts?.years || [])
      } catch {
        if (!cancelled) { setSeries([]); setYears([]) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [refreshKey, significanceLevels, calendarType])

  // Default the year range to the data's span once loaded.
  useEffect(() => {
    if (selectedYears.length > 0 || years.length === 0) return
    const nums = years.map(Number).filter(n => !isNaN(n))
    if (nums.length) setSelectedYears([Math.min(...nums), Math.max(...nums)])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [years])

  // Data-year span (from the time-series years) — powers the picker's "Data" quick-select.
  const policyDataRange = useMemo(() => {
    const nums = years.map(Number).filter(n => !isNaN(n))
    return nums.length ? { minYear: Math.min(...nums), maxYear: Math.max(...nums) } : null
  }, [years])

  const activeCustomYear = customYears.find(cy => cy.id === calendarType)
  const calendarLabel = activeCustomYear?.name || 'Gregorian Calendar Year'

  // Markers ordered by total spend (legend stability). An empty selection means
  // "all"; otherwise only the checked markers are shown.
  const allMarkers = useMemo(() => [...series].sort((a, b) => b.total - a.total), [series])
  const isMarkerChecked = (id: string) => markerSelection.size === 0 || markerSelection.has(id)
  const toggleMarker = (id: string) => {
    setMarkerSelection(prev => {
      // Materialise "all" into an explicit set before toggling one off.
      const base = prev.size === 0 ? new Set(allMarkers.map(m => m.policy_marker_id)) : new Set(prev)
      if (base.has(id)) base.delete(id); else base.add(id)
      return base
    })
  }
  const visibleMarkers = useMemo(
    () => (markerSelection.size === 0 ? allMarkers : allMarkers.filter(m => markerSelection.has(m.policy_marker_id))),
    [allMarkers, markerSelection],
  )
  const markerLabel =
    markerSelection.size === 0 || markerSelection.size === allMarkers.length
      ? 'All policy markers'
      : `${markerSelection.size} selected`

  // One row per (fiscal/calendar) year within the selected range, each labelled
  // in the selected calendar's format (e.g. CY2024 / FY24-25).
  const timeRows = useMemo(() => {
    const minY = selectedYears.length ? Math.min(...selectedYears) : -Infinity
    const maxY = selectedYears.length ? Math.max(...selectedYears) : Infinity
    return years
      .filter(y => { const n = Number(y); return n >= minY && n <= maxY })
      .map(y => {
        const n = Number(y)
        const periodLabel = activeCustomYear ? getCustomYearLabel(activeCustomYear, n) : y
        const row: Record<string, number | string> = { periodLabel }
        visibleMarkers.forEach(s => { row[s.policy_marker_name] = s.years[y] || 0 })
        return row
      })
  }, [years, selectedYears, activeCustomYear, visibleMarkers])

  // CSV rows mirror the chart: one column per visible marker.
  const csvRows = useMemo(
    () => timeRows.map(r => {
      const row: Record<string, string | number> = { Period: String(r.periodLabel) }
      visibleMarkers.forEach(m => { row[m.policy_marker_name] = Number(r[m.policy_marker_name]) || 0 })
      return row
    }),
    [timeRows, visibleMarkers],
  )

  const hasData = timeRows.length > 0 && visibleMarkers.length > 0

  if (loading) return <ChartLoadingPlaceholder />

  const ChartComp = chartType === 'bar' ? BarChart : chartType === 'area' ? AreaChart : LineChart
  const renderSeries = () =>
    visibleMarkers.map((m, i) => {
      const color = getSectorColor(i)
      if (chartType === 'bar') {
        return <Bar key={m.policy_marker_id} dataKey={m.policy_marker_name} fill={color} />
      }
      if (chartType === 'area') {
        return (
          <Area
            key={m.policy_marker_id}
            type="monotone"
            dataKey={m.policy_marker_name}
            stroke={color}
            fill={color}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        )
      }
      return (
        <Line
          key={m.policy_marker_id}
          type="monotone"
          dataKey={m.policy_marker_name}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      )
    })

  const chart = hasData ? (
    <ResponsiveContainer width="100%" height={isExpanded ? 440 : "100%"}>
      <ChartComp data={timeRows} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis dataKey="periodLabel" tick={{ fontSize: 12, fill: '#64748b' }} />
        <YAxis tickFormatter={(v) => formatAxisCurrency(v)} tick={{ fontSize: 12, fill: '#64748b' }} width={isExpanded ? 60 : 44} />
        <Tooltip content={(p: any) => <PolicyMarkerTooltip {...p} subtitle={calendarLabel} formatValue={(val: number) => formatTooltipCurrency(val, isExpanded)} />} />
        {isExpanded && <Legend wrapperStyle={{ paddingTop: 12 }} iconType={chartType === 'line' ? 'line' : 'rect'} />}
        {renderSeries()}
      </ChartComp>
    </ResponsiveContainer>
  ) : (
    <EmptyState />
  )

  // Collapsed: bare chart fills the card. Expanded: calendar/year selector on
  // top; below it significance + marker filter (left), chart-type + CSV (right).
  if (!isExpanded) return chart

  const CHART_TYPES: { value: 'line' | 'bar' | 'area'; Icon: typeof LineChartIcon; label: string }[] = [
    { value: 'line', Icon: LineChartIcon, label: 'Line chart' },
    { value: 'bar', Icon: BarChartIcon, label: 'Bar chart' },
    { value: 'area', Icon: AreaChartIcon, label: 'Area chart' },
  ]

  return (
    <div className="space-y-3">
      <YearRangeChip
        selectedYears={selectedYears}
        onYearsChange={setSelectedYears}
        actualDataRange={policyDataRange}
        customYears={customYears}
        calendarType={calendarType}
        onCalendarTypeChange={setCalendarType}
      />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Left: significance + marker multi-select (with codes). */}
        <div className="flex items-center gap-2 flex-wrap">
          <SignificanceFilter value={significance} onChange={setSignificance} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 min-w-[260px] max-w-[360px] justify-between">
                <span className="truncate">{markerLabel}</span>
                <svg className="h-4 w-4 opacity-50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto w-[340px]">
              {allMarkers.map(m => (
                <DropdownMenuCheckboxItem
                  key={m.policy_marker_id}
                  checked={isMarkerChecked(m.policy_marker_id)}
                  onCheckedChange={() => toggleMarker(m.policy_marker_id)}
                  onSelect={(e) => e.preventDefault()}
                  className="gap-2"
                >
                  <CodeChip className="text-[10px]">{m.policy_marker_code}</CodeChip>
                  {m.policy_marker_name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: chart-type toggle + CSV. */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            {CHART_TYPES.map(({ value, Icon, label }) => (
              <Button
                key={value}
                variant="ghost"
                size="icon"
                onClick={() => setChartType(value)}
                className={cn('h-8 w-8', chartType === value ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}
                title={label}
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <CsvExportButton rows={csvRows} title="Policy Marker Spend Over Time" />
        </div>
      </div>
      {chart}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart 4 — Significance mix per marker (100% stacked count bar)
// ---------------------------------------------------------------------------
function SignificanceMixChart({ data, loading, hasData, compact }: {
  data: MarkerRow[]; loading: boolean; hasData: boolean; compact?: boolean
}) {
  const isExpanded = useChartExpansion()
  const [sig, setSig] = useState<SignificanceFilter>('all')
  const [sort, setSort] = useState<SortDirection>('desc')
  // Only markers that actually have at least one tagged activity contribute to a
  // mix; sorted by the total count shown given the significance filter.
  const mixData = useMemo(() => {
    const value = (d: MarkerRow) =>
      (sig !== 'principal' ? d.significant : 0) + (sig !== 'significant' ? d.principal : 0)
    return data
      .filter(d => d.significant + d.principal > 0)
      .sort((a, b) => (sort === 'desc' ? value(b) - value(a) : value(a) - value(b)))
  }, [data, sig, sort])
  if (loading) return <ChartLoadingPlaceholder />
  if (!hasData || mixData.length === 0) return <EmptyState />
  const chart = (
    <ResponsiveContainer width="100%" height={isExpanded ? 440 : "100%"}>
      <BarChart
        data={mixData}
        stackOffset="expand"
        margin={{ top: 10, right: 20, left: 10, bottom: compact ? 40 : 80 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={compact ? 60 : 100}
          tickFormatter={shortLabel}
          tick={{ fontSize: compact ? 10 : 12, fill: '#64748b' }}
          interval={0}
        />
        <YAxis tickFormatter={formatPercentTick} domain={[0, 1]} tick={{ fontSize: compact ? 10 : 12, fill: '#64748b' }} />
        <Tooltip content={(p: any) => <PolicyMarkerTooltip {...p} formatValue={formatCount} />} />
        {isExpanded && <Legend wrapperStyle={{ paddingTop: 12 }} iconType="rect" />}
        {sig !== 'principal' && <Bar dataKey="significant" stackId="1" fill={SIG_SIGNIFICANT.color} name={SIG_SIGNIFICANT.label} />}
        {sig !== 'significant' && <Bar dataKey="principal" stackId="1" fill={SIG_PRINCIPAL.color} name={SIG_PRINCIPAL.label} />}
      </BarChart>
    </ResponsiveContainer>
  )
  if (!isExpanded) return chart
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <SignificanceFilter value={sig} onChange={setSig} />
        <SortFilter value={sort} onChange={setSort} />
      </div>
      {chart}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
      <p className="text-body">No policy marker data available</p>
    </div>
  )
}

"use client"

import React, { useState, useEffect, useMemo } from 'react'
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
import { BarChart3, DollarSign, CalendarIcon, Download, Table as TableIcon } from 'lucide-react'
import { format } from 'date-fns'
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS, OTHERS_COLOR } from '@/lib/chart-colors';
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { Button } from '@/components/ui/button'
import { useChartCardToolbar } from '@/components/ui/compact-chart-card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { CustomYear, getCustomYearRange, getCustomYearLabel, sortCustomYearsCalendarFirst } from '@/types/custom-years'

// Year list mirrors AllDonorsHorizontalBarChart so the picker looks identical.
const currentYear = new Date().getFullYear()
const AVAILABLE_YEARS = Array.from(
  { length: currentYear + 10 - 2010 + 1 },
  (_, i) => 2010 + i
)

type OpenFilter = 'calendar' | 'year' | 'basis' | null

type Top10Basis = 'total' | 'commitment' | 'disbursement'
type BasisKey = 'commitment' | 'disbursement'

const BASIS_LABEL: Record<Top10Basis, string> = {
  total: 'Outgoing Commitments + Disbursements',
  commitment: 'Outgoing Commitments',
  disbursement: 'Disbursements',
}

// IATI transaction-type codes for the two selectable bases. Surfaced as
// monospace badges in the dropdown so the picker matches the metric multi-
// select on AllDonorsHorizontalBarChart (which also code-badges every IATI
// transaction type).
const BASIS_DEFS: Array<{ key: BasisKey; label: string; code: string }> = [
  { key: 'commitment', label: 'Outgoing Commitments', code: '2' },
  { key: 'disbursement', label: 'Disbursements', code: '3' },
]

interface Top10TotalFinancialValueChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
    sector?: string
  }
  refreshKey: number
  onDataChange?: (data: DonorData[]) => void
}

interface DonorData {
  orgId: string
  organisationId: string | null
  name: string
  acronym: string | null
  totalValue: number
  commitments: number
  disbursements: number
  shortName: string
}

export function Top10TotalFinancialValueChart({
  dateRange,
  filters,
  refreshKey,
  onDataChange
}: Top10TotalFinancialValueChartProps) {
  const isExpanded = useChartExpansion()
  // When the parent CompactChartCard is in `inlineToolbar` mode this hook
  // returns the toolbar handlers; we render the table/CSV buttons inline on
  // our controls row instead of letting the card draw them in the header.
  const toolbar = useChartCardToolbar()
  const [data, setData] = useState<DonorData[]>([])
  const [loading, setLoading] = useState(true)
  // Which bases are selected. The server still accepts a single `basis`
  // string ('total' | 'commitment' | 'disbursement'); we derive that below
  // from the set so the picker can be a true multi-select. Default is both
  // checked, matching the original single-select default of "total".
  const [selectedBases, setSelectedBases] = useState<Set<BasisKey>>(
    () => new Set<BasisKey>(['commitment', 'disbursement'])
  )
  const toggleBasis = (b: BasisKey) => {
    setSelectedBases(prev => {
      const next = new Set(prev)
      if (next.has(b)) next.delete(b)
      else next.add(b)
      return next
    })
  }
  // Map the set back to the single-value server param. Both checked → 'total'
  // (server sums types 2 + 3); exactly one checked → that one only; none
  // checked falls back to 'total' but the chart renders an empty state so
  // the fetch result is discarded.
  const basis: Top10Basis = selectedBases.size === 2
    ? 'total'
    : selectedBases.has('commitment')
      ? 'commitment'
      : selectedBases.has('disbursement')
        ? 'disbursement'
        : 'total'
  const basisPickerLabel = `Transaction Types (${selectedBases.size})`

  // Calendar + year selectors (expanded view only). When the user picks a
  // year range here it overrides the page-level dateRange prop for this
  // chart's fetch; until then the prop wins so the compact card matches the
  // dashboard date filter.
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [localDateRange, setLocalDateRange] = useState<{ from: Date; to: Date } | null>(null)
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null)
  const filterOpenHandler = (key: Exclude<OpenFilter, null>) => (open: boolean) => {
    setOpenFilter(prev => open ? key : (prev === key ? null : prev))
  }

  useEffect(() => {
    const fetchCustomYears = async () => {
      try {
        const response = await apiFetch('/api/custom-years')
        if (!response.ok) return
        const result = await response.json()
        const years = result.data || []
        setCustomYears(years)
        let selected: CustomYear | undefined
        if (result.defaultId) selected = years.find((cy: CustomYear) => cy.id === result.defaultId)
        if (!selected && years.length > 0) selected = years[0]
        if (selected) setCalendarType(selected.id)
      } catch (err) {
        console.error('[Top10TotalFinancialValueChart] Failed to fetch custom years:', err)
      }
    }
    fetchCustomYears()
  }, [])

  // Derive localDateRange whenever the calendar type or selected years change.
  useEffect(() => {
    if (customYears.length === 0 || selectedYears.length === 0) return
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (!customYear) return
    const sorted = [...selectedYears].sort((a, b) => a - b)
    const firstRange = getCustomYearRange(customYear, sorted[0])
    const lastRange = getCustomYearRange(customYear, sorted[sorted.length - 1])
    setLocalDateRange({ from: firstRange.start, to: lastRange.end })
  }, [calendarType, selectedYears, customYears])

  const effectiveDateRange = useMemo(() => {
    if (localDateRange?.from && localDateRange?.to) return localDateRange
    return dateRange
  }, [localDateRange, dateRange])

  const getYearLabel = (year: number) => {
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (customYear) return getCustomYearLabel(customYear, year)
    return `${year}`
  }

  const handleYearClick = (year: number, shiftKey: boolean) => {
    if (shiftKey && selectedYears.length === 1) {
      const start = Math.min(selectedYears[0], year)
      const end = Math.max(selectedYears[0], year)
      setSelectedYears([start, end])
    } else if (selectedYears.length === 0) {
      setSelectedYears([year])
    } else if (selectedYears.length === 1) {
      if (selectedYears[0] === year) {
        setSelectedYears([])
      } else {
        const start = Math.min(selectedYears[0], year)
        const end = Math.max(selectedYears[0], year)
        setSelectedYears([start, end])
      }
    } else {
      setSelectedYears([year])
    }
  }

  const selectAllYears = () => {
    setSelectedYears([AVAILABLE_YEARS[0], AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]])
  }

  const selectDataRange = () => {
    const yr = new Date().getFullYear()
    setSelectedYears([yr - 5, yr])
  }

  const isYearInRange = (year: number) => {
    if (selectedYears.length < 2) return false
    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)
    return year > minYear && year < maxYear
  }

  // Sorted, joined selection used as a stable useEffect dep — the derived
  // `basis` string is ambiguous (both '0 selected' and '2 selected' map to
  // 'total'), so we key the fetch off the actual selection instead.
  const basesKey = useMemo(
    () => Array.from(selectedBases).sort().join(','),
    [selectedBases]
  )

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDateRange.from.toISOString(), effectiveDateRange.to.toISOString(), filters, refreshKey, basesKey])

  const fetchData = async () => {
    // No bases selected → nothing to fetch; the render branch shows an empty
    // state prompting the user to pick at least one.
    if (selectedBases.size === 0) {
      setData([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)

      const params = new URLSearchParams({
        dateFrom: effectiveDateRange.from.toISOString(),
        dateTo: effectiveDateRange.to.toISOString(),
        limit: '10',
        basis,
      })
      
      if (filters?.country && filters.country !== 'all') {
        params.append('country', filters.country)
      }
      if (filters?.sector && filters.sector !== 'all') {
        params.append('sector', filters.sector)
      }

      const response = await apiFetch(`/api/analytics/top-10/total-financial-value?${params}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Top10TotalFinancialValue] Error response:', errorText)
        throw new Error('Failed to fetch data')
      }

      const result = await response.json()
      
      const donors = (result.donors || []).map((d: any) => ({
        ...d,
        shortName: d.acronym || d.name.split(' ').slice(0, 2).join(' ')
      }))

      setData(donors)
      // Table-friendly shape with explicit, spaced column names. The org-id
      // column is intentionally omitted. Each selected transaction type gets
      // its OWN column (Commitments = type 2, Disbursements = type 3) from the
      // per-type amounts the API now returns.
      onDataChange?.(donors.map((d: DonorData) => {
        const row: Record<string, string | number> = {
          'Name': d.acronym ? `${d.name} (${d.acronym})` : d.name,
        }
        if (selectedBases.has('commitment')) row['Commitments'] = d.commitments
        if (selectedBases.has('disbursement')) row['Disbursements'] = d.disbursements
        return row
      }) as any)
    } catch (error) {
      console.error('[Top10TotalFinancialValueChart] Error:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // Single Blue Slate fill for all bars — bar length already encodes
  // "more vs less", so a varying ramp would just add noise. "Others"
  // stays a lighter shade for contrast.
  const BAR_COLOR = '#4c5568'

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const item = payload[0].payload
    const fullName = item.acronym ? `${item.name} (${item.acronym})` : item.name
    return (
      <ChartTooltipCard
        title={fullName}
        rows={[{
          label: BASIS_LABEL[basis],
          value: formatTooltipCurrency(item.totalValue, isExpanded),
          color: item.orgId === 'others' ? OTHERS_COLOR : BAR_COLOR,
        }]}
      />
    )
  }

  // Calendar + year picker, left-aligned. Matches the pattern in
  // AllDonorsHorizontalBarChart so the two cards behave consistently when
  // expanded. Only rendered in the expanded modal — the compact card inherits
  // the dashboard's page-level date range.
  const calendarYearControls = (
    <div className="flex items-start gap-2">
      {customYears.length > 0 && (
        <>
          <div className="flex gap-1 border rounded-lg p-1 bg-white">
            <DropdownMenu open={openFilter === 'calendar'} onOpenChange={filterOpenHandler('calendar')}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1">
                  {customYears.find(cy => cy.id === calendarType)?.name || 'Select calendar'}
                  <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {sortCustomYearsCalendarFirst(customYears).map(cy => (
                  <DropdownMenuItem
                    key={cy.id}
                    className={calendarType === cy.id ? 'bg-muted font-medium' : ''}
                    onClick={() => setCalendarType(cy.id)}
                  >
                    <span className="flex items-center gap-2">
                      {cy.shortName && (
                        <span className="font-mono text-[10px] font-semibold px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          {cy.shortName.trim()}
                        </span>
                      )}
                      {cy.name}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex gap-1 border rounded-lg p-1 bg-white">
            <DropdownMenu open={openFilter === 'year'} onOpenChange={filterOpenHandler('year')}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1"
                  title={localDateRange?.from && localDateRange?.to
                    ? `${format(localDateRange.from, 'd MMM yyyy')} – ${format(localDateRange.to, 'd MMM yyyy')}`
                    : undefined}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {selectedYears.length === 0
                    ? 'Select years'
                    : selectedYears.length === 1
                      ? getYearLabel(selectedYears[0])
                      : `${getYearLabel(Math.min(...selectedYears))} - ${getYearLabel(Math.max(...selectedYears))}`}
                  <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="p-3 w-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-helper font-medium text-foreground">Select Year Range</span>
                  <div className="flex gap-1">
                    <button
                      onClick={selectAllYears}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                    >
                      All
                    </button>
                    <button
                      onClick={selectDataRange}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                    >
                      Data
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {AVAILABLE_YEARS.map((year) => {
                    const isStartOrEnd = selectedYears.length > 0 &&
                      (year === Math.min(...selectedYears) || year === Math.max(...selectedYears))
                    const inRange = isYearInRange(year)
                    return (
                      <button
                        key={year}
                        onClick={(e) => handleYearClick(year, e.shiftKey)}
                        className={`
                          px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap
                          ${isStartOrEnd
                            ? 'bg-muted text-foreground'
                            : inRange
                              ? 'bg-primary/20 text-primary'
                              : 'text-muted-foreground hover:bg-muted'
                          }
                        `}
                        title="Click to select start, then click another to select end"
                      >
                        {getYearLabel(year)}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  Click start year, then click end year
                </p>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  )

  // Basis multi-select. IATI transaction-type code badges (2 for Commitments,
  // 3 for Disbursements) sit at the start of each row so the picker reads
  // the same way as the metric multi-select on AllDonorsHorizontalBarChart.
  // The user can check either or both; the server still gets a single
  // `basis` string derived above.
  const basisToggle = (
    <DropdownMenu open={openFilter === 'basis'} onOpenChange={filterOpenHandler('basis')}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-[260px] justify-between">
          <span className="truncate text-body">{basisPickerLabel}</span>
          <svg className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[260px] p-1"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {BASIS_DEFS.map(def => {
          const checked = selectedBases.has(def.key)
          return (
            <button
              key={def.key}
              type="button"
              onClick={() => toggleBasis(def.key)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted rounded text-body"
            >
              <Checkbox checked={checked} className="pointer-events-none flex-shrink-0" />
              <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs flex-shrink-0">{def.code}</code>
              <span className="text-foreground truncate">{def.label}</span>
            </button>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // Table-view toggle — lives on the left of the controls row next to the
  // basis dropdown so the chart can switch view mode without leaving the dialog.
  const viewToggleButton = toolbar?.hasTableView ? (
    <Button
      variant="outline"
      size="sm"
      onClick={() => toolbar.setViewMode(toolbar.viewMode === 'chart' ? 'table' : 'chart')}
      className="h-9"
      title={toolbar.viewMode === 'chart' ? 'View as table' : 'View as chart'}
    >
      {toolbar.viewMode === 'chart' ? (
        <TableIcon className="h-4 w-4" />
      ) : (
        <BarChart3 className="h-4 w-4" />
      )}
    </Button>
  ) : null

  // CSV download — right-aligned, alone, on the controls row.
  const csvButton = toolbar?.hasExportData ? (
    <Button
      variant="outline"
      size="icon"
      onClick={toolbar.handleExport}
      className="h-9 w-9"
      title="Export CSV"
      aria-label="Export CSV"
    >
      <Download className="h-4 w-4" />
    </Button>
  ) : null

  // Controls shown only in the expanded modal: calendar/year on its own row at
  // the top, then filters + toggles on the left and the CSV button on the
  // right. Compact card stays clean (no controls).
  const expandedControls = isExpanded ? (
    <div className="space-y-3">
      {/* Calendar + year selector on its own row at the top */}
      <div className="flex items-start gap-2">
        {calendarYearControls}
      </div>
      {/* Controls row — Transaction Types dropdown left; view toggle + CSV right. */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {basisToggle}
        <div className="flex items-center gap-2">
          {viewToggleButton}
          {csvButton}
        </div>
      </div>
    </div>
  ) : null

  // In table view we want the inline toolbar (calendar/year/basis + the
  // table↔chart toggle) to stay visible above the table that CompactChartCard
  // renders below us. Early-return controls-only so the chart body, loading
  // placeholder, and empty state are all skipped in table mode.
  if (toolbar?.viewMode === 'table') {
    return (
      <div className="space-y-3">
        {expandedControls}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {expandedControls}
        <ChartLoadingPlaceholder />
      </div>
    )
  }

  if (!data || data.length === 0) {
    const noBases = selectedBases.size === 0
    return (
      <div className="space-y-3">
        {expandedControls}
        <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {noBases ? 'Select at least one basis' : 'No financial data available'}
            </p>
            <p className="text-body text-muted-foreground mt-2">
              {noBases
                ? 'Choose Commitments, Disbursements, or both from the dropdown'
                : 'Try adjusting your date range or filters'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 h-full flex flex-col">
      {expandedControls}
      {/* Collapsed card clips a fixed 400px chart (its X-axis fell below the
          300px card); fill the card when collapsed so the value axis shows. */}
      <div className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height={isExpanded ? 400 : "100%"}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_STRUCTURE_COLORS.grid}
            horizontal={false}
          />
          <XAxis
            type="number"
            tickFormatter={formatAxisCurrency}
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
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
          />
          <Bar dataKey="totalValue" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.orgId === 'others' ? OTHERS_COLOR : BAR_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>

      {/* Explanatory text — only in expanded view */}
      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart ranks the top external development partners by the sum of their outgoing commitments and disbursements within the selected date range. Myanmar government ministries (recipient-country entities) are excluded so domestic budget transfers do not appear as donor flows. The horizontal bars make it easy to compare relative scale across organisations. If fewer than 10 partners have qualifying transactions in the period, the chart shows only the available rows. Hover over any bar to see the exact USD amount.
        </p>
      )}
    </div>
  )
}


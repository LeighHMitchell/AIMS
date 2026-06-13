'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChartViewToggle } from '@/components/ui/chart-view-toggle'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { ChartDataTable, type ChartTableColumn } from '@/components/ui/chart-data-table'
import { MetricMultiSelect } from './shared/MetricMultiSelect'
import { METRIC_LABEL, metricColor, type Metric } from './shared/metric-options'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import { SectorHierarchyFilter, type SectorFilterSelection } from '@/components/maps/SectorHierarchyFilter'
import { CustomYear, getCustomYearRange, pickDefaultCalendarYearId } from '@/types/custom-years'
import { useYearRangeDefault } from '@/hooks/useYearRangeDefault'
import { IATI_ORGANIZATION_TYPES } from '@/data/iati-organization-types'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { formatAxisCurrency, formatTooltipCurrency } from '@/lib/format'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { apiFetch } from '@/lib/api-fetch'
import aidTypesData from '@/data/aid-types.json'
import financeTypesData from '@/data/finance-types.json'

// Humanitarian segment colour (matches HumanitarianChart / HumanitarianShareChart).
const HUMANITARIAN_COLOR = '#dc2625'
const DEVELOPMENT_COLOR = '#94a3b8'

// Build flat code→name maps from the (nested) IATI codelists so aid/finance
// filter chips can show human-readable labels.
function flattenCodeNames(node: any, out: Record<string, string>) {
  if (Array.isArray(node)) {
    node.forEach((n) => flattenCodeNames(n, out))
    return
  }
  if (node && typeof node === 'object') {
    if (node.code && node.name) out[String(node.code)] = String(node.name)
    Object.values(node).forEach((v) => {
      if (v && typeof v === 'object') flattenCodeNames(v, out)
    })
  }
}
const AID_TYPE_NAMES: Record<string, string> = {}
flattenCodeNames(aidTypesData as any, AID_TYPE_NAMES)
const FINANCE_TYPE_NAMES: Record<string, string> = {}
flattenCodeNames(financeTypesData as any, FINANCE_TYPE_NAMES)

interface ActivityRow {
  id: string
  name: string
  acronym: string | null
  iati_identifier: string | null
  reportingOrgId: string | null
  reportingOrgName: string | null
  reportingOrgType: string | null
  defaultAidType: string | null
  defaultFinanceType: string | null
  totalBudget: number
  totalPlannedDisbursement: number
  byTxType: Record<string, number>
  humanitarianActual: number
  developmentActual: number
}
interface Partner {
  id: string
  name: string
  acronym: string | null
}

interface HumanitarianActivitiesChartProps {
  dateRange: { from: Date; to: Date }
  refreshKey: number
  onDataChange?: (data: any[]) => void
}

const metricValue = (r: ActivityRow, m: Metric): number => {
  if (m === 'budgets') return r.totalBudget || 0
  if (m === 'planned') return r.totalPlannedDisbursement || 0
  return r.byTxType?.[m.slice(3)] || 0
}

const activityLabel = (r: { name: string }): string => {
  const t = r.name || 'Untitled activity'
  return t.length > 42 ? `${t.slice(0, 42)}…` : t
}

// Generic compact multi-select used for the org-type / aid-type / finance-type
// / partner filters. Mirrors the look of MetricMultiSelect's option list.
function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: Array<{ value: string; label: string }>
  selected: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 justify-between gap-2 min-w-[150px]">
          <span className="truncate text-body">
            {selected.length ? `${label} (${selected.length})` : label}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px] max-h-[360px] overflow-y-auto p-1">
        <div className="flex items-center justify-between px-2 py-1.5 sticky top-0 bg-card">
          <span className="text-helper font-semibold text-foreground">{label}</span>
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
            className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
          >
            Clear
          </button>
        </div>
        {options.length === 0 && (
          <div className="px-3 py-4 text-helper text-muted-foreground text-center">No options</div>
        )}
        {options.map((o) => {
          const checked = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(checked ? selected.filter((x) => x !== o.value) : [...selected, o.value])}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted rounded text-body"
            >
              <Checkbox checked={checked} className="pointer-events-none flex-shrink-0" />
              <span className="text-foreground truncate">{o.label}</span>
            </button>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function HumanitarianActivitiesChart({
  dateRange,
  refreshKey,
  onDataChange,
}: HumanitarianActivitiesChartProps) {
  const isExpanded = useChartExpansion()

  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // View controls
  const [viewMode, setViewMode] = useState<'metric' | 'split' | 'table'>('metric')
  const [stacked, setStacked] = useState(true)
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['tx_3', 'tx_4'])

  // Filters
  const [sectorFilter, setSectorFilter] = useState<SectorFilterSelection>({
    sectorCategories: [],
    sectors: [],
    subSectors: [],
  })
  const [orgTypeFilter, setOrgTypeFilter] = useState<string[]>([])
  const [aidTypeFilter, setAidTypeFilter] = useState<string[]>([])
  const [financeTypeFilter, setFinanceTypeFilter] = useState<string[]>([])
  const [partnerFilter, setPartnerFilter] = useState<string[]>([])

  // Stable filter-option universe (populated once from a broad, unfiltered fetch
  // so toggling a filter never empties its own dropdown).
  const [universe, setUniverse] = useState<{ partners: Partner[]; aidTypes: string[]; financeTypes: string[] }>({
    partners: [],
    aidTypes: [],
    financeTypes: [],
  })

  // Calendar / year selection
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [dataYears, setDataYears] = useState<number[]>([])
  const [localDateRange, setLocalDateRange] = useState<{ from: Date; to: Date } | null>(null)

  const actualDataRange = useYearRangeDefault(dataYears, selectedYears, setSelectedYears)

  const effectiveDateRange = useMemo(() => {
    if (localDateRange?.from && localDateRange?.to) return localDateRange
    if (dateRange?.from && dateRange?.to) return dateRange
    const now = new Date()
    return { from: new Date(now.getFullYear() - 5, 0, 1), to: now }
  }, [localDateRange, dateRange])

  // Fetch custom years → default calendar (Gregorian CY unless overridden).
  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiFetch('/api/custom-years')
        if (!res.ok) return
        const result = await res.json()
        const ys: CustomYear[] = result.data || []
        setCustomYears(ys)
        setCalendarType(pickDefaultCalendarYearId(ys, result.defaultId))
      } catch (err) {
        console.error('[HumanitarianActivities] custom-years fetch failed:', err)
      }
    })()
  }, [])

  // Broad, unfiltered fetch on mount to learn the data's year span and the full
  // partner / aid-type / finance-type universe for the filter dropdowns.
  useEffect(() => {
    ;(async () => {
      try {
        const params = new URLSearchParams({ dateFrom: '2000-01-01', dateTo: '2050-12-31' })
        const res = await apiFetch(`/api/analytics/humanitarian-activities?${params}`)
        if (!res.ok) return
        const result = await res.json()
        if (Array.isArray(result.availableYears) && result.availableYears.length) {
          setDataYears(result.availableYears)
        }
        const aidSet = new Set<string>()
        const finSet = new Set<string>()
        ;(result.data || []).forEach((r: ActivityRow) => {
          if (r.defaultAidType) aidSet.add(r.defaultAidType)
          if (r.defaultFinanceType) finSet.add(r.defaultFinanceType)
        })
        setUniverse({
          partners: result.partners || [],
          aidTypes: Array.from(aidSet),
          financeTypes: Array.from(finSet),
        })
      } catch (err) {
        console.error('[HumanitarianActivities] universe fetch failed:', err)
      }
    })()
  }, [])

  // Derive the [from, to] window from the selected years + calendar type.
  useEffect(() => {
    if (customYears.length > 0 && selectedYears.length > 0 && calendarType) {
      const cy = customYears.find((c) => c.id === calendarType)
      if (cy) {
        const sorted = [...selectedYears].sort((a, b) => a - b)
        const first = getCustomYearRange(cy, sorted[0])
        const last = getCustomYearRange(cy, sorted[sorted.length - 1])
        setLocalDateRange({ from: first.start, to: last.end })
      }
    }
  }, [calendarType, selectedYears, customYears])

  const dateFromStr = effectiveDateRange.from.toISOString()
  const dateToStr = effectiveDateRange.to.toISOString()
  const sectorKey = `${sectorFilter.sectorCategories.join(',')}|${sectorFilter.sectors.join(',')}|${sectorFilter.subSectors.join(',')}`

  // Main data fetch — re-runs on any window or filter change.
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams({ dateFrom: dateFromStr, dateTo: dateToStr })
        if (calendarType) params.set('customYearId', calendarType)
        if (orgTypeFilter.length) params.set('orgType', orgTypeFilter.join(','))
        if (aidTypeFilter.length) params.set('aidType', aidTypeFilter.join(','))
        if (financeTypeFilter.length) params.set('financeType', financeTypeFilter.join(','))
        if (partnerFilter.length) params.set('partnerIds', partnerFilter.join(','))
        if (sectorFilter.sectorCategories.length) params.set('sectorGroups', sectorFilter.sectorCategories.join(','))
        if (sectorFilter.sectors.length) params.set('sectorCategories', sectorFilter.sectors.join(','))
        if (sectorFilter.subSectors.length) params.set('sectorSubSectors', sectorFilter.subSectors.join(','))

        const res = await apiFetch(`/api/analytics/humanitarian-activities?${params}`)
        const result = await res.json()
        if (!res.ok || !result.success) throw new Error(result.error || 'Failed to load chart data')
        setRows(result.data || [])
        onDataChange?.(result.data || [])
      } catch (err) {
        console.error('[HumanitarianActivities] data fetch failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to load chart data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dateFromStr,
    dateToStr,
    calendarType,
    orgTypeFilter.join(','),
    aidTypeFilter.join(','),
    financeTypeFilter.join(','),
    partnerFilter.join(','),
    sectorKey,
    refreshKey,
  ])

  // Rows sorted by the displayed total; capped in the compact (collapsed) card.
  const limited = useMemo(() => {
    const valueOf = (r: ActivityRow) =>
      viewMode === 'split'
        ? r.humanitarianActual + r.developmentActual
        : selectedMetrics.reduce((s, m) => s + metricValue(r, m), 0)
    const sorted = [...rows].sort((a, b) => valueOf(b) - valueOf(a)).filter((r) => valueOf(r) > 0)
    return isExpanded ? sorted : sorted.slice(0, 8)
  }, [rows, viewMode, selectedMetrics, isExpanded])

  const chartData = useMemo(
    () =>
      limited.map((r) => {
        const base: Record<string, any> = { id: r.id, name: r.name, iati_identifier: r.iati_identifier }
        if (viewMode === 'split') {
          base.humanitarian = r.humanitarianActual
          base.development = r.developmentActual
        } else {
          selectedMetrics.forEach((m) => {
            base[m] = metricValue(r, m)
          })
        }
        return base
      }),
    [limited, viewMode, selectedMetrics]
  )

  const labelById = useMemo(
    () => Object.fromEntries(limited.map((r) => [r.id, activityLabel(r)])) as Record<string, string>,
    [limited]
  )

  // Table view (shared ChartDataTable) — shows all activities, not just the
  // top-N rendered as bars.
  const tableRows = useMemo(
    () =>
      rows.map((r) => ({
        activity: r.acronym ? `${r.name} (${r.acronym})` : r.name,
        partner: r.reportingOrgName || '—',
        humanitarian: r.humanitarianActual,
        development: r.developmentActual,
        budget: r.totalBudget,
        planned: r.totalPlannedDisbursement,
      })),
    [rows]
  )
  const tableColumns: ChartTableColumn[] = [
    { key: 'activity', label: 'Activity', align: 'left' },
    { key: 'partner', label: 'Reporting Org', align: 'left' },
    { key: 'humanitarian', label: 'Humanitarian', numeric: true, color: HUMANITARIAN_COLOR, format: (v) => formatTooltipCurrency(Number(v) || 0, true) },
    { key: 'development', label: 'Development', numeric: true, color: DEVELOPMENT_COLOR, format: (v) => formatTooltipCurrency(Number(v) || 0, true) },
    { key: 'budget', label: 'Total Budget', numeric: true, format: (v) => formatTooltipCurrency(Number(v) || 0, true) },
    { key: 'planned', label: 'Planned Disb.', numeric: true, format: (v) => formatTooltipCurrency(Number(v) || 0, true) },
  ]

  // Filter dropdown options (from the stable universe, not the filtered rows).
  const orgTypeOptions = useMemo(
    () => IATI_ORGANIZATION_TYPES.map((t) => ({ value: t.code, label: `${t.code} – ${t.name}` })),
    []
  )
  const aidTypeOptions = useMemo(
    () =>
      universe.aidTypes
        .map((c) => ({ value: c, label: AID_TYPE_NAMES[c] ? `${c} – ${AID_TYPE_NAMES[c]}` : c }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [universe.aidTypes]
  )
  const financeTypeOptions = useMemo(
    () =>
      universe.financeTypes
        .map((c) => ({ value: c, label: FINANCE_TYPE_NAMES[c] ? `${c} – ${FINANCE_TYPE_NAMES[c]}` : c }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [universe.financeTypes]
  )
  const partnerOptions = useMemo(
    () => universe.partners.map((p) => ({ value: p.id, label: p.acronym ? `${p.name} (${p.acronym})` : p.name })),
    [universe.partners]
  )

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const row = payload[0].payload
    if (viewMode === 'split') {
      const hum = row.humanitarian || 0
      const dev = row.development || 0
      const total = hum + dev
      return (
        <ChartTooltipCard
          title={row.name}
          rows={[
            { label: 'Humanitarian', value: formatTooltipCurrency(hum, isExpanded), color: HUMANITARIAN_COLOR },
            { label: 'Development', value: formatTooltipCurrency(dev, isExpanded), color: DEVELOPMENT_COLOR },
            { label: 'Humanitarian share', value: total > 0 ? `${((hum / total) * 100).toFixed(1)}%` : '—' },
          ]}
        />
      )
    }
    return (
      <ChartTooltipCard
        title={row.name}
        rows={payload.map((p: any) => ({
          label: METRIC_LABEL[p.dataKey as Metric] || p.name,
          value: formatTooltipCurrency(Number(p.value) || 0, isExpanded),
          color: p.color || p.fill,
        }))}
      />
    )
  }

  if (loading) return <ChartLoadingPlaceholder />

  if (error) {
    return (
      <div className="flex items-center justify-center h-72 text-destructive">
        <span className="text-body">{error}</span>
      </div>
    )
  }

  const noData = chartData.length === 0
  const showMetricBars = viewMode === 'metric' && selectedMetrics.length > 0
  const chartHeight = isExpanded ? Math.max(360, chartData.length * 34) : 240

  return (
    <div className="w-full">
      {/* Controls — expanded view only */}
      {isExpanded && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <ChartViewToggle
            ariaLabel="View mode"
            variant="text"
            value={viewMode}
            onValueChange={(v) => setViewMode(v as 'metric' | 'split' | 'table')}
            options={[
              { value: 'metric', label: 'By metric' },
              { value: 'split', label: 'Humanitarian split' },
              { value: 'table', label: 'Table' },
            ]}
          />

          {viewMode === 'metric' && (
            <>
              <ChartViewToggle
                ariaLabel="Stacking"
                variant="text"
                value={stacked ? 'stacked' : 'grouped'}
                onValueChange={(v) => setStacked(v === 'stacked')}
                options={[
                  { value: 'stacked', label: 'Stacked' },
                  { value: 'grouped', label: 'Grouped' },
                ]}
              />
              <MetricMultiSelect selected={selectedMetrics} onChange={setSelectedMetrics} />
            </>
          )}

          <MultiSelectFilter
            label="Partner"
            options={partnerOptions}
            selected={partnerFilter}
            onChange={setPartnerFilter}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 justify-between gap-2 min-w-[150px]">
                <span className="truncate text-body">
                  {sectorFilter.sectorCategories.length + sectorFilter.sectors.length + sectorFilter.subSectors.length > 0
                    ? `Sector (${sectorFilter.sectorCategories.length + sectorFilter.sectors.length + sectorFilter.subSectors.length})`
                    : 'Sector'}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[340px] max-h-[420px] overflow-y-auto p-2">
              <SectorHierarchyFilter selected={sectorFilter} onChange={setSectorFilter} />
            </DropdownMenuContent>
          </DropdownMenu>

          <MultiSelectFilter
            label="Org type"
            options={orgTypeOptions}
            selected={orgTypeFilter}
            onChange={setOrgTypeFilter}
          />
          <MultiSelectFilter
            label="Aid type"
            options={aidTypeOptions}
            selected={aidTypeFilter}
            onChange={setAidTypeFilter}
          />
          <MultiSelectFilter
            label="Finance type"
            options={financeTypeOptions}
            selected={financeTypeFilter}
            onChange={setFinanceTypeFilter}
          />

          <div className="ml-auto">
            <YearRangeChip
              selectedYears={selectedYears}
              onYearsChange={setSelectedYears}
              actualDataRange={actualDataRange}
              customYears={customYears}
              calendarType={calendarType}
              onCalendarTypeChange={setCalendarType}
            />
          </div>
        </div>
      )}

      {/* Chart / Table */}
      {viewMode === 'table' ? (
        rows.length === 0 ? (
          <div className="flex items-center justify-center h-72 text-center text-muted-foreground">
            <p className="text-body">No humanitarian activities found for the current filters.</p>
          </div>
        ) : (
          <div className="max-h-[620px] overflow-y-auto">
            <ChartDataTable rows={tableRows} columns={tableColumns} />
          </div>
        )
      ) : noData ? (
        <div className="flex items-center justify-center h-72 text-center text-muted-foreground">
          <p className="text-body">
            {viewMode === 'metric' && selectedMetrics.length === 0
              ? 'Select at least one metric to display.'
              : 'No humanitarian activities found for the current filters.'}
          </p>
        </div>
      ) : (
        <div className={isExpanded ? 'max-h-[620px] overflow-y-auto' : ''}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 12, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
              <XAxis type="number" tickFormatter={(v: any) => formatAxisCurrency(Number(v))} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="id"
                tickFormatter={(id: string) => labelById[id] || ''}
                tick={{ fill: '#4c5568', fontSize: 11 }}
                width={isExpanded ? 220 : 130}
              />
              <Tooltip content={<CustomTooltip />} />
              {isExpanded && <Legend formatter={(value) => <span className="text-body text-foreground">{value}</span>} />}
              {viewMode === 'split' ? (
                <>
                  <Bar dataKey="humanitarian" name="Humanitarian" stackId="split" fill={HUMANITARIAN_COLOR} />
                  <Bar
                    dataKey="development"
                    name="Development"
                    stackId="split"
                    fill={DEVELOPMENT_COLOR}
                    radius={[0, 4, 4, 0]}
                  />
                </>
              ) : showMetricBars ? (
                selectedMetrics.map((m, i) => (
                  <Bar
                    key={m}
                    dataKey={m}
                    name={METRIC_LABEL[m]}
                    stackId={stacked ? 'metrics' : undefined}
                    fill={metricColor(m)}
                    radius={
                      stacked
                        ? i === selectedMetrics.length - 1
                          ? [0, 4, 4, 0]
                          : [0, 0, 0, 0]
                        : [0, 4, 4, 0]
                    }
                  />
                ))
              ) : null}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Explanatory text — expanded view only */}
      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed mt-6">
          This chart lists every activity with a humanitarian component as a horizontal bar. In <strong>By metric</strong> mode
          you choose which financial metrics to show (Total Budgets, Total Planned Disbursements, or any of the 13 IATI
          transaction types) and either stack them into a single bar or group them side by side. Switch to{' '}
          <strong>Humanitarian split</strong> to recolour each bar into its humanitarian (red) versus development share of
          actual spend (disbursements and expenditures), making it easy to see which activities are predominantly
          humanitarian. Use the calendar, sector, partner, organisation-type, aid-type and finance-type filters to narrow the
          view; an activity counts as humanitarian when it carries the IATI humanitarian flag, an emergency aid type, or any
          humanitarian-flagged transaction.
        </p>
      )}
    </div>
  )
}

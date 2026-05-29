"use client"

import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  PieChart as PieIcon,
  BarChart3,
  Sun,
  Network,
  Table as TableIcon,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-fetch'
import { getSectorColor } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { useChartCardToolbar } from '@/components/ui/compact-chart-card'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { ChartViewToggle } from '@/components/ui/chart-view-toggle'
import { ChartDataTable, CodeChip, type ChartTableColumn } from '@/components/ui/chart-data-table'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import {
  SectorHierarchyFilter,
  type SectorFilterSelection,
} from '@/components/maps/SectorHierarchyFilter'
import { PieView } from './sector-views/PieView'
import { MetricMultiSelect } from './shared/MetricMultiSelect'
import { METRIC_LABEL, type Metric } from './shared/metric-options'
import type {
  ApiSector,
  HierarchyRow,
  SectorActivityCounts,
  SectorLevel,
  SectorSlice,
  SectorView,
} from './sector-views/types'

// Nivo charts use SVG layout that depends on `window`; dynamically import with
// ssr:false so they don't fail during the App Router server render. The
// `loading` fallback keeps the chart area visibly populated while the chunk
// downloads — without it the area appears blank for a beat after the user
// clicks one of these view-toggle buttons. Next.js requires the options arg
// to be an object literal at the call site, so we can't extract it to a const.
const BarView = dynamic(
  () => import('./sector-views/BarView').then(m => m.BarView),
  { ssr: false, loading: () => <ChartLoadingPlaceholder /> },
)
const SunburstView = dynamic(
  () => import('./sector-views/SunburstView').then(m => m.SunburstView),
  { ssr: false, loading: () => <ChartLoadingPlaceholder /> },
)
const SankeyView = dynamic(
  () => import('./sector-views/SankeyView').then(m => m.SankeyView),
  { ssr: false, loading: () => <ChartLoadingPlaceholder /> },
)

// Surface runtime errors from Nivo views (which otherwise render as a blank
// chart area). Without this, a malformed data row or a Nivo prop mismatch
// looks identical to a slow chunk load.
class ChartViewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SectorDistributionChart] view crashed', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-full bg-destructive/10 rounded-lg">
          <div className="text-center px-4">
            <p className="text-destructive font-medium">Chart failed to render</p>
            <p className="text-body text-destructive/80 mt-1">{this.state.error.message}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

interface SectorDistributionChartProps {
  dateRange: { from: Date; to: Date }
  refreshKey: number
  // Kept for parity with SectorPieChart so the dashboard export button still
  // receives an array of {name, value, percentage} usable for CSV download.
  onDataChange?: (data: Array<{ name: string; value: number; percentage: number }>) => void
}

// Full available span (2010 → current year + 10). The chart's slices are
// aggregated across years with no per-year field, so the year picker defaults
// to this full range rather than a derived data span.
const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i
)

const LEVEL_OPTIONS = [
  { value: 'category' as const, label: 'Sector Category' },
  { value: 'sector' as const, label: 'Sector' },
  { value: 'subsector' as const, label: 'Sub-Sector' },
]

const VIEW_OPTIONS = [
  { value: 'pie' as const, label: 'Pie', icon: PieIcon },
  { value: 'bar' as const, label: 'Bar', icon: BarChart3 },
  { value: 'sunburst' as const, label: 'Sunburst', icon: Sun },
  { value: 'sankey' as const, label: 'Sankey', icon: Network },
]

export function SectorDistributionChart({
  // `dateRange` is still part of the props contract (the dashboard passes its
  // 5-year window) but is no longer used to bound the fetch: the picker now
  // defaults to the full available span. Kept in the interface for parity.
  refreshKey,
  onDataChange,
}: SectorDistributionChartProps) {
  const isExpanded = useChartExpansion()
  const toolbar = useChartCardToolbar()
  const [apiData, setApiData] = useState<ApiSector[]>([])
  const [activityCounts, setActivityCounts] = useState<SectorActivityCounts | null>(null)
  // Mirror the External Development Partners sector filter: activity counts +
  // an "only active sectors" toggle (on by default).
  const [showOnlyActiveSectors, setShowOnlyActiveSectors] = useState(true)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [level, setLevel] = useState<SectorLevel>('sector')
  const [view, setView] = useState<SectorView>('sunburst')
  // Table mode is owned by this chart (not the CompactChartCard toolbar) so we
  // can render our OWN ChartDataTable with merged code+name / plain-number
  // columns. Driving it through the card's toolbar would also surface the
  // generic exportData table stacked below ours, so we keep the card in chart
  // mode and swap the body to our table here instead.
  const [tableMode, setTableMode] = useState(false)
  // Financial metrics to display. Mirrors the External Development Partners
  // Financial Overview chart; default Disbursements (tx_3) preserves the
  // chart's prior single-measure behaviour.
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['tx_3'])
  // When the chart is expanded, the user can narrow further via YearRangeChip;
  // in compact view we just use the dashboard-level dateRange.
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  // Hierarchical sector filter — matches the picker used by AllDonors.
  // sectorCategories = DAC group codes, sectors = DAC category codes,
  // subSectors = DAC 5-digit codes. All empty = no filtering.
  const [sectorFilter, setSectorFilter] = useState<SectorFilterSelection>({
    sectorCategories: [],
    sectors: [],
    subSectors: [],
  })

  // Default the year picker to the full available span (the chart's slices are
  // aggregated across years with no per-year field to derive a data span from).
  useEffect(() => {
    if (selectedYears.length === 0) {
      setSelectedYears([AVAILABLE_YEARS[0], AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Effective fetch range: when expanded with a year selection, narrow to those
  // years; otherwise fetch the full available span so the picker shows all data
  // by default (nothing clipped to the dashboard's 5-year window).
  const effectiveRange = useMemo(() => {
    if (isExpanded && selectedYears.length > 0) {
      const minY = Math.min(...selectedYears)
      const maxY = Math.max(...selectedYears)
      return {
        from: new Date(minY, 0, 1),
        to: new Date(maxY, 11, 31, 23, 59, 59, 999),
      }
    }
    // Fetch the full available span so the picker shows all data by default.
    return {
      from: new Date(AVAILABLE_YEARS[0], 0, 1),
      to: new Date(AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1], 11, 31, 23, 59, 59, 999),
    }
  }, [isExpanded, selectedYears])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        setFetchError(null)
        const params = new URLSearchParams({
          dateFrom: effectiveRange.from.toISOString(),
          dateTo: effectiveRange.to.toISOString(),
        })
        const url = `/api/analytics/disbursements-by-sector?${params.toString()}`
        const res = await apiFetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (cancelled) return
        const sectors = Array.isArray(json?.sectors) ? json.sectors : []
        setApiData(sectors)
        setActivityCounts(json?.activityCounts ?? null)
      } catch (err: any) {
        if (!cancelled) {
          console.error('[SectorDistributionChart] fetch error', err)
          setFetchError(err?.message || 'Failed to load sector data')
          setApiData([])
          setActivityCounts(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [effectiveRange.from, effectiveRange.to, refreshKey, isExpanded])

  // Flatten the API response into one (sub-)sector row per record, summing
  // actuals across years. Apply the hierarchical sector filter here so every
  // downstream view (pie/bar/sunburst/sankey) reflects the picker selection.
  const rows = useMemo<HierarchyRow[]>(() => {
    const groupSet = new Set(sectorFilter.sectorCategories)
    const catSet = new Set(sectorFilter.sectors)
    const subSet = new Set(sectorFilter.subSectors)
    const hasFilter = groupSet.size + catSet.size + subSet.size > 0
    return apiData
      .map(s => {
        // Sum each selected metric across years; `value` is the combined total
        // used by pie/sunburst/sankey, `metrics` feeds the grouped bar view.
        const metrics: Record<string, number> = {}
        let value = 0
        for (const m of selectedMetrics) {
          const v = s.years.reduce((sum, y) => sum + (Number((y as any)[m]) || 0), 0)
          metrics[m] = v
          value += v
        }
        return {
          groupCode: s.groupCode,
          groupName: s.groupName,
          categoryCode: s.categoryCode,
          categoryName: s.categoryName,
          sectorCode: s.sectorCode,
          sectorName: s.sectorName,
          value,
          metrics,
        }
      })
      .filter(r => r.value > 0)
      .filter(r => {
        if (!hasFilter) return true
        // A row passes if any of its hierarchy ancestors is explicitly
        // selected — same hierarchical-OR semantics AllDonors uses.
        return (
          groupSet.has(r.groupCode) ||
          catSet.has(r.categoryCode) ||
          subSet.has(r.sectorCode)
        )
      })
  }, [apiData, sectorFilter, selectedMetrics])

  // Which sector codes are present in the unfiltered data — passed to the
  // filter picker so it can grey-out / hide DAC sectors with no activity.
  const availableSectorCodes = useMemo(
    () => Array.from(new Set(apiData.map(s => s.sectorCode).filter(Boolean))),
    [apiData],
  )

  // Aggregate rows to the chosen level, sort descending, attach palette colors.
  const slices = useMemo<SectorSlice[]>(() => {
    const buckets = new Map<string, SectorSlice>()
    for (const r of rows) {
      let code: string
      let name: string
      if (level === 'category') {
        code = r.groupCode
        name = r.groupName
      } else if (level === 'sector') {
        code = r.categoryCode
        name = r.categoryName
      } else {
        code = r.sectorCode
        name = r.sectorName
      }
      const existing = buckets.get(code)
      if (existing) {
        existing.value += r.value
        for (const m of selectedMetrics) {
          existing.metrics[m] = (existing.metrics[m] || 0) + (r.metrics[m] || 0)
        }
      } else {
        buckets.set(code, {
          code,
          name,
          value: r.value,
          metrics: { ...r.metrics },
          activityCount: 0, // filled in after sort, from the level's count map
          groupCode: r.groupCode,
          groupName: r.groupName,
          categoryCode: r.categoryCode,
          categoryName: r.categoryName,
          color: '#000000', // overwritten below after sort
        })
      }
    }
    // Distinct-activity counts for the current level, keyed by the slice code.
    const countMap =
      level === 'category' ? activityCounts?.byGroup
      : level === 'sector' ? activityCounts?.byCategory
      : activityCounts?.bySector
    const sorted = Array.from(buckets.values()).sort((a, b) => b.value - a.value)
    return sorted.map((s, i) => ({
      ...s,
      color: getSectorColor(i),
      activityCount: countMap?.[s.code] ?? 0,
    }))
  }, [rows, level, selectedMetrics, activityCounts])

  // Bubble a simple export shape up for the CompactChartCard CSV button.
  useEffect(() => {
    if (!onDataChange) return
    const total = slices.reduce((sum, s) => sum + s.value, 0)
    onDataChange(
      slices.map(s => ({
        name: s.name,
        value: s.value,
        percentage: total > 0 ? (s.value / total) * 100 : 0,
      }))
    )
  }, [slices, onDataChange])

  const chartHeight = isExpanded ? 520 : 300
  // In the collapsed card, always preview the sunburst (a compact overview);
  // expanded keeps whatever view the user has selected.
  const effectiveView = isExpanded ? view : 'sunburst'

  // Header for the value column in the table view — mirrors the pie/sunburst
  // `valueLabel`: a single metric's name, else a "Total (n metrics)" label.
  const valueColumnLabel =
    selectedMetrics.length === 1
      ? METRIC_LABEL[selectedMetrics[0]]
      : `Total (${selectedMetrics.length} metrics)`

  // The merged code+name column's header reflects the grouping the user has
  // chosen via the Sector level toggle (`level`): Category / Sector / Sub-Sector.
  const sectorColumnLabel =
    level === 'category' ? 'Category' : level === 'sector' ? 'Sector' : 'Sub-Sector'

  // Explicit columns for the chart's own table view. `slices` already carries
  // the aggregated code/name/value/activityCount/color for the active level.
  // The code+name are merged into one cell (gray-mono CodeChip + name); the
  // value stays currency; the activity count renders as a plain number.
  const tableColumns: ChartTableColumn[] = [
    {
      key: 'code',
      label: sectorColumnLabel,
      format: (_v, row) => (
        <span className="inline-flex items-center gap-2">
          <CodeChip>{row.code}</CodeChip>
          {row.name}
        </span>
      ),
    },
    {
      key: 'value',
      label: valueColumnLabel,
      numeric: true,
      currency: 'USD',
    },
    {
      key: 'activityCount',
      label: 'Activities',
      numeric: true,
      includeInTotal: false,
      format: (v) => (Number(v) || 0).toLocaleString(),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* All in-chart controls are expanded-view only; in compact mode the
          card shows just the chart plus the wrapper's (ƒ) and expand buttons.
          Row 1 — year chip on the left, then all the toggle / table / CSV
          buttons flush right. Row 2 — sector picker on its own line, also
          right-aligned. */}
      {/* Calendar + year selector on its own row at the top (expanded only) */}
      {isExpanded && (
        <div className="flex items-start gap-2">
          <YearRangeChip
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
          />
        </div>
      )}
      {/* Controls row — filters + toggles left, CSV right (expanded only) */}
      {isExpanded && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto min-w-0">
            <SectorHierarchyFilter
              selected={sectorFilter}
              onChange={setSectorFilter}
              activityCounts={activityCounts ? {
                ...activityCounts.byGroup,
                ...activityCounts.byCategory,
                ...activityCounts.bySector,
              } : {}}
              showOnlyActiveSectors={showOnlyActiveSectors}
              onShowOnlyActiveSectorsChange={setShowOnlyActiveSectors}
              className="h-9 whitespace-nowrap"
            />
            {/* Financial metric multi-select — same dropdown as the External
                Development Partners Financial Overview chart. */}
            <MetricMultiSelect
              selected={selectedMetrics}
              onChange={setSelectedMetrics}
              triggerClassName="min-w-[220px] h-9 justify-between"
            />
            {/* Sector level (dimension) toggle — a data selector, kept on the
                left. Sunburst + Sankey always render the full hierarchy, so
                hide it there. */}
            {view !== 'sunburst' && view !== 'sankey' && (
              <ChartViewToggle<SectorLevel>
                ariaLabel="Sector level"
                value={level}
                onValueChange={setLevel}
                options={LEVEL_OPTIONS}
                variant="text"
              />
            )}
          </div>
          {/* Chart-style/view toggle + CSV, right-aligned. */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Table is folded into the view toggle as another option, so it
                reads as one of the views (Pie / Bar / Sunburst / Sankey /
                Table) and a single click switches between any of them. */}
            <ChartViewToggle<SectorView | 'table'>
              ariaLabel="Chart view"
              value={tableMode ? 'table' : view}
              onValueChange={(v) => {
                if (v === 'table') {
                  setTableMode(true)
                } else {
                  setView(v)
                  setTableMode(false)
                }
                // Keep the card's toolbar in chart mode: we render our own
                // table below, so letting it flip to 'table' would also show
                // the generic exportData table stacked under ours.
                toolbar?.setViewMode('chart')
              }}
              options={
                toolbar?.hasTableView
                  ? [...VIEW_OPTIONS, { value: 'table' as const, label: 'Table', icon: TableIcon }]
                  : VIEW_OPTIONS
              }
              variant="icon"
            />
          {toolbar?.hasExportData && (
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
          )}
          </div>
        </div>
      )}

      {/* Hide the chart body when this chart is in table-view mode (only
          reachable when expanded) — we render our own ChartDataTable below
          instead of the plot. */}
      {!(isExpanded && tableMode) && (
        <div style={{ height: chartHeight }}>
          {loading ? (
            <ChartLoadingPlaceholder />
          ) : fetchError ? (
            <div className="flex items-center justify-center h-full bg-destructive/10 rounded-lg">
              <div className="text-center px-4">
                <p className="text-destructive font-medium">Failed to load sector data</p>
                <p className="text-body text-destructive/80 mt-1">{fetchError}</p>
              </div>
            </div>
          ) : selectedMetrics.length === 0 ? (
            <div className="flex items-center justify-center h-full bg-muted rounded-lg">
              <div className="text-center">
                <p className="text-muted-foreground">Select at least one metric</p>
                <p className="text-body text-muted-foreground mt-2">
                  Choose Budgets, Planned Disbursements, or a transaction type from the metrics dropdown
                </p>
              </div>
            </div>
          ) : slices.length === 0 ? (
            <div className="flex items-center justify-center h-full bg-muted rounded-lg">
              <div className="text-center">
                <p className="text-muted-foreground">No sector data available</p>
                <p className="text-body text-muted-foreground mt-2">
                  Try adjusting your date range or filters
                </p>
              </div>
            </div>
          ) : (
            <ChartViewErrorBoundary>
              {effectiveView === 'pie' ? (
                <PieView
                  slices={slices}
                  height={chartHeight}
                  topN={10}
                  valueLabel={
                    selectedMetrics.length === 1
                      ? METRIC_LABEL[selectedMetrics[0]]
                      : `Total (${selectedMetrics.length} metrics)`
                  }
                />
              ) : effectiveView === 'bar' ? (
                <BarView slices={slices} height={chartHeight} metrics={selectedMetrics} />
              ) : effectiveView === 'sunburst' ? (
                <SunburstView
                  rows={rows}
                  height={chartHeight}
                  valueLabel={
                    selectedMetrics.length === 1
                      ? METRIC_LABEL[selectedMetrics[0]]
                      : `Total (${selectedMetrics.length} metrics)`
                  }
                />
              ) : (
                <SankeyView rows={rows} height={chartHeight} />
              )}
            </ChartViewErrorBoundary>
          )}
        </div>
      )}

      {/* Table view — this chart is Pattern-A, so instead of letting the
          CompactChartCard render its generic exportData table we render our
          own ChartDataTable here with explicit columns: a merged code+name
          cell whose header follows the level toggle, a currency value column,
          and a plain-number Activities count. */}
      {isExpanded && tableMode && (
        <ChartDataTable
          rows={slices}
          columns={tableColumns}
          currency="USD"
          maxHeight={500}
        />
      )}

      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed mt-1">
          Distribution of the selected financial metric(s) across DAC sectors.
          Pick any combination of Budgets, Planned Disbursements, and the IATI
          transaction types from the metrics dropdown. The bar view shows each
          metric as its own grouped bar per sector; pie, sunburst, and sankey
          show the combined total. Use the level toggle to switch between Sector
          Category (DAC group), Sector (3-digit category), and Sub-Sector
          (5-digit code). Hover any sector to see how many activities are linked
          to it.
        </p>
      )}
    </div>
  )
}

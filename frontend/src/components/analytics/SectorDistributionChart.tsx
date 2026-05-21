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
import { SegmentedControl } from '@/components/ui/segmented-control'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import {
  SectorHierarchyFilter,
  type SectorFilterSelection,
} from '@/components/maps/SectorHierarchyFilter'
import { PieView } from './sector-views/PieView'
import type {
  ApiSector,
  HierarchyRow,
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
  dateRange: parentDateRange,
  refreshKey,
  onDataChange,
}: SectorDistributionChartProps) {
  const isExpanded = useChartExpansion()
  const toolbar = useChartCardToolbar()
  const [apiData, setApiData] = useState<ApiSector[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [level, setLevel] = useState<SectorLevel>('sector')
  const [view, setView] = useState<SectorView>('pie')
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

  // Effective fetch range: when expanded with a year selection, narrow to those
  // years; otherwise fall back to whatever the dashboard passed in.
  const effectiveRange = useMemo(() => {
    if (isExpanded && selectedYears.length > 0) {
      const minY = Math.min(...selectedYears)
      const maxY = Math.max(...selectedYears)
      return {
        from: new Date(minY, 0, 1),
        to: new Date(maxY, 11, 31, 23, 59, 59, 999),
      }
    }
    return parentDateRange
  }, [isExpanded, selectedYears, parentDateRange])

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
      } catch (err: any) {
        if (!cancelled) {
          console.error('[SectorDistributionChart] fetch error', err)
          setFetchError(err?.message || 'Failed to load sector data')
          setApiData([])
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
      .map(s => ({
        groupCode: s.groupCode,
        groupName: s.groupName,
        categoryCode: s.categoryCode,
        categoryName: s.categoryName,
        sectorCode: s.sectorCode,
        sectorName: s.sectorName,
        value: s.years.reduce((sum, y) => sum + (y.actual || 0), 0),
      }))
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
  }, [apiData, sectorFilter])

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
      } else {
        buckets.set(code, {
          code,
          name,
          value: r.value,
          groupCode: r.groupCode,
          groupName: r.groupName,
          categoryCode: r.categoryCode,
          categoryName: r.categoryName,
          color: '#000000', // overwritten below after sort
        })
      }
    }
    const sorted = Array.from(buckets.values()).sort((a, b) => b.value - a.value)
    return sorted.map((s, i) => ({ ...s, color: getSectorColor(i) }))
  }, [rows, level])

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

  return (
    <div className="flex flex-col gap-3">
      {/* All in-chart controls are expanded-view only; in compact mode the
          card shows just the chart plus the wrapper's (ƒ) and expand buttons.
          Row 1 — year chip on the left, then all the toggle / table / CSV
          buttons flush right. Row 2 — sector picker on its own line, also
          right-aligned. */}
      {isExpanded && (
        <div className="flex items-center gap-2">
          <YearRangeChip
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
            initialDateRange={parentDateRange}
          />
          {/* Spacer that pushes everything after it to the right edge. */}
          <div className="ml-auto flex items-center gap-2">
            {/* Sunburst + Sankey always render the full Group → Category →
                Sub-Sector hierarchy regardless of the level toggle, so we
                hide it there to avoid confusion. */}
            {view !== 'sunburst' && view !== 'sankey' && (
              <SegmentedControl<SectorLevel>
                ariaLabel="Sector level"
                value={level}
                onValueChange={setLevel}
                options={LEVEL_OPTIONS}
                variant="text"
                size="sm"
              />
            )}
            <SegmentedControl<SectorView>
              ariaLabel="Chart view"
              value={view}
              onValueChange={setView}
              options={VIEW_OPTIONS}
              variant="icon"
              size="sm"
            />
            {toolbar?.hasTableView && (
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  toolbar.setViewMode(toolbar.viewMode === 'chart' ? 'table' : 'chart')
                }
                className="h-9 w-9"
                title={toolbar.viewMode === 'chart' ? 'View as table' : 'View as chart'}
                aria-label={toolbar.viewMode === 'chart' ? 'View as table' : 'View as chart'}
              >
                {toolbar.viewMode === 'chart' ? (
                  <TableIcon className="h-4 w-4" />
                ) : (
                  <BarChart3 className="h-4 w-4" />
                )}
              </Button>
            )}
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

      {/* Sector picker on its own row beneath the toolbar, right-aligned —
          explicit w-full + ml-auto on the trigger so the alignment isn't at
          the mercy of any inherited width or display value on the picker's
          Radix wrapper. */}
      {isExpanded && (
        <div className="flex w-full justify-end">
          <SectorHierarchyFilter
            selected={sectorFilter}
            onChange={setSectorFilter}
            availableSectorCodes={availableSectorCodes}
            // showOnlyActiveSectors=false avoids a "No sectors found" empty
            // state — the API gives us per-sector totals, not activity counts.
            // Filtering to data-present sectors already happens via
            // availableSectorCodes.
            showOnlyActiveSectors={false}
            className="h-9 whitespace-nowrap ml-auto"
          />
        </div>
      )}

      {/* Hide the chart body when the wrapper is in table-view mode — the
          CompactChartCard renders both our component (for the controls row)
          and the table below; without this we'd show chart + table stacked. */}
      {toolbar?.viewMode !== 'table' && (
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
              {view === 'pie' ? (
                <PieView slices={slices} height={chartHeight} topN={10} />
              ) : view === 'bar' ? (
                <BarView slices={slices} height={chartHeight} />
              ) : view === 'sunburst' ? (
                <SunburstView rows={rows} height={chartHeight} />
              ) : (
                <SankeyView rows={rows} height={chartHeight} />
              )}
            </ChartViewErrorBoundary>
          )}
        </div>
      )}

      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed mt-1">
          Distribution of actual disbursements across DAC sectors. Use the level
          toggle to switch between Sector Category (DAC group), Sector (3-digit
          category), and Sub-Sector (5-digit code). The pie shows the top 10
          plus a combined Others slice; the bar, sunburst, and sankey views show
          every sector at the chosen level.
        </p>
      )}
    </div>
  )
}

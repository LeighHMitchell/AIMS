"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ChartViewToggle } from '@/components/ui/chart-view-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChartDataTable, CodeChip } from '@/components/ui/chart-data-table'
import { CustomYear, getCustomYearRange, getCustomYearLabel, sortCustomYearsCalendarFirst } from '@/types/custom-years'
import { format } from 'date-fns'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'
import {
  TrendingUp,
  LineChart as LineChartIcon,
  BarChart3 as BarChartIcon,
  Table as TableIcon,
  CalendarIcon,
  SlidersHorizontal,
  Check,
  Search,
} from 'lucide-react'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { ChartTooltipCard, ChartTooltipRow } from '@/components/ui/chart-tooltip'
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import { CHART_STRUCTURE_COLORS, getSectorColor } from '@/lib/chart-colors';
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { MetricMultiSelect } from './shared/MetricMultiSelect'
import { METRIC_LABEL, type Metric } from './shared/metric-options'

// Generate list of available years (from 2010 to current year + 10 to cover all possible data)
const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i
)

// Per-year-per-sector record from /api/analytics/disbursements-by-sector.
// `planned` and `actual` are preserved for back-compat; `budgets` and
// `tx_1`…`tx_13` are the additive fields wired up alongside the multi-metric
// dropdown. (`actual` and `tx_3` carry the same value.)
interface YearData {
  year: number
  label?: string
  planned: number
  actual: number
  budgets?: number
  [txKey: string]: number | string | undefined // tx_1..tx_13
}

interface SectorData {
  sectorCode: string
  sectorName: string
  groupCode: string
  groupName: string
  categoryCode: string
  categoryName: string
  years: YearData[]
}

interface DateRange {
  from: Date
  to: Date
}

interface SectorDisbursementOverTimeProps {
  dateRange: DateRange
  refreshKey?: number
  compact?: boolean
  organizationId?: string
}

type ViewMode = 'area' | 'line' | 'bar' | 'table'
type AggregationLevel = 'group' | 'category' | 'sector'

// Lighten a hex colour towards white by `amount` (0–1). Used in the Bar view
// to render metric segments within each sector's stack as opacity-style
// variants of the sector's base colour, so the colour family still reads as
// "this sector" while each metric stays distinguishable.
const lightenHex = (hex: string, amount: number): string => {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return hex
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  const r = mix(parseInt(m[1], 16))
  const g = mix(parseInt(m[2], 16))
  const b = mix(parseInt(m[3], 16))
  const hh = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hh(r)}${hh(g)}${hh(b)}`
}

// Sum across the user-selected metrics for a single year record. Used by every
// view (area / line / table) where the chart presents one number per sector
// per year — the Bar view goes deeper and reads each metric individually.
const sumSelectedMetrics = (year: YearData | undefined, metrics: Metric[]): number => {
  if (!year) return 0
  let total = 0
  for (const m of metrics) {
    total += Number(year[m] ?? 0) || 0
  }
  return total
}

export function SectorDisbursementOverTime({
  dateRange: initialDateRange,
  refreshKey = 0,
  compact = false,
  organizationId
}: SectorDisbursementOverTimeProps) {
  const isExpanded = useChartExpansion()
  // Multi-select financial metrics. Mirrors AllDonorsHorizontalBarChart — the
  // External Development Partners Financial Overview chart uses the same
  // 15-option dropdown and the same Disbursements (tx_3) default.
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['tx_3'])

  // Metrics are partitioned into three mutually exclusive groups:
  //  - 'pb'     → Total Planned Disbursements ('planned')
  //  - 'budget' → Total Budgets ('budgets')
  //  - 'tx'     → IATI transaction types (tx_1..tx_13), multi-select allowed
  // Selecting from a different group than the current selection replaces the
  // selection rather than mixing groups; transactions still combine freely
  // with each other.
  const metricGroup = (m: Metric): 'pb' | 'budget' | 'tx' =>
    m === 'planned' ? 'pb' : m === 'budgets' ? 'budget' : 'tx'

  const handleMetricsChange = (next: Metric[]) => {
    setSelectedMetrics(prev => {
      const added = next.filter(m => !prev.includes(m))
      if (added.length === 0) return next // pure removals (incl. Clear)
      const newest = added[added.length - 1]
      const targetGroup = metricGroup(newest)
      return next.filter(m => metricGroup(m) === targetGroup)
    })
  }
  const [viewMode, setViewMode] = useState<ViewMode>('area')
  const [aggregationLevel, setAggregationLevel] = useState<AggregationLevel>('group') // Default to Sector Categories
  const [data, setData] = useState<SectorData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleSectors, setVisibleSectors] = useState<Set<string>>(new Set())

  // Ensure we have a valid initial date range
  const getValidInitialDateRange = (): DateRange => {
    if (initialDateRange?.from && initialDateRange?.to &&
        !isNaN(initialDateRange.from.getTime()) && !isNaN(initialDateRange.to.getTime())) {
      return initialDateRange
    }
    // Fallback to 5 years range
    const now = new Date()
    const from = new Date()
    from.setFullYear(now.getFullYear() - 5)
    return { from, to: now }
  }
  const [localDateRange, setLocalDateRange] = useState<DateRange>(getValidInitialDateRange)
  const [filterSearch, setFilterSearch] = useState('')
  const [hasInitialized, setHasInitialized] = useState(false)

  // Calendar type state (will be set from custom years on load)
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)
  const [actualDataRange, setActualDataRange] = useState<{ minYear: number; maxYear: number } | null>(null)

  // Fetch custom years on mount and set system default
  useEffect(() => {
    const fetchCustomYears = async () => {
      try {
        const response = await apiFetch('/api/custom-years')
        if (response.ok) {
          const result = await response.json()
          const years = result.data || []
          setCustomYears(years)

          // Determine which calendar to use
          let selectedCalendar: CustomYear | undefined

          // First priority: system default
          if (result.defaultId) {
            selectedCalendar = years.find((cy: CustomYear) => cy.id === result.defaultId)
          }

          // Fallback: first available custom year
          if (!selectedCalendar && years.length > 0) {
            selectedCalendar = years[0]
          }

          // Set the calendar type and date range
          if (selectedCalendar) {
            setCalendarType(selectedCalendar.id)
            // Use the full year range (first to last selected year)
            const sortedYears = [...selectedYears].sort((a, b) => a - b)
            const firstYearRange = getCustomYearRange(selectedCalendar, sortedYears[0])
            const lastYearRange = getCustomYearRange(selectedCalendar, sortedYears[sortedYears.length - 1])
            setLocalDateRange({ from: firstYearRange.start, to: lastYearRange.end })
          }
        }
      } catch (err) {
        console.error('Failed to fetch custom years:', err)
      } finally {
        setCustomYearsLoading(false)
      }
    }
    fetchCustomYears()
  }, [])


  // Update date range when calendar type or years change
  useEffect(() => {
    if (customYears.length > 0 && calendarType) {
      const customYear = customYears.find(cy => cy.id === calendarType)
      if (customYear) {
        // If we have selected years, use them
        if (selectedYears.length > 0) {
          const sortedYears = [...selectedYears].sort((a, b) => a - b)
          const firstYearRange = getCustomYearRange(customYear, sortedYears[0])
          const lastYearRange = getCustomYearRange(customYear, sortedYears[sortedYears.length - 1])

          setLocalDateRange({
            from: firstYearRange.start,
            to: lastYearRange.end
          })
        }
        // Fallback: use actual data range if available
        else if (actualDataRange) {
          const firstYearRange = getCustomYearRange(customYear, actualDataRange.minYear)
          const lastYearRange = getCustomYearRange(customYear, actualDataRange.maxYear)

          setLocalDateRange({
            from: firstYearRange.start,
            to: lastYearRange.end
          })
        }
        // Final fallback: use 5 years from now
        else {
          const currentYear = new Date().getFullYear()
          const firstYearRange = getCustomYearRange(customYear, currentYear - 5)
          const lastYearRange = getCustomYearRange(customYear, currentYear)

          setLocalDateRange({
            from: firstYearRange.start,
            to: lastYearRange.end
          })
        }
      }
    }
  }, [calendarType, selectedYears, customYears, actualDataRange])

  // Update local date range when prop changes (only if no calendar type set yet)
  useEffect(() => {
    // Only update if we haven't set a calendar type yet (waiting for custom years to load)
    if (!calendarType && initialDateRange?.from && initialDateRange?.to) {
      setLocalDateRange(initialDateRange)
    }
  }, [initialDateRange, calendarType])

  // Handle year click - select start and end of range (max 2 years)
  const handleYearClick = (year: number, shiftKey: boolean) => {
    if (shiftKey && selectedYears.length === 1) {
      // Shift+click with one year selected: set as end of range
      const start = Math.min(selectedYears[0], year)
      const end = Math.max(selectedYears[0], year)
      setSelectedYears([start, end])
    } else if (selectedYears.length === 0) {
      // No selection: set as start
      setSelectedYears([year])
    } else if (selectedYears.length === 1) {
      if (selectedYears[0] === year) {
        // Clicking same year: deselect
        setSelectedYears([])
      } else {
        // Clicking different year: set range
        const start = Math.min(selectedYears[0], year)
        const end = Math.max(selectedYears[0], year)
        setSelectedYears([start, end])
      }
    } else {
      // Already have 2 years (range): start fresh with this year
      setSelectedYears([year])
    }
  }

  // Select all years (first to last)
  const selectAllYears = () => {
    setSelectedYears([AVAILABLE_YEARS[0], AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]])
  }

  // Select only the data range (years where data exists)
  const selectDataRange = () => {
    if (actualDataRange) {
      setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
    } else {
      // Fallback if actualDataRange not yet loaded - use current year range
      const currentYear = new Date().getFullYear()
      setSelectedYears([currentYear - 10, currentYear + 3])
    }
  }

  // Check if a year is between start and end (for light blue highlighting)
  const isYearInRange = (year: number) => {
    if (selectedYears.length < 2) return false
    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)
    return year > minYear && year < maxYear
  }

  // Get year label for a specific year
  const getYearLabel = (year: number) => {
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (customYear) {
      return getCustomYearLabel(customYear, year)
    }
    return `${year}`
  }

  // Toggle visibility for an item at current level
  const toggleItemVisibility = (code: string) => {
    setVisibleSectors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(code)) {
        newSet.delete(code)
      } else {
        newSet.add(code)
      }
      return newSet
    })
  }

  // Select all items at current level
  const selectAllItems = () => {
    setVisibleSectors(new Set(aggregatedData.map(item => item.code)))
  }

  // Clear all items
  const clearAllItems = () => {
    setVisibleSectors(new Set())
  }

  // Select top N items by total value across the currently-selected metrics.
  const selectTopN = (n: number) => {
    const itemTotals = aggregatedData.map(item => ({
      code: item.code,
      total: item.years.reduce((sum, y) => sum + sumSelectedMetrics(y, selectedMetrics), 0),
    }))
    itemTotals.sort((a, b) => b.total - a.total)
    setVisibleSectors(new Set(itemTotals.slice(0, n).map(item => item.code)))
  }

  // Fetch ALL data from API once (no date filtering - filter client-side for instant switching)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch all data without date filtering for instant year switching
        // Use a very wide date range to get all data
        const params = new URLSearchParams()
        params.append('dateFrom', '2000-01-01T00:00:00.000Z')
        params.append('dateTo', '2050-12-31T23:59:59.999Z')
        if (organizationId) {
          params.append('organizationId', organizationId)
        }
        if (calendarType) {
          params.append('customYearId', calendarType)
        }

        const response = await apiFetch(`/api/analytics/disbursements-by-sector?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }

        const result = await response.json()
        const sectors = result.sectors || []
        setData(sectors)

        // Calculate actual data range from the fetched sector data.
        // A year "has data" if any of the 15 metrics is non-zero — we look at
        // budgets / planned / every tx_<code> so the Data button doesn't
        // collapse to the historic planned+actual subset.
        let dataMinYear = Infinity
        let dataMaxYear = -Infinity
        sectors.forEach((sector: SectorData) => {
          sector.years.forEach((yearData: YearData) => {
            let hasData = (yearData.planned || 0) > 0
              || (yearData.actual || 0) > 0
              || (Number(yearData.budgets) || 0) > 0
            if (!hasData) {
              for (let i = 1; i <= 13; i++) {
                if ((Number(yearData[`tx_${i}`]) || 0) > 0) { hasData = true; break }
              }
            }
            if (hasData) {
              if (yearData.year < dataMinYear) dataMinYear = yearData.year
              if (yearData.year > dataMaxYear) dataMaxYear = yearData.year
            }
          })
        })

        if (dataMinYear !== Infinity && dataMaxYear !== -Infinity) {
          setActualDataRange({ minYear: dataMinYear, maxYear: dataMaxYear })
          // Set default selected years to the actual data range
          if (selectedYears.length === 0) {
            setSelectedYears([dataMinYear, dataMaxYear])
          }
        }
        // Note: visibleSectors initialization is handled by the aggregationLevel useEffect
        // to ensure codes match the current aggregation level (group/category/sector)
      } catch (err) {
        console.error('[SectorDisbursementOverTime] Error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // Refetch when the selected calendar/custom year changes so the server can
    // re-bucket by fiscal year; still avoid re-fetching on date-range tweaks.
  }, [refreshKey, organizationId, calendarType])

  // List of every numeric metric key on a YearData record. The category/group
  // aggregations need to roll up every metric so the Bar/Area views can read
  // any one of them downstream.
  const METRIC_KEYS_ON_YEAR: string[] = useMemo(() => {
    const keys = ['planned', 'actual', 'budgets']
    for (let i = 1; i <= 13; i++) keys.push(`tx_${i}`)
    return keys
  }, [])

  const addMetrics = (target: Record<string, number>, source: YearData) => {
    for (const k of METRIC_KEYS_ON_YEAR) {
      target[k] = (target[k] || 0) + (Number(source[k]) || 0)
    }
  }
  const emptyMetrics = (): Record<string, number> => {
    const o: Record<string, number> = {}
    for (const k of METRIC_KEYS_ON_YEAR) o[k] = 0
    return o
  }

  // Aggregate data based on aggregation level (group, category, or sector).
  // Each rolled-up year keeps every metric so the rest of the chart can read
  // any combination of them.
  const aggregatedData = useMemo(() => {
    if (aggregationLevel === 'sector') {
      return data.map(sector => ({
        code: sector.sectorCode,
        name: sector.sectorName,
        groupCode: sector.groupCode,
        groupName: sector.groupName,
        categoryCode: sector.categoryCode,
        categoryName: sector.categoryName,
        years: sector.years as Array<YearData>,
      }))
    } else if (aggregationLevel === 'category') {
      const categoryMap = new Map<string, {
        code: string
        name: string
        groupCode: string
        groupName: string
        categoryCode: string
        categoryName: string
        yearsMap: Map<number, Record<string, number>>
      }>()

      data.forEach(sector => {
        const key = sector.categoryCode || '998'
        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            code: sector.categoryCode || '998',
            name: sector.categoryName || 'Unallocated',
            groupCode: sector.groupCode || '998',
            groupName: sector.groupName || 'Other',
            categoryCode: sector.categoryCode || '998',
            categoryName: sector.categoryName || 'Unallocated',
            yearsMap: new Map(),
          })
        }
        const cat = categoryMap.get(key)!
        sector.years.forEach(y => {
          const existing = cat.yearsMap.get(y.year) || emptyMetrics()
          addMetrics(existing, y)
          cat.yearsMap.set(y.year, existing)
        })
      })

      return Array.from(categoryMap.values()).map(cat => ({
        code: cat.code,
        name: cat.name,
        groupCode: cat.groupCode,
        groupName: cat.groupName,
        categoryCode: cat.categoryCode,
        categoryName: cat.categoryName,
        years: Array.from(cat.yearsMap.entries())
          .map(([year, metrics]) => ({ year, ...metrics } as YearData))
          .sort((a, b) => a.year - b.year),
      }))
    } else {
      const groupMap = new Map<string, {
        code: string
        name: string
        groupCode: string
        groupName: string
        categoryCode: string
        categoryName: string
        yearsMap: Map<number, Record<string, number>>
      }>()

      data.forEach(sector => {
        const key = sector.groupCode || '998'
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            code: sector.groupCode || '998',
            name: sector.groupName || 'Other',
            groupCode: sector.groupCode || '998',
            groupName: sector.groupName || 'Other',
            categoryCode: sector.groupCode || '998',
            categoryName: sector.groupName || 'Other',
            yearsMap: new Map(),
          })
        }
        const grp = groupMap.get(key)!
        sector.years.forEach(y => {
          const existing = grp.yearsMap.get(y.year) || emptyMetrics()
          addMetrics(existing, y)
          grp.yearsMap.set(y.year, existing)
        })
      })

      return Array.from(groupMap.values()).map(grp => ({
        code: grp.code,
        name: grp.name,
        groupCode: grp.groupCode,
        groupName: grp.groupName,
        categoryCode: grp.categoryCode,
        categoryName: grp.categoryName,
        years: Array.from(grp.yearsMap.entries())
          .map(([year, metrics]) => ({ year, ...metrics } as YearData))
          .sort((a, b) => a.year - b.year),
      }))
    }
  }, [data, aggregationLevel, METRIC_KEYS_ON_YEAR])

  // Build color map by ranking *every* item (not just visible) by its total
  // across the selected metrics, then assigning `getSectorColor(rank)`. This
  // matches the Aid Distribution chart's palette (`@/lib/chart-colors`) so the
  // same sector tends to land on the same colour across both cards.
  const colorMap = useMemo(() => {
    const map = new Map<string, string>()
    const ranked = aggregatedData
      .map(item => ({
        code: item.code,
        total: item.years.reduce((sum, y) => sum + sumSelectedMetrics(y, selectedMetrics), 0),
      }))
      .sort((a, b) => b.total - a.total)
    ranked.forEach((entry, i) => {
      map.set(entry.code, getSectorColor(i))
    })
    return map
  }, [aggregatedData, selectedMetrics])

  // Reset visible sectors when aggregation level changes (start with none selected)
  useEffect(() => {
    if (aggregatedData.length > 0) {
      // Start fresh when switching levels - user must intentionally select what to compare
      setVisibleSectors(new Set())
      setFilterSearch('')
    }
  }, [aggregationLevel])

  // Filter items based on search text
  const filteredItems = useMemo(() => {
    if (!filterSearch.trim()) return aggregatedData
    const search = filterSearch.toLowerCase()
    return aggregatedData.filter(item =>
      item.code.toLowerCase().includes(search) ||
      item.name.toLowerCase().includes(search)
    )
  }, [aggregatedData, filterSearch])

  // Transform data for time series chart (uses aggregatedData)
  const timeSeriesData = useMemo(() => {
    if (aggregatedData.length === 0) return []

    // Use selected years to determine the display range (not just data range)
    let minYear: number
    let maxYear: number

    if (selectedYears.length >= 2) {
      // Use the selected year range
      minYear = Math.min(...selectedYears)
      maxYear = Math.max(...selectedYears)
    } else if (selectedYears.length === 1) {
      minYear = selectedYears[0]
      maxYear = selectedYears[0]
    } else {
      // Fallback: derive from data if no years selected
      minYear = Infinity
      maxYear = -Infinity
      aggregatedData.forEach(item => {
        item.years.forEach(yearData => {
          if (yearData.year < minYear) minYear = yearData.year
          if (yearData.year > maxYear) maxYear = yearData.year
        })
      })
    }

    if (minYear === Infinity || maxYear === -Infinity) return []

    // Create sequential years array for the full selected range
    const years: number[] = []
    for (let y = minYear; y <= maxYear; y++) {
      years.push(y)
    }

    // Get the custom year for label formatting
    const customYear = customYears.find(cy => cy.id === calendarType)

    // Create data points for each year. For non-bar views the chart reads
    // `dataPoint[<sectorCode>]` (sum of selected metrics). For bar view it
    // reads `dataPoint[<sectorCode>__<metric>]` so each metric becomes its
    // own stacked segment within that sector's bar.
    return years.map(year => {
      const yearLabel = customYear ? getCustomYearLabel(customYear, year) : year.toString()

      const dataPoint: Record<string, any> = {
        year,
        calendarYear: yearLabel,
      }

      aggregatedData.forEach(item => {
        const yearData = item.years.find(y => y.year === year)
        dataPoint[item.code] = sumSelectedMetrics(yearData, selectedMetrics)
        selectedMetrics.forEach(m => {
          dataPoint[`${item.code}__${m}`] = Number(yearData?.[m] ?? 0) || 0
        })
      })

      return dataPoint
    })
  }, [aggregatedData, selectedMetrics, customYears, calendarType, selectedYears])

  // Initialize visible sectors when data first loads - select Top 5 by default
  useEffect(() => {
    if (aggregatedData.length > 0 && !hasInitialized) {
      const itemTotals = aggregatedData.map(item => ({
        code: item.code,
        total: item.years.reduce((sum, y) => sum + sumSelectedMetrics(y, selectedMetrics), 0),
      }))
      itemTotals.sort((a, b) => b.total - a.total)
      const topCodes = itemTotals.slice(0, 5).map(item => item.code)
      setVisibleSectors(new Set(topCodes))
      setHasInitialized(true)
    }
  }, [aggregatedData.length, hasInitialized, selectedMetrics])


  // Custom tooltip with hierarchical grouping. Sector-level entries surface
  // their sum across the selected metrics; when more than one metric is
  // selected we add a small per-metric breakdown line under each sector row.
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null

    // For bar view the payload contains one entry per (sector × metric) — we
    // collapse them back to per-sector rows so the tooltip is readable.
    const sectorTotals = new Map<string, number>()
    const sectorMetricBreakdown = new Map<string, Map<Metric, number>>()
    payload.forEach((entry: any) => {
      const key = String(entry.dataKey || '')
      if (!key) return
      const [sectorCode, metric] = key.includes('__')
        ? key.split('__') as [string, Metric]
        : [key, null] as [string, Metric | null]
      const value = Number(entry.value) || 0
      if (!value) return
      sectorTotals.set(sectorCode, (sectorTotals.get(sectorCode) || 0) + value)
      if (metric) {
        if (!sectorMetricBreakdown.has(sectorCode)) {
          sectorMetricBreakdown.set(sectorCode, new Map())
        }
        sectorMetricBreakdown.get(sectorCode)!.set(metric, value)
      }
    })

    if (sectorTotals.size === 0) return null

    const total = Array.from(sectorTotals.values()).reduce((sum, v) => sum + v, 0)

    const tooltipGroups = new Map<string, {
      groupCode: string
      groupName: string
      groupTotal: number
      categories: Map<string, {
        categoryCode: string
        categoryName: string
        categoryTotal: number
        items: { code: string; name: string; value: number; color: string }[]
      }>
    }>()

    sectorTotals.forEach((value, sectorCode) => {
      const item = aggregatedData.find(d => d.code === sectorCode)
      if (!item) return

      const groupCode = item.groupCode || '998'
      const groupName = item.groupName || 'Other / Uncategorized'
      const categoryCode = item.categoryCode || '998'
      const categoryName = item.categoryName || 'Unallocated / Unspecified'

      if (!tooltipGroups.has(groupCode)) {
        tooltipGroups.set(groupCode, {
          groupCode, groupName, groupTotal: 0, categories: new Map()
        })
      }
      const group = tooltipGroups.get(groupCode)!
      group.groupTotal += value

      if (!group.categories.has(categoryCode)) {
        group.categories.set(categoryCode, { categoryCode, categoryName, categoryTotal: 0, items: [] })
      }
      const category = group.categories.get(categoryCode)!
      category.categoryTotal += value
      category.items.push({
        code: item.code,
        name: item.name,
        value,
        color: colorMap.get(item.code) || '#6B7280',
      })
    })

    const sortedGroups = Array.from(tooltipGroups.values())
      .sort((a, b) => b.groupTotal - a.groupTotal)

    const calendarName = customYears.find(cy => cy.id === calendarType)?.name
    const metricsBadge = selectedMetrics.length === 0
      ? 'No metric selected'
      : selectedMetrics.length === 1
        ? METRIC_LABEL[selectedMetrics[0]]
        : `${selectedMetrics.length} metrics`

    const subtitle = (
      <div className="space-y-0.5">
        {calendarName && <div>{calendarName}</div>}
        <div className="text-muted-foreground">{metricsBadge}</div>
        <div>
          Total: <span className="font-bold text-foreground">{formatTooltipCurrency(total, isExpanded)}</span>
        </div>
      </div>
    )

    const rows: ChartTooltipRow[] = []

    const pushMetricBreakdownFor = (sectorCode: string) => {
      if (selectedMetrics.length <= 1) return
      const breakdown = sectorMetricBreakdown.get(sectorCode)
      if (!breakdown) return
      selectedMetrics.forEach(m => {
        const v = breakdown.get(m) || 0
        if (!v) return
        rows.push({
          label: <span className="ml-3 text-muted-foreground text-helper">{METRIC_LABEL[m]}</span>,
          value: formatTooltipCurrency(v, isExpanded),
        })
      })
    }

    if (aggregationLevel === 'group') {
      Array.from(sectorTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([sectorCode, value]) => {
          const item = aggregatedData.find(d => d.code === sectorCode)
          rows.push({
            label: item?.name ?? sectorCode,
            value: formatTooltipCurrency(value, isExpanded),
            color: colorMap.get(sectorCode),
            code: sectorCode,
          })
          pushMetricBreakdownFor(sectorCode)
        })
    } else if (aggregationLevel === 'category') {
      sortedGroups.forEach((group) => {
        rows.push({
          label: `${group.groupCode} · ${group.groupName}: ${formatTooltipCurrency(group.groupTotal, isExpanded)}`,
          value: '',
          isGroupHeader: true,
        })
        Array.from(group.categories.values())
          .sort((a, b) => b.categoryTotal - a.categoryTotal)
          .forEach((cat) => {
            rows.push({
              label: cat.categoryName,
              value: formatTooltipCurrency(cat.categoryTotal, isExpanded),
              color: colorMap.get(cat.categoryCode),
              code: cat.categoryCode,
            })
            pushMetricBreakdownFor(cat.categoryCode)
          })
      })
    } else {
      sortedGroups.forEach((group) => {
        rows.push({
          label: `${group.groupCode} · ${group.groupName}: ${formatTooltipCurrency(group.groupTotal, isExpanded)}`,
          value: '',
          isGroupHeader: true,
        })
        Array.from(group.categories.values())
          .sort((a, b) => b.categoryTotal - a.categoryTotal)
          .forEach((category) => {
            rows.push({
              label: `${category.categoryCode} · ${category.categoryName}`,
              value: formatTooltipCurrency(category.categoryTotal, isExpanded),
              color: colorMap.get(category.categoryCode),
            })
            category.items
              .sort((a, b) => b.value - a.value)
              .forEach((item) => {
                rows.push({
                  label: <span className="ml-3 text-muted-foreground">{item.name}</span>,
                  value: formatTooltipCurrency(item.value, isExpanded),
                  color: item.color,
                })
                pushMetricBreakdownFor(item.code)
              })
          })
      })
    }

    return (
      <ChartTooltipCard
        title={label}
        subtitle={subtitle}
        rows={rows}
        minWidth={300}
        maxWidth={420}
        scrollable
        maxBodyHeight={350}
      />
    )
  }


  // Get visible items for rendering - simple check against visibleSectors set
  const visibleItemData = useMemo(() => {
    return aggregatedData.filter(item => visibleSectors.has(item.code))
  }, [aggregatedData, visibleSectors])

  const noMetricSelected = selectedMetrics.length === 0

  // Compact mode check FIRST - before any Card returns
  if (compact) {
    // Show loading until: data loaded, custom years loaded, AND defaults initialized
    if ((loading && data.length === 0) || customYearsLoading || !hasInitialized) {
      return <ChartLoadingPlaceholder />
    }
    if (error) {
      return <div className="h-full w-full flex items-center justify-center text-destructive"><p className="text-body">{error}</p></div>
    }
    if (timeSeriesData.length === 0) {
      return (
        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      )
    }
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeSeriesData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis
              dataKey="calendarYear"
              fontSize={10}
              tick={{ fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tickFormatter={formatAxisCurrency}
              fontSize={10}
              tick={{ fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ pointerEvents: 'auto' }} />
            {visibleItemData.map(item => (
              <Area
                key={item.code}
                type="monotone"
                dataKey={item.code}
                name={item.name}
                stackId="1"
                stroke={colorMap.get(item.code)}
                fill={colorMap.get(item.code)}
                fillOpacity={0.7}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading && data.length === 0) {
    return (
      <div className="h-80">
        <ChartLoadingPlaceholder />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Error loading data: {error}</p>
      </div>
    )
  }

  const renderEmptyMetricState = () => (
    <div className="h-80 flex flex-col items-center justify-center text-muted-foreground gap-2">
      <SlidersHorizontal className="h-8 w-8 text-slate-300" />
      <p>Select at least one metric</p>
      <p className="text-helper text-muted-foreground">
        Choose Total Budgets, Planned Disbursements, or any IATI transaction type from the metrics dropdown
      </p>
    </div>
  )

  const renderEmptySelectionState = () => (
    <div className="h-80 flex flex-col items-center justify-center text-muted-foreground gap-2">
      <SlidersHorizontal className="h-8 w-8 text-slate-300" />
      <p>No {aggregationLevel === 'group' ? 'sector categories' : aggregationLevel === 'category' ? 'sectors' : 'sub-sectors'} selected</p>
      <p className="text-helper text-muted-foreground">Use the Filter button to select items to compare</p>
    </div>
  )

  const renderNoDataState = () => (
    <div className="h-80 flex items-center justify-center text-muted-foreground">
      No data available
    </div>
  )

  return (
    <div className="space-y-3">
        {/* Calendar + year selector on its own row at the top */}
        <div className="flex items-start gap-2 mb-4">
            {customYears.length > 0 && (
              <>
                {/* Calendar Type Selector */}
                <div className="flex gap-1 border rounded-lg p-1 bg-white">
                  <DropdownMenu>
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

                {/* Year Range Selector with Date Range below */}
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1 border rounded-lg p-1 bg-white">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1"
                          title={localDateRange?.from && localDateRange?.to &&
                            !isNaN(localDateRange.from.getTime()) && !isNaN(localDateRange.to.getTime())
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
                              title="Select all available years"
                            >
                              All
                            </button>
                            <button
                              onClick={selectDataRange}
                              className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                              title={actualDataRange ? `Select only years with data: ${getYearLabel(actualDataRange.minYear)} - ${getYearLabel(actualDataRange.maxYear)}` : 'Select years with data'}
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
                </div>
              </>
            )}
        </div>
      {/* Controls row — filters + toggles left, CSV right. */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {/* Financial-metric multi-select — same dropdown as the External
                Development Partners Financial Overview chart. */}
            <MetricMultiSelect
              selected={selectedMetrics}
              onChange={handleMetricsChange}
              triggerClassName="min-w-[240px] h-9 justify-between"
            />

            {/* Aggregation Level Toggle */}
            <ChartViewToggle
              ariaLabel="Aggregation level"
              variant="text"
              value={aggregationLevel}
              onValueChange={setAggregationLevel}
              options={[
                { value: 'group', label: 'Sector Category' },
                { value: 'category', label: 'Sector' },
                { value: 'sector', label: 'Sub-sector' },
              ]}
            />

            {/* Sector Filter */}
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Sector Filter
                    {visibleItemData.length < aggregatedData.length && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted text-foreground rounded-full">
                        {visibleItemData.length}
                      </span>
                    )}
                    <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="p-3 w-[340px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-helper font-medium text-foreground">
                      Filter {aggregationLevel === 'group' ? 'Sector Categories' : aggregationLevel === 'category' ? 'Sectors' : 'Sub-sectors'}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => selectAllItems()}
                        className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                      >
                        All
                      </button>
                      <button
                        onClick={() => clearAllItems()}
                        className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Search box */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by code or name..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 text-helper border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Top N shortcuts */}
                  <div className="flex gap-1 mb-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground self-center mr-1">Quick:</span>
                    {[3, 5, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => selectTopN(n)}
                        className="text-[10px] px-2 py-0.5 bg-muted hover:bg-muted rounded text-muted-foreground"
                      >
                        Top {n}
                      </button>
                    ))}
                  </div>

                  {/* Flat list of items at current level */}
                  <div className="max-h-[320px] overflow-y-auto space-y-0.5 border-t pt-2">
                    {filteredItems.length === 0 ? (
                      <div className="text-center text-helper text-muted-foreground py-4">
                        No matching items found
                      </div>
                    ) : (
                      filteredItems.map((item) => {
                        const isSelected = visibleSectors.has(item.code)

                        return (
                          <button
                            key={item.code}
                            onClick={() => toggleItemVisibility(item.code)}
                            className="flex items-start gap-2 w-full py-1.5 px-1 text-left rounded hover:bg-muted"
                          >
                            <div className={`
                              w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5
                              ${isSelected ? 'bg-primary border-primary' : 'border-input'}
                            `}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="font-mono text-xs px-1.5 py-0.5 rounded flex-shrink-0 bg-muted text-muted-foreground">
                              {item.code}
                            </span>
                            <span className="text-body text-foreground leading-tight">
                              {item.name}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t text-center">
                    {visibleItemData.length} of {aggregatedData.length} {aggregationLevel === 'group' ? 'sector categories' : aggregationLevel === 'category' ? 'sectors' : 'sub-sectors'} selected
                  </p>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            </div>
            {/* Button groups + CSV, right-aligned. */}
            <div className="flex items-center gap-2 flex-shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", viewMode === 'area' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setViewMode('area')}
                title="Area"
                aria-label="Area"
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", viewMode === 'line' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setViewMode('line')}
                title="Line"
                aria-label="Line"
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", viewMode === 'bar' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setViewMode('bar')}
                title="Bar"
                aria-label="Bar"
              >
                <BarChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", viewMode === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setViewMode('table')}
                title="Table View"
                aria-label="Table View"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
          {isExpanded && (
            <CsvExportButton rows={timeSeriesData} title="Sector Disbursements Over Time" />
          )}
          </div>
        </div>

        <div className="bg-white">
          {/* Charts */}
          {noMetricSelected ? (
            renderEmptyMetricState()
          ) : viewMode === 'area' ? (
            visibleItemData.length === 0 ? (
              renderEmptySelectionState()
            ) : timeSeriesData.length === 0 ? (
              renderNoDataState()
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 50, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
                  <XAxis
                    dataKey="calendarYear"
                    fontSize={11}
                    tick={{ fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tickFormatter={formatAxisCurrency}
                    fontSize={12}
                    tick={{ fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ pointerEvents: 'auto' }} />
                  {visibleItemData.map(item => (
                    <Area
                      key={item.code}
                      type="monotone"
                      dataKey={item.code}
                      name={item.name}
                      stackId="1"
                      stroke={colorMap.get(item.code)}
                      fill={colorMap.get(item.code)}
                      fillOpacity={0.7}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )
          ) : viewMode === 'line' ? (
            visibleItemData.length === 0 ? (
              renderEmptySelectionState()
            ) : timeSeriesData.length === 0 ? (
              renderNoDataState()
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 50, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
                  <XAxis
                    dataKey="calendarYear"
                    fontSize={11}
                    tick={{ fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tickFormatter={formatAxisCurrency}
                    fontSize={12}
                    tick={{ fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ pointerEvents: 'auto' }} />
                  {visibleItemData.map(item => (
                    <Line
                      key={item.code}
                      type="monotone"
                      dataKey={item.code}
                      name={item.name}
                      stroke={colorMap.get(item.code)}
                      strokeWidth={2}
                      dot={{ r: 3, fill: colorMap.get(item.code) }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )
          ) : viewMode === 'bar' ? (
            visibleItemData.length === 0 ? (
              renderEmptySelectionState()
            ) : timeSeriesData.length === 0 ? (
              renderNoDataState()
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 50, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
                  <XAxis
                    dataKey="calendarYear"
                    fontSize={11}
                    tick={{ fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tickFormatter={formatAxisCurrency}
                    fontSize={12}
                    tick={{ fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ pointerEvents: 'auto' }} />
                  {/* One bar per (sector × metric). recharts groups bars that
                      share an x-tick and stacks those that share a stackId, so
                      `stackId={sectorCode}` produces grouped bars per sector
                      per year, each stacked by metric. Lightened tints of the
                      sector's base color separate metrics within the stack. */}
                  {visibleItemData.map(item => {
                    const base = colorMap.get(item.code) || '#6B7280'
                    return selectedMetrics.map((metric, mi) => {
                      const lighten = selectedMetrics.length > 1
                        ? (mi / Math.max(selectedMetrics.length - 1, 1)) * 0.55
                        : 0
                      return (
                        <Bar
                          key={`${item.code}__${metric}`}
                          dataKey={`${item.code}__${metric}`}
                          name={`${item.name} · ${METRIC_LABEL[metric]}`}
                          stackId={item.code}
                          fill={lightenHex(base, lighten)}
                          stroke={base}
                          strokeWidth={mi === selectedMetrics.length - 1 ? 0.5 : 0}
                        />
                      )
                    })
                  })}
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            /* Table View — shared ChartDataTable. Period (calendarYear) label
               column + one money column per visible sector (keyed by
               item.code, colored from colorMap), per-row Total column and
               footer totals provided by the shared component. */
            visibleItemData.length === 0 ? (
              renderEmptySelectionState()
            ) : (
            <ChartDataTable
              rows={timeSeriesData}
              columns={[
                { key: 'calendarYear', label: 'Year', numeric: false },
                ...visibleItemData.map(item => ({
                  key: item.code,
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <CodeChip>{item.code}</CodeChip>
                      {item.name}
                    </span>
                  ),
                  numeric: true as const,
                  currency: 'USD',
                  color: colorMap.get(item.code),
                })),
              ]}
              currency="USD"
              totalsColumn
              maxHeight={500}
            />
            )
          )}
        </div>

        {/* Explanatory text */}

        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart shows how sector financial flows have changed over time. Pick any combination of the 15 IATI-aligned metrics (Total Budgets, Planned Disbursements, and the 13 transaction types) and view the result at Sector Category, Sector, or Sub-sector level.
          Use the stacked area or bar chart to see cumulative totals across sectors, switch to line view to compare individual sector trends, or open the table for the underlying numbers.
        </p>
    </div>
  )
}

"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
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
import { CustomYear, getCustomYearRange, getCustomYearLabel } from '@/types/custom-years'
import { format } from 'date-fns'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'
import { Download, TrendingUp, LineChart as LineChartIcon, Table as TableIcon, CalendarIcon, Filter, Check, Search } from 'lucide-react'
import { LoadingText } from '@/components/ui/loading-text'
import html2canvas from 'html2canvas'

// Color palette based on brand colors - distinct colors for data visualization
// Brand colors: Primary Scarlet, Blue Slate, Cool Steel, Deep Teal, Soft Ochre, Pale Slate
const SECTOR_COLORS = [
  '#dc2625', // Primary Scarlet
  '#4c5568', // Blue Slate
  '#5f7f7a', // Deep Teal
  '#c9a24d', // Soft Ochre
  '#7b95a7', // Cool Steel
  '#b91f1f', // Darker Scarlet
  '#3a4050', // Darker Blue Slate
  '#4a635f', // Darker Teal
  '#9a7a3a', // Darker Ochre
  '#5f7a8c', // Darker Cool Steel
  '#e85454', // Lighter Scarlet
  '#6b7789', // Lighter Blue Slate
  '#7a9994', // Lighter Teal
  '#d4b76a', // Lighter Ochre
  '#9bb0bf', // Lighter Cool Steel
  '#8c4642', // Muted Scarlet
  '#5d6b7a', // Medium Slate
  '#6a8494', // Steel Blue
  '#a85a52', // Warm Accent
  '#8a9199', // Neutral Accent
]

// Generate list of available years (from 2010 to current year + 10 to cover all possible data)
const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i
)

interface YearData {
  year: number
  planned: number
  actual: number
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

type DataMode = 'planned' | 'actual'
type ViewMode = 'area' | 'line' | 'table'
type AggregationLevel = 'group' | 'category' | 'sector'

export function SectorDisbursementOverTime({
  dateRange: initialDateRange,
  refreshKey = 0,
  compact = false,
  organizationId
}: SectorDisbursementOverTimeProps) {
  const [dataMode, setDataMode] = useState<DataMode>('actual')
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
  const chartRef = useRef<HTMLDivElement>(null)

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
        const response = await fetch('/api/custom-years')
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

  // Select top N items by total value
  const selectTopN = (n: number) => {
    const itemTotals = aggregatedData.map(item => {
      const total = item.years.reduce((sum, y) => sum + (dataMode === 'planned' ? y.planned : y.actual), 0)
      return { code: item.code, total }
    })
    itemTotals.sort((a, b) => b.total - a.total)
    const topCodes = itemTotals.slice(0, n).map(item => item.code)
    setVisibleSectors(new Set(topCodes))
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

        const response = await fetch(`/api/analytics/disbursements-by-sector?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }

        const result = await response.json()
        const sectors = result.sectors || []
        setData(sectors)

        // Calculate actual data range from the fetched sector data
        // This ensures "Data" button shows only years with actual disbursement data
        let dataMinYear = Infinity
        let dataMaxYear = -Infinity
        sectors.forEach((sector: SectorData) => {
          sector.years.forEach((yearData: YearData) => {
            // Only consider years with actual data (planned or actual > 0)
            if (yearData.planned > 0 || yearData.actual > 0) {
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
  }, [refreshKey, organizationId]) // Only refetch on refreshKey or organizationId change, not on date range change

  // Aggregate data based on aggregation level (group, category, or sector)
  const aggregatedData = useMemo(() => {
    if (aggregationLevel === 'sector') {
      // Return original sector-level data
      return data.map(sector => ({
        code: sector.sectorCode,
        name: sector.sectorName,
        groupCode: sector.groupCode,
        groupName: sector.groupName,
        categoryCode: sector.categoryCode,
        categoryName: sector.categoryName,
        years: sector.years
      }))
    } else if (aggregationLevel === 'category') {
      // Aggregate by category
      const categoryMap = new Map<string, {
        code: string
        name: string
        groupCode: string
        groupName: string
        categoryCode: string
        categoryName: string
        yearsMap: Map<number, { planned: number; actual: number }>
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
            yearsMap: new Map()
          })
        }
        const cat = categoryMap.get(key)!
        sector.years.forEach(y => {
          const existing = cat.yearsMap.get(y.year) || { planned: 0, actual: 0 }
          existing.planned += y.planned
          existing.actual += y.actual
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
        years: Array.from(cat.yearsMap.entries()).map(([year, data]) => ({
          year,
          planned: data.planned,
          actual: data.actual
        })).sort((a, b) => a.year - b.year)
      }))
    } else {
      // Aggregate by group
      const groupMap = new Map<string, {
        code: string
        name: string
        groupCode: string
        groupName: string
        categoryCode: string
        categoryName: string
        yearsMap: Map<number, { planned: number; actual: number }>
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
            yearsMap: new Map()
          })
        }
        const grp = groupMap.get(key)!
        sector.years.forEach(y => {
          const existing = grp.yearsMap.get(y.year) || { planned: 0, actual: 0 }
          existing.planned += y.planned
          existing.actual += y.actual
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
        years: Array.from(grp.yearsMap.entries()).map(([year, data]) => ({
          year,
          planned: data.planned,
          actual: data.actual
        })).sort((a, b) => a.year - b.year)
      }))
    }
  }, [data, aggregationLevel])

  // Build color map for VISIBLE items only (so colors are always distinct)
  const colorMap = useMemo(() => {
    const map = new Map<string, string>()
    // Only assign colors to visible items, ensuring they get distinct colors
    const visibleItems = aggregatedData.filter(item => visibleSectors.has(item.code))
    visibleItems.forEach((item, idx) => {
      map.set(item.code, SECTOR_COLORS[idx % SECTOR_COLORS.length])
    })
    return map
  }, [aggregatedData, visibleSectors])

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

    // Create data points for each year (with calendar-appropriate labels)
    return years.map(year => {
      // Use getCustomYearLabel for proper formatting based on calendar type
      const yearLabel = customYear ? getCustomYearLabel(customYear, year) : year.toString()

      const dataPoint: Record<string, any> = {
        year,
        calendarYear: yearLabel
      }

      aggregatedData.forEach(item => {
        const yearData = item.years.find(y => y.year === year)
        const value = dataMode === 'planned'
          ? (yearData?.planned || 0)
          : (yearData?.actual || 0)
        dataPoint[item.code] = value
      })

      return dataPoint
    })
  }, [aggregatedData, dataMode, customYears, calendarType, selectedYears])

  // Initialize visible sectors when data first loads - select Top 5 by default
  useEffect(() => {
    if (aggregatedData.length > 0 && !hasInitialized) {
      // Select Top 5 by value on initial load
      const itemTotals = aggregatedData.map(item => {
        const total = item.years.reduce((sum, y) => sum + y.actual, 0)
        return { code: item.code, total }
      })
      itemTotals.sort((a, b) => b.total - a.total)
      const topCodes = itemTotals.slice(0, 5).map(item => item.code)
      setVisibleSectors(new Set(topCodes))
      setHasInitialized(true)
    }
  }, [aggregatedData.length, hasInitialized])


  // Format currency for Y-axis (e.g., $27m)
  const formatYAxisCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(0)}b`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(0)}m`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`
    }
    return `$${value.toFixed(0)}`
  }

  const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Format currency compact (e.g., $5.2m, $1.3b)
  const formatCurrencyCompact = (value: number) => {
    const absValue = Math.abs(value)
    const sign = value < 0 ? '-' : ''
    
    if (absValue >= 1000000000) {
      return `${sign}$${(absValue / 1000000000).toFixed(1)}b`
    } else if (absValue >= 1000000) {
      return `${sign}$${(absValue / 1000000).toFixed(1)}m`
    } else if (absValue >= 1000) {
      return `${sign}$${(absValue / 1000).toFixed(1)}k`
    } else {
      return `${sign}$${absValue.toFixed(0)}`
    }
  }

  // Custom tooltip with hierarchical grouping
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null

    // Filter entries with values > 0
    const filteredPayload = payload.filter((entry: any) => entry.value && entry.value > 0)
    if (filteredPayload.length === 0) return null

    const total = filteredPayload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0)

    // Build hierarchical structure for tooltip based on aggregation level
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

    filteredPayload.forEach((entry: any) => {
      const item = aggregatedData.find(d => d.code === entry.dataKey)
      if (!item) return

      const groupCode = item.groupCode || '998'
      const groupName = item.groupName || 'Other / Uncategorized'
      const categoryCode = item.categoryCode || '998'
      const categoryName = item.categoryName || 'Unallocated / Unspecified'

      if (!tooltipGroups.has(groupCode)) {
        tooltipGroups.set(groupCode, {
          groupCode,
          groupName,
          groupTotal: 0,
          categories: new Map()
        })
      }

      const group = tooltipGroups.get(groupCode)!
      group.groupTotal += entry.value || 0

      if (!group.categories.has(categoryCode)) {
        group.categories.set(categoryCode, {
          categoryCode,
          categoryName,
          categoryTotal: 0,
          items: []
        })
      }

      const category = group.categories.get(categoryCode)!
      category.categoryTotal += entry.value || 0
      category.items.push({
        code: item.code,
        name: item.name,
        value: entry.value || 0,
        color: entry.color
      })
    })

    // Sort groups
    const sortedGroups = Array.from(tooltipGroups.values())
      .sort((a, b) => b.groupTotal - a.groupTotal)

    // Check if content will likely overflow (rough estimate)
    const hasMoreContent = filteredPayload.length > 5

    return (
      <div className="bg-white border rounded-lg shadow-lg min-w-[300px] max-w-[420px]">
        {/* Header - Fixed */}
        <div className="p-3 pb-2 border-b bg-white rounded-t-lg">
          <span className="font-semibold text-sm">{label}</span>
          <div className="text-xs text-gray-500 mt-1">
            Total: <span className="font-bold text-gray-900">{formatCurrencyCompact(total)}</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          className="p-3 pt-2 max-h-[350px] overflow-y-auto"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#94a3b8 #e2e8f0',
            overscrollBehavior: 'contain'
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="space-y-2">
          {aggregationLevel === 'group' ? (
            // Simple list for group level
            filteredPayload
              .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
              .map((entry: any, idx: number) => {
                const item = aggregatedData.find(d => d.code === entry.dataKey)
                return (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                        {entry.dataKey}
                      </span>
                      <span className="text-sm text-slate-700 truncate max-w-[180px]" title={item?.name}>
                        {item?.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 ml-2">
                      {formatCurrencyCompact(entry.value)}
                    </span>
                  </div>
                )
              })
          ) : aggregationLevel === 'category' ? (
            // Grouped by sector group for category level
            sortedGroups.map(group => (
              <div key={group.groupCode} className="border-b last:border-b-0 pb-2 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                      {group.groupCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{group.groupName}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{formatCurrencyCompact(group.groupTotal)}</span>
                </div>
                <div className="ml-3 space-y-1">
                  {Array.from(group.categories.values())
                    .sort((a, b) => b.categoryTotal - a.categoryTotal)
                    .map(cat => (
                      <div key={cat.categoryCode} className="flex items-center justify-between py-0.5">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: colorMap.get(cat.categoryCode) }}
                          />
                          <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-600">
                            {cat.categoryCode}
                          </span>
                          <span className="text-xs text-slate-600 truncate max-w-[150px]" title={cat.categoryName}>
                            {cat.categoryName}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-slate-700 ml-2">
                          {formatCurrencyCompact(cat.categoryTotal)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))
          ) : (
            // Full hierarchy for sector level
            sortedGroups.map(group => (
              <div key={group.groupCode} className="border-b last:border-b-0 pb-2 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                      {group.groupCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{group.groupName}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{formatCurrencyCompact(group.groupTotal)}</span>
                </div>
                <div className="ml-3 space-y-1">
                  {Array.from(group.categories.values())
                    .sort((a, b) => b.categoryTotal - a.categoryTotal)
                    .map(category => (
                      <div key={category.categoryCode}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-600">
                              {category.categoryCode}
                            </span>
                            <span className="text-xs text-slate-600">{category.categoryName}</span>
                          </div>
                          <span className="text-xs font-medium text-slate-700">{formatCurrencyCompact(category.categoryTotal)}</span>
                        </div>
                        <div className="ml-3 space-y-0.5">
                          {category.items
                            .sort((a, b) => b.value - a.value)
                            .map(item => (
                              <div key={item.code} className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <div
                                    className="w-2 h-2 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span className="text-xs text-gray-600 truncate max-w-[160px]" title={item.name}>
                                    {item.name}
                                  </span>
                                </div>
                                <span className="text-xs font-medium text-gray-700 ml-2">
                                  {formatCurrencyCompact(item.value)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
          </div>
        </div>
        
        {/* Scroll indicator */}
        {hasMoreContent && (
          <div className="px-3 py-1.5 border-t bg-slate-50 text-center rounded-b-lg">
            <span className="text-xs text-slate-500">↓ Scroll for more</span>
          </div>
        )}
      </div>
    )
  }

  const handleSaveChart = async () => {
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
        })
        const link = document.createElement('a')
        link.download = `sector-disbursement-over-time-${dataMode}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      } catch (error) {
        console.error('Error saving chart:', error)
      }
    }
  }

  // Get visible items for rendering - simple check against visibleSectors set
  const visibleItemData = useMemo(() => {
    return aggregatedData.filter(item => visibleSectors.has(item.code))
  }, [aggregatedData, visibleSectors])

  // Compact mode check FIRST - before any Card returns
  if (compact) {
    // Show loading until: data loaded, custom years loaded, AND defaults initialized
    if ((loading && data.length === 0) || customYearsLoading || !hasInitialized) {
      return <div className="h-full w-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
    }
    if (error) {
      return <div className="h-full w-full flex items-center justify-center text-red-500"><p className="text-sm">{error}</p></div>
    }
    if (timeSeriesData.length === 0) {
      return (
        <div className="h-full w-full flex items-center justify-center text-slate-500">
          No data available
        </div>
      )
    }
    return (
      <div ref={chartRef} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeSeriesData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="calendarYear"
              fontSize={10}
              tick={{ fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tickFormatter={formatYAxisCurrency}
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
      <div className="h-80 flex items-center justify-center">
        <LoadingText>Loading disbursement data...</LoadingText>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">Error loading data: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Controls Row - single line, scrollable if needed */}
        <div className="flex items-start gap-2 overflow-x-auto pb-1">
          {/* Calendar & Year Selectors */}
          <div className="flex items-start gap-2 flex-shrink-0">
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
                      {customYears.map(cy => (
                        <DropdownMenuItem
                          key={cy.id}
                          className={calendarType === cy.id ? 'bg-slate-100 font-medium' : ''}
                          onClick={() => setCalendarType(cy.id)}
                        >
                          {cy.name}
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
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
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
                          <span className="text-xs font-medium text-slate-700">Select Year Range</span>
                          <div className="flex gap-1">
                            <button
                              onClick={selectAllYears}
                              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
                              title="Select all available years"
                            >
                              All
                            </button>
                            <button
                              onClick={selectDataRange}
                              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
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
                                    ? 'bg-primary text-primary-foreground'
                                    : inRange
                                      ? 'bg-primary/20 text-primary'
                                      : 'text-slate-600 hover:bg-slate-100'
                                  }
                                `}
                                title="Click to select start, then click another to select end"
                              >
                                {getYearLabel(year)}
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">
                          Click start year, then click end year
                        </p>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* Date Range Indicator */}
                  {localDateRange?.from && localDateRange?.to &&
                   !isNaN(localDateRange.from.getTime()) && !isNaN(localDateRange.to.getTime()) && (
                    <span className="text-xs text-slate-500 text-center">
                      {format(localDateRange.from, 'MMM d, yyyy')} – {format(localDateRange.to, 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Controls - Right Side */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            {/* Data Mode Toggle */}
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <Button
                variant={dataMode === 'planned' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setDataMode('planned')}
              >
                Planned
              </Button>
              <Button
                variant={dataMode === 'actual' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setDataMode('actual')}
              >
                Actual
              </Button>
            </div>

            {/* Aggregation Level Toggle */}
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <Button
                variant={aggregationLevel === 'group' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setAggregationLevel('group')}
              >
                Sector Category
              </Button>
              <Button
                variant={aggregationLevel === 'category' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setAggregationLevel('category')}
              >
                Sector
              </Button>
              <Button
                variant={aggregationLevel === 'sector' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setAggregationLevel('sector')}
              >
                Sub-sector
              </Button>
            </div>

            {/* Sector Filter */}
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1"
                  >
                    <Filter className="h-4 w-4" />
                    Filter
                    {visibleItemData.length < aggregatedData.length && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
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
                    <span className="text-xs font-medium text-slate-700">
                      Filter {aggregationLevel === 'group' ? 'Sector Categories' : aggregationLevel === 'category' ? 'Sectors' : 'Sub-sectors'}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => selectAllItems()}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
                      >
                        All
                      </button>
                      <button
                        onClick={() => clearAllItems()}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Search box */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by code or name..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Top N shortcuts */}
                  <div className="flex gap-1 mb-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 self-center mr-1">Quick:</span>
                    {[3, 5, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => selectTopN(n)}
                        className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
                      >
                        Top {n}
                      </button>
                    ))}
                  </div>

                  {/* Flat list of items at current level */}
                  <div className="max-h-[320px] overflow-y-auto space-y-0.5 border-t pt-2">
                    {filteredItems.length === 0 ? (
                      <div className="text-center text-xs text-slate-400 py-4">
                        No matching items found
                      </div>
                    ) : (
                      filteredItems.map((item) => {
                        const isSelected = visibleSectors.has(item.code)

                        return (
                          <button
                            key={item.code}
                            onClick={() => toggleItemVisibility(item.code)}
                            className="flex items-start gap-2 w-full py-1.5 px-1 text-left rounded hover:bg-slate-50"
                          >
                            <div className={`
                              w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5
                              ${isSelected ? 'bg-primary border-primary' : 'border-slate-300'}
                            `}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="font-mono text-xs px-1.5 py-0.5 rounded flex-shrink-0 bg-slate-100 text-slate-600">
                              {item.code}
                            </span>
                            <span className="text-sm text-slate-700 leading-tight">
                              {item.name}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t text-center">
                    {visibleItemData.length} of {aggregatedData.length} {aggregationLevel === 'group' ? 'sector categories' : aggregationLevel === 'category' ? 'sectors' : 'sub-sectors'} selected
                  </p>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <Button
                variant={viewMode === 'area' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setViewMode('area')}
                title="Area"
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'line' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setViewMode('line')}
                title="Line"
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setViewMode('table')}
                title="Table"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Save Button */}
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={handleSaveChart}
                title="Save chart as image"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div ref={chartRef} className="bg-white">
          {/* Charts */}
          {viewMode === 'area' ? (
            visibleItemData.length === 0 ? (
              <div className="h-80 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Filter className="h-8 w-8 text-slate-300" />
                <p>No {aggregationLevel === 'group' ? 'sector categories' : aggregationLevel === 'category' ? 'sectors' : 'sub-sectors'} selected</p>
                <p className="text-xs text-slate-400">Use the Filter button to select items to compare</p>
              </div>
            ) : timeSeriesData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-slate-500">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 50, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="calendarYear"
                    fontSize={11}
                    tick={{ fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tickFormatter={formatYAxisCurrency}
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
              <div className="h-80 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Filter className="h-8 w-8 text-slate-300" />
                <p>No {aggregationLevel === 'group' ? 'sector categories' : aggregationLevel === 'category' ? 'sectors' : 'sub-sectors'} selected</p>
                <p className="text-xs text-slate-400">Use the Filter button to select items to compare</p>
              </div>
            ) : timeSeriesData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-slate-500">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 50, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="calendarYear"
                    fontSize={11}
                    tick={{ fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tickFormatter={formatYAxisCurrency}
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
          ) : (
            /* Table View */
            visibleItemData.length === 0 ? (
              <div className="h-80 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Filter className="h-8 w-8 text-slate-300" />
                <p>No {aggregationLevel === 'group' ? 'sector categories' : aggregationLevel === 'category' ? 'sectors' : 'sub-sectors'} selected</p>
                <p className="text-xs text-slate-400">Use the Filter button to select items to compare</p>
              </div>
            ) : (
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700 sticky left-0 bg-gray-50">
                      Year
                    </TableHead>
                    {visibleItemData.map(item => (
                      <TableHead key={item.code} className="text-right font-semibold text-gray-700 min-w-[120px]">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-600 mb-1">
                            {item.code}
                          </span>
                          <span className="text-xs">{item.name}</span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-semibold text-gray-700">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeSeriesData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleItemData.length + 2} className="text-center text-gray-500 py-8">
                        No data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {timeSeriesData.map((yearData, idx) => {
                        const total = visibleItemData.reduce(
                          (sum, item) => sum + (yearData[item.code] || 0),
                          0
                        )
                        return (
                          <TableRow key={idx} className="hover:bg-gray-50">
                            <TableCell className="font-medium sticky left-0 bg-white">
                              {yearData.calendarYear}
                            </TableCell>
                            {visibleItemData.map(item => (
                              <TableCell key={item.code} className="text-right">
                                {formatCurrencyCompact(yearData[item.code] || 0)}
                              </TableCell>
                            ))}
                            <TableCell className="text-right font-semibold">
                              {formatCurrencyCompact(total)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {/* Totals row */}
                      <TableRow className="bg-gray-100 font-semibold">
                        <TableCell className="sticky left-0 bg-gray-100">Total</TableCell>
                        {visibleItemData.map(item => {
                          const itemTotal = timeSeriesData.reduce(
                            (sum, yearData) => sum + (yearData[item.code] || 0),
                            0
                          )
                          return (
                            <TableCell key={item.code} className="text-right">
                              {formatCurrencyCompact(itemTotal)}
                            </TableCell>
                          )
                        })}
                        <TableCell className="text-right">
                          {formatCurrencyCompact(
                            timeSeriesData.reduce((sum, yearData) => {
                              return sum + visibleItemData.reduce(
                                (s, item) => s + (yearData[item.code] || 0),
                                0
                              )
                            }, 0)
                          )}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
            )
          )}
        </div>

        {/* Explanatory Text */}
        <p className="text-xs text-gray-500 mt-4">
          This chart shows sector disbursement trends over time. Toggle between Planned Disbursements and Actual Disbursements
          using the Planned/Actual buttons. View data at different aggregation levels: Sector Category (DAC 1-digit),
          Sector (DAC 3-digit), or Sub-sector (DAC 5-digit). The stacked area chart shows cumulative values across all sectors;
          switch to line view to compare individual sector trends. Hover over the chart to see a breakdown by sector for each year.
          Year labels adjust based on the selected calendar type (e.g., &ldquo;CY 2025&rdquo; for Calendar Year, &ldquo;FY 2024-25&rdquo; for Fiscal Year).
        </p>
    </div>
  )
}




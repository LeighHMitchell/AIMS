"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Download, TrendingUp, LineChart as LineChartIcon, Table as TableIcon } from 'lucide-react'
import html2canvas from 'html2canvas'

// Time range filter options
type TimeRange = '3m' | '6m' | '12m' | '3y' | '5y'

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: '3y', label: 'Last 3 years' },
  { value: '5y', label: 'Last 5 years' },
]

// Color palette - custom scheme (cycles through)
const SECTOR_COLORS = [
  '#dc2625', // Primary Scarlet
  '#4c5568', // Blue Slate
  '#7b95a7', // Cool Steel
  '#cfd0d5', // Pale Slate
  '#f1f4f8', // Platinum
]

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
}

type DataMode = 'planned' | 'actual'
type ViewMode = 'area' | 'line' | 'table'
type AggregationLevel = 'group' | 'category' | 'sector'

export function SectorDisbursementOverTime({
  dateRange,
  refreshKey = 0,
  compact = false
}: SectorDisbursementOverTimeProps) {
  const [dataMode, setDataMode] = useState<DataMode>('actual')
  const [viewMode, setViewMode] = useState<ViewMode>('area')
  const [aggregationLevel, setAggregationLevel] = useState<AggregationLevel>('category')
  const [data, setData] = useState<SectorData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleSectors, setVisibleSectors] = useState<Set<string>>(new Set())
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('5y')
  const chartRef = useRef<HTMLDivElement>(null)

  // Calculate date range based on time range selection
  const effectiveDateRange = useMemo(() => {
    const now = new Date()
    let from: Date

    switch (selectedTimeRange) {
      case '3m':
        from = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      case '6m':
        from = new Date(now.getFullYear(), now.getMonth() - 6, 1)
        break
      case '12m':
        from = new Date(now.getFullYear() - 1, now.getMonth(), 1)
        break
      case '3y':
        from = new Date(now.getFullYear() - 3, 0, 1)
        break
      case '5y':
      default:
        from = new Date(now.getFullYear() - 5, 0, 1)
        break
    }

    return { from, to: now }
  }, [selectedTimeRange])

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        params.append('dateFrom', effectiveDateRange.from.toISOString())
        params.append('dateTo', effectiveDateRange.to.toISOString())

        const response = await fetch(`/api/analytics/disbursements-by-sector?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }

        const result = await response.json()
        const sectors = result.sectors || []
        setData(sectors)
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
  }, [effectiveDateRange, refreshKey])

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

  // Build color map for aggregated data
  const colorMap = useMemo(() => {
    const map = new Map<string, string>()
    aggregatedData.forEach((item, idx) => {
      map.set(item.code, SECTOR_COLORS[idx % SECTOR_COLORS.length])
    })
    return map
  }, [aggregatedData])


  // Transform data for time series chart (uses aggregatedData)
  const timeSeriesData = useMemo(() => {
    if (aggregatedData.length === 0) return []

    // Get min and max years to create sequential range
    let minYear = Infinity
    let maxYear = -Infinity
    aggregatedData.forEach(item => {
      item.years.forEach(yearData => {
        if (yearData.year < minYear) minYear = yearData.year
        if (yearData.year > maxYear) maxYear = yearData.year
      })
    })

    if (minYear === Infinity || maxYear === -Infinity) return []

    // Create sequential years array (fill gaps)
    const years: number[] = []
    for (let y = minYear; y <= maxYear; y++) {
      years.push(y)
    }

    // Create data points for each year (calendar year format)
    return years.map(year => {
      const dataPoint: Record<string, any> = { 
        year,
        calendarYear: year.toString()
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
  }, [aggregatedData, dataMode])

  // Reset visible items when aggregation level changes
  useEffect(() => {
    if (aggregatedData.length > 0) {
      setVisibleSectors(new Set(aggregatedData.map(item => item.code)))
    }
  }, [aggregationLevel, aggregatedData.length])


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
          className="p-3 pt-2 max-h-[280px] overflow-y-auto hover:overflow-y-scroll"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: '#94a3b8 #e2e8f0'
          }}
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

  // Get visible items for rendering (based on aggregation level)
  const visibleItemData = aggregatedData.filter(item => visibleSectors.has(item.code))

  // Compact mode check FIRST - before any Card returns
  if (compact) {
    if (loading && data.length === 0) {
      return <div className="h-full w-full flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>
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
            <Tooltip content={<CustomTooltip />} />
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
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Sector Financial Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Sector Financial Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-red-600">Error loading data: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Sector Financial Trends
          </CardTitle>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Time Range Filter */}
            <div className="w-[140px]">
              <Select
                value={selectedTimeRange}
                onValueChange={(value) => setSelectedTimeRange(value as TimeRange)}
              >
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Mode Toggle */}
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <Button
                variant={dataMode === 'planned' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDataMode('planned')}
              >
                Planned
              </Button>
              <Button
                variant={dataMode === 'actual' ? 'default' : 'ghost'}
                size="sm"
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
                onClick={() => setAggregationLevel('group')}
              >
                Group
              </Button>
              <Button
                variant={aggregationLevel === 'category' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAggregationLevel('category')}
              >
                Category
              </Button>
              <Button
                variant={aggregationLevel === 'sector' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAggregationLevel('sector')}
              >
                Sector
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <Button
                variant={viewMode === 'area' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('area')}
                title="Area"
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('line')}
                title="Line"
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                title="Table"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Save Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSaveChart}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              title="Save chart as image"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <div ref={chartRef} className="bg-white">
          {/* Charts */}
          {viewMode === 'area' ? (
            timeSeriesData.length === 0 ? (
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
                  <Tooltip content={<CustomTooltip />} />
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
            timeSeriesData.length === 0 ? (
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
                  <Tooltip content={<CustomTooltip />} />
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
          )}
        </div>
      </CardContent>
    </Card>
  )
}




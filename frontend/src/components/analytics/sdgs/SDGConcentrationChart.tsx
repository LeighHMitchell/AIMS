"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label
} from 'recharts'
import { Button } from '@/components/ui/button'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { AlertCircle, LineChart as LineChartIcon, BarChart3 as BarChartIcon } from 'lucide-react'
import { CustomYear, getCustomYearRange, getCustomYearLabel, pickDefaultCalendarYearId } from '@/types/custom-years'
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { formatAxisCurrency, formatTooltipCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import { useChartExpansion } from '@/lib/chart-expansion-context'

// Generate list of available years
const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i
)

interface SDGConcentrationChartProps {
  organizationId: string
  dateRange: { from: Date; to: Date }
  selectedSdgs: number[]
  metric: 'activities' | 'budget' | 'planned'
  refreshKey: number
  compact?: boolean
}

interface ConcentrationData {
  year: number
  sdgCount: number
  activityCount: number
  totalBudget: number
  totalPlannedDisbursements: number
}

export function SDGConcentrationChart({
  organizationId,
  dateRange: initialDateRange,
  selectedSdgs,
  metric,
  refreshKey,
  compact = false
}: SDGConcentrationChartProps) {
  const [data, setData] = useState<ConcentrationData[]>([])
  const [loading, setLoading] = useState(true)
  const isExpanded = useChartExpansion()
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  // Calendar and year selector state
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)
  // Fetch the full available span up front so the year picker can default to
  // the true data range (all years that have data); the user narrows from there.
  const [localDateRange, setLocalDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(AVAILABLE_YEARS[0], 0, 1),
    to: new Date(AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1], 11, 31),
  })
  const [actualDataRange, setActualDataRange] = useState<{ minYear: number; maxYear: number } | null>(null)

  // Fetch custom years on mount
  useEffect(() => {
    const fetchCustomYears = async () => {
      try {
        const response = await apiFetch('/api/custom-years')
        if (response.ok) {
          const result = await response.json()
          const years = result.data || []
          setCustomYears(years)

          // Default to the Gregorian Calendar Year regardless of the DB default.
          // The year range defaults to the actual data range once data loads.
          const defaultId = pickDefaultCalendarYearId(years, result.defaultId)
          if (defaultId) setCalendarType(defaultId)
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
    if (customYears.length > 0 && calendarType && selectedYears.length > 0) {
      const customYear = customYears.find(cy => cy.id === calendarType)
      if (customYear) {
        const sortedYears = [...selectedYears].sort((a, b) => a - b)
        const firstYearRange = getCustomYearRange(customYear, sortedYears[0])
        const lastYearRange = getCustomYearRange(customYear, sortedYears[sortedYears.length - 1])
        setLocalDateRange({
          from: firstYearRange.start,
          to: lastYearRange.end
        })
      }
    }
  }, [calendarType, selectedYears, customYears])

  // Default the selected year range to the full span of years that have data
  // (set once the data range is known; later user selections stick).
  useEffect(() => {
    if (selectedYears.length === 0 && actualDataRange) {
      setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualDataRange?.minYear, actualDataRange?.maxYear])

  // Year label in the selected calendar (used by the X-axis + tooltip).
  const getYearLabel = (year: number): string => {
    if (!calendarType || customYears.length === 0) return String(year)
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (!customYear) return String(year)
    return getCustomYearLabel(customYear, year)
  }

  useEffect(() => {
    fetchData()
  }, [organizationId, localDateRange, selectedSdgs, metric, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        organizationId: organizationId || 'all',
        dateFrom: localDateRange.from.toISOString().split('T')[0],
        dateTo: localDateRange.to.toISOString().split('T')[0],
        selectedSdgs: selectedSdgs.length > 0 ? selectedSdgs.join(',') : 'all',
        metric,
        dataType: 'concentration'
      })

      const response = await apiFetch(`/api/analytics/sdgs?${params}`)
      const result = await response.json()

      if (result.success && result.concentration) {
        setData(result.concentration)
        // Calculate actual data range from years in the data
        const years = [...new Set(result.concentration.map((d: ConcentrationData) => d.year))]
        if (years.length > 0) {
          setActualDataRange({
            minYear: Math.min(...years),
            maxYear: Math.max(...years)
          })
        }
      } else {
        console.error('Error fetching SDG concentration data:', result.error)
        setData([])
      }
    } catch (error) {
      console.error('Error fetching SDG concentration data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const getMetricValue = (item: ConcentrationData) => {
    if (metric === 'activities') return item.activityCount
    if (metric === 'budget') return item.totalBudget
    return item.totalPlannedDisbursements
  }

  const getMetricLabel = () => {
    if (metric === 'activities') return 'Number of Activities'
    if (metric === 'budget') return 'Total Activity Budget (USD)'
    return 'Total Planned Disbursements (USD)'
  }

  // Transform data for line chart - group by year and create lines for each SDG count category
  const chartData = useMemo(() => {
    const yearMap = new Map<number, {
      '1 SDG': number
      '2 SDGs': number
      '3 SDGs': number
      '4 SDGs': number
      '5+ SDGs': number
    }>()

    data.forEach(item => {
      if (!yearMap.has(item.year)) {
        yearMap.set(item.year, {
          '1 SDG': 0,
          '2 SDGs': 0,
          '3 SDGs': 0,
          '4 SDGs': 0,
          '5+ SDGs': 0
        })
      }

      const yearData = yearMap.get(item.year)!
      const value = getMetricValue(item)
      const category = item.sdgCount === 1 ? '1 SDG' :
                      item.sdgCount === 2 ? '2 SDGs' :
                      item.sdgCount === 3 ? '3 SDGs' :
                      item.sdgCount === 4 ? '4 SDGs' : '5+ SDGs'
      
      yearData[category] = value
    })

    return Array.from(yearMap.entries())
      .map(([year, values]) => ({
        year,
        ...values
      }))
      .sort((a, b) => a.year - b.year)
  }, [data, metric])

  // Brand palette colors
  const lineColors = {
    '1 SDG': '#4c5568',    // Blue Slate
    '2 SDGs': '#7b95a7',   // Cool Steel
    '3 SDGs': '#dc2625',   // Primary Scarlet
    '4 SDGs': '#5f7f7a',   // Deep Teal
    '5+ SDGs': '#c9a24d'   // Soft Ochre
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const rows = payload.map((entry: any) => ({
        label: entry.name,
        value: metric === 'activities' ? entry.value.toFixed(0) : formatTooltipCurrency(entry.value, isExpanded),
        color: entry.color || entry.stroke || entry.fill,
      }))
      return <ChartTooltipCard title={`Year: ${getYearLabel(label)}`} rows={rows} />
    }
    return null
  }

  // Compact mode renders just the chart without Card wrapper
  if (compact) {
    if (loading) {
      return <ChartLoadingPlaceholder />
    }
    if (chartData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-body">No data available</p>
        </div>
      )
    }
    // Filter chartData to only show years with actual data in compact view
    const compactChartData = chartData.filter(d => {
      // Check if this year has any non-zero values
      return d['1 SDG'] > 0 || d['2 SDGs'] > 0 || d['3 SDGs'] > 0 || d['4 SDGs'] > 0 || d['5+ SDGs'] > 0
    })

    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={compactChartData} margin={{ top: 10, right: 20, left: 35, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis dataKey="year" fontSize={9} tick={{ fill: '#64748b' }} tickFormatter={(year) => getYearLabel(year)} />
            <YAxis fontSize={9} tick={{ fill: '#64748b' }} tickFormatter={(v) => v.toFixed(0)}>
              <Label value="Activities" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: 9, fill: '#64748b' }} />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Line type="linear" dataKey="1 SDG" stroke={lineColors['1 SDG']} strokeWidth={2} dot={{ r: 2 }} />
            <Line type="linear" dataKey="2 SDGs" stroke={lineColors['2 SDGs']} strokeWidth={2} dot={{ r: 2 }} />
            <Line type="linear" dataKey="3 SDGs" stroke={lineColors['3 SDGs']} strokeWidth={2} dot={{ r: 2 }} />
            <Line type="linear" dataKey="4 SDGs" stroke={lineColors['4 SDGs']} strokeWidth={2} dot={{ r: 2 }} />
            <Line type="linear" dataKey="5+ SDGs" stroke={lineColors['5+ SDGs']} strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading) {
    return <ChartLoadingPlaceholder />
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground font-medium">No SDG concentration data available</p>
          <p className="text-body text-muted-foreground mt-2">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  const filteredData = chartData.filter(d => {
    if (selectedYears.length === 0) return true
    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)
    return d.year >= minYear && d.year <= maxYear
  })

  const SDG_SERIES: Array<keyof typeof lineColors> = ['1 SDG', '2 SDGs', '3 SDGs', '4 SDGs', '5+ SDGs']
  const ChartComp = chartType === 'bar' ? BarChart : LineChart
  const renderSeries = () =>
    SDG_SERIES.map(key =>
      chartType === 'bar' ? (
        <Bar key={key} dataKey={key} fill={lineColors[key]} />
      ) : (
        <Line
          key={key}
          type="linear"
          dataKey={key}
          stroke={lineColors[key]}
          strokeWidth={2}
          dot={{ fill: lineColors[key], r: 4 }}
          activeDot={{ r: 6 }}
        />
      ),
    )

  return (
    <>
      {/* Calendar/year selector (consistent with other charts) + chart-type
          toggle on the right — expanded view only. */}
      {isExpanded && (
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <YearRangeChip
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
            customYears={customYears}
            calendarType={calendarType}
            onCalendarTypeChange={setCalendarType}
            actualDataRange={actualDataRange}
          />
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChartType('line')}
              className={cn('h-8 w-8', chartType === 'line' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}
              title="Line chart"
              aria-label="Line chart"
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChartType('bar')}
              className={cn('h-8 w-8', chartType === 'bar' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}
              title="Bar chart"
              aria-label="Bar chart"
            >
              <BarChartIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={isExpanded ? 400 : "100%"}>
        <ChartComp data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="year"
            tickFormatter={(year) => getYearLabel(year)}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            tickFormatter={metric === 'activities' ? (v) => v.toFixed(0) : formatAxisCurrency}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          >
            <Label value={getMetricLabel()} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: 11, fill: '#64748b' }} />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />
          {isExpanded && <Legend wrapperStyle={{ paddingTop: '20px' }} iconType={chartType === 'bar' ? 'rect' : 'line'} />}
          {renderSeries()}
        </ChartComp>
      </ResponsiveContainer>

      {/* Explanatory text */}
      {isExpanded && (
        <div className="mt-6">
          <p className="text-body text-muted-foreground leading-relaxed">
            This chart tracks how many SDGs are typically assigned to each activity over time, helping assess the
            organization&apos;s approach to SDG alignment. Activities mapped to just one or two SDGs suggest targeted,
            focused interventions, while those mapped to five or more SDGs may indicate cross-cutting programs or
            potentially unfocused design. Neither approach is inherently better; the optimal strategy depends on the
            organization&apos;s mandate and context. Use this visualization to understand whether aid programming is
            becoming more specialized or more integrated over time, and to inform strategic discussions about how
            broadly or narrowly to align future activities with global development goals.
          </p>
        </div>
      )}
    </>
  )
}







"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoadingText } from '@/components/ui/loading-text'
import { AlertCircle, Calendar as CalendarIcon } from 'lucide-react'
import { CustomYear, getCustomYearRange, getCustomYearLabel } from '@/types/custom-years'
import { format } from 'date-fns'
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'

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

  // Calendar and year selector state
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)
  const [localDateRange, setLocalDateRange] = useState(initialDateRange)
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

          // Set default calendar
          let selectedCalendar: CustomYear | undefined
          if (result.defaultId) {
            selectedCalendar = years.find((cy: CustomYear) => cy.id === result.defaultId)
          }
          if (!selectedCalendar && years.length > 0) {
            selectedCalendar = years[0]
          }
          if (selectedCalendar) {
            setCalendarType(selectedCalendar.id)
            // Default to last 5 years
            const currentYear = new Date().getFullYear()
            setSelectedYears([currentYear - 5, currentYear])
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

  // Helper functions for year selection
  const getYearLabel = (year: number): string => {
    if (!calendarType || customYears.length === 0) return String(year)
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (!customYear) return String(year)
    return getCustomYearLabel(customYear, year)
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

  const isYearInRange = (year: number): boolean => {
    if (selectedYears.length < 2) return false
    const [start, end] = [Math.min(...selectedYears), Math.max(...selectedYears)]
    return year > start && year < end
  }

  const selectAllYears = () => {
    setSelectedYears([AVAILABLE_YEARS[0], AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]])
  }

  const selectDataRange = () => {
    if (actualDataRange) {
      setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
    }
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

  const formatCurrency = (value: number) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return '$0'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
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
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-slate-900 mb-2">Year: {getYearLabel(label)}</p>
          <div className="space-y-1 text-sm">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between gap-4">
                <span className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-slate-600">{entry.name}</span>
                </span>
                <span className="font-medium">
                  {metric === 'activities'
                    ? entry.value.toFixed(0)
                    : formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  // Compact mode renders just the chart without Card wrapper
  if (compact) {
    if (loading) {
      return <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
    }
    if (chartData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          <p className="text-sm">No data available</p>
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
    return (
      <Card>
        <CardHeader>
          <CardTitle>SDG Concentration Over Time</CardTitle>
          <CardDescription>
            Assess whether activities are becoming more concentrated or dispersed across SDGs over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SDG Concentration Over Time</CardTitle>
          <CardDescription>
            Assess whether activities are becoming more concentrated or dispersed across SDGs over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-slate-600 font-medium">No SDG concentration data available</p>
              <p className="text-sm text-slate-500 mt-2">Try adjusting your filters</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 bg-white shadow-none">
      <CardHeader className="pb-2">
        <CardTitle>SDG Concentration Over Time</CardTitle>
        <CardDescription className="mt-1">
          {getMetricLabel()} grouped by number of SDGs mapped to each activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Calendar & Year Selectors */}
        {customYears.length > 0 && (
          <div className="flex items-start gap-2 mb-4 pb-3 border-b border-slate-100">
            {/* Calendar Type Selector */}
            <div className="flex gap-1 rounded-lg p-1 bg-slate-100">
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

            {/* Year Range Selector */}
            <div className="flex flex-col gap-1">
              <div className="flex gap-1 rounded-lg p-1 bg-slate-100">
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
                      <button
                        onClick={selectAllYears}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
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
                                ? 'bg-slate-200 text-slate-900'
                                : inRange
                                  ? 'bg-primary/20 text-primary'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }
                            `}
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
              {localDateRange?.from && localDateRange?.to && (
                <span className="text-xs text-slate-500 text-center">
                  {format(localDateRange.from, 'MMM d, yyyy')} – {format(localDateRange.to, 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData.filter(d => {
              if (selectedYears.length === 0) return true
              const minYear = Math.min(...selectedYears)
              const maxYear = Math.max(...selectedYears)
              return d.year >= minYear && d.year <= maxYear
            })}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="year"
              tickFormatter={(year) => getYearLabel(year)}
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              tickFormatter={metric === 'activities' ? (v) => v.toFixed(0) : formatCurrency}
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#cbd5e1' }}
            >
              <Label value={getMetricLabel()} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: 11, fill: '#64748b' }} />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line
              type="linear"
              dataKey="1 SDG"
              stroke={lineColors['1 SDG']}
              strokeWidth={2}
              dot={{ fill: lineColors['1 SDG'], r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="linear"
              dataKey="2 SDGs"
              stroke={lineColors['2 SDGs']}
              strokeWidth={2}
              dot={{ fill: lineColors['2 SDGs'], r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="linear"
              dataKey="3 SDGs"
              stroke={lineColors['3 SDGs']}
              strokeWidth={2}
              dot={{ fill: lineColors['3 SDGs'], r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="linear"
              dataKey="4 SDGs"
              stroke={lineColors['4 SDGs']}
              strokeWidth={2}
              dot={{ fill: lineColors['4 SDGs'], r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="linear"
              dataKey="5+ SDGs"
              stroke={lineColors['5+ SDGs']}
              strokeWidth={2}
              dot={{ fill: lineColors['5+ SDGs'], r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Explanatory paragraph */}
        <div className="mt-6">
          <p className="text-sm text-slate-500 leading-relaxed">
            This chart tracks how many SDGs are typically assigned to each activity over time, helping assess the
            organization&apos;s approach to SDG alignment. Activities mapped to just one or two SDGs suggest targeted,
            focused interventions, while those mapped to five or more SDGs may indicate cross-cutting programs or
            potentially unfocused design. Neither approach is inherently better—the optimal strategy depends on the
            organization&apos;s mandate and context. Use this visualization to understand whether aid programming is
            becoming more specialized or more integrated over time, and to inform strategic discussions about how
            broadly or narrowly to align future activities with global development goals.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}







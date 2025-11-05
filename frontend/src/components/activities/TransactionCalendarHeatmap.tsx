"use client"

import React, { useMemo, useState } from 'react'
import { format, startOfYear, endOfYear, startOfWeek, endOfWeek, eachDayOfInterval, 
  startOfMonth, endOfMonth, subDays, isWithinInterval, startOfDay, parseISO } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'
import { TRANSACTION_TYPE_LABELS } from '@/types/transaction'
import { cn } from '@/lib/utils'

interface Transaction {
  transaction_date: string
  transaction_type: string
  value: number
  value_usd?: number
  usd_value?: number
  value_USD?: number
}

interface TransactionCalendarHeatmapProps {
  transactions: Transaction[]
}

// Color scheme for transaction types
const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  '1': '#3B82F6',   // Incoming Commitment - blue
  '2': '#10B981',   // Outgoing Commitment - green
  '3': '#F59E0B',   // Disbursement - orange
  '4': '#EF4444',   // Expenditure - red
  '11': '#10B981',  // Credit Guarantee - green (same as commitment)
  '12': '#3B82F6',  // Incoming Funds - blue (same as incoming commitment)
  '13': '#64748B',  // Commitment Cancellation - gray
  '5': '#8B5CF6',   // Interest Repayment - purple
  '6': '#8B5CF6',   // Loan Repayment - purple
  '7': '#14B8A6',   // Reimbursement - teal
  '8': '#EC4899',   // Purchase of Equity - pink
  '9': '#EC4899',   // Sale of Equity - pink
}

// Convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

// Blend multiple colors proportionally
function blendColors(colors: Array<{ color: string; weight: number }>): string {
  if (colors.length === 0) return '#EBEDF0'
  if (colors.length === 1) return colors[0].color

  let totalWeight = colors.reduce((sum, c) => sum + c.weight, 0)
  if (totalWeight === 0) return '#EBEDF0'

  let r = 0
  let g = 0
  let b = 0

  colors.forEach(({ color, weight }) => {
    const rgb = hexToRgb(color)
    if (rgb) {
      const normalizedWeight = weight / totalWeight
      r += rgb.r * normalizedWeight
      g += rgb.g * normalizedWeight
      b += rgb.b * normalizedWeight
    }
  })

  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`
}

interface DayData {
  date: Date
  transactions: Transaction[]
  count: number
  value: number
  typeBreakdown: Record<string, { count: number; value: number }>
}

export function TransactionCalendarHeatmap({ transactions }: TransactionCalendarHeatmapProps) {
  const [intensityMode, setIntensityMode] = useState<'count' | 'value'>('count')
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null)
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Process transactions by date
  const processedData = useMemo(() => {
    const dayMap = new Map<string, DayData>()

    transactions.forEach((transaction) => {
      if (!transaction.transaction_date) return

      try {
        const date = parseISO(transaction.transaction_date)
        if (isNaN(date.getTime())) return

        const dateKey = format(startOfDay(date), 'yyyy-MM-dd')
        const type = transaction.transaction_type || 'unknown'

        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, {
            date: startOfDay(date),
            transactions: [],
            count: 0,
            value: 0,
            typeBreakdown: {},
          })
        }

        const dayData = dayMap.get(dateKey)!
        dayData.transactions.push(transaction)
        dayData.count += 1

        // Get USD value with fallbacks
        const usdValue = parseFloat(
          String(
            transaction.value_usd ||
            transaction.usd_value ||
            transaction.value_USD ||
            transaction.value ||
            0
          )
        ) || 0

        dayData.value += Math.abs(usdValue)

        if (!dayData.typeBreakdown[type]) {
          dayData.typeBreakdown[type] = { count: 0, value: 0 }
        }
        dayData.typeBreakdown[type].count += 1
        dayData.typeBreakdown[type].value += Math.abs(usdValue)
      } catch (error) {
        console.error('Error processing transaction date:', error)
      }
    })

    return Array.from(dayMap.values())
  }, [transactions])

  // Filter by date range if set
  const filteredData = useMemo(() => {
    if (!dateRange) return processedData
    return processedData.filter((day) =>
      isWithinInterval(day.date, { start: dateRange.from, end: dateRange.to })
    )
  }, [processedData, dateRange])

  // Calculate date range for display
  const displayRange = useMemo(() => {
    if (dateRange) {
      return { start: dateRange.from, end: dateRange.to }
    }

    if (processedData.length === 0) {
      const now = new Date()
      return { start: startOfYear(now), end: endOfYear(now) }
    }

    const dates = processedData.map((d) => d.date)
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

    // Default to showing last year if data is available
    const end = maxDate
    const start = subDays(end, 365)

    return { start, end }
  }, [processedData, dateRange])

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const { start, end } = displayRange
    const startDate = startOfWeek(start, { weekStartsOn: 0 }) // Sunday
    const endDate = endOfWeek(end, { weekStartsOn: 0 })

    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const dataMap = new Map(
      filteredData.map((day) => [format(day.date, 'yyyy-MM-dd'), day])
    )

    // Calculate max value for normalization
    const maxValue = Math.max(
      ...filteredData.map((d) => (intensityMode === 'count' ? d.count : d.value)),
      1
    )

    // Group by weeks
    const weeks: Array<Array<{ date: Date; data: DayData | null; intensity: number }>> = []
    let currentWeek: Array<{ date: Date; data: DayData | null; intensity: number }> = []

    days.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd')
      const dayData = dataMap.get(dateKey) || null

      let intensity = 0
      if (dayData) {
        const value = intensityMode === 'count' ? dayData.count : dayData.value
        // Use square root for better visual distribution across the range
        intensity = Math.min(Math.sqrt(value / maxValue), 1)
      }

      currentWeek.push({ date: day, data: dayData, intensity })

      if (day.getDay() === 6) {
        // Saturday - end of week
        weeks.push(currentWeek)
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return { weeks, maxValue }
  }, [filteredData, displayRange, intensityMode])

  // Get color for a day
  const getDayColor = (dayData: DayData | null, intensity: number): string => {
    if (!dayData || dayData.count === 0) {
      return '#EBEDF0' // Light gray for no activity
    }

    // Get color weights for each transaction type
    const colorWeights: Array<{ color: string; weight: number }> = []

    Object.entries(dayData.typeBreakdown).forEach(([type, breakdown]) => {
      const weight = intensityMode === 'count' ? breakdown.count : breakdown.value
      const color = TRANSACTION_TYPE_COLORS[type] || '#64748B'

      if (weight > 0) {
        colorWeights.push({ color, weight })
      }
    })

    if (colorWeights.length === 0) {
      return '#EBEDF0'
    }

    // Blend colors
    const baseColor = blendColors(colorWeights)

    // Apply intensity (darken/lighten based on activity level)
    const rgb = hexToRgb(baseColor)
    if (!rgb) return baseColor

    // Intensity scaling: 0.2 (lighter) to 1.0 (full color) - wider range for more variety
    const intensityScale = 0.2 + intensity * 0.8
    const r = Math.round(Math.min(rgb.r * intensityScale, 255))
    const g = Math.round(Math.min(rgb.g * intensityScale, 255))
    const b = Math.round(Math.min(rgb.b * intensityScale, 255))

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  // Format currency value in abbreviated form (e.g., 5,500,000 -> 5.5m)
  const formatCurrencyAbbreviated = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}m`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toFixed(1)
  }

  // Get month labels with proper positioning
  const monthLabels = useMemo(() => {
    const { start, end } = displayRange
    const months: Array<{ month: number; year: number; weekIndex: number; startWeek: number }> = []
    const seen = new Set<string>()

    calendarGrid.weeks.forEach((week, weekIndex) => {
      const firstDay = week[0]?.date
      if (!firstDay) return

      const monthKey = `${firstDay.getFullYear()}-${firstDay.getMonth()}`
      if (!seen.has(monthKey)) {
        seen.add(monthKey)
        // Find the first week that contains this month
        const firstWeekOfMonth = calendarGrid.weeks.findIndex((w) => {
          const day = w[0]?.date
          return day && day.getFullYear() === firstDay.getFullYear() && day.getMonth() === firstDay.getMonth()
        })
        
        months.push({
          month: firstDay.getMonth(),
          year: firstDay.getFullYear(),
          weekIndex,
          startWeek: firstWeekOfMonth >= 0 ? firstWeekOfMonth : weekIndex,
        })
      }
    })

    return months
  }, [calendarGrid.weeks, displayRange])

  if (processedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <p className="font-medium">No transaction data available</p>
          <p className="text-xs mt-2">Add transactions to see the calendar heat map</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 relative">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
          <span className="text-sm font-medium text-slate-600">Intensity by:</span>
          <div className="flex gap-1">
            <Button
              variant={intensityMode === 'count' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIntensityMode('count')}
              className={cn(
                'h-7 px-3 text-xs',
                intensityMode === 'count'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              )}
            >
              Count
            </Button>
            <Button
              variant={intensityMode === 'value' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIntensityMode('value')}
              className={cn(
                'h-7 px-3 text-xs',
                intensityMode === 'value'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              )}
            >
              Value
            </Button>
          </div>
        </div>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-sm bg-white border-slate-300 hover:bg-slate-50"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange
                ? `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
                : 'All time'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from || (displayRange.start && displayRange.end ? 
                new Date(Math.max(displayRange.start.getTime(), new Date(displayRange.end.getFullYear(), displayRange.end.getMonth() - 1, 1).getTime())) : 
                new Date()
              )}
              selected={dateRange || undefined}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to })
                  setPopoverOpen(false)
                } else if (range?.from) {
                  // If only start date selected, wait for end date
                  setDateRange({ from: range.from, to: range.from })
                } else {
                  setDateRange(null)
                }
              }}
              numberOfMonths={2}
            />
            <div className="p-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setDateRange(null)
                  setPopoverOpen(false)
                }}
              >
                Clear filter
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto w-full">
        <div className="w-full">
          <div className="flex flex-col gap-1">
            {/* Month labels row */}
            <div className="flex gap-1 pl-6 w-full">
              {monthLabels.map(({ month, year, weekIndex, startWeek }, idx) => {
                // Calculate weeks until next month label or end
                const nextMonthIndex = monthLabels.findIndex(
                  (m, i) => i > idx && (m.month !== month || m.year !== year)
                )
                const nextStartWeek = nextMonthIndex === -1 
                  ? calendarGrid.weeks.length
                  : monthLabels[nextMonthIndex].startWeek
                const weeksUntilNext = nextStartWeek - startWeek
                
                // Add spacer before first month if it doesn't start at week 0
                const spacerBefore = idx === 0 && startWeek > 0
                
                return (
                  <React.Fragment key={`${year}-${month}-${idx}`}>
                    {spacerBefore && (
                      <div style={{ width: `${startWeek * 13}px` }} />
                    )}
                    <div
                      className="text-xs text-slate-600 font-medium text-center"
                      style={{
                        width: `${Math.max(weeksUntilNext, 1) * 13}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {format(new Date(year, month, 1), 'MMM')}
                    </div>
                  </React.Fragment>
                )
              })}
            </div>

            {/* Day labels and calendar grid */}
            <div className="flex gap-1 w-full">
              {/* Day labels column */}
              <div className="flex flex-col gap-1 pr-2 flex-shrink-0">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                  <div
                    key={day}
                    className="text-xs text-slate-500 font-medium text-center"
                    style={{ height: '13px', lineHeight: '13px' }}
                  >
                    {idx === 0 ? 'S' : day[0]}
                  </div>
                ))}
              </div>

              {/* Weeks as horizontal columns */}
              <div className="flex gap-1 flex-1">
                {calendarGrid.weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-1 flex-1">
                    {week.map((day, dayIdx) => {
                      const dayColor = getDayColor(day.data, day.intensity)
                      const isInRange = !dateRange || isWithinInterval(day.date, {
                        start: dateRange.from,
                        end: dateRange.to,
                      })

                      return (
                        <div
                          key={`${weekIdx}-${dayIdx}`}
                          className={cn(
                            'w-3 h-3 rounded-sm transition-all cursor-pointer',
                            !isInRange && 'opacity-30'
                          )}
                          style={{
                            backgroundColor: dayColor,
                            border: day.data && day.data.count > 0 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                          }}
                          onMouseEnter={(e) => {
                            if (day.data) {
                              setHoveredDay(day.data)
                              const rect = e.currentTarget.getBoundingClientRect()
                              setTooltipPosition({
                                x: rect.left + rect.width / 2,
                                y: rect.top - 10,
                              })
                            }
                          }}
                          onMouseMove={(e) => {
                            if (day.data) {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setTooltipPosition({
                                x: rect.left + rect.width / 2,
                                y: rect.top - 10,
                              })
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredDay(null)
                            setTooltipPosition(null)
                          }}
                          title={
                            day.data
                              ? `${format(day.date, 'MMM dd, yyyy')}: ${day.data.count} transaction${
                                  day.data.count !== 1 ? 's' : ''
                                }`
                              : format(day.date, 'MMM dd, yyyy')
                          }
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && tooltipPosition && (
        <div
          className="fixed bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50 pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-8px',
            minWidth: '280px',
          }}
        >
          <p className="font-semibold text-slate-900 mb-2">
            {format(hoveredDay.date, 'MMMM dd, yyyy')}
          </p>
          <div className="space-y-1">
            <p className="text-sm text-slate-600">
              {hoveredDay.count} transaction{hoveredDay.count !== 1 ? 's' : ''}
            </p>
            <div className="mt-2 pt-2 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-700 mb-1">Transactions:</p>
              {hoveredDay.transactions.map((transaction, index) => {
                const usdValue = parseFloat(
                  String(
                    transaction.value_usd ||
                    transaction.usd_value ||
                    transaction.value_USD ||
                    transaction.value ||
                    0
                  )
                ) || 0
                const type = transaction.transaction_type || 'unknown'
                return (
                  <div key={index} className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{
                          backgroundColor: TRANSACTION_TYPE_COLORS[type] || '#64748B',
                        }}
                      />
                      <span className="text-slate-600">
                        {TRANSACTION_TYPE_LABELS[type as keyof typeof TRANSACTION_TYPE_LABELS] || type}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      ${formatCurrencyAbbreviated(Math.abs(usdValue))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-600">Less</span>
          <div className="flex gap-1">
            {[0, 0.25, 0.5, 0.75, 1.0].map((intensity) => {
              const color = getDayColor(
                {
                  date: new Date(),
                  transactions: [],
                  count: intensity === 0 ? 0 : 1,
                  value: intensity === 0 ? 0 : 1000,
                  typeBreakdown: intensity === 0 ? {} : { '3': { count: 1, value: 1000 } },
                },
                intensity
              )
              return (
                <div
                  key={intensity}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
              )
            })}
          </div>
          <span className="text-slate-600">More</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-slate-600 font-medium">Transaction types:</span>
          {Object.entries(TRANSACTION_TYPE_COLORS)
            .filter(([type]) => {
              // Only show types that exist in the data
              return processedData.some((d) => d.typeBreakdown[type])
            })
            .map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-600">
                  {TRANSACTION_TYPE_LABELS[type as keyof typeof TRANSACTION_TYPE_LABELS] || type}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}


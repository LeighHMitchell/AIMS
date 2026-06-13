"use client"

import React, { useMemo, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import * as d3 from 'd3'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, 
  isWithinInterval, startOfDay, parseISO, eachMonthOfInterval, startOfMonth } from 'date-fns'
import { Button } from '@/components/ui/button'
import { ChartViewToggle } from '@/components/ui/chart-view-toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Grid3x3, List, Table as TableIcon, X, ExternalLink } from 'lucide-react'
import { ChartDataTable } from '@/components/ui/chart-data-table'
import { TRANSACTION_TYPE_LABELS } from '@/types/transaction'
import { TRANSACTION_TYPE_COLORS } from '@/lib/chart-colors'
import { cn } from '@/lib/utils'
import { getTransactionUSDValueSync } from '@/lib/transaction-usd-helper'
import { formatCurrencyCompact } from '@/lib/format'

interface Transaction {
  transaction_date: string
  transaction_type: string
  value: number
  value_usd?: number
  usd_value?: number
  value_USD?: number
  currency?: string
  /** Development partner that reported it (set by the analytics calendar wrapper). */
  provider?: string
  /** Org id (for the development-partner link) and activity id/name (for the activity link). */
  providerId?: string
  activityId?: string
  activityName?: string
}

// Friendly label/colour for a calendar "type" — IATI transaction codes plus the
// synthetic 'planned' / 'budget' types the analytics calendar feeds in.
const calTypeLabel = (type: string): string =>
  type === 'planned' ? 'Planned Disbursements'
    : type === 'budget' ? 'Budgets'
      : (TRANSACTION_TYPE_LABELS[type as keyof typeof TRANSACTION_TYPE_LABELS] || `Type ${type}`)

const calTypeColor = (type: string): string =>
  type === 'planned' ? '#7b95a7'
    : type === 'budget' ? '#334155'
      : (TRANSACTION_TYPE_COLORS[type] || '#64748b')

interface TransactionCalendarHeatmapProps {
  transactions: Transaction[]
  stats?: {
    totalTransactions: number
    totalValue: number
    activeDays: number
    avgPerDay: number
  }
  /** When false, hides the view-mode toggle (e.g. in a collapsed analytics card). Defaults to true. */
  showControls?: boolean
  /** When provided, overrides the displayed window (the wrapper drives the year). */
  dateRange?: { from: Date; to: Date } | null
  /** Hide the built-in calendar-type / year picker (the wrapper supplies its own). */
  hideYearPicker?: boolean
  /** Controlled view mode (the wrapper renders its own view-mode toggle). */
  viewMode?: 'heatmap' | 'timeline' | 'table'
  onViewModeChange?: (mode: 'heatmap' | 'timeline' | 'table') => void
}

// Transaction-type colors now come from the single source of truth in
// @/lib/chart-colors (TRANSACTION_TYPE_COLORS) — see import above.

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

// GitHub-style single-hue density ramp (empty → busiest day). Cells are
// coloured by the NUMBER of transactions that day — not by transaction type or
// value — so the calendar reads as an activity-density heatmap.
const DENSITY_SCALE = ['#EBEDF0', '#C6DBEF', '#9ECAE1', '#4292C6', '#08519C']

interface DayData {
  date: Date
  transactions: Transaction[]
  count: number
  value: number
  typeBreakdown: Record<string, { count: number; value: number }>
}

// Get available years from data
function getAvailableYears(data: DayData[], yearType: 'calendar' | 'financial'): number[] {
  const years = new Set<number>()
  data.forEach(d => {
    if (yearType === 'calendar') {
      years.add(d.date.getFullYear())
    } else {
      // Financial year: July starts a new FY
      const month = d.date.getMonth()
      const year = d.date.getFullYear()
      // July-Dec = current year's FY, Jan-June = previous year's FY
      years.add(month >= 6 ? year : year - 1)
    }
  })
  return Array.from(years).sort((a, b) => b - a) // Most recent first
}

// Get year range based on type
function getYearRange(year: number, yearType: 'calendar' | 'financial'): { start: Date; end: Date } {
  if (yearType === 'calendar') {
    return {
      start: new Date(year, 0, 1),  // Jan 1
      end: new Date(year, 11, 31)   // Dec 31
    }
  } else {
    return {
      start: new Date(year, 6, 1),      // July 1
      end: new Date(year + 1, 5, 30)    // June 30 next year
    }
  }
}

// Timeline View Component
function TimelineView({ 
  data, 
  onHoverDay,
  onLeaveDay
}: { 
  data: DayData[]
  onHoverDay: (day: DayData, e: React.MouseEvent) => void
  onLeaveDay: () => void
}) {
  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, DayData[]>()
    const sortedData = [...data].sort((a, b) => b.date.getTime() - a.date.getTime())
    
    sortedData.forEach(day => {
      const monthKey = format(day.date, 'yyyy-MM')
      if (!groups.has(monthKey)) groups.set(monthKey, [])
      groups.get(monthKey)!.push(day)
    })
    return Array.from(groups.entries())
  }, [data])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p className="font-medium">No transactions to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
      {groupedByMonth.map(([monthKey, days]) => (
        <div key={monthKey}>
          <div className="sticky top-0 bg-white/95 backdrop-blur font-semibold text-foreground py-2 px-3 border-b border-border rounded-t-lg">
            {format(parseISO(monthKey + '-01'), 'MMMM yyyy')}
            <span className="ml-2 text-body font-normal text-muted-foreground">
              {days.length} day{days.length !== 1 ? 's' : ''} · {days.reduce((sum, d) => sum + d.count, 0)} transaction{days.reduce((sum, d) => sum + d.count, 0) !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {days.map(day => (
                <div
                  key={day.date.toISOString()}
                  className="w-full px-3 py-3 flex items-center hover:bg-muted transition-colors text-left cursor-pointer"
                  onMouseEnter={(e) => onHoverDay(day, e)}
                  onMouseLeave={onLeaveDay}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-body font-medium text-foreground w-16">
                      {format(day.date, 'MMM dd')}
                    </div>
                    <div className="flex gap-1">
                      {Object.entries(day.typeBreakdown).map(([type, breakdown]) => (
                        <div
                          key={type}
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: TRANSACTION_TYPE_COLORS[type] || '#64748B' }}
                          title={`${TRANSACTION_TYPE_LABELS[type as keyof typeof TRANSACTION_TYPE_LABELS] || type}: ${breakdown.count}`}
                        />
                      ))}
                    </div>
                    <span className="text-body text-muted-foreground">
                      {day.count} transaction{day.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Monthly Summary View Component
function MonthlySummaryView({
  data,
  intensityMode,
  onHoverMonth,
  onLeaveMonth,
  compact = false,
  maxMonths,
}: {
  data: DayData[]
  intensityMode: 'count' | 'value'
  onHoverMonth: (days: DayData[], e: React.MouseEvent) => void
  onLeaveMonth: () => void
  /** Tighter rows + no inner scroll (collapsed analytics card). */
  compact?: boolean
  /** Show only the most-recent N months (most recent first). */
  maxMonths?: number
}) {
  const monthlyData = useMemo(() => {
    const months = new Map<string, { count: number; value: number; days: number; daysList: DayData[] }>()
    data.forEach(day => {
      const monthKey = format(day.date, 'yyyy-MM')
      if (!months.has(monthKey)) {
        months.set(monthKey, { count: 0, value: 0, days: 0, daysList: [] })
      }
      const m = months.get(monthKey)!
      m.count += day.count
      m.value += day.value
      m.days += 1
      m.daysList.push(day)
    })
    return Array.from(months.entries())
      .map(([key, data]) => ({ month: key, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [data])

  const maxValue = useMemo(() => {
    return Math.max(...monthlyData.map(m => intensityMode === 'count' ? m.count : m.value), 1)
  }, [monthlyData, intensityMode])

  if (monthlyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p className="font-medium">No transactions to display</p>
      </div>
    )
  }

  // Collapsed: show only the most-recent N months, newest first.
  const displayMonths = maxMonths
    ? [...monthlyData].slice(-maxMonths).reverse()
    : monthlyData

  return (
    <div className={cn(compact ? 'space-y-1.5' : 'space-y-2 max-h-[500px] overflow-y-auto pr-2')}>
      {displayMonths.map(month => {
        const displayValue = intensityMode === 'count' ? month.count : month.value
        const percentage = (displayValue / maxValue) * 100

        return (
          <div
            key={month.month}
            className={cn(
              'w-full bg-muted hover:bg-muted rounded-lg transition-colors text-left cursor-pointer',
              compact ? 'p-2' : 'p-3',
            )}
            onMouseEnter={(e) => onHoverMonth(month.daysList, e)}
            onMouseLeave={onLeaveMonth}
          >
            <div className={cn('flex items-center justify-between', compact ? 'mb-1.5' : 'mb-2')}>
              <div className="font-medium text-foreground">
                {format(parseISO(month.month + '-01'), compact ? 'MMM yyyy' : 'MMMM yyyy')}
              </div>
              <div className="text-right">
                <div className="font-semibold text-foreground">
                  {intensityMode === 'count'
                    ? `${month.count} transactions`
                    : `${formatCurrencyCompact(month.value)}`
                  }
                </div>
                {!compact && (
                  <div className="text-helper text-muted-foreground">
                    {month.days} active day{month.days !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
            <div className={cn('bg-slate-200 rounded-full overflow-hidden', compact ? 'h-2' : 'h-3')}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: '#dc2625'
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Monthly Sparkline Component (D3-based)
function MonthlySparkline({ 
  data, 
  intensityMode, 
  displayRange,
  sparklineRef
}: { 
  data: DayData[]
  intensityMode: 'count' | 'value'
  displayRange: { start: Date; end: Date }
  sparklineRef: React.RefObject<SVGSVGElement>
}) {
  const sparklineTooltipRef = useRef<d3.Selection<HTMLDivElement, unknown, null, undefined> | null>(null)

  // Initialize sparkline tooltip
  useEffect(() => {
    if (!sparklineTooltipRef.current) {
      sparklineTooltipRef.current = d3.select('body').append('div')
        .attr('class', 'absolute bg-slate-900 text-white text-helper rounded px-2 py-1 pointer-events-none')
        .style('z-index', '100000')
        .style('opacity', 0)
    }
    return () => {
      if (sparklineTooltipRef.current) {
        sparklineTooltipRef.current.remove()
        sparklineTooltipRef.current = null
      }
    }
  }, [])
  // Generate all months in the display range
  const allMonths = useMemo(() => {
    const months = eachMonthOfInterval({
      start: startOfMonth(displayRange.start),
      end: startOfMonth(displayRange.end)
    })
    return months.map(month => format(month, 'yyyy-MM'))
  }, [displayRange])

  // Aggregate data by month
  const monthlyData = useMemo(() => {
    const months = new Map<string, { count: number; value: number }>()
    data.forEach(day => {
      const monthKey = format(day.date, 'yyyy-MM')
      if (!months.has(monthKey)) {
        months.set(monthKey, { count: 0, value: 0 })
      }
      const m = months.get(monthKey)!
      m.count += day.count
      m.value += day.value
    })
    return months
  }, [data])

  // Create complete monthly totals with all months, filling in zeros
  const monthlyTotals = useMemo(() => {
    return allMonths.map(month => {
      const data = monthlyData.get(month) || { count: 0, value: 0 }
      return { month, ...data }
    })
  }, [allMonths, monthlyData])

  const maxValue = useMemo(() => {
    return Math.max(...monthlyTotals.map(m => intensityMode === 'count' ? m.count : m.value), 1)
  }, [monthlyTotals, intensityMode])

  // Render sparkline with D3
  useEffect(() => {
    if (!sparklineRef.current || monthlyTotals.length === 0) {
      return
    }

    // Clear previous render
    d3.select(sparklineRef.current).selectAll('*').remove()

    const barHeight = 48
    const barGap = 2
    const minBarWidth = 2
    const padding = { top: 20, left: 0, right: 0, bottom: 20 }
    // Calculate width to fit all bars with gaps, ensuring minimum bar width
    const totalGapWidth = (monthlyTotals.length - 1) * barGap
    const availableWidth = 800 // Base width, will scale with viewBox
    const barWidth = Math.max(minBarWidth, (availableWidth - totalGapWidth) / monthlyTotals.length)
    const width = monthlyTotals.length * (barWidth + barGap) + padding.left + padding.right
    const height = padding.top + barHeight + padding.bottom

    const svg = d3.select(sparklineRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;')

    // Create scale for bar heights
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([barHeight, 0])

    // Render bars
    const bars = svg.append('g')
      .attr('transform', `translate(${padding.left}, ${padding.top})`)
      .selectAll('rect')
      .data(monthlyTotals)
      .join('rect')
        .attr('x', (d, i) => i * (barWidth + barGap))
        .attr('y', d => {
          const displayValue = intensityMode === 'count' ? d.count : d.value
          return yScale(displayValue)
        })
        .attr('width', barWidth)
        .attr('height', d => {
          const displayValue = intensityMode === 'count' ? d.count : d.value
          const h = barHeight - yScale(displayValue)
          return Math.max(h, 2)
        })
        .attr('fill', '#cbd5e1')
        .attr('rx', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', function(event, d) {
          d3.select(this).attr('fill', '#94a3b8')
          if (sparklineTooltipRef.current) {
            const monthLabel = format(parseISO(d.month + '-01'), 'MMM yyyy')
            const valueLabel = intensityMode === 'count' 
              ? `${d.count} tx` 
              : `${formatCurrencyCompact(d.value)}`
            sparklineTooltipRef.current
              .html(`${monthLabel}: ${valueLabel}`)
              .style('left', `${event.pageX}px`)
              .style('top', `${event.pageY - 10}px`)
              .style('transform', 'translate(-50%, -100%)')
              .style('opacity', 1)
          }
        })
        .on('mouseleave', function() {
          d3.select(this).attr('fill', '#cbd5e1')
          if (sparklineTooltipRef.current) {
            sparklineTooltipRef.current.style('opacity', 0)
          }
        })

    // Add month labels
    if (monthlyTotals.length > 0) {
      svg.append('text')
        .attr('x', padding.left)
        .attr('y', height - 5)
        .attr('font-size', '10px')
        .attr('fill', '#94a3b8')
        .text(format(parseISO(monthlyTotals[0].month + '-01'), 'MMM'))

      svg.append('text')
        .attr('x', width - padding.right)
        .attr('y', height - 5)
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('fill', '#94a3b8')
        .text(format(parseISO(monthlyTotals[monthlyTotals.length - 1].month + '-01'), 'MMM'))
    }

  }, [monthlyTotals, maxValue, intensityMode, sparklineRef])

  if (monthlyTotals.length === 0) return null

  return (
    <div className="mb-4">
      <div className="text-helper text-muted-foreground mb-2">Monthly Trend</div>
      <svg ref={sparklineRef} className="w-full" />
    </div>
  )
}

export function TransactionCalendarHeatmap({ transactions, stats, showControls = true, dateRange: externalDateRange = null, hideYearPicker = false, viewMode: controlledViewMode, onViewModeChange }: TransactionCalendarHeatmapProps) {
  const [intensityMode, setIntensityMode] = useState<'count' | 'value'>('count')
  const [internalViewMode, setInternalViewMode] = useState<'heatmap' | 'timeline' | 'table'>('heatmap')
  const viewMode = controlledViewMode ?? internalViewMode
  const setViewMode = onViewModeChange ?? setInternalViewMode
  const [yearType, setYearType] = useState<'calendar' | 'financial'>('calendar')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null)
  // Anchored to the hovered cell (centre-x, and the cell's top/bottom edges) so
  // the tooltip can sit directly above (or below) the box, not at the cursor.
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; top: number; bottom: number } | null>(null)
  // Click-to-pin: when true, the same tooltip stays open and expands to show the
  // individual development partners. A ref mirrors it so the d3 cell handlers
  // (created once in an effect) read the latest value without a stale closure.
  const [pinned, setPinned] = useState(false)
  const pinnedRef = useRef(false)
  useEffect(() => { pinnedRef.current = pinned }, [pinned])
  const tooltipBoxRef = useRef<HTMLDivElement>(null)

  const closePinned = () => { setPinned(false); setHoveredDay(null); setTooltipPosition(null) }

  // Close the pinned detail on Escape, or when clicking outside the popup.
  useEffect(() => {
    if (!pinned) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePinned() }
    const onDown = (e: MouseEvent) => {
      if (tooltipBoxRef.current && !tooltipBoxRef.current.contains(e.target as Node)) {
        closePinned()
      }
    }
    window.addEventListener('keydown', onKey)
    // Defer so the click that opened the popup doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
      document.removeEventListener('mousedown', onDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned])
  
  // Refs for D3 rendering
  const svgRef = useRef<SVGSVGElement>(null)
  const sparklineRef = useRef<SVGSVGElement>(null)

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

        const usdValue = getTransactionUSDValueSync(transaction)

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

  // Get available years
  const availableYears = useMemo(() => {
    return getAvailableYears(processedData, yearType)
  }, [processedData, yearType])

  // Set default selected year when data changes or year type changes.
  // Default to the most recent year with data (a single Jan–Dec calendar year)
  // so the heatmap reads as one clean year rather than a multi-year band.
  // Also re-snap to the newest year if the current selection isn't valid for
  // the active calendar (e.g. after toggling CY ↔ FY).
  useMemo(() => {
    if (availableYears.length === 0) return
    if (selectedYear === null || (selectedYear !== -1 && !availableYears.includes(selectedYear))) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears, selectedYear])

  // Get display range for the selected year (or all data if selectedYear is -1).
  // When the wrapper drives the window (externalDateRange), use it directly.
  const displayRange = useMemo(() => {
    if (externalDateRange) {
      return { start: externalDateRange.from, end: externalDateRange.to }
    }
    if (selectedYear === -1 && processedData.length > 0) {
      // Show all data - find min and max dates
      const dates = processedData.map(d => d.date.getTime())
      const minDate = new Date(Math.min(...dates))
      const maxDate = new Date(Math.max(...dates))
      // Extend to full year boundaries for cleaner display
      return {
        start: new Date(minDate.getFullYear(), 0, 1),
        end: new Date(maxDate.getFullYear(), 11, 31)
      }
    }
    if (selectedYear === null) {
      const now = new Date()
      return getYearRange(now.getFullYear(), yearType)
    }
    return getYearRange(selectedYear, yearType)
  }, [selectedYear, yearType, processedData, externalDateRange])

  // Filter data by selected year range (or show all if selectedYear is -1)
  const filteredData = useMemo(() => {
    if (!externalDateRange && selectedYear === -1) {
      return processedData
    }
    return processedData.filter((day) =>
      isWithinInterval(day.date, { start: displayRange.start, end: displayRange.end })
    )
  }, [processedData, displayRange, selectedYear])

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const { start, end } = displayRange
    const startDate = startOfWeek(start, { weekStartsOn: 0 })
    const endDate = endOfWeek(end, { weekStartsOn: 0 })

    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const dataMap = new Map(
      filteredData.map((day) => [format(day.date, 'yyyy-MM-dd'), day])
    )

    const maxValue = Math.max(
      ...filteredData.map((d) => (intensityMode === 'count' ? d.count : d.value)),
      1
    )

    const weeks: Array<Array<{ date: Date; data: DayData | null; intensity: number }>> = []
    let currentWeek: Array<{ date: Date; data: DayData | null; intensity: number }> = []

    days.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd')
      const dayData = dataMap.get(dateKey) || null

      let intensity = 0
      if (dayData) {
        const value = intensityMode === 'count' ? dayData.count : dayData.value
        intensity = Math.min(Math.sqrt(value / maxValue), 1)
      }

      currentWeek.push({ date: day, data: dayData, intensity })

      if (day.getDay() === 6) {
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
    // GitHub-style density: one hue, darker = more transactions. `intensity` is
    // √(count / busiest-day count), so the shade reflects the NUMBER of
    // transactions that day, regardless of type or value. Empty days show the
    // lightest swatch so the full calendar grid stays visible.
    if (!dayData || dayData.count === 0) return DENSITY_SCALE[0]
    if (intensity <= 0.25) return DENSITY_SCALE[1]
    if (intensity <= 0.5) return DENSITY_SCALE[2]
    if (intensity <= 0.75) return DENSITY_SCALE[3]
    return DENSITY_SCALE[4]
  }

  // Get month labels with proper positioning
  const monthLabels = useMemo(() => {
    const months: Array<{ month: number; year: number; weekIndex: number; startWeek: number }> = []
    const seen = new Set<string>()

    calendarGrid.weeks.forEach((week, weekIndex) => {
      const firstDay = week[0]?.date
      if (!firstDay) return

      const monthKey = `${firstDay.getFullYear()}-${firstDay.getMonth()}`
      if (!seen.has(monthKey)) {
        seen.add(monthKey)
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
  }, [calendarGrid.weeks])

  // Render heatmap with D3
  useEffect(() => {
    if (viewMode !== 'heatmap' || !svgRef.current || calendarGrid.weeks.length === 0) {
      return
    }

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove()

    // Both views stretch to the card width (w-full + viewBox scaling). A
    // slightly larger base cell in the collapsed card gives a taller aspect
    // ratio, so the scaled-down cells stay legible rather than razor-thin.
    const cellSize = showControls ? 13 : 16
    const cellGap = 1
    const weekWidth = cellSize + cellGap
    const dayHeight = cellSize + cellGap
    const weekCount = calendarGrid.weeks.length
    const dayLabelWidth = 24
    const monthLabelHeight = 20
    const padding = { top: monthLabelHeight, left: dayLabelWidth, right: 10, bottom: 10 }

    const width = padding.left + (weekCount * weekWidth) + padding.right
    const height = padding.top + (7 * dayHeight) + padding.bottom

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto; font: 10px sans-serif;')

    // Create groups
    const monthLabelGroup = svg.append('g').attr('class', 'month-labels')
    const dayLabelGroup = svg.append('g').attr('class', 'day-labels')
    const calendarGroup = svg.append('g').attr('class', 'calendar-cells')
      .attr('transform', `translate(${padding.left}, ${padding.top})`)

    // Render month labels
    monthLabels.forEach(({ month, year, startWeek }, idx) => {
      const nextMonthIndex = monthLabels.findIndex(
        (m, i) => i > idx && (m.month !== month || m.year !== year)
      )
      const nextStartWeek = nextMonthIndex === -1 
        ? weekCount
        : monthLabels[nextMonthIndex].startWeek
      const weeksUntilNext = nextStartWeek - startWeek
      
      const monthX = padding.left + (startWeek * weekWidth)
      const monthWidth = Math.max(weeksUntilNext, 1) * weekWidth

      monthLabelGroup.append('text')
        .attr('x', monthX + monthWidth / 2)
        .attr('y', monthLabelHeight / 2 + 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .attr('fill', '#475569')
        .text(format(new Date(year, month, 1), 'MMM'))
    })

    // Render day labels
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    dayLabels.forEach((label, idx) => {
      dayLabelGroup.append('text')
        .attr('x', dayLabelWidth / 2)
        .attr('y', padding.top + (idx * dayHeight) + (dayHeight / 2) + 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .attr('fill', '#64748b')
        .text(label)
    })

    // Prepare data for D3
    const dayData: Array<{
      weekIdx: number
      dayIdx: number
      date: Date
      data: DayData | null
      intensity: number
      color: string
      hasData: boolean
      isInYearRange: boolean
    }> = []

    calendarGrid.weeks.forEach((week, weekIdx) => {
      week.forEach((day, dayIdx) => {
        const dayColor = getDayColor(day.data, day.intensity)
        const hasData = day.data && day.data.count > 0
        const isInYearRange = isWithinInterval(day.date, { 
          start: displayRange.start, 
          end: displayRange.end 
        })

        dayData.push({
          weekIdx,
          dayIdx,
          date: day.date,
          data: day.data,
          intensity: day.intensity,
          color: dayColor,
          hasData,
          isInYearRange
        })
      })
    })

    // Render calendar cells
    const cells = calendarGroup.selectAll('rect.calendar-cell')
      .data(dayData)
      .join('rect')
        .attr('class', 'calendar-cell')
        .attr('x', d => d.weekIdx * weekWidth + 0.5)
        .attr('y', d => d.dayIdx * dayHeight + 0.5)
        .attr('width', cellSize - 1)
        .attr('height', cellSize - 1)
        .attr('rx', 2)
        .attr('fill', d => d.hasData ? d.color : 'transparent')
        .attr('stroke', d => d.hasData ? 'rgba(0,0,0,0.15)' : '#f1f5f9')
        .attr('stroke-width', 1)
        .attr('opacity', d => d.isInYearRange ? 1 : 0.2)
        .style('cursor', d => d.hasData ? 'pointer' : 'default')
        // Hover/click drive a single React tooltip (so clicking can expand the
        // same popup in place). pinnedRef guards against hover changing the
        // pinned day. cursor coords feed the React tooltip's position.
        // Hover works on every day, including empty ones (the tooltip then says
        // "no transactions"); only days WITH data can be clicked to pin/expand.
        .on('mouseenter', function(event, d) {
          d3.select(this).attr('stroke', '#94a3b8').attr('stroke-width', 2)
          if (!pinnedRef.current) {
            const r = (this as SVGRectElement).getBoundingClientRect()
            setHoveredDay(d.data ?? { date: d.date, transactions: [], count: 0, value: 0, typeBreakdown: {} })
            setTooltipPosition({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom })
          }
        })
        .on('click', function(event, d) {
          if (d.data && d.hasData) {
            const r = (this as SVGRectElement).getBoundingClientRect()
            setHoveredDay(d.data)
            setTooltipPosition({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom })
            setPinned(true)
          }
        })
        .on('mouseleave', function(event, d) {
          d3.select(this)
            .attr('stroke', d.hasData ? 'rgba(0,0,0,0.15)' : '#f1f5f9')
            .attr('stroke-width', 1)
          if (!pinnedRef.current) {
            setHoveredDay(null)
            setTooltipPosition(null)
          }
        })

  }, [viewMode, calendarGrid, monthLabels, displayRange, intensityMode, filteredData, showControls])

  // Timeline-view hover → same anchored tooltip (above the hovered row).
  const handleDayHover = (day: DayData, e: React.MouseEvent) => {
    setHoveredDay(day)
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPosition({ x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom })
  }

  const handleDayLeave = () => {
    setHoveredDay(null)
    setTooltipPosition(null)
  }

  // Combine a month's days into one summary for the shared day tooltip.
  const handleMonthHover = (days: DayData[], e: React.MouseEvent) => {
    const combined: DayData = {
      date: days[0]?.date || new Date(),
      transactions: days.flatMap(d => d.transactions),
      count: days.reduce((sum, d) => sum + d.count, 0),
      value: days.reduce((sum, d) => sum + d.value, 0),
      typeBreakdown: {}
    }
    days.forEach(day => {
      Object.entries(day.typeBreakdown).forEach(([type, breakdown]) => {
        if (!combined.typeBreakdown[type]) combined.typeBreakdown[type] = { count: 0, value: 0 }
        combined.typeBreakdown[type].count += breakdown.count
        combined.typeBreakdown[type].value += breakdown.value
      })
    })
    handleDayHover(combined, e)
  }

  // Collapsed has no view toggle, so it follows the default viewMode (heatmap) —
  // the same chart view as expanded, just rendered at natural size and centred.
  const effectiveView = viewMode

  // Format year label
  const getYearLabel = (year: number) => {
    if (yearType === 'calendar') {
      return year.toString()
    } else {
      return `FY ${year}/${(year + 1).toString().slice(-2)}`
    }
  }

  if (processedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="font-medium">No transaction data available</p>
          <p className="text-helper mt-2">Add transactions to see the calendar heat map</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 relative">
      {/* Controls — hidden in the collapsed analytics card. LEFT: calendar
          (CY/FY) + year picker. RIGHT: view-mode toggle. */}
      {showControls && (
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Calendar type + year picker (left) — hidden when the wrapper supplies
            its own calendar/year picker (hideYearPicker). */}
        <div className="flex items-center gap-2 flex-wrap">
          {!hideYearPicker && (
          <>
          <ChartViewToggle
            ariaLabel="Calendar type"
            variant="text"
            value={yearType}
            onValueChange={(v) => setYearType(v as 'calendar' | 'financial')}
            options={[
              { value: 'calendar', label: 'Calendar Year' },
              { value: 'financial', label: 'Financial Year' },
            ]}
          />
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="h-8 w-auto min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-1">All years</SelectItem>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {getYearLabel(y)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </>
          )}
        </div>

        {/* View Mode Toggle (right) */}
        <div className="flex gap-1 rounded-lg p-1 bg-muted">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('heatmap')}
            className={cn("h-7 px-2", viewMode === 'heatmap' ? "bg-white shadow-sm text-foreground hover:bg-white" : "text-muted-foreground hover:text-foreground")}
            title="Heatmap view"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('timeline')}
            className={cn("h-7 px-2", viewMode === 'timeline' ? "bg-white shadow-sm text-foreground hover:bg-white" : "text-muted-foreground hover:text-foreground")}
            title="Timeline view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('table')}
            className={cn("h-7 px-2", viewMode === 'table' ? "bg-white shadow-sm text-foreground hover:bg-white" : "text-muted-foreground hover:text-foreground")}
            title="Table view"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      )}

      {/* View Content */}
      {effectiveView === 'heatmap' && (
        <>
          {/* Calendar Grid - D3 rendered. The SVG scales to the card width via
              its viewBox (height follows the aspect ratio), so both collapsed
              and expanded fill the full card/modal width edge-to-edge. */}
          <div className="overflow-x-auto w-full">
            <svg ref={svgRef} className="w-full" />
          </div>

          {/* Legend — GitHub-style density scale (cells are coloured by the
              number of transactions that day, lightest = none → darkest = busiest). */}
          <div className="flex items-center justify-end gap-2 text-helper text-muted-foreground">
            <span>Fewer</span>
            <div className="flex items-center gap-1">
              {DENSITY_SCALE.map((color) => (
                <div
                  key={color}
                  className="w-3 h-3 rounded-sm border border-slate-200"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </>
      )}

      {effectiveView === 'timeline' && (
        <TimelineView
          data={filteredData}
          onHoverDay={handleDayHover}
          onLeaveDay={handleDayLeave}
        />
      )}

      {effectiveView === 'table' && (
        <ChartDataTable
          rows={[...filteredData]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((d) => ({ date: format(d.date, 'dd MMM yyyy'), count: d.count, value: Math.round(d.value) }))}
          columns={[
            { key: 'date', label: 'Date', numeric: false },
            { key: 'count', label: 'Transactions', numeric: true, plainNumber: true },
            { key: 'value', label: 'Value (USD)', numeric: true, currency: 'USD' },
          ]}
          currency="USD"
          sortable
          maxHeight={460}
        />
      )}

      {/* Unified hover/click tooltip. Hover → per-type count·value. Click pins
          it and expands the SAME popup to the development partners — each links
          to the donor (org) and to the activity. Names wrap. */}
      {hoveredDay && tooltipPosition && (() => {
        const usdOf = (t: Transaction) => Math.abs(getTransactionUSDValueSync(t))
        type Item = { provider: string; providerId?: string; activityId?: string; activityName?: string; count: number; value: number }
        const byType = new Map<string, { count: number; value: number; items: Map<string, Item> }>()
        hoveredDay.transactions.forEach((t) => {
          const type = t.transaction_type || 'unknown'
          if (!byType.has(type)) byType.set(type, { count: 0, value: 0, items: new Map() })
          const g = byType.get(type)!
          const v = usdOf(t)
          g.count += 1; g.value += v
          // Aggregate by partner + activity so each row is one clickable pair.
          const key = `${t.providerId || ''}|${t.activityId || ''}|${t.provider || ''}`
          const it = g.items.get(key) || { provider: t.provider || 'Unknown partner', providerId: t.providerId, activityId: t.activityId, activityName: t.activityName, count: 0, value: 0 }
          it.count += 1; it.value += v; g.items.set(key, it)
        })
        const groups = Array.from(byType.entries()).sort((a, b) => b[1].value - a[1].value)
        const half = 165
        const margin = 12
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800
        const left = Math.min(Math.max(tooltipPosition.x, half + margin), vw - half - margin)
        // Prefer sitting ABOVE the hovered cell; flip below only if the cell is
        // too close to the top of the viewport to fit the popup above it.
        const above = tooltipPosition.top > vh * 0.3
        return (
          <div
            ref={tooltipBoxRef}
            className={cn(
              'fixed z-[10005] bg-white border border-border rounded-lg shadow-xl w-[330px] overflow-hidden',
              pinned ? 'pointer-events-auto' : 'pointer-events-none',
            )}
            style={
              above
                ? { left, top: tooltipPosition.top - 8, transform: 'translate(-50%, -100%)' }
                : { left, top: tooltipPosition.bottom + 8, transform: 'translate(-50%, 0)' }
            }
          >
            {/* Shaded header */}
            <div className="flex items-start justify-between gap-2 bg-surface-muted px-3 py-2 border-b border-border">
              <p className="font-semibold text-foreground text-body">{format(hoveredDay.date, 'EEEE, dd MMM yyyy')}</p>
              {pinned && (
                <button onClick={closePinned} className="text-muted-foreground hover:text-foreground flex-shrink-0" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Body */}
            <div className={cn('px-3 py-2.5', pinned ? 'max-h-[55vh] overflow-auto' : '')}>
            {groups.length === 0 ? (
              <p className="text-helper text-muted-foreground">No reported activity on this day</p>
            ) : (
            <>
            <div className="space-y-2">
              {groups.map(([type, g]) => (
                <div key={type}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: calTypeColor(type) }} />
                      <span className="text-body font-medium text-foreground truncate">{calTypeLabel(type)}</span>
                    </div>
                    <span className="text-helper text-muted-foreground whitespace-nowrap">{g.count} • {formatCurrencyCompact(g.value)}</span>
                  </div>
                  {pinned && (
                    <div className="pl-5 mt-1 space-y-1.5">
                      {Array.from(g.items.values()).sort((a, b) => b.value - a.value).map((it, i) => (
                        <div key={i} className="text-helper border-b border-slate-100 last:border-0 pb-1.5 last:pb-0">
                          {/* Development partner (→ donor page) + value */}
                          <div className="flex items-start justify-between gap-2">
                            {it.providerId ? (
                              <Link href={`/organizations/${it.providerId}`} className="text-primary hover:underline break-words leading-snug font-medium">
                                {it.provider}
                              </Link>
                            ) : (
                              <span className="text-foreground break-words leading-snug font-medium">{it.provider}</span>
                            )}
                            <span className="text-foreground whitespace-nowrap flex-shrink-0">{formatCurrencyCompact(it.value)}</span>
                          </div>
                          {/* Activity name (→ activity page) */}
                          {it.activityId ? (
                            <Link href={`/activities/${it.activityId}`} className="mt-0.5 flex items-start gap-1 text-muted-foreground hover:text-foreground hover:underline leading-snug">
                              <ExternalLink className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              <span className="break-words">{it.activityName || 'View activity'}</span>
                            </Link>
                          ) : it.activityName ? (
                            <p className="mt-0.5 text-muted-foreground break-words leading-snug">{it.activityName}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {!pinned && (
              <p className="text-[11px] text-muted-foreground mt-2">Click to see the development partners ↗</p>
            )}
            </>
            )}
            </div>
          </div>
        )
      })()}

    </div>
  )
}

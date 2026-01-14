"use client"

import React, { useMemo, useState, useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, 
  isWithinInterval, startOfDay, parseISO, eachMonthOfInterval, startOfMonth } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Grid3x3, List, BarChart3 } from 'lucide-react'
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
  stats?: {
    totalTransactions: number
    totalValue: number
    activeDays: number
    avgPerDay: number
  }
}

// Color scheme for transaction types
const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  '1': '#7b95a7',   // Incoming Funds - Cool Steel
  '2': '#4c5568',   // Outgoing Commitment - Blue Slate
  // IATI Standard v2.03 transaction type colors
  '3': '#dc2625',   // Disbursement - Primary Scarlet
  '4': '#4c5568',   // Expenditure - Blue Slate
  '5': '#7b95a7',   // Interest Payment - Cool Steel
  '6': '#7b95a7',   // Loan Repayment - Cool Steel
  '7': '#4c5568',   // Reimbursement - Blue Slate
  '8': '#cfd0d5',   // Purchase of Equity - Pale Slate
  '9': '#cfd0d5',   // Sale of Equity - Pale Slate
  '10': '#7b95a7',  // Credit Guarantee - Cool Steel
  '11': '#dc2625',  // Incoming Commitment - Primary Scarlet
  '12': '#7b95a7',  // Outgoing Pledge - Cool Steel
  '13': '#cfd0d5',  // Incoming Pledge - Pale Slate
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

// Format currency value in abbreviated form
const formatCurrencyAbbreviated = (value: number): string => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toFixed(0)
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
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p className="font-medium">No transactions to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
      {groupedByMonth.map(([monthKey, days]) => (
        <div key={monthKey}>
          <div className="sticky top-0 bg-white/95 backdrop-blur font-semibold text-slate-700 py-2 px-3 border-b border-slate-200 rounded-t-lg">
            {format(parseISO(monthKey + '-01'), 'MMMM yyyy')}
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({days.length} day{days.length !== 1 ? 's' : ''}, {days.reduce((sum, d) => sum + d.count, 0)} transactions)
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {days.map(day => {
              const totalValue = day.value
              return (
                <div
                  key={day.date.toISOString()}
                  className="w-full px-3 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  onMouseEnter={(e) => onHoverDay(day, e)}
                  onMouseLeave={onLeaveDay}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-slate-900 w-16">
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
                    <span className="text-sm text-slate-500">
                      {day.count} transaction{day.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    ${formatCurrencyAbbreviated(totalValue)}
                  </div>
                </div>
              )
            })}
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
  onLeaveMonth
}: { 
  data: DayData[]
  intensityMode: 'count' | 'value'
  onHoverMonth: (days: DayData[], e: React.MouseEvent) => void
  onLeaveMonth: () => void
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
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p className="font-medium">No transactions to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
      {monthlyData.map(month => {
        const displayValue = intensityMode === 'count' ? month.count : month.value
        const percentage = (displayValue / maxValue) * 100
        
        return (
          <div
            key={month.month}
            className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-left cursor-pointer"
            onMouseEnter={(e) => onHoverMonth(month.daysList, e)}
            onMouseLeave={onLeaveMonth}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-slate-900">
                {format(parseISO(month.month + '-01'), 'MMMM yyyy')}
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-900">
                  {intensityMode === 'count' 
                    ? `${month.count} transactions` 
                    : `$${formatCurrencyAbbreviated(month.value)}`
                  }
                </div>
                <div className="text-xs text-slate-500">
                  {month.days} active day{month.days !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
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
        .attr('class', 'absolute bg-slate-900 text-white text-xs rounded px-2 py-1 pointer-events-none z-50')
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
              : `$${formatCurrencyAbbreviated(d.value)}`
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
      <div className="text-xs text-slate-500 mb-2">Monthly Trend</div>
      <svg ref={sparklineRef} className="w-full" />
    </div>
  )
}

export function TransactionCalendarHeatmap({ transactions, stats }: TransactionCalendarHeatmapProps) {
  const [intensityMode, setIntensityMode] = useState<'count' | 'value'>('count')
  const [viewMode, setViewMode] = useState<'heatmap' | 'timeline' | 'monthly'>('heatmap')
  const [yearType, setYearType] = useState<'calendar' | 'financial'>('calendar')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  
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

  // Get available years
  const availableYears = useMemo(() => {
    return getAvailableYears(processedData, yearType)
  }, [processedData, yearType])

  // Set default selected year when data changes or year type changes
  useMemo(() => {
    if (availableYears.length > 0 && (selectedYear === null || !availableYears.includes(selectedYear))) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears, selectedYear])

  // Get display range for the selected year
  const displayRange = useMemo(() => {
    if (selectedYear === null) {
      const now = new Date()
      return getYearRange(now.getFullYear(), yearType)
    }
    return getYearRange(selectedYear, yearType)
  }, [selectedYear, yearType])

  // Filter data by selected year range
  const filteredData = useMemo(() => {
    return processedData.filter((day) =>
      isWithinInterval(day.date, { start: displayRange.start, end: displayRange.end })
    )
  }, [processedData, displayRange])

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
    if (!dayData || dayData.count === 0) {
      return 'transparent'
    }

    const colorWeights: Array<{ color: string; weight: number }> = []

    Object.entries(dayData.typeBreakdown).forEach(([type, breakdown]) => {
      const weight = intensityMode === 'count' ? breakdown.count : breakdown.value
      const color = TRANSACTION_TYPE_COLORS[type] || '#64748B'

      if (weight > 0) {
        colorWeights.push({ color, weight })
      }
    })

    if (colorWeights.length === 0) {
      return 'transparent'
    }

    const baseColor = blendColors(colorWeights)
    const rgb = hexToRgb(baseColor)
    if (!rgb) return baseColor

    const intensityScale = 0.3 + intensity * 0.7
    const r = Math.round(Math.min(rgb.r * intensityScale, 255))
    const g = Math.round(Math.min(rgb.g * intensityScale, 255))
    const b = Math.round(Math.min(rgb.b * intensityScale, 255))

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
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

  // D3 tooltip (created once, reused)
  const tooltipRef = useRef<d3.Selection<HTMLDivElement, unknown, null, undefined> | null>(null)

  // Initialize D3 tooltip
  useEffect(() => {
    if (!tooltipRef.current) {
      tooltipRef.current = d3.select('body').append('div')
        .attr('class', 'fixed bg-white border border-slate-200 rounded-lg shadow-xl p-4 z-50 pointer-events-none')
        .style('opacity', 0)
        .style('min-width', '280px')
        .style('max-width', '350px')
    }
    return () => {
      // Cleanup on unmount
      if (tooltipRef.current) {
        tooltipRef.current.remove()
        tooltipRef.current = null
      }
    }
  }, [])

  // Render heatmap with D3
  useEffect(() => {
    if (viewMode !== 'heatmap' || !svgRef.current || calendarGrid.weeks.length === 0) {
      return
    }

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove()

    const cellSize = 13
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
        .on('mouseenter', function(event, d) {
          if (d.data && d.hasData) {
            d3.select(this)
              .attr('stroke', '#94a3b8')
              .attr('stroke-width', 2)
            
            if (tooltipRef.current) {
              const tooltip = tooltipRef.current
              const dateStr = format(d.data.date, 'EEEE, MMMM dd, yyyy')
              
              // Build type breakdown HTML
              const typeBreakdown = Object.entries(d.data.typeBreakdown)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([type, breakdown]) => {
                  const typeLabel = TRANSACTION_TYPE_LABELS[type as keyof typeof TRANSACTION_TYPE_LABELS] || type
                  const typeColor = TRANSACTION_TYPE_COLORS[type] || '#64748B'
                  return `
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 12px; height: 12px; background-color: ${typeColor}; border-radius: 2px; flex-shrink: 0;"></div>
                        <span style="color: #475569;">${typeLabel}</span>
                      </div>
                      <div style="color: #0f172a; font-weight: 500; margin-left: 8px;">
                        ${breakdown.count} • $${formatCurrencyAbbreviated(breakdown.value)}
                      </div>
                    </div>
                  `
                }).join('')

              tooltip.html(`
                <p style="font-weight: 600; color: #0f172a; margin-bottom: 12px; font-size: 16px;">${dateStr}</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                  <div style="background-color: #f8fafc; padding: 8px; border-radius: 4px;">
                    <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${d.data.count}</div>
                    <div style="font-size: 12px; color: #64748b;">Transactions</div>
                  </div>
                  <div style="background-color: #f8fafc; padding: 8px; border-radius: 4px;">
                    <div style="font-size: 18px; font-weight: 700; color: #0f172a;">$${formatCurrencyAbbreviated(d.data.value)}</div>
                    <div style="font-size: 12px; color: #64748b;">Total Value</div>
                  </div>
                </div>
                <div style="border-top: 1px solid #e2e8f0; padding-top: 12px;">
                  <p style="font-size: 12px; font-weight: 500; color: #334155; margin-bottom: 8px;">By Transaction Type</p>
                  <div>${typeBreakdown}</div>
                </div>
              `)
                .style('left', `${event.pageX}px`)
                .style('top', `${event.pageY - 10}px`)
                .style('transform', 'translate(-50%, -100%)')
                .style('opacity', 1)
            }
          }
        })
        .on('mousemove', function(event, d) {
          if (d.data && d.hasData && tooltipRef.current) {
            tooltipRef.current
              .style('left', `${event.pageX}px`)
              .style('top', `${event.pageY - 10}px`)
          }
        })
        .on('mouseleave', function(event, d) {
          if (d.hasData) {
            d3.select(this)
              .attr('stroke', d.hasData ? 'rgba(0,0,0,0.15)' : '#f1f5f9')
              .attr('stroke-width', 1)
          }
          if (tooltipRef.current) {
            tooltipRef.current.style('opacity', 0)
          }
        })

  }, [viewMode, calendarGrid, monthLabels, displayRange, intensityMode, filteredData])

  // Tooltip handlers (kept for compatibility, but D3 tooltip is used)
  const handleDayHover = (day: DayData, e: React.MouseEvent) => {
    setHoveredDay(day)
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    })
  }

  const handleDayLeave = () => {
    setHoveredDay(null)
    setTooltipPosition(null)
  }

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
        <div className="flex items-center gap-4 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex gap-1 border rounded-lg p-1 bg-white">
            <Button
              variant={viewMode === 'heatmap' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('heatmap')}
              className="h-7 px-2"
              title="Heatmap view"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('timeline')}
              className="h-7 px-2"
              title="Timeline view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('monthly')}
              className="h-7 px-2"
              title="Monthly summary"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Year Type Toggle */}
          <div className="flex gap-1 border rounded-lg p-1 bg-white">
            <Button
              variant={yearType === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setYearType('calendar')}
              className={cn(
                'h-7 px-3 text-xs',
                yearType === 'calendar'
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : ''
              )}
            >
              Calendar Year
            </Button>
            <Button
              variant={yearType === 'financial' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setYearType('financial')}
              className={cn(
                'h-7 px-3 text-xs',
                yearType === 'financial'
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : ''
              )}
            >
              Financial Year
            </Button>
          </div>

          {/* Year Selector */}
          {availableYears.length > 0 && (
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              {availableYears.slice(0, 5).map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    'h-7 px-3 text-xs',
                    selectedYear === year
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : ''
                  )}
                >
                  {getYearLabel(year)}
                </Button>
              ))}
            </div>
          )}

          {/* Intensity Toggle (for heatmap and monthly) */}
          {(viewMode === 'heatmap' || viewMode === 'monthly') && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">
                {viewMode === 'heatmap' ? 'Intensity:' : 'Show:'}
              </span>
              <div className="flex gap-1">
                <Button
                  variant={intensityMode === 'count' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIntensityMode('count')}
                  className={cn(
                    'h-7 px-3 text-xs',
                    intensityMode === 'count'
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
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
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  )}
                >
                  Value
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'heatmap' && (
        <>
          {/* Calendar Grid - D3 rendered */}
          <div className="overflow-x-auto w-full">
            <svg ref={svgRef} className="w-full" />
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-600">Less</span>
              <div className="flex gap-1">
                {[0, 0.25, 0.5, 0.75, 1.0].map((intensity) => {
                  const color = intensity === 0 ? '#f1f5f9' : getDayColor(
                    {
                      date: new Date(),
                      transactions: [],
                      count: 1,
                      value: 1000,
                      typeBreakdown: { '3': { count: 1, value: 1000 } },
                    },
                    intensity
                  )
                  return (
                    <div
                      key={intensity}
                      className="w-3 h-3 rounded-sm"
                      style={{ 
                        backgroundColor: color,
                        border: intensity === 0 ? '1px solid #e2e8f0' : '1px solid rgba(0,0,0,0.1)'
                      }}
                    />
                  )
                })}
              </div>
              <span className="text-slate-600">More</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="text-slate-600 font-medium">Transaction types:</span>
              {Object.entries(TRANSACTION_TYPE_COLORS)
                .filter(([type]) => processedData.some((d) => d.typeBreakdown[type]))
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
        </>
      )}

      {viewMode === 'timeline' && (
        <TimelineView 
          data={filteredData} 
          onHoverDay={handleDayHover}
          onLeaveDay={handleDayLeave}
        />
      )}

      {viewMode === 'monthly' && (
        <MonthlySummaryView 
          data={filteredData} 
          intensityMode={intensityMode}
          onHoverMonth={(days, e) => {
            // Aggregate all days into one summary
            const combined: DayData = {
              date: days[0]?.date || new Date(),
              transactions: days.flatMap(d => d.transactions),
              count: days.reduce((sum, d) => sum + d.count, 0),
              value: days.reduce((sum, d) => sum + d.value, 0),
              typeBreakdown: {}
            }
            days.forEach(day => {
              Object.entries(day.typeBreakdown).forEach(([type, breakdown]) => {
                if (!combined.typeBreakdown[type]) {
                  combined.typeBreakdown[type] = { count: 0, value: 0 }
                }
                combined.typeBreakdown[type].count += breakdown.count
                combined.typeBreakdown[type].value += breakdown.value
              })
            })
            handleDayHover(combined, e)
          }}
          onLeaveMonth={handleDayLeave}
        />
      )}

      {/* Detailed Tooltip (for Timeline and Monthly views only) */}
      {viewMode !== 'heatmap' && hoveredDay && tooltipPosition && (
        <div
          className="fixed bg-white border border-slate-200 rounded-lg shadow-xl p-4 z-50 pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-8px',
            minWidth: '280px',
            maxWidth: '350px',
          }}
        >
          <p className="font-semibold text-slate-900 mb-3 text-base">
            {format(hoveredDay.date, 'EEEE, MMMM dd, yyyy')}
          </p>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-lg font-bold text-slate-900">{hoveredDay.count}</div>
              <div className="text-xs text-slate-500">Transactions</div>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-lg font-bold text-slate-900">${formatCurrencyAbbreviated(hoveredDay.value)}</div>
              <div className="text-xs text-slate-500">Total Value</div>
            </div>
          </div>

          {/* Type Breakdown */}
          <div className="border-t border-slate-200 pt-3">
            <p className="text-xs font-medium text-slate-700 mb-2">By Transaction Type</p>
            <div className="space-y-1.5">
              {Object.entries(hoveredDay.typeBreakdown)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([type, breakdown]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: TRANSACTION_TYPE_COLORS[type] || '#64748B' }}
                      />
                      <span className="text-slate-600 truncate">
                        {TRANSACTION_TYPE_LABELS[type as keyof typeof TRANSACTION_TYPE_LABELS] || type}
                      </span>
                    </div>
                    <div className="text-slate-900 font-medium ml-2">
                      {breakdown.count} • ${formatCurrencyAbbreviated(breakdown.value)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero Cards at Bottom */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-200">
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{stats.totalTransactions.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">Total Transactions</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">${formatCurrencyAbbreviated(stats.totalValue)}</div>
            <div className="text-xs text-slate-500 mt-1">Total Value</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{stats.activeDays.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">Active Days</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{stats.avgPerDay.toFixed(1)}</div>
            <div className="text-xs text-slate-500 mt-1">Avg/Day</div>
          </div>
        </div>
      )}
    </div>
  )
}

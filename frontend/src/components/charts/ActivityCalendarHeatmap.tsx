"use client"

import React, { useMemo, useState, useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { format, startOfWeek, endOfWeek, eachDayOfInterval,
  isWithinInterval, startOfDay, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Grid3x3, List, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ActivityEventType = 'activity_created' | 'activity_updated' | 'transaction_created' | 'budget_created' | 'disbursement_created' | 'comment_added' | 'document_uploaded' | 'location_updated' | 'sector_updated' | 'result_added' | 'contact_updated' | 'status_changed' | 'partner_updated' | 'other'

interface UserActivityEvent {
  date: string
  type: ActivityEventType
  description: string
}

interface ActivityCalendarHeatmapProps {
  events: UserActivityEvent[]
}

// Color scheme for activity types
const EVENT_TYPE_COLORS: Record<ActivityEventType, string> = {
  'activity_created': '#22c55e',    // Green - new activities
  'activity_updated': '#3b82f6',    // Blue - updates
  'transaction_created': '#f59e0b', // Amber - transactions
  'budget_created': '#8b5cf6',      // Purple - budgets
  'disbursement_created': '#ec4899', // Pink - disbursements
  'comment_added': '#06b6d4',       // Cyan - comments
  'document_uploaded': '#14b8a6',   // Teal - documents
  'location_updated': '#84cc16',    // Lime - locations
  'sector_updated': '#f97316',      // Orange - sectors
  'result_added': '#6366f1',        // Indigo - results
  'contact_updated': '#a855f7',     // Purple - contacts
  'status_changed': '#ef4444',      // Red - status changes
  'partner_updated': '#0ea5e9',     // Sky blue - partners/orgs
  'other': '#64748b',               // Slate - other actions
}

// Singular labels
const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
  'activity_created': 'Activity Created',
  'activity_updated': 'Activity Updated',
  'transaction_created': 'Transaction Added',
  'budget_created': 'Budget Added',
  'disbursement_created': 'Disbursement Added',
  'comment_added': 'Comment Added',
  'document_uploaded': 'Document Uploaded',
  'location_updated': 'Location Updated',
  'sector_updated': 'Sector Updated',
  'result_added': 'Result Added',
  'contact_updated': 'Contact Updated',
  'status_changed': 'Status Changed',
  'partner_updated': 'Partner Updated',
  'other': 'Other Action',
}

// Plural labels (for count > 1)
const EVENT_TYPE_LABELS_PLURAL: Record<ActivityEventType, string> = {
  'activity_created': 'Activities Created',
  'activity_updated': 'Activities Updated',
  'transaction_created': 'Transactions Added',
  'budget_created': 'Budgets Added',
  'disbursement_created': 'Disbursements Added',
  'comment_added': 'Comments Added',
  'document_uploaded': 'Documents Uploaded',
  'location_updated': 'Locations Updated',
  'sector_updated': 'Sectors Updated',
  'result_added': 'Results Added',
  'contact_updated': 'Contacts Updated',
  'status_changed': 'Status Changes',
  'partner_updated': 'Partners Updated',
  'other': 'Other Actions',
}

// Helper to get label with proper pluralization
const getEventTypeLabel = (type: ActivityEventType, count: number): string => {
  return count === 1 ? EVENT_TYPE_LABELS[type] : EVENT_TYPE_LABELS_PLURAL[type]
}

interface DayData {
  date: Date
  events: UserActivityEvent[]
  count: number
  typeBreakdown: Record<ActivityEventType, number>
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

// Get available years from data
function getAvailableYears(data: DayData[], yearType: 'calendar' | 'financial'): number[] {
  const years = new Set<number>()
  data.forEach(d => {
    if (yearType === 'calendar') {
      years.add(d.date.getFullYear())
    } else {
      const month = d.date.getMonth()
      const year = d.date.getFullYear()
      years.add(month >= 6 ? year : year - 1)
    }
  })
  return Array.from(years).sort((a, b) => b - a)
}

// Get year range based on type
function getYearRange(year: number, yearType: 'calendar' | 'financial'): { start: Date; end: Date } {
  if (yearType === 'calendar') {
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31)
    }
  } else {
    return {
      start: new Date(year, 6, 1),
      end: new Date(year + 1, 5, 30)
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
        <p className="font-medium">No activity to display</p>
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
              ({days.length} day{days.length !== 1 ? 's' : ''}, {days.reduce((sum, d) => sum + d.count, 0)} actions)
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {days.map(day => (
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
                    {Object.entries(day.typeBreakdown).map(([type, count]) => (
                      count > 0 && (
                        <div
                          key={type}
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: EVENT_TYPE_COLORS[type as ActivityEventType] || '#64748B' }}
                          title={`${EVENT_TYPE_LABELS[type as ActivityEventType] || type}: ${count}`}
                        />
                      )
                    ))}
                  </div>
                  <span className="text-sm text-slate-500">
                    {day.count} action{day.count !== 1 ? 's' : ''}
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
  onHoverMonth,
  onLeaveMonth
}: {
  data: DayData[]
  onHoverMonth: (days: DayData[], e: React.MouseEvent) => void
  onLeaveMonth: () => void
}) {
  const monthlyData = useMemo(() => {
    const months = new Map<string, { count: number; days: number; daysList: DayData[] }>()
    data.forEach(day => {
      const monthKey = format(day.date, 'yyyy-MM')
      if (!months.has(monthKey)) {
        months.set(monthKey, { count: 0, days: 0, daysList: [] })
      }
      const m = months.get(monthKey)!
      m.count += day.count
      m.days += 1
      m.daysList.push(day)
    })
    return Array.from(months.entries())
      .map(([key, data]) => ({ month: key, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [data])

  const maxValue = useMemo(() => {
    return Math.max(...monthlyData.map(m => m.count), 1)
  }, [monthlyData])

  if (monthlyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p className="font-medium">No activity to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
      {monthlyData.map(month => {
        const percentage = (month.count / maxValue) * 100

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
                  {month.count} action{month.count !== 1 ? 's' : ''}
                </div>
                <div className="text-xs text-slate-500">
                  {month.days} active day{month.days !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-green-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ActivityCalendarHeatmap({ events }: ActivityCalendarHeatmapProps) {
  const [viewMode, setViewMode] = useState<'heatmap' | 'timeline' | 'monthly'>('heatmap')
  const [yearType, setYearType] = useState<'calendar' | 'financial'>('calendar')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  // Ref for D3 rendering
  const svgRef = useRef<SVGSVGElement>(null)

  // Process events by date
  const processedData = useMemo(() => {
    const dayMap = new Map<string, DayData>()

    events.forEach((event) => {
      if (!event.date) return

      try {
        const date = parseISO(event.date)
        if (isNaN(date.getTime())) return

        const dateKey = format(startOfDay(date), 'yyyy-MM-dd')

        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, {
            date: startOfDay(date),
            events: [],
            count: 0,
            typeBreakdown: {
              'activity_created': 0,
              'activity_updated': 0,
              'transaction_created': 0,
              'budget_created': 0,
              'disbursement_created': 0,
              'comment_added': 0,
              'document_uploaded': 0,
              'location_updated': 0,
              'sector_updated': 0,
              'result_added': 0,
              'contact_updated': 0,
              'status_changed': 0,
              'partner_updated': 0,
              'other': 0,
            },
          })
        }

        const dayData = dayMap.get(dateKey)!
        dayData.events.push(event)
        dayData.count += 1
        dayData.typeBreakdown[event.type] = (dayData.typeBreakdown[event.type] || 0) + 1
      } catch (error) {
        console.error('Error processing event date:', error)
      }
    })

    return Array.from(dayMap.values())
  }, [events])

  // Get available years
  const availableYears = useMemo(() => {
    return getAvailableYears(processedData, yearType)
  }, [processedData, yearType])

  // Set default selected year
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

  // Calculate stats
  const stats = useMemo(() => {
    const totalActions = filteredData.reduce((sum, d) => sum + d.count, 0)
    const totalActiveDays = filteredData.length
    const avgPerDay = totalActiveDays > 0 ? totalActions / totalActiveDays : 0

    // Count by type
    const byType: Record<ActivityEventType, number> = {
      'activity_created': 0,
      'activity_updated': 0,
      'transaction_created': 0,
      'budget_created': 0,
      'disbursement_created': 0,
      'comment_added': 0,
      'document_uploaded': 0,
      'location_updated': 0,
      'sector_updated': 0,
      'result_added': 0,
      'contact_updated': 0,
      'status_changed': 0,
      'other': 0,
    }
    filteredData.forEach(d => {
      Object.entries(d.typeBreakdown).forEach(([type, count]) => {
        byType[type as ActivityEventType] += count
      })
    })

    return {
      totalActions,
      totalActiveDays,
      avgPerDay,
      byType
    }
  }, [filteredData])

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
      ...filteredData.map((d) => d.count),
      1
    )

    const weeks: Array<Array<{ date: Date; data: DayData | null; intensity: number }>> = []
    let currentWeek: Array<{ date: Date; data: DayData | null; intensity: number }> = []

    days.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd')
      const dayData = dataMap.get(dateKey) || null

      let intensity = 0
      if (dayData) {
        intensity = Math.min(Math.sqrt(dayData.count / maxValue), 1)
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
  }, [filteredData, displayRange])

  // Get color for a day - blend colors based on event types
  const getDayColor = (dayData: DayData | null, intensity: number): string => {
    if (!dayData || dayData.count === 0) {
      return 'transparent'
    }

    const colorWeights: Array<{ color: string; weight: number }> = []

    Object.entries(dayData.typeBreakdown).forEach(([type, count]) => {
      if (count > 0) {
        const color = EVENT_TYPE_COLORS[type as ActivityEventType] || '#64748B'
        colorWeights.push({ color, weight: count })
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

  // Get month labels
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

  // D3 tooltip
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
    calendarGroup.selectAll('rect.calendar-cell')
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
                .filter(([, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                  const typeLabel = getEventTypeLabel(type as ActivityEventType, count)
                  const typeColor = EVENT_TYPE_COLORS[type as ActivityEventType] || '#64748B'
                  return `
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 12px; height: 12px; background-color: ${typeColor}; border-radius: 2px; flex-shrink: 0;"></div>
                        <span style="color: #475569;">${typeLabel}</span>
                      </div>
                      <div style="color: #0f172a; font-weight: 500; margin-left: 8px;">
                        ${count}
                      </div>
                    </div>
                  `
                }).join('')

              // Recent actions
              const recentActions = d.data.events
                .slice(0, 3)
                .map(e => `
                  <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${e.description}
                  </div>
                `).join('')

              tooltip.html(`
                <p style="font-weight: 600; color: #0f172a; margin-bottom: 12px; font-size: 16px;">${dateStr}</p>
                <div style="background-color: #f8fafc; padding: 8px; border-radius: 4px; margin-bottom: 12px;">
                  <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${d.data.count}</div>
                  <div style="font-size: 12px; color: #64748b;">Action${d.data.count !== 1 ? 's' : ''}</div>
                </div>
                <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 8px;">
                  <p style="font-size: 12px; font-weight: 500; color: #334155; margin-bottom: 8px;">By Type</p>
                  <div>${typeBreakdown}</div>
                </div>
                ${d.data.events.length > 0 ? `
                  <div style="border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    <p style="font-size: 11px; font-weight: 500; color: #94a3b8; margin-bottom: 4px;">Recent</p>
                    ${recentActions}
                    ${d.data.events.length > 3 ? `<div style="font-size: 11px; color: #94a3b8;">+${d.data.events.length - 3} more</div>` : ''}
                  </div>
                ` : ''}
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

  }, [viewMode, calendarGrid, monthLabels, displayRange, filteredData])

  // Tooltip handlers
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

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <p className="font-medium">No activity data available</p>
          <p className="text-xs mt-2">Start creating activities, transactions, and budgets to see your contribution calendar</p>
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
                      events: [],
                      count: 1,
                      typeBreakdown: { 'activity_created': 1, 'activity_updated': 0, 'transaction_created': 0, 'budget_created': 0, 'disbursement_created': 0, 'comment_added': 0, 'document_uploaded': 0, 'location_updated': 0, 'sector_updated': 0, 'result_added': 0, 'contact_updated': 0, 'status_changed': 0, 'partner_updated': 0, 'other': 0 },
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
              <span className="text-slate-600 font-medium">Action types:</span>
              {Object.entries(EVENT_TYPE_COLORS)
                .filter(([type]) => stats.byType[type as ActivityEventType] > 0)
                .map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-slate-600">
                      {EVENT_TYPE_LABELS[type as ActivityEventType]}
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
          onHoverMonth={(days, e) => {
            const combined: DayData = {
              date: days[0]?.date || new Date(),
              events: days.flatMap(d => d.events),
              count: days.reduce((sum, d) => sum + d.count, 0),
              typeBreakdown: {
                'activity_created': 0,
                'activity_updated': 0,
                'transaction_created': 0,
                'budget_created': 0,
                'disbursement_created': 0,
                'comment_added': 0,
                'document_uploaded': 0,
                'location_updated': 0,
                'sector_updated': 0,
                'result_added': 0,
                'contact_updated': 0,
                'status_changed': 0,
                'other': 0,
              }
            }
            days.forEach(day => {
              Object.entries(day.typeBreakdown).forEach(([type, count]) => {
                combined.typeBreakdown[type as ActivityEventType] += count
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

          <div className="bg-slate-50 p-2 rounded mb-3">
            <div className="text-lg font-bold text-slate-900">{hoveredDay.count}</div>
            <div className="text-xs text-slate-500">Action{hoveredDay.count !== 1 ? 's' : ''}</div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <p className="text-xs font-medium text-slate-700 mb-2">By Type</p>
            <div className="space-y-1.5">
              {Object.entries(hoveredDay.typeBreakdown)
                .filter(([, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: EVENT_TYPE_COLORS[type as ActivityEventType] || '#64748B' }}
                      />
                      <span className="text-slate-600 truncate">
                        {getEventTypeLabel(type as ActivityEventType, count)}
                      </span>
                    </div>
                    <div className="text-slate-900 font-medium ml-2">
                      {count}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards at Bottom */}
      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-200">
        <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{stats.totalActions.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Total Actions</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{stats.totalActiveDays.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Active Days</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{stats.avgPerDay.toFixed(1)}</div>
          <div className="text-xs text-slate-500 mt-1">Avg/Day</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.byType['activity_created']}</div>
          <div className="text-xs text-slate-500 mt-1">Activities Created</div>
        </div>
      </div>
    </div>
  )
}

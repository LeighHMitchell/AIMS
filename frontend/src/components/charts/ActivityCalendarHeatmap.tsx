"use client"

import React, { useMemo, useState, useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { format, startOfWeek, endOfWeek, eachDayOfInterval,
  isWithinInterval, startOfDay, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type ActivityEventType = 'activity_created' | 'activity_updated' | 'transaction_created' | 'budget_created' | 'disbursement_created' | 'comment_added' | 'document_uploaded' | 'location_updated' | 'sector_updated' | 'result_added' | 'contact_updated' | 'status_changed' | 'partner_updated' | 'other'

interface UserActivityEvent {
  date: string
  type: ActivityEventType
  description: string
}

interface ActivityCalendarHeatmapProps {
  events: UserActivityEvent[]
  fiscalYearConfig?: {
    startMonth: number  // 1-12
    startDay: number
    endMonth: number    // 1-12
    endDay: number
  }
}

// Singular labels for tooltip breakdown
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

const getEventTypeLabel = (type: ActivityEventType, count: number): string => {
  return count === 1 ? EVENT_TYPE_LABELS[type] : EVENT_TYPE_LABELS_PLURAL[type]
}

interface DayData {
  date: Date
  events: UserActivityEvent[]
  count: number
  typeBreakdown: Record<ActivityEventType, number>
}

// Get available years from data
function getAvailableYears(data: DayData[], yearType: 'calendar' | 'financial', fyStartMonth: number): number[] {
  const years = new Set<number>()
  data.forEach(d => {
    if (yearType === 'calendar') {
      years.add(d.date.getFullYear())
    } else {
      const month = d.date.getMonth() // 0-indexed
      const year = d.date.getFullYear()
      // FY starts at fyStartMonth (1-indexed), compare with 0-indexed month
      years.add(month >= (fyStartMonth - 1) ? year : year - 1)
    }
  })
  return Array.from(years).sort((a, b) => b - a)
}

// Get year range based on type
function getYearRange(
  year: number,
  yearType: 'calendar' | 'financial',
  fyConfig?: { startMonth: number; startDay: number; endMonth: number; endDay: number }
): { start: Date; end: Date } {
  if (yearType === 'calendar') {
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31)
    }
  }
  if (fyConfig) {
    // Custom FY config (months are 1-indexed in config, 0-indexed in Date)
    return {
      start: new Date(year, fyConfig.startMonth - 1, fyConfig.startDay),
      end: new Date(year + 1, fyConfig.endMonth - 1, fyConfig.endDay)
    }
  }
  // Default: July 1 - June 30
  return {
    start: new Date(year, 6, 1),
    end: new Date(year + 1, 5, 30)
  }
}

// Single color: Cool Steel #7b95a7 — intensity from light to full
function getDayColor(count: number, intensity: number): string {
  if (count === 0) return 'transparent'

  // Base color RGB for #7b95a7
  const r = 123, g = 149, b = 167
  // Interpolate from near-white to full color
  const minOpacity = 0.25
  const opacity = minOpacity + intensity * (1 - minOpacity)

  const blendedR = Math.round(255 + (r - 255) * opacity)
  const blendedG = Math.round(255 + (g - 255) * opacity)
  const blendedB = Math.round(255 + (b - 255) * opacity)

  return `rgb(${blendedR}, ${blendedG}, ${blendedB})`
}

export function ActivityCalendarHeatmap({ events, fiscalYearConfig }: ActivityCalendarHeatmapProps) {
  const [yearType, setYearType] = useState<'calendar' | 'financial'>('calendar')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // FY start month for year grouping (1-indexed)
  const fyStartMonth = fiscalYearConfig?.startMonth ?? 7

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
              'activity_created': 0, 'activity_updated': 0, 'transaction_created': 0,
              'budget_created': 0, 'disbursement_created': 0, 'comment_added': 0,
              'document_uploaded': 0, 'location_updated': 0, 'sector_updated': 0,
              'result_added': 0, 'contact_updated': 0, 'status_changed': 0,
              'partner_updated': 0, 'other': 0,
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
    return getAvailableYears(processedData, yearType, fyStartMonth)
  }, [processedData, yearType, fyStartMonth])

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
      return getYearRange(now.getFullYear(), yearType, fiscalYearConfig)
    }
    return getYearRange(selectedYear, yearType, fiscalYearConfig)
  }, [selectedYear, yearType, fiscalYearConfig])

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
    return { totalActions, totalActiveDays }
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
  const tooltipRef = useRef<d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null>(null)

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
    if (!svgRef.current || calendarGrid.weeks.length === 0) return

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
    const dayLabelsArr = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    dayLabelsArr.forEach((label, idx) => {
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
      count: number
      hasData: boolean
      isInYearRange: boolean
    }> = []

    calendarGrid.weeks.forEach((week, weekIdx) => {
      week.forEach((day, dayIdx) => {
        const hasData = day.data != null && day.data.count > 0
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
          count: day.data?.count ?? 0,
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
        .attr('fill', d => d.hasData ? getDayColor(d.count, d.intensity) : 'transparent')
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
                  return `
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                      <span style="color: #475569;">${typeLabel}</span>
                      <span style="color: #0f172a; font-weight: 500; margin-left: 8px;">${count}</span>
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

  }, [calendarGrid, monthLabels, displayRange, filteredData])

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
          {/* Year Type Toggle */}
          <div className="flex gap-1 rounded-lg p-1 bg-slate-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setYearType('calendar')}
              className={cn(
                'h-7 px-3 text-xs',
                yearType === 'calendar'
                  ? 'bg-white shadow-sm text-slate-900 hover:bg-white'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Calendar Year
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setYearType('financial')}
              className={cn(
                'h-7 px-3 text-xs',
                yearType === 'financial'
                  ? 'bg-white shadow-sm text-slate-900 hover:bg-white'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Financial Year
            </Button>
          </div>

          {/* Year Selector - Dropdown */}
          {availableYears.length > 0 && (
            <Select
              value={selectedYear?.toString() ?? ''}
              onValueChange={(val) => setSelectedYear(parseInt(val))}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {getYearLabel(year)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Calendar Grid - D3 rendered */}
      <div className="overflow-x-auto w-full">
        <svg ref={svgRef} className="w-full" />
      </div>

      {/* Intensity Legend */}
      <div className="flex items-center gap-1 text-xs">
        {[0, 0.25, 0.5, 0.75, 1.0].map((intensity) => (
          <div
            key={intensity}
            className="w-3 h-3 rounded-sm"
            style={{
              backgroundColor: intensity === 0 ? '#f1f5f9' : getDayColor(1, intensity),
              border: intensity === 0 ? '1px solid #e2e8f0' : '1px solid rgba(0,0,0,0.1)'
            }}
          />
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
        <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{stats.totalActions.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Total Actions</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{stats.totalActiveDays.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Active Days</div>
        </div>
      </div>
    </div>
  )
}

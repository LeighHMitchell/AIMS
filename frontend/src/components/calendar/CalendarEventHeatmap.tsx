"use client"

import React, { useMemo, useState, useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { format, startOfWeek, endOfWeek, eachDayOfInterval,
  isWithinInterval, startOfDay, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  type: 'meeting' | 'deadline' | 'workshop' | 'conference' | 'other'
  status: 'pending' | 'approved'
  color?: string
  [key: string]: any
}

interface CalendarEventHeatmapProps {
  events: CalendarEvent[]
  year: number
  onDayClick: (date: Date) => void
  onYearChange: (year: number) => void
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  'meeting': 'Meeting',
  'deadline': 'Deadline',
  'workshop': 'Workshop',
  'conference': 'Conference',
  'other': 'Other',
}

const EVENT_TYPE_LABELS_PLURAL: Record<string, string> = {
  'meeting': 'Meetings',
  'deadline': 'Deadlines',
  'workshop': 'Workshops',
  'conference': 'Conferences',
  'other': 'Other',
}

interface DayData {
  date: Date
  events: CalendarEvent[]
  count: number
  typeBreakdown: Record<string, number>
}

// Single color: Cool Steel #7b95a7 — intensity from light to full
function getDayColor(count: number, intensity: number): string {
  if (count === 0) return 'transparent'

  const r = 123, g = 149, b = 167
  const minOpacity = 0.25
  const opacity = minOpacity + intensity * (1 - minOpacity)

  const blendedR = Math.round(255 + (r - 255) * opacity)
  const blendedG = Math.round(255 + (g - 255) * opacity)
  const blendedB = Math.round(255 + (b - 255) * opacity)

  return `rgb(${blendedR}, ${blendedG}, ${blendedB})`
}

export function CalendarEventHeatmap({ events, year, onDayClick, onYearChange }: CalendarEventHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const displayRange = useMemo(() => ({
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31)
  }), [year])

  // Process events by date
  const processedData = useMemo(() => {
    const dayMap = new Map<string, DayData>()

    events.forEach((event) => {
      if (!event.start) return

      try {
        const date = parseISO(event.start)
        if (isNaN(date.getTime())) return

        const dateKey = format(startOfDay(date), 'yyyy-MM-dd')

        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, {
            date: startOfDay(date),
            events: [],
            count: 0,
            typeBreakdown: {},
          })
        }

        const dayData = dayMap.get(dateKey)!
        dayData.events.push(event)
        dayData.count += 1
        dayData.typeBreakdown[event.type] = (dayData.typeBreakdown[event.type] || 0) + 1
      } catch {
        // skip invalid dates
      }
    })

    return Array.from(dayMap.values())
  }, [events])

  // Filter data by year
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
    monthLabels.forEach(({ month, year: labelYear, startWeek }, idx) => {
      const nextMonthIndex = monthLabels.findIndex(
        (m, i) => i > idx && (m.month !== month || m.year !== labelYear)
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
        .text(format(new Date(labelYear, month, 1), 'MMM'))
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
        .style('cursor', d => d.isInYearRange ? 'pointer' : 'default')
        .on('mouseenter', function(event, d) {
          if (d.isInYearRange) {
            d3.select(this)
              .attr('stroke', '#94a3b8')
              .attr('stroke-width', 2)
          }

          if (d.data && d.hasData && tooltipRef.current) {
            const tooltip = tooltipRef.current
            const dateStr = format(d.data.date, 'EEEE, MMMM dd, yyyy')

            const typeBreakdown = Object.entries(d.data.typeBreakdown)
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const label = count === 1
                  ? (EVENT_TYPE_LABELS[type] || type)
                  : (EVENT_TYPE_LABELS_PLURAL[type] || type)
                return `
                  <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                    <span style="color: #475569;">${label}</span>
                    <span style="color: #0f172a; font-weight: 500; margin-left: 8px;">${count}</span>
                  </div>
                `
              }).join('')

            const eventTitles = d.data.events
              .slice(0, 3)
              .map(e => `
                <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${e.title}
                </div>
              `).join('')

            tooltip.html(`
              <p style="font-weight: 600; color: #0f172a; margin-bottom: 12px; font-size: 16px;">${dateStr}</p>
              <div style="background-color: #f8fafc; padding: 8px; border-radius: 4px; margin-bottom: 12px;">
                <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${d.data.count}</div>
                <div style="font-size: 12px; color: #64748b;">Event${d.data.count !== 1 ? 's' : ''}</div>
              </div>
              ${typeBreakdown ? `
                <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 8px;">
                  <p style="font-size: 12px; font-weight: 500; color: #334155; margin-bottom: 8px;">By Type</p>
                  <div>${typeBreakdown}</div>
                </div>
              ` : ''}
              ${d.data.events.length > 0 ? `
                <div style="border-top: 1px solid #e2e8f0; padding-top: 8px;">
                  <p style="font-size: 11px; font-weight: 500; color: #94a3b8; margin-bottom: 4px;">Events</p>
                  ${eventTitles}
                  ${d.data.events.length > 3 ? `<div style="font-size: 11px; color: #94a3b8;">+${d.data.events.length - 3} more</div>` : ''}
                </div>
              ` : ''}
            `)
              .style('left', `${event.pageX}px`)
              .style('top', `${event.pageY - 10}px`)
              .style('transform', 'translate(-50%, -100%)')
              .style('opacity', 1)
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
          if (d.isInYearRange) {
            d3.select(this)
              .attr('stroke', d.hasData ? 'rgba(0,0,0,0.15)' : '#f1f5f9')
              .attr('stroke-width', 1)
          }
          if (tooltipRef.current) {
            tooltipRef.current.style('opacity', 0)
          }
        })
        .on('click', function(event, d) {
          if (d.isInYearRange) {
            onDayClick(d.date)
          }
        })

  }, [calendarGrid, monthLabels, displayRange, filteredData, onDayClick])

  const goToToday = () => {
    onYearChange(new Date().getFullYear())
  }

  // Stats
  const totalEvents = filteredData.reduce((sum, d) => sum + d.count, 0)
  const activeDays = filteredData.length

  return (
    <div className="space-y-4 relative">
      {/* Year navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onYearChange(year - 1)}
            className="h-8 w-8 p-0 rounded-lg border-[#cfd0d5]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold text-[#4c5568] min-w-[60px] text-center">{year}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onYearChange(year + 1)}
            className="h-8 w-8 p-0 rounded-lg border-[#cfd0d5]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-8 px-3 text-xs rounded-lg border-[#cfd0d5] ml-1"
          >
            Today
          </Button>
        </div>
        <div className="flex items-center gap-4 text-sm text-[#7b95a7]">
          <span>{totalEvents} event{totalEvents !== 1 ? 's' : ''}</span>
          <span>{activeDays} day{activeDays !== 1 ? 's' : ''} with events</span>
        </div>
      </div>

      {/* Calendar Grid - D3 rendered */}
      <div className="overflow-x-auto w-full">
        <svg ref={svgRef} className="w-full" />
      </div>

      {/* Intensity Legend */}
      <div className="flex items-center gap-2 text-xs text-[#7b95a7]">
        <span>Less</span>
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
        <span>More</span>
      </div>
    </div>
  )
}

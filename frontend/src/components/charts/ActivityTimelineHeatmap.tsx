"use client"

import React from 'react'
import { formatDate } from '@/lib/format'

interface ActivityTimelineHeatmapProps {
  activities: Array<{
    id: string
    title: string
    startDate: string | null
    endDate: string | null
  }>
}

export function ActivityTimelineHeatmap({ activities }: ActivityTimelineHeatmapProps) {
  // Filter activities with valid date ranges
  const validActivities = activities.filter(a => a.startDate && a.endDate)
  
  if (validActivities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No timeline data available
      </div>
    )
  }

  // Calculate the date range
  const allDates = validActivities.flatMap(a => [
    new Date(a.startDate!).getTime(),
    new Date(a.endDate!).getTime()
  ])
  const minDate = new Date(Math.min(...allDates))
  const maxDate = new Date(Math.max(...allDates))
  
  // Create monthly buckets
  const months: Array<{ date: Date; count: number }> = []
  const currentDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)
  
  while (currentDate <= endDate) {
    months.push({ date: new Date(currentDate), count: 0 })
    currentDate.setMonth(currentDate.getMonth() + 1)
  }
  
  // Count activities per month
  validActivities.forEach(activity => {
    const start = new Date(activity.startDate!)
    const end = new Date(activity.endDate!)
    
    months.forEach(month => {
      const monthStart = month.date
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
      
      // Check if activity overlaps with this month
      if (start <= monthEnd && end >= monthStart) {
        month.count++
      }
    })
  })
  
  const maxCount = Math.max(...months.map(m => m.count))
  
  // Group by year for display
  const yearGroups = months.reduce((acc, month) => {
    const year = month.date.getFullYear()
    if (!acc[year]) acc[year] = []
    acc[year].push(month)
    return acc
  }, {} as Record<number, typeof months>)
  
  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-100'
    const intensity = count / maxCount
    if (intensity > 0.75) return 'bg-blue-600'
    if (intensity > 0.5) return 'bg-blue-500'
    if (intensity > 0.25) return 'bg-blue-400'
    return 'bg-blue-300'
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs">
        <span className="text-muted-foreground">Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-gray-100 rounded-sm" />
          <div className="w-3 h-3 bg-blue-300 rounded-sm" />
          <div className="w-3 h-3 bg-blue-400 rounded-sm" />
          <div className="w-3 h-3 bg-blue-500 rounded-sm" />
          <div className="w-3 h-3 bg-blue-600 rounded-sm" />
        </div>
        <span className="text-muted-foreground">More</span>
      </div>
      
      <div className="space-y-3">
        {Object.entries(yearGroups).map(([year, yearMonths]) => (
          <div key={year}>
            <h4 className="text-sm font-medium mb-2">{year}</h4>
            <div className="grid grid-cols-12 gap-1">
              {yearMonths.map((month, idx) => (
                <div
                  key={idx}
                  className={`aspect-square rounded-sm ${getIntensity(month.count)} hover:ring-2 hover:ring-primary transition-all cursor-pointer`}
                  title={`${month.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}: ${month.count} activities`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Showing activity coverage across {validActivities.length} activities with date ranges
      </p>
    </div>
  )
}
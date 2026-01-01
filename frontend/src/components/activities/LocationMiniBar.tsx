'use client'

import React, { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Location color palette for Myanmar states/regions
const LOCATION_COLORS: { [key: string]: string } = {
  // States - cooler tones
  'chin state': '#0ea5e9', // sky-500
  'kachin state': '#06b6d4', // cyan-500
  'kayah state': '#14b8a6', // teal-500
  'kayin state': '#10b981', // emerald-500
  'mon state': '#22c55e', // green-500
  'rakhine state': '#84cc16', // lime-500
  'shan state': '#eab308', // yellow-500
  
  // Regions - warmer tones
  'ayeyarwady region': '#f97316', // orange-500
  'bago region': '#ef4444', // red-500
  'magway region': '#ec4899', // pink-500
  'mandalay region': '#d946ef', // fuchsia-500
  'sagaing region': '#a855f7', // purple-500
  'tanintharyi region': '#8b5cf6', // violet-500
  'yangon region': '#6366f1', // indigo-500
  
  // Union Territory
  'naypyidaw union territory': '#3b82f6', // blue-500
  'naypyitaw union territory': '#3b82f6', // blue-500 (alternate spelling)
  
  // Special cases
  'nationwide': '#1e293b', // slate-800
  'national': '#1e293b', // slate-800
  'multiple regions': '#64748b', // slate-500
}

// Fallback colors for unknown locations
const FALLBACK_COLORS = [
  '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
  '#84cc16', '#eab308', '#f97316', '#ef4444', '#ec4899',
  '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6',
]

// Get color for a location based on its admin_unit
function getLocationColor(adminUnit: string, index: number = 0): string {
  const normalized = adminUnit.toLowerCase().trim()
  if (LOCATION_COLORS[normalized]) {
    return LOCATION_COLORS[normalized]
  }
  // Check for partial matches
  for (const [key, color] of Object.entries(LOCATION_COLORS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return color
    }
  }
  // Fallback to a color from the palette
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

// Format admin_unit for display
function formatLocationName(adminUnit: string): string {
  // Capitalize each word
  return adminUnit
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Format USD value
function formatUSD(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }
  return `$${value.toFixed(0)}`
}

export interface LocationData {
  id?: string
  admin_unit: string
  description?: string
  percentage?: number | null
  state_region_name?: string
  state_region_code?: string
}

export interface LocationMiniBarProps {
  locations?: LocationData[]
  displayMode?: 'percentage' | 'usd'
  totalValue?: number // Total activity value for USD calculations
  height?: number
  showTooltip?: boolean
  className?: string
}

export function LocationMiniBar({
  locations,
  displayMode = 'percentage',
  totalValue = 0,
  height = 14,
  showTooltip = true,
  className = '',
}: LocationMiniBarProps) {
  // Handle empty state
  if (!locations || locations.length === 0) {
    return (
      <div className={`flex items-center justify-center text-xs text-gray-400 ${className}`}>
        —
      </div>
    )
  }

  // Aggregate locations by admin_unit (with fallback to state_region_name)
  const aggregatedLocations = useMemo(() => {
    const grouped = new Map<string, { percentage: number; count: number }>()
    
    locations.forEach(loc => {
      // Use admin_unit, fallback to state_region_name
      const locationName = loc.admin_unit || loc.state_region_name
      if (!locationName) return
      
      const key = locationName.toLowerCase().trim()
      const existing = grouped.get(key)
      const percentage = loc.percentage ?? 0
      
      if (existing) {
        existing.percentage += percentage
        existing.count++
      } else {
        grouped.set(key, {
          percentage,
          count: 1,
        })
      }
    })

    return Array.from(grouped.entries()).map(([adminUnit, data], index) => ({
      adminUnit,
      displayName: formatLocationName(adminUnit),
      percentage: data.percentage,
      count: data.count,
      color: getLocationColor(adminUnit, index),
    }))
  }, [locations])

  // If no locations have percentages, distribute evenly
  const totalPercentage = aggregatedLocations.reduce((sum, loc) => sum + (loc.percentage || 0), 0)
  
  const normalizedLocations = useMemo(() => {
    if (totalPercentage === 0) {
      // No percentages set - distribute evenly
      const evenShare = 100 / aggregatedLocations.length
      return aggregatedLocations.map(loc => ({
        ...loc,
        percentage: evenShare,
        normalizedPercentage: evenShare,
        usdValue: totalValue / aggregatedLocations.length,
      }))
    }
    
    // Normalize to ensure sum is 100%
    return aggregatedLocations.map(loc => ({
      ...loc,
      normalizedPercentage: totalPercentage > 0 
        ? (loc.percentage / totalPercentage) * 100 
        : 100 / aggregatedLocations.length,
      usdValue: totalPercentage > 0
        ? (loc.percentage / totalPercentage) * totalValue
        : totalValue / aggregatedLocations.length,
    }))
  }, [aggregatedLocations, totalPercentage, totalValue])

  // Sort by percentage descending
  const sortedLocations = [...normalizedLocations].sort((a, b) => b.normalizedPercentage - a.normalizedPercentage)

  const barContent = (
    <div 
      className={`flex w-full rounded overflow-hidden bg-gray-100 ${className}`}
      style={{ height: `${height}px` }}
    >
      {sortedLocations.map((location, index) => {
        const width = Math.max(location.normalizedPercentage, 2) // Minimum 2% width for visibility
        const displayValue = displayMode === 'usd' 
          ? formatUSD(location.usdValue)
          : `${Math.round(location.percentage)}%`

        if (showTooltip) {
          return (
            <Tooltip key={`${location.adminUnit}-${index}`} delayDuration={100}>
              <TooltipTrigger asChild>
                <div
                  className="h-full transition-opacity hover:opacity-80 cursor-default"
                  style={{
                    width: `${width}%`,
                    backgroundColor: location.color,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="text-xs flex flex-wrap items-baseline gap-1.5">
                  <span className="font-medium">{location.displayName}</span>
                  <span className="text-gray-500">
                    {displayMode === 'usd' 
                      ? `${formatUSD(location.usdValue)} (${Math.round(location.percentage)}%)`
                      : `${Math.round(location.percentage)}%`
                    }
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        }

        return (
          <div
            key={`${location.adminUnit}-${index}`}
            className="h-full"
            style={{
              width: `${width}%`,
              backgroundColor: location.color,
            }}
            title={`${location.displayName}: ${displayValue}`}
          />
        )
      })}
    </div>
  )

  if (showTooltip) {
    return (
      <TooltipProvider>
        {barContent}
      </TooltipProvider>
    )
  }

  return barContent
}

export default LocationMiniBar

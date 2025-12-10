'use client'

import React, { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Sector color palette by 3-digit category code (matching map markers)
const SECTOR_COLORS: { [key: string]: string } = {
  '111': '#1e293b', // Education - slate-800
  '112': '#334155', // Basic Education - slate-700
  '113': '#475569', // Secondary Education - slate-600
  '114': '#64748b', // Post-Secondary Education - slate-500
  '121': '#0f172a', // Health - slate-900
  '122': '#374151', // Basic Health - gray-700
  '123': '#4b5563', // NCDs - gray-600
  '130': '#6b7280', // Population - gray-500
  '140': '#059669', // Water & Sanitation - emerald-600
  '150': '#0891b2', // Government & Civil Society - cyan-600
  '151': '#0e7490', // Government-general - cyan-700
  '152': '#155e75', // Conflict & Peace - cyan-800
  '160': '#7c3aed', // Other Social Infrastructure - violet-600
  '210': '#dc2626', // Transport - red-600
  '220': '#ea580c', // Communications - orange-600
  '230': '#ca8a04', // Energy - yellow-600
  '231': '#a16207', // Energy Policy - yellow-700
  '232': '#84cc16', // Renewable Energy - lime-500
  '233': '#65a30d', // Non-renewable Energy - lime-600
  '240': '#2563eb', // Banking - blue-600
  '250': '#4f46e5', // Business - indigo-600
  '310': '#16a34a', // Agriculture - green-600
  '311': '#15803d', // Agriculture General - green-700
  '312': '#166534', // Forestry - green-800
  '313': '#14532d', // Fishing - green-900
  '320': '#78716c', // Industry - stone-500
  '321': '#57534e', // Industry General - stone-600
  '322': '#44403c', // Mining - stone-700
  '323': '#292524', // Construction - stone-800
  '330': '#be123c', // Trade - rose-700
  '331': '#9f1239', // Trade Policies - rose-800
  '332': '#881337', // Tourism - rose-900
  '410': '#0d9488', // Environment - teal-600
  '430': '#0f766e', // Multisector - teal-700
  '510': '#9333ea', // Budget Support - purple-600
  '520': '#7e22ce', // Food Aid - purple-700
  '530': '#6b21a8', // Commodity Assistance - purple-800
  '600': '#c026d3', // Debt - fuchsia-600
  '720': '#db2777', // Emergency Response - pink-600
  '730': '#be185d', // Reconstruction - pink-700
  '740': '#9d174d', // Disaster Prevention - pink-800
  '910': '#94a3b8', // Admin Costs - slate-400
  '930': '#cbd5e1', // Refugees - slate-300
  '998': '#e2e8f0', // Unallocated - slate-200
}

// Category names for 3-digit codes (used when aggregating to category level)
const SECTOR_CATEGORY_NAMES: { [key: string]: string } = {
  '111': 'Education, Level Unspecified',
  '112': 'Basic Education',
  '113': 'Secondary Education',
  '114': 'Post-Secondary Education',
  '121': 'Health, General',
  '122': 'Basic Health',
  '123': 'Non-communicable Diseases',
  '130': 'Population Policies/Programmes',
  '140': 'Water Supply & Sanitation',
  '150': 'Government & Civil Society',
  '151': 'Government & Civil Society, General',
  '152': 'Conflict, Peace & Security',
  '160': 'Other Social Infrastructure',
  '210': 'Transport & Storage',
  '220': 'Communications',
  '230': 'Energy',
  '231': 'Energy Policy',
  '232': 'Energy Generation, Renewable',
  '233': 'Energy Generation, Non-Renewable',
  '240': 'Banking & Financial Services',
  '250': 'Business & Other Services',
  '310': 'Agriculture',
  '311': 'Agriculture',
  '312': 'Forestry',
  '313': 'Fishing',
  '320': 'Industry',
  '321': 'Industry',
  '322': 'Mineral Resources & Mining',
  '323': 'Construction',
  '330': 'Trade Policies & Regulations',
  '331': 'Trade Policies & Regulations',
  '332': 'Tourism',
  '410': 'General Environment Protection',
  '430': 'Other Multisector',
  '510': 'General Budget Support',
  '520': 'Development Food Assistance',
  '530': 'Other Commodity Assistance',
  '600': 'Action Relating to Debt',
  '720': 'Emergency Response',
  '730': 'Reconstruction Relief & Rehabilitation',
  '740': 'Disaster Prevention & Preparedness',
  '910': 'Administrative Costs of Donors',
  '930': 'Refugees in Donor Countries',
  '998': 'Unallocated / Unspecified',
}

// Get color for a sector based on its category code or 5-digit code
function getSectorColor(categoryCode?: string, code?: string): string {
  // Try category code first
  if (categoryCode && SECTOR_COLORS[categoryCode]) {
    return SECTOR_COLORS[categoryCode]
  }
  // Try 3-digit prefix from category code
  if (categoryCode) {
    const prefix = categoryCode.substring(0, 3)
    if (SECTOR_COLORS[prefix]) return SECTOR_COLORS[prefix]
  }
  // Try 3-digit prefix from 5-digit code
  if (code) {
    const prefix = code.substring(0, 3)
    if (SECTOR_COLORS[prefix]) return SECTOR_COLORS[prefix]
  }
  // Default color
  return '#64748b'
}

// Get category name from code
function getCategoryName(code: string): string {
  const prefix = code.substring(0, 3)
  return SECTOR_CATEGORY_NAMES[prefix] || `Sector ${prefix}`
}

export interface SectorData {
  code: string
  name: string
  categoryCode?: string
  categoryName?: string
  level?: string
  percentage: number
}

// Aggregated sector data for display
interface AggregatedSector {
  code: string
  name: string
  percentage: number
  categoryCode?: string
}

export interface SectorMiniBarProps {
  sectors?: SectorData[]
  level?: 'category' | 'sector' | 'subsector'
  height?: number
  showTooltip?: boolean
  className?: string
}

export function SectorMiniBar({
  sectors,
  level = 'subsector',
  height = 14,
  showTooltip = true,
  className = '',
}: SectorMiniBarProps) {
  // Handle empty state
  if (!sectors || sectors.length === 0) {
    return (
      <div className={`flex items-center justify-center text-xs text-gray-400 ${className}`}>
        —
      </div>
    )
  }

  // Aggregate sectors based on level
  const aggregatedSectors = useMemo((): AggregatedSector[] => {
    if (level === 'subsector') {
      // No aggregation - return as-is
      return sectors.map(s => ({
        code: s.code,
        name: s.name || getCategoryName(s.code),
        percentage: s.percentage || 0,
        categoryCode: s.categoryCode || s.code.substring(0, 3),
      }))
    }

    // Group by 3-digit code for both 'category' and 'sector' levels
    const grouped = new Map<string, { name: string; percentage: number; categoryCode: string }>()
    
    sectors.forEach(s => {
      const groupCode = s.categoryCode || s.code.substring(0, 3)
      const existing = grouped.get(groupCode)
      
      if (existing) {
        existing.percentage += s.percentage || 0
      } else {
        // For category level, use the category name; for sector level, use categoryName or derive it
        const name = level === 'category' 
          ? (s.categoryName || getCategoryName(groupCode))
          : (s.categoryName || getCategoryName(groupCode))
        
        grouped.set(groupCode, {
          name,
          percentage: s.percentage || 0,
          categoryCode: groupCode,
        })
      }
    })

    return Array.from(grouped.entries()).map(([code, data]) => ({
      code,
      name: data.name,
      percentage: data.percentage,
      categoryCode: data.categoryCode,
    }))
  }, [sectors, level])

  // Normalize percentages to sum to 100
  const totalPercentage = aggregatedSectors.reduce((sum, s) => sum + (s.percentage || 0), 0)
  const normalizedSectors = aggregatedSectors.map(s => ({
    ...s,
    normalizedPercentage: totalPercentage > 0 
      ? ((s.percentage || 0) / totalPercentage) * 100 
      : 100 / aggregatedSectors.length
  }))

  const barContent = (
    <div 
      className={`flex w-full rounded overflow-hidden bg-gray-100 ${className}`}
      style={{ height: `${height}px` }}
    >
      {normalizedSectors.map((sector, index) => {
        const color = getSectorColor(sector.categoryCode, sector.code)
        const width = Math.max(sector.normalizedPercentage, 2) // Minimum 2% width for visibility
        const displayName = sector.name || `Sector ${sector.code}`
        const percentage = Math.round(sector.percentage || sector.normalizedPercentage)

        if (showTooltip) {
          return (
            <Tooltip key={`${sector.code}-${index}`} delayDuration={100}>
              <TooltipTrigger asChild>
                <div
                  className="h-full transition-opacity hover:opacity-80 cursor-default"
                  style={{
                    width: `${width}%`,
                    backgroundColor: color,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="text-xs flex flex-wrap items-baseline gap-1.5">
                  <span className="font-mono text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{sector.code}</span>
                  <span className="font-medium">{displayName.replace(/^\d+\s*[-–]\s*/, '')}</span>
                  <span className="text-gray-500">{percentage}%</span>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        }

        return (
          <div
            key={`${sector.code}-${index}`}
            className="h-full"
            style={{
              width: `${width}%`,
              backgroundColor: color,
            }}
            title={`${displayName} (${sector.code}): ${percentage}%`}
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

export default SectorMiniBar

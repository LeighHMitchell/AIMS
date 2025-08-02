"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface SectorDistributionChartProps {
  data: Record<string, number>
}

export function SectorDistributionChart({ data }: SectorDistributionChartProps) {
  const sectors = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const maxValue = Math.max(...sectors.map(([_, count]) => count))
  
  if (sectors.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No sector data available
      </div>
    )
  }

  // Simple sector code to name mapping (can be expanded)
  const getSectorName = (code: string) => {
    const sectorNames: Record<string, string> = {
      '110': 'Education',
      '120': 'Health',
      '130': 'Population',
      '140': 'Water & Sanitation',
      '150': 'Government & Civil Society',
      '160': 'Social Infrastructure',
      '210': 'Transport & Storage',
      '220': 'Communications',
      '230': 'Energy',
      '240': 'Banking & Financial Services',
      '250': 'Business Services',
      '310': 'Agriculture',
      '320': 'Industry',
      '330': 'Trade',
      '410': 'Environment',
      '430': 'Other Multisector',
      '510': 'Budget Support',
      '520': 'Food Aid',
      '600': 'Debt Relief',
      '700': 'Emergency Response',
      '910': 'Admin Costs',
      '920': 'Support to NGOs',
      '930': 'Refugees',
      '998': 'Unallocated'
    }
    return sectorNames[code] || `Sector ${code}`
  }

  return (
    <div className="space-y-3">
      {sectors.map(([code, count]) => (
        <div key={code} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{getSectorName(code)}</span>
            <span className="text-muted-foreground">{count} activities</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(count / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
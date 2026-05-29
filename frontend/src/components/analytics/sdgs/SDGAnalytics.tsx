"use client"

import React, { useState } from 'react'
import { SDGCoverageChart } from './SDGCoverageChart'
import { SDGConcentrationChart } from './SDGConcentrationChart'
import { SDGTable } from './SDGTable'
import { ChartGrid } from '@/components/ui/chart-grid'
import { CompactChartCard } from '@/components/ui/compact-chart-card'

interface SDGAnalyticsProps {
  dateRange: { from: Date; to: Date }
  onDateRangeChange?: (range: { from: Date; to: Date }) => void
  refreshKey: number
}

export function SDGAnalytics({ dateRange, onDateRangeChange, refreshKey }: SDGAnalyticsProps) {
  const [organizationId] = useState<string>('all')
  const [selectedSdgs] = useState<number[]>([])
  const [metric] = useState<'activities' | 'budget' | 'planned'>('activities')

  const sdgTable = (
    <SDGTable
      organizationId={organizationId}
      dateRange={dateRange}
      selectedSdgs={selectedSdgs}
      metric={metric}
      refreshKey={refreshKey}
    />
  )

  return (
    <div className="space-y-6">
      <ChartGrid>
        <CompactChartCard
          title="SDG Coverage"
          shortDescription="Activities by SDG goal"
          fullDescription="Number of activities and financial weight mapped to each SDG"
          mathTooltip="Counts the activities mapped to each SDG goal and their USD financial weight. An activity tagged with multiple SDGs contributes to each goal it touches. Use the metric control to switch between activity count and financial value."
          tableView={sdgTable}
          inlineToolbar
        >
          <SDGCoverageChart
            organizationId={organizationId}
            dateRange={dateRange}
            selectedSdgs={selectedSdgs}
            metric={metric}
            refreshKey={refreshKey}
          />
        </CompactChartCard>

        <CompactChartCard
          title="SDG Concentration"
          shortDescription="SDG trends over time"
          fullDescription="Assess whether activities are becoming more concentrated or dispersed across SDGs over time"
          mathTooltip="Tracks how concentrated or dispersed activities are across the SDGs over time — whether the portfolio is spreading across more goals or focusing on fewer. Computed per period from the share of activities (or financial value) mapped to each goal."
        >
          <SDGConcentrationChart
            organizationId={organizationId}
            dateRange={dateRange}
            selectedSdgs={selectedSdgs}
            metric={metric}
            refreshKey={refreshKey}
          />
        </CompactChartCard>
      </ChartGrid>
    </div>
  )
}








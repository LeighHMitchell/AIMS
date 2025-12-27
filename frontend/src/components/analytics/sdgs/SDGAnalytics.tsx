"use client"

import React, { useState } from 'react'
import { SDGAnalyticsFilters } from './SDGAnalyticsFilters'
import { SDGCoverageChart } from './SDGCoverageChart'
import { SDGConcentrationChart } from './SDGConcentrationChart'
import { SDGTable } from './SDGTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Table as TableIcon } from 'lucide-react'

interface SDGAnalyticsProps {
  dateRange: { from: Date; to: Date }
  onDateRangeChange?: (range: { from: Date; to: Date }) => void
  refreshKey: number
}

export function SDGAnalytics({ dateRange, onDateRangeChange, refreshKey }: SDGAnalyticsProps) {
  const [organizationId, setOrganizationId] = useState<string>('all')
  const [selectedSdgs, setSelectedSdgs] = useState<number[]>([])
  const [metric, setMetric] = useState<'activities' | 'budget' | 'planned'>('activities')
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  return (
    <div className="space-y-6">
      {/* Filters */}
      <SDGAnalyticsFilters
        organizationId={organizationId}
        dateRange={dateRange}
        selectedSdgs={selectedSdgs}
        metric={metric}
        onOrganizationChange={setOrganizationId}
        onDateRangeChange={onDateRangeChange || (() => {})}
        onSelectedSdgsChange={setSelectedSdgs}
        onMetricChange={setMetric}
      />

      {/* Charts and Table */}
      <div className="space-y-6">
        {/* Chart 1: SDG Coverage */}
        <SDGCoverageChart
          organizationId={organizationId}
          dateRange={dateRange}
          selectedSdgs={selectedSdgs}
          metric={metric}
          refreshKey={refreshKey}
        />

        {/* Chart 2: SDG Concentration Over Time */}
        <SDGConcentrationChart
          organizationId={organizationId}
          dateRange={dateRange}
          selectedSdgs={selectedSdgs}
          metric={metric}
          refreshKey={refreshKey}
        />

        {/* Table View */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'chart' | 'table')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="chart">
              <BarChart3 className="h-4 w-4 mr-2" />
              Chart View
            </TabsTrigger>
            <TabsTrigger value="table">
              <TableIcon className="h-4 w-4 mr-2" />
              Table View
            </TabsTrigger>
          </TabsList>
          <TabsContent value="table" className="mt-4">
            <SDGTable
              organizationId={organizationId}
              dateRange={dateRange}
              selectedSdgs={selectedSdgs}
              metric={metric}
              refreshKey={refreshKey}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}






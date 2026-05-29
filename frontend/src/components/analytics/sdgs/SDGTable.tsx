"use client"

import React, { useState, useEffect } from 'react'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { AlertCircle } from 'lucide-react'
import { SDG_GOALS } from '@/data/sdg-targets'
import { apiFetch } from '@/lib/api-fetch';
import { ChartDataTable, type ChartTableValue } from '@/components/ui/chart-data-table'

interface SDGTableProps {
  organizationId: string
  dateRange: { from: Date; to: Date }
  selectedSdgs: number[]
  metric: 'activities' | 'budget' | 'planned'
  refreshKey: number
}

interface CoverageData {
  sdgGoal: number
  sdgName: string
  activityCount: number
  totalBudget: number
  totalPlannedDisbursements: number
}

export function SDGTable({
  organizationId,
  dateRange,
  selectedSdgs,
  metric,
  refreshKey
}: SDGTableProps) {
  const [data, setData] = useState<CoverageData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [organizationId, dateRange, selectedSdgs, metric, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        organizationId: organizationId || 'all',
        dateFrom: dateRange.from.toISOString().split('T')[0],
        dateTo: dateRange.to.toISOString().split('T')[0],
        selectedSdgs: selectedSdgs.length > 0 ? selectedSdgs.join(',') : 'all',
        metric,
        dataType: 'coverage'
      })

      const response = await apiFetch(`/api/analytics/sdgs?${params}`)
      const result = await response.json()

      if (result.success && result.coverage) {
        setData(result.coverage)
      } else {
        console.error('Error fetching SDG table data:', result.error)
        setData([])
      }
    } catch (error) {
      console.error('Error fetching SDG table data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <ChartLoadingPlaceholder />
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground font-medium">No SDG data available</p>
          <p className="text-body text-muted-foreground mt-2">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ChartDataTable
        rows={data}
        columns={[
          {
            key: 'sdgGoal',
            label: 'SDG',
            numeric: false,
            // Color square + monospace code badge + goal name, inline — matches
            // the other dashboard tables' code-then-name convention.
            format: (_v: ChartTableValue, row: Record<string, ChartTableValue>) => {
              const goal = SDG_GOALS.find(g => g.id === row.sdgGoal)
              return (
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: goal?.color || '#64748b' }}
                  />
                  <code className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground flex-shrink-0">
                    {row.sdgGoal}
                  </code>
                  <span>{goal?.name || String(row.sdgName ?? '')}</span>
                </span>
              )
            },
          },
          {
            key: 'activityCount',
            label: 'Activities',
            numeric: true,
            // Plain count (can be fractional from equal-splitting); not a sum.
            format: (v: ChartTableValue) => (Number(v) || 0).toFixed(1),
            includeInTotal: false,
          },
          { key: 'totalBudget', label: 'Total Activity Budget', numeric: true, currency: 'USD' },
          { key: 'totalPlannedDisbursements', label: 'Total Planned Disbursements', numeric: true, currency: 'USD' },
        ]}
        currency="USD"
        maxHeight={500}
        emptyMessage="No SDG data available"
      />

      {/* Explanatory text — under the table. */}
      <p className="text-body text-muted-foreground leading-relaxed mt-4">
        This chart shows how the organization&apos;s aid activities align with the 17 UN Sustainable Development Goals.
        Each bar represents the number of activities (or financial value) mapped to that SDG. When an activity addresses
        multiple SDGs, its value is split equally across those goals to avoid double-counting. Use this visualization to
        identify the organization&apos;s priority development areas, spot potential gaps in SDG coverage, and understand
        how aid flows are distributed across global development objectives. Higher bars indicate stronger focus areas,
        while absent or low bars may represent opportunities for expanded programming.
      </p>
    </div>
  )
}

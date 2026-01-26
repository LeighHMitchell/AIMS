"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { MultiSelect } from '@/components/ui/multi-select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  Table, 
  Download, 
  Info,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-fetch';

interface PolicyMarker {
  id: string
  code: string
  name: string
}

interface PolicyMarkerAnalyticsRow {
  policy_marker_id: string
  policy_marker_code: string
  policy_marker_name: string
  significance: number // 0, 1, or 2
  activity_count: number
  total_budget_usd: number
}

interface PolicyMarkerTimeSeriesRow {
  policy_marker_id: string
  policy_marker_code: string
  policy_marker_name: string
  years: Record<string, number> // year -> total spend
  total: number
}

interface PolicyMarkersChartProps {
  refreshKey?: number
  onDataChange?: (data: PolicyMarkerAnalyticsRow[]) => void
  compact?: boolean
}

type ViewMode = 'chart' | 'table' | 'time-series'

const SIGNIFICANCE_LABELS: Record<number, { label: string; color: string; description: string }> = {
  0: { label: 'Not targeted', color: '#94a3b8', description: 'Not targeted (0)' },
  1: { label: 'Significant objective', color: '#3b82f6', description: 'Significant objective (1)' },
  2: { label: 'Principal objective', color: '#1e40af', description: 'Principal objective (2)' }
}

export function PolicyMarkersChart({ refreshKey = 0, onDataChange, compact = false }: PolicyMarkersChartProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PolicyMarkerAnalyticsRow[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<PolicyMarkerTimeSeriesRow[]>([])
  const [timeSeriesYears, setTimeSeriesYears] = useState<string[]>([])
  const [markers, setMarkers] = useState<PolicyMarker[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [showValueChart, setShowValueChart] = useState(true)
  
  // Filters
  const [selectedMarkers, setSelectedMarkers] = useState<string[]>([])
  const [selectedSignificance, setSelectedSignificance] = useState<number[]>([1, 2]) // Default: Significant and Principal only

  // Table sorting
  type SortField = 'marker' | 'significance' | 'activity_count' | 'budget'
  const [sortField, setSortField] = useState<SortField>('marker')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (viewMode === 'time-series') {
      fetchTimeSeriesData()
    } else {
      fetchData()
    }
  }, [refreshKey, selectedMarkers, selectedSignificance, viewMode])

  const fetchData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (selectedMarkers.length > 0) {
        params.append('markerIds', selectedMarkers.join(','))
      }
      if (selectedSignificance.length > 0) {
        params.append('significanceLevels', selectedSignificance.join(','))
      }

      const response = await apiFetch(`/api/analytics/policy-markers?${params}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch policy markers data')
      }

      setData(result.data || [])
      setMarkers(result.markers || [])

      // Initialize selected markers if empty (select all)
      if (selectedMarkers.length === 0 && result.markers?.length > 0) {
        setSelectedMarkers(result.markers.map((m: PolicyMarker) => m.id))
      }

      onDataChange?.(result.data || [])
    } catch (error: any) {
      console.error('[PolicyMarkersChart] Error fetching data:', error)
      toast.error('Failed to load policy markers data')
    } finally {
      setLoading(false)
    }
  }

  const fetchTimeSeriesData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (selectedMarkers.length > 0) {
        params.append('markerIds', selectedMarkers.join(','))
      }
      if (selectedSignificance.length > 0) {
        params.append('significanceLevels', selectedSignificance.join(','))
      }

      const response = await apiFetch(`/api/analytics/policy-markers-time-series?${params}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch policy markers time series data')
      }

      setTimeSeriesData(result.data || [])
      setTimeSeriesYears(result.years || [])
      setMarkers(result.markers || [])

      // Initialize selected markers if empty (select all)
      if (selectedMarkers.length === 0 && result.markers?.length > 0) {
        setSelectedMarkers(result.markers.map((m: PolicyMarker) => m.id))
      }
    } catch (error: any) {
      console.error('[PolicyMarkersChart] Error fetching time series data:', error)
      toast.error('Failed to load policy markers time series data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number): string => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value) || value === 0) {
      return '$0'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }

  const formatCurrencyFull = (value: number): string => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value) || value === 0) {
      return '$0'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Prepare chart data - group by policy marker
  const prepareChartData = () => {
    const markerMap = new Map<string, {
      markerName: string
      markerCode: string
      notTargeted: number
      significant: number
      principal: number
      notTargetedValue: number
      significantValue: number
      principalValue: number
    }>()

    data.forEach(row => {
      if (!markerMap.has(row.policy_marker_id)) {
        markerMap.set(row.policy_marker_id, {
          markerName: row.policy_marker_name,
          markerCode: row.policy_marker_code,
          notTargeted: 0,
          significant: 0,
          principal: 0,
          notTargetedValue: 0,
          significantValue: 0,
          principalValue: 0
        })
      }

      const marker = markerMap.get(row.policy_marker_id)!
      if (row.significance === 0) {
        marker.notTargeted = row.activity_count
        marker.notTargetedValue = row.total_budget_usd
      } else if (row.significance === 1) {
        marker.significant = row.activity_count
        marker.significantValue = row.total_budget_usd
      } else if (row.significance === 2) {
        marker.principal = row.activity_count
        marker.principalValue = row.total_budget_usd
      }
    })

    return Array.from(markerMap.values())
      .sort((a, b) => a.markerName.localeCompare(b.markerName))
  }

  const chartData = prepareChartData()

  // Custom tooltip for activity count chart
  const ActivityCountTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const data = payload[0].payload
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg border border-slate-700">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          if (entry.value === 0) return null
          const significance = entry.dataKey === 'notTargeted' ? 0 : entry.dataKey === 'significant' ? 1 : 2
          const sigInfo = SIGNIFICANCE_LABELS[significance]
          return (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {sigInfo.label}: {entry.value} {entry.value === 1 ? 'activity' : 'activities'}
            </p>
          )
        })}
      </div>
    )
  }

  // Custom tooltip for value chart
  const ValueTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg border border-slate-700">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          if (entry.value === 0) return null
          const significance = entry.dataKey === 'significantValue' ? 1 : 2
          const sigInfo = SIGNIFICANCE_LABELS[significance]
          return (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {sigInfo.label}: {formatCurrencyFull(entry.value)}
            </p>
          )
        })}
      </div>
    )
  }

  // Sort table data
  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortField) {
        case 'marker':
          aVal = a.policy_marker_name
          bVal = b.policy_marker_name
          break
        case 'significance':
          aVal = a.significance
          bVal = b.significance
          break
        case 'activity_count':
          aVal = a.activity_count
          bVal = b.activity_count
          break
        case 'budget':
          aVal = a.total_budget_usd
          bVal = b.total_budget_usd
          break
        default:
          return 0
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal)
      } else {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
    })

    return sorted
  }, [data, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleExportCSV = () => {
    if (viewMode === 'time-series') {
      // Export time series data
      if (timeSeriesData.length === 0) {
        toast.error('No data to export')
        return
      }

      const headers = ['Policy Marker', ...timeSeriesYears.map(y => `Spend ${y}`), 'Total']
      const rows = timeSeriesData.map(row => [
        `"${row.policy_marker_name.replace(/"/g, '""')}"`,
        ...timeSeriesYears.map(year => (row.years[year] || 0).toFixed(2)),
        row.total.toFixed(2)
      ])

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `policy-markers-time-series-${new Date().toISOString().split('T')[0]}.csv`
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('Time series data exported to CSV')
    } else {
      // Export regular table data
      if (sortedData.length === 0) {
        toast.error('No data to export')
        return
      }

      const headers = [
        'Policy Marker',
        'Significance',
        'Number of Activities',
        'Total Activity Budget (USD)'
      ]

      const rows = sortedData.map(row => [
        `"${row.policy_marker_name.replace(/"/g, '""')}"`,
        SIGNIFICANCE_LABELS[row.significance].label,
        row.activity_count.toString(),
        row.total_budget_usd.toFixed(2)
      ])

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `policy-markers-analytics-${new Date().toISOString().split('T')[0]}.csv`
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('Data exported to CSV')
    }
  }

  // Check for warnings
  const warnings = useMemo(() => {
    const warningsList: string[] = []
    
    // Check for activities marked as Principal but with no budget
    const principalNoBudget = data.filter(
      row => row.significance === 2 && row.total_budget_usd === 0 && row.activity_count > 0
    )
    if (principalNoBudget.length > 0) {
      warningsList.push(
        `${principalNoBudget.length} policy marker${principalNoBudget.length > 1 ? 's' : ''} have activities marked as "Principal objective" but with no total budget`
      )
    }

    // Check for activities with multiple Principal markers
    const principalMarkers = data.filter(row => row.significance === 2)
    const markerPrincipalCounts = new Map<string, number>()
    principalMarkers.forEach(row => {
      const current = markerPrincipalCounts.get(row.policy_marker_id) || 0
      markerPrincipalCounts.set(row.policy_marker_id, current + row.activity_count)
    })

    return warningsList
  }, [data])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Policy Markers Analytics
              </CardTitle>
              <CardDescription className="mt-1">
                Analyze activities by policy marker and significance level
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'chart' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('chart')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Chart
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Table className="h-4 w-4 mr-2" />
                Table
              </Button>
              <Button
                variant={viewMode === 'time-series' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('time-series')}
              >
                <Table className="h-4 w-4 mr-2" />
                Time Series
              </Button>
              {(viewMode === 'table' || viewMode === 'time-series') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Policy Marker Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Policy Markers</Label>
              <MultiSelect
                options={markers.map(m => ({
                  label: `${m.code} - ${m.name}`,
                  value: m.id
                }))}
                selected={selectedMarkers}
                onChange={setSelectedMarkers}
                placeholder="Select policy markers..."
                showSelectAll={true}
                selectedLabel="markers selected"
              />
            </div>

            {/* Significance Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Significance Level</Label>
              <div className="flex items-center gap-4">
                {[1, 2].map(sig => (
                  <div key={sig} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sig-${sig}`}
                      checked={selectedSignificance.includes(sig)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSignificance([...selectedSignificance, sig])
                        } else {
                          setSelectedSignificance(selectedSignificance.filter(s => s !== sig))
                        }
                      }}
                    />
                    <Label
                      htmlFor={`sig-${sig}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {SIGNIFICANCE_LABELS[sig].label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Value Chart Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-value-chart"
                  checked={showValueChart}
                  onCheckedChange={setShowValueChart}
                />
                <Label htmlFor="show-value-chart" className="text-sm font-medium cursor-pointer">
                  Show Value of Activities Chart
                </Label>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Info className="h-3 w-3" />
                <span>Values based on Total Activity Budget only</span>
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800 mb-1">Note</p>
                    <ul className="text-xs text-amber-700 list-disc list-inside space-y-1">
                      {warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1 text-xs text-blue-800">
                  <p className="font-medium mb-1">About Policy Markers</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Policy markers reflect policy intent, not financial allocation</li>
                    <li>Budget values are not split or apportioned across markers</li>
                    <li>Activities without a total budget are excluded from value calculations but included in activity counts</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts, Table, or Time Series */}
      {viewMode === 'chart' ? (
        <div className="space-y-6">
          {/* Activity Count Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Number of Activities by Policy Marker and Significance</CardTitle>
              <CardDescription>
                Count of distinct activities grouped by policy marker and significance level
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[400px] text-slate-500">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                    <XAxis
                      dataKey="markerName"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      label={{ value: 'Number of Activities', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<ActivityCountTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="rect"
                    />
                    {selectedSignificance.includes(0) && (
                      <Bar
                        dataKey="notTargeted"
                        stackId="1"
                        fill={SIGNIFICANCE_LABELS[0].color}
                        name={SIGNIFICANCE_LABELS[0].label}
                      />
                    )}
                    {selectedSignificance.includes(1) && (
                      <Bar
                        dataKey="significant"
                        stackId="1"
                        fill={SIGNIFICANCE_LABELS[1].color}
                        name={SIGNIFICANCE_LABELS[1].label}
                      />
                    )}
                    {selectedSignificance.includes(2) && (
                      <Bar
                        dataKey="principal"
                        stackId="1"
                        fill={SIGNIFICANCE_LABELS[2].color}
                        name={SIGNIFICANCE_LABELS[2].label}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Value Chart */}
          {showValueChart && (
            <Card>
              <CardHeader>
                <CardTitle>Value of Activities by Policy Marker and Significance</CardTitle>
                <CardDescription>
                  Total Activity Budget (USD) for activities where policy marker is Significant or Principal objective
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[400px] text-slate-500">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                      <XAxis
                        dataKey="markerName"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                      />
                      <YAxis
                        tickFormatter={formatCurrency}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        label={{ value: 'Total Activity Budget (USD)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip content={<ValueTooltip />} />
                      <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                      />
                      {selectedSignificance.includes(1) && (
                        <Bar
                          dataKey="significantValue"
                          stackId="1"
                          fill={SIGNIFICANCE_LABELS[1].color}
                          name={SIGNIFICANCE_LABELS[1].label}
                        />
                      )}
                      {selectedSignificance.includes(2) && (
                        <Bar
                          dataKey="principalValue"
                          stackId="1"
                          fill={SIGNIFICANCE_LABELS[2].color}
                          name={SIGNIFICANCE_LABELS[2].label}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Policy Markers Data</CardTitle>
                <CardDescription>Detailed breakdown by policy marker and significance</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.length === 0 ? (
              <div className="flex items-center justify-center h-[400px] text-slate-500">
                No data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th 
                        className="text-left py-3 px-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 select-none"
                        onClick={() => handleSort('marker')}
                      >
                        <div className="flex items-center gap-2">
                          Policy Marker
                          {sortField === 'marker' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left py-3 px-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 select-none"
                        onClick={() => handleSort('significance')}
                      >
                        <div className="flex items-center gap-2">
                          Significance
                          {sortField === 'significance' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-right py-3 px-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 select-none"
                        onClick={() => handleSort('activity_count')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Number of Activities
                          {sortField === 'activity_count' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-right py-3 px-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 select-none"
                        onClick={() => handleSort('budget')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Total Activity Budget (USD)
                          {sortField === 'budget' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-800">{row.policy_marker_name}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: SIGNIFICANCE_LABELS[row.significance].color,
                              color: SIGNIFICANCE_LABELS[row.significance].color
                            }}
                          >
                            {SIGNIFICANCE_LABELS[row.significance].label}
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4 text-slate-600">{row.activity_count}</td>
                        <td className="text-right py-3 px-4 text-slate-600">
                          {row.total_budget_usd > 0 ? formatCurrencyFull(row.total_budget_usd) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50">
                      <td colSpan={2} className="py-3 px-4 font-semibold text-slate-800">Total</td>
                      <td className="text-right py-3 px-4 font-semibold text-slate-800">
                        {sortedData.reduce((sum, row) => sum + row.activity_count, 0)}
                      </td>
                      <td className="text-right py-3 px-4 font-semibold text-slate-800">
                        {formatCurrencyFull(sortedData.reduce((sum, row) => sum + row.total_budget_usd, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Time Series View */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Policy Markers Time Series</CardTitle>
                <CardDescription>
                  Total spend by policy marker and year (disbursements + expenditures)
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Info Box */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1 text-xs text-blue-800">
                  <p className="font-medium mb-1">About Time Series Data</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Shows actual spend (disbursements + expenditures) by calendar year</li>
                    <li>Values are in USD and reflect policy intent, not financial allocation</li>
                    <li>An activity's full spend is counted for each policy marker it is tagged with</li>
                  </ul>
                </div>
              </div>
            </div>
            {timeSeriesData.length === 0 ? (
              <div className="flex items-center justify-center h-[400px] text-slate-500">
                No data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 sticky left-0 bg-white z-10">
                        Policy Marker
                      </th>
                      {timeSeriesYears.map(year => (
                        <th key={year} className="text-right py-3 px-4 font-semibold text-slate-700">
                          Spend {year}
                        </th>
                      ))}
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-slate-50">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSeriesData.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-800 font-medium sticky left-0 bg-white z-10">
                          {row.policy_marker_name}
                        </td>
                        {timeSeriesYears.map(year => (
                          <td key={year} className="text-right py-3 px-4 text-slate-600">
                            {row.years[year] ? formatCurrencyFull(row.years[year]) : '-'}
                          </td>
                        ))}
                        <td className="text-right py-3 px-4 text-slate-800 font-semibold bg-slate-50">
                          {formatCurrencyFull(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-800 sticky left-0 bg-slate-50 z-10">
                        Total
                      </td>
                      {timeSeriesYears.map(year => {
                        const yearTotal = timeSeriesData.reduce((sum, row) => sum + (row.years[year] || 0), 0)
                        return (
                          <td key={year} className="text-right py-3 px-4 font-semibold text-slate-800">
                            {formatCurrencyFull(yearTotal)}
                          </td>
                        )
                      })}
                      <td className="text-right py-3 px-4 font-semibold text-slate-800 bg-slate-100">
                        {formatCurrencyFull(timeSeriesData.reduce((sum, row) => sum + row.total, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

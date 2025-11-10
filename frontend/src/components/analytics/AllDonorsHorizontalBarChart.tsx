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
  Cell,
  Legend
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, DollarSign, Wallet, Calendar, Search, TrendingUp, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type ViewMode = 'budgets' | 'planned' | 'disbursements'

interface AllDonorsChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  refreshKey: number
  onDataChange?: (data: DonorData[]) => void
}

interface DonorData {
  id: string
  name: string
  acronym: string | null
  type: string | null
  totalBudget: number
  totalPlannedDisbursement: number
  totalActualDisbursement: number
}

export function AllDonorsHorizontalBarChart({ dateRange, refreshKey, onDataChange }: AllDonorsChartProps) {
  const [allData, setAllData] = useState<DonorData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('disbursements')
  const [showPercentage, setShowPercentage] = useState(false)
  const [orgTypeFilter, setOrgTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [dateRange, refreshKey, orgTypeFilter])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('[AllDonorsChart] Starting data fetch')

      const queryParams = new URLSearchParams({
        dateFrom: dateRange.from.toISOString(),
        dateTo: dateRange.to.toISOString(),
        orgType: orgTypeFilter
      })

      const response = await fetch(`/api/analytics/all-donors?${queryParams}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch donor data')
      }

      console.log('[AllDonorsChart] Fetched donors:', result.count)
      setAllData(result.data || [])
      onDataChange?.(result.data || [])
    } catch (error) {
      console.error('[AllDonorsChart] Error fetching donor data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort data based on view mode and search
  const displayData = useMemo(() => {
    let filtered = allData

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(query) ||
        (d.acronym && d.acronym.toLowerCase().includes(query))
      )
    }

    // Sort by selected metric
    const sorted = [...filtered].sort((a, b) => {
      if (viewMode === 'budgets') {
        return b.totalBudget - a.totalBudget
      } else if (viewMode === 'planned') {
        return b.totalPlannedDisbursement - a.totalPlannedDisbursement
      } else {
        return b.totalActualDisbursement - a.totalActualDisbursement
      }
    })

    // Filter out orgs with zero value for selected metric
    return sorted.filter(d => {
      if (viewMode === 'budgets') return d.totalBudget > 0
      if (viewMode === 'planned') return d.totalPlannedDisbursement > 0
      return d.totalActualDisbursement > 0
    })
  }, [allData, viewMode, searchQuery])

  // Calculate total for percentage display
  const total = useMemo(() => {
    return displayData.reduce((sum, d) => {
      if (viewMode === 'budgets') return sum + d.totalBudget
      if (viewMode === 'planned') return sum + d.totalPlannedDisbursement
      return sum + d.totalActualDisbursement
    }, 0)
  }, [displayData, viewMode])

  const formatCurrency = (value: number) => {
    try {
      if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '$0'
      }
      const safeValue = Number(value)
      if (isNaN(safeValue) || !isFinite(safeValue)) {
        return '$0'
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(safeValue)
    } catch (error) {
      console.error('[AllDonorsChart] Error formatting currency:', error, value)
      return '$0'
    }
  }

  const formatPercentage = (value: number) => {
    if (total === 0) return '0%'
    return `${((value / total) * 100).toFixed(1)}%`
  }

  // Prepare data for chart based on view mode
  const chartData = useMemo(() => {
    return displayData.map(donor => {
      let value = 0
      if (viewMode === 'budgets') {
        value = donor.totalBudget
      } else if (viewMode === 'planned') {
        value = donor.totalPlannedDisbursement
      } else {
        value = donor.totalActualDisbursement
      }

      // Use acronym if available, otherwise use truncated name
      const displayName = donor.acronym || (donor.name.length > 30 ? donor.name.substring(0, 30) + '...' : donor.name)

      return {
        name: displayName,
        fullName: donor.name,
        acronym: donor.acronym,
        value,
        totalBudget: donor.totalBudget,
        totalPlannedDisbursement: donor.totalPlannedDisbursement,
        totalActualDisbursement: donor.totalActualDisbursement,
        percentage: total > 0 ? ((value / total) * 100) : 0,
        type: donor.type
      }
    })
  }, [displayData, viewMode, total])

  // Color scheme for bars
  const barColors = [
    '#334155', // slate-700
    '#475569', // slate-600
    '#64748b', // slate-500
    '#94a3b8', // slate-400
  ]

  const getBarColor = (index: number) => {
    return barColors[index % barColors.length]
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700">
          <p className="font-semibold text-white mb-2">{data.fullName}</p>
          {data.type && (
            <p className="text-xs text-slate-400 mb-2">Type: {data.type}</p>
          )}
          <div className="space-y-1 text-sm">
            <p className="text-slate-300">
              <span className="text-blue-400">■</span> Total Budgets (Reporting Org): {formatCurrency(data.totalBudget)}
            </p>
            <p className="text-slate-300">
              <span className="text-green-400">■</span> Planned Disbursements (Provider Org): {formatCurrency(data.totalPlannedDisbursement)}
            </p>
            <p className="text-slate-300">
              <span className="text-orange-400">■</span> Actual Disbursements (Provider Org): {formatCurrency(data.totalActualDisbursement)}
            </p>
          </div>
          {showPercentage && (
            <div className="border-t border-slate-600 mt-2 pt-2">
              <p className="text-sm text-slate-300">
                % of Total: {formatPercentage(data.value)}
              </p>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[600px] w-full bg-slate-100" />
      </div>
    )
  }

  const getViewLabel = () => {
    switch (viewMode) {
      case 'budgets':
        return 'Total Budgets (by Reporting Org)'
      case 'planned':
        return 'Total Planned Disbursements (by Provider Org)'
      case 'disbursements':
        return 'Total Actual Disbursements (by Provider Org)'
    }
  }

  const getViewIcon = () => {
    switch (viewMode) {
      case 'budgets':
        return <Wallet className="h-4 w-4" />
      case 'planned':
        return <Calendar className="h-4 w-4" />
      case 'disbursements':
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getViewDescription = () => {
    switch (viewMode) {
      case 'budgets':
        return 'Aggregated by Reporting Organisation - shows total planned spending across all activities'
      case 'planned':
        return 'Aggregated by Provider Organisation - shows total planned cash transfers to partners'
      case 'disbursements':
        return 'Aggregated by Provider Organisation - shows actual financial outflows to partners'
    }
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col gap-4">
          {/* View Selector */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              {getViewIcon()}
              <span>Viewing by:</span>
            </div>
            <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="budgets">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    <span>Total Budgets (Reporting Org)</span>
                  </div>
                </SelectItem>
                <SelectItem value="planned">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Planned Disbursements (Provider Org)</span>
                  </div>
                </SelectItem>
                <SelectItem value="disbursements">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Actual Disbursements (Provider Org)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={orgTypeFilter} onValueChange={setOrgTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organization Types</SelectItem>
                <SelectItem value="10">Government</SelectItem>
                <SelectItem value="21">International NGO</SelectItem>
                <SelectItem value="22">National NGO</SelectItem>
                <SelectItem value="40">Multilateral</SelectItem>
                <SelectItem value="60">Foundation</SelectItem>
                <SelectItem value="70">Private Sector</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPercentage(!showPercentage)}
              className={showPercentage ? 'bg-slate-100' : ''}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {showPercentage ? 'Hide' : 'Show'} %
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No donor data available</p>
            <p className="text-sm text-slate-500 mt-2">Try adjusting your date range or filters</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-4">
        {/* View Selector and Description */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              {getViewIcon()}
              <span className="font-medium">{getViewLabel()}</span>
            </div>
            <p className="text-xs text-slate-500 ml-6">{getViewDescription()}</p>
          </div>
          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="budgets">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span>Total Budgets</span>
                </div>
              </SelectItem>
              <SelectItem value="planned">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Planned Disbursements</span>
                </div>
              </SelectItem>
              <SelectItem value="disbursements">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Actual Disbursements</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filters and Options */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={orgTypeFilter} onValueChange={setOrgTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="10">Government</SelectItem>
              <SelectItem value="21">International NGO</SelectItem>
              <SelectItem value="22">National NGO</SelectItem>
              <SelectItem value="40">Multilateral</SelectItem>
              <SelectItem value="60">Foundation</SelectItem>
              <SelectItem value="70">Private Sector</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPercentage(!showPercentage)}
            className={showPercentage ? 'bg-slate-100' : ''}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {showPercentage ? 'Hide' : 'Show'} %
          </Button>
        </div>

        {/* Summary Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Showing {chartData.length} organization{chartData.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Total: {formatCurrency(total)}
          </Badge>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 35)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              horizontal={false}
            />
            <XAxis
              type="number"
              tickFormatter={formatCurrency}
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#cbd5e1' }}
              width={140}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="text-xs text-slate-500 text-center">
        <p>
          {viewMode === 'budgets' && 'Budgets are aggregated by the organization reporting the activity'}
          {viewMode === 'planned' && 'Planned disbursements are aggregated by the provider organization (funding source)'}
          {viewMode === 'disbursements' && 'Actual disbursements are aggregated by the provider organization (funding source)'}
        </p>
      </div>
    </div>
  )
}

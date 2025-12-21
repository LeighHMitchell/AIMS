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
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BarChart3, DollarSign, Wallet, Calendar, Search, Download, FileImage, Table as TableIcon, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ViewMode = 'budgets' | 'planned' | 'disbursements'
type ChartViewMode = 'bar' | 'table'

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
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('bar')
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

  const formatTooltipValue = (value: number) => {
    try {
      if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '$0.00'
      }
      const safeValue = Number(value)
      if (isNaN(safeValue) || !isFinite(safeValue)) {
        return '$0.00'
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(safeValue)
    } catch (error) {
      console.error('[AllDonorsChart] Error formatting currency:', error, value)
      return '$0.00'
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
      
      // Filter out zero values
      const metrics = [
        {
          name: 'Total Budgets (Reporting Org)',
          value: data.totalBudget,
          color: '#334155' // slate-700
        },
        {
          name: 'Planned Disbursements (Provider Org)',
          value: data.totalPlannedDisbursement,
          color: '#475569' // slate-600
        },
        {
          name: 'Actual Disbursements (Provider Org)',
          value: data.totalActualDisbursement,
          color: '#64748b' // slate-500
        }
      ].filter(m => m.value > 0)

      if (metrics.length === 0) return null

      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
            <p className="font-semibold text-slate-900 text-sm">{data.fullName}</p>
            {data.type && (
              <p className="text-xs text-slate-600 mt-0.5">Type: {data.type}</p>
            )}
          </div>
          <div className="p-2">
            <table className="w-full text-sm">
              <tbody>
                {metrics.map((metric, index) => (
                  <tr key={index} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-1.5 pr-4 flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: metric.color }}
                      />
                      <span className="text-slate-700 font-medium">{metric.name}</span>
                    </td>
                    <td className="py-1.5 text-right font-semibold text-slate-900">
                      {formatTooltipValue(metric.value)}
                    </td>
                  </tr>
                ))}
                {showPercentage && (
                  <tr className="border-t border-slate-200 mt-1">
                    <td className="py-1.5 pr-4 text-slate-700 font-medium">
                      % of Total
                    </td>
                    <td className="py-1.5 text-right font-semibold text-slate-900">
                      {formatPercentage(data.value)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
    return null
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (chartData.length === 0) return

    const headers = [
      'Organization',
      'Acronym',
      'Type',
      'Total Budgets (Reporting Org)',
      'Planned Disbursements (Provider Org)',
      'Actual Disbursements (Provider Org)',
      'Selected Metric Value',
      'Percentage of Total'
    ]

    const rows = chartData.map(d => {
      const selectedValue = d.value.toFixed(2)
      const percentage = total > 0 ? `${((d.value / total) * 100).toFixed(2)}%` : '0%'
      
      return [
        d.fullName || '',
        d.acronym || '',
        d.type || '',
        d.totalBudget.toFixed(2),
        d.totalPlannedDisbursement.toFixed(2),
        d.totalActualDisbursement.toFixed(2),
        selectedValue,
        percentage
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })

    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `all-donors-financial-overview-${new Date().getTime()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Export to JPG
  const handleExportJPG = () => {
    const chartElement = document.querySelector('#all-donors-chart') as HTMLElement
    if (!chartElement) return

    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2
      }).then(canvas => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.download = `all-donors-financial-overview-${new Date().getTime()}.jpg`
            link.href = url
            link.click()
            URL.revokeObjectURL(url)
          }
        }, 'image/jpeg', 0.95)
      })
    })
  }

  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            All Donors Financial Overview
          </CardTitle>
          <CardDescription>
            Complete ranking of all donors by total budgets, planned disbursements, or actual disbursements in USD
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                All Donors Financial Overview
              </CardTitle>
              <CardDescription>
                Complete ranking of all donors by total budgets, planned disbursements, or actual disbursements in USD
              </CardDescription>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
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
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 border rounded-lg p-1 bg-white">
                  <Button
                    variant={chartViewMode === 'bar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartViewMode('bar')}
                    className="h-8"
                  >
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                    Bar
                  </Button>
                  <Button
                    variant={chartViewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartViewMode('table')}
                    className="h-8"
                  >
                    <TableIcon className="h-4 w-4 mr-1.5" />
                    Table
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="h-8 px-2"
                    title="Export to CSV"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportJPG}
                    className="h-8 px-2"
                    title="Export to JPG"
                    disabled={chartViewMode === 'table'}
                  >
                    <FileImage className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-slate-600 font-medium">No donor data available</p>
              <p className="text-sm text-slate-500 mt-2">Try adjusting your date range or filters</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              All Donors Financial Overview
            </CardTitle>
            <CardDescription>
              Complete ranking of all donors by total budgets, planned disbursements, or actual disbursements in USD
            </CardDescription>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Filters - Left Side */}
            <div className="flex items-center gap-2 flex-wrap">
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
            </div>

            {/* View Controls and Export - Right Side */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant={chartViewMode === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartViewMode('bar')}
                  className="h-8"
                >
                  <BarChart3 className="h-4 w-4 mr-1.5" />
                  Bar
                </Button>
                <Button
                  variant={chartViewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartViewMode('table')}
                  className="h-8"
                >
                  <TableIcon className="h-4 w-4 mr-1.5" />
                  Table
                </Button>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8 px-2"
                  title="Export to CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportJPG}
                  className="h-8 px-2"
                  title="Export to JPG"
                  disabled={chartViewMode === 'table'}
                >
                  <FileImage className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent id="all-donors-chart">
        <div className="space-y-4">
          {chartViewMode === 'table' ? (
            <div className="rounded-md border overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 bg-white z-10">
                    <TableHead className="bg-white">Organization</TableHead>
                    <TableHead className="text-right bg-white">Total Budgets</TableHead>
                    <TableHead className="text-right bg-white">Planned Disbursements</TableHead>
                    <TableHead className="text-right bg-white">Actual Disbursements</TableHead>
                    {showPercentage && (
                      <TableHead className="text-right bg-white">% of Total</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.fullName}</TableCell>
                      <TableCell className="text-right">{formatTooltipValue(item.totalBudget)}</TableCell>
                      <TableCell className="text-right">{formatTooltipValue(item.totalPlannedDisbursement)}</TableCell>
                      <TableCell className="text-right">{formatTooltipValue(item.totalActualDisbursement)}</TableCell>
                      {showPercentage && (
                        <TableCell className="text-right">{formatPercentage(item.value)}</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
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
          )}
        </div>

        <div className="text-xs text-slate-500 text-center mt-4">
          <p>
            {viewMode === 'budgets' && 'Budgets are aggregated by the organization reporting the activity'}
            {viewMode === 'planned' && 'Planned disbursements are aggregated by the provider organization (funding source)'}
            {viewMode === 'disbursements' && 'Actual disbursements are aggregated by the provider organization (funding source)'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

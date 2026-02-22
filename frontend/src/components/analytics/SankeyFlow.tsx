"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingText } from '@/components/ui/loading-text'
import { ArrowRight, Download, BarChart3, LineChart as LineChartIcon, Table as TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts'
import { ExpandableCard } from '@/components/ui/expandable-card'
import { exportToCSV } from '@/lib/csv-export'
import { exportChartToJPG } from '@/lib/chart-export'
import { CHART_COLORS, CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface SankeyFlowProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
  }
  refreshKey: number
}

interface FlowData {
  donor: string
  sector: string
  amount: number
}

type ViewMode = 'cumulative' | 'periodic'
type ChartType = 'line' | 'bar' | 'table' | 'sankey'

interface ChartDataPoint {
  period: string
  [key: string]: number | string
}

export function SankeyFlow({ dateRange, filters, refreshKey }: SankeyFlowProps) {
  const [data, setData] = useState<FlowData[]>([])
  const [donors, setDonors] = useState<{name: string, total: number}[]>([])
  const [sectors, setSectors] = useState<{name: string, total: number}[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('periodic')
  const [chartType, setChartType] = useState<ChartType>('sankey')
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Get transactions with donor and sector information
      let query = supabase
        .from('transactions')
        .select(`
          value,
          transaction_type,
          status,
          transaction_date,
          provider_org_id,
          organizations!provider_org_id (
            id,
            name
          ),
          activities!inner (
            id,
            activity_sectors (
              sector_code,
              percentage
            )
          )
        `)
        .eq('transaction_type', '3') // Disbursements
        .eq('status', 'actual')
        .gte('transaction_date', dateRange.from.toISOString())
        .lte('transaction_date', dateRange.to.toISOString())
        .not('provider_org_id', 'is', null)

      // Apply country filter if needed
      if (filters?.country && filters.country !== 'all') {
        query = query.contains('activities.locations', { country_code: filters.country })
      }

      const { data: transactions } = await query

      // Get sector names
      const { data: sectorMappings } = await supabase
        .from('iati_reference_values')
        .select('code, name')
        .eq('type', 'Sector')

      const sectorMap = new Map(sectorMappings?.map((s: any) => [s.code, s.name]) || [])

      // Process flow data
      const flowMap = new Map<string, number>()
      const donorTotals = new Map<string, number>()
      const sectorTotals = new Map<string, number>()
      const periodMap = new Map<string, Map<string, number>>()

      transactions?.forEach((transaction: any) => {
        const value = parseFloat(transaction.value) || 0
        if (isNaN(value) || value <= 0) return

        const donorName = transaction.organizations?.name || 'Unknown Donor'
        const sectors = transaction.activities?.activity_sectors || []
        const transactionDate = new Date(transaction.transaction_date)
        const periodKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`

        if (sectors.length === 0) {
          // If no sectors, attribute to "Unspecified"
          const key = `${donorName}|Unspecified`
          flowMap.set(key, (flowMap.get(key) || 0) + value)
          donorTotals.set(donorName, (donorTotals.get(donorName) || 0) + value)
          sectorTotals.set('Unspecified', (sectorTotals.get('Unspecified') || 0) + value)

          // Track by period
          if (!periodMap.has(periodKey)) {
            periodMap.set(periodKey, new Map())
          }
          const periodData = periodMap.get(periodKey)!
          periodData.set('Unspecified', (periodData.get('Unspecified') || 0) + value)
        } else {
          // Distribute value across sectors based on percentage
          sectors.forEach((sector: any) => {
            const sectorName = sectorMap.get(sector.sector_code) || sector.sector_code || 'Unknown'
            const percentage = sector.percentage || (100 / sectors.length)
            const sectorValue = value * (percentage / 100)

            const key = `${donorName}|${sectorName}`
            flowMap.set(key, (flowMap.get(key) || 0) + sectorValue)
            donorTotals.set(donorName, (donorTotals.get(donorName) || 0) + sectorValue)
            sectorTotals.set(sectorName, (sectorTotals.get(sectorName) || 0) + sectorValue)

            // Track by period
            if (!periodMap.has(periodKey)) {
              periodMap.set(periodKey, new Map())
            }
            const periodData = periodMap.get(periodKey)!
            periodData.set(sectorName, (periodData.get(sectorName) || 0) + sectorValue)
          })
        }
      })

      // Convert to arrays and sort
      const flowData: FlowData[] = Array.from(flowMap.entries())
        .map(([key, amount]) => {
          const [donor, sector] = key.split('|')
          return { donor, sector, amount }
        })
        .filter(d => d.amount > 0)
        .sort((a, b) => b.amount - a.amount)

      const topDonors = Array.from(donorTotals.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      const topSectors = Array.from(sectorTotals.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)

      // Filter flow data to only include top donors and sectors
      const topDonorNames = new Set(topDonors.map(d => d.name))
      const topSectorNames = new Set(topSectors.map(s => s.name))

      const filteredFlowData = flowData.filter(f =>
        topDonorNames.has(f.donor) && topSectorNames.has(f.sector)
      )

      setData(filteredFlowData)
      setDonors(topDonors)
      setSectors(topSectors)

      // Generate chart data for line/bar views
      const periods = Array.from(periodMap.keys()).sort()
      const chartDataPoints: ChartDataPoint[] = periods.map(period => {
        const point: ChartDataPoint = { period }
        const periodData = periodMap.get(period)!

        topSectors.forEach(sector => {
          point[sector.name] = periodData.get(sector.name) || 0
        })

        return point
      })

      // Apply cumulative calculation if needed
      if (viewMode === 'cumulative') {
        const cumulativeData: ChartDataPoint[] = []
        const runningTotals: { [key: string]: number } = {}

        chartDataPoints.forEach(point => {
          const cumulativePoint: ChartDataPoint = { period: point.period }

          topSectors.forEach(sector => {
            const sectorName = sector.name
            runningTotals[sectorName] = (runningTotals[sectorName] || 0) + (point[sectorName] as number || 0)
            cumulativePoint[sectorName] = runningTotals[sectorName]
          })

          cumulativeData.push(cumulativePoint)
        })

        setChartData(cumulativeData)
      } else {
        setChartData(chartDataPoints)
      }

    } catch (error) {
      console.error('Error fetching flow data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Recalculate chart data when view mode changes
  useEffect(() => {
    if (chartData.length === 0) return
    fetchData()
  }, [viewMode])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }

  const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const getFlowWidth = (amount: number, maxAmount: number) => {
    const minWidth = 2
    const maxWidth = 40
    return minWidth + ((amount / maxAmount) * (maxWidth - minWidth))
  }

  const totalAmount = useMemo(() => {
    return sectors.reduce((sum, sector) => sum + sector.total, 0)
  }, [sectors])

  const handleExportCSV = useCallback(() => {
    if (chartType === 'sankey') {
      // Export flow data
      const csvData = data.map(flow => ({
        'Donor': flow.donor,
        'Sector': flow.sector,
        'Amount (USD)': flow.amount
      }))
      exportToCSV(csvData, 'sector-flow-visualization')
    } else {
      // Export chart data
      const csvData = chartData.map(point => {
        const row: any = { Period: point.period }
        sectors.forEach(sector => {
          row[sector.name] = point[sector.name] || 0
        })
        return row
      })
      exportToCSV(csvData, 'sector-flow-data')
    }
  }, [chartType, data, chartData, sectors])

  const handleExportJPG = useCallback(() => {
    if (chartRef.current) {
      exportChartToJPG(chartRef.current, 'sector-flow-visualization')
    }
  }, [])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
    )
  }

  const maxAmount = Math.max(...data.map(d => d.amount))

  const renderSankeyView = () => (
    <div className="h-full min-h-[400px]">
      <div className="grid grid-cols-5 gap-4 h-full">
        {/* Donors Column */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Top Donors</h4>
          <div className="space-y-3">
            {donors.map(donor => (
              <div key={donor.name}>
                <div className="text-sm font-medium text-foreground truncate">
                  {donor.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(donor.total)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flow Visualization */}
        <div className="col-span-1 flex flex-col justify-center">
          <div className="relative h-full min-h-[300px]">
            {data.map((flow, index) => {
              const donorIndex = donors.findIndex(d => d.name === flow.donor)
              const sectorIndex = sectors.findIndex(s => s.name === flow.sector)

              if (donorIndex === -1 || sectorIndex === -1) return null

              const opacity = 0.3 + (flow.amount / maxAmount) * 0.4

              return (
                <div
                  key={index}
                  className="absolute flex items-center"
                  style={{
                    top: `${(donorIndex + 0.5) * (100 / donors.length)}%`,
                    transform: 'translateY(-50%)',
                    width: '100%'
                  }}
                >
                  <div
                    className="bg-slate-400 rounded"
                    style={{
                      height: `${getFlowWidth(flow.amount, maxAmount)}px`,
                      opacity,
                      width: '100%'
                    }}
                  />
                </div>
              )
            })}
            <ArrowRight className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-slate-400 h-6 w-6" />
          </div>
        </div>

        {/* Sectors Column */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Top Sectors</h4>
          <div className="space-y-3">
            {sectors.map(sector => (
              <div key={sector.name}>
                <div className="text-sm font-medium text-foreground truncate">
                  {sector.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(sector.total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t pt-4">
        <p className="text-xs text-muted-foreground text-center">
          Flow width represents disbursement amount from donor to sector
        </p>
      </div>
    </div>
  )

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis dataKey="period" />
        <YAxis tickFormatter={(value) => formatCurrency(value)} />
        <Tooltip formatter={(value: any) => formatCurrencyFull(value)} />
        <Legend />
        {sectors.map((sector, index) => (
          <Line
            key={sector.name}
            type="monotone"
            dataKey={sector.name}
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis dataKey="period" />
        <YAxis tickFormatter={(value) => formatCurrency(value)} />
        <Tooltip formatter={(value: any) => formatCurrencyFull(value)} />
        <Legend />
        {sectors.map((sector, index) => (
          <Bar
            key={sector.name}
            dataKey={sector.name}
            fill={CHART_COLORS[index % CHART_COLORS.length]}
            stackId="a"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )

  const renderTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            {sectors.map(sector => (
              <TableHead key={sector.name} className="text-right">
                {sector.name}
              </TableHead>
            ))}
            <TableHead className="text-right font-semibold">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chartData.map((point, index) => {
            const rowTotal = sectors.reduce((sum, sector) => sum + (point[sector.name] as number || 0), 0)
            return (
              <TableRow key={index}>
                <TableCell className="font-medium">{point.period}</TableCell>
                {sectors.map(sector => (
                  <TableCell key={sector.name} className="text-right">
                    {formatCurrencyFull(point[sector.name] as number || 0)}
                  </TableCell>
                ))}
                <TableCell className="text-right font-semibold">
                  {formatCurrencyFull(rowTotal)}
                </TableCell>
              </TableRow>
            )
          })}
          <TableRow className="font-semibold bg-muted">
            <TableCell>Total</TableCell>
            {sectors.map(sector => {
              const columnTotal = chartData.reduce((sum, point) => sum + (point[sector.name] as number || 0), 0)
              return (
                <TableCell key={sector.name} className="text-right">
                  {formatCurrencyFull(columnTotal)}
                </TableCell>
              )
            })}
            <TableCell className="text-right">
              {formatCurrencyFull(totalAmount)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )

  return (
    <ExpandableCard
      className="bg-card border-border lg:col-span-2"
      title={
        <div className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          <span>Sector Flow Visualization</span>
        </div>
      }
      description="Flow of disbursements from donors to sectors"
      exportData={chartType === 'sankey' ? data : chartData}
    >
      <div ref={chartRef} className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="flex">
              <Button
                variant={viewMode === 'periodic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('periodic')}
                disabled={chartType === 'sankey'}
                className="rounded-r-none"
              >
                Periodic
              </Button>
              <Button
                variant={viewMode === 'cumulative' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cumulative')}
                disabled={chartType === 'sankey'}
                className="rounded-l-none"
              >
                Cumulative
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Display:</span>
            <div className="flex gap-1">
              <Button
                variant={chartType === 'sankey' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('sankey')}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('table')}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJPG}
            >
              <Download className="h-4 w-4 mr-1" />
              JPG
            </Button>
          </div>
        </div>

        {/* Total Display */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium text-muted-foreground">Total Disbursements:</span>
          <span className="text-lg font-bold text-foreground">{formatCurrencyFull(totalAmount)}</span>
        </div>

        {/* Chart Display */}
        <div className="w-full">
          {chartType === 'sankey' && renderSankeyView()}
          {chartType === 'line' && renderLineChart()}
          {chartType === 'bar' && renderBarChart()}
          {chartType === 'table' && renderTable()}
        </div>
      </div>
    </ExpandableCard>
  )
}

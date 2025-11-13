"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Download, FileImage, LineChart as LineChartIcon, BarChart3, Table as TableIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { exportToCSV } from '@/lib/csv-export'

type DataMode = 'cumulative' | 'periodic'
type ChartType = 'line' | 'bar' | 'table' | 'total'

interface CumulativeFinancialOverviewProps {
  dateRange?: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
    donor?: string
    sector?: string
  }
  refreshKey?: number
}

export function CumulativeFinancialOverview({
  dateRange,
  filters,
  refreshKey
}: CumulativeFinancialOverviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cumulativeData, setCumulativeData] = useState<any[]>([])
  const [dataMode, setDataMode] = useState<DataMode>('cumulative')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all transactions
        let transactionsQuery = supabase
          .from('transactions')
          .select('transaction_date, transaction_type, value, value_usd, currency, activity_id, provider_org_id')
          .eq('status', 'actual')
          .order('transaction_date', { ascending: true })

        // Apply date range filter
        if (dateRange) {
          transactionsQuery = transactionsQuery
            .gte('transaction_date', dateRange.from.toISOString())
            .lte('transaction_date', dateRange.to.toISOString())
        }

        // Apply donor filter
        if (filters?.donor) {
          transactionsQuery = transactionsQuery.eq('provider_org_id', filters.donor)
        }

        const { data: transactions, error: transactionsError } = await transactionsQuery

        if (transactionsError) {
          console.error('[CumulativeFinancialOverview] Error fetching transactions:', transactionsError)
          setError('Failed to fetch transaction data')
          return
        }

        // Fetch planned disbursements
        let plannedDisbursementsQuery = supabase
          .from('planned_disbursements')
          .select('period_start, amount, usd_amount, currency, activity_id')
          .order('period_start', { ascending: true })

        if (dateRange) {
          plannedDisbursementsQuery = plannedDisbursementsQuery
            .gte('period_start', dateRange.from.toISOString())
            .lte('period_start', dateRange.to.toISOString())
        }

        const { data: plannedDisbursements, error: plannedError } = await plannedDisbursementsQuery

        if (plannedError) {
          console.error('[CumulativeFinancialOverview] Error fetching planned disbursements:', plannedError)
        }

        // Fetch budgets
        let budgetsQuery = supabase
          .from('activity_budgets')
          .select('period_start, value, usd_value, currency, activity_id')
          .order('period_start', { ascending: true })

        if (dateRange) {
          budgetsQuery = budgetsQuery
            .gte('period_start', dateRange.from.toISOString())
            .lte('period_start', dateRange.to.toISOString())
        }

        const { data: budgets, error: budgetsError } = await budgetsQuery

        if (budgetsError) {
          console.error('[CumulativeFinancialOverview] Error fetching budgets:', budgetsError)
        }

        // Process data to create cumulative overview
        const dateMap = new Map<string, any>()

        // Process transactions by type
        transactions?.forEach((transaction: any) => {
          if (!transaction.transaction_date) return

          const date = new Date(transaction.transaction_date)
          if (isNaN(date.getTime())) return

          const dateKey = date.toISOString().split('T')[0]

          // ONLY use USD values - use value_usd
          let value = parseFloat(String(transaction.value_usd)) || 0

          // Only use raw value if currency is explicitly USD and no USD conversion exists
          if (!value && transaction.currency === 'USD' && transaction.value) {
            value = parseFloat(String(transaction.value)) || 0
          }

          // Skip transactions without valid USD values
          if (!value) return

          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              date,
              timestamp: date.getTime(),
              incomingFunds: 0,
              commitments: 0,
              disbursements: 0,
              expenditures: 0,
              plannedDisbursements: 0,
              plannedBudgets: 0
            })
          }

          const point = dateMap.get(dateKey)!
          const type = transaction.transaction_type

          if (type === '1' || type === '12') {
            point.incomingFunds += value
          } else if (type === '2' || type === '11') {
            point.commitments += value
          } else if (type === '3') {
            point.disbursements += value
          } else if (type === '4') {
            point.expenditures += value
          }
        })

        // Process planned disbursements
        plannedDisbursements?.forEach((pd: any) => {
          if (!pd.period_start) return

          const date = new Date(pd.period_start)
          if (isNaN(date.getTime())) return

          const dateKey = date.toISOString().split('T')[0]

          // ONLY use USD values - try usd_amount first
          let value = parseFloat(String(pd.usd_amount)) || 0

          // Only use raw amount if currency is explicitly USD and no USD conversion exists
          if (!value && pd.currency === 'USD' && pd.amount) {
            value = parseFloat(String(pd.amount)) || 0
          }

          // Skip planned disbursements without valid USD values
          if (!value) return

          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              date,
              timestamp: date.getTime(),
              incomingFunds: 0,
              commitments: 0,
              disbursements: 0,
              expenditures: 0,
              plannedDisbursements: 0,
              plannedBudgets: 0
            })
          }

          dateMap.get(dateKey)!.plannedDisbursements += value
        })

        // Process budgets
        budgets?.forEach((budget: any) => {
          if (!budget.period_start) return

          const date = new Date(budget.period_start)
          if (isNaN(date.getTime())) return

          const dateKey = date.toISOString().split('T')[0]

          // ONLY use USD values - try usd_value first
          let value = parseFloat(String(budget.usd_value)) || 0

          // Only use raw value if currency is explicitly USD and no USD conversion exists
          if (!value && budget.currency === 'USD' && budget.value) {
            value = parseFloat(String(budget.value)) || 0
          }

          // Skip budgets without valid USD values
          if (!value) return

          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              date,
              timestamp: date.getTime(),
              incomingFunds: 0,
              commitments: 0,
              disbursements: 0,
              expenditures: 0,
              plannedDisbursements: 0,
              plannedBudgets: 0
            })
          }

          dateMap.get(dateKey)!.plannedBudgets += value
        })

        // Convert to array and sort by date
        const sortedPoints = Array.from(dateMap.values()).sort((a, b) => a.timestamp - b.timestamp)

        // Calculate cumulative values
        let cumulativeIncomingFunds = 0
        let cumulativeCommitments = 0
        let cumulativeDisbursements = 0
        let cumulativeExpenditures = 0
        let cumulativePlannedDisbursements = 0
        let cumulativePlannedBudgets = 0

        // Aggregate into yearly buckets for cleaner visualization
        const yearlyMap = new Map<string, any>()

        sortedPoints.forEach((point) => {
          cumulativeIncomingFunds += point.incomingFunds
          cumulativeCommitments += point.commitments
          cumulativeDisbursements += point.disbursements
          cumulativeExpenditures += point.expenditures
          cumulativePlannedDisbursements += point.plannedDisbursements
          cumulativePlannedBudgets += point.plannedBudgets

          // Use year as key for yearly aggregation
          const yearKey = `${point.date.getFullYear()}`

          // Keep the latest cumulative values for each year (end of year snapshot)
          yearlyMap.set(yearKey, {
            date: point.date.toISOString(),
            timestamp: point.timestamp,
            yearKey,
            displayDate: `${point.date.getFullYear()}`,
            fullDate: `${point.date.getFullYear()}`,
            'Incoming Funds': cumulativeIncomingFunds,
            'Commitments': cumulativeCommitments,
            'Disbursements': cumulativeDisbursements,
            'Expenditures': cumulativeExpenditures,
            'Planned Disbursements': cumulativePlannedDisbursements,
            'Budgets': cumulativePlannedBudgets
          })
        })

        const sortedData = Array.from(yearlyMap.values()).sort((a, b) => a.timestamp - b.timestamp)

        // Fill in missing years to ensure continuous time axis
        if (sortedData.length === 0) {
          setCumulativeData([])
          return
        }

        const filledData: any[] = []
        const firstDate = new Date(sortedData[0].timestamp)
        const lastDate = new Date(sortedData[sortedData.length - 1].timestamp)

        // Create a map for quick lookup
        const dataMap = new Map(sortedData.map(d => [d.yearKey, d]))

        // Iterate through all years from first to last
        const startYear = firstDate.getFullYear()
        const endYear = lastDate.getFullYear()

        let lastCumulativeValues = {
          incomingFunds: 0,
          commitments: 0,
          disbursements: 0,
          expenditures: 0,
          plannedDisbursements: 0,
          plannedBudgets: 0
        }

        for (let year = startYear; year <= endYear; year++) {
          const yearKey = `${year}`

          if (dataMap.has(yearKey)) {
            const existingData = dataMap.get(yearKey)!
            filledData.push(existingData)
            // Update last known cumulative values
            lastCumulativeValues = {
              incomingFunds: existingData['Incoming Funds'],
              commitments: existingData['Commitments'],
              disbursements: existingData['Disbursements'],
              expenditures: existingData['Expenditures'],
              plannedDisbursements: existingData['Planned Disbursements'],
              plannedBudgets: existingData['Budgets']
            }
          } else {
            // Fill missing year with last cumulative values (carry forward)
            const yearDate = new Date(year, 0, 1)
            filledData.push({
              date: yearDate.toISOString(),
              timestamp: yearDate.getTime(),
              yearKey,
              displayDate: `${year}`,
              fullDate: `${year}`,
              'Incoming Funds': lastCumulativeValues.incomingFunds,
              'Commitments': lastCumulativeValues.commitments,
              'Disbursements': lastCumulativeValues.disbursements,
              'Expenditures': lastCumulativeValues.expenditures,
              'Planned Disbursements': lastCumulativeValues.plannedDisbursements,
              'Budgets': lastCumulativeValues.plannedBudgets
            })
          }
        }

        setCumulativeData(filledData)
      } catch (err) {
        console.error('[CumulativeFinancialOverview] Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange, filters, refreshKey])

  // No filtering - use all available data
  const filteredData = useMemo(() => {
    return cumulativeData
  }, [cumulativeData])

  // Calculate periodic (non-cumulative) data
  const periodicData = useMemo(() => {
    if (filteredData.length === 0) return []

    return filteredData.map((item, index) => {
      if (index === 0) {
        // First period shows the actual values (not differences)
        return {
          ...item,
          'Incoming Funds': item['Incoming Funds'],
          'Commitments': item['Commitments'],
          'Disbursements': item['Disbursements'],
          'Expenditures': item['Expenditures'],
          'Planned Disbursements': item['Planned Disbursements'],
          'Budgets': item['Budgets']
        }
      }

      const prevItem = filteredData[index - 1]
      return {
        ...item,
        'Incoming Funds': item['Incoming Funds'] - prevItem['Incoming Funds'],
        'Commitments': item['Commitments'] - prevItem['Commitments'],
        'Disbursements': item['Disbursements'] - prevItem['Disbursements'],
        'Expenditures': item['Expenditures'] - prevItem['Expenditures'],
        'Planned Disbursements': item['Planned Disbursements'] - prevItem['Planned Disbursements'],
        'Budgets': item['Budgets'] - prevItem['Budgets']
      }
    })
  }, [filteredData])

  // Calculate totals
  const totals = useMemo(() => {
    if (filteredData.length === 0) return null

    const lastItem = filteredData[filteredData.length - 1]
    return {
      'Incoming Funds': lastItem['Incoming Funds'],
      'Commitments': lastItem['Commitments'],
      'Disbursements': lastItem['Disbursements'],
      'Expenditures': lastItem['Expenditures'],
      'Planned Disbursements': lastItem['Planned Disbursements'],
      'Budgets': lastItem['Budgets']
    }
  }, [filteredData])

  // Get display data based on data mode
  const displayData = useMemo(() => {
    if (dataMode === 'periodic') return periodicData
    return filteredData
  }, [dataMode, filteredData, periodicData])

  // Determine which series have any non-zero data to show in legend
  const activeSeries = useMemo(() => {
    if (displayData.length === 0) return new Set()

    const series = new Set<string>()
    const seriesKeys = ['Incoming Funds', 'Commitments', 'Disbursements', 'Expenditures', 'Planned Disbursements', 'Budgets']

    seriesKeys.forEach(key => {
      const hasData = displayData.some(d => d[key] && d[key] > 0)
      if (hasData) series.add(key)
    })

    return series
  }, [displayData])

  // Calculate intelligent tick interval for x-axis (for yearly data)
  const getXAxisInterval = (dataLength: number) => {
    if (dataLength <= 10) return 0  // Show all years if 10 or fewer
    if (dataLength <= 20) return 1  // Show every other year
    if (dataLength <= 30) return 2  // Show every 3rd year
    return Math.floor(dataLength / 10)  // Show ~10 ticks
  }

  const formatCurrency = (value: number) => {
    const isNegative = value < 0
    const absValue = Math.abs(value)

    let formatted = ''
    if (absValue >= 1000000000) {
      formatted = `$${Math.round(absValue / 1000000000)}b`
    } else if (absValue >= 1000000) {
      formatted = `$${Math.round(absValue / 1000000)}m`
    } else if (absValue >= 1000) {
      formatted = `$${Math.round(absValue / 1000)}k`
    } else {
      formatted = `$${Math.round(absValue)}`
    }

    return isNegative ? `-${formatted}` : formatted
  }

  const formatTooltipValue = (value: number) => {
    const isNegative = value < 0
    const absValue = Math.abs(value)

    let formatted = ''
    if (absValue >= 1000000000) {
      formatted = `$${(absValue / 1000000000).toFixed(1)}b`
    } else if (absValue >= 1000000) {
      formatted = `$${(absValue / 1000000).toFixed(1)}m`
    } else if (absValue >= 1000) {
      formatted = `$${(absValue / 1000).toFixed(1)}k`
    } else {
      formatted = `$${absValue.toLocaleString()}`
    }

    return isNegative ? `-${formatted}` : formatted
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Filter out entries with zero or null values
      const nonZeroPayload = payload.filter((entry: any) => entry.value != null && entry.value !== 0)

      if (nonZeroPayload.length === 0) {
        return null
      }

      // Try to get full date from the data point, fallback to label
      const fullDate = payload[0]?.payload?.fullDate || label

      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
            <p className="font-semibold text-slate-900 text-sm">{fullDate}</p>
          </div>
          <div className="p-2">
            <table className="w-full text-sm">
              <tbody>
                {nonZeroPayload.map((entry: any, index: number) => (
                  <tr key={index} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-1.5 pr-4 flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-slate-700 font-medium">{entry.name}</span>
                    </td>
                    <td className="py-1.5 text-right font-semibold text-slate-900">
                      {formatTooltipValue(entry.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
    return null
  }

  // Handle legend click to toggle series visibility
  const handleLegendClick = (e: any) => {
    if (!e || !e.dataKey) return

    const dataKey = e.dataKey
    const newHiddenSeries = new Set(hiddenSeries)

    if (newHiddenSeries.has(dataKey)) {
      newHiddenSeries.delete(dataKey)
    } else {
      newHiddenSeries.add(dataKey)
    }

    setHiddenSeries(newHiddenSeries)
  }

  // Custom legend formatter to show opacity for hidden series
  const renderLegend = (props: any) => {
    const { payload } = props

    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => {
          const isHidden = hiddenSeries.has(entry.dataKey)

          return (
            <li
              key={`item-${index}`}
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => handleLegendClick({ dataKey: entry.dataKey })}
              style={{ opacity: isHidden ? 0.3 : 1 }}
            >
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-slate-700">{entry.value}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  // Export to CSV
  const handleExportCSV = () => {
    const dataToExport = displayData.map(d => ({
      'Period': d.fullDate || d.displayDate,
      'Incoming Funds': d['Incoming Funds']?.toFixed(2) || '0.00',
      'Commitments': d['Commitments']?.toFixed(2) || '0.00',
      'Disbursements': d['Disbursements']?.toFixed(2) || '0.00',
      'Expenditures': d['Expenditures']?.toFixed(2) || '0.00',
      'Planned Disbursements': d['Planned Disbursements']?.toFixed(2) || '0.00',
      'Budgets': d['Budgets']?.toFixed(2) || '0.00'
    }))

    const csv = [
      Object.keys(dataToExport[0] || {}).join(","),
      ...dataToExport.map(row => Object.values(row).map(v => `"${v}"`).join(","))
    ].join("\n")

    exportToCSV(csv, `cumulative-financial-overview-${new Date().getTime()}.csv`)
  }

  // Export to JPG
  const handleExportJPG = () => {
    const chartElement = document.querySelector('#cumulative-financial-chart') as HTMLElement
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
            link.download = `cumulative-financial-overview-${new Date().getTime()}.jpg`
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
            Cumulative Financial Overview
          </CardTitle>
          <CardDescription>
            Cumulative view of all transaction types, planned disbursements, and planned budgets over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Cumulative Financial Overview
          </CardTitle>
          <CardDescription>
            Cumulative view of all transaction types, planned disbursements, and planned budgets over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex flex-col gap-4">
          {/* Title and Description */}
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Financial Overview
            </CardTitle>
            <CardDescription>
              {dataMode === 'cumulative' && chartType !== 'total' && 'Cumulative tracking of actual transactions, planned disbursements, and budgets across all activities over time'}
              {dataMode === 'periodic' && chartType !== 'total' && 'Period-by-period changes in actual transactions, planned disbursements, and budgets across all activities'}
              {chartType === 'total' && 'Total values of transactions, planned disbursements, and budgets aggregated across all periods and activities'}
            </CardDescription>
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Periodic/Cumulative Toggle */}
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <Button
                variant={dataMode === 'periodic' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDataMode('periodic')}
                className="h-8"
              >
                Periodic
              </Button>
              <Button
                variant={dataMode === 'cumulative' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDataMode('cumulative')}
                className="h-8"
              >
                Cumulative
              </Button>
            </div>

            {/* Chart Type Toggle */}
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className="h-8"
              >
                <LineChartIcon className="h-4 w-4 mr-1.5" />
                Line
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="h-8"
              >
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Bar
              </Button>
              <Button
                variant={chartType === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('table')}
                className="h-8"
              >
                <TableIcon className="h-4 w-4 mr-1.5" />
                Table
              </Button>
              <Button
                variant={chartType === 'total' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('total')}
                className="h-8"
              >
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Total
              </Button>
            </div>

            {/* Export Buttons */}
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
                disabled={chartType === 'table'}
              >
                <FileImage className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent id="cumulative-financial-chart">
        {displayData.length > 0 ? (
          <>
            {/* Table View */}
            {chartType === 'table' && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Incoming Funds</TableHead>
                      <TableHead className="text-right">Commitments</TableHead>
                      <TableHead className="text-right">Disbursements</TableHead>
                      <TableHead className="text-right">Expenditures</TableHead>
                      <TableHead className="text-right">Planned Disbursements</TableHead>
                      <TableHead className="text-right">Budgets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.fullDate || item.displayDate}</TableCell>
                        <TableCell className="text-right">{formatTooltipValue(item['Incoming Funds'] || 0)}</TableCell>
                        <TableCell className="text-right">{formatTooltipValue(item['Commitments'] || 0)}</TableCell>
                        <TableCell className="text-right">{formatTooltipValue(item['Disbursements'] || 0)}</TableCell>
                        <TableCell className="text-right">{formatTooltipValue(item['Expenditures'] || 0)}</TableCell>
                        <TableCell className="text-right">{formatTooltipValue(item['Planned Disbursements'] || 0)}</TableCell>
                        <TableCell className="text-right">{formatTooltipValue(item['Budgets'] || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Total View */}
            {chartType === 'total' && totals && (
              <ResponsiveContainer width="100%" height={600}>
                <BarChart
                  data={Object.entries(totals)
                    .map(([key, value]) => ({
                      name: key,
                      value,
                      fill: key === 'Incoming Funds' ? '#1e40af' :
                            key === 'Commitments' ? '#0f172a' :
                            key === 'Disbursements' ? '#475569' :
                            key === 'Expenditures' ? '#64748b' :
                            key === 'Planned Disbursements' ? '#1e3a8a' :
                            key === 'Budgets' ? '#334155' : '#1e40af'
                    }))
                    .sort((a, b) => b.value - a.value)
                  }
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748B"
                    fontSize={12}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2">
                            <p className="font-semibold text-slate-900 text-sm">{payload[0].payload.name}</p>
                            <p className="font-bold text-slate-900 text-lg">{formatTooltipValue(payload[0].value as number)}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="value">
                    {Object.entries(totals).map(([key, value], index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          key === 'Incoming Funds' ? '#1e40af' :
                          key === 'Commitments' ? '#0f172a' :
                          key === 'Disbursements' ? '#475569' :
                          key === 'Expenditures' ? '#64748b' :
                          key === 'Planned Disbursements' ? '#1e3a8a' :
                          key === 'Budgets' ? '#334155' : '#1e40af'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Bar Chart View */}
            {chartType === 'bar' && (
              <ResponsiveContainer width="100%" height={600}>
                <BarChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#64748B"
                    fontSize={12}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} />
                  {activeSeries.has('Incoming Funds') && (
                    <Bar
                      dataKey="Incoming Funds"
                      fill={hiddenSeries.has('Incoming Funds') ? '#cbd5e1' : '#1e40af'}
                      opacity={hiddenSeries.has('Incoming Funds') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Commitments') && (
                    <Bar
                      dataKey="Commitments"
                      fill={hiddenSeries.has('Commitments') ? '#cbd5e1' : '#0f172a'}
                      opacity={hiddenSeries.has('Commitments') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Disbursements') && (
                    <Bar
                      dataKey="Disbursements"
                      fill={hiddenSeries.has('Disbursements') ? '#cbd5e1' : '#475569'}
                      opacity={hiddenSeries.has('Disbursements') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Expenditures') && (
                    <Bar
                      dataKey="Expenditures"
                      fill={hiddenSeries.has('Expenditures') ? '#cbd5e1' : '#64748b'}
                      opacity={hiddenSeries.has('Expenditures') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Planned Disbursements') && (
                    <Bar
                      dataKey="Planned Disbursements"
                      fill={hiddenSeries.has('Planned Disbursements') ? '#cbd5e1' : '#1e3a8a'}
                      opacity={hiddenSeries.has('Planned Disbursements') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Budgets') && (
                    <Bar
                      dataKey="Budgets"
                      fill={hiddenSeries.has('Budgets') ? '#cbd5e1' : '#334155'}
                      opacity={hiddenSeries.has('Budgets') ? 0.3 : 1}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Line Chart View */}
            {chartType === 'line' && (
              <ResponsiveContainer width="100%" height={600}>
                <LineChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#64748B"
                    fontSize={12}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} />
                  {activeSeries.has('Incoming Funds') && (
                    <Line
                      type="monotone"
                      dataKey="Incoming Funds"
                      stroke={hiddenSeries.has('Incoming Funds') ? '#cbd5e1' : '#1e40af'}
                      strokeWidth={hiddenSeries.has('Incoming Funds') ? 1 : 2.5}
                      dot={{ fill: hiddenSeries.has('Incoming Funds') ? '#cbd5e1' : '#1e40af', r: 3 }}
                      animationDuration={300}
                      opacity={hiddenSeries.has('Incoming Funds') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Commitments') && (
                    <Line
                      type="monotone"
                      dataKey="Commitments"
                      stroke={hiddenSeries.has('Commitments') ? '#cbd5e1' : '#0f172a'}
                      strokeWidth={hiddenSeries.has('Commitments') ? 1 : 2.5}
                      dot={{ fill: hiddenSeries.has('Commitments') ? '#cbd5e1' : '#0f172a', r: 3 }}
                      animationDuration={300}
                      opacity={hiddenSeries.has('Commitments') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Disbursements') && (
                    <Line
                      type="monotone"
                      dataKey="Disbursements"
                      stroke={hiddenSeries.has('Disbursements') ? '#cbd5e1' : '#475569'}
                      strokeWidth={hiddenSeries.has('Disbursements') ? 1 : 2.5}
                      dot={{ fill: hiddenSeries.has('Disbursements') ? '#cbd5e1' : '#475569', r: 3 }}
                      animationDuration={300}
                      opacity={hiddenSeries.has('Disbursements') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Expenditures') && (
                    <Line
                      type="monotone"
                      dataKey="Expenditures"
                      stroke={hiddenSeries.has('Expenditures') ? '#cbd5e1' : '#64748b'}
                      strokeWidth={hiddenSeries.has('Expenditures') ? 1 : 2.5}
                      dot={{ fill: hiddenSeries.has('Expenditures') ? '#cbd5e1' : '#64748b', r: 3 }}
                      animationDuration={300}
                      opacity={hiddenSeries.has('Expenditures') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Planned Disbursements') && (
                    <Line
                      type="monotone"
                      dataKey="Planned Disbursements"
                      stroke={hiddenSeries.has('Planned Disbursements') ? '#cbd5e1' : '#1e3a8a'}
                      strokeWidth={hiddenSeries.has('Planned Disbursements') ? 1 : 2}
                      strokeDasharray="5 5"
                      dot={{ fill: hiddenSeries.has('Planned Disbursements') ? '#cbd5e1' : '#1e3a8a', r: 3 }}
                      animationDuration={300}
                      opacity={hiddenSeries.has('Planned Disbursements') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Budgets') && (
                    <Line
                      type="monotone"
                      dataKey="Budgets"
                      stroke={hiddenSeries.has('Budgets') ? '#cbd5e1' : '#334155'}
                      strokeWidth={hiddenSeries.has('Budgets') ? 1 : 2}
                      strokeDasharray="5 5"
                      dot={{ fill: hiddenSeries.has('Budgets') ? '#cbd5e1' : '#334155', r: 3 }}
                      animationDuration={300}
                      opacity={hiddenSeries.has('Budgets') ? 0.3 : 1}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No cumulative overview data available</p>
              <p className="text-xs mt-2">Add transactions, planned disbursements, or budgets to see this chart</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

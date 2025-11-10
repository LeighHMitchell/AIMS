"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type TimePeriod = '1m' | '3m' | '6m' | '1y' | '5y' | 'all'

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
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all transactions
        let transactionsQuery = supabase
          .from('transactions')
          .select('transaction_date, transaction_type, value, activity_id, provider_org_id')
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
          .select('period_start, amount, usd_amount, activity_id')
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
          .select('period_start, value, activity_id')
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
          const value = parseFloat(String(transaction.value)) || 0

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
          const value = parseFloat(String(pd.usd_amount || pd.amount)) || 0

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
          const value = parseFloat(String(budget.value)) || 0

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

        // Aggregate into monthly buckets for cleaner visualization
        const monthlyMap = new Map<string, any>()

        sortedPoints.forEach((point) => {
          cumulativeIncomingFunds += point.incomingFunds
          cumulativeCommitments += point.commitments
          cumulativeDisbursements += point.disbursements
          cumulativeExpenditures += point.expenditures
          cumulativePlannedDisbursements += point.plannedDisbursements
          cumulativePlannedBudgets += point.plannedBudgets

          // Use year-month as key for monthly aggregation
          const monthKey = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}`

          // Keep the latest cumulative values for each month (end of month snapshot)
          monthlyMap.set(monthKey, {
            date: point.date.toISOString(),
            timestamp: point.timestamp,
            monthKey,
            displayDate: point.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            fullDate: point.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            'Incoming Funds': cumulativeIncomingFunds,
            'Commitments': cumulativeCommitments,
            'Disbursements': cumulativeDisbursements,
            'Expenditures': cumulativeExpenditures,
            'Planned Disbursements': cumulativePlannedDisbursements,
            'Planned Budgets': cumulativePlannedBudgets
          })
        })

        const sortedData = Array.from(monthlyMap.values()).sort((a, b) => a.timestamp - b.timestamp)

        // Fill in missing months to ensure continuous time axis
        if (sortedData.length === 0) {
          setCumulativeData([])
          return
        }

        const filledData: any[] = []
        const firstDate = new Date(sortedData[0].timestamp)
        const lastDate = new Date(sortedData[sortedData.length - 1].timestamp)

        // Create a map for quick lookup
        const dataMap = new Map(sortedData.map(d => [d.monthKey, d]))

        // Iterate through all months from first to last
        let currentDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
        const endDate = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1)

        let lastCumulativeValues = {
          incomingFunds: 0,
          commitments: 0,
          disbursements: 0,
          expenditures: 0,
          plannedDisbursements: 0,
          plannedBudgets: 0
        }

        while (currentDate <= endDate) {
          const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

          if (dataMap.has(monthKey)) {
            const existingData = dataMap.get(monthKey)!
            filledData.push(existingData)
            // Update last known cumulative values
            lastCumulativeValues = {
              incomingFunds: existingData['Incoming Funds'],
              commitments: existingData['Commitments'],
              disbursements: existingData['Disbursements'],
              expenditures: existingData['Expenditures'],
              plannedDisbursements: existingData['Planned Disbursements'],
              plannedBudgets: existingData['Planned Budgets']
            }
          } else {
            // Fill missing month with last cumulative values (carry forward)
            filledData.push({
              date: currentDate.toISOString(),
              timestamp: currentDate.getTime(),
              monthKey,
              displayDate: currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              fullDate: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              'Incoming Funds': lastCumulativeValues.incomingFunds,
              'Commitments': lastCumulativeValues.commitments,
              'Disbursements': lastCumulativeValues.disbursements,
              'Expenditures': lastCumulativeValues.expenditures,
              'Planned Disbursements': lastCumulativeValues.plannedDisbursements,
              'Planned Budgets': lastCumulativeValues.plannedBudgets
            })
          }

          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1)
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

  // Calculate cutoff date based on time period
  const getCutoffDate = (period: TimePeriod): Date | null => {
    if (period === 'all') return null

    const now = new Date()
    const cutoff = new Date()

    switch (period) {
      case '1m':
        cutoff.setMonth(now.getMonth() - 1)
        break
      case '3m':
        cutoff.setMonth(now.getMonth() - 3)
        break
      case '6m':
        cutoff.setMonth(now.getMonth() - 6)
        break
      case '1y':
        cutoff.setFullYear(now.getFullYear() - 1)
        break
      case '5y':
        cutoff.setFullYear(now.getFullYear() - 5)
        break
    }

    return cutoff
  }

  // Filter data by time period
  const filteredData = useMemo(() => {
    const cutoff = getCutoffDate(timePeriod)
    if (!cutoff) return cumulativeData

    return cumulativeData.filter(item => {
      const itemDate = new Date(item.date)
      return itemDate >= cutoff
    })
  }, [cumulativeData, timePeriod])

  // Determine which series have any non-zero data to show in legend
  const activeSeries = useMemo(() => {
    if (filteredData.length === 0) return new Set()

    const series = new Set<string>()
    const seriesKeys = ['Incoming Funds', 'Commitments', 'Disbursements', 'Expenditures', 'Planned Disbursements', 'Planned Budgets']

    seriesKeys.forEach(key => {
      const hasData = filteredData.some(d => d[key] && d[key] > 0)
      if (hasData) series.add(key)
    })

    return series
  }, [filteredData])

  // Calculate intelligent tick interval for x-axis
  const getXAxisInterval = (dataLength: number) => {
    if (dataLength <= 12) return 0
    if (dataLength <= 24) return 1
    if (dataLength <= 36) return 2
    if (dataLength <= 60) return 4
    return Math.floor(dataLength / 12)
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}m`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`
    }
    return `$${value.toFixed(0)}`
  }

  const formatTooltipValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}m`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`
    }
    return `$${value.toLocaleString()}`
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

  const TimePeriodFilter = () => {
    const periods: { value: TimePeriod; label: string }[] = [
      { value: '1m', label: '1 Month' },
      { value: '3m', label: '3 Months' },
      { value: '6m', label: '6 Months' },
      { value: '1y', label: '1 Year' },
      { value: '5y', label: '5 Years' },
      { value: 'all', label: 'All Time' },
    ]

    const selectedPeriod = periods.find(p => p.value === timePeriod)

    return (
      <Select value={timePeriod} onValueChange={(val) => setTimePeriod(val as TimePeriod)}>
        <SelectTrigger className="h-8 px-3 border rounded-lg text-sm font-medium bg-white">
          <SelectValue placeholder="Select period">
            {selectedPeriod?.label || 'All Time'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {periods.map(period => (
            <SelectItem key={period.value} value={period.value} className="text-sm">
              {period.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Cumulative Financial Overview
            </CardTitle>
            <CardDescription>
              Cumulative view of all transaction types, planned disbursements, and planned budgets over time (aggregated from all activities)
            </CardDescription>
          </div>
          <TimePeriodFilter />
        </div>
      </CardHeader>
      <CardContent>
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
              <XAxis
                dataKey="displayDate"
                stroke="#64748B"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={getXAxisInterval(filteredData.length)}
              />
              <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {activeSeries.has('Incoming Funds') && (
                <Line
                  type="monotone"
                  dataKey="Incoming Funds"
                  stroke="#1e40af"
                  strokeWidth={2.5}
                  dot={{ fill: '#1e40af', r: 3 }}
                  animationDuration={300}
                />
              )}
              {activeSeries.has('Commitments') && (
                <Line
                  type="monotone"
                  dataKey="Commitments"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  dot={{ fill: '#0f172a', r: 3 }}
                  animationDuration={300}
                />
              )}
              {activeSeries.has('Disbursements') && (
                <Line
                  type="monotone"
                  dataKey="Disbursements"
                  stroke="#475569"
                  strokeWidth={2.5}
                  dot={{ fill: '#475569', r: 3 }}
                  animationDuration={300}
                />
              )}
              {activeSeries.has('Expenditures') && (
                <Line
                  type="monotone"
                  dataKey="Expenditures"
                  stroke="#64748b"
                  strokeWidth={2.5}
                  dot={{ fill: '#64748b', r: 3 }}
                  animationDuration={300}
                />
              )}
              {activeSeries.has('Planned Disbursements') && (
                <Line
                  type="monotone"
                  dataKey="Planned Disbursements"
                  stroke="#1e3a8a"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#1e3a8a', r: 3 }}
                  animationDuration={300}
                />
              )}
              {activeSeries.has('Planned Budgets') && (
                <Line
                  type="monotone"
                  dataKey="Planned Budgets"
                  stroke="#334155"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#334155', r: 3 }}
                  animationDuration={300}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
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

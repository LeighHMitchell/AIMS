"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LoadingText } from '@/components/ui/loading-text'
import { AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { Button } from '@/components/ui/button'
// Inline currency formatter to avoid initialization issues
const formatCurrencyAbbreviated = (value: number): string => {
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
    formatted = `$${absValue.toFixed(0)}`
  }

  return isNegative ? `-${formatted}` : formatted
}

type TimePeriod = '1m' | '3m' | '6m' | '1y' | '5y' | 'all'

interface CumulativeSpendingOverTimeProps {
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

export function CumulativeSpendingOverTime({
  dateRange,
  filters,
  refreshKey
}: CumulativeSpendingOverTimeProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cumulativeData, setCumulativeData] = useState<any[]>([])
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch disbursement and expenditure transactions
        let transactionsQuery = supabase
          .from('transactions')
          .select('transaction_date, transaction_type, value, activity_id, provider_org_id')
          .in('transaction_type', ['3', '4']) // Disbursement (3) and Expenditure (4)
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
          console.error('[CumulativeSpendingOverTime] Error fetching transactions:', transactionsError)
          setError('Failed to fetch transaction data')
          return
        }

        // Process data to create cumulative spending
        const dateMap = new Map<string, any>()

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
              spending: 0
            })
          }

          dateMap.get(dateKey)!.spending += value
        })

        // Convert to array and sort by date
        const sortedPoints = Array.from(dateMap.values()).sort((a, b) => a.timestamp - b.timestamp)

        // Calculate cumulative values
        let cumulativeSpending = 0
        const cumulativeArray = sortedPoints.map(point => {
          cumulativeSpending += point.spending
          return {
            date: point.date.toISOString(),
            timestamp: point.timestamp,
            displayDate: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            cumulative: cumulativeSpending
          }
        })

        setCumulativeData(cumulativeArray)
      } catch (err) {
        console.error('[CumulativeSpendingOverTime] Unexpected error:', err)
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

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}m`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`
    }
    return `$${value.toFixed(0)}`
  }

  // Use the module-level currency formatter for tooltips
  const formatTooltipValue = formatCurrencyAbbreviated

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {`${entry.name}: ${formatTooltipValue(entry.value)}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const TimePeriodFilter = () => {
    const periods: { value: TimePeriod; label: string }[] = [
      { value: '1m', label: '1M' },
      { value: '3m', label: '3M' },
      { value: '6m', label: '6M' },
      { value: '1y', label: '1Y' },
      { value: '5y', label: '5Y' },
      { value: 'all', label: 'All' },
    ]

    return (
      <div className="flex gap-1">
        {periods.map(period => (
          <Button
            key={period.value}
            variant={timePeriod === period.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod(period.value)}
            className={`h-7 px-3 text-xs ${
              timePeriod === period.value
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {period.label}
          </Button>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Cumulative Spending Over Time
          </CardTitle>
          <CardDescription>
            Track accumulated spending progression across all activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Cumulative Spending Over Time
          </CardTitle>
          <CardDescription>
            Track accumulated spending progression across all activities
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
              Cumulative Spending Over Time
            </CardTitle>
            <CardDescription>
              Track accumulated spending progression across all activities
            </CardDescription>
          </div>
          <TimePeriodFilter />
        </div>
      </CardHeader>
      <CardContent>
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748B" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#64748B" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
              <XAxis dataKey="displayDate" stroke="#64748B" fontSize={12} />
              <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Cumulative Spending"
                stroke="#64748B"
                fillOpacity={1}
                fill="url(#colorSpending)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No cumulative spending data available</p>
              <p className="text-xs mt-2">Add disbursement or expenditure transactions to see this chart</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

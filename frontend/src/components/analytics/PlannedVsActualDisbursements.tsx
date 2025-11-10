"use client"

import React, { useState, useEffect, useMemo } from 'react'
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
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, BarChart3, TrendingUpIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

type TimePeriod = '1m' | '3m' | '6m' | '1y' | '5y' | 'all'
type GroupBy = 'year' | 'month'

interface PlannedVsActualDisbursementsProps {
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

export function PlannedVsActualDisbursements({
  dateRange,
  filters,
  refreshKey
}: PlannedVsActualDisbursementsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawData, setRawData] = useState<any[]>([])
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [groupBy, setGroupBy] = useState<GroupBy>('month')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch actual disbursements (transaction type 3)
        let disbursementsQuery = supabase
          .from('transactions')
          .select('transaction_date, value, activity_id, provider_org_id')
          .eq('transaction_type', '3')
          .eq('status', 'actual')
          .order('transaction_date', { ascending: true })

        // Apply date range filter
        if (dateRange) {
          disbursementsQuery = disbursementsQuery
            .gte('transaction_date', dateRange.from.toISOString())
            .lte('transaction_date', dateRange.to.toISOString())
        }

        // Apply donor filter
        if (filters?.donor) {
          disbursementsQuery = disbursementsQuery.eq('provider_org_id', filters.donor)
        }

        const { data: disbursements, error: disbursementsError } = await disbursementsQuery

        if (disbursementsError) {
          console.error('[PlannedVsActualDisbursements] Error fetching disbursements:', disbursementsError)
          setError('Failed to fetch disbursement data')
          return
        }

        // Fetch planned disbursements
        let plannedQuery = supabase
          .from('planned_disbursements')
          .select('period_start, amount, usd_amount, activity_id')
          .order('period_start', { ascending: true })

        if (dateRange) {
          plannedQuery = plannedQuery
            .gte('period_start', dateRange.from.toISOString())
            .lte('period_start', dateRange.to.toISOString())
        }

        const { data: plannedDisbursements, error: plannedError } = await plannedQuery

        if (plannedError) {
          console.error('[PlannedVsActualDisbursements] Error fetching planned disbursements:', plannedError)
        }

        // Process data by date
        const dateMap = new Map<string, any>()

        // Process actual disbursements
        disbursements?.forEach((disbursement: any) => {
          if (!disbursement.transaction_date) return

          const date = new Date(disbursement.transaction_date)
          if (isNaN(date.getTime())) return

          const dateKey = date.toISOString().split('T')[0]
          const value = parseFloat(String(disbursement.value)) || 0

          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              date: date.toISOString(),
              timestamp: date.getTime(),
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              planned: 0,
              actual: 0
            })
          }

          dateMap.get(dateKey)!.actual += value
        })

        // Process planned disbursements
        plannedDisbursements?.forEach((planned: any) => {
          if (!planned.period_start) return

          const date = new Date(planned.period_start)
          if (isNaN(date.getTime())) return

          const dateKey = date.toISOString().split('T')[0]
          const value = parseFloat(String(planned.usd_amount || planned.amount)) || 0

          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              date: date.toISOString(),
              timestamp: date.getTime(),
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              planned: 0,
              actual: 0
            })
          }

          dateMap.get(dateKey)!.planned += value
        })

        const sortedData = Array.from(dateMap.values()).sort((a, b) => a.timestamp - b.timestamp)
        setRawData(sortedData)
      } catch (err) {
        console.error('[PlannedVsActualDisbursements] Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange, filters, refreshKey])

  // Group data by year or month
  const groupedData = useMemo(() => {
    if (rawData.length === 0) return []

    const grouped: any = {}

    rawData.forEach((item: any) => {
      let period: string
      let periodKey: string
      let sortKey: string

      if (groupBy === 'year') {
        period = item.year.toString()
        periodKey = period
        sortKey = period
      } else {
        const date = new Date(item.date)
        period = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        periodKey = `${item.year}-${String(item.month).padStart(2, '0')}`
        sortKey = periodKey
      }

      if (!grouped[periodKey]) {
        grouped[periodKey] = {
          period,
          sortKey,
          timestamp: item.timestamp,
          date: item.date,
          planned: 0,
          actual: 0
        }
      }

      grouped[periodKey].planned += item.planned || 0
      grouped[periodKey].actual += item.actual || 0
    })

    return Object.values(grouped).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))
  }, [rawData, groupBy])

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
    if (!cutoff) return groupedData

    return groupedData.filter((item: any) => {
      const itemDate = new Date(item.date)
      return itemDate >= cutoff
    })
  }, [groupedData, timePeriod])

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}m`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`
    }
    return `$${value.toFixed(0)}`
  }

  const formatTooltipValue = (value: number) => {
    return `$${value.toLocaleString()}`
  }

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

  const GroupByToggle = () => {
    return (
      <div className="flex gap-1">
        <Button
          variant={groupBy === 'year' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setGroupBy('year')}
          className={`h-7 px-3 text-xs ${
            groupBy === 'year'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Year
        </Button>
        <Button
          variant={groupBy === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setGroupBy('month')}
          className={`h-7 px-3 text-xs ${
            groupBy === 'month'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Month
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Planned vs Actual Disbursements
          </CardTitle>
          <CardDescription>
            Compare planned and actual disbursements across all activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Planned vs Actual Disbursements
          </CardTitle>
          <CardDescription>
            Compare planned and actual disbursements across all activities
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
              Planned vs Actual Disbursements by {groupBy === 'year' ? 'Year' : 'Month'}
            </CardTitle>
            <CardDescription>
              Compare planned and actual disbursements across all activities
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChartType(chartType === 'line' ? 'bar' : 'line')}
              className="h-7 px-3 text-xs"
            >
              {chartType === 'line' ? <BarChart3 className="h-3 w-3" /> : <TrendingUpIcon className="h-3 w-3" />}
            </Button>
            <GroupByToggle />
            <TimePeriodFilter />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400} key={`disbursement-${groupBy}-${chartType}`}>
            {chartType === 'line' ? (
              <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: groupBy === 'month' ? 60 : 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="CHART_STRUCTURE_COLORS.grid" />
                <XAxis
                  dataKey={groupBy === 'year' ? 'period' : 'timestamp'}
                  type={groupBy === 'year' ? 'category' : 'number'}
                  domain={groupBy === 'year' ? undefined : ['dataMin', 'dataMax']}
                  tickFormatter={(value) => {
                    if (groupBy === 'year') {
                      return value
                    }
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  }}
                  stroke="#64748B"
                  fontSize={12}
                  angle={groupBy === 'month' ? -45 : 0}
                  textAnchor={groupBy === 'month' ? 'end' : 'middle'}
                  height={groupBy === 'month' ? 80 : 30}
                />
                <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="planned"
                  name="Planned"
                  stroke="DATA_COLORS.actual"
                  strokeWidth={2}
                  dot={{ fill: 'DATA_COLORS.actual', r: 4 }}
                  animationDuration={300}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke="#64748B"
                  strokeWidth={2}
                  dot={{ fill: '#64748B', r: 4 }}
                  animationDuration={300}
                />
              </LineChart>
            ) : (
              <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: groupBy === 'month' ? 60 : 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="CHART_STRUCTURE_COLORS.grid" />
                <XAxis
                  dataKey={groupBy === 'year' ? 'period' : 'timestamp'}
                  type={groupBy === 'year' ? 'category' : 'number'}
                  domain={groupBy === 'year' ? undefined : ['dataMin', 'dataMax']}
                  tickFormatter={(value) => {
                    if (groupBy === 'year') {
                      return value
                    }
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  }}
                  stroke="#64748B"
                  fontSize={12}
                  angle={groupBy === 'month' ? -45 : 0}
                  textAnchor={groupBy === 'month' ? 'end' : 'middle'}
                  height={groupBy === 'month' ? 80 : 30}
                />
                <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <Legend />
                <Bar dataKey="planned" name="Planned" fill="DATA_COLORS.actual" radius={[4, 4, 0, 0]} animationDuration={300} />
                <Bar dataKey="actual" name="Actual" fill="#64748B" radius={[4, 4, 0, 0]} animationDuration={300} />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-80 text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No disbursement data available</p>
              <p className="text-xs mt-2">Add planned disbursements or transactions to see this chart</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

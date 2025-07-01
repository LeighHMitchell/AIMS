"use client"

import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, getYear, getQuarter } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, DollarSign, CalendarDays } from 'lucide-react'

interface BudgetVsActualChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters: {
    country?: string
    donor?: string
    sector?: string
  }
  refreshKey: number
}

interface ChartData {
  period: string
  budget: number
  disbursed: number
  expenditure: number
  sortKey?: string
}

type GroupByMode = 'calendar' | 'fiscal' | 'quarter'

export function BudgetVsActualChart({ dateRange, filters, refreshKey }: BudgetVsActualChartProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<GroupByMode>('calendar')

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey, groupBy])

  const getFiscalYear = (date: Date): string => {
    const year = getYear(date)
    const month = date.getMonth() + 1 // getMonth() is 0-indexed
    
    if (month >= 7) {
      // July-December: fiscal year is current year to next year
      return `${year}-${year + 1}`
    } else {
      // January-June: fiscal year is previous year to current year
      return `${year - 1}-${year}`
    }
  }

  const getQuarterLabel = (date: Date): string => {
    const year = getYear(date)
    const quarter = getQuarter(date)
    return `Q${quarter} ${year}`
  }

  const aggregateByPeriod = <T extends { period_start?: string; transaction_date?: string; value: any }>(
    data: T[],
    periodFn: (date: Date) => string,
    dateField: keyof T
  ) => {
    const periodMap = new Map<string, number>()
    
    data.forEach(item => {
      const dateValue = item[dateField] as string | undefined
      if (!dateValue) return
      
      const date = new Date(dateValue)
      const period = periodFn(date)
      
      const value = parseFloat(item.value?.toString() || '0') || 0
      periodMap.set(period, (periodMap.get(period) || 0) + value)
    })
    
    return periodMap
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch all budgets
      const { data: budgetData } = await supabase
        .from('activity_budgets')
        .select('value, period_start')
        .gte('period_start', dateRange.from.toISOString())
        .lte('period_start', dateRange.to.toISOString())

      // Build transaction query
      let transactionQuery = supabase
        .from('transactions')
        .select('value, transaction_type, transaction_date')
        .in('transaction_type', ['3', '4']) // Disbursements and Expenditures
        .eq('status', 'actual')
        .gte('transaction_date', dateRange.from.toISOString())
        .lte('transaction_date', dateRange.to.toISOString())

      // Apply filters
      if (filters.donor && filters.donor !== 'all') {
        transactionQuery = transactionQuery.eq('provider_org_id', filters.donor)
      }

      const { data: transactions } = await transactionQuery

      let chartData: ChartData[] = []
      let periodFn: (date: Date) => string

      if (groupBy === 'calendar') {
        periodFn = (date) => getYear(date).toString()
      } else if (groupBy === 'fiscal') {
        periodFn = getFiscalYear
      } else {
        periodFn = getQuarterLabel
      }

      // Aggregate budgets by period
      const budgetMap = aggregateByPeriod(budgetData || [], periodFn, 'period_start')

      // Aggregate transactions by period and type
      const disbursementMap = new Map<string, number>()
      const expenditureMap = new Map<string, number>()
      
      transactions?.forEach((t: any) => {
        const date = new Date(t.transaction_date)
        const period = periodFn(date)
        const value = parseFloat(t.value) || 0
        
        if (t.transaction_type === '3') {
          disbursementMap.set(period, (disbursementMap.get(period) || 0) + value)
        } else if (t.transaction_type === '4') {
          expenditureMap.set(period, (expenditureMap.get(period) || 0) + value)
        }
      })

      // Combine all periods
      const allPeriods = new Set([
        ...Array.from(budgetMap.keys()),
        ...Array.from(disbursementMap.keys()),
        ...Array.from(expenditureMap.keys())
      ])

      chartData = Array.from(allPeriods)
        .map(period => ({
          period,
          budget: budgetMap.get(period) || 0,
          disbursed: disbursementMap.get(period) || 0,
          expenditure: expenditureMap.get(period) || 0,
          sortKey: period
        }))

      // Sort based on grouping mode
      if (groupBy === 'quarter') {
        chartData.sort((a, b) => {
          const [qA, yA] = a.sortKey!.replace('Q', '').split(' ').map(s => parseInt(s))
          const [qB, yB] = b.sortKey!.replace('Q', '').split(' ').map(s => parseInt(s))
          return yA !== yB ? yA - yB : qA - qB
        })
      } else {
        chartData.sort((a, b) => a.sortKey!.localeCompare(b.sortKey!))
      }

      setData(chartData)
    } catch (error) {
      console.error('Error fetching budget vs actual data:', error)
    } finally {
      setLoading(false)
    }
  }

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
      console.error('[BudgetVsActualChart] Error formatting currency:', error, value)
      return '$0'
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-9 w-40 bg-slate-100" />
        </div>
        <Skeleton className="h-[400px] w-full bg-slate-100" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Aggregation Mode Selector */}
      <div className="flex items-center justify-between">
        <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByMode)}>
          <SelectTrigger className="w-48 h-9 bg-white border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="calendar">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Calendar Year
              </div>
            </SelectItem>
            <SelectItem value="fiscal">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3" />
                Financial Year
              </div>
            </SelectItem>
            <SelectItem value="quarter">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3 w-3" />
                Quarterly
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        
        {groupBy === 'fiscal' && (
          <div className="text-xs text-slate-500">
            Financial Year: July–June
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e2e8f0" 
            vertical={false}
          />
          <XAxis 
            dataKey="period" 
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              color: '#fff'
            }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Legend 
            wrapperStyle={{
              paddingTop: '20px'
            }}
            iconType="rect"
          />
          <Bar 
            dataKey="budget" 
            fill="#e2e8f0"
            name="Budget"
          />
          <Bar 
            dataKey="disbursed" 
            fill="#475569"
            name="Disbursed"
          />
          <Bar 
            dataKey="expenditure" 
            fill="#94a3b8"
            name="Expenditure"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
} 
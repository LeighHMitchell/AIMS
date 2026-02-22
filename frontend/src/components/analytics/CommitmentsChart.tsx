"use client"

import React, { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, getYear, getQuarter } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { LoadingText } from '@/components/ui/loading-text'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, DollarSign, CalendarDays } from 'lucide-react'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'

interface CommitmentsChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  refreshKey: number
  onDataChange?: (data: ChartData[]) => void
}

interface ChartData {
  period: string
  commitments: number
  disbursements: number
  sortKey?: string
}

type GroupByMode = 'calendar' | 'fiscal' | 'quarter'

export function CommitmentsChart({ dateRange, refreshKey, onDataChange }: CommitmentsChartProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<GroupByMode>('calendar')

  useEffect(() => {
    fetchData()
  }, [dateRange, refreshKey, groupBy])

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

  const aggregateByPeriod = (transactions: any[], periodFn: (date: Date) => string) => {
    const periodMap = new Map<string, { commitments: number; disbursements: number }>()
    
    transactions.forEach(t => {
      const date = new Date(t.transaction_date)
      const period = periodFn(date)
      
      if (!periodMap.has(period)) {
        periodMap.set(period, { commitments: 0, disbursements: 0 })
      }
      
      const value = parseFloat(t.value) || 0
      const periodData = periodMap.get(period)!
      
      if (t.transaction_type === '2') {
        periodData.commitments += value
      } else if (t.transaction_type === '3') {
        periodData.disbursements += value
      }
    })
    
    return periodMap
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Query all transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('value, transaction_type, transaction_date')
        .in('transaction_type', ['2', '3']) // Commitments and Disbursements
        .eq('status', 'actual')
        .gte('transaction_date', dateRange.from.toISOString())
        .lte('transaction_date', dateRange.to.toISOString())

      if (error) {
        console.error('Error fetching transactions:', error)
        return
      }

      let chartData: ChartData[] = []

      if (groupBy === 'calendar') {
        // Group by calendar year
        const periodMap = aggregateByPeriod(transactions || [], (date) => getYear(date).toString())
        
        chartData = Array.from(periodMap.entries())
          .map(([year, values]) => ({
            period: year,
            commitments: values.commitments,
            disbursements: values.disbursements,
            sortKey: year
          }))
          .sort((a, b) => a.sortKey!.localeCompare(b.sortKey!))
          
      } else if (groupBy === 'fiscal') {
        // Group by fiscal year
        const periodMap = aggregateByPeriod(transactions || [], getFiscalYear)
        
        chartData = Array.from(periodMap.entries())
          .map(([fiscalYear, values]) => ({
            period: fiscalYear,
            commitments: values.commitments,
            disbursements: values.disbursements,
            sortKey: fiscalYear
          }))
          .sort((a, b) => a.sortKey!.localeCompare(b.sortKey!))
          
      } else if (groupBy === 'quarter') {
        // Group by quarter
        const periodMap = aggregateByPeriod(transactions || [], getQuarterLabel)
        
        chartData = Array.from(periodMap.entries())
          .map(([quarter, values]) => ({
            period: quarter,
            commitments: values.commitments,
            disbursements: values.disbursements,
            sortKey: quarter.replace('Q', '').replace(' ', '-') // Convert "Q1 2023" to "1-2023" for sorting
          }))
          .sort((a, b) => {
            const [qA, yA] = a.sortKey!.split('-').map(Number)
            const [qB, yB] = b.sortKey!.split('-').map(Number)
            return yA !== yB ? yA - yB : qA - qB
          })
      }

      setData(chartData)
      onDataChange?.(chartData)
    } catch (error) {
      console.error('Error fetching commitments data:', error)
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
      console.error('[CommitmentsChart] Error formatting currency:', error, value)
      return '$0'
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
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
        <LineChart 
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={CHART_STRUCTURE_COLORS.grid} 
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
            iconType="line"
          />
          <Line 
            type="monotone" 
            dataKey="commitments" 
            stroke="#475569" 
            strokeWidth={2}
            dot={{ fill: '#475569', r: 4 }}
            activeDot={{ r: 6 }}
            name="Commitments"
          />
          <Line 
            type="monotone" 
            dataKey="disbursements" 
            stroke="#94a3b8" 
            strokeWidth={2}
            dot={{ fill: '#94a3b8', r: 4 }}
            activeDot={{ r: 6 }}
            name="Disbursements"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
} 
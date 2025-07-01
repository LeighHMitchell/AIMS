"use client"

import React, { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, getYear, getQuarter } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, DollarSign, CalendarDays } from 'lucide-react'

interface HumanitarianChartProps {
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
  humanitarian: number
  development: number
  sortKey?: string
}

type GroupByMode = 'calendar' | 'fiscal' | 'quarter'

export function HumanitarianChart({ dateRange, filters, refreshKey }: HumanitarianChartProps) {
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

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Build base query for transactions
      let baseQuery = supabase
        .from('transactions')
        .select(`
          value,
          aid_type,
          transaction_date,
          activity_id,
          is_humanitarian,
          description,
          activities (
            collaboration_type
          )
        `)
        .in('transaction_type', ['2', '3', '4']) // Include Commitments, Disbursements, and Expenditures
        .in('status', ['actual', 'draft']) // Include both actual and draft transactions
        .gte('transaction_date', dateRange.from.toISOString())
        .lte('transaction_date', dateRange.to.toISOString())

      // Apply filters
      if (filters.donor && filters.donor !== 'all') {
        baseQuery = baseQuery.eq('provider_org_id', filters.donor)
      }

      const { data: transactions, error: queryError } = await baseQuery
      
      console.log('[HumanitarianChart] Query results:', {
        transactionCount: transactions?.length || 0,
        dateRange,
        error: queryError,
        sampleTransactions: transactions?.slice(0, 5)
      })
      
      // Count humanitarian transactions
      const humanitarianCount = transactions?.filter((t: any) => t.is_humanitarian).length || 0
      console.log('[HumanitarianChart] Humanitarian transactions:', humanitarianCount)

      // Aggregate data based on grouping mode
      const periodMap = new Map<string, { humanitarian: number; development: number }>()
      
      let periodFn: (date: Date) => string
      if (groupBy === 'calendar') {
        periodFn = (date) => getYear(date).toString()
      } else if (groupBy === 'fiscal') {
        periodFn = getFiscalYear
      } else {
        periodFn = getQuarterLabel
      }

      transactions?.forEach((t: any) => {
        const value = parseFloat(t.value) || 0
        if (isNaN(value)) return
        
        const date = new Date(t.transaction_date)
        const period = periodFn(date)
        
        if (!periodMap.has(period)) {
          periodMap.set(period, { humanitarian: 0, development: 0 })
        }
        
        const periodData = periodMap.get(period)!
        
        // Determine if humanitarian or development based on:
        // 1. is_humanitarian field (if set)
        // 2. Aid type codes (if available)
        // 3. Activity collaboration type
        // 4. Description containing humanitarian keywords
        // 5. Default to development
        
        const isHumanitarian = t.is_humanitarian
        const aidType = t.aid_type
        const collaborationType = t.activities?.collaboration_type
        const description = t.description?.toLowerCase() || ''
        
        // Humanitarian aid types: Emergency Response (01), Reconstruction relief (02), etc.
        const humanitarianAidTypes = ['01', '02', '03']
        const humanitarianCollaborationTypes = ['humanitarian', 'emergency', 'relief']
        const humanitarianKeywords = ['humanitarian', 'emergency', 'disaster', 'relief', 'crisis']
        
        if (isHumanitarian || 
            humanitarianAidTypes.includes(aidType) || 
            humanitarianCollaborationTypes.some(type => 
              collaborationType?.toLowerCase().includes(type)) ||
            humanitarianKeywords.some(keyword => description.includes(keyword))) {
          periodData.humanitarian += value
        } else {
          periodData.development += value
        }
      })

      // Convert to array and sort
      let chartData = Array.from(periodMap.entries())
        .map(([period, values]) => ({
          period,
          humanitarian: values.humanitarian,
          development: values.development,
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
      console.error('Error fetching humanitarian data:', error)
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
      console.error('[HumanitarianChart] Error formatting currency:', error, value)
      return '$0'
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-9 w-40 bg-slate-100" />
        </div>
        <Skeleton className="h-[300px] w-full bg-slate-100" />
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
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart 
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
            axisLine={{ stroke: '#94a3b8' }}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#94a3b8' }}
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
              paddingTop: '20px',
              color: '#64748b'
            }}
            iconType="rect"
          />
          <Area 
            type="monotone" 
            dataKey="development" 
            stackId="1"
            stroke="#cbd5e1"
            fill="#e2e8f0"
            name="Development"
          />
          <Area 
            type="monotone" 
            dataKey="humanitarian" 
            stackId="1"
            stroke="#94a3b8"
            fill="#cbd5e1"
            name="Humanitarian"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
} 
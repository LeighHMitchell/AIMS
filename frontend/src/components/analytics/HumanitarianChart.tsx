"use client"

import React, { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, getYear, getQuarter } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { LoadingText } from '@/components/ui/loading-text'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, DollarSign, CalendarDays, BarChart3, LineChart, Table } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'

interface HumanitarianChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  refreshKey: number
  onDataChange?: (data: ChartData[]) => void
  compact?: boolean
}

interface ChartData {
  period: string
  humanitarian: number
  development: number
  sortKey?: string
}

type GroupByMode = 'calendar' | 'fiscal' | 'quarter'
type ViewMode = 'area' | 'bar' | 'table'

export function HumanitarianChart({ dateRange, refreshKey, onDataChange, compact = false }: HumanitarianChartProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<GroupByMode>('calendar')
  const [viewMode, setViewMode] = useState<ViewMode>('area')

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

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Query transactions directly - use value_usd for USD-converted amounts
      const { data: transactions, error: queryError } = await supabase
        .from('transactions')
        .select('value, value_usd, currency, transaction_date, is_humanitarian, transaction_type, status')
        .in('transaction_type', ['2', '3', '4']) // Include Commitments, Disbursements, and Expenditures
        .eq('status', 'actual')
        .gte('transaction_date', dateRange.from.toISOString())
        .lte('transaction_date', dateRange.to.toISOString())
      
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
        // Use value_usd if available, otherwise fall back to value (assuming USD if no conversion)
        let value = parseFloat(t.value_usd) || 0
        if (!value && t.currency === 'USD' && t.value) {
          value = parseFloat(t.value) || 0
        }
        if (isNaN(value) || value === 0) return
        
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
      onDataChange?.(chartData)
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
        maximumFractionDigits: 0
      }).format(safeValue)
    } catch (error) {
      console.error('[HumanitarianChart] Error formatting currency:', error, value)
      return '$0'
    }
  }

  const formatCurrencyFull = (value: number): string => {
    try {
      if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '$0'
      }
      // Format in billions or millions
      if (value >= 1_000_000_000) {
        return `$${Math.round(value / 1_000_000_000)} bn`
      } else if (value >= 1_000_000) {
        return `$${Math.round(value / 1_000_000)} M`
      } else if (value >= 1_000) {
        return `$${Math.round(value / 1_000)} K`
      }
      return `$${Math.round(value)}`
    } catch (error) {
      return '$0'
    }
  }

  // Compact mode renders just the chart without filters
  if (compact) {
    if (loading) {
      return <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
    }
    if (!data || data.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No data available</p>
        </div>
      )
    }
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis
              dataKey="period"
              stroke="#94A3B8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94A3B8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name.charAt(0).toUpperCase() + name.slice(1)
              ]}
              contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
            />
            <Area
              type="monotone"
              dataKey="development"
              stackId="1"
              stroke="#1E4D6B"
              fill="#1E4D6B"
              fillOpacity={0.8}
              name="Development"
            />
            <Area
              type="monotone"
              dataKey="humanitarian"
              stackId="1"
              stroke="#DC2626"
              fill="#DC2626"
              fillOpacity={0.8}
              name="Humanitarian"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        {/* Controls Row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByMode)}>
            <SelectTrigger className="w-48 h-9 bg-card border-border">
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
          
          <div className="flex items-center gap-3">
            {groupBy === 'fiscal' && (
              <div className="text-xs text-muted-foreground">
                Financial Year: July–June
              </div>
            )}
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'area' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('area')}
                className="h-8 px-3"
              >
                <LineChart className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('bar')}
                className="h-8 px-3"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 px-3"
              >
                <Table className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Empty State */}
        <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground">No humanitarian/development aid data available</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your date range or filters</p>
          </div>
        </div>
      </div>
    )
  }

  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart 
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
          axisLine={{ stroke: '#94a3b8' }}
        />
        <YAxis
          tickFormatter={formatCurrency}
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#94a3b8' }}
          allowDecimals={false}
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
          stroke="#1E4D6B"
          fill="#1E4D6B"
          name="Development"
        />
        <Area
          type="monotone"
          dataKey="humanitarian"
          stackId="1"
          stroke="#DC2626"
          fill="#DC2626"
          name="Humanitarian"
        />
      </AreaChart>
    </ResponsiveContainer>
  )

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
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
          axisLine={{ stroke: '#94a3b8' }}
        />
        <YAxis 
          tickFormatter={formatCurrency}
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#94a3b8' }}
          allowDecimals={false}
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
        <Bar
          dataKey="development"
          stackId="1"
          fill="#1E4D6B"
          name="Development"
        />
        <Bar
          dataKey="humanitarian"
          stackId="1"
          fill="#DC2626"
          name="Humanitarian"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-semibold text-foreground">Period</th>
            <th className="text-right py-3 px-4 font-semibold text-foreground">Development</th>
            <th className="text-right py-3 px-4 font-semibold text-red-700">Humanitarian</th>
            <th className="text-right py-3 px-4 font-semibold text-foreground">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b border-border hover:bg-muted/50">
              <td className="py-3 px-4 text-foreground">{row.period}</td>
              <td className="text-right py-3 px-4 text-muted-foreground">{formatCurrencyFull(row.development)}</td>
              <td className="text-right py-3 px-4 text-red-600">{formatCurrencyFull(row.humanitarian)}</td>
              <td className="text-right py-3 px-4 text-foreground font-medium">{formatCurrencyFull(row.development + row.humanitarian)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted">
            <td className="py-3 px-4 font-semibold text-foreground">Total</td>
            <td className="text-right py-3 px-4 font-semibold text-foreground">
              {formatCurrencyFull(data.reduce((sum, row) => sum + row.development, 0))}
            </td>
            <td className="text-right py-3 px-4 font-semibold text-red-700">
              {formatCurrencyFull(data.reduce((sum, row) => sum + row.humanitarian, 0))}
            </td>
            <td className="text-right py-3 px-4 font-semibold text-foreground">
              {formatCurrencyFull(data.reduce((sum, row) => sum + row.development + row.humanitarian, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Controls Row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Aggregation Mode Selector */}
        <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByMode)}>
          <SelectTrigger className="w-48 h-9 bg-card border-border">
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

        <div className="flex items-center gap-3">
          {groupBy === 'fiscal' && (
            <div className="text-xs text-muted-foreground">
              Financial Year: July–June
            </div>
          )}
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'area' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('area')}
              className="h-8 px-3"
            >
              <LineChart className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'bar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('bar')}
              className="h-8 px-3"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-3"
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chart/Table */}
      {viewMode === 'area' && renderAreaChart()}
      {viewMode === 'bar' && renderBarChart()}
      {viewMode === 'table' && renderTable()}
    </div>
  )
} 
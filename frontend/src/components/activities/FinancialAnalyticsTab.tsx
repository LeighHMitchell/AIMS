"use client"

import React, { useEffect, useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, AlertCircle, TrendingUp, DollarSign, BarChart3, TrendingUpIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fillMissingYears, getYearRange } from '@/lib/chart-utils'

type TimePeriod = '1m' | '3m' | '6m' | '1y' | '5y' | 'all'
type GroupBy = 'year' | 'month'

interface FinancialAnalyticsTabProps {
  activityId: string
}

export default function FinancialAnalyticsTab({ activityId }: FinancialAnalyticsTabProps) {
  const [loading, setLoading] = useState(true)
  const [rawBudgetVsActualData, setRawBudgetVsActualData] = useState<any[]>([])
  const [rawDisbursementData, setRawDisbursementData] = useState<any[]>([])
  const [cumulativeData, setCumulativeData] = useState<any[]>([])
  const [budgetCompositionData, setBudgetCompositionData] = useState<any[]>([])
  const [fundingSourceData, setFundingSourceData] = useState<any[]>([])
  const [financialFlowData, setFinancialFlowData] = useState<any>({})
  const [commitmentRatio, setCommitmentRatio] = useState<number>(0)
  const [totalCommitment, setTotalCommitment] = useState<number>(0)
  const [totalDisbursement, setTotalDisbursement] = useState<number>(0)
  const [activityDateRange, setActivityDateRange] = useState<{
    plannedStartDate?: string
    plannedEndDate?: string
    actualStartDate?: string
    actualEndDate?: string
  }>({})
  
  // Time period filters for different charts
  const [budgetTimePeriod, setBudgetTimePeriod] = useState<TimePeriod>('all')
  const [cumulativeTimePeriod, setCumulativeTimePeriod] = useState<TimePeriod>('all')
  const [disbursementTimePeriod, setDisbursementTimePeriod] = useState<TimePeriod>('all')
  
  // Grouping toggles for charts
  const [budgetGroupBy, setBudgetGroupBy] = useState<GroupBy>('year')
  const [disbursementGroupBy, setDisbursementGroupBy] = useState<GroupBy>('month')
  
  // Chart type toggles
  const [disbursementChartType, setDisbursementChartType] = useState<'line' | 'bar'>('line')

  useEffect(() => {
    fetchFinancialAnalytics()
  }, [activityId])

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

  // Filter data by time period based on year field
  const filterDataByYear = (data: any[], period: TimePeriod) => {
    const cutoff = getCutoffDate(period)
    if (!cutoff) return data
    
    const cutoffYear = cutoff.getFullYear()
    return data.filter(item => {
      const year = parseInt(item.year)
      return !isNaN(year) && year >= cutoffYear
    })
  }

  // Filter data by time period based on date field
  const filterDataByDate = (data: any[], period: TimePeriod, dateField: string = 'date') => {
    const cutoff = getCutoffDate(period)
    if (!cutoff) return data
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField])
      return itemDate >= cutoff
    })
  }

  // Group budget data by year or month
  const groupedBudgetVsActualData = useMemo(() => {
    const grouped: any = {}
    let minYear: number | null = null
    let maxYear: number | null = null
    
    // Determine year range from activity dates if available
    if (budgetGroupBy === 'year') {
      const startDate = activityDateRange.actualStartDate || activityDateRange.plannedStartDate
      const endDate = activityDateRange.actualEndDate || activityDateRange.plannedEndDate
      
      if (startDate && endDate) {
        try {
          const { minYear: rangeMin, maxYear: rangeMax } = getYearRange(
            new Date(startDate),
            new Date(endDate)
          )
          minYear = rangeMin
          maxYear = rangeMax
        } catch (error) {
          // Invalid dates, will derive from data
        }
      }
    }
    
    // If no data but we have date range, create empty sequence
    if (rawBudgetVsActualData.length === 0 && minYear !== null && maxYear !== null && budgetGroupBy === 'year') {
      const result: any[] = []
      for (let year = minYear; year <= maxYear; year++) {
        result.push({
          period: year.toString(),
          year: year,
          sortKey: year.toString(),
          budget: 0,
          actual: 0
        })
      }
      return result
    }
    
    if (rawBudgetVsActualData.length === 0) return []
    
    rawBudgetVsActualData.forEach((item: any) => {
      let period: string
      let periodKey: string
      let sortKey: string
      
      if (budgetGroupBy === 'month' && item.date) {
        const dateObj = new Date(item.date)
        period = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        periodKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
        sortKey = periodKey
      } else {
        period = item.year?.toString() || 'Unknown'
        periodKey = period
        sortKey = period
        
        // Track min/max years from data if not provided
        if (budgetGroupBy === 'year' && item.year) {
          const year = parseInt(item.year)
          if (!isNaN(year)) {
            if (minYear === null || year < minYear) minYear = year
            if (maxYear === null || year > maxYear) maxYear = year
          }
        }
      }
      
      if (!grouped[periodKey]) {
        grouped[periodKey] = {
          period,
          year: budgetGroupBy === 'year' ? item.year : undefined,
          sortKey,
          budget: 0,
          actual: 0
        }
      }
      
      grouped[periodKey].budget += item.budget || 0
      grouped[periodKey].actual += item.actual || 0
    })
    
    let result = Object.values(grouped) as any[]
    
    // Fill in missing years if grouping by year
    if (budgetGroupBy === 'year' && minYear !== null && maxYear !== null) {
      result = fillMissingYears(
        result,
        minYear,
        maxYear,
        (period) => {
          const year = parseInt(period)
          return isNaN(year) ? 0 : year
        },
        (year) => ({
          period: year,
          year: parseInt(year),
          sortKey: year,
          budget: 0,
          actual: 0
        })
      )
    }
    
    return result.sort((a: any, b: any) => {
      // For year grouping, sort numerically; for month, lexicographically
      if (budgetGroupBy === 'year') {
        const yearA = parseInt(a.sortKey || a.year || '0')
        const yearB = parseInt(b.sortKey || b.year || '0')
        return yearA - yearB
      }
      return a.sortKey.localeCompare(b.sortKey)
    })
  }, [rawBudgetVsActualData, budgetGroupBy, activityDateRange])

  // Group disbursement data by year or month
  const groupedDisbursementData = useMemo(() => {
    const grouped: any = {}
    let minYear: number | null = null
    let maxYear: number | null = null
    
    // Determine year range from activity dates if available
    if (disbursementGroupBy === 'year') {
      const startDate = activityDateRange.actualStartDate || activityDateRange.plannedStartDate
      const endDate = activityDateRange.actualEndDate || activityDateRange.plannedEndDate
      
      if (startDate && endDate) {
        try {
          const { minYear: rangeMin, maxYear: rangeMax } = getYearRange(
            new Date(startDate),
            new Date(endDate)
          )
          minYear = rangeMin
          maxYear = rangeMax
        } catch (error) {
          // Invalid dates, will derive from data
        }
      }
    }
    
    // If no data but we have date range, create empty sequence
    if (rawDisbursementData.length === 0 && minYear !== null && maxYear !== null && disbursementGroupBy === 'year') {
      const result: any[] = []
      for (let year = minYear; year <= maxYear; year++) {
        result.push({
          period: year.toString(),
          sortKey: year.toString(),
          timestamp: new Date(year, 0, 1).getTime(),
          date: new Date(year, 0, 1).toISOString(),
          planned: 0,
          actual: 0
        })
      }
      return result
    }
    
    if (rawDisbursementData.length === 0) return []
    
    rawDisbursementData.forEach((item: any) => {
      let period: string
      let periodKey: string
      let sortKey: string
      let timestamp = item.timestamp
      
      if (disbursementGroupBy === 'year' && item.date) {
        const dateObj = new Date(item.date)
        const year = dateObj.getFullYear()
        period = year.toString()
        periodKey = period
        sortKey = period
        
        // Track min/max years from data if not provided
        if (minYear === null || year < minYear) minYear = year
        if (maxYear === null || year > maxYear) maxYear = year
      } else {
        period = item.period
        periodKey = item.sortKey || item.period
        sortKey = periodKey
      }
      
      if (!grouped[periodKey]) {
        grouped[periodKey] = {
          period,
          sortKey,
          timestamp,
          date: item.date,
          planned: 0,
          actual: 0
        }
      }
      
      grouped[periodKey].planned += item.planned || 0
      grouped[periodKey].actual += item.actual || 0
    })
    
    let result = Object.values(grouped) as any[]
    
    // Fill in missing years if grouping by year
    if (disbursementGroupBy === 'year' && minYear !== null && maxYear !== null) {
      result = fillMissingYears(
        result,
        minYear,
        maxYear,
        (period) => {
          const year = parseInt(period)
          return isNaN(year) ? 0 : year
        },
        (year) => ({
          period: year,
          sortKey: year,
          timestamp: new Date(parseInt(year), 0, 1).getTime(),
          date: new Date(parseInt(year), 0, 1).toISOString(),
          planned: 0,
          actual: 0
        })
      )
    }
    
    return result.sort((a: any, b: any) => {
      // For year grouping, sort numerically; for month, lexicographically
      if (disbursementGroupBy === 'year') {
        const yearA = parseInt(a.sortKey || '0')
        const yearB = parseInt(b.sortKey || '0')
        return yearA - yearB
      }
      return a.sortKey.localeCompare(b.sortKey)
    })
  }, [rawDisbursementData, disbursementGroupBy, activityDateRange])

  // Filtered data using useMemo for performance
  const filteredBudgetVsActual = useMemo(
    () => filterDataByYear(groupedBudgetVsActualData, budgetTimePeriod),
    [groupedBudgetVsActualData, budgetTimePeriod]
  )

  const filteredCumulativeData = useMemo(
    () => filterDataByDate(cumulativeData, cumulativeTimePeriod, 'date'),
    [cumulativeData, cumulativeTimePeriod]
  )

  const filteredDisbursementData = useMemo(
    () => filterDataByDate(groupedDisbursementData, disbursementTimePeriod, 'date'),
    [groupedDisbursementData, disbursementTimePeriod]
  )

  // Time period filter component
  const TimePeriodFilter = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: TimePeriod
    onChange: (period: TimePeriod) => void
    label?: string
  }) => {
    const periods: { value: TimePeriod; label: string }[] = [
      { value: '1m', label: '1M' },
      { value: '3m', label: '3M' },
      { value: '6m', label: '6M' },
      { value: '1y', label: '1Y' },
      { value: '5y', label: '5Y' },
      { value: 'all', label: 'All' },
    ]

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {label && <span className="text-xs font-medium text-slate-600">{label}</span>}
        <div className="flex gap-1">
          {periods.map(period => (
            <Button
              key={period.value}
              variant={value === period.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(period.value)}
              className={`h-7 px-3 text-xs ${
                value === period.value 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  // Group by toggle component
  const GroupByToggle = ({ 
    value, 
    onChange 
  }: { 
    value: GroupBy
    onChange: (groupBy: GroupBy) => void
  }) => {
    return (
      <div className="flex gap-1">
        <Button
          variant={value === 'year' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange('year')}
          className={`h-7 px-3 text-xs ${
            value === 'year' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Year
        </Button>
        <Button
          variant={value === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange('month')}
          className={`h-7 px-3 text-xs ${
            value === 'month' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Month
        </Button>
      </div>
    )
  }

  const fetchFinancialAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/activities/${activityId}/financial-analytics`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial analytics')
      }

      const data = await response.json()
      
      // Store raw data for client-side grouping
      setRawBudgetVsActualData(data.rawBudgetData || [])
      setRawDisbursementData(data.rawDisbursementData || [])
      setCumulativeData(data.cumulative || [])
      setBudgetCompositionData(data.budgetComposition || [])
      setFundingSourceData(data.fundingSources || [])
      setFinancialFlowData(data.financialFlow || {})
      setCommitmentRatio(data.commitmentRatio || 0)
      setTotalCommitment(data.totalCommitment || 0)
      setTotalDisbursement(data.totalDisbursement || 0)
      setActivityDateRange(data.activityDateRange || {})
    } catch (error) {
      console.error('Error fetching financial analytics:', error)
      toast.error('Failed to load financial analytics')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
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

  const COLORS = ['#3B82F6', '#64748B', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading financial analytics...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Commitment vs Disbursement Ratio Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Commitment vs Disbursement Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">{commitmentRatio.toFixed(1)}%</p>
                  <p className="text-xs text-slate-500 mt-1">disbursement rate</p>
                </div>
                <TrendingUp className="h-8 w-8 text-slate-400" />
              </div>
              {/* Progress Bar */}
              <div className="w-full">
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(commitmentRatio, 100)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                <div>
                  <p className="text-slate-500">Committed</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(totalCommitment)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Disbursed</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(totalDisbursement)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Budget Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-slate-900">
                  {formatCurrency(budgetCompositionData.reduce((sum, item) => sum + item.value, 0))}
                </p>
                <p className="text-xs text-slate-500">
                  {budgetCompositionData.length > 0 ? 'across all categories' : 'no budgets added'}
                </p>
                <div className="text-xs text-slate-600 pt-2 border-t border-slate-200">
                  <p>{budgetCompositionData.length} budget {budgetCompositionData.length === 1 ? 'category' : 'categories'}</p>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        {/* Funding Sources Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Funding Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-slate-900">{fundingSourceData.length}</p>
              <p className="text-xs text-slate-500">
                {fundingSourceData.length > 0 ? 'active donors/providers' : 'no funding sources'}
              </p>
              <div className="pt-2 border-t border-slate-200 space-y-1">
                {fundingSourceData.length > 0 ? (
                  fundingSourceData.slice(0, 3).map((source, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-slate-600 truncate">{source.name}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(source.value)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-2">Add organizations to track funding sources</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Actual Spending */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Budget vs Actual Spending by {budgetGroupBy === 'year' ? 'Year' : 'Month'}
              </CardTitle>
              <CardDescription>Compare planned budgets with actual spending</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <GroupByToggle 
                value={budgetGroupBy} 
                onChange={setBudgetGroupBy}
              />
              <TimePeriodFilter 
                value={budgetTimePeriod} 
                onChange={setBudgetTimePeriod}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBudgetVsActual.length > 0 ? (
            <ResponsiveContainer width="100%" height={400} key={`budget-${budgetGroupBy}`}>
              <BarChart data={filteredBudgetVsActual} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey={budgetGroupBy === 'year' ? 'year' : 'period'} 
                  stroke="#64748B" 
                  fontSize={12}
                  angle={budgetGroupBy === 'month' ? -45 : 0}
                  textAnchor={budgetGroupBy === 'month' ? 'end' : 'middle'}
                  height={budgetGroupBy === 'month' ? 80 : 30}
                />
                <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="#3B82F6" radius={[4, 4, 0, 0]} animationDuration={300} />
                <Bar dataKey="actual" name="Actual Spending" fill="#64748B" radius={[4, 4, 0, 0]} animationDuration={300} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-96 text-slate-400">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No budget vs actual data available</p>
                <p className="text-xs mt-2">Add budgets and transactions to see this chart</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cumulative Spending Over Time */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">Cumulative Spending Over Time</CardTitle>
              <CardDescription>Track accumulated spending progression</CardDescription>
            </div>
            <TimePeriodFilter 
              value={cumulativeTimePeriod} 
              onChange={setCumulativeTimePeriod}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredCumulativeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={filteredCumulativeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748B" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#64748B" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
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

      {/* Planned vs Actual Disbursements */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Planned vs Actual Disbursements by {disbursementGroupBy === 'year' ? 'Year' : 'Month'}
              </CardTitle>
              <CardDescription>Compare planned and actual disbursements</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDisbursementChartType(disbursementChartType === 'line' ? 'bar' : 'line')}
                className="h-7 px-3 text-xs"
              >
                {disbursementChartType === 'line' ? <BarChart3 className="h-3 w-3" /> : <TrendingUpIcon className="h-3 w-3" />}
              </Button>
              <GroupByToggle 
                value={disbursementGroupBy} 
                onChange={setDisbursementGroupBy}
              />
              <TimePeriodFilter 
                value={disbursementTimePeriod} 
                onChange={setDisbursementTimePeriod}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDisbursementData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400} key={`disbursement-${disbursementGroupBy}-${disbursementChartType}`}>
              {disbursementChartType === 'line' ? (
                <LineChart data={filteredDisbursementData} margin={{ top: 20, right: 30, left: 20, bottom: disbursementGroupBy === 'month' ? 60 : 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey={disbursementGroupBy === 'year' ? 'period' : 'timestamp'}
                    type={disbursementGroupBy === 'year' ? 'category' : 'number'}
                    domain={disbursementGroupBy === 'year' ? undefined : ['dataMin', 'dataMax']}
                    tickFormatter={(value) => {
                      if (disbursementGroupBy === 'year') {
                        return value
                      }
                      const date = new Date(value)
                      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    }}
                    stroke="#64748B" 
                    fontSize={12}
                    angle={disbursementGroupBy === 'month' ? -45 : 0}
                    textAnchor={disbursementGroupBy === 'month' ? 'end' : 'middle'}
                    height={disbursementGroupBy === 'month' ? 80 : 30}
                  />
                  <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="planned" 
                    name="Planned" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 4 }}
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
                <BarChart data={filteredDisbursementData} margin={{ top: 20, right: 30, left: 20, bottom: disbursementGroupBy === 'month' ? 60 : 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey={disbursementGroupBy === 'year' ? 'period' : 'timestamp'}
                    type={disbursementGroupBy === 'year' ? 'category' : 'number'}
                    domain={disbursementGroupBy === 'year' ? undefined : ['dataMin', 'dataMax']}
                    tickFormatter={(value) => {
                      if (disbursementGroupBy === 'year') {
                        return value
                      }
                      const date = new Date(value)
                      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    }}
                    stroke="#64748B" 
                    fontSize={12}
                    angle={disbursementGroupBy === 'month' ? -45 : 0}
                    textAnchor={disbursementGroupBy === 'month' ? 'end' : 'middle'}
                    height={disbursementGroupBy === 'month' ? 80 : 30}
                  />
                  <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <Legend />
                  <Bar dataKey="planned" name="Planned" fill="#3B82F6" radius={[4, 4, 0, 0]} animationDuration={300} />
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

      {/* Funding Source Breakdown */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Funding Source Breakdown</CardTitle>
          <CardDescription>Distribution of funding by donor/provider</CardDescription>
        </CardHeader>
        <CardContent>
          {fundingSourceData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={fundingSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={130}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#64748B', strokeWidth: 1 }}
                  >
                    {fundingSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                <p className="font-semibold text-slate-900 text-sm">Detailed Breakdown</p>
                <div className="space-y-2">
                  {fundingSourceData.map((source, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-slate-900">{source.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(source.value)}</p>
                        <p className="text-xs text-slate-500">
                          {((source.value / fundingSourceData.reduce((sum, s) => sum + s.value, 0)) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 text-slate-400">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No funding source data available</p>
                <p className="text-xs mt-2">Add participating organizations or transactions to see funding breakdown</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Flow by Organization Role - Placeholder for Sankey */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Financial Flow by Organisation Role</CardTitle>
          <CardDescription>Flow of funds between different organization roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sankey diagram visualization</p>
              <p className="text-xs mt-1">Advanced flow visualization requires additional library</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


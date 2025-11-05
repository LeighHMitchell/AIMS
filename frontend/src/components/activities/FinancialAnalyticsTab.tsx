"use client"

import React, { useEffect, useState, useMemo, useCallback, useTransition } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TransactionCalendarHeatmap } from './TransactionCalendarHeatmap'

type TimePeriod = '1m' | '3m' | '6m' | '1y' | '5y' | 'all'
type GroupBy = 'year' | 'month'

interface FinancialAnalyticsTabProps {
  activityId: string
  transactions?: any[]
  budgets?: any[]
  plannedDisbursements?: any[]
}

export default function FinancialAnalyticsTab({ 
  activityId, 
  transactions = [], 
  budgets = [], 
  plannedDisbursements = [] 
}: FinancialAnalyticsTabProps) {
  const [loading, setLoading] = useState(true)
  const [rawBudgetVsActualData, setRawBudgetVsActualData] = useState<any[]>([])
  const [rawDisbursementData, setRawDisbursementData] = useState<any[]>([])
  const [cumulativeData, setCumulativeData] = useState<any[]>([])
  const [budgetCompositionData, setBudgetCompositionData] = useState<any[]>([])
  const [fundingSourceData, setFundingSourceData] = useState<any[]>([])
  const [commitmentRatio, setCommitmentRatio] = useState<number>(0)
  const [totalCommitment, setTotalCommitment] = useState<number>(0)
  const [totalDisbursement, setTotalDisbursement] = useState<number>(0)
  
  // Time period filters for different charts
  const [overviewTimePeriod, setOverviewTimePeriod] = useState<TimePeriod>('all')
  const [budgetTimePeriod, setBudgetTimePeriod] = useState<TimePeriod>('all')
  const [cumulativeTimePeriod, setCumulativeTimePeriod] = useState<TimePeriod>('all')
  const [disbursementTimePeriod, setDisbursementTimePeriod] = useState<TimePeriod>('all')
  
  // Grouping toggles for charts
  const [budgetGroupBy, setBudgetGroupBy] = useState<GroupBy>('year')
  const [disbursementGroupBy, setDisbursementGroupBy] = useState<GroupBy>('month')
  
  // Chart type toggles
  const [disbursementChartType, setDisbursementChartType] = useState<'line' | 'bar'>('line')
  const [isPending, startTransition] = useTransition()

  const fetchFinancialAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/activities/${activityId}/financial-analytics`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial analytics')
      }

      const data = await response.json()
      
      // Store raw data for client-side grouping
      // Use startTransition to mark state updates as non-urgent to prevent UI blocking
      startTransition(() => {
        setRawBudgetVsActualData(data.rawBudgetData || [])
        setRawDisbursementData(data.rawDisbursementData || [])
        setCumulativeData(data.cumulative || [])
        setBudgetCompositionData(data.budgetComposition || [])
        setFundingSourceData(data.fundingSources || [])
        setCommitmentRatio(data.commitmentRatio || 0)
        setTotalCommitment(data.totalCommitment || 0)
        setTotalDisbursement(data.totalDisbursement || 0)
      })
    } catch (error) {
      console.error('Error fetching financial analytics:', error)
      toast.error('Failed to load financial analytics')
      setLoading(false)
    } finally {
      // Set loading to false outside transition so UI responds immediately
      setTimeout(() => setLoading(false), 0)
    }
  }, [activityId])

  useEffect(() => {
    if (!activityId) {
      return
    }
    fetchFinancialAnalytics()
  }, [activityId, fetchFinancialAnalytics])

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
    if (rawBudgetVsActualData.length === 0) return []
    
    const grouped: any = {}
    
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
    
    return Object.values(grouped).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))
  }, [rawBudgetVsActualData, budgetGroupBy])

  // Group disbursement data by year or month
  const groupedDisbursementData = useMemo(() => {
    if (rawDisbursementData.length === 0) return []
    
    const grouped: any = {}
    
    rawDisbursementData.forEach((item: any) => {
      let period: string
      let periodKey: string
      let sortKey: string
      let timestamp = item.timestamp
      
      if (disbursementGroupBy === 'year' && item.date) {
        const dateObj = new Date(item.date)
        period = dateObj.getFullYear().toString()
        periodKey = period
        sortKey = period
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
    
    return Object.values(grouped).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))
  }, [rawDisbursementData, disbursementGroupBy])

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

  const COLORS = ['#3B82F6', '#64748B', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']

  // Process cumulative overview data - all transaction types, planned disbursements, and budgets
  const cumulativeOverviewData = useMemo(() => {
    // Early return if no data to process
    if ((!transactions || transactions.length === 0) && 
        (!plannedDisbursements || plannedDisbursements.length === 0) && 
        (!budgets || budgets.length === 0)) {
      return []
    }

    // Collect all date points from transactions, planned disbursements, and budgets
    interface DatePoint {
      date: Date
      timestamp: number
      incomingFunds: number
      commitments: number
      disbursements: number
      expenditures: number
      plannedDisbursements: number
      plannedBudgets: number
    }

    const dateMap = new Map<string, DatePoint>()

    // Process transactions by type
    transactions?.forEach((transaction: any) => {
      if (!transaction.transaction_date) return
      
      const date = new Date(transaction.transaction_date)
      if (isNaN(date.getTime())) return
      
      const dateKey = date.toISOString().split('T')[0] // Use date as key
      // Try usd_value first, then value_usd, then value as fallback
      const value = parseFloat(String(transaction.usd_value || transaction.value_usd || transaction.value)) || 0
      
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
      // Try usd_amount first, then amount as fallback
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
      // Try usd_value first, then value as fallback
      const value = parseFloat(String(budget.usd_value || budget.value)) || 0
      
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

    // Aggregate into monthly buckets for cleaner, more consistent visualization
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
        'Incoming Funds': cumulativeIncomingFunds,
        'Commitments': cumulativeCommitments,
        'Disbursements': cumulativeDisbursements,
        'Expenditures': cumulativeExpenditures,
        'Planned Disbursements': cumulativePlannedDisbursements,
        'Planned Budgets': cumulativePlannedBudgets
      })
    })

    return Array.from(monthlyMap.values()).sort((a, b) => a.timestamp - b.timestamp)
  }, [transactions, plannedDisbursements, budgets])

  // Filter cumulative overview data by time period
  const filteredCumulativeOverviewData = useMemo(
    () => filterDataByDate(cumulativeOverviewData, overviewTimePeriod, 'date'),
    [cumulativeOverviewData, overviewTimePeriod]
  )

  // Calculate intelligent tick interval for x-axis based on data points
  const getXAxisInterval = (dataLength: number) => {
    if (dataLength <= 12) return 0 // Show all ticks for 12 or fewer months
    if (dataLength <= 24) return 1 // Show every other tick for up to 2 years
    if (dataLength <= 36) return 2 // Show every 3rd tick for up to 3 years
    if (dataLength <= 60) return 4 // Show every 5th tick (every ~5 months) for up to 5 years
    return Math.floor(dataLength / 12) // Show ~12 ticks for longer periods
  }

  if (loading || isPending) {
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
      {/* Cumulative Overview Chart - All Transaction Types, Planned Disbursements, and Budgets */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Cumulative Financial Overview
              </CardTitle>
              <CardDescription>
                Cumulative view of all transaction types, planned disbursements, and planned budgets over time
              </CardDescription>
            </div>
            <TimePeriodFilter 
              value={overviewTimePeriod} 
              onChange={setOverviewTimePeriod}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredCumulativeOverviewData.length > 0 ? (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={filteredCumulativeOverviewData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#64748B" 
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={getXAxisInterval(filteredCumulativeOverviewData.length)}
                />
                <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Incoming Funds" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 3 }}
                  animationDuration={300}
                />
                <Line 
                  type="monotone" 
                  dataKey="Commitments" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 3 }}
                  animationDuration={300}
                />
                <Line 
                  type="monotone" 
                  dataKey="Disbursements" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  dot={{ fill: '#F59E0B', r: 3 }}
                  animationDuration={300}
                />
                <Line 
                  type="monotone" 
                  dataKey="Expenditures" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  dot={{ fill: '#EF4444', r: 3 }}
                  animationDuration={300}
                />
                <Line 
                  type="monotone" 
                  dataKey="Planned Disbursements" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#8B5CF6', r: 3 }}
                  animationDuration={300}
                />
                <Line 
                  type="monotone" 
                  dataKey="Planned Budgets" 
                  stroke="#EC4899" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#EC4899', r: 3 }}
                  animationDuration={300}
                />
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

      {/* Transaction Calendar Heat Map */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Transaction Activity Calendar
              </CardTitle>
              <CardDescription>
                Daily transaction activity colored by transaction type. Gradient colors indicate mixed transaction types on the same day.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TransactionCalendarHeatmap transactions={transactions} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
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

      </div>

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
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
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
    </div>
  )
}


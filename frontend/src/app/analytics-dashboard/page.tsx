"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ExpandableCard } from '@/components/ui/expandable-card'
import { CompactChartCard } from '@/components/ui/compact-chart-card'
import { ChartGrid } from '@/components/ui/chart-grid'
import { getFiveYearDateRange } from '@/lib/date-utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Activity, 
  DollarSign, 
  Users, 
  Building2,
  Calendar as CalendarIcon,
  Filter,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  LineChart,
  MapPin,
  Network,
  Info
} from 'lucide-react'
import { format, startOfYear, endOfYear } from 'date-fns'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { AnalyticsDashboardSkeleton } from '@/components/skeletons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

// Chart components
import { CommitmentsChart } from '@/components/analytics/CommitmentsChart'
import { AllDonorsHorizontalBarChart } from '@/components/analytics/AllDonorsHorizontalBarChart'
import { SectorPieChart } from '@/components/analytics/SectorPieChart'
import { HumanitarianChart } from '@/components/analytics/HumanitarianChart'
import { HumanitarianShareChart } from '@/components/analytics/HumanitarianShareChart'
import { AidMap } from '@/components/analytics/AidMap'
import { AidFlowMap } from '@/components/analytics/AidFlowMap'
import { SankeyFlow } from '@/components/analytics/SankeyFlow'
import { DataHeatmap } from '@/components/analytics/DataHeatmap'
import { TimelinessChart } from '@/components/analytics/TimelinessChart'
import { BudgetVsActualChart } from '@/components/analytics/BudgetVsActualChart'
import { TransactionActivityCalendar } from '@/components/analytics/TransactionActivityCalendar'

// Disbursements by Sector components
import { DashboardDisbursementsBySection } from '@/components/analytics/DashboardDisbursementsBySection'

// New visualizations from Activity Profile
import { CumulativeFinancialOverview } from '@/components/analytics/CumulativeFinancialOverview'
import { CumulativeSpendingOverTime } from '@/components/analytics/CumulativeSpendingOverTime'
import { PlannedVsActualDisbursements } from '@/components/analytics/PlannedVsActualDisbursements'
import { FundingSourceBreakdown } from '@/components/analytics/FundingSourceBreakdown'
import { FinanceTypeFlowChart } from '@/components/analytics/FinanceTypeFlowChart'
import { AllActivitiesFundingSourceBreakdown } from '@/components/analytics/AllActivitiesFundingSourceBreakdown'

// Top 10 charts
import { Top10TotalFinancialValueChart } from '@/components/analytics/Top10TotalFinancialValueChart'
import { Top10ActiveProjectsChart } from '@/components/analytics/Top10ActiveProjectsChart'
import { Top10DisbursementCommitmentRatioChart } from '@/components/analytics/Top10DisbursementCommitmentRatioChart'
import { Top10GovernmentValidatedChart } from '@/components/analytics/Top10GovernmentValidatedChart'
import { Top10SectorFocusedChart } from '@/components/analytics/Top10SectorFocusedChart'
import { TopLikedActivitiesChart } from '@/components/analytics/TopLikedActivitiesChart'
import { ODAByFlowTypeChart } from '@/components/analytics/ODAByFlowTypeChart'
import { PolicyMarkersChart } from '@/components/analytics/PolicyMarkersChart'

// SDGs Analytics
import { SDGAnalytics } from '@/components/analytics/sdgs/SDGAnalytics'

// Aid on Budget Chart
import { EnhancedAidOnBudgetChart } from '@/components/analytics/EnhancedAidOnBudgetChart'

// Participating Orgs Sankey
import { ParticipatingOrgsSankey } from '@/components/analytics/ParticipatingOrgsSankey'

// Coordination Circle Pack
import { CoordinationCirclePack } from '@/components/analytics/CoordinationCirclePack'
import type { CoordinationView, CoordinationResponse } from '@/types/coordination'

// Charts from analytics page
import { BudgetVsSpendingChart } from '@/components/charts/BudgetVsSpendingChart'
import { ReportingOrgChart } from '@/components/charts/ReportingOrgChart'
import { AidTypeChart } from '@/components/charts/AidTypeChart'
import { FinanceTypeChart } from '@/components/charts/FinanceTypeChart'
import { OrgTypeChart } from '@/components/charts/OrgTypeChart'
import { ActivityStatusChart } from '@/components/charts/ActivityStatusChart'
import { TransactionTypeChart } from '@/components/charts/TransactionTypeChart'
import { SectorAnalysisChart } from '@/components/charts/SectorAnalysisChart'

// Sector Analytics components
import { SectorFilters } from '@/components/analytics/sectors/SectorFilters'
import { SectorBarChart } from '@/components/analytics/sectors/SectorBarChart'
import { SectorTimeSeriesPanel } from '@/components/analytics/sectors/SectorTimeSeriesPanel'
import { SectorAnalyticsFilters, SectorMetrics, SectorAnalyticsResponse } from '@/types/sector-analytics'

// Funding Over Time Analytics
import { FundingOverTimeAnalytics } from '@/components/analytics/FundingOverTimeAnalytics'

// National Priorities Dashboard
import { Dashboard as NationalPrioritiesDashboard } from '@/components/analytics/national-priorities-dashboard'

// Planned and Actual Disbursement by Sector (new chart)
import { PlannedActualDisbursementBySector } from '@/components/analytics/PlannedActualDisbursementBySector'

// Sector Disbursement Over Time (time series chart)
import { SectorDisbursementOverTime } from '@/components/analytics/SectorDisbursementOverTime'

// Portfolio Spend Trajectory Chart
import { PortfolioSpendTrajectoryChart } from '@/components/charts/PortfolioSpendTrajectoryChart'

interface KPIData {
  totalDisbursed: number
  commitmentsDisbursedPercent: number
  activeProjects: number
  donorsReporting: number
  totalBudget: number
  budgetUtilization: number
  totalExpenditure: number
  completedProjects: number
}

interface DateRange {
  from: Date
  to: Date
}

type TimePeriodType = 'year' | 'quarter'

interface AnalyticsFilters {
  donor: string
  aidType: string
  financeType: string
  flowType: string
  timePeriod: TimePeriodType
  topN: string
}

export default function AnalyticsDashboardPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  // Get initial tab from URL or default to 'main'
  const tabFromUrl = searchParams.get('tab') || 'main'
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const [kpiData, setKpiData] = useState<KPIData>({
    totalDisbursed: 0,
    commitmentsDisbursedPercent: 0,
    activeProjects: 0,
    donorsReporting: 0,
    totalBudget: 0,
    budgetUtilization: 0,
    totalExpenditure: 0,
    completedProjects: 0
  })
  
  // Filter states - Initialize with 5-year date range for compact charts
  // Memoize to prevent infinite re-renders when passing to child components
  const fiveYearRange = useMemo(() => getFiveYearDateRange(), [])
  const [dateRange, setDateRange] = useState<DateRange>(fiveYearRange)

  const [refreshKey, setRefreshKey] = useState(0)

  // Handle tab change - update URL to persist tab selection
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Sync activeTab with URL on mount and when URL changes
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Additional filters for analytics charts
  const [filters, setFilters] = useState<AnalyticsFilters>({
    donor: 'all',
    aidType: 'all',
    financeType: 'all',
    flowType: 'all',
    timePeriod: 'year',
    topN: '10'
  })

  // Chart data for exports - individual state for each chart
  const [budgetVsSpendingData, setBudgetVsSpendingData] = useState<any[]>([])
  const [reportingOrgData, setReportingOrgData] = useState<any[]>([])
  const [aidTypeData, setAidTypeData] = useState<any[]>([])
  const [financeTypeData, setFinanceTypeData] = useState<any[]>([])
  const [orgTypeData, setOrgTypeData] = useState<any[]>([])
  const [activityStatusData, setActivityStatusData] = useState<any[]>([])
  const [transactionTypeData, setTransactionTypeData] = useState<any[]>([])
  const [sectorAnalysisData, setSectorAnalysisData] = useState<any[]>([])
  const [donorsData, setDonorsData] = useState<any[]>([])
  const [sectorPieData, setSectorPieData] = useState<any[]>([])
  const [humanitarianData, setHumanitarianData] = useState<any[]>([])
  const [commitmentsData, setCommitmentsData] = useState<any[]>([])
  const [budgetVsActualData, setBudgetVsActualData] = useState<any[]>([])
  const [odaByFlowTypeData, setOdaByFlowTypeData] = useState<any[]>([])
  const [top10TotalFinancialData, setTop10TotalFinancialData] = useState<any[]>([])
  const [top10ActiveProjectsData, setTop10ActiveProjectsData] = useState<any[]>([])
  const [top10GovernmentValidatedData, setTop10GovernmentValidatedData] = useState<any[]>([])
  const [top10SectorFocusedData, setTop10SectorFocusedData] = useState<any[]>([])
  const [financeTypeFlowData, setFinanceTypeFlowData] = useState<any[]>([])

  // Sector Analytics state
  const [sectorAnalyticsData, setSectorAnalyticsData] = useState<SectorMetrics[]>([])
  const [sectorAnalyticsLoading, setSectorAnalyticsLoading] = useState(false)
  const [sectorAnalyticsFilters, setSectorAnalyticsFilters] = useState<SectorAnalyticsFilters>({
    year: 'all',
    organizationId: 'all',
    vocabulary: 'DAC-5',
    groupByLevel: '5',
    publicationStatus: 'all'
  })

  // Coordination state
  const [coordinationView, setCoordinationView] = useState<CoordinationView>('sectors')
  const [coordinationData, setCoordinationData] = useState<CoordinationResponse | null>(null)
  const [coordinationLoading, setCoordinationLoading] = useState(false)

  // Dropdown options for Comprehensive tab
  const [aidTypes, setAidTypes] = useState<Array<{code: string, name: string}>>([])
  const [financeTypes, setFinanceTypes] = useState<Array<{code: string, name: string}>>([])
  const [flowTypes, setFlowTypes] = useState<Array<{code: string, name: string}>>([])
  const [loadingFilters, setLoadingFilters] = useState(true)

  // Fetch filter options for Comprehensive tab
  const fetchFilterOptions = async () => {
    try {
      setLoadingFilters(true)

      // Fetch aid types, finance types, and flow types
      const [aidTypesRes, financeTypesRes, flowTypesRes] = await Promise.all([
        fetch('/api/analytics/aid-types'),
        fetch('/api/analytics/finance-types'),
        fetch('/api/analytics/flow-types')
      ])

      if (aidTypesRes.ok) {
        const aidTypesData = await aidTypesRes.json()
        setAidTypes(aidTypesData)
      }

      if (financeTypesRes.ok) {
        const financeTypesData = await financeTypesRes.json()
        setFinanceTypes(financeTypesData)
      }

      if (flowTypesRes.ok) {
        const flowTypesData = await flowTypesRes.json()
        setFlowTypes(flowTypesData)
      }
    } catch (error) {
      console.error('Error fetching filter options:', error)
    } finally {
      setLoadingFilters(false)
    }
  }

  // Fetch KPI data
  const fetchKPIData = async () => {
    try {
      setLoading(true)
      setError(null)

      const dateFrom = dateRange.from.toISOString()
      const dateTo = dateRange.to.toISOString()

      // Get total disbursed
      const disbursedQuery = supabase
        .from('transactions')
        .select('value')
        .eq('transaction_type', '3') // Disbursement
        .eq('status', 'actual')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)
      
      const { data: disbursedData, error: disbursedError } = await disbursedQuery
      
      if (disbursedError) {
        console.error('[Analytics] Error fetching disbursements:', disbursedError)
        setError('Failed to fetch disbursement data')
        setLoading(false)
        return
      }
      
      // Ensure we have valid data before reducing
      let totalDisbursed = 0
      if (!disbursedData || !Array.isArray(disbursedData)) {
        console.warn('[Analytics] No disbursed data or invalid format')
        totalDisbursed = 0
      } else {
        totalDisbursed = disbursedData.reduce((sum: number, t: any) => {
          const rawValue = t.value
          
          // Handle potential decimal/numeric types from PostgreSQL
          let value = 0
          if (rawValue !== null && rawValue !== undefined) {
            if (typeof rawValue === 'string') {
              value = parseFloat(rawValue) || 0
            } else if (typeof rawValue === 'number') {
              value = rawValue
            } else if (typeof rawValue === 'object' && rawValue.toString) {
              // Handle decimal.js or similar objects
              value = parseFloat(rawValue.toString()) || 0
            }
          }
          if (isNaN(value)) {
            console.warn('[Analytics] Invalid transaction value:', t)
          }
          return sum + (isNaN(value) ? 0 : value)
        }, 0)
      }
      
      // Ensure totalDisbursed is valid
      if (isNaN(totalDisbursed) || !isFinite(totalDisbursed)) {
        console.error('[Analytics] totalDisbursed is NaN or Infinity:', totalDisbursed)
        setKpiData({
          totalDisbursed: 0,
          commitmentsDisbursedPercent: 0,
          activeProjects: 0,
          donorsReporting: 0,
          totalBudget: 0,
          budgetUtilization: 0,
          totalExpenditure: 0,
          completedProjects: 0
        })
        return
      }

      // Get commitments
      const commitmentQuery = supabase
        .from('transactions')
        .select('value')
        .eq('transaction_type', '2') // Commitment
        .eq('status', 'actual')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)
      
      const { data: commitmentData, error: commitmentError } = await commitmentQuery
      
      if (commitmentError) {
        console.error('[Analytics] Error fetching commitments:', commitmentError)
      }
      
      const totalCommitments = commitmentData?.reduce((sum: number, t: any) => {
        // Handle potential decimal/numeric types from PostgreSQL
        let value = 0
        const rawValue = t.value
        if (rawValue !== null && rawValue !== undefined) {
          if (typeof rawValue === 'string') {
            value = parseFloat(rawValue) || 0
          } else if (typeof rawValue === 'number') {
            value = rawValue
          } else if (typeof rawValue === 'object' && rawValue.toString) {
            // Handle decimal.js or similar objects
            value = parseFloat(rawValue.toString()) || 0
          }
        }
        return sum + (isNaN(value) ? 0 : value)
      }, 0) || 0
      let commitmentsDisbursedPercent = 0
      if (totalCommitments > 0 && !isNaN(totalDisbursed) && !isNaN(totalCommitments)) {
        const percentage = (totalDisbursed / totalCommitments) * 100
        commitmentsDisbursedPercent = isNaN(percentage) ? 0 : Math.round(percentage)
      }

      // Get active projects
      const { count: activeProjects } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('activity_status', '2') // IATI code 2 = Implementation (active/ongoing)
        .eq('publication_status', 'published')
      

      // Get unique donors
      const { data: donorData } = await supabase
        .from('transactions')
        .select('provider_org_id')
        .eq('status', 'actual')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)
        .not('provider_org_id', 'is', null)
      
      const uniqueDonors = new Set(donorData?.filter((t: any) => t.provider_org_id).map((t: any) => t.provider_org_id) || [])
      const donorsReporting = uniqueDonors.size

      // Get total budget
      const { data: budgetData } = await supabase
        .from('activity_budgets')
        .select('value, activity_id')
        .gte('period_start', dateFrom)
        .lte('period_end', dateTo)
      
      const totalBudget = budgetData?.reduce((sum: number, b: any) => {
        const value = parseFloat(b.value?.toString() || '0') || 0
        return sum + (isNaN(value) ? 0 : value)
      }, 0) || 0

      // Get expenditure
      const { data: expenditureData } = await supabase
        .from('transactions')
        .select('value')
        .eq('transaction_type', '4') // Expenditure
        .eq('status', 'actual')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)
      
      const totalExpenditure = expenditureData?.reduce((sum: number, t: any) => {
        const value = parseFloat(t.value?.toString() || '0') || 0
        return sum + (isNaN(value) ? 0 : value)
      }, 0) || 0

      // Get completed projects
      const { count: completedProjects } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .in('activity_status', ['3', '4']) // IATI codes: 3 = Finalisation, 4 = Closed
        .eq('publication_status', 'published')

      // Calculate budget utilization
      const budgetUtilization = totalBudget > 0 ? Math.round((totalDisbursed / totalBudget) * 100) : 0

      setKpiData({
        totalDisbursed,
        commitmentsDisbursedPercent,
        activeProjects: activeProjects || 0,
        donorsReporting,
        totalBudget,
        budgetUtilization,
        totalExpenditure,
        completedProjects: completedProjects || 0
      })
    } catch (error) {
      console.error('Error fetching KPI data:', error)
      setError('Failed to load analytics data. Please try refreshing.')
    } finally {
      setLoading(false)
    }
  }



  // Handle filter changes for analytics charts
  const handleFilterChange = (key: keyof AnalyticsFilters, value: string | TimePeriodType) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions()
  }, [])

  // Fetch KPI data when date range or refresh changes
  useEffect(() => {
    fetchKPIData()
  }, [dateRange, refreshKey])

  // Fetch Sector Analytics data
  const fetchSectorAnalyticsData = async () => {
    try {
      setSectorAnalyticsLoading(true)
      
      const params = new URLSearchParams()
      if (sectorAnalyticsFilters.year && sectorAnalyticsFilters.year !== 'all') {
        params.append('year', sectorAnalyticsFilters.year)
      }
      if (sectorAnalyticsFilters.organizationId && sectorAnalyticsFilters.organizationId !== 'all') {
        params.append('organizationId', sectorAnalyticsFilters.organizationId)
      }
      params.append('groupByLevel', sectorAnalyticsFilters.groupByLevel)
      if (sectorAnalyticsFilters.publicationStatus) {
        params.append('publicationStatus', sectorAnalyticsFilters.publicationStatus)
      }

      const response = await fetch(`/api/analytics/sectors-analytics?${params}`)
      const result: SectorAnalyticsResponse = await response.json()

      if (result.success) {
        setSectorAnalyticsData(result.data || [])
      } else {
        console.error('[SectorAnalytics] Error:', result.error)
        toast.error('Failed to load sector analytics')
      }
    } catch (error) {
      console.error('[SectorAnalytics] Error:', error)
      toast.error('Failed to load sector analytics')
    } finally {
      setSectorAnalyticsLoading(false)
    }
  }

  // Fetch Sector Analytics when filters change
  useEffect(() => {
    fetchSectorAnalyticsData()
  }, [sectorAnalyticsFilters, refreshKey])

  // Fetch Coordination data
  const fetchCoordinationData = async () => {
    try {
      setCoordinationLoading(true)
      const response = await fetch(`/api/analytics/coordination?view=${coordinationView}`)
      const result = await response.json()

      if (result.success) {
        setCoordinationData(result)
      } else {
        console.error('[Coordination] Error:', result.error)
      }
    } catch (error) {
      console.error('[Coordination] Error:', error)
    } finally {
      setCoordinationLoading(false)
    }
  }

  // Fetch Coordination data when view changes
  useEffect(() => {
    fetchCoordinationData()
  }, [coordinationView, refreshKey])

  const formatCurrency = (value: number) => {
    try {
      if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '0'
      }
      const safeValue = Number(value)
      if (isNaN(safeValue) || !isFinite(safeValue)) {
        return '0'
      }
      // Additional safety check
      if (safeValue === 0) return '0'
      
      try {
        return new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 1,
          minimumFractionDigits: 0
        }).format(safeValue)
      } catch (formatError) {
        console.error('[Analytics] NumberFormat error:', formatError)
        return safeValue.toFixed(0)
      }
    } catch (error) {
      console.error('[Analytics] Error formatting currency:', error, value)
      return '0'
    }
  }

  // KPI Cards Configuration
  const kpiCards = [
    {
      title: 'TOTAL BUDGETED',
      value: loading ? '...' : `$${formatCurrency(kpiData.totalBudget)}`,
      description: kpiData.totalBudget < 1000000 ? 'Limited budget data available' : 'Approved budget for period',
      icon: Target,
      trend: kpiData.totalBudget < 1000000 ? 'warning' : 'up'
    },
    {
      title: 'TOTAL DISBURSED',
      value: loading ? '...' : `$${formatCurrency(kpiData.totalDisbursed)}`,
      description: 'Actual disbursements',
      icon: DollarSign,
      trend: 'up'
    },
    {
      title: 'TOTAL EXPENDITURE',
      value: loading ? '...' : `$${formatCurrency(kpiData.totalExpenditure)}`,
      description: 'Funds spent',
      icon: TrendingUp,
      trend: 'up'
    },
    {
      title: 'BUDGET UTILIZATION',
      value: loading ? '...' : kpiData.totalBudget < 1000000 ? 'N/A' : `${kpiData.budgetUtilization}%`,
      description: kpiData.totalBudget < 1000000 ? 'Insufficient budget data' : 'Budget spent to date',
      icon: Activity,
      trend: kpiData.totalBudget < 1000000 ? 'warning' : kpiData.budgetUtilization > 80 ? 'warning' : 'good'
    },
    {
      title: 'DISBURSEMENT RATE',
      value: loading ? '...' : `${kpiData.commitmentsDisbursedPercent}%`,
      description: 'Commitments disbursed',
      icon: Activity,
      trend: kpiData.commitmentsDisbursedPercent > 50 ? 'good' : 'warning'
    },
    {
      title: 'ACTIVE PROJECTS',
      value: loading ? '...' : kpiData.activeProjects.toString(),
      description: 'Currently implementing',
      icon: Activity,
      trend: 'good'
    },
    {
      title: 'COMPLETED PROJECTS',
      value: loading ? '...' : kpiData.completedProjects.toString(),
      description: 'Successfully finished',
      icon: CheckCircle2,
      trend: 'good'
    },
    {
      title: 'REPORTING PARTNERS',
      value: loading ? '...' : kpiData.donorsReporting.toString(),
      description: 'Active organizations',
      icon: Users,
      trend: 'up'
    }
  ]

  // Show skeleton loader during initial load
  if (loading && !kpiData.totalDisbursed && !kpiData.activeProjects) {
    return (
      <MainLayout>
        <AnalyticsDashboardSkeleton />
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-white">
        {/* Main Dashboard Content */}
        <div className="mx-auto p-6">
          {/* Error Display */}
          {error && (
            <Card className="bg-red-50 border-red-200 mb-6">
              <CardContent className="p-4">
                <p className="text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap">
                  <TabsTrigger value="main" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Main</TabsTrigger>
                  <TabsTrigger value="sectors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sectors</TabsTrigger>
                  <TabsTrigger value="humanitarian" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Humanitarian</TabsTrigger>
                  <TabsTrigger value="activity-status" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Activity Status</TabsTrigger>
                  <TabsTrigger value="policy-markers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Policy Markers</TabsTrigger>
                  <TabsTrigger value="sdgs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">SDGs</TabsTrigger>
                  <TabsTrigger value="participating-orgs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Participating Orgs</TabsTrigger>
                  <TabsTrigger value="network" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Network</TabsTrigger>
                  <TabsTrigger value="calendar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Calendar</TabsTrigger>
                  <TabsTrigger value="top10" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Top 10</TabsTrigger>
                  <TabsTrigger value="aid-on-budget" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Aid on Budget</TabsTrigger>
                  <TabsTrigger value="funding-over-time" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Funding Over Time</TabsTrigger>
                  <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Dashboard</TabsTrigger>
                  <TabsTrigger value="under-development" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Under Development</TabsTrigger>
                </TabsList>

                <TabsContent value="main">
                  <ChartGrid>
                    <CompactChartCard
                      title="Planned & Actual Disbursement by Sector"
                      shortDescription="Compare planned vs actual disbursements across all sectors"
                      fullDescription="Compare planned disbursements with actual disbursements across all sectors"
                    >
                      <PlannedActualDisbursementBySector
                        dateRange={fiveYearRange}
                        refreshKey={refreshKey}
                      />
                    </CompactChartCard>

                    <CompactChartCard
                      title="Sector Financial Trends"
                      shortDescription="Track sector disbursement patterns and trends over time"
                      fullDescription="Time series analysis of sector disbursements over time"
                    >
                      <SectorDisbursementOverTime
                        dateRange={fiveYearRange}
                        refreshKey={refreshKey}
                      />
                    </CompactChartCard>

                    <CompactChartCard
                      title="Cumulative Financial Overview"
                      shortDescription="Total commitments, disbursements & budgets accumulated over time"
                      fullDescription="Cumulative view of all transaction types, planned disbursements, and budgets over time"
                    >
                      <CumulativeFinancialOverview
                        dateRange={fiveYearRange}
                        refreshKey={refreshKey}
                      />
                    </CompactChartCard>

                    <CompactChartCard
                      title="Portfolio Spend Trajectory"
                      shortDescription="Actual spending progress vs ideal linear disbursement curve"
                      fullDescription="Actual cumulative disbursements compared against a perfect spend trajectory"
                    >
                      <PortfolioSpendTrajectoryChart
                        refreshKey={refreshKey}
                      />
                    </CompactChartCard>

                    <CompactChartCard
                      title="Financial Flows by Finance Type"
                      shortDescription="Distribution of grants, loans & other finance types by flow category"
                      fullDescription="Visualize financial flows by finance types across different flow types over time"
                    >
                      <FinanceTypeFlowChart
                        dateRange={fiveYearRange}
                        refreshKey={refreshKey}
                        onDataChange={setFinanceTypeFlowData}
                      />
                    </CompactChartCard>

                    <CompactChartCard
                      title="All Donors Financial Overview"
                      shortDescription="All donors ranked by budgets, planned & actual disbursements"
                      fullDescription="Complete ranking of all donors by total budgets, planned disbursements, or actual disbursements"
                    >
                      <AllDonorsHorizontalBarChart
                        dateRange={fiveYearRange}
                        refreshKey={refreshKey}
                        onDataChange={setDonorsData}
                      />
                    </CompactChartCard>

                    <CompactChartCard
                      title="Funding Source Breakdown"
                      shortDescription="Sankey diagram showing provider-to-receiver financial flows"
                      fullDescription="Distribution of funding by donor/provider across all activities"
                    >
                      <AllActivitiesFundingSourceBreakdown
                        dateRange={fiveYearRange}
                        refreshKey={refreshKey}
                      />
                    </CompactChartCard>

                    <CompactChartCard
                      title="Top Voted Activities"
                      shortDescription="Activities ranked by vote score (upvotes - downvotes)"
                      fullDescription="Top 10 activities ranked by net vote score from user upvotes and downvotes"
                    >
                      <TopLikedActivitiesChart
                        refreshKey={refreshKey}
                      />
                    </CompactChartCard>
                  </ChartGrid>
                </TabsContent>

                <TabsContent value="sectors">
                  <div className="space-y-6">
                    {/* Sector Filters - kept at tab level for all charts */}
                    <SectorFilters
                      filters={sectorAnalyticsFilters}
                      onFiltersChange={setSectorAnalyticsFilters}
                    />

                    <ChartGrid>
                      <CompactChartCard
                        title="Sector Analysis"
                        shortDescription="Disbursement values and activity counts per sector"
                        fullDescription="Financial flows and project distribution across sectors"
                      >
                        {sectorAnalyticsLoading ? (
                          <Skeleton className="h-full w-full" />
                        ) : (
                          <SectorBarChart
                            data={sectorAnalyticsData}
                            filters={sectorAnalyticsFilters}
                          />
                        )}
                      </CompactChartCard>

                      <CompactChartCard
                        title="Coordination"
                        shortDescription="Network visualization of organizations and their sector focus"
                        fullDescription={coordinationView === 'sectors'
                          ? "Who's working in each sector? Each circle represents a sector with partners shown as smaller circles."
                          : "What is each partner working on? Each circle represents a partner with sectors shown as smaller circles."}
                      >
                        {coordinationLoading ? (
                          <Skeleton className="h-full w-full" />
                        ) : (
                          <CoordinationCirclePack
                            view={coordinationView}
                            data={coordinationData?.data || null}
                            width={400}
                            height={250}
                          />
                        )}
                      </CompactChartCard>
                    </ChartGrid>

                    {/* Sector Time Series Panel - full width due to complexity */}
                    <SectorTimeSeriesPanel />
                  </div>
                </TabsContent>

                <TabsContent value="humanitarian">
                  <ChartGrid>
                    <CompactChartCard
                      title="Share of Humanitarian Aid"
                      shortDescription="Humanitarian portion as percentage of total international aid"
                      fullDescription="Share of humanitarian aid compared to total international aid"
                    >
                      <HumanitarianShareChart
                        dateRange={fiveYearRange}
                        refreshKey={refreshKey}
                      />
                    </CompactChartCard>
                    
                    <CompactChartCard
                      title="Humanitarian vs Development Aid"
                      shortDescription="Year-over-year comparison of humanitarian and development flows"
                      fullDescription="Historical comparison of humanitarian and development aid flows over time"
                      exportData={humanitarianData}
                    >
                      <HumanitarianChart
                        dateRange={fiveYearRange}
                        refreshKey={refreshKey}
                        onDataChange={setHumanitarianData}
                      />
                    </CompactChartCard>
                  </ChartGrid>
                </TabsContent>

                <TabsContent value="activity-status">
                  <ChartGrid>
                    <CompactChartCard
                      title="Activity Status Distribution"
                      shortDescription="Distribution of activities by publication & submission status"
                      fullDescription="Analyze the distribution of activities by their status (activity, publication, and submission status)"
                      exportData={activityStatusData}
                    >
                      <ActivityStatusChart
                        filters={filters}
                        onDataChange={setActivityStatusData}
                      />
                    </CompactChartCard>

                    <CompactChartCard
                      title="Transaction Type Analysis"
                      shortDescription="Count and total value of commitments, disbursements & expenditures"
                      fullDescription="Compare transaction types by count and total value (Commitments, Disbursements, Expenditures, etc.)"
                      exportData={transactionTypeData}
                    >
                      <TransactionTypeChart
                        filters={filters}
                        onDataChange={setTransactionTypeData}
                      />
                    </CompactChartCard>
                  </ChartGrid>
                </TabsContent>

                <TabsContent value="policy-markers">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Policy Markers</h2>
                      <p className="text-gray-600">
                        Analyze activities by policy marker and significance level. Policy markers reflect policy intent, not financial allocation.
                      </p>
                    </div>
                    <PolicyMarkersChart refreshKey={refreshKey} />
                  </div>
                </TabsContent>

                <TabsContent value="sdgs">
                  <SDGAnalytics 
                    dateRange={dateRange} 
                    onDateRangeChange={setDateRange}
                    refreshKey={refreshKey} 
                  />
                </TabsContent>

                <TabsContent value="participating-orgs">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Participating Organizations Flow</h2>
                      <p className="text-gray-600">
                        4-tier Sankey visualization showing the flow of organizations across IATI participating-org roles:
                        Funding (1) → Extending (3) → Accountable (2) → Implementing (4)
                      </p>
                    </div>
                    <ParticipatingOrgsSankey refreshKey={refreshKey} />
                  </div>
                </TabsContent>

                <TabsContent value="network">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Network</h2>
                      <p className="text-gray-600">
                        Interactive visualization of aid flows between donors and recipients
                      </p>
                    </div>
                    <div className="w-full">
                      <AidFlowMap height={500} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="calendar">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Transaction Calendar</h2>
                      <p className="text-gray-600">
                        Daily transaction activity heatmap showing patterns and trends over time
                      </p>
                    </div>
                    <TransactionActivityCalendar
                      dateRange={dateRange}
                      refreshKey={refreshKey}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="top10">
                  <ChartGrid>
                    <CompactChartCard
                      title="Top 10 by Active Projects"
                      shortDescription="Organizations ranked by number of active activities as partner"
                      fullDescription="Count of activities where the organisation is listed as a funding or implementing partner"
                      exportData={top10ActiveProjectsData}
                    >
                      <Top10ActiveProjectsChart
                        refreshKey={refreshKey}
                        onDataChange={setTop10ActiveProjectsData}
                      />
                    </CompactChartCard>

                    <CompactChartCard
                      title="Top 10 by Government-Validated"
                      shortDescription="Partners with highest value of government-validated activities"
                      fullDescription="Highlights alignment and mutual accountability. Shows projects that have been validated by the recipient government."
                      exportData={top10GovernmentValidatedData}
                    >
                      <Top10GovernmentValidatedChart
                        dateRange={fiveYearRange}
                        refreshKey={refreshKey}
                        onDataChange={setTop10GovernmentValidatedData}
                      />
                    </CompactChartCard>

                    <CompactChartCard
                      title="Top 10 by Total Disbursements"
                      shortDescription="Highest-disbursing partners across all sectors combined"
                      fullDescription="Top 10 partners across all sectors. Used for sectoral coordination groups or working group dashboards."
                      exportData={top10SectorFocusedData}
                    >
                      <Top10SectorFocusedChart
                        dateRange={fiveYearRange}
                        refreshKey={refreshKey}
                        onDataChange={setTop10SectorFocusedData}
                      />
                    </CompactChartCard>
                  </ChartGrid>
                </TabsContent>

                <TabsContent value="aid-on-budget">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Aid on Budget</h2>
                      <p className="text-gray-600">
                        Compare domestic government spending with on-budget and off-budget aid by fiscal year
                      </p>
                    </div>
                    <EnhancedAidOnBudgetChart
                      refreshKey={refreshKey}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="funding-over-time">
                  <div className="space-y-6">
                    <FundingOverTimeAnalytics />
                  </div>
                </TabsContent>

                <TabsContent value="dashboard">
                  <NationalPrioritiesDashboard />
                </TabsContent>

                <TabsContent value="under-development">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Aid by Sector */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title="Aid Distribution by Sector"
                description="Breakdown of funding across sectors"
                exportData={sectorPieData}
              >
                <SectorPieChart
                  dateRange={dateRange}
                  refreshKey={refreshKey}
                  onDataChange={setSectorPieData}
                />
              </ExpandableCard>

              {/* Time Series Chart */}
              <ExpandableCard
                className="bg-white border-slate-200 lg:col-span-2"
                title={
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Budget vs. Spending Over Time</span>
                  </div>
                }
                description="Compare total budget allocations with actual spending (disbursements + expenditures) over time"
                exportData={budgetVsSpendingData}
              >
                <BudgetVsSpendingChart
                  filters={filters}
                  onDataChange={setBudgetVsSpendingData}
                />
              </ExpandableCard>

              {/* Reporting Organization Chart */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title={
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    <span>Budget vs. Spending by Reporting Organization</span>
                  </div>
                }
                description="Compare budget and spending across different reporting organizations"
                exportData={reportingOrgData}
              >
                <ReportingOrgChart
                  filters={filters}
                  onDataChange={setReportingOrgData}
                />
              </ExpandableCard>

              {/* Aid Type Chart */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title={
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    <span>Budget vs. Spending by Aid Type</span>
                  </div>
                }
                description="Analyze budget and spending patterns across different aid types"
                exportData={aidTypeData}
              >
                <AidTypeChart
                  filters={filters}
                  onDataChange={setAidTypeData}
                />
              </ExpandableCard>

              {/* Finance Type Chart */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title={
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Budget vs. Spending by Finance Type</span>
                  </div>
                }
                description="Compare budget and spending across different finance types"
                exportData={financeTypeData}
              >
                <FinanceTypeChart
                  filters={filters}
                  onDataChange={setFinanceTypeData}
                />
              </ExpandableCard>

              {/* Organization Type Chart */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title={
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span>Budget vs. Spending by Organization Type</span>
                  </div>
                }
                description="Analyze budget and spending patterns by organization type (Government, NGO, Multilateral, etc.)"
                exportData={orgTypeData}
              >
                <OrgTypeChart
                  filters={filters}
                  onDataChange={setOrgTypeData}
                />
              </ExpandableCard>

              {/* Sector Analysis Chart */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title={
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    <span>Sector Analysis</span>
                  </div>
                }
                description="Analyze activity distribution across different sectors with percentage allocations"
                exportData={sectorAnalysisData}
              >
                <SectorAnalysisChart
                  filters={filters}
                  onDataChange={setSectorAnalysisData}
                />
              </ExpandableCard>

              {/* Trends Section */}
              {/* Commitments vs Disbursements Chart */}
              <ExpandableCard
                className="bg-white border-slate-200 lg:col-span-2"
                title="Commitments vs Disbursements Over Time"
                description="Track funding commitments and actual disbursements by period"
                exportData={commitmentsData}
              >
                <CommitmentsChart
                  dateRange={dateRange}
                  refreshKey={refreshKey}
                  onDataChange={setCommitmentsData}
                />
              </ExpandableCard>

              {/* Planned vs Actual Disbursements */}
              <PlannedVsActualDisbursements
                dateRange={dateRange}
                refreshKey={refreshKey}
              />

              {/* Cumulative Spending Over Time */}
              <CumulativeSpendingOverTime
                dateRange={dateRange}
                refreshKey={refreshKey}
              />

              {/* Budget vs Actual Chart */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title="Budget vs Actual Spending"
                description="Compare planned budgets with actual expenditures"
                exportData={budgetVsActualData}
              >
                <BudgetVsActualChart
                  dateRange={dateRange}
                  refreshKey={refreshKey}
                  onDataChange={setBudgetVsActualData}
                />
              </ExpandableCard>

              {/* ODA by Flow Type Chart */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title="ODA by Flow Type"
                description="Composition of Official Development Assistance (ODA) flows by type of financial flow"
                exportData={odaByFlowTypeData}
              >
                <ODAByFlowTypeChart
                  dateRange={dateRange}
                  refreshKey={refreshKey}
                  onDataChange={setOdaByFlowTypeData}
                />
              </ExpandableCard>

              {/* Disbursements by Sector Analysis */}
              <DashboardDisbursementsBySection
                dateRange={dateRange}
                refreshKey={refreshKey}
              />

              {/* Funding Source Breakdown */}
              <FundingSourceBreakdown
                dateRange={dateRange}
                refreshKey={refreshKey}
              />

              {/* Top 10 Section */}
              {/* Chart 1: Total Financial Value (Default) */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title="Top 10 Development Partners by Total Disbursements (USD)"
                description="Sum of all commitments and disbursements made by each donor (funding organisation)"
                exportData={top10TotalFinancialData}
              >
                <Top10TotalFinancialValueChart
                  dateRange={dateRange}
                  refreshKey={refreshKey}
                  onDataChange={setTop10TotalFinancialData}
                />
              </ExpandableCard>

              {/* Chart 3: Disbursement-to-Commitment Ratio - Temporarily disabled due to data issue */}
              {/* <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700">
                    Top 10 Partners by Delivery Rate (% of Commitments Disbursed)
                  </CardTitle>
                  <CardDescription>
                    Shows predictability and delivery performance. Higher ratio = donors are delivering what they committed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Top10DisbursementCommitmentRatioChart 
                    dateRange={dateRange}
                    filters={{ 
                      country: selectedCountry !== 'all' ? selectedCountry : undefined, 
                      sector: selectedSector !== 'all' ? selectedSector : undefined 
                    }}
                    refreshKey={refreshKey}
                  />
                </CardContent>
              </Card> */}
                  </div>
                </TabsContent>
              </Tabs>
        </div>
      </div>
    </MainLayout>
  )
} 
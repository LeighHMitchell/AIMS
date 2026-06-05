"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CompactChartCard } from '@/components/ui/compact-chart-card'
import { ChartGrid } from '@/components/ui/chart-grid'
import { BUDGET_COLOR, getTransactionTypeColor } from '@/lib/chart-colors'
import { getFiveYearDateRange } from '@/lib/date-utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, startOfYear, endOfYear } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { AnalyticsDashboardSkeleton } from '@/components/skeletons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

// Chart components
import { CommitmentsChart } from '@/components/analytics/CommitmentsChart'
import { OutlierChart } from '@/components/analytics/OutlierChart'
import { OutlierTable } from '@/components/analytics/OutlierTable'
import { ActivityTimelinessChart } from '@/components/analytics/ActivityTimelinessChart'
import { AllDonorsHorizontalBarChart } from '@/components/analytics/AllDonorsHorizontalBarChart'
import { SectorDistributionChart } from '@/components/analytics/SectorDistributionChart'
import { HumanitarianChart } from '@/components/analytics/HumanitarianChart'
import { HumanitarianShareChart } from '@/components/analytics/HumanitarianShareChart'
import { HumanitarianActivitiesChart } from '@/components/analytics/HumanitarianActivitiesChart'
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
import AidClassificationChart from '@/components/analytics/AidClassificationChart'
import GovernmentContributionChart from '@/components/analytics/GovernmentContributionChart'
import { AllActivitiesFundingSourceBreakdown } from '@/components/analytics/AllActivitiesFundingSourceBreakdown'

// Top 10 charts
import { Top10TotalFinancialValueChart } from '@/components/analytics/Top10TotalFinancialValueChart'
import { Top10ActiveProjectsChart } from '@/components/analytics/Top10ActiveProjectsChart'
import { Top10DisbursementCommitmentRatioChart } from '@/components/analytics/Top10DisbursementCommitmentRatioChart'
import { Top10GovernmentValidatedChart } from '@/components/analytics/Top10GovernmentValidatedChart'
import { Top10SectorFocusedChart } from '@/components/analytics/Top10SectorFocusedChart'
import { TopLikedActivitiesChart } from '@/components/analytics/TopLikedActivitiesChart'
import { TopEngagedActivitiesChart } from '@/components/analytics/TopEngagedActivitiesChart'
import { TopExecutionGapChart } from '@/components/analytics/TopExecutionGapChart'
import { ODAByFlowTypeChart } from '@/components/analytics/ODAByFlowTypeChart'
import { PolicyMarkersTab } from '@/components/analytics/policy-markers/PolicyMarkersTab'

// SDGs Analytics
import { SDGAnalytics } from '@/components/analytics/sdgs/SDGAnalytics'

// Aid on Budget Chart
import { EnhancedAidOnBudgetChart } from '@/components/analytics/EnhancedAidOnBudgetChart'

// Participating Orgs Sankey
import { ParticipatingOrgsSankey } from '@/components/analytics/ParticipatingOrgsSankey'

// Coordination — bundled filter bar + chart so the expanded modal exposes
// calendar / aid type / finance type / partner / sector / measure controls
// (mirrors the External Development Partners Financial Overview).
import { CoordinationChartWithControls } from '@/components/analytics/CoordinationChartWithControls'

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
import { SectorBarChart } from '@/components/analytics/sectors/SectorBarChart'
import { SectorAnalyticsFilters, SectorMetrics, SectorAnalyticsResponse } from '@/types/sector-analytics'

// National Priorities charts (dissolved into per-tab placement)
import { TopDonorAgenciesChart as NPTopDonorAgenciesChart } from '@/components/analytics/national-priorities-dashboard/TopDonorAgenciesChart'
import { TopDonorGroupsChart as NPTopDonorGroupsChart } from '@/components/analytics/national-priorities-dashboard/TopDonorGroupsChart'
import { TopSectorsChart as NPTopSectorsChart } from '@/components/analytics/national-priorities-dashboard/TopSectorsChart'
import { ImplementingAgenciesChart as NPImplementingAgenciesChart } from '@/components/analytics/national-priorities-dashboard/ImplementingAgenciesChart'
import { ExecutingAgenciesChart as NPExecutingAgenciesChart } from '@/components/analytics/national-priorities-dashboard/ExecutingAgenciesChart'
import { AidPredictabilityChart as NPAidPredictabilityChart } from '@/components/analytics/national-priorities-dashboard/AidPredictabilityChart'
import { SubnationalAllocationsChart as NPSubnationalAllocationsChart } from '@/components/analytics/national-priorities-dashboard/SubnationalAllocationsChart'
import { TopCapitalSpendChart as NPTopCapitalSpendChart } from '@/components/analytics/national-priorities-dashboard/TopCapitalSpendChart'
import { CapitalSpendOverTimeChart as NPCapitalSpendOverTimeChart } from '@/components/analytics/national-priorities-dashboard/CapitalSpendOverTimeChart'
import { FundingByModalityChart } from '@/components/analytics/dashboard/FundingByModalityChart'
import { RecipientGovBodiesChart } from '@/components/analytics/dashboard/RecipientGovBodiesChart'
import { ProgramFragmentationChart } from '@/components/analytics/dashboard/ProgramFragmentationChart'
import { SectorFragmentationChart } from '@/components/analytics/dashboard/SectorFragmentationChart'
import { LocationFragmentationChart } from '@/components/analytics/dashboard/LocationFragmentationChart'

// Planned and Actual Disbursement by Sector (new chart)
import { PlannedActualDisbursementBySector } from '@/components/analytics/PlannedActualDisbursementBySector'

// Project & Organisation Counts by Sector
import { ProjectOrgCountsBySector } from '@/components/analytics/ProjectOrgCountsBySector'

// Sector Disbursement Over Time (time series chart)
import { SectorDisbursementOverTime } from '@/components/analytics/SectorDisbursementOverTime'

// Portfolio Spend Trajectory Chart
import { PortfolioSpendTrajectoryChart } from '@/components/charts/PortfolioSpendTrajectoryChart'

// Aid Ecosystem Charts
import { OrganizationalPositioningMap } from '@/components/analytics/OrganizationalPositioningMap'
import { AidEcosystemSolarSystem } from '@/components/analytics/AidEcosystemSolarSystem'

// Financial Totals Bar Chart
import { FinancialTotalsBarChart } from '@/components/analytics/FinancialTotalsBarChart'
import { apiFetch } from '@/lib/api-fetch';

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
  
  // Get initial tab from URL or default to 'overview'
  // Legacy tab values from the old structure are migrated to the new structure.
  const LEGACY_TAB_MAP: Record<string, string> = {
    'portfolio-summary': 'overview',
    'sector-thematic': 'sectors-sdgs',
    'partner-network': 'networks-fragmentation',
    'aid-on-budget': 'government-view',
    'humanitarian': 'trends-performance',
    'aid-ecosystem': 'networks-fragmentation',
    'tree-map': 'overview',
  }
  const rawTab = searchParams.get('tab') || 'overview'
  const tabFromUrl = LEGACY_TAB_MAP[rawTab] || rawTab
  
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
    if (!tabParam) return
    const mapped = LEGACY_TAB_MAP[tabParam] || tabParam
    if (mapped !== activeTab) {
      setActiveTab(mapped)
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
  // Outliers tab — flagged-record exports per metric
  const [outlierTxData, setOutlierTxData] = useState<any[]>([])
  const [outlierActivitySizeData, setOutlierActivitySizeData] = useState<any[]>([])
  const [outlierRatioData, setOutlierRatioData] = useState<any[]>([])
  const [outlierOrgData, setOutlierOrgData] = useState<any[]>([])
  const [outlierSectorData, setOutlierSectorData] = useState<any[]>([])
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
  // Aid-classification + government-contribution breakdowns (export rows feed the
  // card table/CSV/colour-scale toolbar).
  const [flowClassData, setFlowClassData] = useState<any[]>([])
  const [aidClassData, setAidClassData] = useState<any[]>([])
  const [tiedClassData, setTiedClassData] = useState<any[]>([])
  const [collabClassData, setCollabClassData] = useState<any[]>([])
  const [activityTimelinessData, setActivityTimelinessData] = useState<any[]>([])
  const [timelinessData, setTimelinessData] = useState<any[]>([])
  const [govContribData, setGovContribData] = useState<any[]>([])
  const [humanitarianShareData, setHumanitarianShareData] = useState<any[]>([])
  const [topLikedActivitiesData, setTopLikedActivitiesData] = useState<any[]>([])
  const [topViewedActivitiesData, setTopViewedActivitiesData] = useState<any[]>([])
  const [topCommentedActivitiesData, setTopCommentedActivitiesData] = useState<any[]>([])
  const [topBookmarkedActivitiesData, setTopBookmarkedActivitiesData] = useState<any[]>([])
  const [topPartnersActivitiesData, setTopPartnersActivitiesData] = useState<any[]>([])
  const [topExecutionGapData, setTopExecutionGapData] = useState<any[]>([])
  const [fundingSourceData, setFundingSourceData] = useState<any[]>([])
  const [plannedVsActualDisbursementsData, setPlannedVsActualDisbursementsData] = useState<any[]>([])
  const [cumulativeSpendingData, setCumulativeSpendingData] = useState<any[]>([])
  const [disbursementsBySectionData, setDisbursementsBySectionData] = useState<any[]>([])

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
  // Sector Analysis year-range selection (the chart's YearRangeChip). Empty = all years.
  const [sectorAnalyticsYears, setSectorAnalyticsYears] = useState<number[]>([])

  // Coordination state is now owned by CoordinationChartWithControls (the
  // dashboard card embeds it directly, including its own filter bar and
  // data fetching). We mirror the table rows up to the dashboard purely so
  // CompactChartCard can offer its built-in table view + CSV export buttons.
  const [coordinationTableRows, setCoordinationTableRows] = useState<Array<Record<string, string | number>>>([])

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
        apiFetch('/api/analytics/aid-types'),
        apiFetch('/api/analytics/finance-types'),
        apiFetch('/api/analytics/flow-types')
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
      if (sectorAnalyticsYears.length > 0) {
        params.append('startYear', String(Math.min(...sectorAnalyticsYears)))
        params.append('endYear', String(Math.max(...sectorAnalyticsYears)))
      }

      const response = await apiFetch(`/api/analytics/sectors-analytics?${params}`)
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

  // Fetch Sector Analytics when filters or the chart's year range change
  useEffect(() => {
    fetchSectorAnalyticsData()
  }, [sectorAnalyticsFilters, sectorAnalyticsYears, refreshKey])

  // Coordination data is fetched inside CoordinationChartWithControls now,
  // so the dashboard no longer needs its own fetch loop here.

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
      <div className="w-full bg-card">
        {/* Main Dashboard Content */}
        <div className="w-full">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-1">Comprehensive financial and operational analytics across the aid portfolio</p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="bg-destructive/10 border-destructive/30 mb-6">
              <CardContent className="p-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap">
                  {[
                    { value: 'overview', label: 'Overview' },
                    { value: 'aid-flow-map', label: 'Aid Flow Map' },
                    { value: 'trends-performance', label: 'Trends & Performance' },
                    { value: 'sectors-sdgs', label: 'Sectors' },
                    { value: 'policy-markers', label: 'Policy Markers' },
                    { value: 'sdgs', label: 'SDGs' },
                    { value: 'humanitarian-spend', label: 'Humanitarian Spend' },
                    { value: 'capital-spend', label: 'Capital Spend' },
                    { value: 'government-view', label: 'Government View' },
                    { value: 'networks-fragmentation', label: 'Networks' },
                    { value: 'fragmentation', label: 'Fragmentation' },
                    { value: 'operations', label: 'Operations' },
                    { value: 'transaction-calendar', label: 'Transaction Calendar' },
                    { value: 'rankings', label: 'Rankings' },
                    { value: 'outliers', label: 'Outliers' },
                  ].map((t) => (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      className="data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* ==================== OVERVIEW TAB ==================== */}
                {/* Audience: general public, journalists. Answers: how much aid? from whom? where? */}
                <TabsContent value="overview">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Headline Figures</h2>
                      <p className="text-muted-foreground mb-4">How much aid is coming in, who's funding it, and where it's going</p>

                      <div className="mb-6">
                        <CompactChartCard
                          title="Financial Totals"
                          shortDescription="Total budgets, planned disbursements, and transaction types"
                          fullDescription="Compare total budgets and planned disbursements with actual transaction totals by type"
                          mathTooltip="Sums all actual transactions (Commitments, Disbursements, Expenditures, etc.) by reporting year, alongside published activity budgets and planned disbursements. Multi-year budgets and planned disbursements that span the boundary are split proportionally by overlap days. All values use USD-converted amounts where available."
                          className="w-full"
                          compactHeight={300}
                        >
                          <FinancialTotalsBarChart
                            dateRange={fiveYearRange}
                            refreshKey={refreshKey}
                          />
                        </CompactChartCard>
                      </div>

                      <CompactChartCard
                        title="External Development Partners Financial Overview"
                        shortDescription="External development partners ranked by the selected metric — defaults to actual disbursements"
                        fullDescription="Ranks external development partners by the metric(s) selected — Total Budgets, Total Planned Disbursements, or any of the 13 IATI transaction types (defaults to actual disbursements). Excludes Myanmar government entities (recipient country) so domestic budget transfers and pass-through reporting do not appear as donor flows."
                        mathTooltip="Aggregates totals per partner from the chosen view (budgets, planned disbursements, commitments, or actual disbursements), credited to the provider organisation on each transaction. Period-spanning budgets and planned disbursements are allocated proportionally by overlap days within the selected year window. Organisations whose country is Myanmar are excluded from this chart so recipient-government ministries (e.g. MOALI) don't appear as funders."
                        className="w-full"
                        compactHeight={300}
                      >
                        <AllDonorsHorizontalBarChart
                          dateRange={fiveYearRange}
                          refreshKey={refreshKey}
                          onDataChange={setDonorsData}
                        />
                      </CompactChartCard>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Top Partners & Sectors</h2>
                      <p className="text-muted-foreground mb-4">Which partners contribute the most, and which sectors absorb the bulk of the funding</p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CompactChartCard
                          className="w-full"
                          title="Top Development Partners by Commitments and Disbursements"
                          shortDescription="External development partners ranked by commitments & disbursements"
                          fullDescription="Sum of outgoing commitments and disbursements made by each external development partner. Excludes Myanmar government entities (recipient country) so domestic budget transfers and pass-through reporting do not appear as donor flows."
                          mathTooltip="Sums USD-converted outgoing commitments (transaction type 2) and disbursements (type 3) per provider organisation, then ranks the top 10. Internal pooled-fund transfers are excluded so providers aren't credited for shuffling money between their own accounts. Organisations whose country is Myanmar are excluded so recipient-government ministries (e.g. MOALI, MoHS, MoE) don't appear as funders. Remaining partners beyond the top 10 are aggregated into an 'All Others' bucket. If fewer than 10 partners have transactions in the selected period, only the available rows are shown."
                          exportData={top10TotalFinancialData}
                          compactHeight={300}
                          inlineToolbar
                        >
                          <Top10TotalFinancialValueChart
                            dateRange={dateRange}
                            refreshKey={refreshKey}
                            onDataChange={setTop10TotalFinancialData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          className="w-full"
                          title="Aid Distribution by Sector"
                          shortDescription="Breakdown of funding across sectors"
                          fullDescription="Breakdown of funding across sectors"
                          mathTooltip="Sums actual disbursements (type 3) per activity, allocating each activity's total across its declared sectors using the sector percentage on the activity. View the breakdown by Sector Category (DAC group), Sector (3-digit category), or Sub-Sector (5-digit code). Pie shows the top 10 plus an Others bucket; bar, sunburst, and sankey views show every sector at the chosen level."
                          exportData={sectorPieData}
                          compactHeight={300}
                          inlineToolbar
                        >
                          <SectorDistributionChart
                            dateRange={dateRange}
                            refreshKey={refreshKey}
                            onDataChange={setSectorPieData}
                          />
                        </CompactChartCard>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <CompactChartCard
                        title="Aid Distribution by Sector"
                        shortDescription="Each sector as a bubble, partners shown as smaller circles inside, sized by the selected measure"
                        fullDescription="Each sector is a bubble, with funding partners shown as smaller circles inside. Use the filter bar to switch the bubble-size measure (e.g. Disbursements, Budgets, # Activities), narrow by aid type, finance type, partner, or sector, and pick the hierarchy depth (Sector Category / Sector / Sub-Sector)."
                        mathTooltip="Aggregates the chosen measure per sector at the chosen hierarchy level. For financial measures only the funding-role organisation on each activity is credited (so an implementing partner doesn't dilute the funder's commitment); inner bubbles represent attributed funder value. For count measures every participating org is shown, sized by the number of activities they touch in that sector."
                        className="w-full"
                        compactHeight={300}
                        exportData={coordinationTableRows}
                        exportFilename="aid-distribution-by-sector"
                        inlineToolbar
                      >
                        <CoordinationChartWithControls
                          width={400}
                          height={250}
                          onDataChange={setCoordinationTableRows}
                        />
                      </CompactChartCard>

                      <CompactChartCard
                        title="Sector Disbursements Over Time"
                        shortDescription="Track sector disbursement patterns and trends over time"
                        fullDescription="Time series analysis of sector disbursements over time"
                        mathTooltip="Sums actual disbursements per period and DAC sector. Activities tagged with multiple sectors are split using the declared sector percentage. Sectors are grouped at the chosen DAC level (3-digit category or 5-digit code) and amounts are USD-converted."
                        className="w-full"
                        compactHeight={300}
                      >
                        <SectorDisbursementOverTime
                          dateRange={fiveYearRange}
                          refreshKey={refreshKey}
                        />
                      </CompactChartCard>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Top Development Partner Agencies & Groups</h2>
                      <p className="text-muted-foreground mb-4">Technical development partner breakdowns by agency and group</p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CompactChartCard
                          title="Funding by Development Partner"
                          shortDescription="Top 5 development partners by contribution"
                          fullDescription="Top 5 individual development partner organisations by financial contribution, with remaining development partners aggregated."
                          mathTooltip="Sums USD value of the selected metric (commitments or disbursements) per individual provider organisation. Top 5 partners are shown individually; the rest are rolled into 'Others'."
                          compactHeight={300}
                        >
                          <NPTopDonorAgenciesChart />
                        </CompactChartCard>
                        <CompactChartCard
                          title="Top Development Partner Groups"
                          shortDescription="Top 5 development partners grouped by country or multilateral institution"
                          fullDescription="Top 5 development partner groups by financial contribution, grouped by country of origin or multilateral institution."
                          mathTooltip="Sums USD value of the selected metric per partner group, where individual provider agencies are rolled up to their parent country (e.g. all US bilateral agencies) or multilateral institution (e.g. UN agencies → UN). Top 5 groups are shown; the rest are aggregated into 'Others'."
                          compactHeight={300}
                        >
                          <NPTopDonorGroupsChart />
                        </CompactChartCard>
                      </div>
                    </div>

                  </div>
                </TabsContent>

                {/* ==================== AID FLOW MAP TAB ==================== */}
                {/* Audience: general users. Answers: how does funding flow from partners to recipients? */}
                <TabsContent value="aid-flow-map">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Aid Flow Map</h2>
                      <p className="text-muted-foreground mb-4">How funding flows from external development partners through to implementing organisations and recipients</p>
                      <CompactChartCard
                        title="Aid Flow Map"
                        shortDescription="How funding flows from development partners to recipients"
                        fullDescription="Sankey view of how funding flows from external development partners through to implementing organisations and recipients"
                        mathTooltip="Aggregates USD-converted disbursements and commitments along provider → receiver organisation links, then draws a flow diagram whose ribbon widths are proportional to the total value moving along each link."
                        className="w-full"
                        compactHeight={760}
                        hideViewToggle
                      >
                        <AidFlowMap height={760} />
                      </CompactChartCard>
                    </div>
                  </div>
                </TabsContent>

                {/* ==================== TRENDS & PERFORMANCE TAB ==================== */}
                {/* Audience: managers, analysts. Answers: how is it changing? are donors delivering? */}
                <TabsContent value="trends-performance">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Trends Over Time</h2>
                      <p className="text-muted-foreground mb-4">How budgets, commitments, and disbursements are evolving</p>
                      <ChartGrid>
                        <CompactChartCard
                          title="Cumulative Financial Overview"
                          shortDescription="Total commitments, disbursements & budgets accumulated over time"
                          fullDescription="Cumulative view of all transaction types, planned disbursements, and budgets over time"
                          mathTooltip="Computes a running total per series: each year's bar adds that year's commitments, disbursements, expenditures, budgets, and planned disbursements to the prior cumulative total. Multi-period budgets and planned disbursements are split proportionally across years before being added to the running sum. All amounts in USD."
                          compactHeight={300}
                        >
                          <CumulativeFinancialOverview
                            dateRange={fiveYearRange}
                            refreshKey={refreshKey}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Portfolio Spend Trajectory"
                          shortDescription="Track actual spend against an even-spend budget baseline"
                          fullDescription="Compare actual cumulative disbursements against an even-spend budget baseline across all activities with reported budgets"
                          mathTooltip="For every activity with a reported budget, builds an 'even-spend' baseline by spreading the total budget evenly across the activity's planned duration, then sums those baselines into a portfolio curve. The actual curve sums real cumulative disbursements over the same horizon. Gap between the two lines shows pace of execution against plan."
                          compactHeight={300}
                        >
                          <PortfolioSpendTrajectoryChart refreshKey={refreshKey} />
                        </CompactChartCard>
                      </ChartGrid>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Aid Classification</h2>
                      <p className="text-muted-foreground mb-4">How aid breaks down by flow type, aid modality and tied status — disbursements (USD), with a "Not reported" slice for un-classified value</p>
                      <ChartGrid>
                        <CompactChartCard
                          title="Flow Type (ODA vs OOF)"
                          shortDescription="Disbursements by IATI flow type"
                          fullDescription="Distribution of disbursements across IATI flow types (ODA, OOF, private flows, etc.). Each transaction inherits its flow type from the transaction-level value or the activity default."
                          mathTooltip="Sums USD disbursements (transaction type 3) on published, non-deleted activities, grouped by flow type. Flow type is taken from the transaction, falling back to the activity's default_flow_type; transactions with neither fall into 'Not reported'. Internal/pooled-fund transfers are excluded."
                          exportData={flowClassData}
                          inlineToolbar
                          compactHeight={300}
                        >
                          <AidClassificationChart dimension="flow" refreshKey={refreshKey} onDataChange={setFlowClassData} />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Aid Type"
                          shortDescription="Disbursements by aid modality"
                          fullDescription="Distribution of disbursements across IATI aid types (budget support, project-type interventions, technical assistance, etc.)."
                          mathTooltip="Sums USD disbursements (transaction type 3) on published, non-deleted activities, grouped by aid type. Aid type is taken from the transaction, falling back to the activity's default_aid_type; transactions with neither fall into 'Not reported'. Internal/pooled-fund transfers are excluded."
                          exportData={aidClassData}
                          inlineToolbar
                          compactHeight={300}
                        >
                          <AidClassificationChart dimension="aid" refreshKey={refreshKey} onDataChange={setAidClassData} />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Tied Aid Status"
                          shortDescription="Untied vs partially-tied vs tied disbursements"
                          fullDescription="Share of disbursements that are untied, partially tied or tied — a core aid-effectiveness (GPEDC/Paris) indicator. Untied aid lets the recipient procure freely; tied aid restricts procurement to the donor country."
                          mathTooltip="Sums USD disbursements (transaction type 3) on published, non-deleted activities, grouped by tied status (5 Untied / 3 Partially tied / 4 Tied). Status is taken from the transaction, falling back to the activity's default_tied_status; transactions with neither fall into 'Not reported'. Internal/pooled-fund transfers are excluded."
                          exportData={tiedClassData}
                          inlineToolbar
                          compactHeight={300}
                        >
                          <AidClassificationChart dimension="tied" refreshKey={refreshKey} onDataChange={setTiedClassData} />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Collaboration Type"
                          shortDescription="Bilateral vs multilateral disbursements"
                          fullDescription="Share of disbursements delivered through bilateral versus multilateral channels (and other IATI collaboration types) — how aid is routed between partners. Bilateral is donor-to-recipient directly; multilateral is pooled through institutions like the UN or World Bank."
                          mathTooltip="Sums USD disbursements (transaction type 3) on published, non-deleted activities, grouped by the activity's IATI collaboration type (1 Bilateral, 2/3 Multilateral, etc.). Collaboration type is an activity-level field, so every disbursement inherits its activity's value; activities with none fall into 'Not reported'. Internal/pooled-fund transfers are excluded."
                          exportData={collabClassData}
                          inlineToolbar
                          compactHeight={300}
                        >
                          <AidClassificationChart dimension="collaboration" refreshKey={refreshKey} onDataChange={setCollabClassData} />
                        </CompactChartCard>
                      </ChartGrid>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Performance & Predictability</h2>
                      <p className="text-muted-foreground mb-4">Are development partners delivering what they promised? How predictable is aid?</p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CompactChartCard
                          className="bg-card border-border lg:col-span-2"
                          title="Commitments vs Disbursements Over Time"
                          shortDescription="Track funding commitments and actual disbursements by period"
                          fullDescription="Track funding commitments and actual disbursements by period"
                          mathTooltip="For each period (year or quarter), sums actual commitments (transaction type 2) and actual disbursements (type 3) separately, then plots both series side-by-side. Amounts are USD-converted using the transaction-date exchange rate."
                          exportData={commitmentsData}
                          tableColorMap={{ commitments: getTransactionTypeColor('2'), disbursements: getTransactionTypeColor('3') }}
                          inlineToolbar
                          compactHeight={300}
                        >
                          <CommitmentsChart
                            dateRange={dateRange}
                            refreshKey={refreshKey}
                            onDataChange={setCommitmentsData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          className="bg-card border-border"
                          title="Cumulative Spending Over Time"
                          shortDescription="Track accumulated spending progression across all activities"
                          fullDescription="Track accumulated spending progression across all activities"
                          mathTooltip="Running cumulative total per selected metric. Each transaction is added on its transaction date (budgets and planned disbursements on their period start date), and each line is the USD-normalised running sum up to that point. Default metrics are actual Disbursements + Expenditures."
                          compactHeight={300}
                        >
                          <CumulativeSpendingOverTime
                            dateRange={dateRange}
                            refreshKey={refreshKey}
                            onDataChange={setCumulativeSpendingData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          className="bg-card border-border"
                          title="Budget vs Actual Spending"
                          shortDescription="Compare planned budgets with actual expenditures"
                          fullDescription="Compare planned budgets with actual expenditures"
                          mathTooltip="For each period, compares the published budget total against actual disbursements + expenditures. Multi-period budgets are split proportionally so the period totals reconcile across calendar/financial year views. Variance is shown as the absolute and percentage difference between actual and budgeted."
                          exportData={budgetVsActualData}
                          tableColorMap={{ budget: BUDGET_COLOR, disbursed: getTransactionTypeColor('3'), expenditure: getTransactionTypeColor('4') }}
                          inlineToolbar
                          compactHeight={300}
                        >
                          <BudgetVsActualChart
                            dateRange={dateRange}
                            refreshKey={refreshKey}
                            onDataChange={setBudgetVsActualData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Aid Predictability"
                          shortDescription="Planned vs actual disbursements by year"
                          fullDescription="Comparing planned disbursements against actual disbursements by year"
                          mathTooltip="For each year, sums planned disbursements (forecast values from activity reporters) and actual disbursements (transaction type 3). Predictability is the ratio of actual to planned: closer to 100% means partners delivered what they promised."
                          compactHeight={300}
                        >
                          <NPAidPredictabilityChart />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Disbursement Timeliness by Partner"
                          shortDescription="Share of each partner's planned disbursements delivered by their planned date"
                          fullDescription="For each funding partner, the share of its planned disbursement tranches that were actually delivered on or before the date they were planned for — did the money arrive when the partner said it would? Bars are coloured darker the more on-time the partner; hover for average lateness."
                          mathTooltip="Each activity's planned disbursement schedule (planned_disbursements: a USD target due by a period-end date) is compared with its actual disbursement stream (transaction type 3). For each planned tranche, the cumulative planned target at its due date is matched against the earliest point the activity's cumulative actual disbursements reached it — the fulfilment date. On time = fulfilled on or before the planned due date; average delay averages the late tranches' lateness in days. Only past-due tranches are judged; internal/pooled-fund transfers excluded. Partners need ≥3 judged tranches; top 10 by on-time share."
                          exportData={timelinessData}
                          exportFilename="disbursement-timeliness"
                          compactHeight={300}
                        >
                          <TimelinessChart
                            dateRange={fiveYearRange}
                            refreshKey={refreshKey}
                            onDataChange={setTimelinessData}
                          />
                        </CompactChartCard>
                      </div>
                    </div>

                  </div>
                </TabsContent>

                {/* ==================== SECTORS & SDGs TAB ==================== */}
                {/* Audience: sector specialists, line ministries. Answers: what's funded in my sector? */}
                <TabsContent value="sectors-sdgs">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Sector Analysis</h2>
                      <p className="text-muted-foreground mb-4">Financial flows and coordination across development sectors</p>

                      <ChartGrid>
                        <CompactChartCard
                          title="Sector Analysis"
                          shortDescription="Disbursement values and activity counts per sector"
                          fullDescription="Financial flows and project distribution across sectors"
                          mathTooltip="For each DAC sector (grouped at the chosen level), sums USD disbursements and counts distinct activities. Multi-sector activities contribute to each of their sectors weighted by the declared sector percentage."
                          compactHeight={300}
                        >
                          {sectorAnalyticsLoading ? (
                            <Skeleton className="h-full w-full" />
                          ) : (
                            <SectorBarChart
                              data={sectorAnalyticsData}
                              filters={sectorAnalyticsFilters}
                              selectedYears={sectorAnalyticsYears}
                              onYearsChange={setSectorAnalyticsYears}
                            />
                          )}
                        </CompactChartCard>

                        <CompactChartCard
                          title="Financial Summary by Sector"
                          shortDescription="Budgets, commitments, and disbursements by sector"
                          fullDescription="Compare budgets, planned disbursements, commitments, and actual disbursements across sectors"
                          mathTooltip="Sums budgets, planned disbursements, commitments, and actual disbursements per sector. Each value is allocated to sectors using the activity's declared sector percentages, then aggregated to the chosen DAC level. All amounts are USD-converted."
                          compactHeight={300}
                        >
                          <PlannedActualDisbursementBySector
                            dateRange={fiveYearRange}
                            refreshKey={refreshKey}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Projects & Organisations by Sector"
                          shortDescription="Count of projects and organisations across all sectors"
                          fullDescription="Number of projects and participating organisations by sector"
                          mathTooltip="For each sector, counts distinct activities and the distinct organisations that participate in them (any role). An activity tagged with multiple sectors counts once in each. Sectors are grouped at the chosen DAC level."
                          compactHeight={300}
                        >
                          <ProjectOrgCountsBySector
                            dateRange={fiveYearRange}
                            refreshKey={refreshKey}
                          />
                        </CompactChartCard>

                      </ChartGrid>
                    </div>
                  </div>
                </TabsContent>

                {/* ==================== POLICY MARKERS TAB ==================== */}
                {/* Audience: policy teams, line ministries. Answers: how is each policy objective represented across the portfolio? */}
                <TabsContent value="policy-markers">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Policy Markers</h2>
                      <p className="text-muted-foreground mb-4">How OECD/DAC policy markers (gender equality, environment, climate, etc.) are represented across the portfolio, by significance level and over time. Policy markers reflect policy intent, not financial allocation.</p>
                      <PolicyMarkersTab refreshKey={refreshKey} />
                    </div>
                  </div>
                </TabsContent>

                {/* ==================== SDGs TAB ==================== */}
                {/* Audience: SDG analysts, policy teams. Answers: how do activities align with the SDGs? */}
                <TabsContent value="sdgs">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Sustainable Development Goals</h2>
                      <p className="text-muted-foreground mb-4">Activity alignment with the UN Sustainable Development Goals</p>
                      <SDGAnalytics
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                        refreshKey={refreshKey}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* ==================== HUMANITARIAN SPEND TAB ==================== */}
                {/* Audience: humanitarian analysts, donors. Answers: how much is humanitarian vs development? */}
                <TabsContent value="humanitarian-spend">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Humanitarian Aid</h2>
                      <p className="text-muted-foreground mb-4">Analysis of humanitarian aid flows and their share of total assistance</p>
                      <ChartGrid>
                        <CompactChartCard
                          title="Share of Humanitarian Aid"
                          shortDescription="Humanitarian portion as percentage of total international aid"
                          fullDescription="Share of humanitarian aid compared to total international aid"
                          mathTooltip="Sums USD value of all actual transactions (commitments, disbursements, expenditures) and splits them into humanitarian vs development. A transaction is humanitarian if it has the IATI humanitarian flag, an emergency aid type (01/02/03), or humanitarian/emergency keywords in its description. Share is humanitarian total divided by overall total."
                          compactHeight={300}
                        >
                          <HumanitarianShareChart
                            dateRange={fiveYearRange}
                            refreshKey={refreshKey}
                            onDataChange={(d: any) => setHumanitarianShareData([d])}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Humanitarian vs Development Aid"
                          shortDescription="Year-over-year comparison of humanitarian and development flows"
                          fullDescription="Historical comparison of humanitarian and development aid flows over time"
                          mathTooltip="For each year, sums USD-value transactions classified as humanitarian (via IATI humanitarian flag, emergency aid type, or humanitarian keywords) separately from development flows. Lets you see the relative scale and trend of each over time."
                          compactHeight={300}
                        >
                          <HumanitarianChart
                            dateRange={fiveYearRange}
                            refreshKey={refreshKey}
                            onDataChange={setHumanitarianData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Activities with Humanitarian Components"
                          shortDescription="Per-activity financials, split into humanitarian vs development"
                          fullDescription="Every activity that has a humanitarian component, shown as a horizontal bar. View selected financial metrics (budgets, planned disbursements, transaction types) — stacked or grouped — or switch to the humanitarian-vs-development split of actual spend."
                          mathTooltip="Lists published activities flagged humanitarian (IATI humanitarian flag, emergency aid type 01/02/03, or any humanitarian-flagged transaction). 'By metric' sums the chosen metrics per activity over the selected window (budgets/PDs pro-rated by period overlap). 'Humanitarian split' divides actual spend (disbursements + expenditures) into humanitarian vs development by the transaction-level humanitarian flag."
                          compactHeight={300}
                          inlineToolbar
                        >
                          <HumanitarianActivitiesChart
                            dateRange={fiveYearRange}
                            refreshKey={refreshKey}
                          />
                        </CompactChartCard>
                      </ChartGrid>
                    </div>
                  </div>
                </TabsContent>

                {/* ==================== CAPITAL SPEND TAB ==================== */}
                {/* Audience: planners, finance leads. Answers: where is capital investment concentrated? */}
                <TabsContent value="capital-spend">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Capital Spend & Top Sectors</h2>
                      <p className="text-muted-foreground mb-4">Where capital investment is concentrated</p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CompactChartCard
                          title="Top Activities by Capital Spend"
                          shortDescription="Ranked by capital spend value"
                          fullDescription="Activities ranked by capital spend value, with selectable metric and time range."
                          mathTooltip="For each activity, multiplies the chosen financial metric (commitments or disbursements) by the reported capital-spend percentage to estimate the capital portion. Activities are ranked descending and the top N are displayed."
                          compactHeight={300}
                        >
                          <NPTopCapitalSpendChart />
                        </CompactChartCard>
                          <CompactChartCard
                            title="Capital vs Non-Capital Spend"
                            shortDescription="Yearly breakdown of spending types"
                            fullDescription="Capital vs non-capital spend over time, with stacked or grouped views."
                            mathTooltip="For each year, splits each transaction by the activity's capital-spend percentage: capital portion = value × capital%, non-capital portion is the remainder. Series are then summed across all activities and shown by year."
                            compactHeight={300}
                          >
                            <NPCapitalSpendOverTimeChart />
                          </CompactChartCard>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ==================== GOVERNMENT VIEW TAB ==================== */}
                {/* Audience: MoF, planning, government users. Answers: how much aid is on/off budget? where in govt? */}
                <TabsContent value="government-view">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Aid on Budget</h2>
                      <p className="text-muted-foreground mb-4">Compare domestic government spending with on-budget and off-budget aid by fiscal year</p>
                      <CompactChartCard
                        title="Aid on Budget"
                        shortDescription="Domestic spending vs on-budget and off-budget aid by fiscal year"
                        fullDescription="Compare domestic government spending with on-budget and off-budget aid by fiscal year"
                        mathTooltip="Classifies aid by whether it flows through government budget systems (on-budget) or outside them (off-budget), shown against domestic expenditure and grouped by the selected classification framework (functional/COFOG, line ministry, economic, programme). Sums USD amounts per category and fiscal year."
                        className="w-full"
                        compactHeight={460}
                      >
                        <EnhancedAidOnBudgetChart refreshKey={refreshKey} />
                      </CompactChartCard>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Government Contribution</h2>
                      <p className="text-muted-foreground mb-4">Recipient-government counterpart financing (RGC) vs external development-partner disbursements — cumulative, USD</p>
                      <ChartGrid>
                        <CompactChartCard
                          title="Government vs External Financing"
                          shortDescription="Government counterpart contribution vs external disbursements"
                          fullDescription="Compares recipient-government counterpart contributions — cash (financial) and in-kind/other (staff, facilities, tax exemptions) — against external development-partner disbursements, cumulatively to date."
                          mathTooltip="External = USD disbursements (transaction type 3) on published activities, internal transfers excluded. Government financial = sum of RGC financial counterpart contributions (lump-sum or annual rows). Government in-kind/other = estimated USD value of in-kind and other contributions. Government figures are cumulative (no date window) as they lack a reliable per-period split."
                          exportData={govContribData}
                          inlineToolbar
                          compactHeight={300}
                        >
                          <GovernmentContributionChart refreshKey={refreshKey} onDataChange={setGovContribData} />
                        </CompactChartCard>
                      </ChartGrid>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Where Aid Lands in Government</h2>
                      <p className="text-muted-foreground mb-4">Recipient bodies, executing/implementing agencies, and subnational allocations</p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CompactChartCard
                          title="Recipient Government Bodies"
                          shortDescription="Government bodies receiving funds"
                          fullDescription="Government bodies receiving development funding, by selected metric."
                          mathTooltip="Sums the selected metric (commitments or disbursements, USD) per recipient government body, taken from each activity's reported recipient organisation. Bodies are ranked descending; values reflect the share of activity totals attributed to that body."
                          compactHeight={300}
                        >
                          <RecipientGovBodiesChart refreshKey={refreshKey} />
                        </CompactChartCard>
                        <CompactChartCard
                          title="Subnational Allocations"
                          shortDescription="States and regions by financial allocation"
                          fullDescription="Myanmar States and Regions by selected metric, with bar/pie views and an allocation details table."
                          mathTooltip="For each state/region, sums the selected metric (commitments or disbursements) from activities operating there. Activities covering multiple regions are split using the declared subnational percentage allocation."
                          compactHeight={300}
                        >
                          <NPSubnationalAllocationsChart />
                        </CompactChartCard>
                        <CompactChartCard
                          title="Executing Agencies"
                          shortDescription="Organisations managing budgets on behalf of funders"
                          fullDescription="Top organisations managing budgets on behalf of funders by commitments or disbursements."
                          mathTooltip="Sums the selected USD metric (commitments or disbursements) per organisation listed in the Extending/Accountable participating-org role across activities. Organisations are ranked descending and the top N are shown."
                          compactHeight={300}
                        >
                          <NPExecutingAgenciesChart />
                        </CompactChartCard>
                        <CompactChartCard
                          title="Implementing Agencies"
                          shortDescription="Organisations with implementing role"
                          fullDescription="Top organisations responsible for the physical delivery of assistance on the ground."
                          mathTooltip="Sums the selected USD metric (commitments or disbursements) per organisation listed in the Implementing participating-org role across activities. Organisations are ranked descending and the top N are shown."
                          compactHeight={300}
                        >
                          <NPImplementingAgenciesChart />
                        </CompactChartCard>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Modality, Flows & Funding Sources</h2>
                      <p className="text-muted-foreground mb-4">How aid is delivered — by modality, finance type, and flow type</p>
                      <ChartGrid>
                        <CompactChartCard
                          title="Financial Flows by Finance Type"
                          shortDescription="Distribution of grants, loans & other finance types by flow category"
                          fullDescription="Visualize financial flows by finance types across different flow types over time"
                          mathTooltip="Sums USD transaction values per year, finance type (grant, loan, equity, etc.), and flow type (ODA, OOF, private, etc.). Each transaction inherits the finance and flow type from its activity (or the transaction-level override) and is grouped accordingly."
                          compactHeight={300}
                        >
                          <FinanceTypeFlowChart
                            dateRange={fiveYearRange}
                            refreshKey={refreshKey}
                            onDataChange={setFinanceTypeFlowData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Funding Source Breakdown"
                          shortDescription="Sankey diagram showing provider-to-receiver disbursement flows"
                          fullDescription="Distribution of funding by development partner/provider across all activities"
                          mathTooltip="Sums USD disbursements per provider→receiver pair across all activities and renders them as Sankey flows. Width of each ribbon is proportional to the total dollars moved between that provider and receiver."
                          compactHeight={300}
                        >
                          <AllActivitiesFundingSourceBreakdown
                            dateRange={fiveYearRange}
                            refreshKey={refreshKey}
                          />
                        </CompactChartCard>
                      </ChartGrid>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 items-start">
                        <CompactChartCard
                          title="Funding Over Time"
                          shortDescription="Funding by aid modality type over time"
                          fullDescription="Funding over time broken down by aid modality (grant, loan, technical assistance, etc.)"
                          mathTooltip="Sums USD transaction values (commitments or disbursements) per period and aid modality (grant, loan, technical assistance, reimbursable grant, investment/guarantee). Each transaction's modality comes from its activity's reported finance type."
                          className="w-full"
                          compactHeight={320}
                        >
                          <FundingByModalityChart />
                        </CompactChartCard>

                        <CompactChartCard
                          className="bg-card border-border"
                          title="ODA by Flow Type"
                          shortDescription="Composition of Official Development Assistance (ODA) flows by type of financial flow"
                          fullDescription="Composition of Official Development Assistance (ODA) flows by type of financial flow"
                          mathTooltip="Sums USD transaction values per IATI flow type (ODA grant, ODA loan, OOF, private, etc.). Limited to actual transactions; each transaction's flow type is inherited from its activity or the transaction-level override."
                          exportData={odaByFlowTypeData}
                          inlineToolbar
                          compactHeight={300}
                        >
                          <ODAByFlowTypeChart
                            dateRange={dateRange}
                            refreshKey={refreshKey}
                            onDataChange={setOdaByFlowTypeData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Funding Source Breakdown"
                          shortDescription="Distribution of funding by development partner/provider"
                          fullDescription="Distribution of funding by development partner/provider across all activities"
                          mathTooltip="Sums USD per funding-source organisation for the metrics you pick. Transactions and planned disbursements use their reported provider org; budgets (which have no provider) are attributed to the activity's reporting org. Sources beyond the top seven are grouped as 'Others'."
                          className="w-full"
                          compactHeight={360}
                        >
                          <FundingSourceBreakdown
                            dateRange={dateRange}
                            refreshKey={refreshKey}
                            onDataChange={setFundingSourceData}
                          />
                        </CompactChartCard>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Budget vs Spending — Detailed Cuts</h2>
                      <p className="text-muted-foreground mb-4">Compare budget allocations with actual spending across categories</p>
                      {/* items-start: cards size to their own content so a tall card
                          (e.g. an error/no-data state) doesn't stretch its row-mates
                          and leave empty space below their charts. */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <CompactChartCard
                          className="bg-card border-border lg:col-span-2"
                          title="Budget vs. Spending Over Time"
                          shortDescription="Compare total budget allocations with actual spending (disbursements + expenditures) over time"
                          fullDescription="Compare total budget allocations with actual spending (disbursements + expenditures) over time"
                          mathTooltip="For each period, sums published activity budgets and actual spending (disbursements + expenditures, transaction types 3+4). Multi-year budgets are split proportionally across periods so totals reconcile. Variance shows how much spending lagged or exceeded budget."
                          exportData={budgetVsSpendingData}
                          inlineToolbar
                          compactHeight={300}
                        >
                          <BudgetVsSpendingChart
                            filters={filters}
                            onDataChange={setBudgetVsSpendingData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          className="bg-card border-border"
                          title="Budget vs. Spending by Reporting Organisation"
                          shortDescription="Compare budget and spending across different reporting organisations"
                          fullDescription="Compare budget and spending across different reporting organisations"
                          mathTooltip="For each reporting organisation (the publisher of the IATI activity), sums the activity's budgets and actual spending (disbursements + expenditures) in USD. Lets you compare which publishers have the largest gap between planned and actual."
                          compactHeight={300}
                        >
                          <ReportingOrgChart
                            filters={filters}
                            onDataChange={setReportingOrgData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          className="bg-card border-border"
                          title="Budget vs. Spending by Aid Type"
                          shortDescription="Analyze budget and spending patterns across different aid types"
                          fullDescription="Analyze budget and spending patterns across different aid types"
                          mathTooltip="Groups budgets and actual spending (disbursements + expenditures) by IATI aid type (project-type, budget support, technical assistance, etc.). Each transaction's aid type comes from the activity default or transaction-level override; values are USD-converted."
                          exportData={aidTypeData}
                          inlineToolbar
                          compactHeight={300}
                        >
                          <AidTypeChart
                            filters={filters}
                            onDataChange={setAidTypeData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          className="bg-card border-border"
                          title="Budget vs. Spending by Finance Type"
                          shortDescription="Compare budget and spending across different finance types"
                          fullDescription="Compare budget and spending across different finance types"
                          mathTooltip="Groups budgets and actual spending (disbursements + expenditures) by IATI finance type (grant, loan, equity, debt relief, etc.). Each transaction's finance type comes from the activity default or transaction-level override; values are USD-converted."
                          exportData={financeTypeData}
                          inlineToolbar
                          compactHeight={300}
                        >
                          <FinanceTypeChart
                            filters={filters}
                            onDataChange={setFinanceTypeData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          className="bg-card border-border"
                          title="Budget vs. Spending by Organisation Type"
                          shortDescription="Analyze budget and spending patterns by organisation type (Government, NGO, Multilateral, etc.)"
                          fullDescription="Analyze budget and spending patterns by organisation type (Government, NGO, Multilateral, etc.)"
                          mathTooltip="Groups budgets and actual spending by the IATI organisation type of the providing organisation (Government, NGO, Multilateral, Foundation, etc.). All values are USD-converted and aggregated per type."
                          exportData={orgTypeData}
                          inlineToolbar
                          compactHeight={300}
                        >
                          <OrgTypeChart
                            filters={filters}
                            onDataChange={setOrgTypeData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          className="bg-card border-border"
                          title="Sector Analysis"
                          shortDescription="Analyze activity distribution across different sectors with percentage allocations"
                          fullDescription="Analyze activity distribution across different sectors with percentage allocations"
                          mathTooltip="For each DAC sector, counts distinct activities and sums the activity-level financial totals weighted by the declared sector percentage. Top N sectors are shown; the remainder is grouped into 'Others'."
                          exportData={sectorAnalysisData}
                          inlineToolbar
                          compactHeight={300}
                        >
                          <SectorAnalysisChart
                            filters={filters}
                            onDataChange={setSectorAnalysisData}
                          />
                        </CompactChartCard>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ==================== NETWORKS & FRAGMENTATION TAB ==================== */}
                {/* Audience: technical / research. Answers: how concentrated or fragmented is aid? who works with whom? */}
                <TabsContent value="networks-fragmentation">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Aid Networks</h2>
                      <p className="text-muted-foreground mb-4">Relationships and roles between organisations across the aid system</p>
                      <div className="space-y-6">
                        <div>
                          <ParticipatingOrgsSankey refreshKey={refreshKey} />
                        </div>

                        <ChartGrid>
                          <CompactChartCard
                            title="Organisational Positioning Map"
                            shortDescription="Organisations positioned by humanitarian/development focus and funder/implementer role"
                            mathTooltip="For each organisation, computes two ratios from its USD transactions: humanitarian share (humanitarian-flagged dollars / total dollars) plots on one axis, and funder-vs-implementer balance (provider-side dollars / total participating-org dollars) plots on the other. Bubble size scales with the organisation's total financial volume."
                            compactHeight={350}
                          >
                            <OrganizationalPositioningMap
                              dateRange={fiveYearRange}
                              refreshKey={refreshKey}
                            />
                          </CompactChartCard>

                          <CompactChartCard
                            title="Aid Ecosystem Solar System"
                            shortDescription="Organisations ranked by financial gravity and arranged in concentric rings"
                            mathTooltip="Ranks organisations by total USD financial volume across all transactions and participating-org roles. Largest organisations sit in the inner ring; smaller ones radiate outward. Distance from the centre reflects relative financial scale."
                            compactHeight={350}
                          >
                            <AidEcosystemSolarSystem
                              dateRange={fiveYearRange}
                              refreshKey={refreshKey}
                            />
                          </CompactChartCard>
                        </ChartGrid>
                      </div>
                    </div>

                  </div>
                </TabsContent>

                {/* ==================== FRAGMENTATION TAB ==================== */}
                {/* Audience: planners, coordination leads. Answers: how concentrated is partner support? */}
                <TabsContent value="fragmentation">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Fragmentation Analysis</h2>
                      <p className="text-muted-foreground mb-4">How concentrated or fragmented development partner portfolios are across programs, sectors, and locations</p>
                      <div className="space-y-6">
                        <CompactChartCard
                          title="Program Fragmentation"
                          shortDescription="How development partners distribute aid across National Priorities"
                          fullDescription="How development partners distribute aid across National Priorities. Each cell shows the percentage of that category's total funding contributed by each development partner."
                          mathTooltip="For each National Priority, shows the percentage of that category's total funding contributed by each development partner — a heatmap of concentration vs fragmentation. A larger share from a single partner means more concentrated support."
                          compactHeight={400}
                        >
                          <ProgramFragmentationChart />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Sector Fragmentation"
                          shortDescription="How development partners distribute aid across DAC Sectors"
                          fullDescription="How development partners distribute aid across DAC Sectors. Each cell shows the percentage of that sector's total funding contributed by each development partner."
                          mathTooltip="For each DAC sector, shows the percentage of that sector's total funding contributed by each development partner — highlighting where support is concentrated in one partner versus spread across many."
                          compactHeight={400}
                        >
                          <SectorFragmentationChart />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Location Fragmentation"
                          shortDescription="How development partners distribute aid across geographic regions"
                          fullDescription="How development partners distribute aid across geographic regions. Each cell shows the percentage of that location's total funding contributed by each development partner."
                          mathTooltip="For each geographic region, shows the percentage of that location's total funding contributed by each development partner — highlighting geographic concentration versus fragmentation of partner support."
                          compactHeight={400}
                        >
                          <LocationFragmentationChart />
                        </CompactChartCard>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="operations">
                  <div className="space-y-8">
                    {/* Activity Status Section */}
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Activity Status</h2>
                      <p className="text-muted-foreground mb-4">Distribution of activities by status and transaction analysis</p>
                      <ChartGrid>
                        <CompactChartCard
                          title="Activity Status Distribution"
                          shortDescription="Distribution of activities by publication & submission status"
                          fullDescription="Analyze the distribution of activities by their status (activity, publication, and submission status)"
                          mathTooltip="Counts distinct activities grouped by activity status (Pipeline, Implementation, Finalisation, Closed, Cancelled, Suspended) and publication/submission status. Each activity contributes once per category."
                          compactHeight={340}
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
                          mathTooltip="For each IATI transaction type (Commitment, Disbursement, Expenditure, Incoming Funds, etc.), counts the number of transactions and sums their USD value. Lets you see both volume and dollar weight per type."
                          exportData={transactionTypeData}
                          inlineToolbar
                          compactHeight={340}
                        >
                          <TransactionTypeChart
                            filters={filters}
                            onDataChange={setTransactionTypeData}
                          />
                        </CompactChartCard>
                      </ChartGrid>
                    </div>

                    {/* Activity Timeliness Section */}
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Activity Timeliness</h2>
                      <p className="text-muted-foreground mb-4">Are activities finishing on schedule? Actual vs planned end dates across the portfolio</p>
                      <CompactChartCard
                        title="Completion vs Plan"
                        shortDescription="Activities by how their actual end date compares to the planned end date"
                        fullDescription="Each published activity is bucketed by how its actual completion date compares to its planned end date — finished early, on time (within ±30 days), late, or very late — plus activities still in progress and those missing a planned end date. Expand the table to see each activity's planned vs actual end and the delay in days, and open it to investigate."
                        mathTooltip="For every published, non-deleted activity, delay = actual_end_date − planned_end_date (in days). Buckets: Finished early (≤ −31d), On time (±30d), Late (31–180d), Very late (>180d), In progress (planned end set but no actual end), Missing planned end date. Counts are activities, not money."
                        exportData={activityTimelinessData}
                        exportFilename="activity-timeliness"
                        compactHeight={340}
                      >
                        <ActivityTimelinessChart
                          refreshKey={refreshKey}
                          onDataChange={setActivityTimelinessData}
                        />
                      </CompactChartCard>
                    </div>

                  </div>
                </TabsContent>

                {/* ==================== TRANSACTION CALENDAR TAB ==================== */}
                {/* Audience: data managers. Answers: when is activity reported? */}
                <TabsContent value="transaction-calendar">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Transaction Calendar</h2>
                      <p className="text-muted-foreground mb-4">Daily transaction activity heatmap showing patterns and trends over time</p>
                      <CompactChartCard
                        title="Transaction Activity Calendar"
                        shortDescription="Daily transaction activity coloured by transaction type"
                        fullDescription="Daily transaction activity coloured by transaction type. Hover over days for details."
                        mathTooltip="Plots each day's transaction count as a calendar heatmap — colour intensity reflects the number of transactions on that day. Switch between heatmap, timeline, and monthly-summary views to spot reporting cycles and activity spikes."
                        compactHeight={200}
                      >
                        <TransactionActivityCalendar
                          dateRange={dateRange}
                          refreshKey={refreshKey}
                        />
                      </CompactChartCard>
                    </div>
                  </div>
                </TabsContent>

                {/* ==================== RANKINGS TAB ==================== */}
                {/* Audience: all users. Answers: which activities and partners stand out? */}
                <TabsContent value="rankings">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Activity Rankings</h2>
                      <p className="text-muted-foreground mb-4">Top activities and partners based on user voting and engagement</p>

                      {/* Activity rankings — two-column grid: voted, then the
                          engagement metrics. items-start so a tall card doesn't
                          stretch its row-mate. */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <CompactChartCard
                          title="Top Voted Activities"
                          shortDescription="Activities ranked by vote score (upvotes - downvotes)"
                          fullDescription="Top 10 activities ranked by net vote score from user upvotes and downvotes"
                          mathTooltip="For each activity, computes net vote score = total upvotes minus total downvotes from registered users. Activities are ranked descending and the top 10 are shown. Activities with no votes are excluded."
                          className="bg-card border-border"
                          compactHeight={300}
                          exportData={topLikedActivitiesData}
                          inlineToolbar
                        >
                          <TopLikedActivitiesChart
                            refreshKey={refreshKey}
                            onDataChange={setTopLikedActivitiesData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Most Viewed Activities"
                          shortDescription="Activities ranked by number of unique page views"
                          fullDescription="Top 10 activities ranked by the number of unique users who have viewed them"
                          mathTooltip="Ranks published activities by unique_view_count — the number of distinct registered users who have opened the activity (one view counted per user). Activities with no views are excluded."
                          className="bg-card border-border"
                          compactHeight={300}
                          exportData={topViewedActivitiesData}
                          inlineToolbar
                        >
                          <TopEngagedActivitiesChart
                            metric="views"
                            refreshKey={refreshKey}
                            onDataChange={setTopViewedActivitiesData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Most Discussed Activities"
                          shortDescription="Activities ranked by number of comments"
                          fullDescription="Top 10 activities ranked by the number of comments they have received"
                          mathTooltip="Ranks published activities by the count of rows in activity_comments per activity. Higher counts indicate activities generating the most discussion among users."
                          className="bg-card border-border"
                          compactHeight={300}
                          exportData={topCommentedActivitiesData}
                          inlineToolbar
                        >
                          <TopEngagedActivitiesChart
                            metric="comments"
                            refreshKey={refreshKey}
                            onDataChange={setTopCommentedActivitiesData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Most Bookmarked Activities"
                          shortDescription="Activities ranked by number of user bookmarks"
                          fullDescription="Top 10 activities ranked by the number of users who have bookmarked them"
                          mathTooltip="Ranks published activities by the count of rows in activity_bookmarks per activity — how many users have saved the activity for later. A signal of sustained interest beyond a single view."
                          className="bg-card border-border"
                          compactHeight={300}
                          exportData={topBookmarkedActivitiesData}
                          inlineToolbar
                        >
                          <TopEngagedActivitiesChart
                            metric="bookmarks"
                            refreshKey={refreshKey}
                            onDataChange={setTopBookmarkedActivitiesData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Most Collaborative Activities"
                          shortDescription="Activities ranked by number of participating organisations"
                          fullDescription="Top 10 activities ranked by the number of distinct participating organisations"
                          mathTooltip="Ranks published activities by the count of distinct organisations in activity_participating_organizations (an org appearing in multiple roles is counted once). A proxy for how many partners are involved in delivering the activity."
                          className="bg-card border-border"
                          compactHeight={300}
                          exportData={topPartnersActivitiesData}
                          inlineToolbar
                        >
                          <TopEngagedActivitiesChart
                            metric="partners"
                            refreshKey={refreshKey}
                            onDataChange={setTopPartnersActivitiesData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Biggest Execution Gap"
                          shortDescription="Activities with the most committed-but-undelivered funding"
                          fullDescription="Top 10 activities ranked by execution gap — value committed but not yet disbursed or spent"
                          mathTooltip="For each published activity, committed = sum of outgoing commitments (transaction type 2); spent = sum of disbursements + expenditures (types 3 + 4); execution gap = committed − spent (clamped at 0). Ranked by largest gap. Each bar shows total commitment split into spent and the remaining gap."
                          className="bg-card border-border"
                          compactHeight={300}
                          exportData={topExecutionGapData}
                          inlineToolbar
                        >
                          <TopExecutionGapChart
                            refreshKey={refreshKey}
                            onDataChange={setTopExecutionGapData}
                          />
                        </CompactChartCard>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ==================== OUTLIERS TAB ==================== */}
                {/* Audience: data stewards & analysts. Two panels: data-quality
                    error catching (click through to fix) and analytical
                    standouts. All metrics use the canonical reporting filters. */}
                <TabsContent value="outliers">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Data Quality</h2>
                      <p className="text-muted-foreground mb-4">
                        Distributions whose tails usually mean data-entry errors. Expand a chart to see the flagged records and click through to fix them.
                      </p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <CompactChartCard
                          title="Transaction Value Distribution"
                          shortDescription="USD value of every transaction, log scale — the far-right tail is where fat-fingered amounts hide"
                          fullDescription="Histogram of every reportable transaction's USD-converted value on a log scale (financial data spans many orders of magnitude). Bars beyond the fence are flagged as likely data-entry errors — e.g. a missing decimal or wrong currency. Expand to see and open the flagged transactions."
                          mathTooltip="Each reportable transaction's USD value (value_usd, or raw value when already USD) is log10-transformed and binned. Outliers are flagged with the modified z-score (median absolute deviation, |z| > 3.5) computed in log space, so the rule is robust to the heavy right tail. Published & non-deleted activities only; internal pooled-fund transfers excluded; zero/negative values shown separately, not on the log axis."
                          className="w-full"
                          compactHeight={300}
                          inlineToolbar
                          exportData={outlierTxData}
                          exportFilename="outlier-transactions"
                          tableView={<OutlierTable rows={outlierTxData} unit="usd" />}
                        >
                          <OutlierChart
                            metric="transaction_value"
                            countLabel="Transactions"
                            refreshKey={refreshKey}
                            onDataChange={setOutlierTxData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Budget vs Spend Ratio"
                          shortDescription="Disbursed + spent ÷ budget per activity — bumps at 0 (never started) and >1.2 (overspend)"
                          fullDescription="For each activity with a budget, the ratio of actual spend (disbursements + expenditures) to total budget. A spike at 0 means activities that have a budget but no recorded spend; anything past 1.2 (120%) is an overspend or a likely data error. Expand to see both groups."
                          mathTooltip="Ratio = USD spend (transaction types 3 + 4) ÷ USD budget (activity_budgets.usd_value) per published activity. Only activities with a positive budget are included. Bins are linear and capped at 2.0× so a single large overspend doesn't flatten the chart. Flagging is a domain rule, not statistical: ratio = 0 (nothing spent) or ratio > 1.2 (overspend). Internal transfers excluded."
                          className="w-full"
                          compactHeight={300}
                          inlineToolbar
                          exportData={outlierRatioData}
                          exportFilename="outlier-budget-spend-ratio"
                          tableView={<OutlierTable rows={outlierRatioData} unit="ratio" />}
                        >
                          <OutlierChart
                            metric="budget_spend_ratio"
                            countLabel="Activities"
                            refreshKey={refreshKey}
                            onDataChange={setOutlierRatioData}
                          />
                        </CompactChartCard>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Analytical Insights</h2>
                      <p className="text-muted-foreground mb-4">
                        The same distributions read the other way — records that genuinely stand out from their peers. Notable, not necessarily wrong.
                      </p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <CompactChartCard
                          title="Activity Size Distribution"
                          shortDescription="Total disbursements per activity, log scale — find the giants and the empty shells"
                          fullDescription="Histogram of total disbursements (USD) per published activity on a log scale. The right tail is the portfolio's largest activities; the flagged records list the standouts. Activities with zero disbursements are reported separately as potential empty shells."
                          mathTooltip="Sums actual disbursements (type 3, USD) per published activity, then log10-bins the positive totals. Outliers flagged via modified z-score (MAD, |z| > 3.5) in log space. Internal pooled-fund transfers excluded. Activities with $0 disbursements are counted separately and not placed on the log axis."
                          className="w-full"
                          compactHeight={300}
                          inlineToolbar
                          exportData={outlierActivitySizeData}
                          exportFilename="outlier-activity-size"
                          tableView={<OutlierTable rows={outlierActivitySizeData} unit="usd" />}
                        >
                          <OutlierChart
                            metric="activity_size"
                            countLabel="Activities"
                            refreshKey={refreshKey}
                            onDataChange={setOutlierActivitySizeData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Funder Totals Distribution"
                          shortDescription="Commitments + disbursements per provider organisation, log scale"
                          fullDescription="Histogram of total outgoing value (commitments + disbursements, USD) per provider organisation. The flagged tail highlights funders far above their peers — useful for spotting dominant donors or a mis-attributed mega-flow."
                          mathTooltip="Sums USD commitments (type 2) + disbursements (type 3) credited to each provider organisation across published activities, then log10-bins the totals. Outliers via modified z-score (MAD, |z| > 3.5) in log space. Internal pooled-fund transfers excluded."
                          className="w-full"
                          compactHeight={300}
                          inlineToolbar
                          exportData={outlierOrgData}
                          exportFilename="outlier-funder-totals"
                          tableView={<OutlierTable rows={outlierOrgData} unit="usd" />}
                        >
                          <OutlierChart
                            metric="org_totals"
                            countLabel="Organisations"
                            refreshKey={refreshKey}
                            onDataChange={setOutlierOrgData}
                          />
                        </CompactChartCard>

                        <CompactChartCard
                          title="Sector Funding Distribution"
                          shortDescription="Disbursements allocated per DAC sector, log scale — over/under-funded sectors"
                          fullDescription="Histogram of disbursements allocated to each DAC sector (using each activity's declared sector percentages) on a log scale. The flagged tail surfaces the sectors absorbing far more (or less) than the rest."
                          mathTooltip="Each activity's total disbursements (type 3, USD) are split across its declared DAC sectors using activity_sectors.percentage, then summed per sector code and log10-binned. Outliers via modified z-score (MAD, |z| > 3.5) in log space. Published & non-deleted activities only; internal transfers excluded."
                          className="w-full"
                          compactHeight={300}
                          inlineToolbar
                          exportData={outlierSectorData}
                          exportFilename="outlier-sector-funding"
                          tableView={<OutlierTable rows={outlierSectorData} unit="usd" />}
                        >
                          <OutlierChart
                            metric="sector_totals"
                            countLabel="Sectors"
                            refreshKey={refreshKey}
                            onDataChange={setOutlierSectorData}
                          />
                        </CompactChartCard>
                      </div>
                    </div>
                  </div>
                </TabsContent>

              </Tabs>
        </div>
      </div>
    </MainLayout>
  )
} 
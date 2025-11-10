"use client"

import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ExpandableCard } from '@/components/ui/expandable-card'
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
  Download,
  RefreshCw,
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

// Top 10 charts
import { Top10TotalFinancialValueChart } from '@/components/analytics/Top10TotalFinancialValueChart'
import { Top10ActiveProjectsChart } from '@/components/analytics/Top10ActiveProjectsChart'
import { Top10DisbursementCommitmentRatioChart } from '@/components/analytics/Top10DisbursementCommitmentRatioChart'
import { Top10GovernmentValidatedChart } from '@/components/analytics/Top10GovernmentValidatedChart'
import { Top10SectorFocusedChart } from '@/components/analytics/Top10SectorFocusedChart'
import { ODAByFlowTypeChart } from '@/components/analytics/ODAByFlowTypeChart'

// Charts from analytics page
import { BudgetVsSpendingChart } from '@/components/charts/BudgetVsSpendingChart'
import { ReportingOrgChart } from '@/components/charts/ReportingOrgChart'
import { AidTypeChart } from '@/components/charts/AidTypeChart'
import { FinanceTypeChart } from '@/components/charts/FinanceTypeChart'
import { OrgTypeChart } from '@/components/charts/OrgTypeChart'
import { ActivityStatusChart } from '@/components/charts/ActivityStatusChart'
import { TransactionTypeChart } from '@/components/charts/TransactionTypeChart'
import { SectorAnalysisChart } from '@/components/charts/SectorAnalysisChart'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
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
  
  // Filter states - Initialize with very wide date range to show all data
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date('1900-01-01'), // Start from earliest possible date
    to: new Date('2099-12-31')    // Go to latest possible date
  })

  const [refreshKey, setRefreshKey] = useState(0)

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

  // Export function
  const handleExport = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      dateRange,
      summary: {
        totalDisbursed: formatCurrency(kpiData.totalDisbursed),
        commitmentsDisbursedPercent: `${kpiData.commitmentsDisbursedPercent}%`,
        activeProjects: kpiData.activeProjects,
        donorsReporting: kpiData.donorsReporting,
        totalBudget: formatCurrency(kpiData.totalBudget),
        totalExpenditure: formatCurrency(kpiData.totalExpenditure)
      }
    };

    // Convert to CSV format for easy analysis
    const csvContent = [
      // Header
      ['Dashboard Export', new Date().toLocaleDateString()],
      [''],
      ['Summary'],
      ['Total Budgeted', exportData.summary.totalBudget],
      ['Total Disbursed', exportData.summary.totalDisbursed],
      ['Total Expenditure', exportData.summary.totalExpenditure],
      ['Commitments Disbursed %', exportData.summary.commitmentsDisbursedPercent],
      ['Active Projects', exportData.summary.activeProjects.toString()],
      ['Donors Reporting', exportData.summary.donorsReporting.toString()],
      [''],
      ['Date Range'],
      ['From', dateRange.from.toDateString()],
      ['To', dateRange.to.toDateString()]
    ].map(row => row.join(',')).join('\n');

    // Download as CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `aims-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  }

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
        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
          <div className="mx-auto px-4">
            <div className="flex items-center justify-end gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRefreshKey(prev => prev + 1)
                }}
                className="h-9 border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="h-9 border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </div>

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

          <Tabs defaultValue="analytics" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics">
              {/* Cumulative Financial Overview - Full Width at Top */}
              <div className="mb-6">
                <CumulativeFinancialOverview
                  dateRange={dateRange}
                  refreshKey={refreshKey}
                />
              </div>

              {/* Finance Type Flow Chart - Full Width Below Cumulative Overview */}
              <div className="mb-6">
                <FinanceTypeFlowChart
                  dateRange={dateRange}
                  refreshKey={refreshKey}
                  onDataChange={setFinanceTypeFlowData}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* All Donors Chart - Replaced Top 10 */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title="All Donors Financial Overview"
                description="Complete ranking of all donors by total budgets, planned disbursements, or actual disbursements in USD"
                exportData={donorsData}
              >
                <AllDonorsHorizontalBarChart
                  dateRange={dateRange}
                  refreshKey={refreshKey}
                  onDataChange={setDonorsData}
                />
              </ExpandableCard>

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

              {/* Humanitarian vs Development */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title="Humanitarian vs Development Aid"
                description="Comparison of aid types over time"
                exportData={humanitarianData}
              >
                <HumanitarianChart
                  dateRange={dateRange}
                  refreshKey={refreshKey}
                  onDataChange={setHumanitarianData}
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

              {/* Activity Status Chart */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title={
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Activity Status Distribution</span>
                  </div>
                }
                description="Analyze the distribution of activities by their status (activity, publication, and submission status)"
                exportData={activityStatusData}
              >
                <ActivityStatusChart
                  filters={filters}
                  onDataChange={setActivityStatusData}
                />
              </ExpandableCard>

              {/* Transaction Type Chart */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title={
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Transaction Type Analysis</span>
                  </div>
                }
                description="Compare transaction types by count and total value (Commitments, Disbursements, Expenditures, etc.)"
                exportData={transactionTypeData}
              >
                <TransactionTypeChart
                  filters={filters}
                  onDataChange={setTransactionTypeData}
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

              {/* Transaction Activity Calendar */}
              <TransactionActivityCalendar
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

              {/* Chart 2: Number of Active Projects */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title="Top 10 Partners by Number of Active Projects"
                description="Count of activities where the organisation is listed as a funding or implementing partner"
                exportData={top10ActiveProjectsData}
              >
                <Top10ActiveProjectsChart
                  refreshKey={refreshKey}
                  onDataChange={setTop10ActiveProjectsData}
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

              {/* Chart 4: Government-Validated Projects */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title="Top 10 Partners by Value of Government-Validated Projects"
                description="Highlights alignment and mutual accountability. Shows projects that have been validated by the recipient government."
                exportData={top10GovernmentValidatedData}
              >
                <Top10GovernmentValidatedChart
                  dateRange={dateRange}
                  refreshKey={refreshKey}
                  onDataChange={setTop10GovernmentValidatedData}
                />
              </ExpandableCard>

              {/* Chart 5: Sector-Focused Ranking */}
              <ExpandableCard
                className="bg-white border-slate-200"
                title="Top 10 Partners by Total Disbursements (All Sectors)"
                description="Top 10 partners across all sectors. Used for sectoral coordination groups or working group dashboards."
                exportData={top10SectorFocusedData}
              >
                <Top10SectorFocusedChart
                  dateRange={dateRange}
                  refreshKey={refreshKey}
                  onDataChange={setTop10SectorFocusedData}
                />
              </ExpandableCard>
              </div>
            </TabsContent>

            <TabsContent value="activities">
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700">
                    All Activities
                  </CardTitle>
                  <CardDescription>
                    Complete list of all activities in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Activities list will be displayed here...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions">
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700">
                    All Transactions
                  </CardTitle>
                  <CardDescription>
                    Complete list of all transactions in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Transactions list will be displayed here...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
} 
"use client"

import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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

// Chart components
import { CommitmentsChart } from '@/components/analytics/CommitmentsChart'
import { DonorsChart } from '@/components/analytics/DonorsChart'
import { SectorPieChart } from '@/components/analytics/SectorPieChart'
import { HumanitarianChart } from '@/components/analytics/HumanitarianChart'
import { AidMap } from '@/components/analytics/AidMap'
import { AidFlowMap } from '@/components/analytics/AidFlowMap'
import { SankeyFlow } from '@/components/analytics/SankeyFlow'
import { ProjectPipeline } from '@/components/analytics/ProjectPipeline'
import { DataHeatmap } from '@/components/analytics/DataHeatmap'
import { TimelinessChart } from '@/components/analytics/TimelinessChart'
import { BudgetVsActualChart } from '@/components/analytics/BudgetVsActualChart'

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
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date('2012-01-01'), // Start from earliest transaction
    to: new Date('2027-12-31')    // Go to latest transaction
  })
  
  console.log('[Analytics] Date range:', { from: dateRange.from, to: dateRange.to })
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [selectedDonor, setSelectedDonor] = useState<string>('all')
  const [selectedSector, setSelectedSector] = useState<string>('all')
  const [refreshKey, setRefreshKey] = useState(0)

  // Dropdown options from real data
  const [countries, setCountries] = useState<Array<{code: string, name: string}>>([])
  const [donors, setDonors] = useState<Array<{id: string, name: string}>>([])
  const [sectors, setSectors] = useState<Array<{code: string, name: string}>>([])
  const [loadingFilters, setLoadingFilters] = useState(true)

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      setLoadingFilters(true)
      
      // Get unique countries from activities
      const { data: activityData } = await supabase
        .from('activities')
        .select('locations')
        .eq('publication_status', 'published')
      
      // For now, use common countries (you can expand this based on actual location data)
      setCountries([
        { code: 'mm', name: 'Myanmar' },
        { code: 'tz', name: 'Tanzania' },
        { code: 'ke', name: 'Kenya' },
        { code: 'ug', name: 'Uganda' },
        { code: 'rw', name: 'Rwanda' },
        { code: 'et', name: 'Ethiopia' }
      ])
      
      // Get unique donors from organizations
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name')
        .in('organization_type', ['donor', 'multilateral', 'foundation'])
        .order('name')
      
      if (orgData) {
        setDonors(orgData)
      }
      
      // Get unique sectors from activity_sectors
      const { data: sectorData } = await supabase
        .from('activity_sectors')
        .select('sector_code, sector_name')
        .order('sector_name')
      
      // Deduplicate sectors
      const uniqueSectors = new Map<string, string>()
      sectorData?.forEach((s: any) => {
        if (s.sector_code && s.sector_name) {
          uniqueSectors.set(s.sector_code, s.sector_name)
        }
      })
      
      setSectors(Array.from(uniqueSectors.entries()).map(([code, name]) => ({ code, name })))
      
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
      
      // Build filters
      let filters: any = {
        dateFrom: dateRange.from.toISOString(),
        dateTo: dateRange.to.toISOString()
      }
      
      if (selectedCountry !== 'all') filters.country = selectedCountry
      if (selectedDonor !== 'all') filters.donor = selectedDonor
      if (selectedSector !== 'all') filters.sector = selectedSector
      
      // Get total disbursed
      let disbursedQuery = supabase
        .from('transactions')
        .select('value')
        .eq('transaction_type', '3') // Disbursement
        .eq('status', 'actual')
        .gte('transaction_date', filters.dateFrom)
        .lte('transaction_date', filters.dateTo)
      
      if (filters.donor) {
        disbursedQuery = disbursedQuery.eq('provider_org_id', filters.donor)
      }
      
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
      let commitmentQuery = supabase
        .from('transactions')
        .select('value')
        .eq('transaction_type', '2') // Commitment
        .eq('status', 'actual')
        .gte('transaction_date', filters.dateFrom)
        .lte('transaction_date', filters.dateTo)
        
      if (filters.donor) {
        commitmentQuery = commitmentQuery.eq('provider_org_id', filters.donor)
      }
      
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

      // Get activities with their sectors and transactions
      let projectsQuery = supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('activity_status', '2') // IATI code 2 = Implementation (active/ongoing)
        .eq('publication_status', 'published')
      
      // Apply country filter to activities
      if (filters.country && filters.country !== 'all') {
        // For now, filter by country code in locations (you may need to adjust based on your location structure)
        projectsQuery = projectsQuery.contains('locations', { country_code: filters.country })
      }
      
      // Apply sector filter to activities
      if (filters.sector && filters.sector !== 'all') {
        // Need to join with activity_sectors to filter by sector
        projectsQuery = projectsQuery
          .select('*, activity_sectors!inner(*)')
          .eq('activity_sectors.sector_code', filters.sector)
      }
        
      const { count: activeProjects, error: activeProjectsError } = await projectsQuery
      
      console.log('[Analytics] Active projects query result:', { count: activeProjects, error: activeProjectsError })

      // Get unique donors
      const { data: donorData } = await supabase
        .from('transactions')
        .select('provider_org_id')
        .eq('status', 'actual')
        .gte('transaction_date', filters.dateFrom)
        .lte('transaction_date', filters.dateTo)
        .not('provider_org_id', 'is', null)
      
      const uniqueDonors = new Set(donorData?.filter((t: any) => t.provider_org_id).map((t: any) => t.provider_org_id) || [])
      const donorsReporting = uniqueDonors.size

      // Get total budget
      let budgetQuery = supabase
        .from('activity_budgets')
        .select('value, activity_id')
        .gte('period_start', filters.dateFrom)
        .lte('period_end', filters.dateTo)
      
      if (filters.donor) {
        // Join with activities to filter by donor through transactions
        budgetQuery = budgetQuery.in('activity_id', 
          supabase
            .from('transactions')
            .select('activity_id')
            .eq('provider_org_id', filters.donor)
            .not('activity_id', 'is', null)
        )
      }
      
      const { data: budgetData } = await budgetQuery
      
      const totalBudget = budgetData?.reduce((sum: number, b: any) => {
        const value = parseFloat(b.value?.toString() || '0') || 0
        return sum + (isNaN(value) ? 0 : value)
      }, 0) || 0

      // Get expenditure
      let expenditureQuery = supabase
        .from('transactions')
        .select('value')
        .eq('transaction_type', '4') // Expenditure
        .eq('status', 'actual')
        .gte('transaction_date', filters.dateFrom)
        .lte('transaction_date', filters.dateTo)
      
      if (filters.donor) {
        expenditureQuery = expenditureQuery.eq('provider_org_id', filters.donor)
      }
      
      const { data: expenditureData } = await expenditureQuery
      
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



  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions()
  }, [])

  // Fetch KPI data when filters change
  useEffect(() => {
    fetchKPIData()
  }, [dateRange, selectedCountry, selectedDonor, selectedSector, refreshKey])

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
      title: 'TOTAL BUDGET',
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
      filters: {
        dateRange,
        selectedCountry,
        selectedDonor,
        selectedSector
      },
      summary: {
        totalDisbursed: formatCurrency(kpiData.totalDisbursed),
        commitmentsDisbursedPercent: `${kpiData.commitmentsDisbursedPercent}%`,
        activeProjects: kpiData.activeProjects,
        donorsReporting: kpiData.donorsReporting
      }
    };

    // Convert to CSV format for easy analysis
    const csvContent = [
      // Header
      ['Dashboard Export', new Date().toLocaleDateString()],
      [''],
      ['Summary'],
      ['Total Disbursed', exportData.summary.totalDisbursed],
      ['Commitments Disbursed %', exportData.summary.commitmentsDisbursedPercent],
      ['Active Projects', exportData.summary.activeProjects.toString()],
      ['Donors Reporting', exportData.summary.donorsReporting.toString()],
      [''],
      ['Filters Applied'],
      ['Date Range', `${dateRange.from.toDateString()} - ${dateRange.to.toDateString()}`],
      ['Country', selectedCountry === 'all' ? 'All Countries' : selectedCountry],
      ['Donor', selectedDonor === 'all' ? 'All Donors' : selectedDonor],
      ['Sector', selectedSector === 'all' ? 'All Sectors' : selectedSector]
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
    
    console.log('Dashboard data exported successfully');
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
      <div className="min-h-screen bg-slate-50">
        {/* Sticky Filter Bar */}
        <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-slate-600">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              {/* Date Range Picker */}
              <Popover>
                <PopoverTrigger>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 px-3 text-sm justify-start text-left font-normal bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM d")} -{" "}
                          {format(dateRange.to, "MMM d, y")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM d, y")
                      )
                    ) : (
                      <span>Date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={{
                      from: dateRange.from,
                      to: dateRange.to
                    }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to })
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {/* Country Selector */}
              <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={loadingFilters}>
                <SelectTrigger className="h-9 w-[140px] text-sm bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map(country => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Donor Selector */}
              <Select value={selectedDonor} onValueChange={setSelectedDonor} disabled={loadingFilters}>
                <SelectTrigger className="h-9 w-[160px] text-sm bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200">
                  <SelectValue placeholder="All Donors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Donors</SelectItem>
                  {donors.map(donor => (
                    <SelectItem key={donor.id} value={donor.id}>
                      {donor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sector Dropdown */}
              <Select value={selectedSector} onValueChange={setSelectedSector} disabled={loadingFilters}>
                <SelectTrigger className="h-9 w-[160px] text-sm bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200">
                  <SelectValue placeholder="All Sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {sectors.map(sector => (
                    <SelectItem key={sector.code} value={sector.code}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="ml-auto flex gap-2">
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
        </div>

        {/* Main Dashboard Content with Tabs */}
        <div className="max-w-7xl mx-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 max-w-3xl">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                Trends
              </TabsTrigger>
              <TabsTrigger value="geographic" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Geographic
              </TabsTrigger>
              <TabsTrigger value="aid-flow" className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                Aid Flow Map
              </TabsTrigger>
              <TabsTrigger value="data-quality" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Data Quality
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Error Display */}
              {error && (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <p className="text-red-700">{error}</p>
                  </CardContent>
                </Card>
              )}
              
              {/* Section 1: KPI Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((kpi, index) => (
                  <Card 
                    key={index} 
                    className="bg-white border-slate-200 hover:shadow-md transition-all duration-200"
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                        {kpi.title}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {kpi.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                        {kpi.trend === 'good' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        {kpi.trend === 'warning' && <AlertCircle className="h-3 w-3 text-amber-500" />}
                        <kpi.icon className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <Skeleton className="h-8 w-24 bg-slate-100" />
                      ) : (
                        <>
                          <div className="text-2xl font-bold text-slate-800">
                            {kpi.value}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {kpi.description}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Budget Analysis Summary */}
              {kpiData.totalBudget > 0 && (
                <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700">
                      Budget Analysis Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-sm text-slate-600 mb-1">Budget Remaining</div>
                        <div className="text-2xl font-bold text-slate-800">
                          ${formatCurrency(kpiData.totalBudget - kpiData.totalDisbursed)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Available for disbursement
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-slate-600 mb-1">Burn Rate</div>
                        <div className="text-2xl font-bold text-slate-800">
                          ${formatCurrency(kpiData.totalDisbursed / 12)}/month
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Average monthly disbursement
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-slate-600 mb-1">Efficiency Rate</div>
                        <div className="text-2xl font-bold text-slate-800">
                          {kpiData.totalDisbursed > 0 ? Math.round((kpiData.totalExpenditure / kpiData.totalDisbursed) * 100) : 0}%
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Expenditure vs Disbursement
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Donors Chart */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700">
                    Top 10 Donors by Disbursement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DonorsChart 
                    dateRange={dateRange}
                    filters={{ country: selectedCountry, sector: selectedSector }}
                    refreshKey={refreshKey}
                  />
                </CardContent>
              </Card>

              {/* Aid by Sector */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700">
                      Aid Distribution by Sector
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SectorPieChart 
                      dateRange={dateRange}
                      filters={{ country: selectedCountry, donor: selectedDonor }}
                      refreshKey={refreshKey}
                    />
                  </CardContent>
                </Card>

                {/* Humanitarian vs Development */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700">
                      Humanitarian vs Development Aid
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HumanitarianChart 
                      dateRange={dateRange}
                      filters={{ country: selectedCountry, donor: selectedDonor, sector: selectedSector }}
                      refreshKey={refreshKey}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
              {/* Commitments vs Disbursements Chart */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700">
                    Commitments vs Disbursements Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CommitmentsChart 
                    dateRange={dateRange}
                    filters={{ country: selectedCountry, donor: selectedDonor, sector: selectedSector }}
                    refreshKey={refreshKey}
                  />
                </CardContent>
              </Card>

              {/* Budget vs Actual Chart */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700">
                    Budget vs Actual Spending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BudgetVsActualChart 
                    dateRange={dateRange}
                    filters={{ country: selectedCountry, donor: selectedDonor, sector: selectedSector }}
                    refreshKey={refreshKey}
                  />
                </CardContent>
              </Card>

              {/* Project Pipeline Table */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700">
                    Project Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProjectPipeline 
                    dateRange={dateRange}
                    filters={{ country: selectedCountry, donor: selectedDonor, sector: selectedSector }}
                    refreshKey={refreshKey}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Geographic Tab */}
            <TabsContent value="geographic" className="space-y-6">
              {/* Aid by Location Map */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700">
                    Aid Distribution by Subnational Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[500px]">
                  <AidMap 
                    dateRange={dateRange}
                    filters={{ donor: selectedDonor, sector: selectedSector }}
                    country={selectedCountry}
                    refreshKey={refreshKey}
                  />
                </CardContent>
              </Card>

              {/* Sankey Flow Diagram */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700">
                    Donor → Sector → Recipient Flow
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[600px]">
                  <SankeyFlow 
                    dateRange={dateRange}
                    filters={{ country: selectedCountry }}
                    refreshKey={refreshKey}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aid Flow Map Tab */}
            <TabsContent value="aid-flow" className="space-y-6">
              <AidFlowMap 
                height={600}
                initialDateRange={dateRange}
              />


            </TabsContent>

            {/* Data Quality Tab */}
            <TabsContent value="data-quality" className="space-y-6">
              {/* Data Completeness Heatmap */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700">
                    Data Completeness by Donor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DataHeatmap 
                    dateRange={dateRange}
                    refreshKey={refreshKey}
                  />
                </CardContent>
              </Card>

              {/* Disbursement Timeliness */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700">
                    Disbursement Timeliness by Donor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TimelinessChart 
                    dateRange={dateRange}
                    filters={{ country: selectedCountry, sector: selectedSector }}
                    refreshKey={refreshKey}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
} 
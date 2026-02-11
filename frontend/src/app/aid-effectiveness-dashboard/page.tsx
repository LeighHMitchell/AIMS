"use client"

import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AnalyticsSkeleton } from '@/components/ui/skeleton-loader'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Shield, 
  Target, 
  Building2,
  Calendar as CalendarIcon,
  SlidersHorizontal,
  Download,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Users,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  Globe,
  Handshake
} from 'lucide-react'
import { format, startOfYear, endOfYear } from 'date-fns'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

// Chart components for Aid Effectiveness
import { GovernmentSystemsChart } from '@/components/aid-effectiveness/GovernmentSystemsChart'
import { DevelopmentIndicatorsChart } from '@/components/aid-effectiveness/DevelopmentIndicatorsChart'
import { TiedAidChart } from '@/components/aid-effectiveness/TiedAidChart'
import { BudgetPlanningChart } from '@/components/aid-effectiveness/BudgetPlanningChart'
import { GPEDCComplianceChart } from '@/components/aid-effectiveness/GPEDCComplianceChart'
import { ImplementingPartnersChart } from '@/components/aid-effectiveness/ImplementingPartnersChart'

interface DateRange {
  from: Date
  to: Date
}

interface AidEffectivenessFilters {
  donor: string
  sector: string
  country: string
  implementingPartner: string
}

interface AidEffectivenessMetrics {
  totalActivities: number
  gpedc_compliant: number
  compliance_rate: number
  avg_outcome_indicators: number
  gov_systems_usage: number
  tied_aid_percentage: number
  budget_sharing_rate: number
  evaluation_planning_rate: number
}

export default function AidEffectivenessDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfYear(new Date()),
    to: endOfYear(new Date())
  })
  
  const [filters, setFilters] = useState<AidEffectivenessFilters>({
    donor: 'all',
    sector: 'all', 
    country: 'all',
    implementingPartner: 'all'
  })

  const [metrics, setMetrics] = useState<AidEffectivenessMetrics>({
    totalActivities: 0,
    gpedc_compliant: 0,
    compliance_rate: 0,
    avg_outcome_indicators: 0,
    gov_systems_usage: 0,
    tied_aid_percentage: 0,
    budget_sharing_rate: 0,
    evaluation_planning_rate: 0
  })

  const [donors, setDonors] = useState<Array<{ id: string; name: string }>>([])
  const [sectors, setSectors] = useState<Array<{ code: string; name: string }>>([])
  const [countries, setCountries] = useState<Array<{ code: string; name: string }>>([])
  const [implementingPartners, setImplementingPartners] = useState<Array<{ id: string; name: string }>>([])

  // Fetch filter options
  useEffect(() => {
    fetchFilterOptions()
  }, [])

  // Fetch metrics when filters or date range change
  useEffect(() => {
    fetchMetrics()
  }, [dateRange, filters, refreshKey])

  const fetchFilterOptions = async () => {
    try {
      // Fetch donors
      const { data: donorData } = await supabase
        .from('organizations')
        .select('id, name, acronym')
        .eq('type', 'donor')
        .order('name')

      setDonors(donorData?.map((d: any) => ({ id: d.id, name: d.acronym || d.name })) || [])

      // Fetch sectors
      const { data: sectorData } = await supabase
        .from('sectors')
        .select('code, name')
        .order('name')

      setSectors(sectorData || [])

      // Fetch countries
      const { data: countryData } = await supabase
        .from('countries')
        .select('code, name')
        .order('name')

      setCountries(countryData || [])

      // Fetch implementing partners
      const { data: partnerData } = await supabase
        .from('organizations')
        .select('id, name, acronym')
        .neq('type', 'donor')
        .order('name')

      setImplementingPartners(partnerData?.map((p: any) => ({ id: p.id, name: p.acronym || p.name })) || [])

    } catch (error) {
      console.error('Error fetching filter options:', error)
      toast.error('Failed to load filter options')
    }
  }

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/aid-effectiveness/metrics?${new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        donor: filters.donor,
        sector: filters.sector,
        country: filters.country,
        implementingPartner: filters.implementingPartner
      })}`)

      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      } else {
        throw new Error('Failed to fetch metrics')
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
      toast.error('Failed to load Aid Effectiveness metrics')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    toast.success('Dashboard refreshed')
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/aid-effectiveness/export?${new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        ...filters
      })}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `aid-effectiveness-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Report exported successfully')
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export report')
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <AnalyticsSkeleton />
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-orange-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Aid Effectiveness Dashboard</h1>
              <p className="text-slate-600">GPEDC Compliance & Development Effectiveness Analytics</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-slate-600" />
              <CardTitle className="text-lg">Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Date Range */}
              <div className="lg:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Date Range</label>
                <Popover>
                  <PopoverTrigger className="w-full justify-start text-left font-normal border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <CalendarIcon className="mr-2 h-4 w-4 inline" />
                    {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to })
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Donor Filter */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Donor</label>
                <Select value={filters.donor} onValueChange={(value) => setFilters(prev => ({ ...prev, donor: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Donors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Donors</SelectItem>
                    {donors.map(donor => (
                      <SelectItem key={donor.id} value={donor.id}>{donor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sector Filter */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Sector</label>
                <Select value={filters.sector} onValueChange={(value) => setFilters(prev => ({ ...prev, sector: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sectors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    {sectors.map(sector => (
                      <SelectItem key={sector.code} value={sector.code}>{sector.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Country Filter */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Country</label>
                <Select value={filters.country} onValueChange={(value) => setFilters(prev => ({ ...prev, country: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map(country => (
                      <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Implementing Partner Filter */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Partner</label>
                <Select value={filters.implementingPartner} onValueChange={(value) => setFilters(prev => ({ ...prev, implementingPartner: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Partners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Partners</SelectItem>
                    {implementingPartners.map(partner => (
                      <SelectItem key={partner.id} value={partner.id}>{partner.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">GPEDC Compliance Rate</p>
                  <p className="text-3xl font-bold text-orange-900">{metrics.compliance_rate}%</p>
                </div>
                <Shield className="h-8 w-8 text-orange-600" />
              </div>
              <div className="mt-4">
                <Progress value={metrics.compliance_rate} className="bg-orange-200 [&>div]:bg-orange-600" />
                <p className="text-xs text-orange-700 mt-1">{metrics.gpedc_compliant} of {metrics.totalActivities} activities</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Gov Systems Usage</p>
                  <p className="text-3xl font-bold text-blue-900">{metrics.gov_systems_usage}%</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-4">
                <Progress value={metrics.gov_systems_usage} className="bg-blue-200 [&>div]:bg-blue-600" />
                <p className="text-xs text-blue-700 mt-1">Using government systems</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Untied Aid</p>
                  <p className="text-3xl font-bold text-green-900">{100 - metrics.tied_aid_percentage}%</p>
                </div>
                <Handshake className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-4">
                <Progress value={100 - metrics.tied_aid_percentage} className="bg-green-200 [&>div]:bg-green-600" />
                <p className="text-xs text-green-700 mt-1">Aid without restrictions</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Avg Outcome Indicators</p>
                  <p className="text-3xl font-bold text-purple-900">{metrics.avg_outcome_indicators}</p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
              <div className="mt-4">
                <p className="text-xs text-purple-700">Per activity on average</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="government-systems">Government Systems</TabsTrigger>
            <TabsTrigger value="development-indicators">Development Indicators</TabsTrigger>
            <TabsTrigger value="budget-planning">Budget Planning</TabsTrigger>
            <TabsTrigger value="compliance">GPEDC Compliance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* GPEDC Compliance Overview */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-orange-600" />
                    GPEDC Compliance Overview
                  </CardTitle>
                  <CardDescription>
                    Compliance with Global Partnership for Effective Development Cooperation indicators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GPEDCComplianceChart 
                    dateRange={dateRange}
                    filters={filters}
                    refreshKey={refreshKey}
                  />
                </CardContent>
              </Card>

              {/* Implementing Partners Distribution */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Implementing Partners
                  </CardTitle>
                  <CardDescription>
                    Distribution of activities by implementing partner type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImplementingPartnersChart 
                    dateRange={dateRange}
                    filters={filters}
                    refreshKey={refreshKey}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Tied Aid Analysis */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-green-600" />
                  Aid Tying Analysis
                </CardTitle>
                <CardDescription>
                  Analysis of tied vs untied aid across donors and sectors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TiedAidChart 
                  dateRange={dateRange}
                  filters={filters}
                  refreshKey={refreshKey}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Government Systems Tab */}
          <TabsContent value="government-systems" className="space-y-6">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Government Systems Usage
                </CardTitle>
                <CardDescription>
                  Usage of government budget, financial reporting, audit, and procurement systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GovernmentSystemsChart 
                  dateRange={dateRange}
                  filters={filters}
                  refreshKey={refreshKey}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Development Indicators Tab */}
          <TabsContent value="development-indicators" className="space-y-6">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Development Effectiveness Indicators
                </CardTitle>
                <CardDescription>
                  Outcome indicators, government framework linkage, and evaluation planning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DevelopmentIndicatorsChart 
                  dateRange={dateRange}
                  filters={filters}
                  refreshKey={refreshKey}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budget Planning Tab */}
          <TabsContent value="budget-planning" className="space-y-6">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  Budget Planning & Transparency
                </CardTitle>
                <CardDescription>
                  Annual budget sharing, forward planning, and transparency metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetPlanningChart 
                  dateRange={dateRange}
                  filters={filters}
                  refreshKey={refreshKey}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* GPEDC Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            {/* Compliance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-200 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-orange-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-orange-800">Fully Compliant</p>
                      <p className="text-2xl font-bold text-orange-900">{metrics.gpedc_compliant}</p>
                      <p className="text-xs text-orange-700">Activities</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-200 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-yellow-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Partially Compliant</p>
                      <p className="text-2xl font-bold text-yellow-900">{Math.max(0, metrics.totalActivities - metrics.gpedc_compliant)}</p>
                      <p className="text-xs text-yellow-700">Activities</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 rounded-lg">
                      <Activity className="h-6 w-6 text-slate-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Total Activities</p>
                      <p className="text-2xl font-bold text-slate-900">{metrics.totalActivities}</p>
                      <p className="text-xs text-slate-700">With Aid Effectiveness data</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Compliance Analysis */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-600" />
                  Detailed GPEDC Compliance Analysis
                </CardTitle>
                <CardDescription>
                  Breakdown of compliance across all GPEDC indicators and principles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GPEDCComplianceChart 
                  dateRange={dateRange}
                  filters={filters}
                  refreshKey={refreshKey}
                  detailed={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}

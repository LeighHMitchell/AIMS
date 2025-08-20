"use client"

import React, { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/useUser"
import { USER_ROLES, ROLE_LABELS } from "@/types/user"
import { ActivityFeed } from "@/components/ActivityFeed"
import { 
  Activity, 
  FileText, 
  Calendar as CalendarIcon, 
  Plus, 
  ArrowRight, 
  Users, 
  Building2, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Filter,
  Download,
  RefreshCw
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardStatsSkeleton, TableSkeleton } from "@/components/ui/skeleton-loader"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { format, startOfYear, endOfYear } from 'date-fns'

// Import chart components (we'll create these next)
// import { CommitmentsChart } from '@/components/dashboard/CommitmentsChart'
// import { DonorsChart } from '@/components/dashboard/DonorsChart'
// import { SectorPieChart } from '@/components/dashboard/SectorPieChart'
// import { HumanitarianChart } from '@/components/dashboard/HumanitarianChart'
// import { AidMap } from '@/components/dashboard/AidMap'
// import { SankeyFlow } from '@/components/dashboard/SankeyFlow'
// import { ProjectPipeline } from '@/components/dashboard/ProjectPipeline'
// import { DataHeatmap } from '@/components/dashboard/DataHeatmap'
// import { TimelinessChart } from '@/components/dashboard/TimelinessChart'

interface Activity {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  organizationId?: string;
  createdBy?: string;
  needsValidation?: boolean;
  submissionStatus?: 'draft' | 'submitted' | 'validated' | 'rejected' | 'published';
  publicationStatus?: string;
  activityStatus?: string;
}

interface KPIData {
  totalDisbursed: number
  commitmentsDisbursedPercent: number
  activeProjects: number
  donorsReporting: number
}

interface DateRange {
  from: Date
  to: Date
}

export default function Dashboard() {
  const router = useRouter();
  const { user, permissions } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pendingValidations, setPendingValidations] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpiData, setKpiData] = useState<KPIData>({
    totalDisbursed: 0,
    commitmentsDisbursedPercent: 0,
    activeProjects: 0,
    donorsReporting: 0
  });
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfYear(new Date()),
    to: endOfYear(new Date())
  });
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedDonor, setSelectedDonor] = useState<string>('all');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // If no user, don't fetch
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Fetch activities
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/activities");
        if (!res.ok) {
          throw new Error(`Failed to fetch activities: ${res.status}`);
        }
        const data = await res.json();
        setActivities(data);
        
        // Filter activities that need validation based on user role
        if (user?.role === USER_ROLES.DEV_PARTNER_TIER_1 || user?.role === USER_ROLES.GOV_PARTNER_TIER_1) {
          const pending = data.filter((a: Activity) => 
            a.organizationId === user.organizationId && a.needsValidation
          );
          setPendingValidations(pending);
        }
      } catch (error) {
        console.error("Failed to fetch activities:", error);
        setError(error instanceof Error ? error.message : "Failed to load activities");
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [user]);

  // Fetch KPI data
  const fetchKPIData = async () => {
    try {
      setIsLoading(true);
      
      // Get total disbursed this year
      const { data: disbursedData } = await supabase
        .from('transactions')
        .select('value')
        .eq('transaction_type', '3') // Disbursement
        .eq('status', 'actual')
        .gte('transaction_date', dateRange.from.toISOString())
        .lte('transaction_date', dateRange.to.toISOString())
      
      const totalDisbursed = disbursedData?.reduce((sum: number, t: any) => sum + (t.value || 0), 0) || 0

      // Get commitments and calculate percentage
      const { data: commitmentData } = await supabase
        .from('transactions')
        .select('value')
        .eq('transaction_type', '2') // Commitment
        .eq('status', 'actual')
        .gte('transaction_date', dateRange.from.toISOString())
        .lte('transaction_date', dateRange.to.toISOString())
      
      const totalCommitments = commitmentData?.reduce((sum: number, t: any) => sum + (t.value || 0), 0) || 0
      const commitmentsDisbursedPercent = totalCommitments > 0 
        ? Math.round((totalDisbursed / totalCommitments) * 100) 
        : 0

      // Get active projects count (Implementation + Finalisation)
      const { count: activeProjects } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .in('activity_status', ['2', '3']) // 2=Implementation, 3=Finalisation
        .eq('publication_status', 'published')

      // Get donors reporting count
      const { data: donorData } = await supabase
        .from('transactions')
        .select('provider_org_id')
        .eq('status', 'actual')
        .gte('transaction_date', dateRange.from.toISOString())
        .lte('transaction_date', dateRange.to.toISOString())
        .not('provider_org_id', 'is', null)
      
      const uniqueDonors = new Set(donorData?.map((t: any) => t.provider_org_id) || [])
      const donorsReporting = uniqueDonors.size

      setKpiData({
        totalDisbursed,
        commitmentsDisbursedPercent,
        activeProjects: activeProjects || 0,
        donorsReporting
      })
    } catch (error) {
      console.error('Error fetching KPI data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchKPIData()
  }, [dateRange, selectedCountry, selectedDonor, selectedSector, refreshKey])

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="p-8 max-w-7xl mx-auto">
            <div className="space-y-6">
              {/* Header Skeleton */}
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-9 w-48 mb-2" />
                  <Skeleton className="h-5 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>

              {/* Stats Grid Skeleton */}
              <DashboardStatsSkeleton />

              {/* Quick Actions Skeleton */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48 mb-4" />
                <div className="grid gap-4 md:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              </div>

              {/* Activity Feed Skeleton */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <Skeleton className="h-6 w-40 mb-4" />
                <TableSkeleton rows={5} columns={4} />
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[60vh]">
              <Card className="max-w-lg bg-white">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                    <CardTitle>Error Loading Dashboard</CardTitle>
                  </div>
                  <CardDescription>{error}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Orphan user view
  if (!user?.organizationId) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[60vh]">
              <Card className="max-w-lg bg-white">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-6 w-6 text-orange-500" />
                    <CardTitle>Organization Assignment Pending</CardTitle>
                  </div>
                  <CardDescription>
                    Your account has been created but you haven't been assigned to an organization yet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Please contact your system administrator to be assigned to an organization. 
                    Once assigned, you'll have access to create and manage aid activities.
                  </p>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-800">
                      <strong>What you can do now:</strong>
                    </p>
                    <ul className="list-disc list-inside text-sm text-orange-700 mt-2 space-y-1">
                      <li>Update your profile information</li>
                      <li>View public activities</li>
                      <li>Contact support for assistance</li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => router.push("/profile")}>
                      Update Profile
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/activities")}>
                      View Activities
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Calculate stats based on user permissions
  const userActivities = permissions.canViewAllActivities 
    ? activities 
    : activities.filter(a => a.organizationId === user?.organizationId);

  const stats = {
    total: userActivities.length,
    published: userActivities.filter(a => a.status === "published").length,
    draft: userActivities.filter(a => a.status === "draft").length,
    thisMonth: userActivities.filter(a => {
      const date = new Date(a.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
  };

  // Calculate metrics for validation dashboard
  const pendingValidationCount = activities.filter(a => a.submissionStatus === 'submitted').length;

  // Check if user can validate
  const canValidate = user?.role === 'gov_partner_tier_1' || user?.role === 'super_user';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    }).format(value)
  }

  const kpiCards = [
    {
      title: 'Total Disbursed This Year',
      value: `$${formatCurrency(kpiData.totalDisbursed)}`,
      icon: DollarSign,
      description: 'Actual disbursements'
    },
    {
      title: '% Commitments Disbursed',
      value: `${kpiData.commitmentsDisbursedPercent}%`,
      icon: Activity,
      description: 'Disbursement rate'
    },
    {
      title: 'Active Projects',
      value: kpiData.activeProjects.toString(),
      icon: Users,
      description: 'Currently implementing'
    },
    {
      title: 'Donors Reporting',
      value: kpiData.donorsReporting.toString(),
      icon: Building2,
      description: 'Active donors'
    }
  ]

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-muted-foreground">Welcome back, {user?.name}</p>
                  <Badge variant={user?.role === USER_ROLES.SUPER_USER ? "destructive" : "secondary"}>
                    {user?.role && ROLE_LABELS[user.role]}
                  </Badge>
                </div>
              </div>
              {permissions.canCreateActivities && (
                <Button onClick={() => router.push("/activities/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Activity
                </Button>
              )}
            </div>

            {/* Role-specific alerts */}
            {user?.role === USER_ROLES.SUPER_USER && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-800">Super User Access</p>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  You have full system access. You can manage all users, organizations, and activities.
                </p>
              </div>
            )}

            {(user?.role === USER_ROLES.DEV_PARTNER_TIER_1 || user?.role === USER_ROLES.GOV_PARTNER_TIER_1) && 
             pendingValidations.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-medium text-blue-800">
                    {pendingValidations.length} Activities Pending Validation
                  </p>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Activities created by Tier 2 users in your organization need your approval.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => router.push("/activities?filter=pending-validation")}
                >
                  Review Now
                </Button>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {permissions.canViewAllActivities ? "Total Activities" : "Your Activities"}
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    +{stats.thisMonth} from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Published</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.published}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0}% of total
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Draft</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.draft}</div>
                  <p className="text-xs text-muted-foreground">Awaiting publication</p>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.thisMonth}</div>
                  <p className="text-xs text-muted-foreground flex items-center">
                    New activities
                  </p>
                </CardContent>
              </Card>

              {canValidate && (
                <Card className="bg-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/validations')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Validations</CardTitle>
                    <Clock className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pendingValidationCount}</div>
                    <p className="text-xs text-muted-foreground">Activities awaiting your review</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Role-specific quick actions */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks based on your role</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                {permissions.canCreateActivities && (
                  <Button variant="outline" onClick={() => router.push("/activities/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Activity
                  </Button>
                )}
                
                <Button variant="outline" onClick={() => router.push("/activities")}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Activities
                </Button>

                {permissions.canManageUsers && (
                  <Button variant="outline" onClick={() => router.push("/admin/users")}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                )}

                {permissions.canValidateActivities && (
                  <Button variant="outline" onClick={() => router.push("/activities?filter=needs-validation")}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Validate Activities
                  </Button>
                )}

                <Button variant="outline" onClick={() => router.push("/reports")}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Reports
                </Button>

                <Button variant="outline" onClick={() => router.push("/finances")}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Financial Reports
                </Button>

                {user?.organization && (
                  <Button variant="outline" onClick={() => router.push("/organization")}>
                    <Building2 className="h-4 w-4 mr-2" />
                    {user.organization.name}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Activity Feed - Replacing Recent Activities */}
            <ActivityFeed limit={15} />

            {/* Sticky Filter Bar */}
            <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
              <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-slate-600">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                
                {/* Date Range Picker */}
                <Popover>
                  <PopoverTrigger
                    className={cn(
                      "inline-flex items-center justify-start whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-left font-normal bg-slate-100 border-slate-200 text-slate-800",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(range) => range?.from && range?.to && setDateRange(range as any)}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                {/* Country Selector */}
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-[180px] bg-slate-100 border-slate-200 text-slate-800">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    <SelectItem value="tz">Tanzania</SelectItem>
                    <SelectItem value="ke">Kenya</SelectItem>
                    <SelectItem value="ug">Uganda</SelectItem>
                  </SelectContent>
                </Select>

                {/* Donor Selector */}
                <Select value={selectedDonor} onValueChange={setSelectedDonor}>
                  <SelectTrigger className="w-[180px] bg-slate-100 border-slate-200 text-slate-800">
                    <SelectValue placeholder="All Donors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Donors</SelectItem>
                    <SelectItem value="unicef">UNICEF</SelectItem>
                    <SelectItem value="worldbank">World Bank</SelectItem>
                    <SelectItem value="usaid">USAID</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sector Dropdown */}
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger className="w-[180px] bg-slate-100 border-slate-200 text-slate-800">
                    <SelectValue placeholder="All Sectors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="water">Water & Sanitation</SelectItem>
                  </SelectContent>
                </Select>

                <div className="ml-auto flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    className="border-slate-200 text-slate-600"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-slate-200 text-slate-600"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Dashboard Content */}
            <div className="max-w-7xl mx-auto p-6 space-y-6">
              {/* Section 1: KPI Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((kpi, index) => (
                  <Card 
                    key={index} 
                    className="bg-white border-slate-200 hover:shadow-sm transition-shadow"
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 uppercase tracking-wider">
                        {kpi.title}
                      </CardTitle>
                      <kpi.icon className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
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

              {/* Placeholder for other sections - we'll implement these next */}
              <div className="text-slate-600 text-center py-8">
                <p>Dashboard sections loading...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
} 
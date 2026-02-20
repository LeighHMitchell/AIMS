"use client"

import React, { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/hooks/useUser"
import { USER_ROLES } from "@/types/user"
import { getRoleBadgeVariant, getRoleDisplayLabel } from "@/lib/role-badge-utils"
import {
  AlertCircle,
  Shield,
  Building2,
  LayoutDashboard,
  Bookmark,
  ListTodo,
  MapPin,
  ArrowRightLeft,
  ClipboardCheck,
  Briefcase,
  ClipboardList,
  Bell,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardStatsSkeleton } from "@/components/ui/skeleton-loader"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

// Import new dashboard components
import { HeroVisualizationCards } from "@/components/dashboard/HeroVisualizationCards"
import { DashboardHeroCards } from "@/components/dashboard/DashboardHeroCards"
import { RecencyCards } from "@/components/dashboard/RecencyCards"
import { ActionsRequiredPanel } from "@/components/dashboard/ActionsRequiredPanel"
import { OrgActivitiesTable } from "@/components/dashboard/OrgActivitiesTable"
import { OrgTransactionsTable } from "@/components/dashboard/OrgTransactionsTable"
import { OrgActivitiesMap } from "@/components/dashboard/OrgActivitiesMap"
import { OrgSankeyFlow } from "@/components/dashboard/OrgSankeyFlow"
import { BookmarkedActivitiesTable } from "@/components/dashboard/BookmarkedActivitiesTable"
import { BookmarkedOrganizationsTable } from "@/components/dashboard/BookmarkedOrganizationsTable"
import { MissingImagesCard } from "@/components/dashboard/MissingImagesCard"
import { FocalPointCheckCard } from "@/components/dashboard/FocalPointCheckCard"
import { DataClinicHeader } from "@/components/dashboard/DataClinicHeader"
import { MyPortfolioTab } from "@/components/dashboard/MyPortfolioTab"
import { ValidationRulesCard } from "@/components/data-clinic/ValidationRulesCard"
import { TaskingTab } from "@/components/tasks/TaskingTab"
import { NotificationTabs } from "@/components/NotificationTabs"
import { apiFetch } from '@/lib/api-fetch';

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, permissions, isLoading } = useUser();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  // Sync tab with URL search params (e.g. when navigating from nav bar)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'overview';
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  // Fetch unread notification count for the tab badge
  useEffect(() => {
    if (user?.id) {
      apiFetch(`/api/notifications/user?userId=${user.id}&limit=1`)
        .then(res => res.json())
        .then(data => setUnreadNotificationCount(data.unreadCount || 0))
        .catch(err => console.error('Failed to fetch notification count:', err));
    }
  }, [user?.id]);

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="p-8">
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

              {/* Activity Lists Skeleton */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-white">
                  <CardHeader>
                    <Skeleton className="h-6 w-40 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white">
                  <CardHeader>
                    <Skeleton className="h-6 w-40 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="p-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <Card className="max-w-lg bg-white">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-6 w-6 text-orange-500" />
                    <CardTitle>Please Log In</CardTitle>
                  </div>
                  <CardDescription>
                    You need to be logged in to view your dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => router.push("/login")}>
                    Go to Login
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Orphan user view (no organization assigned)
  if (!user.organizationId) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="p-8">
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

  // Main dashboard view - organization scoped
  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-5" data-tour="dashboard-welcome">
              {/* User Avatar */}
              {user.profilePicture ? (
                <Avatar className="h-24 w-24 ring-2 ring-slate-200">
                  <AvatarImage src={user.profilePicture} alt={user.name} className="object-cover" />
                  <AvatarFallback className="bg-slate-100 text-slate-600 text-2xl font-semibold">
                    {(user.firstName || user.name.split(' ')[0]).slice(0, 1).toUpperCase()}
                    {(user.lastName || user.name.split(' ').slice(-1)[0]).slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-24 w-24 ring-2 ring-slate-200">
                  <AvatarFallback className="bg-slate-100 text-slate-600 text-2xl font-semibold">
                    {(user.firstName || user.name.split(' ')[0]).slice(0, 1).toUpperCase()}
                    {(user.lastName || user.name.split(' ').slice(-1)[0]).slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Text Content */}
              <div>
                {/* Welcome message with role badge on same line */}
                <div className="flex items-center gap-3">
                  <p className="text-2xl text-slate-700">
                    Welcome, <span className="font-semibold">
                      {user.firstName || user.name.split(' ')[0]}
                    </span>
                  </p>
                  {user.role === USER_ROLES.SUPER_USER ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {getRoleDisplayLabel(user.role)}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <p className="font-semibold">Super User Access</p>
                            </div>
                            <p className="text-sm">
                              You have full system access. This dashboard shows data scoped to your organization.
                              Use the Admin panel to view system-wide data.
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleDisplayLabel(user.role)}
                    </Badge>
                  )}
                </div>

                {/* Position and department */}
                {(user.jobTitle || user.department) && (
                  <p className="text-base font-semibold text-slate-700 mt-2">
                    {user.jobTitle && user.department
                      ? <>{user.jobTitle} <span className="text-slate-400 font-normal">&middot;</span> {user.department}</>
                      : user.jobTitle || user.department}
                  </p>
                )}

                {/* Organization info with inline org logo */}
                {user.organization && (
                  <div className="flex items-center gap-2 mt-2">
                    {user.organization.logo ? (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.organization.logo} alt={user.organization.name} className="object-cover" />
                        <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          {user.organization.acronym?.slice(0, 2) || user.organization.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Building2 className="h-5 w-5 text-slate-400 shrink-0" />
                    )}
                    <p className="text-xl font-medium text-slate-900">
                      {user.organization.name}
                      {user.organization.acronym && (
                        <span> ({user.organization.acronym})</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Dashboard Tabs */}
            <Tabs
              value={activeTab}
              className="w-full"
              onValueChange={(value) => {
                setActiveTab(value);
                // Update URL to persist tab selection on refresh
                const url = new URL(window.location.href);
                url.searchParams.set('tab', value);
                router.push(url.pathname + url.search, { scroll: false });
              }}
            >
              <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap" data-tour="dashboard-tabs">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="my-portfolio"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Briefcase className="h-4 w-4" />
                  My Portfolio
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                  {unreadNotificationCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-xs">
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="activities"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <ListTodo className="h-4 w-4" />
                  Activities
                </TabsTrigger>
                <TabsTrigger
                  value="locations"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <MapPin className="h-4 w-4" />
                  Locations
                </TabsTrigger>
                <TabsTrigger
                  value="flows"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Aid Flows
                </TabsTrigger>
                <TabsTrigger
                  value="data-clinic"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Validation Rules Check
                </TabsTrigger>
                <TabsTrigger
                  value="bookmarks"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Bookmark className="h-4 w-4" />
                  Bookmarks
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <ClipboardList className="h-4 w-4" />
                  Tasking
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab Content */}
              <TabsContent value="overview" className="space-y-6">
                {/* Row 1: Dashboard Hero Cards (dual-metric cards) */}
                <div data-tour="hero-cards">
                  <DashboardHeroCards organizationId={user.organizationId} userId={user.id} />
                </div>

                {/* Row 2: Hero Visualization Cards (charts) */}
                <div data-tour="hero-charts">
                  <HeroVisualizationCards organizationId={user.organizationId} />
                </div>

                {/* Row 3: Recency Cards */}
                <div data-tour="recency-cards">
                  <RecencyCards organizationId={user.organizationId} />
                </div>

                {/* Row 4: Actions Required Panel (Highest Priority) */}
                <div data-tour="actions-required">
                <ActionsRequiredPanel
                  organizationId={user.organizationId}
                  userId={user.id}
                />
                </div>

                {/* Row 5: Transactions Table */}
                <div data-tour="org-transactions">
                  <OrgTransactionsTable organizationId={user.organizationId} />
                </div>
              </TabsContent>

              {/* My Portfolio Tab Content */}
              <TabsContent value="my-portfolio" className="space-y-6">
                <MyPortfolioTab userId={user.id} organizationId={user.organizationId} />
              </TabsContent>

              {/* Activities Tab Content */}
              <TabsContent value="activities" className="space-y-6">
                {/* Main Activities Table */}
                <OrgActivitiesTable
                  organizationId={user.organizationId}
                  variant="main"
                />

                {/* Recently Edited and Closing Soon */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <OrgActivitiesTable
                    organizationId={user.organizationId}
                    variant="recently_edited"
                  />
                  <OrgActivitiesTable
                    organizationId={user.organizationId}
                    variant="closing_soon"
                  />
                </div>
              </TabsContent>

              {/* Locations Tab Content */}
              <TabsContent value="locations" className="space-y-6">
                <OrgActivitiesMap organizationId={user.organizationId} />
              </TabsContent>

              {/* Aid Flows Tab Content */}
              <TabsContent value="flows" className="space-y-6">
                <OrgSankeyFlow organizationId={user.organizationId} />
              </TabsContent>

              {/* Validation Rules Check Tab Content */}
              <TabsContent value="data-clinic" className="space-y-6">
                <ValidationRulesCard organizationId={user.organizationId} />
              </TabsContent>

              {/* Bookmarks Tab Content */}
              <TabsContent value="bookmarks">
                <Tabs defaultValue="activities" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="activities">Activities</TabsTrigger>
                    <TabsTrigger value="organizations">Organizations</TabsTrigger>
                  </TabsList>
                  <TabsContent value="activities">
                    <BookmarkedActivitiesTable />
                  </TabsContent>
                  <TabsContent value="organizations">
                    <BookmarkedOrganizationsTable userId={user.id} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Tasks Tab Content */}
              <TabsContent value="tasks" className="space-y-6">
                <TaskingTab
                  userId={user.id}
                  canCreateTasks={user.role === USER_ROLES.SUPER_USER || permissions?.canManageOrganizations}
                  canViewAnalytics={user.role === USER_ROLES.SUPER_USER || permissions?.canManageOrganizations}
                />
              </TabsContent>

              {/* Notifications Tab Content */}
              <TabsContent value="notifications" className="space-y-6">
                <NotificationTabs userId={user.id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

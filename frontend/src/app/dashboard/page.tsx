"use client"

import React, { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
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
  MapPin,
  ArrowRightLeft,
  ClipboardCheck,
  Briefcase,
  ClipboardList,
  Bell,
  Users,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardStatsSkeleton } from "@/components/ui/skeleton-loader"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

// Import new dashboard components
import { HeroVisualizationCards } from "@/components/dashboard/HeroVisualizationCards"
import { DashboardHeroCards } from "@/components/dashboard/DashboardHeroCards"
import { RecencyCards } from "@/components/dashboard/RecencyCards"
import { ActionsRequiredPanel } from "@/components/dashboard/ActionsRequiredPanel"
import { OrgFinancialTabs } from "@/components/dashboard/OrgFinancialTabs"
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
import { MyTeamTab } from "@/components/dashboard/MyTeamTab"
import { useNotificationCount } from '@/hooks/use-notification-count';
import { isVisitorUser, VISITOR_BLOCKED_DASHBOARD_TABS } from '@/lib/visitor';

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, permissions, isLoading } = useUser();
  const { data: unreadNotificationCount = 0 } = useNotificationCount(user?.id);

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  const isVisitor = isVisitorUser(user);

  // Sync tab with URL search params (e.g. when navigating from nav bar)
  // For visitors, force blocked tabs to 'overview'
  useEffect(() => {
    let tabFromUrl = searchParams.get('tab') || 'overview';
    if (isVisitor && VISITOR_BLOCKED_DASHBOARD_TABS.includes(tabFromUrl)) {
      tabFromUrl = 'overview';
    }
    setActiveTab(tabFromUrl);
  }, [searchParams, isVisitor]);

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="p-8">
            <div className="space-y-6">
              {/* Header Skeleton - matches actual avatar + welcome + org layout */}
              <div className="flex items-center gap-6 pb-2">
                <Skeleton className="h-[88px] w-[88px] rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-6 w-20 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-5 w-72" />
                  </div>
                </div>
              </div>

              {/* Tab bar skeleton */}
              <div className="flex gap-1 border rounded-lg p-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-24 rounded-md" />
                ))}
              </div>

              {/* Stats Grid Skeleton */}
              <DashboardStatsSkeleton />

              {/* Visualization Cards Skeleton */}
              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-8 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-[120px] w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recency Cards Skeleton */}
              <div className="grid gap-6 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-36 mb-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
              <Card className="max-w-lg bg-card">
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

  // Orphan user view (no organization assigned) — skip for visitors
  if (!user.organizationId && !isVisitor) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="p-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <Card className="max-w-lg bg-card">
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
                  <p className="text-body text-muted-foreground">
                    Please contact your system administrator to be assigned to an organization.
                    Once assigned, you'll have access to create and manage aid activities.
                  </p>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-body text-orange-800">
                      <strong>What you can do now:</strong>
                    </p>
                    <ul className="list-disc list-inside text-body text-orange-700 mt-2 space-y-1">
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
            <div className="flex items-center gap-6 pb-2" data-tour="dashboard-welcome">
              {/* User Avatar */}
              <Avatar className="h-[88px] w-[88px] shrink-0 ring-2 ring-border/50 shadow-sm">
                {user.profilePicture ? (
                  <AvatarImage src={user.profilePicture} alt={user.name} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-muted text-muted-foreground text-2xl font-semibold">
                  {(user.firstName || user.name.split(' ')[0]).slice(0, 1).toUpperCase()}
                  {(user.lastName || user.name.split(' ').slice(-1)[0]).slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Text Content */}
              <div className="space-y-1.5 min-w-0">
                {/* Welcome message with role badge on same line */}
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Welcome, <span>
                      {user.firstName || user.name.split(' ')[0]}
                    </span>
                  </h1>
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
                            <p className="text-body">
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
                  <p className="text-base font-medium text-foreground">
                    {user.jobTitle && user.department
                      ? <>{user.jobTitle} <span>&middot;</span> {user.department}</>
                      : user.jobTitle || user.department}
                  </p>
                )}

                {/* Organization info */}
                {user.organization && (
                  <p className="text-base font-medium text-foreground">
                    {user.organization.name}
                    {user.organization.acronym && (
                      <span> ({user.organization.acronym})</span>
                    )}
                  </p>
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
              {(() => {
                const primaryTabs = [
                  { value: 'overview', label: 'Overview', icon: LayoutDashboard, show: true },
                  { value: 'my-portfolio', label: 'My Portfolio', icon: Briefcase, show: !isVisitor },
                  { value: 'locations', label: 'Locations', icon: MapPin, show: true },
                  { value: 'flows', label: 'Aid Flows', icon: ArrowRightLeft, show: true },
                  { value: 'data-clinic', label: 'Data Quality', icon: ClipboardCheck, show: true },
                ].filter((t) => t.show);
                const overflowTabs = [
                  { value: 'my-team', label: 'My Team', icon: Users, show: !isVisitor },
                  { value: 'notifications', label: 'Notifications', icon: Bell, show: !isVisitor, badge: unreadNotificationCount },
                  { value: 'bookmarks', label: 'Bookmarks', icon: Bookmark, show: !isVisitor },
                  { value: 'tasks', label: 'Tasking', icon: ClipboardList, show: !isVisitor },
                ].filter((t) => t.show);
                const activeOverflow = overflowTabs.find((t) => t.value === activeTab);
                const overflowUnread = overflowTabs.reduce(
                  (sum, t) => sum + (t.badge ?? 0),
                  0,
                );
                return (
                  <TabsList
                    className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap"
                    data-tour="dashboard-tabs"
                  >
                    {primaryTabs.map((t) => {
                      const Icon = t.icon;
                      return (
                        <TabsTrigger
                          key={t.value}
                          value={t.value}
                          className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                        >
                          <Icon className="h-4 w-4" />
                          {t.label}
                        </TabsTrigger>
                      );
                    })}
                    {overflowTabs.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                              activeOverflow
                                ? "bg-muted text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {activeOverflow ? (
                              <>
                                {(() => {
                                  const Icon = activeOverflow.icon;
                                  return <Icon className="h-4 w-4" />;
                                })()}
                                {activeOverflow.label}
                              </>
                            ) : (
                              <>
                                <MoreHorizontal className="h-4 w-4" />
                                More
                              </>
                            )}
                            {!activeOverflow && overflowUnread > 0 && (
                              <Badge
                                variant="destructive"
                                className="h-5 min-w-5 px-1 text-helper justify-center"
                              >
                                {overflowUnread > 99 ? '99+' : overflowUnread}
                              </Badge>
                            )}
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[12rem]">
                          {overflowTabs.map((t) => {
                            const Icon = t.icon;
                            return (
                              <DropdownMenuItem
                                key={t.value}
                                onSelect={() => {
                                  setActiveTab(t.value);
                                  const url = new URL(window.location.href);
                                  url.searchParams.set('tab', t.value);
                                  router.push(url.pathname + url.search, { scroll: false });
                                }}
                                className={cn(
                                  "flex items-center gap-2",
                                  activeTab === t.value && 'bg-muted font-medium',
                                )}
                              >
                                <Icon className="h-4 w-4" />
                                <span className="flex-1">{t.label}</span>
                                {(t.badge ?? 0) > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="ml-auto h-5 min-w-5 px-1 text-helper justify-center"
                                  >
                                    {(t.badge ?? 0) > 99 ? '99+' : t.badge}
                                  </Badge>
                                )}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TabsList>
                );
              })()}

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

                {/* Row 5: Organisation Financial Data Tabs */}
                <div data-tour="org-financial-data">
                  <OrgFinancialTabs organizationId={user.organizationId} userId={user.id} context="overview" />
                </div>
              </TabsContent>

              {/* My Portfolio Tab Content */}
              <TabsContent value="my-portfolio" className="space-y-6">
                <MyPortfolioTab userId={user.id} organizationId={user.organizationId} />
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

              {/* My Team Tab Content */}
              <TabsContent value="my-team" className="space-y-6">
                <MyTeamTab organizationId={user.organizationId} />
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

"use client"

import React from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/useUser"
import { USER_ROLES } from "@/types/user"
import { getRoleBadgeVariant, getRoleDisplayLabel } from "@/lib/role-badge-utils"
import {
  Plus,
  AlertCircle,
  Shield,
  Building2,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardStatsSkeleton } from "@/components/ui/skeleton-loader"

// Import new dashboard components
import { OrgSummaryCards } from "@/components/dashboard/OrgSummaryCards"
import { RecencyCards } from "@/components/dashboard/RecencyCards"
import { ActionsRequiredPanel } from "@/components/dashboard/ActionsRequiredPanel"
import { OrgActivitiesTable } from "@/components/dashboard/OrgActivitiesTable"
import { OrgTransactionsTable } from "@/components/dashboard/OrgTransactionsTable"
import { OrgActivitiesMap } from "@/components/dashboard/OrgActivitiesMap"
import { OrgSankeyFlow } from "@/components/dashboard/OrgSankeyFlow"

export default function Dashboard() {
  const router = useRouter();
  const { user, permissions, isLoading } = useUser();

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-slate-50">
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
        <div className="min-h-screen bg-slate-50">
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
        <div className="min-h-screen bg-slate-50">
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
      <div className="min-h-screen bg-slate-50">
        <div className="p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-muted-foreground">Welcome back, {user.name}</p>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleDisplayLabel(user.role)}
                  </Badge>
                </div>
                {user.organization && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                    <Building2 className="h-4 w-4" />
                    <span>{user.organization.name}</span>
                  </div>
                )}
              </div>
              {permissions.canCreateActivities && (
                <Button onClick={() => router.push("/activities/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Activity
                </Button>
              )}
            </div>

            {/* Super User Alert */}
            {user.role === USER_ROLES.SUPER_USER && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-800">Super User Access</p>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  You have full system access. This dashboard shows data scoped to your organization.
                  Use the Admin panel to view system-wide data.
                </p>
              </div>
            )}

            {/* Row 1: Summary Cards */}
            <OrgSummaryCards organizationId={user.organizationId} />

            {/* Row 2: Recency Cards */}
            <RecencyCards organizationId={user.organizationId} />

            {/* Row 3: Actions Required Panel (Highest Priority) */}
            <ActionsRequiredPanel
              organizationId={user.organizationId}
              userId={user.id}
            />

            {/* Row 4: Activity Lists Grid */}
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

            {/* Row 5: Main Activities Table */}
            <OrgActivitiesTable
              organizationId={user.organizationId}
              variant="main"
            />

            {/* Row 6: Transactions Table */}
            <OrgTransactionsTable organizationId={user.organizationId} />

            {/* Row 7: Visualizations Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              <OrgActivitiesMap organizationId={user.organizationId} />
              <OrgSankeyFlow organizationId={user.organizationId} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

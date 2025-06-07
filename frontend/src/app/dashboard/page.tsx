"use client"

import React, { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/useUser"
import { USER_ROLES, ROLE_LABELS } from "@/types/user"
import { format } from "date-fns"
import { ActivityFeed } from "@/components/ActivityFeed"
import { ContributionHeatmap } from "@/components/ContributionHeatmap"
import { 
  Activity, 
  FileText, 
  Calendar, 
  Plus, 
  ArrowRight, 
  Users, 
  Building2, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign
} from "lucide-react"

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

export default function Dashboard() {
  const router = useRouter();
  const { user, permissions } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pendingValidations, setPendingValidations] = useState<Activity[]>([]);

  useEffect(() => {
    // Fetch activities
    const fetchActivities = async () => {
      try {
        const res = await fetch("/api/activities");
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
          
          // Filter activities that need validation based on user role
          if (user?.role === USER_ROLES.DEV_PARTNER_TIER_1 || user?.role === USER_ROLES.GOV_PARTNER_TIER_1) {
            const pending = data.filter((a: Activity) => 
              a.organizationId === user.organizationId && a.needsValidation
            );
            setPendingValidations(pending);
          }
        }
      } catch (error) {
        console.error("Failed to fetch activities:", error);
      }
    };

    fetchActivities();
  }, [user]);

  // Orphan user view
  if (user?.role === USER_ROLES.ORPHAN) {
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
                  <Calendar className="h-4 w-4 text-muted-foreground" />
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

            {/* Contribution Heatmap */}
            <ContributionHeatmap 
              defaultFilterType={permissions.canViewAllActivities ? 'all' : 'user'} 
              showFilterToggle={true}
            />

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
          </div>
        </div>
      </div>
    </MainLayout>
  )
} 
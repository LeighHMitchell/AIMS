"use client"

import React from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useUser } from "@/hooks/useUser"
import { useMyPortfolioData } from "@/hooks/useMyPortfolioData"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Activity, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  FileText,
  AlertCircle,
  Clock,
  Database,
  CheckCircle,
  XCircle,
  Users,
  Loader2
} from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { SectorDistributionChart } from "@/components/charts/SectorDistributionChart"
import { ActivityTimelineHeatmap } from "@/components/charts/ActivityTimelineHeatmap"

export default function MyPortfolioPage() {
  const { user } = useUser()
  const { data, loading: isLoading, error } = useMyPortfolioData()

  if (!user) {
    return null
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold mb-2">Error Loading Portfolio</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  if (isLoading || !data) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Portfolio</h1>
            <p className="text-muted-foreground mt-2">Loading your portfolio data...</p>
          </div>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Portfolio</h1>
          <p className="text-muted-foreground mt-2">
            Overview of all activities you have personally entered into the system
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalActivities}</div>
              <p className="text-xs text-muted-foreground">Created by you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.summary.totalBudget)}</div>
              <p className="text-xs text-muted-foreground">Sum of budgets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planned Disbursements</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.summary.totalPlannedDisbursements)}</div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commitments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.summary.totalCommitments)}</div>
              <p className="text-xs text-muted-foreground">Type 11</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disbursements</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.summary.totalDisbursements)}</div>
              <p className="text-xs text-muted-foreground">Type 3</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expenditure</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.summary.totalExpenditure)}</div>
              <p className="text-xs text-muted-foreground">Type 4</p>
            </CardContent>
          </Card>
        </div>

        {/* Smart Filter Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Pipeline Past Start */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Pipeline but Past Expected Start</CardTitle>
                <Badge variant="destructive">{data.pipelinePastStart.length}</Badge>
              </div>
              <CardDescription>Activities that should have started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.pipelinePastStart.slice(0, 3).map((activity) => (
                  <Link key={activity.id} href={`/activities/${activity.id}`}>
                    <div className="text-sm space-y-1 p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                      <p className="font-medium">{activity.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="h-3 w-3" />
                        <span>Expected: {new Date(activity.expectedStart).toLocaleDateString()}</span>
                        <Badge variant="secondary" className="h-5">Pipeline</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inactive 90+ Days */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Inactive for 90+ Days</CardTitle>
                <Badge variant="warning">{data.inactive90Days.length}</Badge>
              </div>
              <CardDescription>Activities needing updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.inactive90Days.slice(0, 3).map((activity) => (
                  <Link key={activity.id} href={`/activities/${activity.id}`}>
                    <div className="text-sm space-y-1 p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                      <p className="font-medium">{activity.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Last updated: {new Date(activity.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Missing Required Data */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Missing Required Data</CardTitle>
                <Badge variant="outline">
                  {Object.values(data.missingData).flat().length}
                </Badge>
              </div>
              <CardDescription>Activities with incomplete information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.missingData).map(([field, activities]) => (
                  activities.length > 0 && (
                    <div key={field} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Database className="h-3 w-3" />
                        <span>Missing {field}</span>
                        <Badge variant="secondary" className="h-4 px-1">{activities.length}</Badge>
                      </div>
                      <div className="text-xs space-y-0.5 pl-5">
                        {activities.slice(0, 2).map((title: string, idx: number) => (
                          <p key={idx} className="truncate">{title}</p>
                        ))}
                        {activities.length > 2 && (
                          <p className="text-muted-foreground">+{activities.length - 2} more</p>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Additional Sections */}
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="sectors">Sectors</TabsTrigger>
            <TabsTrigger value="validation">Validation Status</TabsTrigger>
            <TabsTrigger value="participating">Participating Org</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>Coverage of your activities over time</CardDescription>
              </CardHeader>
              <CardContent className="h-96 overflow-y-auto">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <ActivityTimelineHeatmap activities={data.activityTimeline} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sectors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sector Distribution</CardTitle>
                <CardDescription>Activities grouped by DAC 3-digit sector codes</CardDescription>
              </CardHeader>
              <CardContent className="h-64 overflow-y-auto">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <SectorDistributionChart data={data.sectorDistribution} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Government Review Status</CardTitle>
                <CardDescription>Track validation progress of your activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Validated</span>
                    </div>
                    <Badge variant="success">{data.validationStatus.validated} activities</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">Pending Review</span>
                    </div>
                    <Badge variant="warning">{data.validationStatus.pending} activities</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Rejected</span>
                    </div>
                    <Badge variant="destructive">{data.validationStatus.rejected} activities</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participating" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activities Where Your Organization Participates</CardTitle>
                <CardDescription>Activities reported by others that include your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.participatingOrgActivities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No activities found where your organization is a participant
                    </p>
                  ) : (
                    data.participatingOrgActivities.map((activity) => (
                      <Link key={activity.id} href={`/activities/${activity.id}`}>
                        <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{activity.title}</h4>
                            <Badge variant="outline">{activity.role}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Reported by: {activity.reportedBy}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            <Users className="h-3 w-3" />
                            <span>Your role: {activity.role}</span>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
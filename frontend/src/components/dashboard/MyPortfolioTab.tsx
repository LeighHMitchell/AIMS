"use client"

import React, { useState, useEffect } from "react"
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
} from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { ActivityCalendarHeatmap } from "@/components/charts/ActivityCalendarHeatmap"
import { apiFetch } from "@/lib/api-fetch"
import { StaggerContainer, StaggerItem } from "@/components/ui/stagger"
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"

interface MyPortfolioTabProps {
  userId: string
  organizationId: string
}

interface FiscalYearConfig {
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
}

export function MyPortfolioTab({ userId, organizationId }: MyPortfolioTabProps) {
  const { data, loading: isLoading, error } = useMyPortfolioData()
  const [fiscalYearConfig, setFiscalYearConfig] = useState<FiscalYearConfig | undefined>(undefined)

  // Fetch the org's default fiscal year config
  useEffect(() => {
    apiFetch('/api/custom-years')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          const defaultYear = result.data.find((cy: any) => cy.isDefault)
          if (defaultYear) {
            setFiscalYearConfig({
              startMonth: defaultYear.startMonth,
              startDay: defaultYear.startDay,
              endMonth: defaultYear.endMonth,
              endDay: defaultYear.endDay,
            })
          }
        }
      })
      .catch(err => console.error('[MyPortfolio] Failed to fetch custom years:', err))
  }, [])

  if (error) {
    return (
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
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        {/* Description skeleton */}
        <Skeleton className="h-5 w-96" />

        {/* Summary cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Smart filter cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-8" />
                </div>
                <Skeleton className="h-4 w-40 mt-1" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-96" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-muted-foreground">
        Overview of all activities you have personally entered into the system
      </p>

      {/* Summary Cards */}
      <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StaggerItem>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <HelpTextTooltip size="sm" content="Total number of activities you have created or are assigned to in the system." />
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalActivities}</div>
            <p className="text-xs text-muted-foreground">Created by you</p>
          </CardContent>
        </Card>
        </StaggerItem>

        <StaggerItem>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
              <HelpTextTooltip size="sm" content="Combined budget across all your activities, converted to USD." />
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">Sum of budgets (USD)</p>
          </CardContent>
        </Card>
        </StaggerItem>

        <StaggerItem>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium">Planned Disbursements</CardTitle>
              <HelpTextTooltip size="sm" content="Total value of planned disbursement transactions across your activities, in USD." />
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalPlannedDisbursements)}</div>
            <p className="text-xs text-muted-foreground">Planned total (USD)</p>
          </CardContent>
        </Card>
        </StaggerItem>

        <StaggerItem>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium">Commitments</CardTitle>
              <HelpTextTooltip size="sm" content="Total value of commitment transactions across your activities, in USD." />
            </div>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalCommitments)}</div>
            <p className="text-xs text-muted-foreground">Committed total (USD)</p>
          </CardContent>
        </Card>
        </StaggerItem>

        <StaggerItem>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium">Disbursements</CardTitle>
              <HelpTextTooltip size="sm" content="Total value of disbursement transactions across your activities, in USD." />
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalDisbursements)}</div>
            <p className="text-xs text-muted-foreground">Disbursed total (USD)</p>
          </CardContent>
        </Card>
        </StaggerItem>

        <StaggerItem>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium">Expenditure</CardTitle>
              <HelpTextTooltip size="sm" content="Total value of expenditure transactions across your activities, in USD." />
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalExpenditure)}</div>
            <p className="text-xs text-muted-foreground">Spent total (USD)</p>
          </CardContent>
        </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Smart Filter Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Pipeline Past Start */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <CardTitle className="text-base">Pipeline but Past Expected Start</CardTitle>
                <HelpTextTooltip size="sm" content="Activities still in &quot;Pipeline&quot; status whose expected start date has already passed. These may need to be updated to &quot;Active&quot; or have their dates revised." />
              </div>
              <Badge variant="secondary">{data.pipelinePastStart.length}</Badge>
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
              <div className="flex items-center gap-1">
                <CardTitle className="text-base">Inactive for 90+ Days</CardTitle>
                <HelpTextTooltip size="sm" content="Activities that haven't been updated in over 90 days. Consider reviewing these to ensure they're still current." />
              </div>
              <Badge variant="secondary">{data.inactive90Days.length}</Badge>
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
              <div className="flex items-center gap-1">
                <CardTitle className="text-base">Missing Required Data</CardTitle>
                <HelpTextTooltip size="sm" content="Activities that are missing key fields needed for complete IATI reporting. Click a row to go directly to the relevant section in the activity editor." />
              </div>
              <Badge variant="outline">
                {Object.values(data.missingData).flat().length}
              </Badge>
            </div>
            <CardDescription>Activities with incomplete information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs">Activity</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs">Missing Field</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.missingData).flatMap(([field, activities]) => {
                    const fieldLabel: Record<string, string> = {
                      sector: 'Sectors',
                      dates: 'Dates',
                      budget: 'Budget',
                      reportingOrg: 'Reporting Org',
                      iatiId: 'IATI Identifier',
                    }
                    const fieldTab: Record<string, string> = {
                      sector: 'sectors',
                      dates: 'finances',
                      budget: 'finances',
                      reportingOrg: 'partnerships',
                      iatiId: 'finances',
                    }
                    return (activities as Array<{ id: string; title: string }>).map((activity) => (
                      <tr key={`${field}-${activity.id}`} className="border-b last:border-0">
                        <td className="py-1.5 pr-2">
                          <Link
                            href={`/activities/${activity.id}?tab=${fieldTab[field] || 'finances'}`}
                            className="text-primary hover:underline truncate block max-w-[180px]"
                            title={activity.title}
                          >
                            {activity.title}
                          </Link>
                        </td>
                        <td className="py-1.5">
                          <Badge variant="secondary" className="text-xs font-normal">
                            {fieldLabel[field] || field}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  })}
                  {Object.values(data.missingData).flat().length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-muted-foreground text-xs">
                        No missing data found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-1">
            <CardTitle>System Activity</CardTitle>
            <HelpTextTooltip content="Your contribution activity over the past year — including activities created, transactions added, and budgets updated." />
          </div>
          <CardDescription>Your contributions: activities created, transactions added, budgets updated, and more</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityCalendarHeatmap events={data.userActivityEvents || []} fiscalYearConfig={fiscalYearConfig} />
        </CardContent>
      </Card>
    </div>
  )
}

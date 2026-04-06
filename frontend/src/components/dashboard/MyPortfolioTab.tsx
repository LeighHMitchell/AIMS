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
  Maximize2,
  Pencil,
} from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { ActivityCalendarHeatmap } from "@/components/charts/ActivityCalendarHeatmap"
import { apiFetch } from "@/lib/api-fetch"
import { StaggerContainer, StaggerItem } from "@/components/ui/stagger"
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { OrgFinancialTabs } from "./OrgFinancialTabs"

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
  const { data, loading: isLoading, error } = useMyPortfolioData(organizationId)
  const [fiscalYearConfig, setFiscalYearConfig] = useState<FiscalYearConfig | undefined>(undefined)
  const [modalCard, setModalCard] = useState<string | null>(null)

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
              <HelpTextTooltip size="sm" content="Total number of activities you have created in the system." />
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
            <p className="text-xs text-muted-foreground">Created by you</p>
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
            <p className="text-xs text-muted-foreground">Created by you</p>
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
            <p className="text-xs text-muted-foreground">Created by you</p>
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
            <p className="text-xs text-muted-foreground">Created by you</p>
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
            <p className="text-xs text-muted-foreground">Created by you</p>
          </CardContent>
        </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Financial Data Tables */}
      <OrgFinancialTabs organizationId={organizationId} userId={userId} context="portfolio" />

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
              <button onClick={() => setModalCard('pipeline')} className="text-muted-foreground hover:text-foreground transition-colors" title="Expand">
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
            <CardDescription>Activities that should have started</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Activity</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Expected Start</th>
                </tr>
              </thead>
              <tbody>
                {data.pipelinePastStart.slice(0, 3).map((activity) => (
                  <tr key={activity.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">
                      <Link href={`/activities/${activity.id}`} className="text-primary hover:underline line-clamp-2 block" title={activity.title}>
                        {activity.title}
                      </Link>
                    </td>
                    <td className="py-1.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(activity.expectedStart).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {data.pipelinePastStart.length === 0 && (
                  <tr><td colSpan={2} className="py-4 text-center text-muted-foreground text-xs">No activities found</td></tr>
                )}
              </tbody>
            </table>
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
              <button onClick={() => setModalCard('inactive')} className="text-muted-foreground hover:text-foreground transition-colors" title="Expand">
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
            <CardDescription>Activities needing updates</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Activity</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.inactive90Days.slice(0, 3).map((activity) => (
                  <tr key={activity.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">
                      <Link href={`/activities/${activity.id}`} className="text-primary hover:underline line-clamp-2 block" title={activity.title}>
                        {activity.title}
                      </Link>
                    </td>
                    <td className="py-1.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(activity.lastUpdated).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {data.inactive90Days.length === 0 && (
                  <tr><td colSpan={2} className="py-4 text-center text-muted-foreground text-xs">No activities found</td></tr>
                )}
              </tbody>
            </table>
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
              <button onClick={() => setModalCard('missing')} className="text-muted-foreground hover:text-foreground transition-colors" title="Expand">
                <Maximize2 className="h-4 w-4" />
              </button>
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
                    <th className="pb-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.missingData).flatMap(([field, activities]) => {
                    const fieldLabel: Record<string, string> = {
                      sector: 'Sectors', dates: 'Dates', budget: 'Budget',
                      reportingOrg: 'Reporting Org', iatiId: 'IATI Identifier',
                    }
                    const fieldTab: Record<string, string> = {
                      sector: 'sectors', dates: 'finances', budget: 'finances',
                      reportingOrg: 'partnerships', iatiId: 'finances',
                    }
                    return (activities as Array<{ id: string; title: string }>).slice(0, 5).map((activity) => (
                      <tr key={`${field}-${activity.id}`} className="border-b last:border-0">
                        <td className="py-1.5 pr-2">
                          <span className="line-clamp-2 block text-foreground" title={activity.title}>
                            {activity.title}
                          </span>
                        </td>
                        <td className="py-1.5 text-xs text-muted-foreground">
                          {fieldLabel[field] || field}
                        </td>
                        <td className="py-1.5 pl-2">
                          <Link href={`/activities/${activity.id}?tab=${fieldTab[field] || 'finances'}`} className="text-muted-foreground hover:text-foreground" title="Edit activity">
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  })}
                  {Object.values(data.missingData).flat().length === 0 && (
                    <tr><td colSpan={3} className="py-4 text-center text-muted-foreground text-xs">No missing data found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expand Modals */}
      <Dialog open={modalCard === 'pipeline'} onOpenChange={(open) => !open && setModalCard(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4">
            <DialogTitle>Pipeline but Past Expected Start</DialogTitle>
            <DialogDescription>Activities still in Pipeline status whose expected start date has passed</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Activity</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Expected Start</th>
                </tr>
              </thead>
              <tbody>
                {data.pipelinePastStart.map((activity) => (
                  <tr key={activity.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <Link href={`/activities/${activity.id}`} className="text-primary hover:underline">
                        {activity.title}
                      </Link>
                    </td>
                    <td className="py-2 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(activity.expectedStart).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {data.pipelinePastStart.length === 0 && (
                  <tr><td colSpan={2} className="py-8 text-center text-muted-foreground">No activities found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalCard === 'inactive'} onOpenChange={(open) => !open && setModalCard(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4">
            <DialogTitle>Inactive for 90+ Days</DialogTitle>
            <DialogDescription>Activities that haven't been updated in over 90 days</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Activity</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.inactive90Days.map((activity) => (
                  <tr key={activity.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <Link href={`/activities/${activity.id}`} className="text-primary hover:underline">
                        {activity.title}
                      </Link>
                    </td>
                    <td className="py-2 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(activity.lastUpdated).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {data.inactive90Days.length === 0 && (
                  <tr><td colSpan={2} className="py-8 text-center text-muted-foreground">No activities found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalCard === 'missing'} onOpenChange={(open) => !open && setModalCard(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4">
            <DialogTitle>Missing Required Data</DialogTitle>
            <DialogDescription>Activities with incomplete information needed for IATI reporting</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Activity</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Missing Field</th>
                  <th className="pb-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.missingData).flatMap(([field, activities]) => {
                  const fieldLabel: Record<string, string> = {
                    sector: 'Sectors', dates: 'Dates', budget: 'Budget',
                    reportingOrg: 'Reporting Org', iatiId: 'IATI Identifier',
                  }
                  const fieldTab: Record<string, string> = {
                    sector: 'sectors', dates: 'finances', budget: 'finances',
                    reportingOrg: 'partnerships', iatiId: 'finances',
                  }
                  return (activities as Array<{ id: string; title: string }>).map((activity) => (
                    <tr key={`${field}-${activity.id}`} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-foreground">
                        {activity.title}
                      </td>
                      <td className="py-2 text-sm text-muted-foreground">
                        {fieldLabel[field] || field}
                      </td>
                      <td className="py-2 pl-2">
                        <Link href={`/activities/${activity.id}?tab=${fieldTab[field] || 'finances'}`} className="text-muted-foreground hover:text-foreground" title="Edit activity">
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                })}
                {Object.values(data.missingData).flat().length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">No missing data found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

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

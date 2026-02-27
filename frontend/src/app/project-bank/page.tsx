"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FolderKanban, TrendingUp, AlertTriangle, DollarSign } from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { apiFetch } from "@/lib/api-fetch"
import { formatCurrency, STATUS_LABELS, STATUS_BADGE_VARIANT, PATHWAY_LABELS } from "@/lib/project-bank-utils"
import { CHART_STRUCTURE_COLORS, CHART_COLOR_PALETTE } from "@/lib/chart-colors"
import type { ProjectBankStats } from "@/types/project-bank"

const STATUS_COLORS: Record<string, string> = {
  nominated: CHART_COLOR_PALETTE[2],   // Cool Steel
  screening: CHART_COLOR_PALETTE[1],   // Blue Slate
  appraisal: CHART_COLOR_PALETTE[1],   // Blue Slate
  approved: CHART_COLOR_PALETTE[1],    // Blue Slate
  implementation: CHART_COLOR_PALETTE[0], // Scarlet
  completed: CHART_COLOR_PALETTE[3],   // Pale Slate
}

const PATHWAY_CHART_COLORS: Record<string, string> = {
  oda: CHART_COLOR_PALETTE[0],
  ppp: CHART_COLOR_PALETTE[1],
  private_supported: CHART_COLOR_PALETTE[2],
  private_unsupported: CHART_COLOR_PALETTE[3],
  domestic_budget: CHART_COLOR_PALETTE[2],
}

const formatAxisCurrency = (value: number): string => {
  if (value >= 1_000_000_000) return `$${Math.round(value / 1_000_000_000)}b`
  if (value >= 1_000_000) return `$${Math.round(value / 1_000_000)}m`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`
  return `$${Math.round(value)}`
}

const formatFullCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

export default function ProjectBankDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<ProjectBankStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await apiFetch("/api/project-bank/stats")
        if (res.ok) {
          setStats(await res.json())
        }
      } catch {
        // handle error
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const heroCards = stats ? [
    { label: "Total Projects", value: stats.totalProjects, icon: FolderKanban },
    { label: "Active Projects", value: stats.activeProjects, icon: TrendingUp },
    { label: "Total Pipeline Value", value: formatCurrency(stats.totalPipelineValue), icon: DollarSign },
    { label: "Funding Gap", value: formatCurrency(stats.fundingGap), icon: AlertTriangle },
  ] : []

  const statusOrder = ['nominated', 'screening', 'appraisal', 'approved', 'implementation', 'completed'] as const

  // Build Recharts data for Pipeline Status
  const pipelineData = stats
    ? statusOrder.map(status => ({
        name: STATUS_LABELS[status],
        count: stats.byStatus[status] || 0,
        fill: STATUS_COLORS[status] || CHART_COLOR_PALETTE[2],
      }))
    : []

  // Build Recharts data for Pathway Breakdown
  const pathwayData = stats
    ? stats.byPathway.map(item => ({
        name: PATHWAY_LABELS[item.pathway] || item.pathway,
        value: item.value,
        count: item.count,
        fill: PATHWAY_CHART_COLORS[item.pathway] || CHART_COLOR_PALETTE[2],
      }))
    : []

  // Build Recharts data for Sector horizontal bar chart
  const sectorData = stats
    ? stats.bySector
        .sort((a, b) => b.value - a.value)
        .map(item => ({
          name: item.sector,
          value: item.value,
          count: item.count,
        }))
    : []

  // Pipeline Status tooltip
  const PipelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[140px]">
          <p className="font-medium text-foreground text-sm mb-1">{label}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{payload[0].value}</span> projects
          </p>
        </div>
      )
    }
    return null
  }

  // Pathway tooltip
  const PathwayTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[160px]">
          <p className="font-medium text-foreground text-sm mb-1">{label}</p>
          <p className="text-sm text-muted-foreground">
            Value: <span className="font-semibold text-foreground">{formatFullCurrency(payload[0].value)}</span>
          </p>
          {payload[0]?.payload?.count !== undefined && (
            <p className="text-sm text-muted-foreground">
              Projects: <span className="font-semibold text-foreground">{payload[0].payload.count}</span>
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // Sector tooltip
  const SectorTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[160px]">
          <p className="font-medium text-foreground text-sm mb-1">{label}</p>
          <p className="text-sm text-muted-foreground">
            Value: <span className="font-semibold text-foreground">{formatFullCurrency(payload[0].value)}</span>
          </p>
          {payload[0]?.payload?.count !== undefined && (
            <p className="text-sm text-muted-foreground">
              Projects: <span className="font-semibold text-foreground">{payload[0].payload.count}</span>
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <MainLayout>
      <div className="w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
            <div>
              <h1 className="text-3xl font-bold">Project Bank</h1>
              <p className="text-muted-foreground mt-1">National development project pipeline</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}><CardContent className="p-6"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
            ))}
          </div>
        ) : stats && (
          <>
            {/* Hero Cards — monochrome icons */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {heroCards.map((card) => {
                const Icon = card.icon
                return (
                  <Card key={card.label}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-2xl font-bold">{card.value}</div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Pipeline Status — Recharts horizontal bar chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pipeline Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={pipelineData}
                      layout="vertical"
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
                      <XAxis type="number" stroke={CHART_STRUCTURE_COLORS.axis} fontSize={11} tickLine={false} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke={CHART_STRUCTURE_COLORS.axis}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={100}
                      />
                      <Tooltip content={<PipelineTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                      <Bar dataKey="count" radius={[0, 2, 2, 0]} barSize={20}>
                        {pipelineData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Pathway Breakdown — Recharts horizontal bar chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pathway Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={pathwayData}
                      layout="vertical"
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
                      <XAxis type="number" stroke={CHART_STRUCTURE_COLORS.axis} fontSize={11} tickLine={false} tickFormatter={formatAxisCurrency} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke={CHART_STRUCTURE_COLORS.axis}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={110}
                      />
                      <Tooltip content={<PathwayTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                      <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={20}>
                        {pathwayData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Sector Distribution — Recharts horizontal bar chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Sector</CardTitle>
                </CardHeader>
                <CardContent>
                  {sectorData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={sectorData}
                        layout="vertical"
                        margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                        barCategoryGap="16%"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
                        <XAxis type="number" stroke={CHART_STRUCTURE_COLORS.axis} fontSize={11} tickLine={false} tickFormatter={formatAxisCurrency} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke={CHART_STRUCTURE_COLORS.axis}
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          width={120}
                        />
                        <Tooltip content={<SectorTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                        <Bar dataKey="value" fill={CHART_COLOR_PALETTE[1]} radius={[0, 2, 2, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No sector data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Submissions — Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Submissions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-surface-muted">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Code</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Project</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Sector</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Est. Cost</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stats.recentSubmissions.map((project: any) => (
                        <tr
                          key={project.id}
                          className="hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/project-bank/${project.id}`)}
                        >
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{project.project_code}</td>
                          <td className="px-4 py-2.5 font-medium">{project.name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{project.sector}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(project.estimated_cost)}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant={STATUS_BADGE_VARIANT[project.status as keyof typeof STATUS_BADGE_VARIANT] as any} className="text-[10px]">
                              {STATUS_LABELS[project.status as keyof typeof STATUS_LABELS]}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {stats.recentSubmissions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            No recent submissions
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FolderKanban, TrendingUp, AlertTriangle, DollarSign } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { formatCurrency, STATUS_LABELS, STATUS_BADGE_VARIANT, PATHWAY_LABELS } from "@/lib/project-bank-utils"
import type { ProjectBankStats } from "@/types/project-bank"

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
    { label: "Total Projects", value: stats.totalProjects, icon: FolderKanban, color: "text-blue-600" },
    { label: "Active Projects", value: stats.activeProjects, icon: TrendingUp, color: "text-green-600" },
    { label: "Total Pipeline Value", value: formatCurrency(stats.totalPipelineValue), icon: DollarSign, color: "text-purple-600" },
    { label: "Funding Gap", value: formatCurrency(stats.fundingGap), icon: AlertTriangle, color: "text-red-600" },
  ] : []

  const statusOrder = ['nominated', 'screening', 'appraisal', 'approved', 'implementation', 'completed'] as const

  return (
    <MainLayout>
      <div className="w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <FolderKanban className="h-8 w-8 text-foreground" />
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
            {/* Hero Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {heroCards.map((card) => {
                const Icon = card.icon
                return (
                  <Card key={card.label}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                        <Icon className={`h-5 w-5 ${card.color}`} />
                      </div>
                      <div className="text-2xl font-bold">{card.value}</div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Pipeline Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pipeline Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statusOrder.map((status) => {
                      const count = stats.byStatus[status] || 0
                      const maxCount = Math.max(...statusOrder.map(s => stats.byStatus[s] || 0), 1)
                      const pct = (count / maxCount) * 100
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <div className="w-28 text-sm">
                            <Badge variant={STATUS_BADGE_VARIANT[status] as any}>
                              {STATUS_LABELS[status]}
                            </Badge>
                          </div>
                          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/20 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono w-8 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Pathway Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pathway Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.byPathway.map((item) => {
                      const maxVal = Math.max(...stats.byPathway.map(p => p.value), 1)
                      const pct = (item.value / maxVal) * 100
                      return (
                        <div key={item.pathway} className="flex items-center gap-3">
                          <div className="w-28 text-sm font-medium truncate">
                            {PATHWAY_LABELS[item.pathway] || item.pathway}
                          </div>
                          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-200 dark:bg-purple-800/40 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-16 text-right">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sector Distribution */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">By Sector</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {stats.bySector.sort((a, b) => b.value - a.value).map((item) => (
                    <div key={item.sector} className="p-3 rounded-lg bg-muted/50">
                      <div className="text-sm font-medium">{item.sector}</div>
                      <div className="text-lg font-bold mt-1">{item.count}</div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(item.value)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Submissions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.recentSubmissions.map((project: any) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/project-bank/${project.id}`)}
                    >
                      <div>
                        <div className="text-sm font-medium">{project.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {project.project_code} &middot; {project.sector}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono">{formatCurrency(project.estimated_cost)}</span>
                        <Badge variant={STATUS_BADGE_VARIANT[project.status as keyof typeof STATUS_BADGE_VARIANT] as any}>
                          {STATUS_LABELS[project.status as keyof typeof STATUS_LABELS]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  )
}

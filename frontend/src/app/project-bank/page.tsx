"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FolderKanban, AlertTriangle, DollarSign, Download, ClipboardList, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react"
import { FullPagination } from "@/components/ui/full-pagination"
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
import { HelpTooltip } from "@/components/project-bank/appraisal/HelpTooltip"
import { exportTableToCSV } from "@/lib/csv-export"
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

type ViewMode = 'count' | 'value'

/** Toggle button group for count vs value */
function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden text-helper">
      <button
        className={`px-2 py-0.5 font-medium transition-colors ${mode === 'count' ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
        onClick={() => onChange('count')}
      >
        #
      </button>
      <button
        className={`px-2 py-0.5 font-medium transition-colors ${mode === 'value' ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
        onClick={() => onChange('value')}
      >
        $
      </button>
    </div>
  )
}

export default function ProjectBankDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<ProjectBankStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [pipelineViewMode, setPipelineViewMode] = useState<ViewMode>('count')
  const [pathwayViewMode, setPathwayViewMode] = useState<ViewMode>('value')
  const [sectorViewMode, setSectorViewMode] = useState<ViewMode>('value')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageLimit, setPageLimit] = useState(10)
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
    return sortOrder === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
      : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
  }

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

  const statusOrder = ['nominated', 'screening', 'appraisal', 'approved', 'implementation', 'completed'] as const

  // Projects in Appraisal count (screening + appraisal)
  const projectsInAppraisal = stats
    ? (stats.byStatus['screening']?.count || 0) + (stats.byStatus['appraisal']?.count || 0)
    : 0

  // Build Recharts data for Pipeline Status
  const pipelineData = stats
    ? statusOrder.map(status => ({
        name: STATUS_LABELS[status],
        count: stats.byStatus[status]?.count || 0,
        value: stats.byStatus[status]?.value || 0,
        fill: STATUS_COLORS[status] || CHART_COLOR_PALETTE[2],
      }))
    : []

  // Build Recharts data for Pathway Breakdown
  const pathwayData = stats
    ? [...stats.byPathway]
        .sort((a, b) => pathwayViewMode === 'value' ? b.value - a.value : b.count - a.count)
        .map(item => ({
          name: PATHWAY_LABELS[item.pathway] || item.pathway,
          value: item.value,
          count: item.count,
          fill: PATHWAY_CHART_COLORS[item.pathway] || CHART_COLOR_PALETTE[2],
        }))
    : []

  // Build Recharts data for Sector — top 5 + Other
  const sectorData = (() => {
    if (!stats) return []
    const sorted = [...stats.bySector].sort((a, b) =>
      sectorViewMode === 'value' ? b.value - a.value : b.count - a.count
    )
    if (sorted.length <= 6) {
      return sorted.map(item => ({
        name: item.sector,
        value: item.value,
        count: item.count,
      }))
    }
    const top5 = sorted.slice(0, 5)
    const rest = sorted.slice(5)
    const other = rest.reduce(
      (acc, item) => ({ count: acc.count + item.count, value: acc.value + item.value }),
      { count: 0, value: 0 }
    )
    return [
      ...top5.map(item => ({ name: item.sector, value: item.value, count: item.count })),
      { name: 'Other', value: other.value, count: other.count },
    ]
  })()

  // Pipeline Status tooltip
  const PipelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const entry = payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[160px]">
          <p className="font-medium text-foreground text-body mb-1">{label}</p>
          <p className="text-body text-muted-foreground">
            Projects: <span className="font-semibold text-foreground">{entry.count}</span>
          </p>
          <p className="text-body text-muted-foreground">
            Value: <span className="font-semibold text-foreground">{formatFullCurrency(entry.value)}</span>
          </p>
        </div>
      )
    }
    return null
  }

  // Pathway tooltip
  const PathwayTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const entry = payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[160px]">
          <p className="font-medium text-foreground text-body mb-1">{label}</p>
          <p className="text-body text-muted-foreground">
            Projects: <span className="font-semibold text-foreground">{entry.count}</span>
          </p>
          <p className="text-body text-muted-foreground">
            Value: <span className="font-semibold text-foreground">{formatFullCurrency(entry.value)}</span>
          </p>
        </div>
      )
    }
    return null
  }

  // Sector tooltip
  const SectorTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const entry = payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[160px]">
          <p className="font-medium text-foreground text-body mb-1">{label}</p>
          <p className="text-body text-muted-foreground">
            Projects: <span className="font-semibold text-foreground">{entry.count}</span>
          </p>
          <p className="text-body text-muted-foreground">
            Value: <span className="font-semibold text-foreground">{formatFullCurrency(entry.value)}</span>
          </p>
        </div>
      )
    }
    return null
  }

  // CSV export handlers
  const exportPipelineCSV = () => {
    const data = pipelineData.map(d => ({ stage: d.name, projects: d.count, estimated_cost: d.value }))
    exportTableToCSV(
      data as unknown as Record<string, unknown>[],
      [{ key: 'stage', label: 'Stage' }, { key: 'projects', label: 'Projects' }, { key: 'estimated_cost', label: 'Estimated Cost' }],
      'pipeline-status'
    )
  }

  const exportPathwayCSV = () => {
    const data = pathwayData.map(d => ({ pathway: d.name, projects: d.count, estimated_cost: d.value }))
    exportTableToCSV(
      data as unknown as Record<string, unknown>[],
      [{ key: 'pathway', label: 'Pathway' }, { key: 'projects', label: 'Projects' }, { key: 'estimated_cost', label: 'Estimated Cost' }],
      'pathway-breakdown'
    )
  }

  const exportSectorCSV = () => {
    const data = sectorData.map(d => ({ sector: d.name, projects: d.count, estimated_cost: d.value }))
    exportTableToCSV(
      data as unknown as Record<string, unknown>[],
      [{ key: 'sector', label: 'Sector' }, { key: 'projects', label: 'Projects' }, { key: 'estimated_cost', label: 'Estimated Cost' }],
      'by-sector'
    )
  }

  return (
    <MainLayout>
      <div className="w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Project Bank</h1>
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
              <StatCard label="Total Projects" value={stats.totalProjects} icon={FolderKanban} subtext={`${stats.activeProjects} Active`} />
              <StatCard label="Projects in Appraisal" value={projectsInAppraisal} icon={ClipboardList} />
              <StatCard label="Total Pipeline Value" value={formatCurrency(stats.totalPipelineValue)} icon={DollarSign} />
              <StatCard label="Funding Gap" value={formatCurrency(stats.fundingGap)} icon={AlertTriangle} subtext={`${stats.fundingGapProjects} project${stats.fundingGapProjects !== 1 ? 's' : ''} with gaps`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Pipeline Status */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Pipeline Status
                      <HelpTooltip text="Number of projects at each stage of the appraisal pipeline." />
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      <ViewToggle mode={pipelineViewMode} onChange={setPipelineViewMode} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportPipelineCSV}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
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
                      <XAxis
                        type="number"
                        stroke={CHART_STRUCTURE_COLORS.axis}
                        fontSize={11}
                        tickLine={false}
                        allowDecimals={false}
                        tickFormatter={pipelineViewMode === 'value' ? formatAxisCurrency : undefined}
                      />
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
                      <Bar dataKey={pipelineViewMode} radius={[0, 4, 4, 0]} barSize={20}>
                        {pipelineData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Pathway Breakdown */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Pathway Breakdown
                      <HelpTooltip text="Estimated pipeline value grouped by financing pathway (ODA, PPP, Private, etc.)." />
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      <ViewToggle mode={pathwayViewMode} onChange={setPathwayViewMode} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportPathwayCSV}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
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
                      <XAxis
                        type="number"
                        stroke={CHART_STRUCTURE_COLORS.axis}
                        fontSize={11}
                        tickLine={false}
                        allowDecimals={pathwayViewMode === 'value'}
                        tickFormatter={pathwayViewMode === 'value' ? formatAxisCurrency : undefined}
                      />
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
                      <Bar dataKey={pathwayViewMode} radius={[0, 4, 4, 0]} barSize={20}>
                        {pathwayData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Sector Distribution */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      By Sector
                      <HelpTooltip text="Project distribution across economic sectors, showing top 5 sectors plus a combined 'Other' category." />
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      <ViewToggle mode={sectorViewMode} onChange={setSectorViewMode} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportSectorCSV}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
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
                        <XAxis
                          type="number"
                          stroke={CHART_STRUCTURE_COLORS.axis}
                          fontSize={11}
                          tickLine={false}
                          allowDecimals={sectorViewMode === 'value'}
                          tickFormatter={sectorViewMode === 'value' ? formatAxisCurrency : undefined}
                        />
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
                        <Bar dataKey={sectorViewMode} fill={CHART_COLOR_PALETTE[1]} radius={[0, 4, 4, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-body text-muted-foreground text-center py-8">No sector data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Submissions — Paginated Table */}
            {(() => {
              const allSubmissions = [...stats.recentSubmissions].sort((a: any, b: any) => {
                const getValue = (p: any) => {
                  switch (sortField) {
                    case 'name': return (p.name || '').toLowerCase()
                    case 'sector': return (p.sector || '').toLowerCase()
                    case 'nominating_ministry': return (p.nominating_ministry || '').toLowerCase()
                    case 'project_type': return (p.project_type || '').toLowerCase()
                    case 'region': return (p.region || '').toLowerCase()
                    case 'estimated_start_date': return p.estimated_start_date || ''
                    case 'estimated_cost': return p.estimated_cost || 0
                    case 'status': return p.status || ''
                    case 'created_at': return p.created_at || ''
                    default: return ''
                  }
                }
                const aVal = getValue(a)
                const bVal = getValue(b)
                if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
                if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
                return 0
              })
              const totalItems = allSubmissions.length
              const totalPages = Math.max(1, Math.ceil(totalItems / pageLimit))
              const safePage = Math.min(currentPage, totalPages)
              const startIndex = (safePage - 1) * pageLimit
              const endIndex = Math.min(startIndex + pageLimit, totalItems)
              const pageItems = allSubmissions.slice(startIndex, endIndex)

              return (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recent Submissions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-body">
                          <thead className="bg-surface-muted">
                            <tr className="border-b bg-surface-muted">
                              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('name')}>
                                <div className="flex items-center gap-1">Project Title {getSortIcon('name')}</div>
                              </th>
                              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('sector')}>
                                <div className="flex items-center gap-1">Sector {getSortIcon('sector')}</div>
                              </th>
                              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('nominating_ministry')}>
                                <div className="flex items-center gap-1">Ministry / Agency {getSortIcon('nominating_ministry')}</div>
                              </th>
                              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('project_type')}>
                                <div className="flex items-center gap-1">Project Type {getSortIcon('project_type')}</div>
                              </th>
                              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('region')}>
                                <div className="flex items-center gap-1">State / Region {getSortIcon('region')}</div>
                              </th>
                              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('estimated_start_date')}>
                                <div className="flex items-center gap-1">Estimated Start Date {getSortIcon('estimated_start_date')}</div>
                              </th>
                              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('estimated_cost')}>
                                <div className="flex items-center justify-end gap-1">Estimated Cost {getSortIcon('estimated_cost')}</div>
                              </th>
                              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('status')}>
                                <div className="flex items-center gap-1">Status {getSortIcon('status')}</div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {pageItems.map((project: any) => (
                              <tr
                                key={project.id}
                                className="hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={(e) => {
                                  if (e.metaKey || e.ctrlKey) {
                                    window.open(`/project-bank/${project.id}`, '_blank')
                                  } else {
                                    router.push(`/project-bank/${project.id}`)
                                  }
                                }}
                                onAuxClick={(e) => {
                                  if (e.button === 1) {
                                    window.open(`/project-bank/${project.id}`, '_blank')
                                  }
                                }}
                              >
                                <td className="px-4 py-2.5">
                                  <a href={`/project-bank/${project.id}`} onClick={(e) => e.preventDefault()} className="font-medium">{project.name}</a>
                                  {project.project_code && (
                                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-2">{project.project_code}</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5">
                                  <div>{project.sector}</div>
                                  {project.sub_sector && (
                                    <div className="text-helper text-muted-foreground/70">{project.sub_sector}</div>
                                  )}
                                </td>
                                <td className="px-4 py-2.5">
                                  <div>{project.nominating_ministry || '—'}</div>
                                  {project.implementing_agency && (
                                    <div className="text-helper text-muted-foreground/70">{project.implementing_agency}</div>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-muted-foreground">{project.project_type || '—'}</td>
                                <td className="px-4 py-2.5 text-muted-foreground">{project.region || '—'}</td>
                                <td className="px-4 py-2.5 text-muted-foreground">{project.estimated_start_date ? new Date(project.estimated_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                                <td className="px-4 py-2.5 text-right font-medium">
                                  <span className="text-muted-foreground font-normal text-helper">USD</span>{' '}
                                  {formatCurrency(project.estimated_cost, '').trim()}
                                </td>
                                <td className="px-4 py-2.5">
                                  <Badge variant={STATUS_BADGE_VARIANT[project.status as keyof typeof STATUS_BADGE_VARIANT] as any} className="text-[10px]">
                                    {STATUS_LABELS[project.status as keyof typeof STATUS_LABELS]}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                            {totalItems === 0 && (
                              <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                  No recent submissions
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {totalItems > 0 && (
                    <FullPagination
                      page={safePage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      perPage={pageLimit}
                      onPageChange={setCurrentPage}
                      onPerPageChange={setPageLimit}
                      itemLabel="projects"
                    />
                  )}
                </>
              )
            })()}
          </>
        )}
      </div>
    </MainLayout>
  )
}

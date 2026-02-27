"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Plus, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  Copy, Check, MoreVertical, ListTodo,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiFetch } from "@/lib/api-fetch"
import { useUser } from "@/hooks/useUser"
import {
  formatCurrency, STATUS_LABELS,
  PATHWAY_LABELS, SECTORS,
  FEASIBILITY_STAGE_LABELS, FEASIBILITY_STAGE_BADGE_STYLES,
} from "@/lib/project-bank-utils"
import type { ProjectBankProject, ProjectStatus, FeasibilityStage } from "@/types/project-bank"

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "nominated", label: "Nominated" },
  { value: "screening", label: "Screening" },
  { value: "appraisal", label: "Appraisal" },
  { value: "approved", label: "Approved" },
  { value: "implementation", label: "Implementation" },
]

/** Status → colour-palette badge styles */
const STATUS_BADGE_STYLES: Record<ProjectStatus, { bg: string; text: string; border: string }> = {
  nominated:      { bg: '#f1f4f8', text: '#4c5568', border: '#cfd0d5' },   // Platinum bg, Blue Slate text
  screening:      { bg: '#cfd0d5', text: '#4c5568', border: '#7b95a7' },   // Pale Slate bg, Blue Slate text
  appraisal:      { bg: '#7b95a7', text: '#ffffff', border: '#4c5568' },   // Cool Steel bg, white text
  approved:       { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },   // Blue Slate bg, white text
  implementation: { bg: '#dc2625', text: '#ffffff', border: '#dc2625' },   // Scarlet bg, white text
  completed:      { bg: '#f1f4f8', text: '#7b95a7', border: '#cfd0d5' },   // Platinum bg, Cool Steel text
  rejected:       { bg: '#dc2625', text: '#ffffff', border: '#dc2625' },   // Scarlet bg, white text
}

/** Format cost as "USD 100m" / "USD 1.2b" style */
function formatCostUSD(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}b`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return value.toLocaleString()
}

export default function ProjectListPage() {
  const router = useRouter()
  const { permissions } = useUser()
  const [projects, setProjects] = useState<ProjectBankProject[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [sectorFilter, setSectorFilter] = useState("")
  const [pathwayFilter, setPathwayFilter] = useState("")
  const [originFilter, setOriginFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [sortField, setSortField] = useState<string>("created_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await apiFetch("/api/project-bank")
        if (res.ok) setProjects(await res.json())
      } catch {
        // handle error
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  const copyToClipboard = (text: string, projectId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(projectId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length }
    projects.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1
    })
    return counts
  }, [projects])

  // Filtered & sorted projects
  const filtered = useMemo(() => {
    let list = projects
    if (statusFilter !== "all") list = list.filter(p => p.status === statusFilter)
    if (sectorFilter) list = list.filter(p => p.sector === sectorFilter)
    if (pathwayFilter) list = list.filter(p => p.pathway === pathwayFilter)
    if (originFilter) list = list.filter(p => p.origin === originFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.project_code.toLowerCase().includes(q) ||
        p.nominating_ministry.toLowerCase().includes(q)
      )
    }

    // Sort
    list = [...list].sort((a, b) => {
      const aVal = (a as any)[sortField]
      const bVal = (b as any)[sortField]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal
      return sortDir === "asc" ? cmp : -cmp
    })

    return list
  }, [projects, statusFilter, sectorFilter, pathwayFilter, originFilter, searchQuery, sortField, sortDir])

  // Max funding gap across filtered projects (for sparkline scaling)
  const maxGap = useMemo(() => {
    let max = 0
    filtered.forEach(p => { if (p.funding_gap && p.funding_gap > max) max = p.funding_gap })
    return max
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const startIndex = (page - 1) * perPage

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
    return sortDir === "asc"
      ? <ArrowUp className="h-3.5 w-3.5 text-foreground" />
      : <ArrowDown className="h-3.5 w-3.5 text-foreground" />
  }

  const SortHeader = ({ field, children, className }: { field: string; children: React.ReactNode; className?: string }) => (
    <th
      className={`h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors select-none ${className || ''}`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1.5">
        {children}
        <SortIcon field={field} />
      </span>
    </th>
  )

  const colCount = 14

  return (
    <MainLayout>
      <div className="w-full">
        {/* Header with icon + subtitle like Funding Gaps */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ListTodo className="h-7 w-7 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold">Project List</h1>
              <p className="text-muted-foreground text-sm">
                All projects in the national development pipeline — {filtered.length} projects
              </p>
            </div>
          </div>
          {permissions.canCreateProjects && (
            <Button onClick={() => router.push("/project-bank/new")} className="gap-2">
              <Plus className="h-4 w-4" /> Submit Project
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-end gap-3 py-2 bg-surface-muted rounded-lg px-3 border border-gray-200 mb-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-sm">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map(f => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label} ({statusCounts[f.value] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Sector</Label>
            <Select value={sectorFilter || 'all'} onValueChange={v => { setSectorFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Origin</Label>
            <Select value={originFilter || 'all'} onValueChange={v => { setOriginFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Origins</SelectItem>
                <SelectItem value="government">Government</SelectItem>
                <SelectItem value="unsolicited">Unsolicited</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Pathway</Label>
            <Select value={pathwayFilter || 'all'} onValueChange={v => { setPathwayFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pathways</SelectItem>
                {Object.entries(PATHWAY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-surface-muted border-b border-border">
                <tr>
                  <SortHeader field="name">Project</SortHeader>
                  <SortHeader field="nominating_ministry">Ministry</SortHeader>
                  <SortHeader field="region">Location</SortHeader>
                  <SortHeader field="sector">Sector</SortHeader>
                  <SortHeader field="estimated_cost" className="text-right">Est. Cost</SortHeader>
                  <SortHeader field="firr" className="text-right">FIRR</SortHeader>
                  <SortHeader field="eirr" className="text-right">EIRR</SortHeader>
                  <SortHeader field="vgf_amount" className="text-right">VGF</SortHeader>
                  <SortHeader field="status">Status</SortHeader>
                  <SortHeader field="feasibility_stage">Feasibility</SortHeader>
                  <SortHeader field="pathway">Pathway</SortHeader>
                  <SortHeader field="funding_gap" className="text-right">Gap</SortHeader>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground w-[120px]">Funding</th>
                  <th className="h-12 px-2 text-center align-middle text-sm font-medium text-muted-foreground w-[44px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: colCount }).map((_, j) => (
                        <td key={j} className="px-4 py-2">
                          <div className="h-4 bg-muted animate-pulse rounded w-16" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No projects found
                    </td>
                  </tr>
                ) : (
                  paginated.map(p => {
                    const gap = p.funding_gap && p.funding_gap > 0 ? p.funding_gap : 0
                    const cost = p.estimated_cost || 0
                    const committed = cost - gap
                    const committedPct = cost > 0 ? Math.round((committed / cost) * 100) : 0
                    const gapBarPct = maxGap > 0 && gap > 0 ? Math.max(4, Math.round((gap / maxGap) * 100)) : 0
                    const badgeStyle = STATUS_BADGE_STYLES[p.status] || STATUS_BADGE_STYLES.nominated
                    return (
                    <tr
                      key={p.id}
                      className="group hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => router.push(`/project-bank/${p.id}`)}
                    >
                      {/* Project Code + Name merged */}
                      <td className="px-4 py-2">
                        <div className="text-sm font-medium text-foreground leading-tight">{p.name}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="group/code flex items-center gap-1">
                            <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{p.project_code}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(p.project_code, p.id)
                              }}
                              className="opacity-0 group-hover/code:opacity-100 transition-opacity duration-200 hover:text-gray-700 flex-shrink-0"
                              title="Copy Project Code"
                            >
                              {copiedId === p.id ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>
                      {/* Ministry */}
                      <td className="px-4 py-2 text-sm text-foreground">{p.nominating_ministry || '—'}</td>
                      {/* Location */}
                      <td className="px-4 py-2 text-sm text-foreground">{p.region || '—'}</td>
                      {/* Sector — plain text */}
                      <td className="px-4 py-2 text-sm text-foreground">{p.sector}</td>
                      {/* Est. Cost — USD styled like DFMIS */}
                      <td className="px-4 py-2 text-sm text-right whitespace-nowrap font-medium">
                        {p.estimated_cost != null ? (
                          <span><span className="text-muted-foreground font-normal">USD</span> {formatCostUSD(p.estimated_cost)}</span>
                        ) : '—'}
                      </td>
                      {/* FIRR — plain text */}
                      <td className="px-4 py-2 text-sm text-right text-foreground">
                        {p.firr != null ? `${p.firr}%` : <span className="text-muted-foreground">—</span>}
                      </td>
                      {/* EIRR — plain text */}
                      <td className="px-4 py-2 text-sm text-right text-foreground">
                        {p.eirr != null ? `${p.eirr}%` : <span className="text-muted-foreground">—</span>}
                      </td>
                      {/* VGF — USD styled */}
                      <td className="px-4 py-2 text-sm text-right whitespace-nowrap font-medium">
                        {p.vgf_amount != null && p.vgf_amount > 0 ? (
                          <span><span className="text-muted-foreground font-normal">USD</span> {formatCostUSD(p.vgf_amount)}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      {/* Status — colour palette badge */}
                      <td className="px-4 py-2">
                        <span
                          className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.text,
                            border: `1px solid ${badgeStyle.border}`,
                          }}
                        >
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      {/* Feasibility Stage */}
                      <td className="px-4 py-2">
                        {p.feasibility_stage && p.feasibility_stage !== 'registered' ? (() => {
                          const fsBadge = FEASIBILITY_STAGE_BADGE_STYLES[p.feasibility_stage as FeasibilityStage]
                          return fsBadge ? (
                            <span
                              className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                              style={{
                                backgroundColor: fsBadge.bg,
                                color: fsBadge.text,
                                border: `1px solid ${fsBadge.border}`,
                              }}
                            >
                              {FEASIBILITY_STAGE_LABELS[p.feasibility_stage as FeasibilityStage]}
                            </span>
                          ) : <span className="text-muted-foreground text-sm">—</span>
                        })() : <span className="text-muted-foreground text-sm">—</span>}
                      </td>
                      {/* Pathway — plain text */}
                      <td className="px-4 py-2 text-sm text-foreground">
                        {p.pathway ? PATHWAY_LABELS[p.pathway] || p.pathway.toUpperCase() : '—'}
                      </td>
                      {/* Gap */}
                      <td className="px-4 py-2 text-sm text-right" style={{ color: gap > 0 ? '#dc2625' : undefined }}>
                        {gap > 0 ? (
                          <span className="font-semibold whitespace-nowrap"><span className="text-muted-foreground font-normal">USD</span> {formatCostUSD(gap)}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      {/* Funding bar */}
                      <td className="px-4 py-2">
                        {gap > 0 ? (
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#cfd0d5' }}>
                              <div className="h-full rounded-full" style={{ width: `${gapBarPct}%`, backgroundColor: '#dc2625' }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{committedPct}%</span>
                          </div>
                        ) : cost > 0 ? (
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#7b95a7' }} />
                            <span className="text-[10px] text-muted-foreground">100%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      {/* Kebab menu */}
                      <td className="px-2 py-2 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/project-bank/${p.id}`)
                            }}>
                              View Project
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/project-bank/${p.id}?edit=true`)
                            }}>
                              Edit Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    )
                  }))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="bg-card rounded-lg border border-border shadow-sm p-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min(startIndex + 1, filtered.length)} to {Math.min(startIndex + perPage, filtered.length)} of {filtered.length} projects
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 p-0 ${page === pageNum ? "bg-slate-200 text-slate-900" : ""}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  Last
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Items per page:</label>
                <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(1) }}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

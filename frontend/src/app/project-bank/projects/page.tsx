"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FilterBar } from "@/components/ui/filter-bar"
import {
  Plus, Search, ChevronsUpDown, ChevronUp, ChevronDown,
  MoreVertical, ListTodo, Copy, LayoutGrid, List, Inbox,
} from "lucide-react"
import { FullPagination } from "@/components/ui/full-pagination"
import { EmptyState } from "@/components/ui/empty-state"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api-fetch"
import { useUser } from "@/hooks/useUser"
import {
  formatCurrency, STATUS_LABELS,
  PATHWAY_LABELS, SECTORS,
} from "@/lib/project-bank-utils"
import type { ProjectBankProject } from "@/types/project-bank"
import { ProjectCardModern } from "@/components/project-bank/ProjectCardModern"

const STATUS_FILTERS: { value: string; label: string; code?: string }[] = [
  { value: "all", label: "All" },
  { value: "nominated", label: "Nominated", code: "1" },
  { value: "screening", label: "Screening", code: "2" },
  { value: "appraisal", label: "Appraisal", code: "3" },
  { value: "approved", label: "Approved", code: "4" },
  { value: "implementation", label: "Implementation", code: "5" },
]

const SECTOR_CODES: Record<string, string> = {
  'Transport': '1', 'Energy': '2', 'Health': '3', 'Education': '4', 'Agriculture': '5',
  'Water Resources': '6', 'ICT': '7', 'Industrial': '8', 'Environment': '9', 'WASH': '10',
  'Governance': '11', 'Multi-sector': '12', 'Social Protection': '13', 'Housing': '14',
  'Banking & Finance': '15', 'Trade': '16', 'Tourism': '17', 'Mining': '18',
}

const ORIGIN_OPTIONS: { value: string; label: string; code: string }[] = [
  { value: "government", label: "Government", code: "GOV" },
  { value: "unsolicited", label: "Unsolicited", code: "UNS" },
]

const PATHWAY_OPTIONS: { value: string; label: string; code: string }[] = [
  { value: "oda", label: "ODA", code: "ODA" },
  { value: "ppp", label: "PPP", code: "PPP" },
  { value: "private_supported", label: "Private (Supported)", code: "PVS" },
  { value: "private_unsupported", label: "Private", code: "PVT" },
  { value: "domestic_budget", label: "Domestic Budget", code: "DOM" },
]

/** Format cost as "USD 100m" / "USD 1.2b" style */
function formatCostUSD(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}b`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return value.toLocaleString()
}

/** Derive 1–3 stacked pipeline badges from project_stage + status */
function getPipelineBadges(p: ProjectBankProject): { label: string; bg: string; text: string; border: string }[] {
  const badges: { label: string; bg: string; text: string; border: string }[] = []
  const stage = p.project_stage || ''

  // Phase badge (always shown)
  if (stage.startsWith('intake_')) {
    badges.push({ label: 'Project Intake', bg: '#f1f4f8', text: '#4c5568', border: '#cfd0d5' })
  } else if (stage.startsWith('fs1_')) {
    badges.push({ label: 'Preliminary FS', bg: '#7b95a7', text: '#ffffff', border: '#4c5568' })
  } else if (stage.startsWith('fs2_')) {
    badges.push({ label: 'Detailed FS', bg: '#4c5568', text: '#ffffff', border: '#4c5568' })
  } else if (stage.startsWith('fs3_')) {
    badges.push({ label: 'PPP Structuring', bg: '#4c5568', text: '#ffffff', border: '#4c5568' })
  } else {
    // Fallback: derive from status
    const statusPhase: Record<string, { label: string; bg: string; text: string; border: string }> = {
      nominated:      { label: 'Project Intake', bg: '#f1f4f8', text: '#4c5568', border: '#cfd0d5' },
      screening:      { label: 'Project Intake', bg: '#f1f4f8', text: '#4c5568', border: '#cfd0d5' },
      appraisal:      { label: 'Appraisal',      bg: '#7b95a7', text: '#ffffff', border: '#4c5568' },
      approved:       { label: 'Approved',        bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
      implementation: { label: 'Implementation',  bg: '#dc2625', text: '#ffffff', border: '#dc2625' },
    }
    const fb = statusPhase[p.status]
    if (fb) badges.push(fb)
    else badges.push({ label: 'Project Intake', bg: '#f1f4f8', text: '#4c5568', border: '#cfd0d5' })
  }

  // Review badge (only when project_stage contains a review sub-stage)
  if (/_desk_claimed$|_desk_screened$|_desk_reviewed$/.test(stage)) {
    badges.push({ label: 'Desk Review', bg: '#cfd0d5', text: '#4c5568', border: '#7b95a7' })
  } else if (/_senior_reviewed$/.test(stage)) {
    badges.push({ label: 'Senior Review', bg: '#7b95a7', text: '#ffffff', border: '#4c5568' })
  }

  // Status badge (only for later pipeline statuses, and only when we have a real project_stage so the phase badge isn't already showing these)
  if (stage) {
    if (p.status === 'appraisal') {
      badges.push({ label: 'Appraisal', bg: '#7b95a7', text: '#ffffff', border: '#4c5568' })
    } else if (p.status === 'approved') {
      badges.push({ label: 'Approved', bg: '#4c5568', text: '#ffffff', border: '#4c5568' })
    } else if (p.status === 'implementation') {
      badges.push({ label: 'Implementation', bg: '#dc2625', text: '#ffffff', border: '#dc2625' })
    }
  }

  return badges
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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  const copyToClipboard = (text: string, label: string = 'Copied') => {
    navigator.clipboard.writeText(text)
    toast.success(label)
  }
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
    const getFundedPct = (p: ProjectBankProject) => {
      const cost = p.estimated_cost || 0
      if (cost <= 0) return null
      const gap = p.funding_gap && p.funding_gap > 0 ? p.funding_gap : 0
      return Math.round(((cost - gap) / cost) * 100)
    }

    list = [...list].sort((a, b) => {
      const aVal = sortField === 'funded_pct' ? getFundedPct(a) : (a as any)[sortField]
      const bVal = sortField === 'funded_pct' ? getFundedPct(b) : (b as any)[sortField]
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
    if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
    return sortDir === "asc"
      ? <ChevronUp className="h-3.5 w-3.5 text-foreground" />
      : <ChevronDown className="h-3.5 w-3.5 text-foreground" />
  }

  const SortHeader = ({ field, children, className, tight }: { field: string; children: React.ReactNode; className?: string; tight?: boolean }) => (
    <th
      className={`h-10 ${tight ? 'px-2' : 'px-3'} text-left align-middle text-helper font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors select-none whitespace-nowrap ${className || ''}`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        <SortIcon field={field} />
      </span>
    </th>
  )

  const colCount = 15

  return (
    <MainLayout>
      <div className="w-full">
        {/* Header with icon + subtitle like Funding Gaps */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Project List</h1>
              <p className="text-muted-foreground mt-1">
                All projects in the national development pipeline — {filtered.length} projects
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="rounded-r-none gap-1"
              >
                <List className="h-4 w-4" />
                Table
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-l-none gap-1"
              >
                <LayoutGrid className="h-4 w-4" />
                Cards
              </Button>
            </div>
            {permissions.canCreateProjects && (
              <Button onClick={() => router.push("/project-bank/new")} className="gap-2">
                <Plus className="h-4 w-4" /> Submit Project
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <FilterBar>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-sm">
            <Label className="text-helper text-muted-foreground">Search</Label>
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
            <Label className="text-helper text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map(f => (
                  <SelectItem key={f.value} value={f.value}>
                    <span className="flex items-center gap-2">
                      {f.code && <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{f.code}</span>}
                      {f.label} ({statusCounts[f.value] || 0})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Sector</Label>
            <Select value={sectorFilter || 'all'} onValueChange={v => { setSectorFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {SECTORS.map(s => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{SECTOR_CODES[s]}</span>
                      {s}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Origin</Label>
            <Select value={originFilter || 'all'} onValueChange={v => { setOriginFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Origins</SelectItem>
                {ORIGIN_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{o.code}</span>
                      {o.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Pathway</Label>
            <Select value={pathwayFilter || 'all'} onValueChange={v => { setPathwayFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pathways</SelectItem>
                {PATHWAY_OPTIONS.map(pw => (
                  <SelectItem key={pw.value} value={pw.value}>
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{pw.code}</span>
                      {pw.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FilterBar>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg border border-border shadow-sm p-6">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2 mb-2" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/3" />
                </div>
              ))
            ) : paginated.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={<Inbox className="h-10 w-10 text-muted-foreground" />}
                  title="No projects found"
                  message="Try adjusting your search or filters."
                />
              </div>
            ) : (
              paginated.map(p => (
                <ProjectCardModern key={p.id} project={p} />
              ))
            )}
          </div>
        )}

        {/* Table */}
        {viewMode === 'table' && (
        <div className="bg-card rounded-md ring-1 ring-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-auto">
              <thead className="bg-surface-muted border-b border-border">
                <tr>
                  <SortHeader field="name" className="min-w-[200px]">Project Title</SortHeader>
                  <SortHeader field="nominating_ministry" className="min-w-[140px]">Nominating Ministry</SortHeader>
                  <SortHeader field="region" tight>Location</SortHeader>
                  <SortHeader field="sector" tight>Sector</SortHeader>
                  <SortHeader field="estimated_cost" className="text-right" tight>Estimated Cost</SortHeader>
                  <SortHeader field="firr" className="text-right" tight>FIRR</SortHeader>
                  <SortHeader field="eirr" className="text-right" tight>EIRR</SortHeader>
                  <SortHeader field="vgf_amount" className="text-right" tight>VGF</SortHeader>
                  <SortHeader field="latest_score" className="text-right" tight>Score</SortHeader>
                  <SortHeader field="created_at" tight>Date Added</SortHeader>
                  <SortHeader field="project_stage" tight>Pipeline Stage</SortHeader>
                  <SortHeader field="pathway" tight>Pathway</SortHeader>
                  <SortHeader field="funding_gap" className="text-right" tight>Gap</SortHeader>
                  <SortHeader field="funded_pct" tight className="w-[100px]">Funding</SortHeader>
                  <th className="h-10 px-1 text-center align-middle text-helper font-medium text-muted-foreground w-[36px]"></th>
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
                    <td colSpan={colCount} className="p-0">
                      <EmptyState
                        icon={<Inbox className="h-10 w-10 text-muted-foreground" />}
                        title="No projects found"
                        message="Try adjusting your search or filters."
                      />
                    </td>
                  </tr>
                ) : (
                  paginated.map(p => {
                    const gap = p.funding_gap && p.funding_gap > 0 ? p.funding_gap : 0
                    const cost = p.estimated_cost || 0
                    const committed = cost - gap
                    const committedPct = cost > 0 ? Math.round((committed / cost) * 100) : 0
                    const gapBarPct = maxGap > 0 && gap > 0 ? Math.max(4, Math.round((gap / maxGap) * 100)) : 0
                    return (
                    <tr
                      key={p.id}
                      className="group hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/project-bank/${p.id}`)}
                    >
                      {/* Project Code + Name merged */}
                      <td className="px-3 py-2 min-w-[200px]">
                        <div className="space-y-1">
                          <div className="group/title flex items-start gap-1">
                            <span className="text-body font-medium text-foreground leading-tight">{p.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                copyToClipboard(p.name, 'Project title copied')
                              }}
                              className="flex-shrink-0 mt-0.5 opacity-0 group-hover/title:opacity-100 transition-opacity duration-200 hover:text-foreground"
                              title="Copy Project Title"
                            >
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                          {p.project_code && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                copyToClipboard(p.project_code, 'Project ID copied')
                              }}
                              title="Click to copy"
                              className="text-xs font-mono text-muted-foreground bg-muted hover:bg-muted/70 hover:text-foreground transition-colors px-1.5 py-0.5 rounded whitespace-nowrap inline-flex self-start cursor-pointer"
                            >
                              {p.project_code}
                            </button>
                          )}
                        </div>
                      </td>
                      {/* Ministry */}
                      <td className="px-3 py-2 text-body text-foreground min-w-[140px]">
                        <div>{p.nominating_ministry || '—'}</div>
                        {p.implementing_agency && (
                          <div className="text-helper text-muted-foreground mt-0.5">{p.implementing_agency}</div>
                        )}
                      </td>
                      {/* Location */}
                      <td className="px-2 py-2 text-body text-foreground whitespace-nowrap">{p.region || '—'}</td>
                      {/* Sector */}
                      <td className="px-2 py-2 text-body text-foreground whitespace-nowrap">
                        <div>{p.sector}</div>
                        {p.sub_sector && (
                          <div className="text-helper text-muted-foreground mt-0.5">{p.sub_sector}</div>
                        )}
                      </td>
                      {/* Est. Cost */}
                      <td className="px-2 py-2 text-body text-right whitespace-nowrap font-medium">
                        {p.estimated_cost != null ? (
                          <span><span className="text-muted-foreground font-normal text-helper">USD</span> {formatCostUSD(p.estimated_cost)}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      {/* FIRR */}
                      <td className="px-2 py-2 text-body text-right text-foreground whitespace-nowrap">
                        {p.firr != null ? `${p.firr}%` : <span className="text-muted-foreground">—</span>}
                      </td>
                      {/* EIRR */}
                      <td className="px-2 py-2 text-body text-right text-foreground whitespace-nowrap">
                        {p.eirr != null ? `${p.eirr}%` : <span className="text-muted-foreground">—</span>}
                      </td>
                      {/* VGF */}
                      <td className="px-2 py-2 text-body text-right whitespace-nowrap font-medium">
                        {p.vgf_amount != null && p.vgf_amount > 0 ? (
                          <span><span className="text-muted-foreground font-normal text-helper">USD</span> {formatCostUSD(p.vgf_amount)}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      {/* Score */}
                      <td className="px-2 py-2 text-body text-right whitespace-nowrap">
                        {(p as any).latest_score != null ? (
                          <span
                            className="font-semibold"
                            style={{
                              color: Number((p as any).latest_score) >= 70 ? '#4c5568'
                                : Number((p as any).latest_score) >= 40 ? '#7b95a7'
                                : '#dc2625',
                            }}
                          >
                            {Number((p as any).latest_score).toFixed(0)}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      {/* Date Added */}
                      <td className="px-2 py-2 text-body text-muted-foreground whitespace-nowrap">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      {/* Pipeline Stage */}
                      <td className="px-2 py-2">
                        {(() => {
                          const badges = getPipelineBadges(p)
                          const combined = badges.map(b => b.label).join(' \u00b7 ')
                          const first = badges[0]
                          return (
                            <span
                              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                              style={{
                                backgroundColor: first.bg,
                                color: first.text,
                                border: `1px solid ${first.border}`,
                              }}
                            >
                              {combined}
                            </span>
                          )
                        })()}
                      </td>
                      {/* Pathway */}
                      <td className="px-2 py-2 text-body text-foreground whitespace-nowrap">
                        {p.pathway ? PATHWAY_LABELS[p.pathway] || p.pathway.toUpperCase() : '—'}
                      </td>
                      {/* Gap */}
                      <td className="px-2 py-2 text-body text-right whitespace-nowrap" style={{ color: gap > 0 ? '#dc2625' : undefined }}>
                        {gap > 0 ? (
                          <span className="font-semibold"><span className="text-muted-foreground font-normal text-helper">USD</span> {formatCostUSD(gap)}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      {/* Funding bar */}
                      <td className="px-2 py-2">
                        {gap > 0 ? (
                          <div className="flex items-center gap-1.5 min-w-[80px]">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#cfd0d5' }}>
                              <div className="h-full rounded-full" style={{ width: `${gapBarPct}%`, backgroundColor: '#dc2625' }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{committedPct}%</span>
                          </div>
                        ) : cost > 0 ? (
                          <div className="flex items-center gap-1.5 min-w-[80px]">
                            <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#7b95a7' }} />
                            <span className="text-[10px] text-muted-foreground">100%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-body">—</span>
                        )}
                      </td>
                      {/* Kebab menu */}
                      <td className="px-1 py-2 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
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
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <FullPagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            itemLabel="projects"
          />
        )}
      </div>
    </MainLayout>
  )
}

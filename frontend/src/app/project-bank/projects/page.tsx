"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { useUser } from "@/hooks/useUser"
import {
  formatCurrency, STATUS_BADGE_VARIANT, STATUS_LABELS,
  PATHWAY_LABELS, PATHWAY_COLORS, SECTORS, getPercentageColor,
} from "@/lib/project-bank-utils"
import type { ProjectBankProject, ProjectStatus } from "@/types/project-bank"

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "nominated", label: "Nominated" },
  { value: "screening", label: "Screening" },
  { value: "appraisal", label: "Appraisal" },
  { value: "approved", label: "Approved" },
  { value: "implementation", label: "Implementation" },
]

export default function ProjectListPage() {
  const router = useRouter()
  const { permissions } = useUser()
  const [projects, setProjects] = useState<ProjectBankProject[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [sectorFilter, setSectorFilter] = useState("")
  const [pathwayFilter, setPathwayFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [sortField, setSortField] = useState<string>("created_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

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
  }, [projects, statusFilter, sectorFilter, pathwayFilter, searchQuery, sortField, sortDir])

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

  const SortHeader = ({ field, children, className }: { field: string; children: React.ReactNode; className?: string }) => (
    <th
      className={`h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors ${className || ''}`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
        )}
      </span>
    </th>
  )

  return (
    <MainLayout>
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">All Projects</h1>
          {permissions.canCreateProjects && (
            <Button onClick={() => router.push("/project-bank/new")} className="gap-2">
              <Plus className="h-4 w-4" /> Submit Project
            </Button>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1) }}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                statusFilter === f.value
                  ? "bg-background border-border font-medium shadow-sm"
                  : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}{" "}
              <span className="text-xs font-mono text-muted-foreground">
                {statusCounts[f.value] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
          <Select value={sectorFilter} onValueChange={v => { setSectorFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sector" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={pathwayFilter} onValueChange={v => { setPathwayFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Pathway" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pathways</SelectItem>
              {Object.entries(PATHWAY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-surface-muted border-b border-border">
                <tr>
                  <SortHeader field="project_code">Code</SortHeader>
                  <SortHeader field="name">Project</SortHeader>
                  <SortHeader field="sector">Sector</SortHeader>
                  <SortHeader field="estimated_cost" className="text-right">Est. Cost</SortHeader>
                  <SortHeader field="firr" className="text-right">FIRR</SortHeader>
                  <SortHeader field="eirr" className="text-right">EIRR</SortHeader>
                  <SortHeader field="status">Status</SortHeader>
                  <SortHeader field="pathway">Pathway</SortHeader>
                  <SortHeader field="funding_gap" className="text-right">Gap</SortHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-2">
                          <div className="h-4 bg-muted animate-pulse rounded w-16" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No projects found
                    </td>
                  </tr>
                ) : (
                  paginated.map(p => (
                    <tr
                      key={p.id}
                      className="group hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => router.push(`/project-bank/${p.id}`)}
                    >
                      <td className="px-4 py-2 text-sm font-mono text-muted-foreground">{p.project_code}</td>
                      <td className="px-4 py-2">
                        <div className="text-sm font-medium text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.nominating_ministry}{p.region ? ` · ${p.region}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">{p.sector}</td>
                      <td className="px-4 py-2 text-sm font-mono text-right">{formatCurrency(p.estimated_cost, p.currency)}</td>
                      <td className={`px-4 py-2 text-sm font-mono text-right ${p.firr != null ? (p.firr >= 10 ? 'text-green-600' : 'text-amber-600') : 'text-muted-foreground'}`}>
                        {p.firr != null ? `${p.firr}%` : '—'}
                      </td>
                      <td className={`px-4 py-2 text-sm font-mono text-right ${p.eirr != null ? (p.eirr >= 15 ? 'text-green-600 font-semibold' : 'text-red-600') : 'text-muted-foreground'}`}>
                        {p.eirr != null ? `${p.eirr}%` : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={STATUS_BADGE_VARIANT[p.status] as any}>
                          {STATUS_LABELS[p.status]}
                        </Badge>
                      </td>
                      <td className={`px-4 py-2 text-sm font-semibold ${p.pathway ? PATHWAY_COLORS[p.pathway] : 'text-muted-foreground'}`}>
                        {p.pathway ? PATHWAY_LABELS[p.pathway] || p.pathway.toUpperCase() : '—'}
                      </td>
                      <td className={`px-4 py-2 text-sm font-mono text-right ${p.funding_gap && p.funding_gap > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                        {p.funding_gap && p.funding_gap > 0 ? formatCurrency(p.funding_gap) : '—'}
                      </td>
                    </tr>
                  ))
                )}
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

"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronRight, Loader2, Inbox, Search,
  KanbanSquare, Table2,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import {
  formatCurrency, formatCurrencyParts, SECTORS, PROJECT_STAGE_LABELS, PROJECT_STAGE_BADGE_STYLES,
} from "@/lib/project-bank-utils"
import type { CategorizedProject, CategorizedColumns, CategorizedColumnKey } from "./types"
import { ReviewTableView } from "./ReviewTableView"
import type { ReviewTableColumn } from "./ReviewTableView"

/* ── Kanban columns config ─────────────────────────────── */

const KANBAN_COLUMNS: { key: CategorizedColumnKey; title: string; color: string }[] = [
  { key: "private", title: "Category A: Private Investment", color: "bg-green-600" },
  { key: "government", title: "Category B: Government Budget", color: "bg-amber-600" },
  { key: "ppp", title: "Category C: PPP / VGF Structuring", color: "bg-purple-600" },
]

/* ── Table columns ─────────────────────────────────────── */

const TABLE_COLUMNS: ReviewTableColumn[] = [
  {
    key: "name",
    label: "Project",
    render: (p: CategorizedProject) => (
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{p.name}</p>
          <span className="font-mono text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">{p.project_code}</span>
        </div>
      </div>
    ),
  },
  {
    key: "nominating_ministry",
    label: "Ministry",
    render: (p: CategorizedProject) => (
      <div>
        <span>{p.nominating_ministry}</span>
        {p.implementing_agency && <p className="text-xs text-muted-foreground">{p.implementing_agency}</p>}
      </div>
    ),
  },
  {
    key: "sector",
    label: "Sector",
    render: (p: CategorizedProject) => (
      <div>
        <span>{p.sector}</span>
        {p.sub_sector && <p className="text-xs text-muted-foreground">{p.sub_sector}</p>}
      </div>
    ),
  },
  { key: "region", label: "Region", render: (p: CategorizedProject) => <span>{p.region || "—"}</span> },
  {
    key: "estimated_cost",
    label: "Estimated Cost",
    render: (p: CategorizedProject) => {
      const parts = formatCurrencyParts(p.estimated_cost, p.currency)
      if (!parts) return <span>—</span>
      return <span><span className="text-muted-foreground">{parts.prefix}</span> {parts.amount}</span>
    },
  },
  {
    key: "category_decision",
    label: "Category",
    render: (p: CategorizedProject) => {
      const labels: Record<string, { label: string; color: string }> = {
        category_a: { label: "Private (A)", color: "bg-green-100 text-green-800 border-green-200" },
        category_b: { label: "Gov Budget (B)", color: "bg-amber-100 text-amber-800 border-amber-200" },
        category_c: { label: "PPP (C)", color: "bg-purple-100 text-purple-800 border-purple-200" },
      }
      const info = p.category_decision ? labels[p.category_decision] : null
      if (!info) return <span>—</span>
      return (
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${info.color}`}>
          {info.label}
        </span>
      )
    },
  },
  {
    key: "project_stage",
    label: "Stage",
    render: (p: CategorizedProject) => {
      const style = PROJECT_STAGE_BADGE_STYLES[p.project_stage]
      return (
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
        >
          {PROJECT_STAGE_LABELS[p.project_stage]}
        </span>
      )
    },
  },
]

/* ── Kanban card ───────────────────────────────────────── */

function CategorizedKanbanCard({ project, onClick }: { project: CategorizedProject; onClick: () => void }) {
  const style = PROJECT_STAGE_BADGE_STYLES[project.project_stage]

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{project.name}</p>
            <span className="font-mono text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">{project.project_code}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>
      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        <div>
          <span>{project.nominating_ministry}</span>
          {project.implementing_agency && (
            <p className="text-muted-foreground/60 truncate">{project.implementing_agency}</p>
          )}
        </div>
        <div>
          <span>{project.sector}</span>
          {project.sub_sector && (
            <p className="text-muted-foreground/60 truncate">{project.sub_sector}</p>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
        >
          {PROJECT_STAGE_LABELS[project.project_stage]}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(project.updated_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

/* ── Main component ────────────────────────────────────── */

export function CategorizedTab() {
  const router = useRouter()
  const [kanbanColumns, setKanbanColumns] = useState<CategorizedColumns>({ private: [], government: [], ppp: [] })
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban")
  const [searchQuery, setSearchQuery] = useState("")
  const [sectorFilter, setSectorFilter] = useState("")

  const fetchBoard = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (sectorFilter) params.set("sector", sectorFilter)
      const res = await apiFetch(`/api/project-bank/review-board/categorized?${params}`)
      if (res.ok) setKanbanColumns(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [sectorFilter])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  const allProjects = [...kanbanColumns.private, ...kanbanColumns.government, ...kanbanColumns.ppp]

  const filterProjects = <T extends CategorizedProject>(projects: T[]): T[] => {
    if (!searchQuery) return projects
    const q = searchQuery.toLowerCase()
    return projects.filter(p =>
      p.name.toLowerCase().includes(q) || p.project_code.toLowerCase().includes(q) || p.nominating_ministry.toLowerCase().includes(q)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const filteredAll = filterProjects(allProjects)

  return (
    <>
      {/* Filters + View Toggle */}
      <div className="flex items-end gap-3 py-2 bg-surface-muted rounded-lg px-3 border border-gray-200 mb-4">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-sm">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Sector</Label>
          <Select value={sectorFilter || "all"} onValueChange={v => setSectorFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center border rounded-md ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("kanban")}
            className={`rounded-r-none h-9 ${viewMode === "kanban" ? "bg-slate-200 text-slate-900" : "text-slate-400"}`}
          >
            <KanbanSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("table")}
            className={`rounded-l-none h-9 ${viewMode === "table" ? "bg-slate-200 text-slate-900" : "text-slate-400"}`}
          >
            <Table2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(col => (
            <div key={col.key} className="flex-1 min-w-[280px]">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                <h3 className="text-sm font-semibold">{col.title}</h3>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {kanbanColumns[col.key].length}
                </span>
              </div>
              <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-lg p-2">
                {filterProjects(kanbanColumns[col.key]).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No projects</p>
                ) : (
                  filterProjects(kanbanColumns[col.key]).map(p => (
                    <CategorizedKanbanCard
                      key={p.id}
                      project={p}
                      onClick={() => router.push(`/project-bank/${p.id}`)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <ReviewTableView
          projects={filteredAll}
          columns={TABLE_COLUMNS}
          onRowClick={p => router.push(`/project-bank/${p.id}`)}
          emptyMessage="No categorized projects found"
        />
      )}
    </>
  )
}

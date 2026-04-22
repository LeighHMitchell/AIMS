"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FilterBar } from "@/components/ui/filter-bar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2, Search,
  KanbanSquare, Table2, FileText, ClipboardList,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import {
  formatCurrency, formatCurrencyParts, REGIONS, PROJECT_STAGE_LABELS, PROJECT_STAGE_BADGE_STYLES,
} from "@/lib/project-bank-utils"
import type { CategorizedProject, CategorizedColumns, CategorizedColumnKey } from "./types"
import { ReviewTableView } from "./ReviewTableView"
import type { ReviewTableColumn } from "./ReviewTableView"

/* ── Kanban columns config ─────────────────────────────── */

const KANBAN_COLUMNS: { key: CategorizedColumnKey; title: string; color: string }[] = [
  { key: "private", title: "Category A: Private Investment", color: "bg-green-600" },
  { key: "government", title: "Category B: Government Budget", color: "bg-amber-600" },
  { key: "ppp", title: "Category C: PPP/VGF Structuring", color: "bg-purple-600" },
  { key: "oda", title: "Category D: Development Partner (ODA)", color: "bg-blue-600" },
]

const CATEGORY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  category_a: { label: "Private (A)", bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
  category_b: { label: "Gov Budget (B)", bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  category_c: { label: "PPP (C)", bg: "#f3e8ff", text: "#6b21a8", border: "#e9d5ff" },
  category_d: { label: "ODA (D)", bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
}

/* ── Table columns ─────────────────────────────────────── */

const TABLE_COLUMNS: ReviewTableColumn[] = [
  {
    key: "name",
    label: "Project",
    render: (p: CategorizedProject) => (
      <div className="min-w-0">
        <span className="text-body font-medium">{p.name}</span>{" "}
        <span className="font-mono text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded whitespace-nowrap inline-block">{p.project_code}</span>
      </div>
    ),
  },
  {
    key: "nominating_ministry",
    label: "Ministry",
    render: (p: CategorizedProject) => (
      <div>
        <span>{p.nominating_ministry}</span>
        {p.implementing_agency && <p className="text-helper text-muted-foreground">{p.implementing_agency}</p>}
      </div>
    ),
  },
  {
    key: "sector",
    label: "Sector",
    render: (p: CategorizedProject) => (
      <div>
        <span>{p.sector}</span>
        {p.sub_sector && <p className="text-helper text-muted-foreground">{p.sub_sector}</p>}
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
      const info = p.category_decision ? CATEGORY_STYLES[p.category_decision] : null
      if (!info) return <span>—</span>
      return (
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: info.bg, color: info.text, border: `1px solid ${info.border}` }}
        >
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

function CategorizedKanbanCard({ project, onProfile, onForm }: { project: CategorizedProject; onProfile: () => void; onForm: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const style = PROJECT_STAGE_BADGE_STYLES[project.project_stage]
  const costParts = formatCurrencyParts(project.estimated_cost, project.currency)

  return (
    <div
      className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={() => setExpanded(prev => !prev)}
    >
      {project.banner && (
        <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none">
          <img
            src={project.banner}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: `center ${project.banner_position ?? 50}%`, maskImage: 'linear-gradient(to right, transparent, black 40%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 40%)' }}
          />
        </div>
      )}
      <div className="relative p-3">
        <div className="min-w-0">
          <span className="text-body font-medium">{project.name}</span>{" "}
          <span className="font-mono text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded whitespace-nowrap inline-block">{project.project_code}</span>
        </div>
        <div className="mt-2 space-y-0.5 text-helper text-muted-foreground">
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
        {costParts && (
          <div className="mt-1.5">
            <span className="text-helper font-medium"><span className="text-muted-foreground">{costParts.prefix}</span> {costParts.amount}</span>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
          >
            {PROJECT_STAGE_LABELS[project.project_stage]}
          </span>
          <span className="text-helper text-muted-foreground">
            {new Date(project.updated_at).toLocaleDateString()}
          </span>
        </div>
        {expanded && (
          <div className="mt-2 flex items-center gap-1.5 border-t pt-2">
            <Button variant="outline" size="sm" className="flex-1 h-7 text-helper gap-1" onClick={e => { e.stopPropagation(); onProfile() }}>
              <FileText className="h-3 w-3" /> Profile
            </Button>
            <Button size="sm" className="flex-1 h-7 text-helper gap-1 bg-black hover:bg-black/90 text-white" onClick={e => { e.stopPropagation(); onForm() }}>
              <ClipboardList className="h-3 w-3" /> Project Appraisal
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main component ────────────────────────────────────── */

const CATEGORY_FILTER_OPTIONS = [
  { value: "category_a", label: "Category A: Private" },
  { value: "category_b", label: "Category B: Government" },
  { value: "category_c", label: "Category C: PPP" },
  { value: "category_d", label: "Category D: ODA" },
]

interface PBSector { id: string; code: string; name: string }

export function CategorizedTab() {
  const router = useRouter()
  const [kanbanColumns, setKanbanColumns] = useState<CategorizedColumns>({ private: [], government: [], ppp: [], oda: [] })
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban")
  const [searchQuery, setSearchQuery] = useState("")
  const [sectorFilter, setSectorFilter] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [sectors, setSectors] = useState<PBSector[]>([])

  useEffect(() => {
    apiFetch('/api/pb-sectors').then(r => r.ok ? r.json() : []).then(setSectors).catch(() => {})
  }, [])

  const fetchBoard = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (sectorFilter) params.set("sector", sectorFilter)
      if (regionFilter) params.set("region", regionFilter)
      if (categoryFilter) params.set("category", categoryFilter)
      const res = await apiFetch(`/api/project-bank/review-board/categorized?${params}`)
      if (res.ok) setKanbanColumns(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [sectorFilter, regionFilter, categoryFilter])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  const allProjects = [...kanbanColumns.private, ...kanbanColumns.government, ...kanbanColumns.ppp, ...kanbanColumns.oda]

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
      <FilterBar>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-sm">
          <Label className="text-helper text-muted-foreground">Search</Label>
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
          <Label className="text-helper text-muted-foreground">Sector</Label>
          <Select value={sectorFilter || "all"} onValueChange={v => setSectorFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {sectors.map(s => (
                <SelectItem key={s.id} value={s.name}>
                  <span className="inline-flex items-center gap-2">
                    {s.code && <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{s.code}</span>}
                    <span>{s.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-helper text-muted-foreground">Region</Label>
          <Select value={regionFilter || "all"} onValueChange={v => setRegionFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-helper text-muted-foreground">Category</Label>
          <Select value={categoryFilter || "all"} onValueChange={v => setCategoryFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORY_FILTER_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center border rounded-md ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("kanban")}
            className={`rounded-r-none h-9 ${viewMode === "kanban" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
          >
            <KanbanSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("table")}
            className={`rounded-l-none h-9 ${viewMode === "table" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
          >
            <Table2 className="h-4 w-4" />
          </Button>
        </div>
      </FilterBar>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(col => {
            const filtered = filterProjects(kanbanColumns[col.key])
            return (
              <div key={col.key} className="flex-1 min-w-[280px]">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-body font-semibold">{col.title}</h3>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {kanbanColumns[col.key].length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-lg p-2">
                  {filtered.length === 0 ? (
                    <p className="text-helper text-muted-foreground text-center py-8">No projects</p>
                  ) : (
                    filtered.map(p => (
                      <CategorizedKanbanCard
                        key={p.id}
                        project={p}
                        onProfile={() => router.push(`/project-bank/${p.id}`)}
                        onForm={() => router.push(`/project-bank/${p.id}/appraisal`)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <ReviewTableView
          projects={filteredAll}
          columns={[
            ...TABLE_COLUMNS,
            {
              key: "actions",
              label: "",
              render: (p: CategorizedProject) => (
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  <Button variant="outline" size="sm" className="h-7 text-helper gap-1" onClick={() => router.push(`/project-bank/${p.id}`)}>
                    <FileText className="h-3 w-3" /> Profile
                  </Button>
                  <Button size="sm" className="h-7 text-helper gap-1 bg-black hover:bg-black/90 text-white" onClick={() => router.push(`/project-bank/${p.id}/appraisal`)}>
                    <ClipboardList className="h-3 w-3" /> Project Appraisal
                  </Button>
                </div>
              ),
            },
          ]}
          onRowClick={() => {}}
          emptyMessage="No categorized projects found"
        />
      )}
    </>
  )
}

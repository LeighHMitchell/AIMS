"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, LayoutGrid, Table2, Building2, DollarSign, ChevronRight, Search } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import {
  formatCurrency, SECTORS, checkCooldownViolation,
} from "@/lib/project-bank-utils"
import type { ProjectStage } from "@/types/project-bank"
import type { RejectedProject } from "./types"
import { ReviewTableView } from "./ReviewTableView"
import type { ReviewTableColumn } from "./ReviewTableView"

function getRejectionPhase(stage: ProjectStage): string {
  if (stage === "intake_rejected") return "Intake"
  if (stage === "fs1_rejected") return "Preliminary Feasibility"
  return "Unknown"
}

function CooldownBadge({ project }: { project: RejectedProject }) {
  const rejectedDate = project.fs1_rejected_at || project.rejected_at
  const { blocked, cooldownEnds } = checkCooldownViolation(rejectedDate)

  if (!cooldownEnds) return <span className="text-xs text-muted-foreground">—</span>

  if (blocked) {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
        Cool-down until {cooldownEnds.toLocaleDateString()}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
      Eligible
    </span>
  )
}

function fmtCost(value: number | null, currency: string) {
  if (!value) return null
  if (value >= 1_000_000) return `${currency === "USD" ? "$" : currency + " "}${(value / 1_000_000).toFixed(1)}m`
  if (value >= 1_000) return `${currency === "USD" ? "$" : currency + " "}${(value / 1_000).toFixed(0)}k`
  return formatCurrency(value, currency)
}

const TABLE_COLUMNS: ReviewTableColumn[] = [
  {
    key: "name",
    label: "Project",
    render: (p: RejectedProject) => (
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{p.name}</p>
          <span className="font-mono text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">{p.project_code}</span>
        </div>
      </div>
    ),
  },
  { key: "nominating_ministry", label: "Ministry" },
  { key: "sector", label: "Sector" },
  {
    key: "project_stage",
    label: "Phase",
    render: (p: RejectedProject) => (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
        {getRejectionPhase(p.project_stage)}
      </span>
    ),
  },
  {
    key: "estimated_cost",
    label: "Est. Cost",
    render: (p: RejectedProject) => <span>{formatCurrency(p.estimated_cost, p.currency)}</span>,
  },
  {
    key: "rejection_reason",
    label: "Reason / Comments",
    render: (p: RejectedProject) => (
      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
        {p.rejection_reason || p.review_comments || "—"}
      </p>
    ),
  },
  {
    key: "rejected_at",
    label: "Rejected",
    render: (p: RejectedProject) => {
      const date = p.fs1_rejected_at || p.rejected_at
      return <span className="text-xs">{date ? new Date(date).toLocaleDateString() : "—"}</span>
    },
  },
  {
    key: "cooldown",
    label: "Cool-down",
    render: (p: RejectedProject) => <CooldownBadge project={p} />,
  },
]

export function RejectedProjectsTab() {
  const [projects, setProjects] = useState<RejectedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"card" | "table">("card")
  const [searchQuery, setSearchQuery] = useState("")
  const [sectorFilter, setSectorFilter] = useState("")

  const fetchProjects = useCallback(async () => {
    try {
      const res = await apiFetch("/api/project-bank/review-board/rejected")
      if (res.ok) {
        setProjects(await res.json())
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const filteredProjects = projects.filter(p => {
    if (sectorFilter && p.sector !== sectorFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.project_code.toLowerCase().includes(q) || p.nominating_ministry.toLowerCase().includes(q)
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
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
            onClick={() => setViewMode("card")}
            className={`rounded-r-none h-9 ${viewMode === "card" ? "bg-slate-200 text-slate-900" : "text-slate-400"}`}
          >
            <LayoutGrid className="h-4 w-4" />
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

      {viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <p className="text-sm">No rejected projects</p>
            </div>
          ) : filteredProjects.map(p => {
            const rejectedDate = p.fs1_rejected_at || p.rejected_at
            return (
              <div
                key={p.id}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <span className="font-mono text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">{p.project_code}</span>
                  </div>
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                      {getRejectionPhase(p.project_stage)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{p.nominating_ministry}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-3 w-3 shrink-0" />
                    <span>{fmtCost(p.estimated_cost, p.currency) || "—"}</span>
                  </div>
                  <div className="text-muted-foreground">{p.sector}</div>
                  {rejectedDate && (
                    <div className="text-muted-foreground">
                      {new Date(rejectedDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {(p.rejection_reason || p.review_comments) && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {p.rejection_reason || p.review_comments}
                  </p>
                )}
                <div className="mt-3">
                  <CooldownBadge project={p} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewMode === "table" && (
        <ReviewTableView
          projects={filteredProjects}
          columns={TABLE_COLUMNS}
          onRowClick={() => {}}
          emptyMessage="No rejected projects"
        />
      )}
    </>
  )
}

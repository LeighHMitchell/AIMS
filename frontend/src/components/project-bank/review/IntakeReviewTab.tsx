"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronRight, AlertCircle, Clock, Loader2, Inbox, Search,
  Building2, DollarSign, MapPin, LayoutGrid, List, Copy, Table2, KanbanSquare, X,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import {
  formatCurrency, formatCurrencyParts, SECTORS, PROJECT_STAGE_LABELS, PROJECT_STAGE_BADGE_STYLES,
} from "@/lib/project-bank-utils"
import type { IntakeReviewProject, IntakeReviewColumns, IntakeColumnKey, DecisionOption } from "./types"
import { ReviewDecisionCards } from "./ReviewDecisionCards"
import { ReviewTableView } from "./ReviewTableView"
import type { ReviewTableColumn } from "./ReviewTableView"

/** Compact currency formatter for cards */
function fmtCost(value: number | null, currency: string) {
  if (!value) return null
  if (value >= 1_000_000) return `${currency === "USD" ? "$" : currency + " "}${(value / 1_000_000).toFixed(1)}m`
  if (value >= 1_000) return `${currency === "USD" ? "$" : currency + " "}${(value / 1_000).toFixed(0)}k`
  return formatCurrency(value, currency)
}

const DESK_REVIEW_DECISIONS: DecisionOption[] = [
  {
    value: "screened",
    label: "Submit for Senior Review",
    description: "Advance to senior review stage",
    image: "/images/review-approve.png",
    alt: "Approval seal",
  },
  {
    value: "returned",
    label: "Return for Revision",
    description: "Send back to submitter with comments",
    image: "/images/review-return.png",
    alt: "Microscope",
  },
  {
    value: "rejected",
    label: "Reject",
    description: "Project does not meet requirements",
    image: "/images/review-reject.png",
    alt: "Square peg round hole",
  },
]

const SENIOR_REVIEW_DECISIONS: DecisionOption[] = [
  {
    value: "approved",
    label: "Approve",
    description: "Unlock the feasibility study phase",
    image: "/images/review-approve.png",
    alt: "Approval seal",
  },
  {
    value: "returned_to_desk",
    label: "Return to Desk Review",
    description: "Send back to Step 1 for re-screening",
    image: "/images/review-return-to-desk.png",
    alt: "Notes and observations",
  },
  {
    value: "returned",
    label: "Return for Revision",
    description: "Send back to submitter with comments",
    image: "/images/review-return.png",
    alt: "Microscope",
  },
  {
    value: "rejected",
    label: "Reject",
    description: "Project does not meet requirements",
    image: "/images/review-reject.png",
    alt: "Square peg round hole",
  },
]

const TABLE_COLUMNS: ReviewTableColumn[] = [
  {
    key: "name",
    label: "Project",
    render: (p: IntakeReviewProject) => (
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
    render: (p: IntakeReviewProject) => (
      <div>
        <span>{p.nominating_ministry}</span>
        {p.implementing_agency && <p className="text-xs text-muted-foreground">{p.implementing_agency}</p>}
      </div>
    ),
  },
  {
    key: "sector",
    label: "Sector",
    render: (p: IntakeReviewProject) => (
      <div>
        <span>{p.sector}</span>
        {p.sub_sector && <p className="text-xs text-muted-foreground">{p.sub_sector}</p>}
      </div>
    ),
  },
  { key: "region", label: "Region", render: (p: IntakeReviewProject) => <span>{p.region || "—"}</span> },
  {
    key: "estimated_cost",
    label: "Estimated Cost",
    render: (p: IntakeReviewProject) => {
      const parts = formatCurrencyParts(p.estimated_cost, p.currency)
      if (!parts) return <span>—</span>
      return <span><span className="text-muted-foreground">{parts.prefix}</span> {parts.amount}</span>
    },
  },
  {
    key: "updated_at",
    label: "Submitted",
    render: (p: IntakeReviewProject) => <span className="text-xs">{new Date(p.updated_at).toLocaleDateString()}</span>,
  },
]

function IntakeKanbanCard({ project, onClick }: { project: IntakeReviewProject; onClick: () => void }) {
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
      <div className="mt-2">
        <span className="text-xs text-muted-foreground">
          {new Date(project.updated_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

const KANBAN_COLUMNS: { key: IntakeColumnKey; title: string; color: string }[] = [
  { key: "pending", title: "Step 1: Pending Review", color: "bg-[#7b95a7]" },
  { key: "desk_review", title: "Step 2: Desk Review", color: "bg-[#4c5568]" },
  { key: "senior_review", title: "Step 3: Senior Review", color: "bg-[#3C6255]" },
]

export function IntakeReviewTab() {
  const router = useRouter()
  const [kanbanColumns, setKanbanColumns] = useState<IntakeReviewColumns>({ pending: [], desk_review: [], senior_review: [] })
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"kanban" | "card" | "list" | "table">("kanban")
  const [searchQuery, setSearchQuery] = useState("")
  const [sectorFilter, setSectorFilter] = useState("")
  const [selectedProject, setSelectedProject] = useState<IntakeReviewProject | null>(null)
  const [decision, setDecision] = useState("")
  const [comments, setComments] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchKanban = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (sectorFilter) params.set("sector", sectorFilter)
      const res = await apiFetch(`/api/project-bank/review-board/intake?${params}`)
      if (res.ok) setKanbanColumns(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [sectorFilter])

  useEffect(() => { fetchKanban() }, [fetchKanban])

  const allProjects = [...kanbanColumns.pending, ...kanbanColumns.desk_review, ...kanbanColumns.senior_review]

  const filterProjects = <T extends IntakeReviewProject>(projects: T[]): T[] => {
    if (!searchQuery) return projects
    const q = searchQuery.toLowerCase()
    return projects.filter(p =>
      p.name.toLowerCase().includes(q) || p.project_code.toLowerCase().includes(q) || p.nominating_ministry.toLowerCase().includes(q)
    )
  }

  const openReview = (p: IntakeReviewProject) => {
    setSelectedProject(p); setDecision(""); setComments(""); setError(null)
  }

  const getReviewTier = (project: IntakeReviewProject): "desk" | "senior" | null => {
    if (project.project_stage === "intake_submitted" || project.project_stage === "intake_desk_claimed") return "desk"
    if (project.project_stage === "intake_desk_screened") return "senior"
    return null
  }

  const getDecisionCards = (project: IntakeReviewProject): DecisionOption[] => {
    const tier = getReviewTier(project)
    if (tier === "desk") return DESK_REVIEW_DECISIONS
    if (tier === "senior") return SENIOR_REVIEW_DECISIONS
    return []
  }

  const handleSubmit = async () => {
    if (!selectedProject || !decision) return
    setSubmitting(true)
    setError(null)

    const reviewTier = getReviewTier(selectedProject)
    if (!reviewTier) {
      setError("This project is not in a reviewable stage")
      setSubmitting(false)
      return
    }

    try {
      const res = await apiFetch(`/api/project-bank/${selectedProject.id}/intake-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_tier: reviewTier, decision, comments: comments || null }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to submit review")
        return
      }

      setSelectedProject(null)
      setDecision("")
      setComments("")
      fetchKanban()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (allProjects.length === 0 && viewMode !== "kanban") {
    return (
      <>
        {/* Filter bar with view toggle */}
        <div className="flex items-end gap-3 py-2 bg-surface-muted rounded-lg px-3 border border-gray-200 mb-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-sm">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search projects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
          <div className="flex items-center border rounded-md ml-auto">
            <Button variant="ghost" size="sm" onClick={() => setViewMode("kanban")} className={`rounded-r-none h-9 ${viewMode === "kanban" ? "bg-slate-200 text-slate-900" : "text-slate-400"}`}>
              <KanbanSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setViewMode("card")} className={`rounded-none h-9 ${viewMode === "card" ? "bg-slate-200 text-slate-900" : "text-slate-400"}`}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setViewMode("list")} className={`rounded-none h-9 ${viewMode === "list" ? "bg-slate-200 text-slate-900" : "text-slate-400"}`}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setViewMode("table")} className={`rounded-l-none h-9 ${viewMode === "table" ? "bg-slate-200 text-slate-900" : "text-slate-400"}`}>
              <Table2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <Inbox className="h-8 w-8 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No projects awaiting intake review</p>
        </div>
      </>
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
            onClick={() => setViewMode("card")}
            className={`rounded-none h-9 ${viewMode === "card" ? "bg-slate-200 text-slate-900" : "text-slate-400"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("list")}
            className={`rounded-none h-9 ${viewMode === "list" ? "bg-slate-200 text-slate-900" : "text-slate-400"}`}
          >
            <List className="h-4 w-4" />
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
                    <IntakeKanbanCard key={p.id} project={p} onClick={() => openReview(p)} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Card View */}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAll.map(p => (
            <div
              key={p.id}
              onClick={() => openReview(p)}
              className="group relative flex flex-col rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border cursor-pointer bg-white overflow-hidden"
            >
              {/* Banner */}
              <div className="relative h-40 w-full overflow-hidden" style={{ backgroundColor: "#4c5568" }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                {p.banner ? (
                  <img
                    src={p.banner}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    style={{ objectPosition: `center ${p.banner_position ?? 50}%` }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Building2 className="h-14 w-14 text-gray-500/30" />
                  </div>
                )}
                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white line-clamp-2 leading-snug">{p.name}</h3>
                    <span className="font-mono text-[11px] bg-white/20 text-white px-1.5 py-0.5 rounded shrink-0">{p.project_code}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(p.name) }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/20"
                      title="Copy name"
                    >
                      <Copy className="h-3 w-3 text-white" />
                    </button>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-300">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{p.nominating_ministry}</span>
                    </div>
                    {p.implementing_agency && (
                      <p className="ml-[18px] text-gray-400 truncate">{p.implementing_agency}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sector</p>
                    <p className="text-sm font-medium text-foreground truncate">{p.sector}</p>
                    {p.sub_sector && <p className="text-xs text-muted-foreground truncate">{p.sub_sector}</p>}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Region</p>
                    <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{p.region || "—"}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimated Amount</p>
                    <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                      <DollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{fmtCost(p.estimated_cost, p.currency) || "—"}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Submitted</p>
                    <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{new Date(p.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Rip line */}
                <div className="relative flex items-center justify-center my-3">
                  <div className="absolute -left-4 h-8 w-8 rounded-full bg-white" />
                  <div className="w-full border-t-2 border-dashed border-gray-200" />
                  <div className="absolute -right-4 h-8 w-8 rounded-full bg-white" />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end">
                  <span
                    className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: PROJECT_STAGE_BADGE_STYLES[p.project_stage].bg,
                      color: PROJECT_STAGE_BADGE_STYLES[p.project_stage].text,
                      border: `1px solid ${PROJECT_STAGE_BADGE_STYLES[p.project_stage].border}`,
                    }}
                  >
                    {PROJECT_STAGE_LABELS[p.project_stage]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {filteredAll.map(p => (
            <div
              key={p.id}
              onClick={() => openReview(p)}
              className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow flex items-center gap-4"
            >
              {/* Mini banner thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: "#4c5568" }}>
                {p.banner ? (
                  <img
                    src={p.banner}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `center ${p.banner_position ?? 50}%` }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-gray-500/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 group/info">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <span className="font-mono text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">{p.project_code}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(p.project_code) }}
                        className="shrink-0 opacity-0 group-hover/info:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                        title="Copy code"
                      >
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold shrink-0"
                    style={{
                      backgroundColor: PROJECT_STAGE_BADGE_STYLES[p.project_stage].bg,
                      color: PROJECT_STAGE_BADGE_STYLES[p.project_stage].text,
                      border: `1px solid ${PROJECT_STAGE_BADGE_STYLES[p.project_stage].border}`,
                    }}
                  >
                    {PROJECT_STAGE_LABELS[p.project_stage]}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{p.nominating_ministry}</span>
                  {p.implementing_agency && (
                    <>
                      <span>·</span>
                      <span>{p.implementing_agency}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{p.sector}</span>
                  {p.sub_sector && (
                    <>
                      <span>·</span>
                      <span>{p.sub_sector}</span>
                    </>
                  )}
                  {p.estimated_cost && (
                    <>
                      <span>·</span>
                      <span>{fmtCost(p.estimated_cost, p.currency)}</span>
                    </>
                  )}
                  {p.region && (
                    <>
                      <span>·</span>
                      <span>{p.region}</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <ReviewTableView
          projects={filteredAll}
          columns={TABLE_COLUMNS}
          onRowClick={openReview}
          emptyMessage="No projects awaiting intake review"
        />
      )}

      {/* Intake Review Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedProject(null)} />
          <div className="relative w-full max-w-4xl bg-background shadow-xl rounded-lg overflow-y-auto max-h-[90vh] mx-4">
            <div className="sticky top-0 bg-surface-muted z-10 border-b border-border px-6 py-4 flex items-center justify-between rounded-t-lg">
              <div>
                <h2 className="text-lg font-semibold">{selectedProject.name}</h2>
                <p className="text-xs text-muted-foreground font-mono">{selectedProject.project_code}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedProject(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Project info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Ministry</span>
                  <p className="font-medium">{selectedProject.nominating_ministry}</p>
                  {selectedProject.implementing_agency && (
                    <p className="text-xs text-muted-foreground">{selectedProject.implementing_agency}</p>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Sector</span>
                  <p className="font-medium">{selectedProject.sector}</p>
                  {selectedProject.sub_sector && (
                    <p className="text-xs text-muted-foreground">{selectedProject.sub_sector}</p>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Region</span>
                  <p className="font-medium">{selectedProject.region || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Estimated Amount</span>
                  <p className="font-medium">{formatCurrency(selectedProject.estimated_cost, selectedProject.currency)}</p>
                </div>
                {selectedProject.contact_officer && (
                  <div>
                    <span className="text-muted-foreground">Contact Officer</span>
                    <p className="font-medium">{selectedProject.contact_officer}</p>
                  </div>
                )}
                {selectedProject.contact_email && (
                  <div>
                    <span className="text-muted-foreground">Contact Email</span>
                    <p className="font-medium">{selectedProject.contact_email}</p>
                  </div>
                )}
              </div>

              {selectedProject.description && (
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Description</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedProject.description}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => router.push(`/project-bank/${selectedProject.id}`)}
                >
                  View Project Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => router.push(`/project-bank/${selectedProject.id}/appraisal`)}
                >
                  View Project Submission Form
                </Button>
              </div>

              {/* Claim for Review — pending projects */}
              {selectedProject.project_stage === "intake_submitted" && (
                <div className="border-t border-border pt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This project is pending review. Claim it to begin desk review.
                  </p>
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}
                  <Button
                    onClick={async () => {
                      setSubmitting(true)
                      setError(null)
                      try {
                        const res = await apiFetch(`/api/project-bank/${selectedProject.id}/claim-review`, { method: "POST" })
                        if (!res.ok) {
                          const data = await res.json()
                          setError(data.error || "Failed to claim project")
                          return
                        }
                        setSelectedProject(null)
                        fetchKanban()
                      } catch {
                        setError("Network error. Please try again.")
                      } finally {
                        setSubmitting(false)
                      }
                    }}
                    disabled={submitting}
                    className="w-full"
                  >
                    {submitting ? "Claiming..." : "Claim for Desk Review"}
                  </Button>
                </div>
              )}

              {/* Review Form — desk review (claimed) or senior review (desk_screened) */}
              {(selectedProject.project_stage === "intake_desk_claimed" || selectedProject.project_stage === "intake_desk_screened") && (
                <div className="border-t border-border pt-6 space-y-4">
                  <h3 className="text-sm font-semibold">
                    {selectedProject.project_stage === "intake_desk_claimed" ? "Desk Review" : "Senior Review"}
                  </h3>

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm">Decision</Label>
                    <ReviewDecisionCards
                      options={getDecisionCards(selectedProject)}
                      selected={decision}
                      onSelect={setDecision}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">
                      Comments
                      {(decision === "returned" || decision === "returned_to_desk" || decision === "rejected") && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                    <Textarea
                      value={comments}
                      onChange={e => setComments(e.target.value)}
                      rows={4}
                      placeholder="Provide feedback for the submitting ministry..."
                    />
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !decision ||
                      submitting ||
                      ((decision === "returned" || decision === "returned_to_desk" || decision === "rejected") && !comments.trim())
                    }
                    className="w-full"
                  >
                    {submitting ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

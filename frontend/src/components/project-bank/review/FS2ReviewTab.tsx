"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2, LayoutGrid, Table2, KanbanSquare, Building2, DollarSign, MapPin,
  ChevronRight, X, AlertCircle, ExternalLink, CheckCircle2, Search,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import {
  formatCurrency, SECTORS, PROJECT_STAGE_LABELS, PROJECT_STAGE_BADGE_STYLES,
  CATEGORY_SHORT_LABELS, CATEGORY_LABELS, determineCategoryRecommendation,
} from "@/lib/project-bank-utils"
import type { ProjectStage, CategoryDecision } from "@/types/project-bank"
import { ReviewDecisionCards } from "./ReviewDecisionCards"
import type { DecisionOption } from "./types"
import { ReviewTableView } from "./ReviewTableView"
import type { ReviewTableColumn } from "./ReviewTableView"

interface FS2Project {
  id: string
  project_code: string
  name: string
  nominating_ministry: string
  sector: string
  region: string | null
  estimated_cost: number | null
  currency: string
  project_stage: ProjectStage
  firr: number | null
  eirr: number | null
  ndp_aligned: boolean
  category_decision: string | null
  category_recommendation: string | null
  aims_activity_id: string | null
  updated_at: string
}

const FS2_STAGES: ProjectStage[] = ["fs2_assigned", "fs2_in_progress", "fs2_completed", "fs2_categorized"]

interface FS2Columns {
  assigned: FS2Project[]
  in_progress: FS2Project[]
  completed: FS2Project[]
  categorized: FS2Project[]
}

const KANBAN_COLUMNS: { key: keyof FS2Columns; title: string; color: string }[] = [
  { key: "assigned", title: "Assigned — Awaiting Study", color: "bg-blue-500" },
  { key: "in_progress", title: "In Progress", color: "bg-indigo-500" },
  { key: "completed", title: "Study Completed", color: "bg-green-500" },
  { key: "categorized", title: "Categorized", color: "bg-gray-600" },
]

const CATEGORY_DECISION_LABELS: Record<string, string> = {
  category_a: "Private Investment",
  category_b: "Government Budget",
  category_c: "Public-Private Partnership",
}

const CATEGORY_DECISIONS: DecisionOption[] = [
  {
    value: "category_a",
    label: "Private Investment",
    description: "Commercially viable, proceed to investor engagement",
    image: "/images/category-private.png",
    alt: "Private investment",
  },
  {
    value: "category_b",
    label: "Government Budget",
    description: "Funded through domestic public expenditure",
    image: "/images/category-gov-budget.png",
    alt: "Government budget",
  },
  {
    value: "category_c",
    label: "Public-Private Partnership",
    description: "PPP mechanism with government viability support",
    image: "/images/category-ppp.png",
    alt: "PPP mechanism",
  },
]

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
    render: (p: FS2Project) => (
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
  { key: "region", label: "Region", render: (p: FS2Project) => <span>{p.region || "—"}</span> },
  {
    key: "estimated_cost",
    label: "Est. Cost",
    render: (p: FS2Project) => <span>{formatCurrency(p.estimated_cost, p.currency)}</span>,
  },
  {
    key: "project_stage",
    label: "Stage",
    render: (p: FS2Project) => {
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

function KanbanCard({ project, onClick }: { project: FS2Project; onClick: () => void }) {
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
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{project.nominating_ministry}</span>
        <span>·</span>
        <span>{project.sector}</span>
      </div>
      {project.category_decision && (
        <div className="mt-2">
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            {CATEGORY_DECISION_LABELS[project.category_decision] || project.category_decision}
          </span>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {new Date(project.updated_at).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-1.5">
          {project.aims_activity_id && (
            <a
              href={`/activities/${project.aims_activity_id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              View in AIMS
            </a>
          )}
          {!project.category_decision && (
            <span
              className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
            >
              {PROJECT_STAGE_LABELS[project.project_stage]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function FS2ReviewTab() {
  const router = useRouter()
  const [projects, setProjects] = useState<FS2Project[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"kanban" | "card" | "table">("kanban")
  const [searchQuery, setSearchQuery] = useState("")
  const [sectorFilter, setSectorFilter] = useState("")

  // Modal state
  const [selectedProject, setSelectedProject] = useState<FS2Project | null>(null)
  const [categoryDecision, setCategoryDecision] = useState("")
  const [rationale, setRationale] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await apiFetch("/api/project-bank?status=all")
      if (res.ok) {
        const all = await res.json()
        setProjects(all.filter((p: any) => FS2_STAGES.includes(p.project_stage)))
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const openModal = (p: FS2Project) => {
    setSelectedProject(p)
    setCategoryDecision("")
    setRationale("")
    setError(null)
  }

  const handleCategorize = async () => {
    if (!selectedProject || !categoryDecision) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await apiFetch(`/api/project-bank/${selectedProject.id}/categorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: categoryDecision,
          rationale: rationale || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to categorize project")
        return
      }

      setSelectedProject(null)
      fetchProjects()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublishToAims = async () => {
    if (!selectedProject) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await apiFetch("/api/project-bank/publish-to-aims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: selectedProject.id }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to publish to AIMS")
        return
      }

      setSelectedProject(null)
      fetchProjects()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const filteredProjects = projects.filter(p => {
    if (sectorFilter && p.sector !== sectorFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.project_code.toLowerCase().includes(q) || p.nominating_ministry.toLowerCase().includes(q)
    }
    return true
  })

  const columns: FS2Columns = {
    assigned: filteredProjects.filter(p => p.project_stage === "fs2_assigned"),
    in_progress: filteredProjects.filter(p => p.project_stage === "fs2_in_progress"),
    completed: filteredProjects.filter(p => p.project_stage === "fs2_completed"),
    categorized: filteredProjects.filter(p => p.project_stage === "fs2_categorized"),
  }

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
                  {columns[col.key].length}
                </span>
              </div>
              <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-lg p-2">
                {columns[col.key].length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No projects</p>
                ) : (
                  columns[col.key].map(p => (
                    <KanbanCard key={p.id} project={p} onClick={() => openModal(p)} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Card View */}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <p className="text-sm">No projects in Detailed Feasibility Study pipeline</p>
            </div>
          ) : filteredProjects.map(p => {
            const style = PROJECT_STAGE_BADGE_STYLES[p.project_stage]
            return (
              <div
                key={p.id}
                onClick={() => openModal(p)}
                className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <span className="font-mono text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">{p.project_code}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{p.nominating_ministry}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{p.region || "—"}</span>
                  </div>
                  <div className="text-muted-foreground">{p.sector}</div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-3 w-3 shrink-0" />
                    <span>{fmtCost(p.estimated_cost, p.currency) || "—"}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </span>
                  <span
                    className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
                  >
                    {PROJECT_STAGE_LABELS[p.project_stage]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <ReviewTableView
          projects={filteredProjects}
          columns={TABLE_COLUMNS}
          onRowClick={openModal}
          emptyMessage="No projects in Detailed Feasibility Study pipeline"
        />
      )}

      {/* FS-2 Review Modal */}
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
                </div>
                <div>
                  <span className="text-muted-foreground">Sector</span>
                  <p className="font-medium">{selectedProject.sector}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Region</span>
                  <p className="font-medium">{selectedProject.region || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Estimated Amount</span>
                  <p className="font-medium">{formatCurrency(selectedProject.estimated_cost, selectedProject.currency)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Stage</span>
                  <p className="font-medium">{PROJECT_STAGE_LABELS[selectedProject.project_stage]}</p>
                </div>
                {selectedProject.category_decision && (
                  <div>
                    <span className="text-muted-foreground">Category</span>
                    <p className="font-medium">
                      {CATEGORY_LABELS[selectedProject.category_decision as CategoryDecision] || selectedProject.category_decision}
                    </p>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => router.push(`/project-bank/${selectedProject.id}`)}
              >
                View Full Project Details
              </Button>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Assigned / In Progress — informational */}
              {(selectedProject.project_stage === "fs2_assigned" || selectedProject.project_stage === "fs2_in_progress") && (
                <div className="border-t border-border pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4" />
                    <span>
                      {selectedProject.project_stage === "fs2_assigned"
                        ? "This project has been assigned for a Detailed Feasibility Study. The study team will update its progress on the project detail page."
                        : "The Detailed Feasibility Study is in progress. Once completed, the project can be categorized here."
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Completed — categorization form */}
              {selectedProject.project_stage === "fs2_completed" && (() => {
                const recommendation = determineCategoryRecommendation(
                  selectedProject.firr,
                  selectedProject.eirr,
                  selectedProject.ndp_aligned,
                  selectedProject.sector,
                )
                const isOverride = categoryDecision && recommendation && categoryDecision !== recommendation
                const canSubmit = categoryDecision && (!isOverride || rationale.trim().length > 0)

                return (
                  <div className="border-t border-border pt-6 space-y-4">
                    <h3 className="text-sm font-semibold">Category Decision</h3>

                    {/* System recommendation banner */}
                    {recommendation ? (
                      <div className="rounded-lg border border-[#5f7f7a]/20 bg-[#f6f5f3] px-4 py-3">
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">System Recommendation: {CATEGORY_LABELS[recommendation]}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Based on FIRR {selectedProject.firr ?? "—"}%, EIRR {selectedProject.eirr ?? "—"}%,
                          NDP-aligned: {selectedProject.ndp_aligned ? "Yes" : "No"}, Sector: {selectedProject.sector}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-sm text-amber-800">
                          <span className="font-semibold">No system recommendation available</span>
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          FIRR: {selectedProject.firr ?? "not set"}, EIRR: {selectedProject.eirr ?? "not set"},
                          NDP-aligned: {selectedProject.ndp_aligned ? "Yes" : "No"}
                          — ensure financial analysis is completed for an automated recommendation.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm">Category</Label>
                      <ReviewDecisionCards
                        options={CATEGORY_DECISIONS}
                        selected={categoryDecision}
                        onSelect={setCategoryDecision}
                        recommendedValue={recommendation}
                      />
                    </div>

                    {/* Rationale — required when overriding, optional otherwise */}
                    {isOverride ? (
                      <div className="space-y-2">
                        <Label className="text-sm">
                          Rationale for Override <span className="text-red-500">*</span>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          You are selecting a different category than the system recommendation. Please explain why.
                        </p>
                        <Textarea
                          value={rationale}
                          onChange={e => setRationale(e.target.value)}
                          rows={3}
                          placeholder="Explain why you are overriding the system recommendation..."
                        />
                      </div>
                    ) : categoryDecision ? (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Rationale (optional)</Label>
                        <Textarea
                          value={rationale}
                          onChange={e => setRationale(e.target.value)}
                          rows={2}
                          placeholder="Additional notes..."
                        />
                      </div>
                    ) : null}

                    <Button
                      onClick={handleCategorize}
                      disabled={!canSubmit || submitting}
                      className="w-full"
                    >
                      {submitting ? "Submitting..." : "Submit Category Decision"}
                    </Button>
                  </div>
                )
              })()}

              {/* Categorized — show decision + AIMS action */}
              {selectedProject.project_stage === "fs2_categorized" && (
                <div className="border-t border-border pt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold">
                      {CATEGORY_LABELS[selectedProject.category_decision as CategoryDecision] || "Categorized"}
                    </span>
                  </div>

                  {selectedProject.aims_activity_id ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                      <p className="text-sm text-blue-800 mb-2">This project has been published to AIMS.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/activities/${selectedProject.aims_activity_id}`)}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        View in AIMS
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        This project has been categorized but not yet published to the AIMS/DFMIS. Publishing will create an activity record in the AIMS.
                      </p>
                      <Button
                        onClick={handlePublishToAims}
                        disabled={submitting}
                        className="w-full"
                      >
                        {submitting ? "Publishing..." : "Publish to AIMS"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

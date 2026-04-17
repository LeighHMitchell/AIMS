"use client"

import { useEffect, useState, useCallback } from "react"
import { RequiredDot } from "@/components/ui/required-dot"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FilterBar } from "@/components/ui/filter-bar"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronRight, AlertCircle, Loader2, Search,
  KanbanSquare, Table2, X,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import {
  formatCurrency, formatCurrencyParts, fmtCost, REGIONS, PROJECT_STAGE_LABELS, PROJECT_STAGE_BADGE_STYLES,
  CATEGORY_LABELS, determineCategoryRecommendation,
} from "@/lib/project-bank-utils"
import type { CategoryDecision } from "@/types/project-bank"
import type { FS2ReviewProject, FS2ReviewColumns, FS2ColumnKey, DecisionOption } from "./types"
import { ReviewDecisionCards } from "./ReviewDecisionCards"
import { ReviewTableView } from "./ReviewTableView"
import type { ReviewTableColumn } from "./ReviewTableView"

/* ── Decision options ──────────────────────────────────── */

const DESK_REVIEW_DECISIONS: DecisionOption[] = [
  {
    value: "screened",
    label: "Pass Desk Review",
    description: "Advance to senior review stage",
    image: "/images/review-approve.png",
    alt: "Approval seal",
  },
  {
    value: "returned",
    label: "Return for Revision",
    description: "Send back for further work",
    image: "/images/review-return.png",
    alt: "Microscope",
  },
  {
    value: "rejected",
    label: "Reject",
    description: "Study findings are insufficient",
    image: "/images/review-reject.png",
    alt: "Square peg round hole",
  },
]

const SENIOR_REVIEW_DECISIONS: DecisionOption[] = [
  {
    value: "passed",
    label: "Pass to Categorization",
    description: "Ready for project categorization",
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
    description: "Send back for further work",
    image: "/images/review-return.png",
    alt: "Microscope",
  },
  {
    value: "rejected",
    label: "Reject",
    description: "Study findings are insufficient",
    image: "/images/review-reject.png",
    alt: "Square peg round hole",
  },
]

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
  {
    value: "category_d",
    label: "Development Partner (ODA)",
    description: "Funded through bilateral or multilateral development partners",
    image: "/images/category-oda.png",
    alt: "ODA funding",
  },
]

/* ── Kanban columns config ─────────────────────────────── */

const KANBAN_COLUMNS: { key: FS2ColumnKey; title: string; color: string }[] = [
  { key: "pending", title: "Step 1: Pending Desk Review", color: "bg-[#7b95a7]" },
  { key: "desk_review", title: "Step 2: Desk Review", color: "bg-[#4c5568]" },
  { key: "senior_review", title: "Step 3: Pending Senior Review", color: "bg-[#3C6255]" },
  { key: "categorized", title: "Step 4: Senior Review", color: "bg-[#cfd0d5]" },
]

/* ── Table columns ─────────────────────────────────────── */

const TABLE_COLUMNS: ReviewTableColumn[] = [
  {
    key: "name",
    label: "Project",
    render: (p: FS2ReviewProject) => (
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
    render: (p: FS2ReviewProject) => (
      <div>
        <span>{p.nominating_ministry}</span>
        {p.implementing_agency && <p className="text-xs text-muted-foreground">{p.implementing_agency}</p>}
      </div>
    ),
  },
  {
    key: "sector",
    label: "Sector",
    render: (p: FS2ReviewProject) => (
      <div>
        <span>{p.sector}</span>
        {p.sub_sector && <p className="text-xs text-muted-foreground">{p.sub_sector}</p>}
      </div>
    ),
  },
  { key: "region", label: "Region", render: (p: FS2ReviewProject) => <span>{p.region || "—"}</span> },
  {
    key: "estimated_cost",
    label: "Estimated Cost",
    render: (p: FS2ReviewProject) => {
      const parts = formatCurrencyParts(p.estimated_cost, p.currency)
      if (!parts) return <span>—</span>
      return <span><span className="text-muted-foreground">{parts.prefix}</span> {parts.amount}</span>
    },
  },
  {
    key: "project_stage",
    label: "Stage",
    render: (p: FS2ReviewProject) => {
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

function FS2KanbanCard({ project, onClick }: { project: FS2ReviewProject; onClick: () => void }) {
  const costParts = formatCurrencyParts(project.estimated_cost, project.currency)
  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative"
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
        {costParts && (
          <div className="mt-1.5">
            <span className="text-xs font-medium"><span className="text-muted-foreground">{costParts.prefix}</span> {costParts.amount}</span>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {new Date(project.updated_at).toLocaleDateString()}
          </span>
          {project.reviewer_name && (
            <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 truncate max-w-[120px]">
              {project.reviewer_name}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main component ────────────────────────────────────── */

interface PBSector { id: string; code: string; name: string }

export function FS2ReviewTab() {
  const router = useRouter()
  const [kanbanColumns, setKanbanColumns] = useState<FS2ReviewColumns>({ pending: [], desk_review: [], senior_review: [], categorized: [] })
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban")
  const [searchQuery, setSearchQuery] = useState("")
  const [sectorFilter, setSectorFilter] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  const [sectors, setSectors] = useState<PBSector[]>([])

  useEffect(() => {
    apiFetch('/api/pb-sectors').then(r => r.ok ? r.json() : []).then(setSectors).catch(() => {})
  }, [])

  // Modal state
  const [selectedProject, setSelectedProject] = useState<FS2ReviewProject | null>(null)
  const [reviewDecision, setReviewDecision] = useState("")
  const [reviewComments, setReviewComments] = useState("")
  const [categoryDecision, setCategoryDecision] = useState("")
  const [rationale, setRationale] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBoard = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (sectorFilter) params.set("sector", sectorFilter)
      if (regionFilter) params.set("region", regionFilter)
      const res = await apiFetch(`/api/project-bank/review-board/fs2?${params}`)
      if (res.ok) setKanbanColumns(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [sectorFilter, regionFilter])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  const allProjects = [...kanbanColumns.pending, ...kanbanColumns.desk_review, ...kanbanColumns.senior_review, ...kanbanColumns.categorized]

  const filterProjects = <T extends FS2ReviewProject>(projects: T[]): T[] => {
    if (!searchQuery) return projects
    const q = searchQuery.toLowerCase()
    return projects.filter(p =>
      p.name.toLowerCase().includes(q) || p.project_code.toLowerCase().includes(q) || p.nominating_ministry.toLowerCase().includes(q)
    )
  }

  const openReview = (p: FS2ReviewProject) => {
    setSelectedProject(p)
    setReviewDecision("")
    setReviewComments("")
    setCategoryDecision("")
    setRationale("")
    setError(null)
  }

  /* ── Review submit (desk + senior) ── */
  const handleReviewSubmit = async () => {
    if (!selectedProject || !reviewDecision) return
    setSubmitting(true)
    setError(null)

    const reviewTier = (selectedProject.project_stage === "fs2_completed" || selectedProject.project_stage === "fs2_desk_claimed") ? "desk" : "senior"

    try {
      const res = await apiFetch(`/api/project-bank/${selectedProject.id}/fs2-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_tier: reviewTier,
          decision: reviewDecision,
          comments: reviewComments || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to submit review")
        return
      }

      setSelectedProject(null)
      fetchBoard()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Categorization submit ── */
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
      fetchBoard()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Render ── */

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
          <Label className="text-xs text-muted-foreground">Region</Label>
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
                  <h3 className="text-sm font-semibold">{col.title}</h3>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {kanbanColumns[col.key].length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-lg p-2">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No projects</p>
                  ) : (
                    filtered.map(p => (
                      <FS2KanbanCard key={p.id} project={p} onClick={() => openReview(p)} />
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
          columns={TABLE_COLUMNS}
          onRowClick={openReview}
          emptyMessage="No projects awaiting FS-2 review"
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
              </div>

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

              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Claim for Review — pending projects */}
              {selectedProject.project_stage === "fs2_completed" && (
                <div className="border-t border-border pt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This study is complete and pending review. Claim it to begin desk review.
                  </p>
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
                        fetchBoard()
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

              {/* Desk Review form (fs2_desk_claimed) */}
              {selectedProject.project_stage === "fs2_desk_claimed" && (
                <div className="border-t border-border pt-6 space-y-4">
                  <h3 className="text-sm font-semibold">Desk Review</h3>

                  <div className="space-y-2">
                    <Label className="text-sm">Decision</Label>
                    <ReviewDecisionCards
                      options={DESK_REVIEW_DECISIONS}
                      selected={reviewDecision}
                      onSelect={setReviewDecision}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">
                      Comments
                      {(reviewDecision === "returned" || reviewDecision === "returned_to_desk" || reviewDecision === "rejected") && (
                        <RequiredDot />
                      )}
                    </Label>
                    <Textarea
                      value={reviewComments}
                      onChange={e => setReviewComments(e.target.value)}
                      rows={3}
                      placeholder="Provide review comments..."
                    />
                  </div>

                  <Button
                    onClick={handleReviewSubmit}
                    disabled={
                      !reviewDecision ||
                      submitting ||
                      ((reviewDecision === "returned" || reviewDecision === "returned_to_desk" || reviewDecision === "rejected") && !reviewComments.trim())
                    }
                    className="w-full"
                  >
                    {submitting ? "Submitting..." : "Submit Desk Review"}
                  </Button>
                </div>
              )}

              {/* Step 2: Senior Review form (fs2_desk_reviewed) */}
              {selectedProject.project_stage === "fs2_desk_reviewed" && (
                <div className="border-t border-border pt-6 space-y-4">
                  <h3 className="text-sm font-semibold">Senior Review</h3>

                  <div className="space-y-2">
                    <Label className="text-sm">Decision</Label>
                    <ReviewDecisionCards
                      options={SENIOR_REVIEW_DECISIONS}
                      selected={reviewDecision}
                      onSelect={setReviewDecision}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">
                      Comments
                      {(reviewDecision === "returned" || reviewDecision === "returned_to_desk" || reviewDecision === "rejected") && (
                        <RequiredDot />
                      )}
                    </Label>
                    <Textarea
                      value={reviewComments}
                      onChange={e => setReviewComments(e.target.value)}
                      rows={3}
                      placeholder="Provide review comments..."
                    />
                  </div>

                  <Button
                    onClick={handleReviewSubmit}
                    disabled={
                      !reviewDecision ||
                      submitting ||
                      ((reviewDecision === "returned" || reviewDecision === "returned_to_desk" || reviewDecision === "rejected") && !reviewComments.trim())
                    }
                    className="w-full"
                  >
                    {submitting ? "Submitting..." : "Submit Senior Review"}
                  </Button>
                </div>
              )}

              {/* Step 3: Categorization form (fs2_senior_reviewed) */}
              {selectedProject.project_stage === "fs2_senior_reviewed" && (() => {
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
                          Rationale for Override <RequiredDot />
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
            </div>
          </div>
        </div>
      )}
    </>
  )
}

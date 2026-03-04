"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  KanbanSquare, Search, X, RotateCcw,
  ChevronRight, AlertCircle, Loader2, FileText, Table2,
} from "lucide-react"
import {
  DndContext, DragOverlay, DragStartEvent, DragEndEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
  closestCorners,
} from "@dnd-kit/core"
import { apiFetch } from "@/lib/api-fetch"
import {
  formatCurrency, formatCurrencyParts, SECTORS, FEASIBILITY_STAGE_LABELS, FEASIBILITY_STAGE_BADGE_STYLES,
} from "@/lib/project-bank-utils"
import type { FS1Narrative } from "@/types/project-bank"
import { NARRATIVE_SECTIONS } from "@/components/project-bank/fs1/FS1NarrativeForm"
import type { ReviewProject, ColumnKey, ReviewColumns, DecisionOption } from "./types"
import { ReviewDecisionCards } from "./ReviewDecisionCards"
import { ReviewTableView } from "./ReviewTableView"
import type { ReviewTableColumn } from "./ReviewTableView"

const VALID_TRANSITIONS: Record<string, { target: ColumnKey; review_tier: string; decision: string }> = {
  "submitted->desk_screened": { target: "desk_screened", review_tier: "desk", decision: "screened" },
}

const DESK_REVIEW_DECISIONS: DecisionOption[] = [
  {
    value: "screened",
    label: "Pass Desk Screen",
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
    value: "passed",
    label: "Pass to Detailed Feasibility",
    description: "Advance to Detailed Feasibility Study",
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

function DraggableProjectCard({
  project,
  column,
  onSelect,
}: {
  project: ReviewProject
  column: ColumnKey
  onSelect: (p: ReviewProject) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: project.id,
    data: { project, column },
  })
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow touch-none ${
        isDragging ? "opacity-50" : ""
      }`}
      onPointerDown={(e) => {
        pointerStartRef.current = { x: e.clientX, y: e.clientY }
      }}
      onClick={(e) => {
        if (pointerStartRef.current) {
          const dx = e.clientX - pointerStartRef.current.x
          const dy = e.clientY - pointerStartRef.current.y
          if (Math.sqrt(dx * dx + dy * dy) > 8) return
        }
        onSelect(project)
      }}
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

function ProjectCardOverlay({ project }: { project: ReviewProject }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg rotate-2 w-[280px]">
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
        <div className="flex items-center gap-2">
          <span>{project.nominating_ministry}</span>
          <span>·</span>
          <span>{project.sector}</span>
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

function DroppableColumn({
  columnKey,
  title,
  projects,
  count,
  color,
  activeSourceColumn,
  onSelect,
}: {
  columnKey: ColumnKey
  title: string
  projects: ReviewProject[]
  count: number
  color: string
  activeSourceColumn: ColumnKey | null
  onSelect: (p: ReviewProject) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey })

  const isValidTarget =
    activeSourceColumn !== null &&
    activeSourceColumn !== columnKey &&
    `${activeSourceColumn}->${columnKey}` in VALID_TRANSITIONS

  const highlightClass =
    isOver && isValidTarget ? "ring-2 ring-primary/40 bg-primary/5" : ""

  return (
    <div className="flex-1 min-w-[280px]">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[200px] bg-muted/30 rounded-lg p-2 transition-all ${highlightClass}`}
      >
        {projects.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No projects</p>
        ) : (
          projects.map(p => (
            <DraggableProjectCard key={p.id} project={p} column={columnKey} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  )
}

const TABLE_COLUMNS: ReviewTableColumn[] = [
  {
    key: "name",
    label: "Project",
    render: (p: ReviewProject) => (
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
    render: (p: ReviewProject) => (
      <div>
        <span>{p.nominating_ministry}</span>
        {p.implementing_agency && <p className="text-xs text-muted-foreground">{p.implementing_agency}</p>}
      </div>
    ),
  },
  {
    key: "sector",
    label: "Sector",
    render: (p: ReviewProject) => (
      <div>
        <span>{p.sector}</span>
        {p.sub_sector && <p className="text-xs text-muted-foreground">{p.sub_sector}</p>}
      </div>
    ),
  },
  { key: "region", label: "Region", render: (p: ReviewProject) => <span>{p.region || "—"}</span> },
  {
    key: "estimated_cost",
    label: "Estimated Cost",
    render: (p: ReviewProject) => {
      const parts = formatCurrencyParts(p.estimated_cost, p.currency)
      if (!parts) return <span>—</span>
      return <span><span className="text-muted-foreground">{parts.prefix}</span> {parts.amount}</span>
    },
  },
  {
    key: "project_stage",
    label: "Stage",
    render: (p: ReviewProject) => {
      const stage = p.project_stage || p.feasibility_stage
      const style = FEASIBILITY_STAGE_BADGE_STYLES[stage]
      return (
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: style?.bg, color: style?.text, border: `1px solid ${style?.border}` }}
        >
          {FEASIBILITY_STAGE_LABELS[stage] || stage}
        </span>
      )
    },
  },
]

export function FS1ReviewTab() {
  const router = useRouter()
  const [columns, setColumns] = useState<ReviewColumns>({ submitted: [], desk_screened: [], returned: [] })
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban")
  const [sectorFilter, setSectorFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const [draggedProject, setDraggedProject] = useState<ReviewProject | null>(null)
  const [activeSourceColumn, setActiveSourceColumn] = useState<ColumnKey | null>(null)

  const [selectedProject, setSelectedProject] = useState<ReviewProject | null>(null)
  const [reviewDecision, setReviewDecision] = useState<string>("")
  const [reviewComments, setReviewComments] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const [narrativeData, setNarrativeData] = useState<FS1Narrative | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)

  const [gateChecks, setGateChecks] = useState<Record<string, boolean>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const fetchBoard = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (sectorFilter) params.set("sector", sectorFilter)
      const res = await apiFetch(`/api/project-bank/review-board?${params}`)
      if (res.ok) setColumns(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [sectorFilter])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  const filterProjects = (projects: ReviewProject[]) => {
    if (!searchQuery) return projects
    const q = searchQuery.toLowerCase()
    return projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.project_code.toLowerCase().includes(q) ||
      p.nominating_ministry.toLowerCase().includes(q)
    )
  }

  const handleSelectProject = useCallback((project: ReviewProject) => {
    setSelectedProject(project)
    setReviewDecision("")
    setReviewComments("")
    setReviewError(null)
    setGateChecks({})
    setNarrativeData(null)
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    setNarrativeLoading(true)
    apiFetch(`/api/project-bank/${selectedProject.id}/fs1-narrative`)
      .then(res => res.ok ? res.json() : [])
      .then((data: FS1Narrative[]) => setNarrativeData(data[0] || null))
      .catch(() => setNarrativeData(null))
      .finally(() => setNarrativeLoading(false))
  }, [selectedProject])

  useEffect(() => {
    setGateChecks({})
  }, [reviewDecision])

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { project: ReviewProject; column: ColumnKey }
    setDraggedProject(data.project)
    setActiveSourceColumn(data.column)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedProject(null)
    setActiveSourceColumn(null)

    if (!over) return

    const source = (active.data.current as { column: ColumnKey }).column
    const target = over.id as ColumnKey
    if (source === target) return

    const transitionKey = `${source}->${target}`
    const transition = VALID_TRANSITIONS[transitionKey]
    if (!transition) return

    const project = (active.data.current as { project: ReviewProject }).project

    const prevColumns = { ...columns }
    setColumns(prev => ({
      ...prev,
      [source]: prev[source].filter(p => p.id !== project.id),
      [target]: [...prev[target], project],
    }))

    try {
      const res = await apiFetch(`/api/project-bank/${project.id}/fs1-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_tier: transition.review_tier,
          decision: transition.decision,
        }),
      })

      if (!res.ok) {
        setColumns(prevColumns)
      } else {
        fetchBoard()
      }
    } catch {
      setColumns(prevColumns)
    }
  }

  const handleReviewSubmit = async () => {
    if (!selectedProject || !reviewDecision) return
    setSubmittingReview(true)
    setReviewError(null)

    const reviewTier = selectedProject.project_stage === "fs1_submitted" ? "desk" : "senior"

    try {
      const res = await apiFetch(`/api/project-bank/${selectedProject.id}/fs1-review`, {
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
        setReviewError(data.error || "Failed to submit review")
        return
      }

      setSelectedProject(null)
      setReviewDecision("")
      setReviewComments("")
      fetchBoard()
    } catch {
      setReviewError("Network error. Please try again.")
    } finally {
      setSubmittingReview(false)
    }
  }

  const getDecisionCards = (stage: string): DecisionOption[] => {
    if (stage === "fs1_submitted") return DESK_REVIEW_DECISIONS
    return SENIOR_REVIEW_DECISIONS
  }

  // Flatten all columns for table view
  const allProjects = [...columns.submitted, ...columns.desk_screened, ...columns.returned]

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

      {/* Kanban Board */}
      {viewMode === "kanban" && (
        <>
          {loading ? (
            <div className="flex gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-1 min-w-[280px]">
                  <div className="h-6 bg-muted animate-pulse rounded w-32 mb-3" />
                  <div className="space-y-2 bg-muted/30 rounded-lg p-2 min-h-[200px]">
                    {[1, 2].map(j => (
                      <div key={j} className="h-24 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 overflow-x-auto pb-4">
                <DroppableColumn
                  columnKey="submitted"
                  title="Step 1: Desk Review"
                  projects={filterProjects(columns.submitted)}
                  count={columns.submitted.length}
                  color="bg-[#7b95a7]"
                  activeSourceColumn={activeSourceColumn}
                  onSelect={handleSelectProject}
                />
                <DroppableColumn
                  columnKey="desk_screened"
                  title="Step 2: Senior Review"
                  projects={filterProjects(columns.desk_screened)}
                  count={columns.desk_screened.length}
                  color="bg-[#4c5568]"
                  activeSourceColumn={activeSourceColumn}
                  onSelect={handleSelectProject}
                />
                <DroppableColumn
                  columnKey="returned"
                  title="Returned"
                  projects={filterProjects(columns.returned)}
                  count={columns.returned.length}
                  color="bg-[#dc2625]"
                  activeSourceColumn={activeSourceColumn}
                  onSelect={handleSelectProject}
                />
              </div>

              <DragOverlay>
                {draggedProject ? <ProjectCardOverlay project={draggedProject} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ReviewTableView
            projects={filterProjects(allProjects)}
            columns={TABLE_COLUMNS}
            onRowClick={handleSelectProject}
            emptyMessage="No projects in Preliminary Feasibility review"
          />
        )
      )}

      {/* Preliminary Feasibility Review Modal */}
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

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => router.push(`/project-bank/${selectedProject.id}`)}
              >
                View Full Project Details
              </Button>

              {narrativeLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading narrative...
                </div>
              )}
              {narrativeData && !narrativeLoading && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">Preliminary Feasibility Narrative</h4>
                  </div>
                  <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                    {NARRATIVE_SECTIONS.map(section => (
                      <div key={section.key} className="px-4 py-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          {section.label}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {(narrativeData as unknown as Record<string, string>)[section.key] || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedProject.project_stage === "fs1_submitted" || selectedProject.project_stage === "fs1_desk_screened") && (
                <div className="border-t border-border pt-6 space-y-4">
                  <h3 className="text-sm font-semibold">
                    {selectedProject.project_stage === "fs1_submitted" ? "Desk Review" : "Senior Review"}
                  </h3>

                  {reviewError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-800">{reviewError}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm">Decision</Label>
                    <ReviewDecisionCards
                      options={getDecisionCards(selectedProject.project_stage)}
                      selected={reviewDecision}
                      onSelect={setReviewDecision}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">
                      Comments
                      {(reviewDecision === "returned" || reviewDecision === "rejected") && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                    <Textarea
                      value={reviewComments}
                      onChange={e => setReviewComments(e.target.value)}
                      rows={4}
                      placeholder="Provide feedback for the submitting ministry..."
                    />
                  </div>

                  {reviewDecision === "passed" && selectedProject.project_stage === "fs1_desk_screened" && (
                    <div className="border border-border rounded-lg p-4 space-y-3">
                      <h4 className="text-sm font-semibold">Gate Checklist</h4>
                      <p className="text-xs text-muted-foreground">
                        All items must be confirmed before advancing to Detailed Feasibility Study.
                      </p>
                      {[
                        { key: "narrative_reviewed", label: "I have reviewed the Preliminary Feasibility narrative" },
                        { key: "ndp_alignment", label: "NDP/MSDP alignment is satisfactory" },
                        { key: "cost_estimate", label: "Preliminary cost estimate is reasonable" },
                      ].map(item => (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={gateChecks[item.key] || false}
                            onCheckedChange={(v) =>
                              setGateChecks(prev => ({ ...prev, [item.key]: v === true }))
                            }
                          />
                          <span className="text-sm">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={handleReviewSubmit}
                    disabled={
                      !reviewDecision ||
                      submittingReview ||
                      ((reviewDecision === "returned" || reviewDecision === "rejected") && !reviewComments.trim()) ||
                      (reviewDecision === "passed" && selectedProject.project_stage === "fs1_desk_screened" &&
                        !["narrative_reviewed", "ndp_alignment", "cost_estimate"].every(k => gateChecks[k]))
                    }
                    className="w-full"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              )}

              {selectedProject.project_stage === "fs1_returned" && (
                <div className="border-t border-border pt-6">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-semibold">
                      {FEASIBILITY_STAGE_LABELS[selectedProject.project_stage]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This project was returned for revision. It will reappear in the Submitted column once the submitter resubmits.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

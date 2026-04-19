"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { RequiredDot } from "@/components/ui/required-dot"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FilterBar } from "@/components/ui/filter-bar"
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
  formatCurrency, formatCurrencyParts, REGIONS, FEASIBILITY_STAGE_LABELS, FEASIBILITY_STAGE_BADGE_STYLES,
} from "@/lib/project-bank-utils"
import type { FS1Narrative } from "@/types/project-bank"
import { NARRATIVE_SECTIONS } from "@/components/project-bank/fs1/FS1NarrativeForm"
import type { ReviewProject, ColumnKey, ReviewColumns, DecisionOption } from "./types"
import { ReviewDecisionCards } from "./ReviewDecisionCards"
import { ReviewTableView } from "./ReviewTableView"
import type { ReviewTableColumn } from "./ReviewTableView"

const VALID_TRANSITIONS: Record<string, { target: ColumnKey; action: string }> = {
  "pending->desk_review": { target: "desk_review", action: "claim" },
}

const GATE_CHECKLIST_ITEMS = [
  { key: "narrative_reviewed", label: "I have reviewed the Preliminary Feasibility narrative" },
  { key: "ndp_alignment", label: "NDP/MSDP alignment is satisfactory" },
  { key: "cost_estimate", label: "Preliminary cost estimate is reasonable" },
]

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
    value: "passed",
    label: "Pass to Detailed Feasibility",
    description: "Advance to Detailed Feasibility Study",
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

  const costParts = formatCurrencyParts(project.estimated_cost, project.currency)

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-card border border-border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow touch-none relative ${
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
              <p className="text-body font-medium truncate">{project.name}</p>
              <span className="font-mono text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">{project.project_code}</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
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
          <span className="text-helper text-muted-foreground">
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

function ProjectCardOverlay({ project }: { project: ReviewProject }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg rotate-2 w-[280px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-body font-medium truncate">{project.name}</p>
            <span className="font-mono text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">{project.project_code}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>
      <div className="mt-2 space-y-0.5 text-helper text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{project.nominating_ministry}</span>
          <span>·</span>
          <span>{project.sector}</span>
        </div>
      </div>
      <div className="mt-2">
        <span className="text-helper text-muted-foreground">
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
        <h3 className="text-body font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[200px] bg-muted/30 rounded-lg p-2 transition-all ${highlightClass}`}
      >
        {projects.length === 0 ? (
          <p className="text-helper text-muted-foreground text-center py-8">No projects</p>
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
          <p className="text-body font-medium truncate">{p.name}</p>
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
        {p.implementing_agency && <p className="text-helper text-muted-foreground">{p.implementing_agency}</p>}
      </div>
    ),
  },
  {
    key: "sector",
    label: "Sector",
    render: (p: ReviewProject) => (
      <div>
        <span>{p.sector}</span>
        {p.sub_sector && <p className="text-helper text-muted-foreground">{p.sub_sector}</p>}
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

interface PBSector { id: string; code: string; name: string }

export function FS1ReviewTab() {
  const router = useRouter()
  const [columns, setColumns] = useState<ReviewColumns>({ pending: [], desk_review: [], senior_review: [] })
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban")
  const [sectorFilter, setSectorFilter] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sectors, setSectors] = useState<PBSector[]>([])

  useEffect(() => {
    apiFetch('/api/pb-sectors').then(r => r.ok ? r.json() : []).then(setSectors).catch(() => {})
  }, [])

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
      if (regionFilter) params.set("region", regionFilter)
      const res = await apiFetch(`/api/project-bank/review-board?${params}`)
      if (res.ok) setColumns(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [sectorFilter, regionFilter])

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
      const res = transition.action === "claim"
        ? await apiFetch(`/api/project-bank/${project.id}/claim-review`, { method: "POST" })
        : await apiFetch(`/api/project-bank/${project.id}/fs1-review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ review_tier: "desk", decision: "screened" }),
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

    const reviewTier = (selectedProject.project_stage === "fs1_submitted" || selectedProject.project_stage === "fs1_desk_claimed") ? "desk" : "senior"

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
    if (stage === "fs1_submitted" || stage === "fs1_desk_claimed") return DESK_REVIEW_DECISIONS
    return SENIOR_REVIEW_DECISIONS
  }

  // Flatten all columns for table view
  const allProjects = [...columns.pending, ...columns.desk_review, ...columns.senior_review]

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
                  columnKey="pending"
                  title="Step 1: Pending Desk Review"
                  projects={filterProjects(columns.pending)}
                  count={columns.pending.length}
                  color="bg-[#7b95a7]"
                  activeSourceColumn={activeSourceColumn}
                  onSelect={handleSelectProject}
                />
                <DroppableColumn
                  columnKey="desk_review"
                  title="Step 2: Desk Review"
                  projects={filterProjects(columns.desk_review)}
                  count={columns.desk_review.length}
                  color="bg-[#4c5568]"
                  activeSourceColumn={activeSourceColumn}
                  onSelect={handleSelectProject}
                />
                <DroppableColumn
                  columnKey="senior_review"
                  title="Step 3: Pending Senior Review"
                  projects={filterProjects(columns.senior_review)}
                  count={columns.senior_review.length}
                  color="bg-[#3C6255]"
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
              <div className="grid grid-cols-2 gap-4 text-body">
                <div>
                  <span className="text-muted-foreground">Ministry</span>
                  <p className="font-medium">{selectedProject.nominating_ministry}</p>
                  {selectedProject.implementing_agency && (
                    <p className="text-helper text-muted-foreground">{selectedProject.implementing_agency}</p>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Sector</span>
                  <p className="font-medium">{selectedProject.sector}</p>
                  {selectedProject.sub_sector && (
                    <p className="text-helper text-muted-foreground">{selectedProject.sub_sector}</p>
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

              {narrativeLoading && (
                <div className="flex items-center gap-2 text-body text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading narrative...
                </div>
              )}
              {narrativeData && !narrativeLoading && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-body font-semibold">Preliminary Feasibility Narrative</h4>
                  </div>
                  <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                    {NARRATIVE_SECTIONS.map(section => (
                      <div key={section.key} className="px-4 py-3">
                        <p className="text-section-label font-semibold text-muted-foreground uppercase mb-1">
                          {section.label}
                        </p>
                        <p className="text-body whitespace-pre-wrap">
                          {(narrativeData as unknown as Record<string, string>)[section.key] || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Claim for Review — pending projects */}
              {selectedProject.project_stage === "fs1_submitted" && (
                <div className="border-t border-border pt-6 space-y-4">
                  <p className="text-body text-muted-foreground">
                    This project is pending review. Claim it to begin desk review.
                  </p>
                  {reviewError && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-body text-destructive">{reviewError}</p>
                    </div>
                  )}
                  <Button
                    onClick={async () => {
                      setSubmittingReview(true)
                      setReviewError(null)
                      try {
                        const res = await apiFetch(`/api/project-bank/${selectedProject.id}/claim-review`, { method: "POST" })
                        if (!res.ok) {
                          const data = await res.json()
                          setReviewError(data.error || "Failed to claim project")
                          return
                        }
                        setSelectedProject(null)
                        fetchBoard()
                      } catch {
                        setReviewError("Network error. Please try again.")
                      } finally {
                        setSubmittingReview(false)
                      }
                    }}
                    disabled={submittingReview}
                    className="w-full"
                  >
                    {submittingReview ? "Claiming..." : "Claim for Desk Review"}
                  </Button>
                </div>
              )}

              {/* Review Form — desk review (claimed) or senior review (desk_screened) */}
              {(selectedProject.project_stage === "fs1_desk_claimed" || selectedProject.project_stage === "fs1_desk_screened") && (
                <div className="border-t border-border pt-6 space-y-4">
                  <h3 className="text-body font-semibold">
                    {selectedProject.project_stage === "fs1_desk_claimed" ? "Desk Review" : "Senior Review"}
                  </h3>

                  {reviewError && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-body text-destructive">{reviewError}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-body">Decision</Label>
                    <ReviewDecisionCards
                      options={getDecisionCards(selectedProject.project_stage)}
                      selected={reviewDecision}
                      onSelect={setReviewDecision}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-body">
                      Comments
                      {(reviewDecision === "returned" || reviewDecision === "returned_to_desk" || reviewDecision === "rejected") && (
                        <RequiredDot />
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
                      <h4 className="text-body font-semibold">Gate Checklist</h4>
                      <p className="text-helper text-muted-foreground">
                        All items must be confirmed before advancing to Detailed Feasibility Study.
                      </p>
                      {GATE_CHECKLIST_ITEMS.map(item => (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={gateChecks[item.key] || false}
                            onCheckedChange={(v) =>
                              setGateChecks(prev => ({ ...prev, [item.key]: v === true }))
                            }
                          />
                          <span className="text-body">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={handleReviewSubmit}
                    disabled={
                      !reviewDecision ||
                      submittingReview ||
                      ((reviewDecision === "returned" || reviewDecision === "returned_to_desk" || reviewDecision === "rejected") && !reviewComments.trim()) ||
                      (reviewDecision === "passed" && selectedProject.project_stage === "fs1_desk_screened" &&
                        !["narrative_reviewed", "ndp_alignment", "cost_estimate"].every(k => gateChecks[k]))
                    }
                    className="w-full"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
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

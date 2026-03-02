"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  KanbanSquare, Search, X, CheckCircle2, RotateCcw, XCircle,
  ChevronRight, AlertCircle, Clock, Loader2, FileText, Inbox,
  Building2, DollarSign, MapPin, LayoutGrid, List, Copy, Check,
} from "lucide-react"
import {
  DndContext, DragOverlay, DragStartEvent, DragEndEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
  closestCorners,
} from "@dnd-kit/core"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-fetch"
import {
  formatCurrency, SECTORS, FEASIBILITY_STAGE_LABELS, FEASIBILITY_STAGE_BADGE_STYLES,
  PROJECT_STAGE_LABELS, PROJECT_STAGE_BADGE_STYLES,
} from "@/lib/project-bank-utils"
import type { FeasibilityStage, ProjectStage, FS1Narrative } from "@/types/project-bank"
import { NARRATIVE_SECTIONS } from "@/components/project-bank/fs1/FS1NarrativeForm"

// ── Shared types ──

interface ReviewProject {
  id: string
  project_code: string
  name: string
  nominating_ministry: string
  sector: string
  region: string | null
  estimated_cost: number | null
  currency: string
  feasibility_stage: FeasibilityStage
  project_stage: ProjectStage
  fs1_rejected_at: string | null
  created_at: string
  updated_at: string
}

// ═══════════════════════════════════════════════════════════════════════
//  INTAKE REVIEW TAB
// ═══════════════════════════════════════════════════════════════════════

interface IntakeReviewProject {
  id: string
  project_code: string
  name: string
  nominating_ministry: string
  sector: string
  region: string | null
  estimated_cost: number | null
  currency: string
  project_stage: ProjectStage
  description: string | null
  contact_officer: string | null
  contact_email: string | null
  banner: string | null
  banner_position: number | null
  created_at: string
  updated_at: string
}

/** Compact currency formatter for cards */
function fmtCost(value: number | null, currency: string) {
  if (!value) return null
  if (value >= 1_000_000) return `${currency === "USD" ? "$" : currency + " "}${(value / 1_000_000).toFixed(1)}m`
  if (value >= 1_000) return `${currency === "USD" ? "$" : currency + " "}${(value / 1_000).toFixed(0)}k`
  return formatCurrency(value, currency)
}

function IntakeReviewTab() {
  const router = useRouter()
  const [projects, setProjects] = useState<IntakeReviewProject[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [selectedProject, setSelectedProject] = useState<IntakeReviewProject | null>(null)
  const [decision, setDecision] = useState("")
  const [comments, setComments] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await apiFetch("/api/project-bank?status=all")
      if (res.ok) {
        const all = await res.json()
        setProjects(all.filter((p: any) => p.project_stage === "intake_submitted"))
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const openReview = (p: IntakeReviewProject) => {
    setSelectedProject(p); setDecision(""); setComments(""); setError(null)
  }

  const handleSubmit = async () => {
    if (!selectedProject || !decision) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await apiFetch(`/api/project-bank/${selectedProject.id}/intake-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comments: comments || null }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to submit review")
        return
      }

      setSelectedProject(null)
      setDecision("")
      setComments("")
      fetchProjects()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const decisionOptions = [
    {
      value: "approved",
      label: "Approve",
      description: "Unlock the feasibility study phase",
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Inbox className="h-8 w-8 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No projects awaiting intake review</p>
      </div>
    )
  }

  return (
    <>
      {/* View toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{projects.length} project{projects.length !== 1 ? "s" : ""} awaiting review</p>
        <div className="flex items-center border rounded-md">
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
            onClick={() => setViewMode("list")}
            className={`rounded-l-none h-9 ${viewMode === "list" ? "bg-slate-200 text-slate-900" : "text-slate-400"}`}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Card View */}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map(p => (
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
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-white line-clamp-2 leading-snug">{p.name}</h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(p.name) }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/20"
                      title="Copy name"
                    >
                      <Copy className="h-3 w-3 text-white" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-300">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate">{p.nominating_ministry}</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sector</p>
                    <p className="text-sm font-medium text-foreground truncate">{p.sector}</p>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{p.project_code}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(p.project_code) }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                      title="Copy code"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
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
          {projects.map(p => (
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
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(p.name) }}
                        className="shrink-0 opacity-0 group-hover/info:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                        title="Copy name"
                      >
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground font-mono">{p.project_code}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(p.project_code) }}
                        className="shrink-0 opacity-0 group-hover/info:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                        title="Copy code"
                      >
                        <Copy className="h-2.5 w-2.5 text-muted-foreground" />
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
                  <span>·</span>
                  <span>{p.sector}</span>
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

      {/* Intake Review Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedProject(null)} />
          <div className="relative w-full max-w-2xl bg-background shadow-xl rounded-lg overflow-y-auto max-h-[90vh] mx-4">
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

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => router.push(`/project-bank/${selectedProject.id}`)}
              >
                View Full Project Details
              </Button>

              {/* Review Form */}
              <div className="border-t border-border pt-6 space-y-4">
                <h3 className="text-sm font-semibold">Intake Review</h3>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm">Decision</Label>
                  <div className="flex items-center gap-4">
                    {decisionOptions.map(opt => {
                      const isSelected = decision === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDecision(opt.value)}
                          className={cn(
                            "relative flex flex-col justify-end w-[180px] h-[160px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden",
                            isSelected
                              ? "ring-border bg-primary/5"
                              : "ring-border bg-background hover:bg-gray-50"
                          )}
                        >
                          {/* Background image */}
                          <Image src={opt.image} alt={opt.alt} fill className="object-cover opacity-15" />

                          {/* Checkmark overlay */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}

                          {/* Text overlay */}
                          <div className="relative z-10 p-3">
                            <h4 className="text-sm font-semibold">{opt.label}</h4>
                            <p className="mt-1 text-xs text-muted-foreground">{opt.description}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    Comments
                    {(decision === "returned" || decision === "rejected") && (
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
                    ((decision === "returned" || decision === "rejected") && !comments.trim())
                  }
                  className="w-full"
                >
                  {submitting ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  FS-1 REVIEW TAB (existing Kanban board)
// ═══════════════════════════════════════════════════════════════════════

type ColumnKey = "submitted" | "desk_screened" | "decided"

interface ReviewColumns {
  submitted: ReviewProject[]
  desk_screened: ReviewProject[]
  decided: ReviewProject[]
}

const VALID_TRANSITIONS: Record<string, { target: ColumnKey; review_tier: string; decision: string }> = {
  "submitted->desk_screened": { target: "desk_screened", review_tier: "desk", decision: "screened" },
}

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

  const badgeStyle = FEASIBILITY_STAGE_BADGE_STYLES[project.feasibility_stage]

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
          <p className="text-sm font-medium truncate">{project.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{project.project_code}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{project.nominating_ministry}</span>
        <span>·</span>
        <span>{project.sector}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {new Date(project.updated_at).toLocaleDateString()}
        </span>
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text, border: `1px solid ${badgeStyle.border}` }}
        >
          {FEASIBILITY_STAGE_LABELS[project.feasibility_stage]}
        </span>
      </div>
    </div>
  )
}

function ProjectCardOverlay({ project }: { project: ReviewProject }) {
  const badgeStyle = FEASIBILITY_STAGE_BADGE_STYLES[project.feasibility_stage]
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg rotate-2 w-[280px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{project.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{project.project_code}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{project.nominating_ministry}</span>
        <span>·</span>
        <span>{project.sector}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {new Date(project.updated_at).toLocaleDateString()}
        </span>
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text, border: `1px solid ${badgeStyle.border}` }}
        >
          {FEASIBILITY_STAGE_LABELS[project.feasibility_stage]}
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

function FS1ReviewTab() {
  const router = useRouter()
  const [columns, setColumns] = useState<ReviewColumns>({ submitted: [], desk_screened: [], decided: [] })
  const [loading, setLoading] = useState(true)
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

    const reviewTier = selectedProject.feasibility_stage === "fs1_submitted" ? "desk" : "senior"

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

  const getDecisionOptions = (stage: FeasibilityStage) => {
    if (stage === "fs1_submitted") {
      return [
        { value: "screened", label: "Pass Desk Screen", icon: CheckCircle2, color: "text-green-600" },
        { value: "returned", label: "Return for Revision", icon: RotateCcw, color: "text-amber-600" },
        { value: "rejected", label: "Reject", icon: XCircle, color: "text-red-600" },
      ]
    }
    return [
      { value: "passed", label: "Pass to FS-2", icon: CheckCircle2, color: "text-green-600" },
      { value: "returned", label: "Return for Revision", icon: RotateCcw, color: "text-amber-600" },
      { value: "rejected", label: "Reject", icon: XCircle, color: "text-red-600" },
    ]
  }

  return (
    <>
      {/* Filters */}
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
      </div>

      {/* Kanban Board */}
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
              title="Submitted — Awaiting Desk Review"
              projects={filterProjects(columns.submitted)}
              count={columns.submitted.length}
              color="bg-blue-500"
              activeSourceColumn={activeSourceColumn}
              onSelect={handleSelectProject}
            />
            <DroppableColumn
              columnKey="desk_screened"
              title="Desk Screened — Awaiting Senior Review"
              projects={filterProjects(columns.desk_screened)}
              count={columns.desk_screened.length}
              color="bg-indigo-500"
              activeSourceColumn={activeSourceColumn}
              onSelect={handleSelectProject}
            />
            <DroppableColumn
              columnKey="decided"
              title="Decided"
              projects={filterProjects(columns.decided)}
              count={columns.decided.length}
              color="bg-green-500"
              activeSourceColumn={activeSourceColumn}
              onSelect={handleSelectProject}
            />
          </div>

          <DragOverlay>
            {draggedProject ? <ProjectCardOverlay project={draggedProject} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* FS-1 Review Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedProject(null)} />
          <div className="relative w-full max-w-2xl bg-background shadow-xl rounded-lg overflow-y-auto max-h-[90vh] mx-4">
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
                    <h4 className="text-sm font-semibold">FS-1 Narrative</h4>
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

              {(selectedProject.feasibility_stage === "fs1_submitted" || selectedProject.feasibility_stage === "fs1_desk_screened") && (
                <div className="border-t border-border pt-6 space-y-4">
                  <h3 className="text-sm font-semibold">
                    {selectedProject.feasibility_stage === "fs1_submitted" ? "Desk Review" : "Senior Review"}
                  </h3>

                  {reviewError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-800">{reviewError}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm">Decision</Label>
                    <div className="space-y-2">
                      {getDecisionOptions(selectedProject.feasibility_stage).map(opt => {
                        const Icon = opt.icon
                        return (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              reviewDecision === opt.value
                                ? "border-[#5f7f7a] bg-[#f6f5f3] ring-2 ring-[#5f7f7a]/20"
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="decision"
                              value={opt.value}
                              checked={reviewDecision === opt.value}
                              onChange={() => setReviewDecision(opt.value)}
                              className="sr-only"
                            />
                            <Icon className={`h-4 w-4 ${opt.color}`} />
                            <span className="text-sm font-medium">{opt.label}</span>
                          </label>
                        )
                      })}
                    </div>
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

                  {reviewDecision === "passed" && selectedProject.feasibility_stage === "fs1_desk_screened" && (
                    <div className="border border-border rounded-lg p-4 space-y-3">
                      <h4 className="text-sm font-semibold">Gate Checklist</h4>
                      <p className="text-xs text-muted-foreground">
                        All items must be confirmed before advancing to FS-2.
                      </p>
                      {[
                        { key: "narrative_reviewed", label: "I have reviewed the FS-1 narrative" },
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
                      (reviewDecision === "passed" && selectedProject.feasibility_stage === "fs1_desk_screened" &&
                        !["narrative_reviewed", "ndp_alignment", "cost_estimate"].every(k => gateChecks[k]))
                    }
                    className="w-full"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              )}

              {["fs1_passed", "fs1_returned", "fs1_rejected"].includes(selectedProject.feasibility_stage) && (
                <div className="border-t border-border pt-6">
                  <div className="flex items-center gap-2">
                    {selectedProject.feasibility_stage === "fs1_passed" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    {selectedProject.feasibility_stage === "fs1_returned" && <RotateCcw className="h-5 w-5 text-amber-600" />}
                    {selectedProject.feasibility_stage === "fs1_rejected" && <XCircle className="h-5 w-5 text-red-600" />}
                    <span className="text-sm font-semibold">
                      {FEASIBILITY_STAGE_LABELS[selectedProject.feasibility_stage]}
                    </span>
                  </div>
                  {selectedProject.feasibility_stage === "fs1_rejected" && selectedProject.fs1_rejected_at && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Cool-down until {new Date(new Date(selectedProject.fs1_rejected_at).getTime() + 6 * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </span>
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

// ═══════════════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════════════

export default function ReviewBoardPage() {
  const [activeTab, setActiveTab] = useState("intake")

  return (
    <MainLayout>
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <KanbanSquare className="h-7 w-7 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold">Review Board</h1>
              <p className="text-muted-foreground text-sm">
                Review intake submissions and feasibility study narratives
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="intake">Intake Reviews</TabsTrigger>
            <TabsTrigger value="fs1">FS-1 Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="intake">
            <IntakeReviewTab />
          </TabsContent>

          <TabsContent value="fs1">
            <FS1ReviewTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}

"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  KanbanSquare, Search, X, CheckCircle2, RotateCcw, XCircle,
  ChevronRight, AlertCircle, Clock,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { formatCurrency, SECTORS, FEASIBILITY_STAGE_LABELS, FEASIBILITY_STAGE_BADGE_STYLES } from "@/lib/project-bank-utils"
import type { FeasibilityStage } from "@/types/project-bank"

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
  fs1_rejected_at: string | null
  created_at: string
  updated_at: string
}

interface ReviewColumns {
  submitted: ReviewProject[]
  desk_screened: ReviewProject[]
  decided: ReviewProject[]
}

export default function ReviewBoardPage() {
  const router = useRouter()
  const [columns, setColumns] = useState<ReviewColumns>({ submitted: [], desk_screened: [], decided: [] })
  const [loading, setLoading] = useState(true)
  const [sectorFilter, setSectorFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Slide-over state
  const [selectedProject, setSelectedProject] = useState<ReviewProject | null>(null)
  const [reviewDecision, setReviewDecision] = useState<string>("")
  const [reviewComments, setReviewComments] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const fetchBoard = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (sectorFilter) params.set("sector", sectorFilter)
      const res = await apiFetch(`/api/project-bank/review-board?${params}`)
      if (res.ok) setColumns(await res.json())
    } catch {
      // handle error silently
    } finally {
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

  const handleReviewSubmit = async () => {
    if (!selectedProject || !reviewDecision) return
    setSubmittingReview(true)
    setReviewError(null)

    // Determine review tier from current stage
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

      // Close slide-over and refresh
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
    // Senior review
    return [
      { value: "passed", label: "Pass to FS-2", icon: CheckCircle2, color: "text-green-600" },
      { value: "returned", label: "Return for Revision", icon: RotateCcw, color: "text-amber-600" },
      { value: "rejected", label: "Reject", icon: XCircle, color: "text-red-600" },
    ]
  }

  const ProjectCard = ({ project }: { project: ReviewProject }) => {
    const badgeStyle = FEASIBILITY_STAGE_BADGE_STYLES[project.feasibility_stage]
    return (
      <div
        className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => {
          setSelectedProject(project)
          setReviewDecision("")
          setReviewComments("")
          setReviewError(null)
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

  const Column = ({ title, projects, count, color }: { title: string; projects: ReviewProject[]; count: number; color: string }) => (
    <div className="flex-1 min-w-[280px]">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-lg p-2">
        {projects.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No projects</p>
        ) : (
          projects.map(p => <ProjectCard key={p.id} project={p} />)
        )}
      </div>
    </div>
  )

  return (
    <MainLayout>
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <KanbanSquare className="h-7 w-7 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold">FS-1 Review Board</h1>
              <p className="text-muted-foreground text-sm">
                Review and screen feasibility study narratives
              </p>
            </div>
          </div>
        </div>

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
          <div className="flex gap-4 overflow-x-auto pb-4">
            <Column
              title="Submitted — Awaiting Desk Review"
              projects={filterProjects(columns.submitted)}
              count={columns.submitted.length}
              color="bg-blue-500"
            />
            <Column
              title="Desk Screened — Awaiting Senior Review"
              projects={filterProjects(columns.desk_screened)}
              count={columns.desk_screened.length}
              color="bg-indigo-500"
            />
            <Column
              title="Decided"
              projects={filterProjects(columns.decided)}
              count={columns.decided.length}
              color="bg-green-500"
            />
          </div>
        )}
      </div>

      {/* Slide-over Panel */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedProject(null)} />
          <div className="relative w-full max-w-lg bg-background shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-background z-10 border-b border-border px-6 py-4 flex items-center justify-between">
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
                  <span className="text-muted-foreground">Est. Cost</span>
                  <p className="font-medium">{formatCurrency(selectedProject.estimated_cost, selectedProject.currency)}</p>
                </div>
              </div>

              {/* View full project link */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => router.push(`/project-bank/${selectedProject.id}`)}
              >
                View Full Project Details
              </Button>

              {/* Review Form — only for reviewable stages */}
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

                  {/* Decision options */}
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
                                ? "border-blue-500 bg-blue-50"
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

                  {/* Comments */}
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

                  <Button
                    onClick={handleReviewSubmit}
                    disabled={
                      !reviewDecision ||
                      submittingReview ||
                      ((reviewDecision === "returned" || reviewDecision === "rejected") && !reviewComments.trim())
                    }
                    className="w-full"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              )}

              {/* Show decision for already-decided projects */}
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
    </MainLayout>
  )
}

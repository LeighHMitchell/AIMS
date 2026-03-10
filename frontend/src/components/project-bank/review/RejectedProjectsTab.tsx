"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, LayoutGrid, Table2, Building2, DollarSign, ChevronRight, Search, RotateCcw, X } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import {
  formatCurrencyParts, fmtCost, REGIONS, checkCooldownViolation,
} from "@/lib/project-bank-utils"
import type { ProjectStage } from "@/types/project-bank"
import type { RejectedProject } from "./types"
import { ReviewTableView } from "./ReviewTableView"
import type { ReviewTableColumn } from "./ReviewTableView"

/* ── Recovery helpers ─────────────────────────────────────────── */

interface RecoveryTarget { value: ProjectStage; label: string }

const RECOVERY_TARGETS: Record<string, RecoveryTarget[]> = {
  intake_rejected: [
    { value: "intake_draft", label: "Intake (Draft)" },
  ],
  fs1_rejected: [
    { value: "intake_draft", label: "Intake (Draft)" },
    { value: "fs1_draft", label: "Preliminary Feasibility (Draft)" },
  ],
}

/* ── Recovery Modal ───────────────────────────────────────────── */

function RecoverModal({
  project,
  onClose,
  onSuccess,
}: {
  project: RejectedProject
  onClose: () => void
  onSuccess: () => void
}) {
  const targets = RECOVERY_TARGETS[project.project_stage] || []
  const [targetStage, setTargetStage] = useState<ProjectStage>(targets[0]?.value ?? "intake_draft")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleRecover() {
    setSaving(true)
    setError("")
    try {
      const res = await apiFetch(`/api/project-bank/${project.id}/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_stage: targetStage, reason: reason.trim() || undefined }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || "Recovery failed")
        return
      }
      onSuccess()
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-surface-muted rounded-t-lg border-b">
          <h3 className="text-sm font-semibold">Recover Project</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Project info */}
          <div>
            <p className="text-sm font-medium">{project.name}</p>
            <span className="font-mono text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              {project.project_code}
            </span>
          </div>

          {/* Target stage */}
          <div className="space-y-1.5">
            <Label className="text-xs">Recover to</Label>
            <Select value={targetStage} onValueChange={v => setTargetStage(v as ProjectStage)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targets.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional reason */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              placeholder="Reason for recovery…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleRecover} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Recover
          </Button>
        </div>
      </div>
    </div>
  )
}

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
      <span
        className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border"
        style={{ backgroundColor: '#fbe9e9', color: '#dc2625', borderColor: '#dc2625' }}
      >
        Cool-down until {cooldownEnds.toLocaleDateString()}
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border"
      style={{ backgroundColor: '#f1f4f8', color: '#4c5568', borderColor: '#cfd0d5' }}
    >
      Eligible
    </span>
  )
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
  {
    key: "nominating_ministry",
    label: "Ministry",
    render: (p: RejectedProject) => (
      <div>
        <span>{p.nominating_ministry}</span>
        {p.implementing_agency && <p className="text-xs text-muted-foreground">{p.implementing_agency}</p>}
      </div>
    ),
  },
  {
    key: "sector",
    label: "Sector",
    render: (p: RejectedProject) => (
      <div>
        <span>{p.sector}</span>
        {p.sub_sector && <p className="text-xs text-muted-foreground">{p.sub_sector}</p>}
      </div>
    ),
  },
  {
    key: "project_stage",
    label: "Phase",
    render: (p: RejectedProject) => (
      <span
        className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border"
        style={{ backgroundColor: '#fbe9e9', color: '#dc2625', borderColor: '#dc2625' }}
      >
        {getRejectionPhase(p.project_stage)}
      </span>
    ),
  },
  {
    key: "estimated_cost",
    label: "Estimated Cost",
    render: (p: RejectedProject) => {
      const parts = formatCurrencyParts(p.estimated_cost, p.currency)
      if (!parts) return <span>—</span>
      return <span><span className="text-muted-foreground">{parts.prefix}</span> {parts.amount}</span>
    },
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

interface PBSector { id: string; code: string; name: string }

export function RejectedProjectsTab() {
  const [projects, setProjects] = useState<RejectedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"card" | "table">("card")
  const [searchQuery, setSearchQuery] = useState("")
  const [sectorFilter, setSectorFilter] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  const [sectors, setSectors] = useState<PBSector[]>([])
  const [recoverProject, setRecoverProject] = useState<RejectedProject | null>(null)

  useEffect(() => {
    apiFetch('/api/pb-sectors').then(r => r.ok ? r.json() : []).then(setSectors).catch(() => {})
  }, [])

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
    if (regionFilter && p.region !== regionFilter) return false
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
                    <span
                      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border"
                      style={{ backgroundColor: '#fbe9e9', color: '#dc2625', borderColor: '#dc2625' }}
                    >
                      {getRejectionPhase(p.project_stage)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{p.nominating_ministry}</span>
                    </div>
                    {p.implementing_agency && (
                      <p className="text-muted-foreground/60 ml-4 truncate">{p.implementing_agency}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-3 w-3 shrink-0" />
                    <span>{fmtCost(p.estimated_cost, p.currency) || "—"}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {p.sector}
                    {p.sub_sector && <p className="text-muted-foreground/60 truncate">{p.sub_sector}</p>}
                  </div>
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
                <div className="mt-3 flex items-center justify-between">
                  <CooldownBadge project={p} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setRecoverProject(p)}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Recover
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewMode === "table" && (
        <ReviewTableView
          projects={filteredProjects}
          columns={[
            ...TABLE_COLUMNS,
            {
              key: "actions",
              label: "",
              render: (p: RejectedProject) => (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={e => { e.stopPropagation(); setRecoverProject(p) }}
                >
                  <RotateCcw className="h-3 w-3" />
                  Recover
                </Button>
              ),
            },
          ]}
          onRowClick={() => {}}
          emptyMessage="No rejected projects"
        />
      )}

      {recoverProject && (
        <RecoverModal
          project={recoverProject}
          onClose={() => setRecoverProject(null)}
          onSuccess={() => {
            setRecoverProject(null)
            fetchProjects()
          }}
        />
      )}
    </>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowRight, ChevronRight, ExternalLink, Plus, Calculator,
  AlertTriangle, DollarSign, CheckCircle, XCircle, Clock,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import {
  formatCurrency, STATUS_BADGE_VARIANT, STATUS_LABELS, STATUS_ORDER,
  PATHWAY_LABELS, PATHWAY_COLORS, getNextStatus,
  COMMITMENT_STATUS_LABELS, INSTRUMENT_TYPE_LABELS, DONOR_TYPE_LABELS,
  PPP_CONTRACT_TYPE_LABELS,
} from "@/lib/project-bank-utils"
import type { ProjectBankProject, ProjectBankDonor, ProjectAppraisal, DonorType, InstrumentType, CommitmentStatus } from "@/types/project-bank"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusTimeline } from "@/components/project-bank/StatusTimeline"
import { SuggestedParcelsCard } from "@/components/project-bank/SuggestedParcelsCard"
import { FundingGapBar } from "@/components/project-bank/FundingGapBar"
import { EIRRCalculatorModal } from "@/components/project-bank/EIRRCalculatorModal"
import { AddDonorModal } from "@/components/project-bank/AddDonorModal"
import { SwissChallengeTab } from "@/components/project-bank/SwissChallengeTab"
import { MonitoringTab } from "@/components/project-bank/MonitoringTab"

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [project, setProject] = useState<(ProjectBankProject & { donors: ProjectBankDonor[]; appraisals: ProjectAppraisal[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEIRRModal, setShowEIRRModal] = useState(false)
  const [showDonorModal, setShowDonorModal] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const fetchProject = async () => {
    try {
      const res = await apiFetch(`/api/project-bank/${id}`)
      if (res.ok) setProject(await res.json())
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchProject() }, [id])

  const handleAdvanceStatus = async () => {
    setActionLoading(true)
    try {
      const res = await apiFetch(`/api/project-bank/${id}/advance-status`, { method: "POST" })
      if (res.ok) fetchProject()
    } catch {} finally { setActionLoading(false) }
  }

  const handleReject = async () => {
    setActionLoading(true)
    try {
      const res = await apiFetch(`/api/project-bank/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (res.ok) {
        setShowRejectDialog(false)
        fetchProject()
      }
    } catch {} finally { setActionLoading(false) }
  }

  const handlePublishToAIMS = async () => {
    setActionLoading(true)
    try {
      const res = await apiFetch("/api/project-bank/publish-to-aims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id }),
      })
      if (res.ok) fetchProject()
    } catch {} finally { setActionLoading(false) }
  }

  /* ------------------------------------------------------------------ */
  /*  Loading skeleton                                                   */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          {/* Hero skeleton */}
          <div className="space-y-3">
            <div className="h-8 bg-muted animate-pulse rounded w-96" />
            <div className="h-5 bg-muted animate-pulse rounded w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="h-24 bg-muted animate-pulse rounded-lg" />
              <div className="h-24 bg-muted animate-pulse rounded-lg" />
              <div className="h-24 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
          {/* Grid skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            <div className="space-y-4">
              <div className="h-16 bg-muted animate-pulse rounded" />
              <div className="h-48 bg-muted animate-pulse rounded" />
              <div className="h-40 bg-muted animate-pulse rounded" />
            </div>
            <div className="space-y-4">
              <div className="h-40 bg-muted animate-pulse rounded" />
              <div className="h-32 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
          <Button variant="outline" onClick={() => router.push("/project-bank/projects")}>Back to Projects</Button>
        </div>
      </MainLayout>
    )
  }

  const nextStatus = getNextStatus(project.status)
  const ndpGoal = (project as any).national_development_goals
  const totalCommitted = project.total_committed || 0
  const estimatedCost = project.estimated_cost || 0
  const fundingGap = project.funding_gap || 0
  const donorCount = project.donors?.length || 0
  const securedPct = estimatedCost > 0 ? Math.round((totalCommitted / estimatedCost) * 100) : 0

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* ============================================================ */}
        {/*  HERO SECTION                                                */}
        {/* ============================================================ */}
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Link href="/project-bank/projects" className="hover:text-foreground">All Projects</Link>
            <ChevronRight className="h-3 w-3" />
            <span>{project.project_code}</span>
          </div>

          {/* Title row */}
          <div className="flex items-start justify-between gap-4 mb-1">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.ndp_aligned && (
              <Badge variant="success" className="shrink-0 mt-1">NDP Aligned</Badge>
            )}
          </div>

          {/* Subtitle: badges + ministry / sector / region */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className="font-mono text-xs">{project.project_code}</Badge>
            <Badge variant={STATUS_BADGE_VARIANT[project.status] as any}>
              {STATUS_LABELS[project.status]}
            </Badge>
            {project.pathway && (
              <Badge variant="purple">
                {PATHWAY_LABELS[project.pathway] || project.pathway}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {project.nominating_ministry}
            {project.sector ? ` · ${project.sector}` : ""}
            {project.region ? ` · ${project.region}` : ""}
          </p>

          {/* Financial hero strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            {/* Estimated Cost */}
            <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#f1f4f8' }}>
                <DollarSign className="h-5 w-5" style={{ color: '#4c5568' }} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Estimated Cost</div>
                <div className="text-2xl font-bold font-mono" style={{ color: '#4c5568' }}>{formatCurrency(project.estimated_cost, project.currency)}</div>
              </div>
            </div>

            {/* Committed */}
            <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#f1f4f8' }}>
                <CheckCircle className="h-5 w-5" style={{ color: '#4c5568' }} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Committed</div>
                <div className="text-2xl font-bold font-mono" style={{ color: '#7b95a7' }}>{formatCurrency(totalCommitted, project.currency)}</div>
                <div className="text-xs text-muted-foreground">{donorCount} donor{donorCount !== 1 ? "s" : ""}</div>
              </div>
            </div>

            {/* Funding Gap */}
            <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#f1f4f8' }}>
                <AlertTriangle className="h-5 w-5" style={{ color: '#4c5568' }} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Funding Gap</div>
                <div className="text-2xl font-bold font-mono" style={{ color: '#dc2625' }}>{formatCurrency(fundingGap, project.currency)}</div>
                <div className="text-xs text-muted-foreground">{securedPct}% secured</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cabinet Approval Warning Banner */}
        {(() => {
          const costUSD = project.currency === 'USD' ? project.estimated_cost :
            project.currency === 'MMK' ? (project.estimated_cost || 0) / 2100 : project.estimated_cost;
          const hasCabinetDoc = project.documents?.some((d: any) => d.document_type === 'cabinet_approval');
          if (costUSD && costUSD > 100_000_000 && !hasCabinetDoc && project.status !== 'approved' && project.status !== 'completed' && project.status !== 'rejected') {
            return (
              <div className="flex items-start gap-2 p-4 rounded-lg border bg-amber-50 border-amber-200 text-amber-800">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium">Cabinet Approval Required</div>
                  <div className="text-sm">This project exceeds $100M and requires a Cabinet Approval document before it can be advanced to approved status.</div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* ============================================================ */}
        {/*  TWO-COLUMN GRID                                             */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* ---------------------------------------------------------- */}
          {/*  LEFT COLUMN                                               */}
          {/* ---------------------------------------------------------- */}
          <div className="space-y-6">
            {/* 1. Status Timeline */}
            <StatusTimeline currentStatus={project.status} project={project} />

            {/* Tabbed content: Overview, Swiss Challenge, Monitoring */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="p-1 h-auto bg-background gap-1 border mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                {project.origin === 'unsolicited' && (
                  <TabsTrigger value="swiss-challenge">Swiss Challenge</TabsTrigger>
                )}
                {(['approved', 'implementation', 'completed'] as string[]).includes(project.status) && (
                  <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="overview" className="space-y-6">

            {/* 2. Project Details */}
            <Card>
              <CardHeader><CardTitle className="text-base">Project Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    ["Ministry", project.nominating_ministry],
                    ["IGA", (project as any).implementing_agency || project.nominating_ministry],
                    ["Sector", project.sector],
                    ["Region", project.region || "—"],
                    ["Origin", project.origin],
                    ...((project as any).ppp_contract_type ? [["PPP Type", PPP_CONTRACT_TYPE_LABELS[(project as any).ppp_contract_type] || (project as any).ppp_contract_type]] : []),
                  ].map(([label, value], i) => (
                    <div key={i}>
                      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
                      <div className="text-sm font-medium">{value}</div>
                    </div>
                  ))}
                </div>
                {ndpGoal && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs text-muted-foreground mb-0.5">NDP Goal</div>
                    <div className="text-sm font-medium">{ndpGoal.code} — {ndpGoal.name}</div>
                  </div>
                )}
                {project.description && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs text-muted-foreground mb-1">Description</div>
                    <p className="text-sm leading-relaxed">{project.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Financing (moved UP, before Appraisal) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Financing</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowDonorModal(true)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add Donor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <FundingGapBar
                  totalCost={estimatedCost}
                  totalCommitted={totalCommitted}
                  fundingGap={fundingGap}
                />

                {project.donors && project.donors.length > 0 ? (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Donor Commitments</div>
                    <div className="space-y-2">
                      {project.donors.map((d: ProjectBankDonor) => (
                        <div key={d.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                          <div>
                            <div className="text-sm font-medium">{d.donor_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {d.donor_type ? DONOR_TYPE_LABELS[d.donor_type] : ''}{' '}
                              {d.instrument_type ? `· ${INSTRUMENT_TYPE_LABELS[d.instrument_type]}` : ''}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-mono font-medium">{formatCurrency(d.amount, d.currency)}</div>
                            <Badge variant="outline" className="text-[10px]">
                              {COMMITMENT_STATUS_LABELS[d.commitment_status] || d.commitment_status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-center py-6 text-sm text-muted-foreground">
                    No donors yet. Click "Add Donor" to record a commitment.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 4. Appraisal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appraisal Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: '#f1f4f8' }}>
                    <div className="text-xs text-muted-foreground">FIRR</div>
                    <div
                      className="text-xl font-bold font-mono"
                      style={{ color: project.firr != null ? (project.firr >= 10 ? '#7b95a7' : '#dc2625') : undefined }}
                    >
                      {project.firr != null ? `${project.firr}%` : <span className="text-muted-foreground">—</span>}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: '#f1f4f8' }}>
                    <div className="text-xs text-muted-foreground">EIRR</div>
                    <div
                      className="text-xl font-bold font-mono"
                      style={{ color: project.eirr != null ? (project.eirr >= 15 ? '#7b95a7' : '#dc2625') : undefined }}
                    >
                      {project.eirr != null ? `${project.eirr}%` : <span className="text-muted-foreground">—</span>}
                    </div>
                  </div>
                </div>

                {/* VGF amount — accent box */}
                {project.vgf_amount != null && project.vgf_amount > 0 && (
                  <div className="p-4 rounded-lg border mb-4" style={{ backgroundColor: '#f1f4f8', borderColor: '#cfd0d5' }}>
                    <div className="text-xs" style={{ color: '#7b95a7' }}>Viability Gap Funding (VGF)</div>
                    <div className="text-xl font-bold font-mono" style={{ color: '#4c5568' }}>
                      {formatCurrency(project.vgf_amount, project.currency)}
                    </div>
                  </div>
                )}

                {project.appraisals && project.appraisals.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium mb-2">Appraisal History</div>
                    <div className="space-y-2">
                      {project.appraisals.map((a: ProjectAppraisal) => (
                        <div key={a.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                          <div>
                            <span className="text-sm capitalize">{a.appraisal_type.replace(/_/g, ' ')}</span>
                            {a.appraisal_date && <span className="text-xs text-muted-foreground ml-2">{a.appraisal_date}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            {a.eirr_result != null && (
                              <span className="text-sm font-mono" style={{ color: a.eirr_result >= 15 ? '#7b95a7' : '#dc2625' }}>
                                EIRR: {a.eirr_result}%
                              </span>
                            )}
                            {a.npv != null && (
                              <span className="text-xs text-muted-foreground">NPV: {formatCurrency(a.npv)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
              </TabsContent>

              {project.origin === 'unsolicited' && (
                <TabsContent value="swiss-challenge">
                  <SwissChallengeTab projectId={id} />
                </TabsContent>
              )}

              {(['approved', 'implementation', 'completed'] as string[]).includes(project.status) && (
                <TabsContent value="monitoring">
                  <MonitoringTab projectId={id} />
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* ---------------------------------------------------------- */}
          {/*  RIGHT SIDEBAR                                             */}
          {/* ---------------------------------------------------------- */}
          <div className="space-y-4">
            {/* 1. Actions */}
            <Card className="border-primary/20">
              <CardHeader><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(project as any).appraisal_stage && (project as any).appraisal_stage !== 'routing_complete' && (
                  <Button
                    className="w-full justify-start gap-2"
                    variant="outline"
                    asChild
                  >
                    <Link href={`/project-bank/${id}/appraisal`}>
                      <ArrowRight className="h-4 w-4" />
                      Open Appraisal
                    </Link>
                  </Button>
                )}
                {nextStatus && project.status !== 'rejected' && (
                  <Button
                    className="w-full justify-start gap-2"
                    onClick={handleAdvanceStatus}
                    disabled={actionLoading}
                  >
                    <ArrowRight className="h-4 w-4" />
                    Advance to {STATUS_LABELS[nextStatus]}
                  </Button>
                )}
                {!project.aims_activity_id && (project.pathway === 'oda' || project.pathway === 'ppp') && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handlePublishToAIMS}
                    disabled={actionLoading}
                  >
                    <ExternalLink className="h-4 w-4" /> Publish to AIMS
                  </Button>
                )}
                {project.status !== 'rejected' && project.status !== 'completed' && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setShowRejectDialog(true)}
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 2. Project Info — audit trail timestamps */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Project Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["Nominated", project.nominated_at],
                  ["Screened", project.screened_at],
                  ["Appraised", project.appraised_at],
                  ["Approved", project.approved_at],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-xs font-medium">
                      {value ? new Date(value as string).toLocaleDateString() : "—"}
                    </span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Currency</span>
                  <span className="text-xs font-medium">{project.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Created</span>
                  <span className="text-xs font-medium">{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* 3. AIMS Linkage (moved from main column) */}
            {project.aims_activity_id && (
              <Card>
                <CardHeader><CardTitle className="text-sm">AIMS Linkage</CardTitle></CardHeader>
                <CardContent>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Linked to AIMS</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">Tracked in the AIMS module</div>
                    <Button variant="outline" size="sm" className="w-full gap-1.5" asChild>
                      <Link href={`/activities/${project.aims_activity_id}`}>
                        View in AIMS <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 4. Rejection */}
            {project.rejection_reason && (
              <Card className="border-red-200">
                <CardHeader><CardTitle className="text-sm text-red-600">Rejection</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-red-600">{project.rejection_reason}</p>
                  {project.rejected_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(project.rejected_at).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 5. Suggested Parcels */}
            <SuggestedParcelsCard projectId={id} />
          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Project</DialogTitle></DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-1.5 block">Reason for rejection</label>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? "Rejecting..." : "Reject Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EIRR Calculator Modal */}
      <EIRRCalculatorModal
        open={showEIRRModal}
        onOpenChange={setShowEIRRModal}
        projectId={id}
        onSaved={fetchProject}
      />

      {/* Add Donor Modal */}
      <AddDonorModal
        open={showDonorModal}
        onOpenChange={setShowDonorModal}
        projectId={id}
        onSaved={fetchProject}
      />
    </MainLayout>
  )
}

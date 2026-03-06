"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRight, ChevronRight, ChevronDown, ExternalLink, Plus, Calculator,
  AlertTriangle, DollarSign, CheckCircle, XCircle, Clock,
  Building2, MapPin, Layers, FileText, User, Mail, Phone, Target, Globe, Briefcase,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import {
  formatCurrency, STATUS_BADGE_VARIANT, STATUS_LABELS,
  PATHWAY_LABELS, PATHWAY_COLORS,
  COMMITMENT_STATUS_LABELS, INSTRUMENT_TYPE_LABELS, DONOR_TYPE_LABELS,
  PPP_CONTRACT_TYPE_LABELS,
  FEASIBILITY_STAGE_LABELS, FEASIBILITY_STAGE_BADGE_STYLES,
  CATEGORY_LABELS,
  PHASE_LABELS, getPhase,
  IMPACT_LEVELS, TECHNICAL_MATURITY_LEVELS,
} from "@/lib/project-bank-utils"
import type { ProjectBankProject, ProjectBankDonor, ProjectAppraisal, DonorType, InstrumentType, CommitmentStatus, FeasibilityStage, ProjectPhase } from "@/types/project-bank"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusTimeline } from "@/components/project-bank/StatusTimeline"
import { SuggestedParcelsCard } from "@/components/project-bank/SuggestedParcelsCard"
import { FundingGapBar } from "@/components/project-bank/FundingGapBar"
import { EIRRCalculatorModal } from "@/components/project-bank/EIRRCalculatorModal"
import { AddDonorModal } from "@/components/project-bank/AddDonorModal"
import { SwissChallengeTab } from "@/components/project-bank/SwissChallengeTab"
import { MonitoringTab } from "@/components/project-bank/MonitoringTab"
import { FS2AssignmentPanel } from "@/components/project-bank/fs2/FS2AssignmentPanel"
import { CategoryDecisionPanel } from "@/components/project-bank/categorization/CategoryDecisionPanel"
import { CashFlowTable } from "@/components/project-bank/appraisal/CashFlowTable"
import { EconomicAnalysisCharts } from "@/components/project-bank/appraisal/EconomicAnalysisCharts"
import { ProjectScoreCard } from "@/components/project-bank/scoring/ProjectScoreCard"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts"

/** SDG goal labels for badge display */
const SDG_LABELS: Record<string, string> = {
  '1': 'No Poverty', '2': 'Zero Hunger', '3': 'Good Health', '4': 'Quality Education',
  '5': 'Gender Equality', '6': 'Clean Water', '7': 'Affordable Energy', '8': 'Decent Work',
  '9': 'Industry & Innovation', '10': 'Reduced Inequalities', '11': 'Sustainable Cities',
  '12': 'Responsible Consumption', '13': 'Climate Action', '14': 'Life Below Water',
  '15': 'Life on Land', '16': 'Peace & Justice', '17': 'Partnerships',
}

/** Document type labels */
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  concept_note: 'Concept Note', project_proposal: 'Project Proposal', preliminary_fs_report: 'Preliminary FS Report',
  cost_estimate: 'Cost Estimate', environmental_screening: 'Environmental Screening',
  msdp_alignment_justification: 'MSDP Alignment', firr_calculation_workbook: 'FIRR Workbook',
  eirr_calculation_workbook: 'EIRR Workbook', cost_benefit_analysis: 'Cost–Benefit Analysis',
  detailed_fs_report: 'Detailed FS Report', vgf_calculation: 'VGF Calculation',
  risk_allocation_matrix: 'Risk Matrix', funding_request: 'Funding Request',
  cabinet_approval: 'Cabinet Approval', monitoring_report: 'Monitoring Report',
  dap_compliance: 'DAP Compliance', terms_of_reference: 'Terms of Reference',
  budget_estimate: 'Budget Estimate', site_map: 'Site Map',
  stakeholder_analysis: 'Stakeholder Analysis', endorsement_letter: 'Endorsement Letter',
  proponent_profile: 'Proponent Profile',
  environmental_impact_assessment: 'Environmental Impact Assessment',
  social_impact_assessment: 'Social Impact Assessment',
  land_acquisition_plan: 'Land Acquisition Plan', resettlement_plan: 'Resettlement Plan',
  technical_design: 'Technical Design', market_assessment: 'Market Assessment',
  other: 'Other',
}

function getActionLabel(phase: ProjectPhase): string {
  switch (phase) {
    case 'intake':
    case 'fs1':
      return 'Edit Submission'
    default: return 'View Assessment'
  }
}

function formatDuration(months: number | null | undefined): string {
  if (!months) return '—'
  const years = Math.floor(months / 12)
  const remaining = months % 12
  if (years === 0) return `${remaining} month${remaining !== 1 ? 's' : ''}`
  if (remaining === 0) return `${years} year${years !== 1 ? 's' : ''}`
  return `${years} year${years !== 1 ? 's' : ''} ${remaining} month${remaining !== 1 ? 's' : ''}`
}

function formatFullDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Collapsible section for PFS data display */

function PFSField({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  )
}


const NARRATIVE_SECTION_LABELS: Record<string, string> = {
  problem_statement: 'Problem Statement',
  target_beneficiaries: 'Target Beneficiaries',
  ndp_alignment_justification: 'NDP / MSDP Alignment',
  expected_outcomes: 'Expected Outcomes & Impact',
  preliminary_cost_justification: 'Preliminary Cost Justification',
}

const NARRATIVE_FIELDS = [
  'problem_statement',
  'target_beneficiaries',
  'ndp_alignment_justification',
  'expected_outcomes',
  'preliminary_cost_justification',
] as const

function FS1NarrativeDisplay({ projectId }: { projectId: string }) {
  const [narrative, setNarrative] = useState<Record<string, any> | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    apiFetch(`/api/project-bank/${projectId}/fs1-narrative`)
      .then(res => res.ok ? res.json() : [])
      .then((data: any[]) => {
        if (data.length > 0) setNarrative(data[0])
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [projectId])

  if (!loaded) return null
  if (!narrative) return (
    <p className="text-sm text-muted-foreground">No narrative submitted yet.</p>
  )

  return (
    <div className="space-y-4">
      {NARRATIVE_FIELDS.map(field => {
        const value = narrative[field]
        if (!value) return null
        return (
          <div key={field}>
            <div className="text-xs text-muted-foreground mb-1">
              {NARRATIVE_SECTION_LABELS[field]}
            </div>
            <p className="text-sm leading-relaxed">{value}</p>
          </div>
        )
      })}
    </div>
  )
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [project, setProject] = useState<(ProjectBankProject & { donors: ProjectBankDonor[]; appraisals: ProjectAppraisal[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEIRRModal, setShowEIRRModal] = useState(false)
  const [showDonorModal, setShowDonorModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchProject = async () => {
    try {
      const res = await apiFetch(`/api/project-bank/${id}`)
      if (res.ok) setProject(await res.json())
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchProject() }, [id])


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

  const ndpGoal = (project as any).national_development_goals
  const totalCommitted = project.total_committed || 0
  const estimatedCost = project.estimated_cost || 0
  const fundingGap = project.funding_gap || Math.max(0, estimatedCost - totalCommitted)
  const donorCount = project.donors?.length || 0
  const securedPct = estimatedCost > 0 ? Math.round((totalCommitted / estimatedCost) * 100) : 0
  const currentPhase = project.project_stage ? getPhase(project.project_stage) : 'intake' as ProjectPhase

  // Stacked bar data for Recharts
  const financingBarData = [
    { name: 'Financing', committed: totalCommitted, gap: fundingGap },
  ]

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

          {/* Banner image */}
          {(project as any).banner && (
            <div className="relative h-48 rounded-lg overflow-hidden mb-4">
              <img
                src={(project as any).banner}
                className="w-full h-full object-cover"
                style={{ objectPosition: `center ${(project as any).banner_position ?? 50}%` }}
                alt=""
              />
            </div>
          )}

          {/* Title row */}
          <div className="flex items-start justify-between gap-4 mb-1">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.ndp_aligned && (
              <Badge variant="success" className="shrink-0 mt-1">NDP Aligned</Badge>
            )}
          </div>

          {/* Subtitle: badges + ministry / sector / region */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className="bg-muted/80 px-2 py-0.5 rounded text-xs font-mono">{project.project_code}</Badge>
            <Badge variant={STATUS_BADGE_VARIANT[project.status] as any}>
              {STATUS_LABELS[project.status]}
            </Badge>
            {project.pathway && (
              <Badge variant="purple">
                {PATHWAY_LABELS[project.pathway] || project.pathway}
              </Badge>
            )}
            {project.feasibility_stage && project.feasibility_stage !== 'registered' && (
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold"
                style={(() => {
                  const s = FEASIBILITY_STAGE_BADGE_STYLES[project.feasibility_stage as FeasibilityStage]
                  return s ? { backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` } : {}
                })()}
              >
                {FEASIBILITY_STAGE_LABELS[project.feasibility_stage as FeasibilityStage] || project.feasibility_stage}
              </span>
            )}
            {project.proceeding_independently && (
              <Badge variant="outline" className="text-gray-600 border-gray-400">
                Proceeding Independently (MIC)
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {project.nominating_ministry}
            {project.sector ? ` · ${project.sector}` : ""}
            {project.region ? ` · ${project.region}` : ""}
          </p>

          {/* Hero cards: Ministry / Sector / Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-0.5">Ministry</div>
              <div className="text-sm font-medium">{project.nominating_ministry}</div>
              {(project as any).implementing_agency && (project as any).implementing_agency !== project.nominating_ministry && (
                <div className="mt-1">
                  <div className="text-[10px] text-muted-foreground">Implementing Agency</div>
                  <div className="text-xs">{(project as any).implementing_agency}</div>
                </div>
              )}
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-0.5">Sector</div>
              <div className="text-sm font-medium">{project.sector}</div>
              {project.sub_sector && (
                <div className="mt-1">
                  <div className="text-[10px] text-muted-foreground">Sub-sector</div>
                  <div className="text-xs">{project.sub_sector}</div>
                </div>
              )}
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-0.5">Location</div>
              <div className="text-sm font-medium">{project.region || "—"}</div>
              {project.townships && project.townships.length > 0 && (
                <div className="mt-1">
                  <div className="text-[10px] text-muted-foreground">{project.townships.length} township{project.townships.length !== 1 ? 's' : ''}</div>
                </div>
              )}
            </div>
          </div>

          {/* Combined Financing Hero Card with Stacked Bar */}
          <div className="mt-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-3">Project Financing</div>
              <div className="h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={financingBarData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis type="number" domain={[0, estimatedCost || 1]} hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value, project.currency)}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Bar dataKey="committed" stackId="a" fill="#7b95a7" radius={[4, 0, 0, 4]} name="Committed" />
                    <Bar dataKey="gap" stackId="a" fill="#d4d4d8" radius={[0, 4, 4, 0]} name="Funding Gap" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <div className="text-[10px] text-muted-foreground">Committed</div>
                  <div className="text-sm font-bold" style={{ color: '#7b95a7' }}>
                    {formatCurrency(totalCommitted, project.currency)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{donorCount} donor{donorCount !== 1 ? 's' : ''}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Funding Gap</div>
                  <div className="text-sm font-bold" style={{ color: '#dc2625' }}>
                    {formatCurrency(fundingGap, project.currency)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">Estimated Cost</div>
                  <div className="text-sm font-bold" style={{ color: '#4c5568' }}>
                    {formatCurrency(estimatedCost, project.currency)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{securedPct}% secured</div>
                </div>
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
            {/* 1. Phase-Gate Timeline */}
            <StatusTimeline currentStatus={project.status} project={project} />

            {/* Tabbed content: Overview, Feasibility, Swiss Challenge, Monitoring */}
            <Tabs defaultValue={(['fs2', 'fs3'] as ProjectPhase[]).includes(currentPhase) ? 'feasibility' : 'overview'} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="feasibility">Feasibility</TabsTrigger>
                {project.origin === 'unsolicited' && (
                  <TabsTrigger value="swiss-challenge">Swiss Challenge</TabsTrigger>
                )}
                {(['approved', 'implementation', 'completed'] as string[]).includes(project.status) && (
                  <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="overview" className="space-y-6">

            {/* Body Content Section */}
            <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {/* ── Left Column ── */}
                <div className="space-y-4">
                  {/* Project Origin */}
                  {project.origin && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Project Origin</div>
                      <div className="text-sm font-medium">
                        {project.origin === 'government' ? 'Government Nominated' : project.origin === 'unsolicited' ? 'Unsolicited Proposal' : project.origin}
                      </div>
                    </div>
                  )}

                  {/* Proponent Details (unsolicited only) */}
                  {project.origin === 'unsolicited' && ((project as any).proponent_name || (project as any).proponent_company || (project as any).proponent_contact) && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Proponent Details</div>
                      <div className="text-sm space-y-0.5">
                        {(project as any).proponent_name && <div className="font-medium">{(project as any).proponent_name}</div>}
                        {(project as any).proponent_company && <div className="text-muted-foreground">{(project as any).proponent_company}</div>}
                        {(project as any).proponent_contact && <div className="text-muted-foreground">{(project as any).proponent_contact}</div>}
                      </div>
                    </div>
                  )}

                  {/* Project Type */}
                  {project.project_type && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Project Type</div>
                      <div className="text-sm font-medium">{project.project_type}</div>
                    </div>
                  )}

                  {/* PPP Contract Type */}
                  {(project as any).ppp_contract_type && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">PPP Contract Type</div>
                      <div className="text-sm font-medium">{PPP_CONTRACT_TYPE_LABELS[(project as any).ppp_contract_type] || (project as any).ppp_contract_type}</div>
                    </div>
                  )}

                  {/* Estimated Start & Duration */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Estimated Start Date</div>
                      <div className="text-sm font-medium">{formatFullDate(project.estimated_start_date)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Estimated Duration</div>
                      <div className="text-sm font-medium">{formatDuration(project.estimated_duration_months)}</div>
                    </div>
                    {project.construction_period_years != null && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Construction Period</div>
                        <div className="text-sm font-medium">{project.construction_period_years} year{project.construction_period_years !== 1 ? 's' : ''}</div>
                      </div>
                    )}
                    {project.operational_period_years != null && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Operational Period</div>
                        <div className="text-sm font-medium">{project.operational_period_years} year{project.operational_period_years !== 1 ? 's' : ''}</div>
                      </div>
                    )}
                    {project.project_life_years != null && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Project Life</div>
                        <div className="text-sm font-medium">{project.project_life_years} year{project.project_life_years !== 1 ? 's' : ''}</div>
                      </div>
                    )}
                    {project.preliminary_fs_date && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Preliminary FS Date</div>
                        <div className="text-sm font-medium">{formatFullDate(project.preliminary_fs_date)}</div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {project.description && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Description</div>
                      <p className="text-sm leading-relaxed">{project.description}</p>
                    </div>
                  )}

                  {/* Objectives */}
                  {project.objectives && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Objectives</div>
                      <p className="text-sm leading-relaxed">{project.objectives}</p>
                    </div>
                  )}

                  {/* Target Beneficiaries */}
                  {project.target_beneficiaries && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Target Beneficiaries</div>
                      <p className="text-sm leading-relaxed">{project.target_beneficiaries}</p>
                    </div>
                  )}

                  {/* Documents */}
                  {project.documents && project.documents.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Documents</div>
                      <div className="space-y-1.5">
                        {project.documents.map((doc: any) => (
                          <div key={doc.id} className="flex items-center gap-2 p-2 bg-muted/20 rounded-md">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm truncate">{doc.file_name}</div>
                              <div className="text-[10px] text-muted-foreground">{DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Right Column ── */}
                <div className="space-y-4">
                  {/* Contact Officer */}
                  {((project as any).contact_officer_first_name || (project as any).contact_officer_last_name || project.contact_officer) && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Contact Officer</div>
                      <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{[(project as any).contact_officer_first_name, (project as any).contact_officer_last_name].filter(Boolean).join(' ') || project.contact_officer}</span>
                        </div>
                        {(project as any).contact_position && (
                          <div className="text-xs text-muted-foreground ml-5.5">{(project as any).contact_position}</div>
                        )}
                        {project.contact_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs">{project.contact_email}</span>
                          </div>
                        )}
                        {project.contact_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs">{project.contact_phone}</span>
                          </div>
                        )}
                        {((project as any).contact_ministry || (project as any).contact_department) && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs">
                              {[(project as any).contact_ministry, (project as any).contact_department].filter(Boolean).join(' — ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FS Conductor Details */}
                  {(() => {
                    const p = project as any
                    const isConductor = p.fs_conductor_type === 'individual'
                      ? (p.fs_conductor_individual_name || p.fs_conductor_individual_email || p.fs_conductor_individual_phone)
                      : p.fs_conductor_type === 'company'
                      ? (p.fs_conductor_company_name || p.fs_conductor_company_email || p.fs_conductor_company_phone)
                      : false
                    if (!isConductor) return null
                    return (
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">Feasibility Study Conductor</div>
                        <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
                          {p.fs_conductor_type === 'individual' ? (
                            <>
                              {p.fs_conductor_individual_name && (
                                <div className="flex items-center gap-2">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{p.fs_conductor_individual_name}</span>
                                </div>
                              )}
                              {p.fs_conductor_individual_job_title && (
                                <div className="flex items-center gap-2">
                                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{p.fs_conductor_individual_job_title}</span>
                                </div>
                              )}
                              {p.fs_conductor_individual_company && (
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{p.fs_conductor_individual_company}</span>
                                </div>
                              )}
                              {p.fs_conductor_individual_email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{p.fs_conductor_individual_email}</span>
                                </div>
                              )}
                              {p.fs_conductor_individual_phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{p.fs_conductor_individual_phone}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {p.fs_conductor_company_name && (
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{p.fs_conductor_company_name}</span>
                                </div>
                              )}
                              {p.fs_conductor_contact_person && (
                                <div className="flex items-center gap-2">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{p.fs_conductor_contact_person}</span>
                                </div>
                              )}
                              {p.fs_conductor_company_address && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{p.fs_conductor_company_address}</span>
                                </div>
                              )}
                              {p.fs_conductor_company_email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{p.fs_conductor_company_email}</span>
                                </div>
                              )}
                              {p.fs_conductor_company_phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{p.fs_conductor_company_phone}</span>
                                </div>
                              )}
                              {p.fs_conductor_company_website && (
                                <div className="flex items-center gap-2">
                                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{p.fs_conductor_company_website}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* SDG Alignment */}
                  {project.sdg_goals && project.sdg_goals.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">SDG Alignment</div>
                      <div className="flex flex-wrap gap-1.5">
                        {project.sdg_goals.map((goal) => (
                          <Badge key={goal} variant="outline" className="text-xs">
                            SDG {goal}{SDG_LABELS[goal] ? `: ${SDG_LABELS[goal]}` : ''}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MSDP Alignment */}
                  {(project.msdp_strategy_area || project.alignment_justification || ndpGoal || project.sector_strategy_reference || project.in_sector_investment_plan != null || (project.secondary_ndp_goals && project.secondary_ndp_goals.length > 0)) && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">MSDP Alignment</div>
                      <div className="space-y-2">
                        {project.msdp_strategy_area && (
                          <div>
                            <div className="text-[10px] text-muted-foreground">Strategy Area</div>
                            <div className="text-sm">{project.msdp_strategy_area}</div>
                          </div>
                        )}
                        {project.alignment_justification && (
                          <div>
                            <div className="text-[10px] text-muted-foreground">Justification</div>
                            <p className="text-sm leading-relaxed">{project.alignment_justification}</p>
                          </div>
                        )}
                        {project.sector_strategy_reference && project.sector_strategy_reference.length > 0 && (
                          <div>
                            <div className="text-[10px] text-muted-foreground">Sector Strategy Reference</div>
                            <div className="text-sm">{project.sector_strategy_reference.join(', ')}</div>
                          </div>
                        )}
                        {project.in_sector_investment_plan != null && (
                          <div>
                            <div className="text-[10px] text-muted-foreground">Included in Sector Investment Plan</div>
                            <div className="text-sm">{project.in_sector_investment_plan ? 'Yes' : 'No'}</div>
                          </div>
                        )}
                        {ndpGoal && (
                          <div>
                            <div className="text-[10px] text-muted-foreground">NDP Goal</div>
                            <div className="text-sm">{ndpGoal.code} — {ndpGoal.name}</div>
                          </div>
                        )}
                        {project.secondary_ndp_goals && project.secondary_ndp_goals.length > 0 && (
                          <div>
                            <div className="text-[10px] text-muted-foreground">Secondary NDP Goals</div>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {project.secondary_ndp_goals.map((goal) => (
                                <Badge key={goal} variant="outline" className="text-xs">{goal}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Donor Commitments */}
                  {project.donors && project.donors.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Donor Commitments</div>
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
                              <div className="text-sm font-medium">{formatCurrency(d.amount, d.currency)}</div>
                              <Badge variant="outline" className="text-[10px]">
                                {COMMITMENT_STATUS_LABELS[d.commitment_status] || d.commitment_status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            </Card>

            {/* Appraisal Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appraisal Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: '#f1f4f8' }}>
                    <div className="text-xs text-muted-foreground">FIRR</div>
                    <div
                      className="text-xl font-bold"
                      style={{ color: project.firr != null ? (project.firr >= 10 ? '#7b95a7' : '#dc2625') : undefined }}
                    >
                      {project.firr != null ? `${project.firr}%` : <span className="text-muted-foreground">—</span>}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: '#f1f4f8' }}>
                    <div className="text-xs text-muted-foreground">EIRR</div>
                    <div
                      className="text-xl font-bold"
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
                    <div className="text-xl font-bold" style={{ color: '#4c5568' }}>
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
                              <span className="text-sm" style={{ color: a.eirr_result >= 15 ? '#7b95a7' : '#dc2625' }}>
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

              <TabsContent value="feasibility" className="space-y-6">
                {/* Preliminary Feasibility Study Data — two-column card */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Preliminary Feasibility Study Data</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {/* ── Left Column ── */}
                      <div className="space-y-5">
                        {/* Technical */}
                        {(['fs1', 'fs2', 'fs3'] as ProjectPhase[]).includes(currentPhase) && (project.technical_approach || project.technology_methodology || project.technical_risks) && (
                          <div>
                            <div className="text-xs font-semibold mb-2">Technical</div>
                            <div className="space-y-2">
                              <PFSField label="Technical Approach" value={project.technical_approach} />
                              <PFSField label="Technology / Methodology" value={project.technology_methodology} />
                              <PFSField label="Technical Risks" value={project.technical_risks} />
                              {project.has_technical_design && (
                                <PFSField label="Design Maturity" value={(() => { const f = TECHNICAL_MATURITY_LEVELS.find(l => l.value === project.technical_design_maturity); return f ? f.label : project.technical_design_maturity || null })()} />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Revenue */}
                        {project.has_revenue_component && (
                          <div>
                            <div className="text-xs font-semibold mb-2">Revenue</div>
                            <div className="space-y-2">
                              <PFSField label="Revenue Sources" value={(project.revenue_sources || []).join(', ')} />
                              <PFSField label="Projected Annual Users" value={project.projected_annual_users} />
                              <PFSField label="Projected Annual Revenue" value={project.projected_annual_revenue ? formatCurrency(project.projected_annual_revenue) : null} />
                              <PFSField label="Revenue Ramp-up" value={project.revenue_ramp_up_years ? `${project.revenue_ramp_up_years} years` : null} />
                              <PFSField label="Market Assessment" value={project.market_assessment_summary} />
                            </div>
                          </div>
                        )}

                        {/* Environmental & Social */}
                        {(project.environmental_impact_level || project.social_impact_level) && (
                          <div>
                            <div className="text-xs font-semibold mb-2">Environmental & Social</div>
                            <div className="space-y-2">
                              <PFSField label="Environmental Impact" value={(() => { const f = IMPACT_LEVELS.find(l => l.value === project.environmental_impact_level); return f ? f.label : project.environmental_impact_level || null })()} />
                              <PFSField label="Social Impact" value={(() => { const f = IMPACT_LEVELS.find(l => l.value === project.social_impact_level); return f ? f.label : project.social_impact_level || null })()} />
                              {project.environmental_impact_description && (
                                <PFSField label="Environmental Description" value={project.environmental_impact_description} />
                              )}
                              {project.social_impact_description && (
                                <PFSField label="Social Description" value={project.social_impact_description} />
                              )}
                              {project.land_acquisition_required && <PFSField label="Land Acquisition" value="Required" />}
                              {project.resettlement_required && (
                                <PFSField label="Resettlement" value={project.estimated_affected_households ? `Required — ~${project.estimated_affected_households} households` : 'Required'} />
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Right Column ── */}
                      <div className="space-y-5">
                        {/* Narrative */}
                        <div>
                          <div className="text-xs font-semibold mb-2">Preliminary Feasibility Narrative</div>
                          <FS1NarrativeDisplay projectId={id} />
                        </div>

                        {/* FS-1 Status Info */}
                        {project.feasibility_stage && ['fs1_submitted', 'fs1_desk_screened'].includes(project.feasibility_stage) && (
                          <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50/50">
                            <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                            <div>
                              <h3 className="text-sm font-semibold">FS-1 Under Review</h3>
                              <p className="text-xs text-muted-foreground">
                                {project.feasibility_stage === 'fs1_submitted'
                                  ? 'Your narrative is awaiting desk review.'
                                  : 'Your narrative passed desk review and is awaiting senior review.'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* FS-1 Rejected */}
                        {project.feasibility_stage === 'fs1_rejected' && (
                          <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50/50">
                            <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                            <div>
                              <h3 className="text-sm font-semibold text-red-700">FS-1 Rejected</h3>
                              {project.fs1_rejected_at && (
                                <p className="text-xs text-muted-foreground">
                                  Cool-down until {new Date(new Date(project.fs1_rejected_at).getTime() + 6 * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* FS-2 Assignment */}
                        {project.feasibility_stage && ['fs1_passed', 'fs2_assigned', 'fs2_in_progress', 'fs2_completed'].includes(project.feasibility_stage) && (
                          <FS2AssignmentPanel
                            projectId={id}
                            feasibilityStage={project.feasibility_stage}
                            onUpdated={fetchProject}
                          />
                        )}

                        {/* Category Decision */}
                        {project.feasibility_stage && ['fs2_completed', 'categorized', 'fs3_in_progress', 'fs3_completed'].includes(project.feasibility_stage) && (
                          <CategoryDecisionPanel
                            project={project}
                            onCategorized={fetchProject}
                          />
                        )}

                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cash Flow Projection */}
                {(project.firr_cost_table_data || project.cost_table_data) && (project.firr_cost_table_data || project.cost_table_data)!.length > 0 && (
                  <Card>
                    <CardHeader className="bg-surface-muted rounded-t-lg"><CardTitle className="text-base">Cash Flow Projection</CardTitle></CardHeader>
                    <CardContent>
                      <CashFlowTable
                        rows={(project.firr_cost_table_data || project.cost_table_data)!}
                        onChange={() => {}}
                        readOnly
                        showNet
                        showTotals
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Financial Analysis */}
                {project.firr !== null && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Financial Analysis</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="p-3 bg-surface-muted rounded-lg">
                          <div className="text-xs text-muted-foreground">FIRR</div>
                          <div className="text-lg font-bold tabular-nums mt-0.5">
                            {project.firr !== null ? `${project.firr.toFixed(1)}%` : '—'}
                          </div>
                        </div>
                        {project.firr_calculation_data && (
                          <>
                            <div className="p-3 bg-surface-muted rounded-lg">
                              <div className="text-xs text-muted-foreground">NPV @ 10%</div>
                              <div className="text-lg font-bold tabular-nums mt-0.5">
                                {formatCurrency(project.firr_calculation_data.npv_at_10)}
                              </div>
                            </div>
                            <div className="p-3 bg-surface-muted rounded-lg">
                              <div className="text-xs text-muted-foreground">Payback Year</div>
                              <div className="text-lg font-bold tabular-nums mt-0.5">
                                {project.firr_calculation_data.payback_year || '—'}
                              </div>
                            </div>
                            <div className="p-3 bg-surface-muted rounded-lg">
                              <div className="text-xs text-muted-foreground">Total Investment</div>
                              <div className="text-lg font-bold tabular-nums mt-0.5">
                                {formatCurrency(project.firr_calculation_data.total_investment)}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      {/* Sensitivity Analysis */}
                      {project.firr_calculation_data?.sensitivity && Array.isArray(project.firr_calculation_data.sensitivity) && project.firr_calculation_data.sensitivity.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs font-medium text-muted-foreground mb-2">Sensitivity Analysis</div>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-surface-muted">
                                  <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Scenario</th>
                                  <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">FIRR</th>
                                  <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">NPV</th>
                                </tr>
                              </thead>
                              <tbody>
                                {project.firr_calculation_data.sensitivity.map((row: any, i: number) => (
                                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                                    <td className="px-3 py-1.5">{row.label || row.scenario || '—'}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{row.firr != null ? `${Number(row.firr).toFixed(1)}%` : '—'}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{row.npv != null ? formatCurrency(row.npv) : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Economic Analysis Charts */}
                {project.eirr_calculation_data && (
                  <EconomicAnalysisCharts
                    eirrCalculationData={project.eirr_calculation_data}
                    eirr={project.eirr}
                    eirrNpv={project.eirr_calculation_data?.npv}
                    eirrBcr={project.eirr_calculation_data?.bcr}
                  />
                )}
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
                    className="w-full justify-start gap-2 bg-black hover:bg-black/90 text-white"
                    variant="default"
                    asChild
                  >
                    <Link href={`/project-bank/${id}/appraisal`}>
                      <ArrowRight className="h-4 w-4" />
                      {getActionLabel(currentPhase)}
                    </Link>
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
                {/* Rejections are handled via the Review Board */}
              </CardContent>
            </Card>

            {/* 1b. Categorization Result */}
            {project.category_decision && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Categorization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="p-2.5 bg-surface-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="text-sm font-semibold">{CATEGORY_LABELS[project.category_decision]}</span>
                    </div>
                    {project.category_recommendation && project.category_recommendation !== project.category_decision && (
                      <div className="text-[10px] text-muted-foreground mt-1 ml-6">
                        System recommended: {CATEGORY_LABELS[project.category_recommendation]}
                      </div>
                    )}
                  </div>
                  {project.category_rationale && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {project.category_rationale}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 1c. Project Score */}
            <ProjectScoreCard projectId={id} />

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
                      {formatFullDate(value as string | null)}
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
                  <span className="text-xs font-medium">{formatFullDate(project.created_at)}</span>
                </div>
              </CardContent>
            </Card>

            {/* 3. AIMS Linkage (moved from main column) */}
            {project.aims_activity_id && (
              <Card>
                <CardHeader><CardTitle className="text-sm">AIMS Linkage</CardTitle></CardHeader>
                <CardContent>
                  <div className="p-3 bg-[#f6f5f3] rounded-lg border border-[#5f7f7a]/20">
                    <div className="text-sm font-medium text-foreground mb-1">Linked to AIMS</div>
                    <div className="text-xs text-muted-foreground mb-2">Tracked in the AIMS module</div>
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

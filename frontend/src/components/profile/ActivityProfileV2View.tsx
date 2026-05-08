"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Pencil,
  Eye,
  Printer,
  Download,
  FileCode,
} from "lucide-react"
import { toast } from "sonner"
import {
  ProfileLayout,
  ProfileHero,
  ProfileTabs,
  type ProfileTabSpec,
  type HeroAccent,
  RailFocalPoints,
  RailParticipatingOrgs,
  RailStatusTimeline,
  RailKeyNumbers,
  RailIdentity,
  type ParticipatingOrg,
  type IdentityRow,
  type KeyNumber,
  type FocalPoint,
} from "@/components/profile"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { ActivityVote } from "@/components/ui/activity-vote"
import { SafeHtml } from "@/components/ui/safe-html"
import ActivityBudgetsTab from "@/components/activities/ActivityBudgetsTab"
import PlannedDisbursementsTab from "@/components/activities/PlannedDisbursementsTab"
import TransactionTab from "@/components/activities/TransactionTab"
import { ResultsReadOnlyView } from "@/components/activities/ResultsReadOnlyView"
import { DocumentsAndImagesTabV2 } from "@/components/activities/DocumentsAndImagesTabV2"
import { PublicCommentsThread } from "@/components/activities/PublicCommentsThread"
import SectorSankeyVisualization from "@/components/charts/SectorSankeyVisualization"
import dynamic from "next/dynamic"

const ActivityLocationsMapViewV2 = dynamic(
  () => import("@/components/maps/ActivityLocationsMapViewV2"),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-96 text-muted-foreground">Loading map…</div> },
)
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, BarChart3 } from "lucide-react"
import { EnhancedSubnationalBreakdown } from "@/components/activities/EnhancedSubnationalBreakdown"
import FinancialAnalyticsTab from "@/components/activities/FinancialAnalyticsTab"
import { ActivityLocationsTable } from "@/components/locations/ActivityLocationsTable"
import { Table2 } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { XlsxWorkbookBuilder } from "@/lib/exports/xlsx-workbook"
import { getOrganizationRoleName, getRoleCodeFromType } from "@/data/iati-organization-roles"
import { formatCurrencyShort } from "@/lib/format"
import { getActivityStatusLabel } from "@/lib/activity-status-utils"

const V2_TABS: ProfileTabSpec[] = [
  { value: "overview", label: "Overview" },
  { value: "sectors", label: "Sectors" },
  { value: "geography", label: "Locations" },
  { value: "finances", label: "Finances" },
  { value: "results", label: "Results" },
  { value: "library", label: "Documents" },
  { value: "discussion", label: "Comments" },
]

function deriveAccent(activity: any): HeroAccent {
  if (activity?.humanitarian) return "coral"
  const label = getActivityStatusLabel(activity?.activityStatus).toLowerCase()
  if (label === "implementation") return "teal"
  if (label === "pipeline") return "blue"
  if (label === "finalisation" || label === "suspended") return "amber"
  if (label === "closed" || label === "cancelled") return "grey"
  return "teal"
}

function compact(n: number | undefined | null): string {
  if (!n || n === 0) return "$0"
  return formatCurrencyShort(n)
}

interface Props {
  activity: any
  reportingOrg: any
  participatingOrgs: any[]
  financials: { totalCommitment: number; totalDisbursement: number; totalExpenditure: number }
  totalBudgeted: number
  totalPlannedDisbursements: number
  countryAllocations: any[]
  regionAllocations: any[]
  sdgMappings: any[]
  user: any
  isBookmarked: boolean
  isToggling: boolean
  onToggleBookmark: () => void
  viewCount: number | null
  activeTab: string
  onTabChange: (tab: string) => void
  onPrintPDF: () => void
  onExportCSV: () => void
}

export function ActivityProfileV2View({
  activity,
  reportingOrg,
  participatingOrgs,
  financials,
  totalBudgeted,
  totalPlannedDisbursements,
  countryAllocations,
  regionAllocations,
  sdgMappings,
  user,
  isBookmarked,
  isToggling,
  onToggleBookmark,
  viewCount,
  activeTab,
  onTabChange,
  onPrintPDF,
  onExportCSV,
}: Props) {
  const router = useRouter()
  const accent = deriveAccent(activity)

  // Once a tab is visited, keep its content mounted (hidden via CSS) so revisiting
  // it doesn't trigger a refetch / loading state.
  // Pre-mount every tab from the first render so each child component fires its
  // data fetches immediately in the background. Hidden tabs sit under
  // `display: none` (see Pane below) but their effects still run, so by the time
  // the user clicks Finances / Results / Locations the data is already cached.
  const ALL_TABS = ["overview", "sectors", "geography", "finances", "results", "library", "discussion"]
  const [visitedTabs] = useState<Set<string>>(() => new Set(ALL_TABS))

  // Locations come from the dedicated /locations endpoint — the activity payload's
  // embedded `locations.specificLocations` is often empty. Match the v1 page so the
  // map has data to render.
  const [activityLocations, setActivityLocations] = useState<any[]>([])
  useEffect(() => {
    if (!activity?.id) return
    let cancelled = false
    apiFetch(`/api/activities/${activity.id}/locations`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        if (data.success && Array.isArray(data.locations)) {
          setActivityLocations(data.locations)
        } else {
          setActivityLocations([])
        }
      })
      .catch(() => {
        if (!cancelled) setActivityLocations([])
      })
    return () => {
      cancelled = true
    }
  }, [activity?.id])

  // Stabilise the map-ready location list so passing it into the map component does
  // not cause AutoFitBounds (which depends on the array identity) to re-fire every
  // render and trigger a re-render loop with the parent.
  const validMapLocations = useMemo(() => {
    const embeddedLocations = activity?.locations?.specificLocations || []
    const sourceLocations = activityLocations.length > 0 ? activityLocations : embeddedLocations
    return sourceLocations
      .filter((l: any) => l.latitude != null && l.longitude != null)
      .map((l: any) => ({
        id: l.id,
        location_name: l.location_name || l.name,
        latitude: Number(l.latitude),
        longitude: Number(l.longitude),
        site_type: l.site_type || l.type || "project_site",
        state_region_name: l.state_region_name || l.stateRegionName,
        township_name: l.township_name || l.townshipName,
        district_name: l.district_name,
        village_name: l.village_name,
        description: l.description,
        location_description: l.location_description,
      }))
  }, [activityLocations, activity?.locations?.specificLocations])

  // Sub-national breakdowns recorded against this activity. Used by the
  // Locations tab's "Sub-national Breakdown" sub-view (mirrors the Atlas).
  const [subnationalBreakdowns, setSubnationalBreakdowns] = useState<any[]>([])
  useEffect(() => {
    if (!activity?.id) return
    let cancelled = false
    apiFetch(`/api/activities/${activity.id}/subnational-breakdown`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setSubnationalBreakdowns(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setSubnationalBreakdowns([])
      })
    return () => {
      cancelled = true
    }
  }, [activity?.id])

  // Reshape the breakdowns into the MapBreakdowns shape used by the choropleth.
  const regionBreakdownsWithDetails = useMemo(() => {
    const result: Record<string, { percentage: number; activityCount: number; activities: Array<{ id: string; title: string }> }> = {}
    subnationalBreakdowns.forEach((b: any) => {
      const region = b.region_name
      if (!region) return
      result[region] = {
        percentage: Number(b.percentage) || 0,
        activityCount: 1,
        activities: [
          {
            id: activity?.id ?? "",
            title: activity?.title ?? activity?.title_narrative ?? "This activity",
          },
        ],
      }
    })
    return result
  }, [subnationalBreakdowns, activity?.id, activity?.title, activity?.title_narrative])

  // Fetch focal points (government + development partner) for the rail block.
  const [focalPoints, setFocalPoints] = useState<FocalPoint[]>([])
  useEffect(() => {
    if (!activity?.id) return
    let cancelled = false
    apiFetch(`/api/activities/${activity.id}/focal-points`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        // Compose "Full Name (Acronym)" so the rail shows both. Falls back to
        // whichever piece is present.
        const formatOrg = (fp: any): string | undefined => {
          const name = fp.organization?.name?.trim()
          const acronym = fp.organization?.acronym?.trim()
          if (name && acronym && name !== acronym) return `${name} (${acronym})`
          return name || acronym || fp.organisation || undefined
        }
        const govt = (data.government_focal_points ?? []).map((fp: any) => ({
          id: fp.id,
          title: fp.title || undefined,
          name: fp.name,
          role: "Government Focal Point",
          jobTitle: fp.job_title || undefined,
          department: fp.department || undefined,
          organisation: formatOrg(fp),
          photoUrl: fp.avatar_url,
          contactEmail: fp.email,
          isPrimary: true,
        }))
        const dp = (data.development_partner_focal_points ?? []).map((fp: any) => ({
          id: fp.id,
          title: fp.title || undefined,
          name: fp.name,
          role: "Development Partner Focal Point",
          jobTitle: fp.job_title || undefined,
          department: fp.department || undefined,
          organisation: formatOrg(fp),
          photoUrl: fp.avatar_url,
          contactEmail: fp.email,
        }))
        setFocalPoints([...govt, ...dp])
      })
      .catch(() => {
        if (!cancelled) setFocalPoints([])
      })
    return () => {
      cancelled = true
    }
  }, [activity?.id])

  const totalSpent = financials.totalDisbursement + financials.totalExpenditure
  const spendPct = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  const heroBadges: { label: string; tone?: "default" | "humanitarian" | "muted" }[] = [
    { label: getActivityStatusLabel(activity?.activityStatus), tone: "default" },
  ]
  if (activity?.humanitarian) heroBadges.push({ label: "Humanitarian", tone: "humanitarian" })

  // Build the row of gray-background monospace ID pills shown above the title.
  // The internal ref / partner ID is the Activity ID; the IATI identifier is
  // shown alongside it when present.
  const heroPrefixIds: { label: string; value: string }[] = []
  const internalId =
    activity?.partnerId || activity?.auto_ref || activity?.id
  if (internalId) heroPrefixIds.push({ label: "ID", value: internalId })
  if (activity?.iatiIdentifier && activity.iatiIdentifier !== internalId) {
    heroPrefixIds.push({ label: "IATI", value: activity.iatiIdentifier })
  }
  const copyId = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`, { description: value })
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  const heroPrefix =
    heroPrefixIds.length > 0
      ? heroPrefixIds.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => copyId(p.label, p.value)}
            title={`Click to copy ${p.label}`}
            className="inline-flex items-center h-7 rounded bg-white/90 px-2.5 text-[11px] text-foreground shadow-sm transition hover:bg-white"
          >
            <code className="font-mono">{p.value}</code>
          </button>
        ))
      : null

  const reportingOrgDisplay = (() => {
    if (!reportingOrg) return null
    const name = reportingOrg.name?.trim()
    const acronym = reportingOrg.acronym?.trim()
    if (name && acronym && name !== acronym) return `${name} (${acronym})`
    return name || acronym || null
  })()

  const heroSubtitle = reportingOrgDisplay ? (
    <span className="inline-flex items-center gap-2.5 font-bold">
      {reportingOrg?.logo && (
        <img
          src={reportingOrg.logo}
          alt=""
          className="w-5 h-5 rounded object-cover"
        />
      )}
      {reportingOrgDisplay}
    </span>
  ) : null

  const breadcrumb = (
    <button
      type="button"
      onClick={() => router.push("/activities")}
      className="inline-flex items-center gap-1.5 h-9 text-slate-900 text-[12px] px-3 rounded-md bg-slate-200 hover:bg-slate-300 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Activities
    </button>
  )

  const heroActions = (
    <>
      {viewCount != null && viewCount > 0 && (
        <span className="inline-flex items-center gap-1 h-9 px-2.5 text-[12px] text-slate-900 rounded-md bg-slate-200">
          <Eye className="w-3.5 h-3.5" />
          {viewCount}
        </span>
      )}
      <span className="inline-flex items-center h-9 px-1.5 rounded-md bg-slate-200">
        <ActivityVote activityId={activity.id} userId={user?.id} size="sm" variant="horizontal" />
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-slate-900 bg-slate-200 hover:bg-slate-300 hover:text-slate-900"
        onClick={onToggleBookmark}
        disabled={isToggling}
        title={isBookmarked ? "Saved" : "Save"}
        aria-label={isBookmarked ? "Saved" : "Save"}
      >
        {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-900 bg-slate-200 hover:bg-slate-300 hover:text-slate-900"
            title="Export"
            aria-label="Export"
          >
            <Download className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onPrintPDF}>
            <Printer className="w-4 h-4 mr-2" />
            Print as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              try {
                toast.info("Generating IATI XML...")
                const response = await apiFetch(`/api/activities/${activity.id}/export-iati`)
                if (!response.ok) throw new Error("Export failed")
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `${activity?.iati_id || activity?.id}.xml`
                a.click()
                window.URL.revokeObjectURL(url)
                toast.success("IATI XML exported successfully")
              } catch {
                toast.error("Failed to export IATI XML")
              }
            }}
          >
            <FileCode className="w-4 h-4 mr-2" />
            Export IATI XML
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Link
        href={`/activities/new?id=${activity.id}`}
        className="ml-1 inline-flex items-center h-9 rounded-md bg-white/95 px-3 text-[13px] font-medium text-foreground hover:bg-white transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 mr-1.5" />
        Edit
      </Link>
    </>
  )

  // Map participating orgs to rail-friendly shape
  const railOrgs: ParticipatingOrg[] = (participatingOrgs ?? []).map((o: any) => {
    const roleCode = o.iati_role_code ?? getRoleCodeFromType(o.role_type)
    const roleName = (getOrganizationRoleName(roleCode) ?? "")
      .toString()
      .toLowerCase()
    return {
      id: o.organization?.id,
      name: o.narrative || o.organization?.name || "Unknown",
      acronym: o.organization?.acronym,
      role: roleName || "implementing",
      logoUrl: o.organization?.logo,
    }
  })

  const keyNumbers: KeyNumber[] = [
    { label: "Total Budgeted", value: compact(totalBudgeted) },
    { label: "Total Planned Disbursements", value: compact(totalPlannedDisbursements) },
    { label: "Total Committed", value: compact(financials.totalCommitment) },
    { label: "Total Disbursed", value: compact(financials.totalDisbursement) },
  ]

  const identityRows: IdentityRow[] = [
    activity?.iatiIdentifier && {
      label: "IATI ID",
      value: activity.iatiIdentifier,
      mono: true,
    },
    activity?.auto_ref && {
      label: "Internal",
      value: activity.auto_ref,
      mono: true,
    },
    activity?.partnerId &&
      activity.partnerId !== activity?.iatiIdentifier && {
        label: "Partner",
        value: activity.partnerId,
        mono: true,
      },
    {
      label: "Source",
      value:
        activity?.autoSync && activity?.syncStatus === "live"
          ? "IATI · synced"
          : activity?.iatiIdentifier
          ? "IATI"
          : "Manual",
    },
    activity?.linkedDataUri && {
      label: "Linked URI",
      value: (
        <a
          href={activity.linkedDataUri}
          target="_blank"
          rel="noreferrer"
          className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground break-all"
        >
          {activity.linkedDataUri}
        </a>
      ),
    },
    activity?.updatedAt && {
      label: "Updated",
      value: new Date(activity.updatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    },
  ].filter(Boolean) as IdentityRow[]

  const rail = (
    <>
      <RailFocalPoints
        focalPoints={focalPoints}
        emptyState="No focal points assigned yet."
      />
      <RailParticipatingOrgs
        orgs={railOrgs}
        onViewAll={() => onTabChange("partnerships")}
      />
      <RailStatusTimeline
        status={activity?.activityStatus}
        startDate={activity?.actualStartDate ?? activity?.plannedStartDate}
        endDate={activity?.actualEndDate ?? activity?.plannedEndDate}
      />
      <RailKeyNumbers
        items={keyNumbers}
        progress={
          totalBudgeted > 0
            ? { label: "of budget spent", percent: spendPct }
            : undefined
        }
      />
    </>
  )

  const tabs = (
    <ProfileTabs tabs={V2_TABS} activeTab={activeTab} onChange={onTabChange} />
  )

  const main = renderMainSlot({
    activity,
    activeTab,
    visitedTabs,
    activityLocations,
    validMapLocations,
    regionBreakdownsWithDetails,
    financials,
    totalBudgeted,
    totalPlannedDisbursements,
    participatingOrgs,
    countryAllocations,
    regionAllocations,
    sdgMappings,
    onTabChange,
    user,
  })

  return (
    <ProfileLayout
      hero={
        <ProfileHero
          prefix={heroPrefix}
          title={
            activity?.acronym && activity.acronym !== activity?.title
              ? `${activity.title} (${activity.acronym})`
              : activity?.title ?? "Untitled activity"
          }
          subtitle={heroSubtitle}
          badges={heroBadges}
          accent={accent}
          imageUrl={activity?.banner ?? null}
          imagePosition={activity?.bannerPosition ?? 50}
          actions={heroActions}
          breadcrumb={breadcrumb}
        />
      }
      tabs={tabs}
      main={main}
      rail={activeTab === "overview" ? rail : undefined}
    />
  )
}

function OverviewAboutSection({ activity }: { activity: any }) {
  const description = (activity?.description ?? "").trim()
  const objectives = (activity?.descriptionObjectives ?? "").trim()
  const targetGroups = (activity?.descriptionTargetGroups ?? "").trim()
  const other = (activity?.descriptionOther ?? "").trim()

  const hasAny = !!(description || objectives || targetGroups || other)
  if (!hasAny) return null

  return (
    <div className="space-y-6 pt-5">
      {description && (
        <section>
          <h3 className="text-body font-semibold text-foreground mb-2">General</h3>
          <SafeHtml
            html={description}
            level="rich"
            className="text-body text-foreground/85 leading-relaxed"
          />
        </section>
      )}
      {objectives && (
        <section>
          <h3 className="text-body font-semibold text-foreground mb-2">Objectives</h3>
          <SafeHtml
            html={objectives}
            level="rich"
            className="text-body text-foreground/85 leading-relaxed"
          />
        </section>
      )}
      {targetGroups && (
        <section>
          <h3 className="text-body font-semibold text-foreground mb-2">Target Groups</h3>
          <SafeHtml
            html={targetGroups}
            level="rich"
            className="text-body text-foreground/85 leading-relaxed"
          />
        </section>
      )}
      {other && (
        <section>
          <h3 className="text-body font-semibold text-foreground mb-2">Other</h3>
          <SafeHtml
            html={other}
            level="rich"
            className="text-body text-foreground/85 leading-relaxed"
          />
        </section>
      )}
    </div>
  )
}

function renderMainSlot(args: {
  activity: any
  activeTab: string
  visitedTabs: Set<string>
  activityLocations: any[]
  validMapLocations: any[]
  regionBreakdownsWithDetails: Record<string, { percentage: number; activityCount: number; activities: Array<{ id: string; title: string }> }>
  financials: any
  totalBudgeted: number
  totalPlannedDisbursements: number
  participatingOrgs: any[]
  countryAllocations: any[]
  regionAllocations: any[]
  sdgMappings: any[]
  onTabChange: (tab: string) => void
  user: any
}) {
  const { activeTab, activity, visitedTabs, activityLocations, validMapLocations, regionBreakdownsWithDetails, totalBudgeted, totalPlannedDisbursements } = args
  const startDate = activity?.actualStartDate || activity?.plannedStartDate || ""
  const endDate = activity?.actualEndDate || activity?.plannedEndDate || ""

  const sectorAllocations = activity?.sectorAllocations || activity?.sectors || []
  // Pre-compute sector financial breakdown so the Sectors tab's chart can show
  // budget / planned-disbursement totals per sector rather than always 0.
  const sectorFinancialData = sectorAllocations.map((s: any) => {
    const pct = (s.percentage || 0) / 100
    return {
      code: s.sector_code || s.code,
      budget: (totalBudgeted || 0) * pct,
      plannedDisbursement: (totalPlannedDisbursements || 0) * pct,
      transactionTypes: {},
    }
  })

  // Each tab is mounted on first visit and kept in the DOM thereafter, hidden via
  // CSS when not active. This preserves data and scroll state across tab switches.
  const Pane = ({ tab, children }: { tab: string; children: React.ReactNode }) =>
    visitedTabs.has(tab) ? (
      <div className={activeTab === tab ? "" : "hidden"}>{children}</div>
    ) : null

  const fallback = (
    <Card className="border-border bg-card p-8">
      <div className="text-center max-w-md mx-auto">
        <h2 className="text-body font-semibold text-foreground mb-2">
          {V2_TABS.find((t) => t.value === activeTab)?.label ?? activeTab}
        </h2>
        <p className="text-helper text-muted-foreground mb-4">
          This tab&apos;s content has not yet been ported into the v2 layout. Open the v1 layout
          (append <code>?v=1</code>) for now.
        </p>
      </div>
    </Card>
  )

  const knownTabs = new Set(["overview", "sectors", "geography", "finances", "results", "library", "discussion"])

  return (
    <>
      <Pane tab="overview">
        <OverviewAboutSection activity={activity} />
      </Pane>

      <Pane tab="sectors">
        {sectorAllocations.length ? (
          <Card className="border-border bg-card p-6">
            <SectorSankeyVisualization
              allocations={sectorAllocations}
              financialData={sectorFinancialData}
              defaultView="bar"
              defaultBarGroupingMode="sector"
              showControls
            />
          </Card>
        ) : (
          <Card className="border-border bg-card p-8 text-center">
            <p className="text-helper text-muted-foreground">No sectors allocated for this activity.</p>
          </Card>
        )}
      </Pane>

      <Pane tab="geography">
        <ActivityLocationsSection
          activity={activity}
          activityLocations={activityLocations}
          validMapLocations={validMapLocations}
          regionBreakdownsWithDetails={regionBreakdownsWithDetails}
        />
      </Pane>

      <Pane tab="finances">
        <FinancesPane
          activityId={activity.id}
          startDate={startDate}
          endDate={endDate}
        />
      </Pane>

      <Pane tab="results">
        <Card className="border-border bg-card p-6">
          <ResultsReadOnlyView activityId={activity.id} />
        </Card>
      </Pane>

      <Pane tab="library">
        <Card className="border-border bg-card p-6">
          <DocumentsAndImagesTabV2
            activityId={activity.id}
            documents={[]}
            onChange={() => {}}
            readOnly={true}
          />
        </Card>
      </Pane>

      <Pane tab="discussion">
        <Card className="border-border bg-card p-6">
          <PublicCommentsThread activityId={activity.id} />
        </Card>
      </Pane>

      {!knownTabs.has(activeTab) && fallback}
    </>
  )
}

interface RegionEntry {
  percentage: number
  activityCount: number
  activities: Array<{ id: string; title: string }>
}

function ActivityLocationsSection({
  activity,
  activityLocations,
  validMapLocations,
  regionBreakdownsWithDetails,
}: {
  activity: any
  activityLocations: any[]
  validMapLocations: any[]
  regionBreakdownsWithDetails: Record<string, RegionEntry>
}) {
  const [view, setView] = useState<"map" | "subnational">("map")

  // Pre-computed breakdown rows for the Excel export — not used for display
  // (the editor component renders its own table).
  const breakdownRows = useMemo(() => {
    return Object.entries(regionBreakdownsWithDetails)
      .map(([region, data]) => ({ region, percentage: data.percentage }))
      .sort((a, b) => b.percentage - a.percentage)
  }, [regionBreakdownsWithDetails])

  return (
    <Card className="border-border bg-card p-6">
      <div className="mb-4 flex flex-col space-y-1.5">
        <h2 className="text-2xl font-semibold leading-none tracking-tight text-foreground">Activity Locations</h2>
        <p className="text-body text-muted-foreground">
          Mapped locations and sub-national breakdown for this activity
        </p>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "map" | "subnational")} className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <TabsList>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="subnational" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Sub-national Breakdown
            </TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="icon"
            onClick={() => exportLocationsXlsx({ activity, validMapLocations, breakdownRows })}
            title="Export to Excel"
            aria-label="Export to Excel"
            disabled={validMapLocations.length === 0 && breakdownRows.length === 0}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <TabsContent value="map" className="m-0 space-y-6">
          {validMapLocations.length > 0 ? (
            <div className="h-[640px] rounded-md overflow-hidden border border-border">
              <ActivityLocationsMapViewV2
                locations={validMapLocations}
                mapCenter={[19.0, 96.5]}
                mapZoom={6}
                activityTitle={activity?.title}
                organizationId={activity?.reporting_org_id}
              />
            </div>
          ) : (
            <p className="text-helper text-muted-foreground">No mapped locations for this activity.</p>
          )}
          {activityLocations.length > 0 && (
            <ActivityLocationsTable locations={activityLocations} />
          )}
        </TabsContent>

        <TabsContent value="subnational" className="m-0">
          {/* Read-only render of the same component used in the Activity Editor:
              two-column layout with Sub-national Map on the left and the
              Sub-national Allocation table on the right. canEdit=false hides
              the dropdown / Distribute / Clear All / per-row delete controls
              and disables the percentage inputs. */}
          <EnhancedSubnationalBreakdown activityId={activity.id} canEdit={false} />
        </TabsContent>
      </Tabs>
    </Card>
  )
}

function exportLocationsXlsx({
  activity,
  validMapLocations,
  breakdownRows,
}: {
  activity: any
  validMapLocations: any[]
  breakdownRows: Array<{ region: string; percentage: number }>
}) {
  const wb = new XlsxWorkbookBuilder()

  wb.addSheet(
    "Locations",
    [
      { header: "Name", accessor: "name" as const },
      { header: "Latitude", accessor: "latitude" as const },
      { header: "Longitude", accessor: "longitude" as const },
      { header: "Site Type", accessor: "site_type" as const },
      { header: "State / Region", accessor: "state_region_name" as const },
      { header: "District", accessor: "district_name" as const },
      { header: "Township", accessor: "township_name" as const },
      { header: "Village", accessor: "village_name" as const },
      { header: "Description", accessor: "description" as const },
    ],
    validMapLocations.map((l) => ({
      name: l.location_name ?? "",
      latitude: l.latitude ?? "",
      longitude: l.longitude ?? "",
      site_type: l.site_type ?? "",
      state_region_name: l.state_region_name ?? "",
      district_name: l.district_name ?? "",
      township_name: l.township_name ?? "",
      village_name: l.village_name ?? "",
      description: l.description ?? l.location_description ?? "",
    })),
  )

  wb.addSheet(
    "Sub-national Breakdown",
    [
      { header: "Region", accessor: "region" as const },
      { header: "Allocation %", accessor: "percentage" as const },
    ],
    breakdownRows.map((r) => ({ region: r.region, percentage: r.percentage })),
  )

  const slug = (activity?.iati_identifier || activity?.iatiIdentifier || activity?.id || "activity")
    .toString()
    .replace(/[^a-z0-9_-]+/gi, "_")
  wb.download(`${slug}-locations.xlsx`)
}

function FinanceSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-border bg-card p-6">
      <div className="mb-4 flex flex-col space-y-1.5">
        <h2 className="text-2xl font-semibold leading-none tracking-tight text-foreground">{title}</h2>
        <p className="text-body text-muted-foreground">{description}</p>
      </div>
      {children}
    </Card>
  )
}

function FinancesPane({
  activityId,
  startDate,
  endDate,
}: {
  activityId: string
  startDate: string
  endDate: string
}) {
  // One toggle for the whole Finances tab: Tables view stacks the three section
  // cards (Transactions, Planned Disbursements, Budgets); Charts view renders a
  // single combined analytics view (FinancialAnalyticsTab) instead of per-card
  // mini charts.
  const [view, setView] = useState<"tables" | "charts">("tables")

  return (
    <Tabs value={view} onValueChange={(v) => setView(v as "tables" | "charts")} className="space-y-6">
      <div className="flex justify-end">
        <TabsList>
          <TabsTrigger value="tables" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            Tables
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Charts
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="tables" className="m-0 space-y-6">
        <FinanceSection
          title="Transactions"
          description="Incoming and outgoing financial transactions for this activity"
        >
          <TransactionTab activityId={activityId} readOnly={true} hideHeaderTitle={true} />
        </FinanceSection>
        <FinanceSection
          title="Planned Disbursements"
          description="Scheduled future disbursements"
        >
          <PlannedDisbursementsTab
            activityId={activityId}
            startDate={startDate}
            endDate={endDate}
            defaultCurrency="USD"
            readOnly={true}
            hideHeaderTitle={true}
          />
        </FinanceSection>
        <FinanceSection
          title="Budgets"
          description="Activity budget allocations by period"
        >
          <ActivityBudgetsTab
            activityId={activityId}
            startDate={startDate}
            endDate={endDate}
            defaultCurrency="USD"
            readOnly={true}
            hideHeaderTitle={true}
          />
        </FinanceSection>
      </TabsContent>

      <TabsContent value="charts" className="m-0">
        <Card className="border-border bg-card p-6">
          <div className="mb-4 flex flex-col space-y-1.5">
            <h2 className="text-2xl font-semibold leading-none tracking-tight text-foreground">Financial Analytics</h2>
            <p className="text-body text-muted-foreground">
              Spend trajectory, budget vs actual, transaction breakdown and calendar heatmap
            </p>
          </div>
          <FinancialAnalyticsTab activityId={activityId} />
        </Card>
      </TabsContent>
    </Tabs>
  )
}

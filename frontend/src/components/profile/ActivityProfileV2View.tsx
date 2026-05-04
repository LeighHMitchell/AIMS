"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Pencil,
  MoreHorizontal,
  Eye,
  Printer,
  Download,
  FileCode,
  MessageSquare,
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
import { CommentsDrawer } from "@/components/activities/CommentsDrawer"
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
import { apiFetch } from "@/lib/api-fetch"
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
  { value: "discussion", label: "History" },
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

  // Fetch focal points (government + development partner) for the rail block.
  const [focalPoints, setFocalPoints] = useState<FocalPoint[]>([])
  useEffect(() => {
    if (!activity?.id) return
    let cancelled = false
    apiFetch(`/api/activities/${activity.id}/focal-points`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        const govt = (data.government_focal_points ?? []).map((fp: any) => ({
          id: fp.id,
          name: fp.name,
          role: "Government Focal Point",
          organisation: fp.organization?.acronym || fp.organisation,
          photoUrl: fp.avatar_url,
          contactEmail: fp.email,
          isPrimary: true,
        }))
        const dp = (data.development_partner_focal_points ?? []).map((fp: any) => ({
          id: fp.id,
          name: fp.name,
          role: "Development Partner Focal Point",
          organisation: fp.organization?.acronym || fp.organisation,
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
      <CommentsDrawer activityId={activity.id}>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-900 bg-slate-200 hover:bg-slate-300 hover:text-slate-900"
          aria-label="Comments"
          title="Comments"
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
      </CommentsDrawer>
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
            title="More actions"
            aria-label="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
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
  const { activeTab, activity, user } = args
  if (activeTab === "overview") {
    return <OverviewAboutSection activity={activity} />
  }

  if (activeTab === "sectors") {
    const sectorAllocations = activity?.sectorAllocations || activity?.sectors || []
    if (!sectorAllocations.length) {
      return (
        <Card className="border-border bg-card p-8 text-center">
          <p className="text-helper text-muted-foreground">No sectors allocated for this activity.</p>
        </Card>
      )
    }
    return (
      <Card className="border-border bg-card p-6">
        <SectorSankeyVisualization
          allocations={sectorAllocations}
          showControls
        />
      </Card>
    )
  }

  if (activeTab === "geography") {
    const specificLocations = activity?.locations?.specificLocations || []
    const validMapLocations = specificLocations
      .filter((l: any) => l.latitude != null && l.longitude != null)
      .map((l: any) => ({
        location_name: l.name,
        latitude: l.latitude,
        longitude: l.longitude,
        site_type: l.type || "project_site",
        state_region_name: l.stateRegionName,
        township_name: l.townshipName,
      }))
    return (
      <div className="space-y-6">
        <Card className="border-border bg-card p-6">
          <h2 className="text-body font-semibold text-foreground mb-3">Activity Locations</h2>
          {validMapLocations.length > 0 ? (
            <ActivityLocationsMapViewV2 locations={validMapLocations} />
          ) : (
            <p className="text-helper text-muted-foreground">No mapped locations for this activity.</p>
          )}
        </Card>
      </div>
    )
  }

  if (activeTab === "finances") {
    const startDate =
      activity?.actualStartDate || activity?.plannedStartDate || ""
    const endDate = activity?.actualEndDate || activity?.plannedEndDate || ""
    return (
      <div className="space-y-6">
        <Card className="border-border bg-card p-6">
          <div className="mb-4">
            <h2 className="text-body font-semibold text-foreground">Transactions</h2>
            <p className="text-helper text-muted-foreground mt-1">
              Recorded financial transactions for this activity.
            </p>
          </div>
          <TransactionTab activityId={activity.id} readOnly={true} />
        </Card>

        <Card className="border-border bg-card p-6">
          <div className="mb-4">
            <h2 className="text-body font-semibold text-foreground">Budgets</h2>
            <p className="text-helper text-muted-foreground mt-1">
              Activity budget allocations by period.
            </p>
          </div>
          <ActivityBudgetsTab
            activityId={activity.id}
            startDate={startDate}
            endDate={endDate}
            defaultCurrency="USD"
            readOnly={true}
          />
        </Card>

        <Card className="border-border bg-card p-6">
          <div className="mb-4">
            <h2 className="text-body font-semibold text-foreground">Planned Disbursements</h2>
            <p className="text-helper text-muted-foreground mt-1">
              Forward-looking planned disbursements.
            </p>
          </div>
          <PlannedDisbursementsTab
            activityId={activity.id}
            startDate={startDate}
            endDate={endDate}
            defaultCurrency="USD"
            readOnly={true}
          />
        </Card>
      </div>
    )
  }

  if (activeTab === "results") {
    return (
      <Card className="border-border bg-card p-6">
        <ResultsReadOnlyView activityId={activity.id} />
      </Card>
    )
  }

  if (activeTab === "library") {
    return (
      <Card className="border-border bg-card p-6">
        <DocumentsAndImagesTabV2
          activityId={activity.id}
          documents={[]}
          onChange={() => {}}
          readOnly={true}
        />
      </Card>
    )
  }

  if (activeTab === "discussion") {
    return (
      <Card className="border-border bg-card p-6">
        <PublicCommentsThread activityId={activity.id} />
      </Card>
    )
  }

  return (
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
}

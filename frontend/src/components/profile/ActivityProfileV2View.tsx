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
  ProfileHeroCompactStrip,
  ProfileTabs,
  type ProfileTabSpec,
  type HeroAccent,
  HERO_HEIGHT_WITH_IMAGE,
  HERO_HEIGHT_WITHOUT_IMAGE,
  RailFocalPoints,
  RailParticipatingOrgs,
  RailStatusTimeline,
  RailKeyNumbers,
  RailIdentity,
  useShrinkOnScroll,
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmailCell } from "@/components/profile/EmailCell"
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
import { SegmentedControl } from "@/components/ui/segmented-control"
import { MapPin, BarChart3 } from "lucide-react"
import { EnhancedSubnationalBreakdown } from "@/components/activities/EnhancedSubnationalBreakdown"
import FinancialAnalyticsTab from "@/components/activities/FinancialAnalyticsTab"
import { ActivityLocationsTable } from "@/components/locations/ActivityLocationsTable"
import { MapStyleProvider } from "@/lib/map-style-context"
import { MultiSelectFilter } from "@/components/ui/multi-select-filter"
import { Label } from "@/components/ui/label"
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
  { value: "people", label: "People" },
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

// Pane wrapper hoisted to module scope. Its component identity therefore
// stays stable across parent re-renders, so the inner subtree (TransactionTab,
// ActivityBudgetsTab, PlannedDisbursementsTab, etc.) is mounted once and
// re-used. Defining this inside the parent's render function would create a
// new function reference on every render, which React treats as a new type and
// remounts the entire subtree — re-firing every child fetch and resetting any
// loaded data. Each tab is mounted on first visit and kept in the DOM
// thereafter, hidden via the `hidden` Tailwind class when not active.
const ProfilePane = React.memo(function ProfilePane({
  tab,
  activeTab,
  visitedTabs,
  children,
}: {
  tab: string
  activeTab: string
  visitedTabs: Set<string>
  children: React.ReactNode
}) {
  if (!visitedTabs.has(tab)) return null
  return <div className={activeTab === tab ? "" : "hidden"}>{children}</div>
})

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
  // Drives the shrink-on-scroll hero animation. 0 at page top → 1 once the
  // hero has fully scrolled off. Passed to both the hero (for the
  // fade/translate) and the layout (so the rail's sticky offset accounts for
  // the compact strip's height). Threshold = hero height so the fade finishes
  // exactly as the hero leaves, leaving no empty gap above the sticky strip.
  const shrinkProgress = useShrinkOnScroll(
    activity?.banner ? HERO_HEIGHT_WITH_IMAGE : HERO_HEIGHT_WITHOUT_IMAGE
  )

  // Once a tab is visited, keep its content mounted (hidden via CSS) so revisiting
  // it doesn't trigger a refetch / loading state.
  // Pre-mount every tab from the first render so each child component fires its
  // data fetches immediately in the background. Hidden tabs sit under
  // `display: none` (see Pane below) but their effects still run, so by the time
  // the user clicks Finances / Results / Locations the data is already cached.
  const ALL_TABS = ["overview", "sectors", "geography", "finances", "results", "people", "library", "discussion"]
  const [visitedTabs] = useState<Set<string>>(() => new Set(ALL_TABS))

  // Locations come from the dedicated /locations endpoint — the activity payload's
  // embedded `locations.specificLocations` is often empty. Match the v1 page so the
  // map has data to render.
  const [activityLocations, setActivityLocations] = useState<any[]>([])
  const [isLoadingActivityLocations, setIsLoadingActivityLocations] = useState(true)
  // Standalone field trips — rendered as amber pins alongside the red site pins.
  const [fieldTrips, setFieldTrips] = useState<any[]>([])
  useEffect(() => {
    if (!activity?.id) return
    let cancelled = false
    apiFetch(`/api/activities/${activity.id}/field-trips`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        setFieldTrips(Array.isArray(data?.fieldTrips) ? data.fieldTrips : [])
      })
      .catch(() => {
        if (!cancelled) setFieldTrips([])
      })
    return () => {
      cancelled = true
    }
  }, [activity?.id])
  useEffect(() => {
    if (!activity?.id) return
    let cancelled = false
    setIsLoadingActivityLocations(true)
    apiFetch(`/api/activities/${activity.id}/locations`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data?.success && Array.isArray(data.locations)) {
          // Match the activity-editor behaviour: drop coverage-type rows
          // (those belong to the Sub-national Allocation tab, not Activity
          // Sites) so the profile shows the same set of pins / table rows
          // the editor's "Activity Sites" view does. Without this filter,
          // state-level coverage entries appear duplicated against actual
          // project sites.
          const siteOnly = data.locations.filter(
            (loc: any) => loc?.location_type !== 'coverage',
          )
          setActivityLocations(siteOnly)
        } else {
          setActivityLocations([])
        }
        setIsLoadingActivityLocations(false)
      })
      .catch(() => {
        if (cancelled) return
        setActivityLocations([])
        setIsLoadingActivityLocations(false)
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
    const sitePins = sourceLocations
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
    // Field trips ride the same pin pipeline, flagged so LocationPinIcon
    // renders them amber with the camera/dot badge.
    const tripPins = (fieldTrips || [])
      .filter((t: any) => t.latitude != null && t.longitude != null)
      .map((t: any) => ({
        id: `field-trip-${t.id}`,
        location_name: t.place_name || t.title,
        latitude: Number(t.latitude),
        longitude: Number(t.longitude),
        site_type: "field_trip",
        description: t.narrative,
        is_field_trip: true,
        field_report_count: 1,
        field_report_photo_count: t.photo_count ?? 0,
      }))
    return [...sitePins, ...tripPins]
  }, [activityLocations, activity?.locations?.specificLocations, fieldTrips])

  // Sub-national breakdowns recorded against this activity. Used by the
  // Locations tab's "Sub-national Breakdown" sub-view (mirrors the Atlas).
  const [subnationalBreakdowns, setSubnationalBreakdowns] = useState<any[]>([])
  const [isLoadingSubnational, setIsLoadingSubnational] = useState(true)
  useEffect(() => {
    if (!activity?.id) return
    let cancelled = false
    setIsLoadingSubnational(true)
    apiFetch(`/api/activities/${activity.id}/subnational-breakdown`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        setSubnationalBreakdowns(Array.isArray(data) ? data : [])
        setIsLoadingSubnational(false)
      })
      .catch(() => {
        if (cancelled) return
        setSubnationalBreakdowns([])
        setIsLoadingSubnational(false)
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
  const plannedPct =
    totalBudgeted > 0
      ? Math.round((totalPlannedDisbursements / totalBudgeted) * 100)
      : 0
  const disbursedPct =
    totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

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
    reportingOrg?.id ? (
      <Link
        href={`/organizations/${reportingOrg.id}`}
        className="inline-flex items-center gap-2.5 font-bold hover:underline"
      >
        {reportingOrg?.logo && (
          <img
            src={reportingOrg.logo}
            alt=""
            className="w-5 h-5 rounded object-cover"
          />
        )}
        {reportingOrgDisplay}
      </Link>
    ) : (
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
    )
  ) : null

  const breadcrumb = (
    <button
      type="button"
      onClick={() => router.push("/activities")}
      className="inline-flex items-center gap-1.5 h-9 text-foreground text-[12px] px-3 rounded-md bg-white/90 shadow-sm hover:bg-white transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Activities
    </button>
  )

  // ── Compact strip pieces (shown sticky-pinned once the user scrolls).
  // Re-uses the same identity values the full hero builds from so there's a
  // single source of truth for "what represents this activity".
  const heroTitle =
    activity?.acronym && activity.acronym !== activity?.title
      ? `${activity.title} (${activity.acronym})`
      : activity?.title ?? "Untitled activity"
  const compactBreadcrumb = (
    <button
      type="button"
      onClick={() => router.push("/activities")}
      className="inline-flex items-center justify-center h-8 w-8 text-foreground rounded-md hover:bg-muted transition-colors"
      title="All activities"
      aria-label="All activities"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  )
  const compactIds = internalId ? (
    <button
      type="button"
      onClick={() => copyId("ID", internalId)}
      title={`Click to copy ID`}
      className="inline-flex items-center h-7 rounded bg-muted px-2 text-[11px] text-foreground hover:bg-muted/80 transition-colors"
    >
      <code className="font-mono">{internalId}</code>
    </button>
  ) : null
  const compactActions = (
    <>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
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
            variant="outline"
            size="icon"
            className="h-8 w-8"
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
        className="ml-1 inline-flex items-center h-8 rounded-md bg-primary text-primary-foreground px-3 text-[12px] font-medium hover:bg-primary/90 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 mr-1.5" />
        Edit
      </Link>
    </>
  )

  const heroActions = (
    <>
      {viewCount != null && viewCount > 0 && (
        <span className="inline-flex items-center gap-1 h-9 px-2.5 text-[12px] text-foreground rounded-md bg-white/90 shadow-sm">
          <Eye className="w-3.5 h-3.5" />
          {viewCount}
        </span>
      )}
      <span className="inline-flex items-center h-9 px-1.5 rounded-md bg-white/90 shadow-sm">
        <ActivityVote activityId={activity.id} userId={user?.id} size="sm" variant="horizontal" />
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-foreground bg-white/90 shadow-sm hover:bg-white"
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
            className="h-9 w-9 text-foreground bg-white/90 shadow-sm hover:bg-white"
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
        className="ml-1 inline-flex items-center h-9 rounded-md bg-white/90 shadow-sm px-3 text-[13px] font-medium text-foreground hover:bg-white transition-colors"
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
            ? [
                { label: "of budget planned for disbursement", percent: plannedPct },
                { label: "of budget disbursed", percent: disbursedPct },
              ]
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
    isLoadingActivityLocations,
    isLoadingSubnational,
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
          title={heroTitle}
          subtitle={heroSubtitle}
          badges={heroBadges}
          accent={accent}
          imageUrl={activity?.banner ?? null}
          imagePosition={activity?.bannerPosition ?? 50}
          actions={heroActions}
          breadcrumb={breadcrumb}
          shrinkProgress={shrinkProgress}
        />
      }
      compactStrip={
        <ProfileHeroCompactStrip
          title={heroTitle}
          subtitle={
            reportingOrgDisplay
              ? reportingOrg?.id
                ? (
                    <Link
                      href={`/organizations/${reportingOrg.id}`}
                      className="inline-flex items-center gap-1.5 font-medium text-foreground no-underline hover:no-underline align-middle"
                    >
                      {reportingOrg?.logo && (
                        <img
                          src={reportingOrg.logo}
                          alt=""
                          className="w-4 h-4 rounded object-cover flex-shrink-0"
                        />
                      )}
                      {reportingOrgDisplay}
                    </Link>
                  )
                : (
                    <span className="inline-flex items-center gap-1.5 align-middle">
                      {reportingOrg?.logo && (
                        <img
                          src={reportingOrg.logo}
                          alt=""
                          className="w-4 h-4 rounded object-cover flex-shrink-0"
                        />
                      )}
                      {reportingOrgDisplay}
                    </span>
                  )
              : null
          }
          ids={compactIds}
          actions={compactActions}
          breadcrumb={compactBreadcrumb}
          accent={accent}
          progress={shrinkProgress}
        />
      }
      shrinkProgress={shrinkProgress}
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
  isLoadingActivityLocations: boolean
  isLoadingSubnational: boolean
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
  const { activeTab, activity, visitedTabs, activityLocations, validMapLocations, regionBreakdownsWithDetails, isLoadingActivityLocations, isLoadingSubnational, totalBudgeted, totalPlannedDisbursements } = args
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

  // Pane usage is `<ProfilePane tab="..." activeTab={activeTab} visitedTabs={visitedTabs}>`
  // (see definition at module scope). Inlining a wrapper here would give it a
  // new function reference on every render, which React treats as a new
  // component type and remounts the entire subtree on every render, re-firing
  // every child fetch — that was the cause of the loading skeleton on every
  // tab click.

  const fallback = (
    <Card className="bg-card p-8">
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

  const knownTabs = new Set(["overview", "sectors", "geography", "finances", "results", "people", "library", "discussion"])

  return (
    <>
      <ProfilePane tab="overview" activeTab={activeTab} visitedTabs={visitedTabs}>
        <OverviewAboutSection activity={activity} />
      </ProfilePane>

      <ProfilePane tab="sectors" activeTab={activeTab} visitedTabs={visitedTabs}>
        {sectorAllocations.length ? (
          <Card className="bg-card p-6">
            <SectorSankeyVisualization
              allocations={sectorAllocations}
              financialData={sectorFinancialData}
              defaultView="bar"
              defaultBarGroupingMode="sector"
              showControls
            />
          </Card>
        ) : (
          <Card className="bg-card p-8 text-center">
            <p className="text-helper text-muted-foreground">No sectors allocated for this activity.</p>
          </Card>
        )}
      </ProfilePane>

      <ProfilePane tab="geography" activeTab={activeTab} visitedTabs={visitedTabs}>
        <ActivityLocationsSection
          activity={activity}
          activityLocations={activityLocations}
          validMapLocations={validMapLocations}
          regionBreakdownsWithDetails={regionBreakdownsWithDetails}
          isLoadingActivityLocations={isLoadingActivityLocations}
          isLoadingSubnational={isLoadingSubnational}
        />
      </ProfilePane>

      <ProfilePane tab="finances" activeTab={activeTab} visitedTabs={visitedTabs}>
        <FinancesPane
          activityId={activity.id}
          startDate={startDate}
          endDate={endDate}
        />
      </ProfilePane>

      <ProfilePane tab="results" activeTab={activeTab} visitedTabs={visitedTabs}>
        <Card className="bg-card p-6">
          <ResultsReadOnlyView activityId={activity.id} />
        </Card>
      </ProfilePane>

      <ProfilePane tab="people" activeTab={activeTab} visitedTabs={visitedTabs}>
        <ActivityPeoplePane activityId={activity.id} />
      </ProfilePane>

      <ProfilePane tab="library" activeTab={activeTab} visitedTabs={visitedTabs}>
        <Card className="bg-card p-6">
          <DocumentsAndImagesTabV2
            activityId={activity.id}
            documents={[]}
            onChange={() => {}}
            readOnly={true}
          />
        </Card>
      </ProfilePane>

      <ProfilePane tab="discussion" activeTab={activeTab} visitedTabs={visitedTabs}>
        <Card className="bg-card p-6">
          <PublicCommentsThread activityId={activity.id} />
        </Card>
      </ProfilePane>

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
  isLoadingActivityLocations,
  isLoadingSubnational,
}: {
  activity: any
  activityLocations: any[]
  validMapLocations: any[]
  regionBreakdownsWithDetails: Record<string, RegionEntry>
  isLoadingActivityLocations: boolean
  isLoadingSubnational: boolean
}) {
  const [view, setView] = useState<"map" | "subnational">("map")
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [focusedLocationId, setFocusedLocationId] = useState<string | null>(null)
  const mapInstanceRef = React.useRef<any>(null)

  // Pre-computed breakdown rows for the Excel export — not used for display
  // (the editor component renders its own table).
  const breakdownRows = useMemo(() => {
    return Object.entries(regionBreakdownsWithDetails)
      .map(([region, data]) => ({ region, percentage: data.percentage }))
      .sort((a, b) => b.percentage - a.percentage)
  }, [regionBreakdownsWithDetails])

  const stateOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const l of activityLocations) {
      const name = (l?.state_region_name || "").trim()
      if (!name) continue
      if (!seen.has(name)) seen.set(name, name)
    }
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [activityLocations])

  const stateSet = useMemo(() => new Set(selectedStates), [selectedStates])
  const matchesStateFilter = (l: any) => {
    if (stateSet.size === 0) return true
    const name = (l?.state_region_name || "").trim()
    return !!name && stateSet.has(name)
  }

  const filteredMapLocations = useMemo(
    () => validMapLocations.filter(matchesStateFilter),
    [validMapLocations, stateSet],
  )
  const filteredTableLocations = useMemo(
    () => activityLocations.filter(matchesStateFilter),
    [activityLocations, stateSet],
  )

  const onTableThumbClick = (loc: any) => {
    const lat = Number(loc?.latitude)
    const lng = Number(loc?.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    // Re-set the id even if it's the same, so the FocusOpener inside the
    // marker layer's useEffect re-runs and re-opens a dismissed popup.
    setFocusedLocationId(null)
    requestAnimationFrame(() => setFocusedLocationId(loc?.id || null))
    // No page-scroll: user wants the row they clicked to stay in view.
    const map = mapInstanceRef.current
    if (map?.flyTo) {
      map.flyTo({ center: [lng, lat], zoom: 14, duration: 1500, essential: true })
    }
  }

  return (
    <Card className="bg-card p-6">
      <div className="mb-4 flex flex-col space-y-1.5">
        <h2 className="text-2xl font-semibold leading-none tracking-tight text-foreground flex items-center gap-2"><MapPin className="h-6 w-6 text-muted-foreground" />Activity Locations</h2>
        <p className="text-body text-muted-foreground">
          Mapped locations and sub-national breakdown for this activity
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          {view === "map" && stateOptions.length > 0 ? (
            <div className="space-y-2 flex-shrink-0">
              <Label className="text-helper text-muted-foreground">State / Region</Label>
              <MultiSelectFilter
                options={stateOptions}
                value={selectedStates}
                onChange={setSelectedStates}
                placeholder="All states / regions"
                searchPlaceholder="Search states..."
                icon={<MapPin className="h-4 w-4" />}
                className="w-[240px]"
              />
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <SegmentedControl
              ariaLabel="Switch between map view and sub-national breakdown"
              variant="icon"
              value={view}
              onValueChange={setView}
              options={[
                { value: "map", label: "Map View", icon: MapPin },
                { value: "subnational", label: "Sub-national Breakdown", icon: BarChart3 },
              ]}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => exportLocationsXlsx({ activity, validMapLocations: filteredMapLocations, breakdownRows })}
              title="Export to Excel"
              aria-label="Export to Excel"
              disabled={filteredMapLocations.length === 0 && breakdownRows.length === 0}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {view === "map" && (
        <MapStyleProvider>
        <div className="m-0 space-y-6">
          {isLoadingActivityLocations ? (
            <>
              <Skeleton className="h-[640px] w-full rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </>
          ) : filteredMapLocations.length > 0 ? (
            <div className="h-[640px] rounded-md overflow-hidden border border-border">
              <ActivityLocationsMapViewV2
                locations={filteredMapLocations}
                mapCenter={[19.0, 96.5]}
                mapZoom={6}
                activityTitle={activity?.title}
                activityAcronym={activity?.acronym}
                organizationId={activity?.reporting_org_id}
                focusedLocationId={focusedLocationId}
                onMapInstanceReady={(m: any) => { mapInstanceRef.current = m }}
              />
            </div>
          ) : (
            <p className="text-helper text-muted-foreground">No mapped locations for this activity.</p>
          )}
          {!isLoadingActivityLocations && filteredTableLocations.length > 0 && (
            <ActivityLocationsTable locations={filteredTableLocations} onLocationClick={onTableThumbClick} />
          )}
        </div>
        </MapStyleProvider>
        )}

        {view === "subnational" && (
        <div className="m-0">
          {isLoadingSubnational ? (
            <div className="space-y-4">
              <Skeleton className="h-[640px] w-full rounded-md" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ) : (
            /* Read-only render of the same component used in the Activity Editor:
                two-column layout with Sub-national Map on the left and the
                Sub-national Allocation table on the right. canEdit=false hides
                the dropdown / Distribute / Clear All / per-row delete controls
                and disables the percentage inputs. */
            <EnhancedSubnationalBreakdown activityId={activity.id} canEdit={false} />
          )}
        </div>
        )}
      </div>
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
    <Card className="bg-card p-6">
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
  // mini charts. Default to Charts — the visual summary is the more useful
  // first impression, and users can toggle to Tables for the row-level data.
  const [view, setView] = useState<"tables" | "charts">("charts")

  // FinancialAnalyticsTab derives the Period-by-Period Budget vs Actual chart
  // and the Funding Source Breakdown from props (transactions / budgets /
  // planned disbursements). Without these the charts render "No data
  // available" even when the API has rows. Fetch them once at the pane level.
  const [transactions, setTransactions] = useState<any[]>([])
  const [budgets, setBudgets] = useState<any[]>([])
  const [plannedDisbursements, setPlannedDisbursements] = useState<any[]>([])
  useEffect(() => {
    if (!activityId) return
    let cancelled = false
    const safe = (p: Promise<Response>) =>
      p.then((r) => (r.ok ? r.json() : null)).catch(() => null)
    Promise.all([
      safe(apiFetch(`/api/activities/${activityId}/transactions`)),
      safe(apiFetch(`/api/activities/${activityId}/budgets`)),
      safe(apiFetch(`/api/activities/${activityId}/planned-disbursements`)),
    ]).then(([txns, bdgs, pds]) => {
      if (cancelled) return
      setTransactions(Array.isArray(txns) ? txns : txns?.transactions || [])
      setBudgets(Array.isArray(bdgs) ? bdgs : bdgs?.budgets || [])
      setPlannedDisbursements(Array.isArray(pds) ? pds : pds?.disbursements || pds?.plannedDisbursements || [])
    })
    return () => {
      cancelled = true
    }
  }, [activityId])

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <SegmentedControl
          ariaLabel="Switch between tables and charts"
          variant="icon"
          value={view}
          onValueChange={setView}
          options={[
            { value: "tables", label: "Tables", icon: Table2 },
            { value: "charts", label: "Charts", icon: BarChart3 },
          ]}
        />
      </div>

      {view === "tables" && (
      <div className="m-0 space-y-6">
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
      </div>
      )}

      {view === "charts" && (
      <div className="m-0">
        <FinancialAnalyticsTab
          activityId={activityId}
          transactions={transactions}
          budgets={budgets}
          plannedDisbursements={plannedDisbursements}
        />
      </div>
      )}
    </div>
  )
}

function ActivityPeoplePane({ activityId }: { activityId: string }) {
  // Pulls focal points (government + development partner) and other contacts
  // associated with this activity, then renders them as a read-only people
  // directory. The /focal-points endpoint already groups by type, so we just
  // re-shape it for the section list.
  const [govt, setGovt] = useState<any[]>([])
  const [dp, setDp] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activityId) return
    let cancelled = false
    setLoading(true)
    const safe = (p: Promise<Response>) =>
      p.then((r) => (r.ok ? r.json() : null)).catch(() => null)
    Promise.all([
      safe(apiFetch(`/api/activities/${activityId}/focal-points`)),
      safe(apiFetch(`/api/activities/${activityId}/contacts`)),
    ]).then(([fp, cs]) => {
      if (cancelled) return
      setGovt(Array.isArray(fp?.government_focal_points) ? fp.government_focal_points : [])
      setDp(Array.isArray(fp?.development_partner_focal_points) ? fp.development_partner_focal_points : [])
      const list = Array.isArray(cs)
        ? cs
        : Array.isArray(cs?.contacts)
          ? cs.contacts
          : []
      setContacts(list)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [activityId])

  const total = govt.length + dp.length + contacts.length

  return (
    <Card className="bg-card p-6">
      <div className="mb-4 flex flex-col space-y-1.5">
        <h2 className="text-2xl font-semibold leading-none tracking-tight text-foreground">People</h2>
        <p className="text-body text-muted-foreground">
          Focal points and other contacts associated with this activity
        </p>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <p className="text-helper text-muted-foreground">No people recorded for this activity yet.</p>
      ) : (
        <div className="space-y-6">
          <PeopleSection title="Government Focal Points" people={govt} emptyHint="No government focal point assigned." />
          <PeopleSection title="Development Partner Focal Points" people={dp} emptyHint="No development partner focal point assigned." />
          <PeopleSection title="Other Contacts" people={contacts} emptyHint="No other contacts recorded." showRoleBadge />
        </div>
      )}
    </Card>
  )
}

function PeopleSection({
  title,
  people,
  emptyHint,
  showRoleBadge = false,
}: {
  title: string
  people: any[]
  emptyHint: string
  showRoleBadge?: boolean
}) {
  const formatOrg = (p: any) => {
    const name = p.organization?.name?.trim()
    const acronym = p.organization?.acronym?.trim()
    if (name && acronym && name !== acronym) return `${name} (${acronym})`
    return name || acronym || p.organisation || ""
  }
  return (
    <section>
      <h3 className="text-section-label uppercase text-muted-foreground mb-3 tracking-wide">
        {title}
        <span className="ml-2 text-muted-foreground/70 lowercase tracking-normal">
          ({people.length})
        </span>
      </h3>
      {people.length === 0 ? (
        <p className="text-helper text-muted-foreground">{emptyHint}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                {showRoleBadge && <TableHead className="w-[160px]">Role</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p: any, i: number) => {
                const fullName =
                  p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "—"
                const displayName = p.title ? `${p.title} ${fullName}` : fullName
                const initials = `${(p.first_name || p.name || "?").charAt(0)}${(p.last_name || "").charAt(0)}`.toUpperCase()
                const jobTitle = [p.job_title || p.position, p.department].filter(Boolean).join(" · ")
                const org = formatOrg(p)
                const phone = p.phone || p.telephone || p.phone_number
                return (
                  <TableRow key={p.id ?? `${fullName}-${i}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        {p.avatar_url || p.avatarUrl ? (
                          <img
                            src={p.avatar_url || p.avatarUrl}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover bg-muted"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-muted text-muted-foreground inline-flex items-center justify-center text-[11px] font-medium">
                            {initials || "?"}
                          </span>
                        )}
                        <span>{displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-helper text-muted-foreground">
                      {jobTitle || "—"}
                    </TableCell>
                    <TableCell className="text-helper text-muted-foreground">
                      {org || "—"}
                    </TableCell>
                    <TableCell className="text-helper text-muted-foreground">
                      {p.email ? <EmailCell email={p.email} /> : "—"}
                    </TableCell>
                    <TableCell className="text-helper text-muted-foreground">
                      {phone || "—"}
                    </TableCell>
                    {showRoleBadge && (
                      <TableCell className="text-helper text-muted-foreground">
                        {p.type ? (
                          <span className="inline-flex items-center align-baseline px-2 h-5 text-caption font-medium rounded bg-muted text-foreground border border-border">
                            {String(p.type).replace(/_/g, " ")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}

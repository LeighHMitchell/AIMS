"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Pencil,
  Printer,
  Download,
  Globe,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import {
  ProfileLayout,
  ProfileHero,
  ProfileHeroCompactStrip,
  ProfileTabs,
  type ProfileTabSpec,
  type HeroAccent,
  RailIdentity,
  useShrinkOnScroll,
  type IdentityRow,
} from "@/components/profile"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { apiFetch } from "@/lib/api-fetch"
import { OrganizationOverview } from "@/components/profile/OrganizationOverview"
import { OrganizationFinancesPane } from "@/components/profile/OrganizationFinancesPane"
import { DEFAULT_ORGANIZATION_TYPES } from "@/components/organizations/OrganizationFormContent"
import { OrganizationLocationsSection } from "@/components/profile/OrganizationLocationsSection"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RailBlock } from "@/components/profile/RailBlock"
import { countries as COUNTRY_LIST } from "@/data/countries"
import { isInstitutionalGroup } from "@/data/location-groups"
import { Mail, Phone, Twitter, Facebook, Linkedin, Instagram, Youtube, MapPin, Building2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import Flag from "react-world-flags"
import { getActivityStatusLabel } from "@/lib/activity-status-utils"

// Resolve an ISO-2 country code from a free-text country name. Used by the
// hero pill and the Identity rail to render a flag next to values like
// "Myanmar". Falls back to undefined for institutional groups
// (e.g. "United Nations") which are handled separately.
function findCountryIso2(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const normalized = value.toLowerCase().trim()
  if (isInstitutionalGroup(value)) return undefined
  const upper = value.toUpperCase().trim()
  if (upper.length === 2) {
    const direct = COUNTRY_LIST.find((c) => c.code === upper)
    if (direct) return direct.code
  }
  const byName = COUNTRY_LIST.find((c) => c.name.toLowerCase() === normalized)
  return byName?.code
}

// Render the same flag glyphs the activity editor's "Location Represented"
// field uses: ISO country flags via react-world-flags, dedicated SVG flags
// for the UN and EU institutional groups, and a Building2 icon for any
// other institutional group.
function LocationGlyph({ value, size = "sm" }: { value: string; size?: "sm" | "md" }) {
  const dims = size === "md" ? "h-4 w-6" : "h-3 w-[18px]"
  if (value === "United Nations") {
    return (
      <img
        src="/images/flags/united-nations.svg"
        alt=""
        className={`${dims} object-cover rounded-[2px] shrink-0`}
      />
    )
  }
  if (value === "European Union Institutions") {
    return (
      <img
        src="/images/flags/european-union.svg"
        alt=""
        className={`${dims} object-cover rounded-[2px] shrink-0`}
      />
    )
  }
  if (isInstitutionalGroup(value)) {
    return <Building2 aria-hidden className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
  }
  const iso2 = findCountryIso2(value)
  if (iso2) {
    return <Flag code={iso2} className={`${dims} object-cover rounded-[2px] shrink-0`} />
  }
  return <Globe aria-hidden className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
}

const V2_TABS: ProfileTabSpec[] = [
  { value: "overview", label: "Overview" },
  { value: "activities", label: "Activities" },
  { value: "finances", label: "Finances" },
  { value: "locations", label: "Locations" },
  { value: "partnerships", label: "Partnerships" },
  { value: "documents", label: "Documents" },
  { value: "people", label: "People" },
]

const ALL_TABS = V2_TABS.map((t) => t.value)

// Map common organisation type values onto a hero accent. The set of org types
// reaching this function is varied (free text + IATI codes), so we lower-case
// + substring-match conservatively. Anything unmatched falls through to grey.
function deriveOrgAccent(org: any): HeroAccent {
  const raw = (org?.organisation_type || org?.type || "").toString().toLowerCase()
  if (!raw) return "grey"
  if (raw.includes("multi") || raw.includes("international")) return "teal"
  if (raw.includes("government") || raw.includes("ministry") || raw.includes("public")) return "blue"
  if (raw.includes("ngo") || raw.includes("civil") || raw.includes("foundation")) return "purple"
  if (raw.includes("private") || raw.includes("commercial") || raw.includes("corporate")) return "amber"
  if (raw.includes("academic") || raw.includes("university") || raw.includes("research")) return "sky"
  return "grey"
}

function formatUsdCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `USD ${(value / 1_000_000_000).toFixed(1)}b`
  if (abs >= 1_000_000) return `USD ${(value / 1_000_000).toFixed(1)}m`
  if (abs >= 1_000) return `USD ${(value / 1_000).toFixed(0)}k`
  return `USD ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

// Pane wrapper hoisted to module scope so its component identity is stable
// across re-renders. Inlining as a local function would cause React to remount
// every tab subtree on every render, re-firing all child fetches.
const OrgPane = React.memo(function OrgPane({
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
  organization: any
  activeTab: string
  onTabChange: (tab: string) => void
}

export function OrganizationProfileV2View({ organization, activeTab, onTabChange }: Props) {
  const router = useRouter()
  const accent = deriveOrgAccent(organization)
  // Shrink-on-scroll progress drives both the hero fade and the compact-strip
  // appearance so the org name + IATI ref + actions stay pinned at the top.
  const shrinkProgress = useShrinkOnScroll(200)

  // Pre-mount every tab so switching is instant. Same pattern as the activity
  // profile: hidden tabs sit under display:none but their data fetches still
  // run in the background.
  const [visitedTabs] = useState<Set<string>>(() => new Set(ALL_TABS))

  const orgName = organization?.name?.trim() || ""
  const acronym = organization?.acronym?.trim() || ""
  const heroTitle = orgName && acronym && orgName !== acronym
    ? `${orgName} (${acronym})`
    : orgName || acronym || "Untitled Organisation"

  // Subtitle: "Active in N activities · USD X.Xm disbursed" (skips when both 0)
  const activeCount = Number(organization?.active_project_count ?? 0)
  const disbursed = Number(organization?.total_disbursed_usd ?? 0)
  const heroSubtitle = activeCount > 0 || disbursed > 0 ? (
    <span className="inline-flex items-center gap-2 font-bold">
      {activeCount > 0 && (
        <>Active in {activeCount} {activeCount === 1 ? "activity" : "activities"}</>
      )}
      {activeCount > 0 && disbursed > 0 && <span className="opacity-60">·</span>}
      {disbursed > 0 && <>{formatUsdCompact(disbursed)} disbursed</>}
    </span>
  ) : null

  // Hero prefix badges: IATI org id + country pill (click-to-copy on the IATI id)
  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`, { description: value })
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  const heroPrefix = (
    <>
      {organization?.iati_org_id && (
        <button
          type="button"
          onClick={() => copyText("IATI Org ID", organization.iati_org_id)}
          title="Click to copy IATI Org ID"
          className="inline-flex items-center h-7 rounded bg-white/90 px-2.5 text-[11px] text-foreground shadow-sm transition hover:bg-white"
        >
          <code className="font-mono">{organization.iati_org_id}</code>
        </button>
      )}
      {organization?.country_represented && (
        <span className="inline-flex items-center h-7 rounded bg-white/90 px-2.5 text-[11px] text-foreground shadow-sm tracking-wide font-medium gap-1.5">
          <LocationGlyph value={organization.country_represented} />
          {organization.country_represented}
        </span>
      )}
    </>
  )

  // Bookmark
  const [isBookmarked, setIsBookmarked] = useState(false)
  useEffect(() => {
    if (!organization?.id) return
    try {
      const raw = localStorage.getItem("aims_bookmarked_orgs")
      const set = new Set<string>(raw ? JSON.parse(raw) : [])
      setIsBookmarked(set.has(organization.id))
    } catch {
      // ignore
    }
  }, [organization?.id])
  const toggleBookmark = () => {
    if (!organization?.id) return
    try {
      const raw = localStorage.getItem("aims_bookmarked_orgs")
      const set = new Set<string>(raw ? JSON.parse(raw) : [])
      if (set.has(organization.id)) set.delete(organization.id)
      else set.add(organization.id)
      localStorage.setItem("aims_bookmarked_orgs", JSON.stringify([...set]))
      setIsBookmarked(set.has(organization.id))
    } catch {
      // ignore
    }
  }

  const handlePrint = () => window.print()
  const handleExportCsv = () => {
    if (!organization) return
    const rows = [
      ["Name", organization.name || ""],
      ["Acronym", organization.acronym || ""],
      ["Organisation Type", organization.organisation_type || organization.type || ""],
      ["Country", organization.country_represented || organization.country || ""],
      ["IATI Org ID", organization.iati_org_id || ""],
      ["Website", organization.website || ""],
      ["Active Activities", String(organization.active_project_count ?? 0)],
      ["Total Disbursed (USD)", String(organization.total_disbursed_usd ?? 0)],
    ]
    const csv = rows.map(([k, v]) => `"${k}","${String(v).replace(/"/g, '""')}"`).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(organization.iati_org_id || organization.id || "organization").replace(/[^a-z0-9_-]+/gi, "_")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const heroActions = (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-slate-900 bg-slate-200 hover:bg-slate-300 hover:text-slate-900"
        onClick={toggleBookmark}
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
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Link
        href={`/organizations/${organization.id}/edit`}
        className="ml-1 inline-flex items-center h-9 rounded-md bg-white/95 px-3 text-[13px] font-medium text-foreground hover:bg-white transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 mr-1.5" />
        Edit
      </Link>
    </>
  )

  const breadcrumb = (
    <button
      type="button"
      onClick={() => router.push("/organizations")}
      className="inline-flex items-center gap-1.5 h-9 text-slate-900 text-[12px] px-3 rounded-md bg-slate-200 hover:bg-slate-300 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      All organisations
    </button>
  )

  // Identity rail content
  const residencyLabel = (() => {
    const raw = (organization?.residency_status ?? "").toString().toLowerCase().trim()
    if (raw === "resident" || raw === "1") return "Resident"
    if (raw === "non-resident" || raw === "non_resident" || raw === "2") return "Non-Resident"
    return null
  })()

  const identityRows: IdentityRow[] = [
    ...(organization?.country_represented
      ? [
          {
            label: "Locations Represented",
            value: (
              <span className="inline-flex items-center gap-1.5">
                <LocationGlyph value={organization.country_represented} size="md" />
                <span>{organization.country_represented}</span>
              </span>
            ),
          },
        ]
      : []),
    ...(residencyLabel
      ? [
          {
            label: "Residency",
            value: (
              <span className="inline-flex items-center h-6 px-2 rounded bg-muted text-muted-foreground text-helper font-medium">
                {residencyLabel}
              </span>
            ),
          },
        ]
      : []),
    ...((() => {
      // Org type is stored as an IATI numeric code ("40"). Resolve to the
      // human label via the same source the editor uses so the displayed
      // value stays consistent.
      const code = (organization?.organisation_type ?? organization?.type ?? "")
        .toString()
        .trim()
      if (!code) return []
      const match = DEFAULT_ORGANIZATION_TYPES.find((t) => t.code === code)
      const label = match?.label ?? null
      return [
        {
          label: "Type",
          value: (
            <span className="inline-flex items-center gap-1.5">
              <code className="font-mono text-helper bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                {code}
              </code>
              {label && <span>{label}</span>}
            </span>
          ),
        },
      ]
    })()),
  ]

  const rail = (
    <>
      {/* p-6 matches the About card's padding so the "Identity" header sits
          at the same Y as the "About" header rather than ~8px higher. */}
      <RailIdentity rows={identityRows} className="p-6" />
      <RailContactInformation organization={organization} />
    </>
  )

  const tabs = (
    <ProfileTabs tabs={V2_TABS} activeTab={activeTab} onChange={onTabChange} />
  )

  // Pane wrapper is defined at module scope (see OrgPane below). Inlining it
  // here would create a new component identity on every render, forcing React
  // to remount the entire subtree — and re-fire every child fetch — on every
  // tab click. See the matching note in ActivityProfileV2View.

  const main = (
    <>
      <OrgPane tab="overview" activeTab={activeTab} visitedTabs={visitedTabs}>
        <OrganizationOverview organization={organization} />
      </OrgPane>

      <OrgPane tab="activities" activeTab={activeTab} visitedTabs={visitedTabs}>
        <OrganizationActivitiesTab organizationId={organization.id} />
      </OrgPane>

      <OrgPane tab="finances" activeTab={activeTab} visitedTabs={visitedTabs}>
        <OrganizationFinancesPane organizationId={organization.id} />
      </OrgPane>

      <OrgPane tab="locations" activeTab={activeTab} visitedTabs={visitedTabs}>
        <OrganizationLocationsSection organizationId={organization.id} />
      </OrgPane>

      <OrgPane tab="partnerships" activeTab={activeTab} visitedTabs={visitedTabs}>
        <OrganizationPartnershipsTab organizationId={organization.id} />
      </OrgPane>

      <OrgPane tab="documents" activeTab={activeTab} visitedTabs={visitedTabs}>
        <OrganizationDocumentsTab organizationId={organization.id} />
      </OrgPane>

      <OrgPane tab="people" activeTab={activeTab} visitedTabs={visitedTabs}>
        <OrganizationPeopleTab organizationId={organization.id} />
      </OrgPane>
    </>
  )

  // ── Compact strip pieces ────────────────────────────────────────────────
  const compactBreadcrumb = (
    <button
      type="button"
      onClick={() => router.push("/organizations")}
      className="inline-flex items-center justify-center h-8 w-8 text-foreground rounded-md hover:bg-muted transition-colors"
      title="All organisations"
      aria-label="All organisations"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  )
  // Title in the strip is a button that scrolls the main container back to
  // the top — re-using the same scroll-root detection the shrink hook uses.
  const scrollToTop = () => {
    if (typeof window === "undefined") return
    const main = document.querySelector("main")
    const overflowY = main ? window.getComputedStyle(main).overflowY : ""
    if (main && (overflowY === "auto" || overflowY === "scroll")) {
      main.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }
  const compactTitle = (
    <button
      type="button"
      onClick={scrollToTop}
      title="Back to top"
      className="inline-flex items-center h-8 px-2.5 -ml-2.5 rounded-md text-base font-semibold text-foreground hover:bg-muted transition-colors whitespace-nowrap"
    >
      <span className="whitespace-nowrap">{heroTitle}</span>
    </button>
  )
  const compactIds = organization?.iati_org_id ? (
    <button
      type="button"
      onClick={() => copyText("IATI Org ID", organization.iati_org_id)}
      title="Click to copy IATI Org ID"
      className="inline-flex items-center h-7 rounded bg-muted px-2 text-[11px] text-foreground hover:bg-muted/80 transition-colors"
    >
      <code className="font-mono">{organization.iati_org_id}</code>
    </button>
  ) : null
  const compactSubtitle = organization?.country_represented || null
  const compactActions = (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={toggleBookmark}
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
            className="h-8 w-8"
            title="Export"
            aria-label="Export"
          >
            <Download className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  return (
    <ProfileLayout
      hero={
        <ProfileHero
          prefix={heroPrefix}
          title={heroTitle}
          subtitle={heroSubtitle}
          accent={accent}
          imageUrl={organization?.banner ?? null}
          imagePosition={organization?.banner_position ?? 50}
          logoUrl={organization?.logo ?? null}
          actions={heroActions}
          breadcrumb={breadcrumb}
          shrinkProgress={shrinkProgress}
        />
      }
      compactStrip={
        <ProfileHeroCompactStrip
          title={compactTitle}
          subtitle={compactSubtitle}
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

// ---------------------------------------------------------------------------
// Tab content placeholders / lightweight wrappers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Contact Information rail block — sits below the Identity card on the
// Overview tab. Shows email / phone / website / mailing address as a tidy list,
// and renders any populated social media URLs as icon-only link buttons.
// ---------------------------------------------------------------------------
function RailContactInformation({ organization }: { organization: any }) {
  const email = organization?.email?.trim()
  const phone = organization?.phone?.trim()
  const website = organization?.website?.trim()
  const address = organization?.address?.trim()

  // Each social entry pairs the icon with the org field key. Filter to only
  // those with a value so we don't render empty placeholder buttons.
  const socials: Array<{ key: string; label: string; href: string; Icon: any }> = (
    [
      { key: "twitter", label: "Twitter / X", url: organization?.twitter, Icon: Twitter },
      { key: "facebook", label: "Facebook", url: organization?.facebook, Icon: Facebook },
      { key: "linkedin", label: "LinkedIn", url: organization?.linkedin, Icon: Linkedin },
      { key: "instagram", label: "Instagram", url: organization?.instagram, Icon: Instagram },
      { key: "youtube", label: "YouTube", url: organization?.youtube, Icon: Youtube },
    ] as const
  )
    .filter((s) => typeof s.url === "string" && s.url.trim().length > 0)
    .map((s) => ({
      key: s.key,
      label: s.label,
      href: s.url!.startsWith("http") ? s.url! : `https://${s.url}`,
      Icon: s.Icon,
    }))

  if (!email && !phone && !website && !address && socials.length === 0) {
    return null
  }

  return (
    <RailBlock
      label="Contact Information"
      helpText="Public contact details for this organisation, drawn from the organisation editor."
      className="p-6"
    >
      <dl className="space-y-2.5">
        {email && (
          <div className="grid grid-cols-[28px_1fr] gap-2 items-start">
            <dt className="pt-0.5 text-muted-foreground"><Mail className="h-4 w-4" /></dt>
            <dd className="text-foreground min-w-0 break-words">
              <a href={`mailto:${email}`} className="hover:underline">{email}</a>
            </dd>
          </div>
        )}
        {phone && (
          <div className="grid grid-cols-[28px_1fr] gap-2 items-start">
            <dt className="pt-0.5 text-muted-foreground"><Phone className="h-4 w-4" /></dt>
            <dd className="text-foreground min-w-0 break-words">
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:underline">{phone}</a>
            </dd>
          </div>
        )}
        {website && (
          <div className="grid grid-cols-[28px_1fr] gap-2 items-start">
            <dt className="pt-0.5 text-muted-foreground"><Globe className="h-4 w-4" /></dt>
            <dd className="text-foreground min-w-0 break-words">
              <a
                href={website.startsWith("http") ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                <span className="truncate">{website.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </dd>
          </div>
        )}
        {address && (
          <div className="grid grid-cols-[28px_1fr] gap-2 items-start">
            <dt className="pt-0.5 text-muted-foreground"><MapPin className="h-4 w-4" /></dt>
            <dd className="text-foreground min-w-0 break-words whitespace-pre-line">{address}</dd>
          </div>
        )}
      </dl>

      {socials.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap gap-2">
          {socials.map(({ key, label, href, Icon }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={label}
              aria-label={label}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted/40"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
      )}
    </RailBlock>
  )
}

// Strip HTML tags + collapse whitespace so the description excerpt renders
// cleanly inside the table row even when the source is IATI rich text.
function stripHtml(input: string | null | undefined): string {
  if (!input) return ""
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}

type ActivitiesSortField = "title" | "status" | "updated"

function OrganizationActivitiesTab({ organizationId }: { organizationId: string }) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<ActivitiesSortField>("updated")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiFetch(`/api/activities?organization_id=${organizationId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : data?.activities || []
        setActivities(list)
      })
      .catch(() => {
        if (!cancelled) setActivities([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [organizationId])

  const sorted = React.useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1
    const arr = [...activities]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "title":
          cmp = (a.title_narrative || a.title || "").localeCompare(b.title_narrative || b.title || "")
          break
        case "status":
          cmp = getActivityStatusLabel(a.activity_status).localeCompare(getActivityStatusLabel(b.activity_status))
          break
        case "updated":
          cmp = new Date(a.updated_at || a.created_at || 0).getTime() - new Date(b.updated_at || b.created_at || 0).getTime()
          break
      }
      return cmp * dir
    })
    return arr
  }, [activities, sortField, sortDir])

  const toggleSort = (field: ActivitiesSortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir(field === "updated" ? "desc" : "asc")
    }
  }

  const sortIcon = (field: ActivitiesSortField) =>
    sortField === field ? (
      sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
    ) : (
      <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
    )

  if (loading) {
    return (
      <Card className="border-border bg-card p-6">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card className="border-border bg-card p-8 text-center">
        <p className="text-helper text-muted-foreground">No activities found for this organisation.</p>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card p-6">
      <div className="mb-4 flex flex-col space-y-1.5">
        <h2 className="text-2xl font-semibold leading-none tracking-tight text-foreground">Activities</h2>
        <p className="text-body text-muted-foreground">
          {activities.length} {activities.length === 1 ? "activity" : "activities"} reported by or contributed to this organisation
        </p>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => toggleSort("title")}
              >
                <div className="flex items-center gap-1">
                  Activity
                  {sortIcon("title")}
                </div>
              </TableHead>
              <TableHead
                className="w-[160px] cursor-pointer hover:bg-muted/30"
                onClick={() => toggleSort("status")}
              >
                <div className="flex items-center gap-1">
                  Status
                  {sortIcon("status")}
                </div>
              </TableHead>
              <TableHead
                className="w-[140px] text-right cursor-pointer hover:bg-muted/30"
                onClick={() => toggleSort("updated")}
              >
                <div className="flex items-center justify-end gap-1">
                  Last Updated
                  {sortIcon("updated")}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((a: any) => {
              const title = a.title_narrative || a.title || "Untitled activity"
              const iati = a.iati_identifier || a.iati_id
              const description = stripHtml(a.description_narrative || a.description)
              const updated = a.updated_at || a.created_at
              return (
                <TableRow
                  key={a.id}
                  className="align-top hover:bg-muted/30"
                >
                  <TableCell className="py-3">
                    <Link
                      href={`/activities/${a.id}`}
                      className="font-medium text-foreground hover:underline block leading-snug"
                    >
                      {title}
                      {a.acronym && (
                        <span className="text-muted-foreground font-normal ml-1.5">({a.acronym})</span>
                      )}
                    </Link>
                    {iati && (
                      <div className="text-helper text-muted-foreground font-mono mt-0.5">
                        {iati}
                      </div>
                    )}
                    {description && (
                      <p className="text-helper text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                        {description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-helper text-muted-foreground whitespace-nowrap">
                    {getActivityStatusLabel(a.activity_status) || "—"}
                  </TableCell>
                  <TableCell className="py-3 text-right text-helper text-muted-foreground whitespace-nowrap">
                    {updated
                      ? new Date(updated).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

function OrganizationPartnershipsTab({ organizationId }: { organizationId: string }) {
  // Lean placeholder — pulls a list of partner organisations via the
  // contributors endpoint and shows them as a simple link list. The legacy
  // page's full PartnershipNetwork visualisation can be folded back in later.
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiFetch(`/api/organizations/${organizationId}/partners`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return
        setPartners(Array.isArray(data) ? data : data?.partners || [])
      })
      .catch(() => {
        if (!cancelled) setPartners([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [organizationId])

  return (
    <Card className="border-border bg-card p-6">
      <div className="mb-4 flex flex-col space-y-1.5">
        <h2 className="text-2xl font-semibold leading-none tracking-tight text-foreground">Partnerships</h2>
        <p className="text-body text-muted-foreground">
          Organisations this organisation works with across shared activities
        </p>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      ) : partners.length === 0 ? (
        <p className="text-helper text-muted-foreground">No partner organisations recorded.</p>
      ) : (
        <div className="rounded-md border divide-y">
          {partners.map((p: any) => (
            <Link
              key={p.id}
              href={`/organizations/${p.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {p.name || "Unnamed organisation"}
                  {p.acronym && p.acronym !== p.name && (
                    <span className="text-muted-foreground ml-1.5">({p.acronym})</span>
                  )}
                </div>
                {p.organisation_type && (
                  <div className="text-helper text-muted-foreground">{p.organisation_type}</div>
                )}
              </div>
              {p.shared_activities != null && (
                <span className="text-helper text-muted-foreground shrink-0">
                  {p.shared_activities} shared {p.shared_activities === 1 ? "activity" : "activities"}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

interface OrgPerson {
  id: string
  name: string
  email?: string | null
  avatarUrl?: string | null
  jobTitle?: string | null
  department?: string | null
  phone?: string | null
  role?: string | null
  source: "user" | "contact"
}

function OrganizationPeopleTab({ organizationId }: { organizationId: string }) {
  const [people, setPeople] = useState<OrgPerson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      apiFetch(`/api/organizations/${organizationId}/users`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      apiFetch(`/api/organizations/${organizationId}/contacts`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([users, contacts]) => {
        if (cancelled) return
        const userPeople: OrgPerson[] = (Array.isArray(users) ? users : []).map((u: any) => ({
          id: `user-${u.id}`,
          name: u.full_name || u.email || "Unnamed user",
          email: u.email,
          avatarUrl: u.avatar_url,
          jobTitle: u.job_title,
          department: u.department,
          phone: u.telephone,
          role: u.contact_type ? `User · ${u.contact_type}` : "User",
          source: "user",
        }))
        const contactPeople: OrgPerson[] = (Array.isArray(contacts) ? contacts : []).map((c: any) => {
          const fullName = [c.title, c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ").trim()
          return {
            id: `contact-${c.id}`,
            name: fullName || c.email || "Unnamed contact",
            email: c.email,
            avatarUrl: c.profilePhoto || c.linkedUser?.avatarUrl,
            jobTitle: c.jobTitle,
            department: c.department,
            phone: c.phoneNumber || c.phone,
            role: c.isPrimary ? "Primary contact" : "Contact",
            source: "contact",
          }
        })
        // Merge and dedupe by email when present.
        const byEmail = new Map<string, OrgPerson>()
        const out: OrgPerson[] = []
        for (const p of [...userPeople, ...contactPeople]) {
          const key = (p.email || "").toLowerCase()
          if (key && byEmail.has(key)) continue
          if (key) byEmail.set(key, p)
          out.push(p)
        }
        out.sort((a, b) => a.name.localeCompare(b.name))
        setPeople(out)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [organizationId])

  return (
    <Card className="border-border bg-card p-6">
      <div className="mb-4 flex flex-col space-y-1.5">
        <h2 className="text-2xl font-semibold leading-none tracking-tight text-foreground">People</h2>
        <p className="text-body text-muted-foreground">
          Users and contacts associated with this organisation
        </p>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <p className="text-helper text-muted-foreground">No people recorded for this organisation.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-[160px]">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      {p.avatarUrl ? (
                        <img
                          src={p.avatarUrl}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover bg-muted"
                        />
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-muted text-muted-foreground inline-flex items-center justify-center text-[11px] font-medium">
                          {p.name
                            .split(/\s+/)
                            .map((s) => s[0])
                            .filter(Boolean)
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                      )}
                      <span>{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-helper text-muted-foreground">
                    {[p.jobTitle, p.department].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-helper text-muted-foreground">
                    {p.email ? (
                      <a href={`mailto:${p.email}`} className="hover:underline">
                        {p.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-helper text-muted-foreground">{p.phone || "—"}</TableCell>
                  <TableCell className="text-helper text-muted-foreground">{p.role || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}

function OrganizationDocumentsTab({ organizationId }: { organizationId: string }) {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiFetch(`/api/organizations/${organizationId}/documents`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return
        setDocuments(Array.isArray(data) ? data : data?.documents || [])
      })
      .catch(() => {
        if (!cancelled) setDocuments([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [organizationId])

  return (
    <Card className="border-border bg-card p-6">
      <div className="mb-4 flex flex-col space-y-1.5">
        <h2 className="text-2xl font-semibold leading-none tracking-tight text-foreground">Documents</h2>
        <p className="text-body text-muted-foreground">
          Reports, policies and other documents published by this organisation
        </p>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8">
          <img src="/images/empty-bookshelf.webp" alt="No documents" className="h-32 mx-auto mb-4 opacity-80" />
          <p className="text-helper text-muted-foreground">No documents recorded for this organisation.</p>
        </div>
      ) : (
        <div className="rounded-md border divide-y">
          {documents.map((d: any) => (
            <a
              key={d.id}
              href={d.url || d.file_url || d.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {d.title || d.file_name || d.url}
                </div>
                {d.description && (
                  <div className="text-helper text-muted-foreground truncate">{d.description}</div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </Card>
  )
}

export default OrganizationProfileV2View

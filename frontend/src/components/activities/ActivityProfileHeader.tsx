"use client"

import React, { useState, useRef } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SafeHtml } from "@/components/ui/safe-html"
import { SDGImageGrid } from "@/components/ui/SDGImageGrid"
import { ActivityVote } from "@/components/ui/activity-vote"
import { BannerUpload } from "@/components/BannerUpload"
import { IconUpload } from "@/components/IconUpload"
import { CommentsDrawer } from "@/components/activities/CommentsDrawer"
import { AllDatesHistory } from "@/components/activities/AllDatesHistory"
import { NormalizedOrgRef } from "@/components/ui/normalized-org-ref"
import { CodelistTooltip } from "@/components/ui/codelist-tooltip"
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { getActivityStatusDisplay } from "@/lib/activity-status-utils"
import { apiFetch } from "@/lib/api-fetch"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowLeft,
  Pencil,
  Download,
  Upload,
  ImageIcon,
  Globe,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Copy,
  Check,
  Eye,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Printer,
  FileCode,
  Calendar,
  Info,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react"
import { IATI_ACTIVITY_SCOPE } from "@/data/iati-activity-scope"
import { getCollaborationTypeByCode } from "@/data/iati-collaboration-types"

// ── Types ──────────────────────────────────────────────────────────────────

interface ActivityData {
  id: string
  partnerId: string
  iatiId: string
  title: string
  acronym?: string
  description: string
  descriptionObjectives?: string
  descriptionTargetGroups?: string
  descriptionOther?: string
  created_by_org_name: string
  created_by_org_acronym: string
  collaborationType: string
  banner?: string
  bannerPosition?: number
  icon?: string
  iconScale?: number
  activityStatus: string
  publicationStatus: string
  humanitarian?: boolean
  iatiIdentifier?: string
  autoSync?: boolean
  lastSyncTime?: string
  syncStatus?: "live" | "pending" | "outdated"
  plannedStartDate?: string
  plannedStartDescription?: string
  plannedEndDate?: string
  plannedEndDescription?: string
  actualStartDate?: string
  actualStartDescription?: string
  actualEndDate?: string
  actualEndDescription?: string
  createdAt: string
  updatedAt: string
  customDates?: Array<{ label: string; date: string; description: string }>
  // Classification (collapsed by default)
  defaultAidType?: string
  defaultFinanceType?: string
  defaultFlowType?: string
  defaultTiedStatus?: string
  activityScope?: string
  hierarchy?: number
  tags?: any[]
  auto_ref?: string
  iati_id?: string
  sdgMappings?: any[]
  policyMarkers?: any[]
}

interface Props {
  activity: ActivityData
  banner: string | null
  bannerPosition: number
  localIcon: string | null
  reportingOrg: any
  participatingOrgs: any[]
  countryAllocations: any[]
  regionAllocations: any[]
  sdgMappings: any[]
  // Callbacks
  onBannerChange: (banner: string | null, position?: number) => void
  onIconChange: (icon: string | null) => void
  onNavigateBack: () => void
  // User state
  user: any
  isBookmarked: boolean
  onToggleBookmark: () => void
  isToggling: boolean
  viewCount: number | null
  // Copy clipboard
  copiedId: string | null
  onCopyToClipboard: (text: string, type: "activityId" | "iatiIdentifier" | "activityTitle") => void
  // Export handlers
  onPrintPDF: () => void
  onExportCSV: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

const HIERARCHY_LEVELS: Record<number, string> = {
  1: "Top-level Program",
  2: "Sub-program",
  3: "Project",
  4: "Sub-component",
  5: "Task/Output",
}

const AID_TYPE_LABELS: Record<string, string> = {
  A01: "General budget support",
  A02: "Sector budget support",
  B01: "Core support to NGOs",
  B02: "Core contributions to multilateral institutions",
  B03: "Contributions to pooled programmes and funds",
  B04: "Basket funds/pooled funding",
  C01: "Project-type interventions",
  D01: "Donor country personnel",
  D02: "Other technical assistance",
  E01: "Scholarships/training in donor country",
  E02: "Imputed student costs",
  F01: "Debt relief",
  G01: "Administrative costs",
  H01: "Development awareness",
  H02: "Refugees in donor countries",
}

const FLOW_TYPE_LABELS: Record<string, string> = {
  "10": "Official Development Assistance",
  "20": "Other Official Flows",
  "30": "Private grants",
  "35": "Private market",
  "40": "Non flow",
  "50": "Other flows",
}

const FINANCE_TYPE_LABELS: Record<string, string> = {
  "110": "Standard grant",
  "210": "Interest subsidy",
  "310": "Capital subscription (deposit)",
  "410": "Aid loan",
  "421": "Standard loan",
  "422": "Reimbursable grant",
  "510": "Bonds",
}

const TIED_STATUS_LABELS: Record<string, string> = {
  "3": "Partially tied",
  "4": "Tied",
  "5": "Untied",
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return "Not set"
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Not set"
    return format(date, "dd MMM yyyy")
  } catch {
    return "Not set"
  }
}

function getActivityScopeLabel(code: string | undefined): string | null {
  if (!code) return null
  for (const group of IATI_ACTIVITY_SCOPE) {
    const scope = group.types.find((s: any) => s.code === code)
    if (scope) return scope.name
  }
  return null
}

// ── Component ──────────────────────────────────────────────────────────────

export function ActivityProfileHeader({
  activity,
  banner,
  bannerPosition,
  localIcon,
  reportingOrg,
  participatingOrgs,
  countryAllocations,
  regionAllocations,
  sdgMappings,
  onBannerChange,
  onIconChange,
  onNavigateBack,
  user,
  isBookmarked: bookmarked,
  onToggleBookmark,
  isToggling,
  viewCount,
  copiedId,
  onCopyToClipboard,
  onPrintPDF,
  onExportCSV,
}: Props) {
  const [showEditBanner, setShowEditBanner] = useState(false)
  const [showEditIcon, setShowEditIcon] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [showAllPartners, setShowAllPartners] = useState(false)
  const descriptionRef = useRef<HTMLDivElement>(null)

  const icon = activity.icon || localIcon
  const { label: statusLabel, className: statusClassName } = getActivityStatusDisplay(activity.activityStatus)

  // Check if description needs truncation
  const description = activity.description || ""
  const objectives = activity.descriptionObjectives || ""
  const targetGroups = activity.descriptionTargetGroups || ""
  const other = activity.descriptionOther || ""
  const combinedLength = description.length + objectives.length + targetGroups.length + other.length
  const needsShowMore = combinedLength > 500

  // Classification fields (for technical details disclosure)
  const hasTechnicalDetails = !!(
    activity.hierarchy ||
    activity.collaborationType ||
    activity.defaultAidType ||
    activity.defaultFinanceType ||
    activity.defaultFlowType ||
    activity.defaultTiedStatus ||
    activity.activityScope
  )

  // Date display helper — shows date with optional tooltip description
  const DateItem = ({
    label,
    date,
    desc,
  }: {
    label: string
    date?: string
    desc?: string
  }) => (
    <span className="inline-flex items-center gap-1 text-helper text-muted-foreground">
      <span>{label}:</span>
      <span className="font-medium text-foreground">{formatDate(date)}</span>
      {desc && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{desc}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </span>
  )

  return (
    <div className="space-y-0">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={onNavigateBack}
          className="text-muted-foreground hover:text-foreground hover:bg-muted -ml-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Activities
        </Button>

        <div className="flex items-center gap-1">
          {/* Engagement indicators — quiet, inline */}
          {viewCount != null && viewCount > 0 && (
            <span className="inline-flex items-center gap-1 text-helper text-muted-foreground tabular-nums px-2">
              <Eye className="h-3.5 w-3.5" />
              {viewCount}
            </span>
          )}
          <div className="inline-flex items-center rounded-md px-1 h-8">
            <ActivityVote activityId={activity.id} userId={user?.id} size="sm" variant="horizontal" />
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Primary quick actions — kept visible as icon-only buttons */}
          <CommentsDrawer activityId={activity.id}>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-8 w-8"
              title="Comments"
              aria-label="Comments"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </CommentsDrawer>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground h-8 w-8"
            onClick={onToggleBookmark}
            disabled={isToggling}
            title={bookmarked ? "Saved" : "Save"}
            aria-label={bookmarked ? "Saved" : "Save"}
          >
            {bookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-foreground" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>

          {/* Overflow — everything else lives here */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-8 w-8"
                title="More actions"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {!banner && (
                <DropdownMenuItem onClick={() => setShowEditBanner(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Add banner image
                </DropdownMenuItem>
              )}
              {!icon && (
                <DropdownMenuItem onClick={() => setShowEditIcon(true)}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Add logo
                </DropdownMenuItem>
              )}
              {(!banner || !icon) && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={onPrintPDF}>
                <Printer className="h-4 w-4 mr-2" />
                Print as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
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
                <FileCode className="h-4 w-4 mr-2" />
                Export IATI XML
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-border mx-1" />

          <Link
            href={`/activities/new?id=${activity.id}`}
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-body font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Link>
        </div>
      </div>

      {/* ── Upload Modals ───────────────────────────────────────────── */}
      <Dialog open={showEditBanner} onOpenChange={setShowEditBanner}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
            <DialogTitle>Add Banner Image</DialogTitle>
            <DialogDescription>Recommended size: 1200 x 400px</DialogDescription>
          </DialogHeader>
          <BannerUpload
            currentBanner={banner || undefined}
            currentPosition={bannerPosition}
            onBannerChange={(b, p) => {
              onBannerChange(b, p)
              setShowEditBanner(false)
            }}
            activityId={activity.id}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showEditIcon} onOpenChange={setShowEditIcon}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
            <DialogTitle>Add Icon / Logo</DialogTitle>
            <DialogDescription>Recommended size: 512 x 512px</DialogDescription>
          </DialogHeader>
          <IconUpload
            currentIcon={icon || undefined}
            onIconChange={onIconChange}
            activityId={activity.id}
          />
        </DialogContent>
      </Dialog>

      {/* ── Banner ──────────────────────────────────────────────────── */}
      {banner && (
        <div className="w-full h-64 rounded-lg overflow-hidden relative">
          <img
            src={banner}
            alt={`${activity.title} banner`}
            className="w-full h-full object-cover"
            style={{ objectPosition: `center ${bannerPosition}%` }}
          />
          {/* Subtle scrim at bottom so content reads over the banner edge */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />
        </div>
      )}

      {/* ── Identity Row ────────────────────────────────────────────── */}
      <div className={cn("px-1", banner ? "-mt-14 relative z-10" : "mt-2")}>
        <div className="flex items-start gap-6">
          {/* Icon — overlaps the banner bottom edge when a banner is present */}
          {icon && (
            <div
              className={cn(
                "flex-shrink-0 rounded-xl overflow-hidden bg-card flex items-center justify-center shadow-md",
                banner ? "w-28 h-28" : "w-20 h-20"
              )}
            >
              <img
                src={icon}
                alt={`${activity.title} icon`}
                className="object-contain"
                style={{
                  width: `${activity.iconScale ?? 100}%`,
                  height: `${activity.iconScale ?? 100}%`,
                  maxWidth: "none",
                  maxHeight: "none",
                }}
              />
            </div>
          )}

          <div className="flex-1 min-w-0 pt-16">
            {/* Title + copy */}
            <div className="group flex items-baseline gap-2 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight leading-[1.1]">
                {activity.title}
                {activity.acronym && (
                  <span className="ml-2"> ({activity.acronym})</span>
                )}
              </h1>
              <button
                onClick={() => onCopyToClipboard(activity.title || "", "activityTitle")}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                title="Copy title"
              >
                {copiedId === "activityTitle" ? (
                  <Check className="w-5 h-5 text-[hsl(var(--success-icon))]" />
                ) : (
                  <Copy className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Subtitle line: reporting org · status · humanitarian */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3">
              {/* Reporting org (publisher) */}
              {reportingOrg && (
                <span className="inline-flex items-center gap-1.5 text-body text-muted-foreground">
                  {reportingOrg.logo && (
                    <img
                      src={reportingOrg.logo}
                      alt=""
                      className="w-4 h-4 rounded object-cover"
                    />
                  )}
                  {reportingOrg.id ? (
                    <Link
                      href={`/organizations/${reportingOrg.id}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {reportingOrg.acronym || reportingOrg.name}
                    </Link>
                  ) : (
                    <span>{reportingOrg.acronym || reportingOrg.name}</span>
                  )}
                </span>
              )}

              {reportingOrg && <div className="h-3.5 w-px bg-border" />}

              {/* Activity status */}
              <Badge className={cn(statusClassName, "text-helper")}>{statusLabel}</Badge>

              {/* Publication status */}
              {activity.publicationStatus && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-helper",
                    activity.publicationStatus === "published"
                      ? "border-[hsl(var(--success-icon))]/30 text-[hsl(var(--success-icon))]"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {activity.publicationStatus === "published" ? "Published" : "Unpublished"}
                </Badge>
              )}

              {/* IATI sync */}
              {activity.iatiIdentifier && activity.autoSync && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-helper border-border text-muted-foreground">
                        {activity.syncStatus === "live" ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 text-[hsl(var(--success-icon))]" />
                            Synced
                          </>
                        ) : activity.syncStatus === "outdated" ? (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1 text-yellow-600" />
                            Outdated
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            IATI
                          </>
                        )}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-helper space-y-1">
                        <p className="font-medium">IATI Sync Status</p>
                        {activity.lastSyncTime && (
                          <p>Last synced: {format(new Date(activity.lastSyncTime), "dd MMM yyyy HH:mm")}</p>
                        )}
                        <p className="text-[hsl(var(--success-icon))]">Auto-sync enabled</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* IATI imported (not auto-synced) */}
              {activity.iatiIdentifier && !activity.autoSync && (
                <Badge className="text-helper bg-[#124e5f] text-white hover:bg-[#0d3a47]">
                  <Globe className="h-3 w-3 mr-1" />
                  Imported from IATI
                </Badge>
              )}

              {/* Humanitarian */}
              {activity.humanitarian && (
                <Badge className="text-helper bg-destructive text-white hover:bg-destructive">Humanitarian</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Metadata Strip ──────────────────────────────────────────── */}
      <div className="mt-8 pb-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {/* IDs */}
          {(activity as any).auto_ref && (
            <span className="inline-flex items-center gap-1 group text-helper">
              <code className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                {(activity as any).auto_ref}
              </code>
              <button
                onClick={() => onCopyToClipboard((activity as any).auto_ref, "activityId")}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedId === "activityId" ? (
                  <Check className="w-3 h-3 text-[hsl(var(--success-icon))]" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
            </span>
          )}
          {activity.partnerId && (
            <span className="inline-flex items-center gap-1 group text-helper">
              <code className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                {activity.partnerId}
              </code>
              <button
                onClick={() => onCopyToClipboard(activity.partnerId, "activityId")}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedId === "activityId" ? (
                  <Check className="w-3 h-3 text-[hsl(var(--success-icon))]" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
            </span>
          )}
          {activity.iatiIdentifier && (
            <span className="inline-flex items-center gap-1 group text-helper">
              <code className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                {activity.iatiIdentifier}
              </code>
              <button
                onClick={() => onCopyToClipboard(activity.iatiIdentifier || "", "iatiIdentifier")}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedId === "iatiIdentifier" ? (
                  <Check className="w-3 h-3 text-[hsl(var(--success-icon))]" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
            </span>
          )}

          {/* Separator */}
          {(activity.partnerId || activity.iatiIdentifier || (activity as any).auto_ref) && (
            <div className="h-3.5 w-px bg-border" />
          )}

          {/* Locations */}
          {countryAllocations.length > 0 && (
            <div className="flex items-center gap-1.5">
              {countryAllocations.slice(0, 4).map((ca: any) => (
                <span key={ca.id || ca.country?.code} className="inline-flex items-center gap-1 text-helper text-foreground">
                  <img
                    src={`https://flagcdn.com/w20/${(ca.country?.code || "").toLowerCase()}.png`}
                    alt=""
                    className="w-4 h-3 object-cover rounded-sm"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                  {ca.country?.name || ca.country?.code}
                </span>
              ))}
              {countryAllocations.length > 4 && (
                <span className="text-helper text-muted-foreground">+{countryAllocations.length - 4} more</span>
              )}
            </div>
          )}

          {regionAllocations.length > 0 && (
            <div className="flex items-center gap-1.5">
              {regionAllocations.slice(0, 3).map((ra: any) => (
                <Badge key={ra.id || ra.region?.code} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {ra.region?.name || ra.region?.code}
                </Badge>
              ))}
            </div>
          )}

          {(countryAllocations.length > 0 || regionAllocations.length > 0) && <div className="h-3.5 w-px bg-border" />}

          {/* Active date range — one compact label */}
          <span className="inline-flex items-center gap-1.5 text-helper text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className="font-medium text-foreground">
              {formatDate(activity.actualStartDate || activity.plannedStartDate)}
            </span>
            <span className="text-muted-foreground/60">→</span>
            <span className="font-medium text-foreground">
              {formatDate(activity.actualEndDate || activity.plannedEndDate)}
            </span>
            <AllDatesHistory
              activityId={activity.id}
              dates={{
                plannedStartDate: activity.plannedStartDate ?? null,
                plannedEndDate: activity.plannedEndDate ?? null,
                actualStartDate: activity.actualStartDate ?? null,
                actualEndDate: activity.actualEndDate ?? null,
              }}
              customDates={activity.customDates}
            />
          </span>

          <div className="h-3.5 w-px bg-border" />

          <span className="text-helper text-muted-foreground">
            Updated <span className="font-medium text-foreground">{formatDate(activity.updatedAt)}</span>
          </span>
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────────────── */}
      {(description || objectives || targetGroups || other) && (
        <div className="mt-12 pt-10 border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12 gap-y-8">
            {/* Description content — spans 2 columns */}
            <div className="lg:col-span-2">
              <div
                ref={descriptionRef}
                className={cn("relative", !isDescriptionExpanded && needsShowMore && "line-clamp-[8]")}
              >
                {description && (
                  <SafeHtml html={description} level="rich" className="text-foreground/85 leading-relaxed text-[15px]" />
                )}
                {objectives && (
                  <div className="mt-5 pt-5 border-t border-border">
                    <h3 className="text-body font-semibold text-foreground mb-2">Objectives</h3>
                    <SafeHtml html={objectives} level="rich" className="text-foreground/85 leading-relaxed text-[15px]" />
                  </div>
                )}
                {targetGroups && (
                  <div className="mt-5 pt-5 border-t border-border">
                    <h3 className="text-body font-semibold text-foreground mb-2">Target Groups</h3>
                    <SafeHtml
                      html={targetGroups}
                      level="rich"
                      className="text-foreground/85 leading-relaxed text-[15px]"
                    />
                  </div>
                )}
                {other && (
                  <div className="mt-5 pt-5 border-t border-border">
                    <h3 className="text-body font-semibold text-foreground mb-2">Additional Information</h3>
                    <SafeHtml html={other} level="rich" className="text-foreground/85 leading-relaxed text-[15px]" />
                  </div>
                )}
              </div>
              {needsShowMore && (
                <div className="mt-5 mb-2">
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="inline-flex items-center gap-1.5 text-foreground hover:text-foreground/70 text-body font-medium transition-colors underline underline-offset-4 decoration-border hover:decoration-foreground"
                  >
                    {isDescriptionExpanded ? (
                      <>
                        Show less <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Show more <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Right rail — Participating Orgs + SDGs */}
            <div className="lg:col-span-1 lg:pl-8 lg:border-l lg:border-border">
              {/* Participating Orgs */}
              {participatingOrgs.length > 0 && (
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-3">
                    Participating Organisations
                  </h3>
                  <div className="space-y-2.5">
                    {(showAllPartners ? participatingOrgs : participatingOrgs.slice(0, 5)).map((org: any, idx: number) => {
                      const roleColor =
                        org.role_type === "funding" ? "bg-rose-500" :
                        org.role_type === "extending" ? "bg-sky-500" :
                        org.role_type === "implementing" ? "bg-amber-500" :
                        org.role_type === "government" ? "bg-muted0" :
                        "bg-muted-foreground"
                      const roleLabel =
                        org.role_type === "government" ? "Accountable" :
                        org.role_type === "extending" ? "Extending" :
                        org.role_type === "funding" ? "Funding" :
                        org.role_type === "implementing" ? "Implementing" :
                        org.role_type
                      const orgName = org.organization?.acronym || org.organization?.name || org.narrative || "Unknown"
                      return (
                        <div key={idx} className="flex items-center gap-2.5 min-w-0">
                          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", roleColor)} aria-hidden="true" />
                          {org.organization?.logo && (
                            <img src={org.organization.logo} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0 truncate">
                            {org.organization?.id ? (
                              <Link
                                href={`/organizations/${org.organization.id}`}
                                className="text-body text-foreground hover:underline"
                              >
                                {orgName}
                              </Link>
                            ) : (
                              <span className="text-body text-foreground">{orgName}</span>
                            )}
                            <span className="text-helper text-muted-foreground ml-1.5">{roleLabel}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {participatingOrgs.length > 5 && (
                    <button
                      onClick={() => setShowAllPartners(!showAllPartners)}
                      className="text-helper text-muted-foreground hover:text-foreground mt-2 transition-colors"
                    >
                      {showAllPartners ? "Show less" : `+${participatingOrgs.length - 5} more`}
                    </button>
                  )}
                </div>
              )}

              {/* SDG Alignment — compact */}
              {sdgMappings && sdgMappings.length > 0 && (
                <div className={cn(participatingOrgs.length > 0 && "mt-6")}>
                  <h3 className="text-body font-semibold text-foreground mb-3">
                    SDG Alignment
                  </h3>
                  <SDGImageGrid
                    sdgCodes={sdgMappings.map((m: any) => m.sdgGoal || m.sdg_goal)}
                    size="sm"
                    showTooltips={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Technical Details (disclosure) ───────────────────────────── */}
      {hasTechnicalDetails && (
        <div className="mt-10 pt-8 pb-4 border-t border-border">
          <h3 className="text-body font-semibold text-foreground mb-4">IATI Classification Details</h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-x-5 gap-y-4 text-helper">
            {activity.hierarchy && (
              <div>
                <div className="text-muted-foreground mb-1">Hierarchy</div>
                <div className="flex items-center gap-1.5">
                  <code className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                    {activity.hierarchy}
                  </code>
                  <span className="font-medium text-foreground">
                    {HIERARCHY_LEVELS[activity.hierarchy] || `Level ${activity.hierarchy}`}
                  </span>
                </div>
              </div>
            )}
            {activity.collaborationType && (
              <div>
                <div className="text-muted-foreground mb-1">Collaboration</div>
                <div className="flex items-center gap-1.5">
                  <code className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                    {activity.collaborationType}
                  </code>
                  <span className="font-medium text-foreground">
                    {getCollaborationTypeByCode(activity.collaborationType)?.name || activity.collaborationType}
                  </span>
                </div>
              </div>
            )}
            {activity.defaultFlowType && activity.defaultFlowType !== "0" && (
              <div>
                <div className="text-muted-foreground mb-1">Flow Type</div>
                <div className="flex items-center gap-1.5">
                  <code className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                    {activity.defaultFlowType}
                  </code>
                  <span className="font-medium text-foreground">
                    {FLOW_TYPE_LABELS[activity.defaultFlowType] || activity.defaultFlowType}
                  </span>
                </div>
              </div>
            )}
            {activity.defaultFinanceType && activity.defaultFinanceType !== "0" && (
              <div>
                <div className="text-muted-foreground mb-1">Finance Type</div>
                <div className="flex items-center gap-1.5">
                  <code className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                    {activity.defaultFinanceType}
                  </code>
                  <span className="font-medium text-foreground">
                    {FINANCE_TYPE_LABELS[activity.defaultFinanceType] || activity.defaultFinanceType}
                  </span>
                </div>
              </div>
            )}
            {activity.defaultAidType && activity.defaultAidType !== "0" && (
              <div>
                <div className="text-muted-foreground mb-1">Aid Type</div>
                <div className="flex items-center gap-1.5">
                  <code className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                    {activity.defaultAidType}
                  </code>
                  <span className="font-medium text-foreground">
                    {AID_TYPE_LABELS[activity.defaultAidType] || activity.defaultAidType}
                  </span>
                </div>
              </div>
            )}
            {activity.defaultTiedStatus && activity.defaultTiedStatus !== "0" && (
              <div>
                <div className="text-muted-foreground mb-1">Tied Status</div>
                <div className="flex items-center gap-1.5">
                  <code className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                    {activity.defaultTiedStatus}
                  </code>
                  <span className="font-medium text-foreground">
                    {TIED_STATUS_LABELS[activity.defaultTiedStatus] || activity.defaultTiedStatus}
                  </span>
                </div>
              </div>
            )}
            {activity.activityScope && activity.activityScope !== "0" && (
              <div>
                <div className="text-muted-foreground mb-1">Scope</div>
                <div className="flex items-center gap-1.5">
                  <code className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                    {activity.activityScope}
                  </code>
                  <span className="font-medium text-foreground">
                    {getActivityScopeLabel(activity.activityScope) || activity.activityScope}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tags ─────────────────────────────────────────────────────── */}
      {activity.tags && activity.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {activity.tags.slice(0, 12).map((t: any) => (
            <Badge key={t.id || t.name} variant="secondary" className="text-[10px] px-1.5 py-0">
              {t.name}
            </Badge>
          ))}
          {activity.tags.length > 12 && (
            <span className="text-[10px] text-muted-foreground self-center">+{activity.tags.length - 12} more</span>
          )}
        </div>
      )}

      {/* Bottom border to separate from content below */}
      <div className="mt-10 pb-10 border-b border-border" />
    </div>
  )
}

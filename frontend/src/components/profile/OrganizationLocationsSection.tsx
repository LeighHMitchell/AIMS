"use client"

import React, { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { MapPin, BarChart3, Download, ChevronDown, ChevronRight } from "lucide-react"
import { MultiSelectFilter } from "@/components/ui/multi-select-filter"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api-fetch"
import { ActivityLocationsTable } from "@/components/locations/ActivityLocationsTable"
import { XlsxWorkbookBuilder } from "@/lib/exports/xlsx-workbook"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Dynamically loaded so MapLibre / Leaflet bundles don't ship in the parent
// chunk and don't get evaluated during SSR.
const ActivityLocationsMapViewV2 = dynamic(
  () => import("@/components/maps/ActivityLocationsMapViewV2"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 text-muted-foreground">Loading map…</div>
    ),
  },
)

const SubnationalChoroplethMap = dynamic(
  () => import("@/components/maps/SubnationalChoroplethMap"),
  { ssr: false },
)

// Matches the response from /api/dashboard/org-locations — already in the
// shape ActivityLocationsMapViewV2 expects (snake_case fields on the
// location, plus an `activity` nested object).
interface ProjectLocation {
  id: string
  activity_id: string
  location_name?: string
  description?: string
  /** "site" = a real project location, "coverage" = a sub-national
   *  allocation entry (state/region scope). Coverage rows belong to the
   *  Sub-national Breakdown view, not the pin map / location table. */
  location_type?: string | null
  latitude: number
  longitude: number
  site_type?: string
  state_region_name?: string
  township_name?: string
  district_name?: string
  village_name?: string
  address?: string
  city?: string
  activity?: {
    id: string
    title?: string
    acronym?: string | null
    status?: string
    organization_id?: string
    organization_name?: string
    organization_acronym?: string
  } | null
  // Field-report signals consumed by the map pin renderer.
  field_report_count?: number
  fieldReportCount?: number
  field_report_photo_count?: number
  fieldReportPhotoCount?: number
}

interface RegionDetail {
  totalPercentage: number
  activityCount: number
  pcode: string | null
  /** Populated by the API in township view — the parent state/region name. */
  parentRegion?: string | null
  activities: Array<{ id: string; title: string; status?: string; organization?: string }>
}

interface SubnationalResponse {
  breakdowns: Record<string, number>
  details: Record<string, RegionDetail>
}

/**
 * Mirrors the activity profile's `ActivityLocationsSection` UI for an
 * organisation. Map View renders ActivityLocationsMapViewV2 (with its full
 * toolbar — filter, layers, expand, share, download, 3D toggle) over every
 * project location reported by activities this organisation participates in.
 * Sub-national view renders an aggregated choropleth + breakdown table.
 */
export function OrganizationLocationsSection({
  organizationId,
}: {
  organizationId: string
}) {
  const [view, setView] = useState<"map" | "subnational">("map")
  const [projectLocations, setProjectLocations] = useState<ProjectLocation[]>([])
  const [isLoadingMap, setIsLoadingMap] = useState(true)
  const [subnationalData, setSubnationalData] = useState<SubnationalResponse | null>(null)
  const [isLoadingSubnational, setIsLoadingSubnational] = useState(true)
  const [subnationalViewLevel, setSubnationalViewLevel] = useState<"region" | "township">("region")
  // Hide admin-area-only entries (e.g. a row whose location is just "Chin
  // State" with no township / village / address). Those are sub-national
  // coverage signals, not specific activity sites — and pinning them on a
  // map is misleading. Default ON; users can opt back in.
  const [hideAdminAreaOnly, setHideAdminAreaOnly] = useState(true)
  // Which region groups are currently expanded in the ADM3 (township) view.
  // Matches the activity editor's behaviour: each state/region is a header
  // row that toggles a list of townships below it.
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())
  // User-driven filters above the map. Empty arrays = no filter (show all).
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])

  // Click-thumbnail-in-table → fly the map camera to the pin and open that
  // pin's popup. No page-scroll: the user can still see the result if the
  // map is off-screen (e.g. an overview popup that briefly draws attention),
  // and not yanking the viewport keeps the table row they just clicked in
  // sight. Mirrors the activity-profile locations tab.
  const [focusedLocationId, setFocusedLocationId] = useState<string | null>(null)
  const mapInstanceRef = React.useRef<any>(null)

  const handleTableLocationClick = (loc: any) => {
    const lat = Number(loc?.latitude)
    const lng = Number(loc?.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    // Re-set the id even if it's the same, so the FocusOpener inside the
    // marker layer's useEffect re-runs and re-opens an already-dismissed
    // popup. (Same id twice in a row would otherwise be a no-op.)
    setFocusedLocationId(null)
    requestAnimationFrame(() => setFocusedLocationId(loc?.id || null))
    const map = mapInstanceRef.current
    if (map?.flyTo) {
      map.flyTo({ center: [lng, lat], zoom: 14, duration: 1200, essential: true })
    }
  }

  // Fetch the org's project locations (markers on the map). Uses the same
  // endpoint as the legacy OrgActivitiesMap so the data shape matches
  // ActivityLocationsMapViewV2's expected Location interface (snake_case
  // fields, nested activity context, etc.).
  useEffect(() => {
    if (!organizationId) return
    let cancelled = false
    setIsLoadingMap(true)
    apiFetch(`/api/dashboard/org-locations?organizationId=${organizationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data) {
          const list = Array.isArray(data) ? data : data?.locations || []
          setProjectLocations(list)
        }
        setIsLoadingMap(false)
      })
      .catch(() => {
        if (cancelled) return
        setProjectLocations([])
        setIsLoadingMap(false)
      })
    return () => {
      cancelled = true
    }
  }, [organizationId])

  // Fetch the subnational breakdown (choropleth + table).
  useEffect(() => {
    if (!organizationId) return
    let cancelled = false
    setIsLoadingSubnational(true)
    const params = new URLSearchParams({
      organizationId,
      view_level: subnationalViewLevel,
    })
    apiFetch(`/api/subnational-breakdowns?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data) setSubnationalData(data)
        setIsLoadingSubnational(false)
      })
      .catch(() => {
        if (cancelled) return
        setSubnationalData(null)
        setIsLoadingSubnational(false)
      })
    return () => {
      cancelled = true
    }
  }, [organizationId, subnationalViewLevel])

  // A location is "admin-area only" if it has no township / village /
  // address — i.e. the only geographic signal is a state or region name.
  // Those entries describe coverage rather than a project site, so they
  // shouldn't be pinned on the map by default.
  const isAdminAreaOnly = (l: ProjectLocation) => {
    const hasSiteSignal =
      (l.township_name && l.township_name.trim()) ||
      (l.district_name && l.district_name.trim()) ||
      (l.village_name && l.village_name.trim()) ||
      (l.address && l.address.trim()) ||
      (l.city && l.city.trim())
    return !hasSiteSignal
  }

  const coordinateValid = (l: ProjectLocation) => {
    const lat = Number(l.latitude)
    const lng = Number(l.longitude)
    return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0
  }

  // Rows we want to surface as project sites — `location_type === 'coverage'`
  // entries are sub-national allocation signals (state/region scope) and
  // belong to the Sub-national Breakdown tab, not the pin map / sites table.
  // Matches the activity-editor / activity-profile behaviour.
  const siteRows = useMemo(() => {
    return (projectLocations || []).filter((l) => l?.location_type !== "coverage")
  }, [projectLocations])

  // Option lists for the filter dropdowns — derived from the full site-row
  // set (not the filtered one) so the user can always pick any state /
  // activity that has locations.
  const stateOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const l of siteRows) {
      const name = l.state_region_name?.trim()
      if (!name) continue
      if (!seen.has(name)) seen.set(name, name)
    }
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [siteRows])

  const activityOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const l of siteRows) {
      const id = l.activity?.id
      const title = l.activity?.title?.trim()
      if (!id || !title) continue
      if (!seen.has(id)) seen.set(id, title)
    }
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [siteRows])

  // Apply the user-selected state / activity filters to the site rows
  // before downstream filtering (coordinates + admin-area heuristic).
  const userFilteredRows = useMemo(() => {
    const states = new Set(selectedStates)
    const activities = new Set(selectedActivities)
    return siteRows.filter((l) => {
      if (states.size > 0) {
        const name = l.state_region_name?.trim()
        if (!name || !states.has(name)) return false
      }
      if (activities.size > 0) {
        const id = l.activity?.id
        if (!id || !activities.has(id)) return false
      }
      return true
    })
  }, [siteRows, selectedStates, selectedActivities])

  // /api/dashboard/org-locations already returns locations in the shape
  // ActivityLocationsMapViewV2 expects, so we just filter out coverage
  // rows, rows with missing/invalid coordinates, and (by default)
  // admin-area-only entries.
  const validMapLocations = useMemo(() => {
    return userFilteredRows.filter((l) => {
      if (!coordinateValid(l)) return false
      if (hideAdminAreaOnly && isAdminAreaOnly(l)) return false
      return true
    })
  }, [userFilteredRows, hideAdminAreaOnly])

  const adminAreaOnlyCount = useMemo(() => {
    return userFilteredRows.filter((l) => coordinateValid(l) && isAdminAreaOnly(l)).length
  }, [userFilteredRows])

  // Reshape subnational details into the choropleth's expected map shape.
  const regionBreakdownsWithDetails = useMemo(() => {
    const result: Record<
      string,
      { percentage: number; activityCount: number; activities: Array<{ id: string; title: string }> }
    > = {}
    const breakdowns = subnationalData?.breakdowns ?? {}
    const details = subnationalData?.details ?? {}
    for (const [region, percentage] of Object.entries(breakdowns)) {
      result[region] = {
        percentage: Number(percentage) || 0,
        activityCount: details[region]?.activityCount || 0,
        activities:
          details[region]?.activities?.map((a) => ({ id: a.id, title: a.title })) || [],
      }
    }
    return result
  }, [subnationalData])

  const breakdownRows = useMemo(() => {
    return Object.entries(regionBreakdownsWithDetails)
      .map(([region, d]) => ({ region, percentage: d.percentage, activityCount: d.activityCount }))
      .sort((a, b) => b.percentage - a.percentage)
  }, [regionBreakdownsWithDetails])

  // ADM3 (township view): build a hierarchical row list matching the
  // activity editor's "region header → expandable townships" layout. Each
  // township entry exposes its parent region (set server-side in
  // `details[township].parentRegion` so we know which state to nest it
  // under). Townships missing a parent fall under a synthetic "Other".
  const organizedTownshipRows = useMemo(() => {
    type Row =
      | {
          type: "region"
          regionName: string
          townshipCount: number
          regionTotal: number
        }
      | {
          type: "township"
          regionName: string
          townshipName: string
          percentage: number
          activityCount: number
        }

    const details = subnationalData?.details ?? {}
    // Group townships by their parent region.
    const byRegion = new Map<string, Array<{ townshipName: string; percentage: number; activityCount: number }>>()
    for (const [townshipName, d] of Object.entries(details)) {
      const parent = d?.parentRegion?.trim() || "Other"
      const list = byRegion.get(parent) ?? []
      list.push({
        townshipName,
        percentage: Number(d?.totalPercentage) || 0,
        activityCount: Number(d?.activityCount) || 0,
      })
      byRegion.set(parent, list)
    }

    // Build the ordered region list (largest total first).
    const regions = Array.from(byRegion.entries())
      .map(([regionName, townships]) => ({
        regionName,
        townships: townships.sort((a, b) => a.townshipName.localeCompare(b.townshipName)),
        regionTotal: townships.reduce((sum, t) => sum + t.percentage, 0),
      }))
      .sort((a, b) => b.regionTotal - a.regionTotal)

    const rows: Row[] = []
    for (const { regionName, townships, regionTotal } of regions) {
      rows.push({
        type: "region",
        regionName,
        townshipCount: townships.length,
        regionTotal,
      })
      if (expandedRegions.has(regionName)) {
        for (const t of townships) {
          rows.push({
            type: "township",
            regionName,
            townshipName: t.townshipName,
            percentage: t.percentage,
            activityCount: t.activityCount,
          })
        }
      }
    }
    return rows
  }, [subnationalData, expandedRegions])

  const toggleRegion = (regionName: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev)
      if (next.has(regionName)) next.delete(regionName)
      else next.add(regionName)
      return next
    })
  }

  const handleExport = () => {
    const wb = new XlsxWorkbookBuilder()
    wb.addSheet(
      "Locations",
      [
        { header: "Activity", accessor: "activity" as const },
        { header: "Location Name", accessor: "name" as const },
        { header: "Latitude", accessor: "latitude" as const },
        { header: "Longitude", accessor: "longitude" as const },
        { header: "Description", accessor: "description" as const },
      ],
      validMapLocations.map((l) => ({
        activity: l.activity?.title ?? "",
        name: l.location_name ?? "",
        latitude: l.latitude ?? "",
        longitude: l.longitude ?? "",
        description: l.description ?? "",
      })),
    )
    wb.addSheet(
      "Sub-national Breakdown",
      [
        { header: "Region", accessor: "region" as const },
        { header: "Activities", accessor: "activityCount" as const },
        { header: "Allocation %", accessor: "percentage" as const },
      ],
      breakdownRows.map((r) => ({
        region: r.region,
        activityCount: r.activityCount,
        percentage: r.percentage,
      })),
    )
    wb.download(`organization-locations.xlsx`)
  }

  return (
    <Card className="bg-card p-6">
      <div className="mb-4 flex flex-col space-y-1.5">
        <h2 className="text-2xl font-semibold leading-none tracking-tight text-foreground">
          Organization Locations
        </h2>
        <p className="text-body text-muted-foreground">
          Mapped locations and sub-national breakdown across this organisation's portfolio
        </p>
      </div>

      <div className="space-y-4">
        {/* Single toolbar row: filters (map view only) + view toggle +
            CSV export. Labels stack above each filter so the controls
            align on the same baseline. */}
        <div className="flex items-end gap-3 flex-wrap">
          {view === "map" && (
            <>
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
              <div className="space-y-2 flex-1 min-w-[260px]">
                <Label className="text-helper text-muted-foreground">Activity</Label>
                <MultiSelectFilter
                  options={activityOptions}
                  value={selectedActivities}
                  onChange={setSelectedActivities}
                  placeholder="All activities"
                  searchPlaceholder="Search activities..."
                  className="w-full"
                />
              </div>
            </>
          )}
          <div className="ml-auto flex items-end gap-2">
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
              onClick={handleExport}
              title="Export to Excel"
              aria-label="Export to Excel"
              disabled={validMapLocations.length === 0 && breakdownRows.length === 0}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {view === "map" && adminAreaOnlyCount > 0 && (
          // Admin-area-only entries are state/region centroids, not real
          // project sites. We hide them by default but offer a toggle so
          // users who want full coverage can opt in.
          <button
            type="button"
            onClick={() => setHideAdminAreaOnly((v) => !v)}
            className="text-helper text-muted-foreground hover:text-foreground underline-offset-2 hover:underline self-end"
            title={
              hideAdminAreaOnly
                ? "Show admin-area-only locations (state/region centroids)"
                : "Hide admin-area-only locations"
            }
          >
            {hideAdminAreaOnly
              ? `${adminAreaOnlyCount} admin-area location${adminAreaOnlyCount === 1 ? "" : "s"} hidden — show all`
              : `Showing ${adminAreaOnlyCount} admin-area location${adminAreaOnlyCount === 1 ? "" : "s"} — hide`}
          </button>
        )}

        {view === "map" && (
          <div className="m-0 space-y-4">
            {isLoadingMap ? (
              <>
                <Skeleton className="h-[640px] w-full rounded-md" />
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </>
            ) : validMapLocations.length > 0 ? (
              <div className="h-[640px] rounded-md overflow-hidden border border-border">
                <ActivityLocationsMapViewV2
                  locations={validMapLocations as any}
                  mapCenter={[19.0, 96.5]}
                  mapZoom={6}
                  organizationId={organizationId}
                  focusedLocationId={focusedLocationId}
                  onMapInstanceReady={(map) => { mapInstanceRef.current = map }}
                />
              </div>
            ) : (
              <p className="text-helper text-muted-foreground">
                {selectedStates.length > 0 || selectedActivities.length > 0
                  ? "No mapped locations match the selected filters."
                  : "No mapped locations recorded for this organisation."}
              </p>
            )}
            {!isLoadingMap && validMapLocations.length > 0 && (
              // Drive the table off the same filtered set as the map so the
              // counts line up. The user expects "Showing X of Y" to match
              // the pin count visible above.
              <ActivityLocationsTable
                locations={validMapLocations as any}
                onLocationClick={handleTableLocationClick}
              />
            )}
          </div>
        )}

        {view === "subnational" && (
          <div className="m-0 space-y-4">
            {isLoadingSubnational ? (
              <>
                <Skeleton className="h-[640px] w-full rounded-md" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </>
            ) : Object.keys(regionBreakdownsWithDetails).length > 0 ? (
              <>
                <div className="h-[640px] rounded-md overflow-hidden border border-border">
                  <SubnationalChoroplethMap
                    breakdowns={regionBreakdownsWithDetails}
                    viewLevel={subnationalViewLevel}
                    onViewLevelChange={setSubnationalViewLevel}
                    hideExpandButton
                  />
                </div>
                <div className="rounded-lg border">
                  <div className="overflow-hidden rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{subnationalViewLevel === "township" ? "State / Region · Township" : "Region"}</TableHead>
                          <TableHead className="text-right w-[140px]">Activities</TableHead>
                          <TableHead className="text-right w-[160px]">Allocation %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subnationalViewLevel === "township" ? (
                          // ADM3 view: render region header rows that
                          // expand/collapse their townships, matching the
                          // activity editor's hierarchy.
                          organizedTownshipRows.map((row, idx) =>
                            row.type === "region" ? (
                              <TableRow
                                key={`region-${row.regionName}`}
                                className="bg-muted/30 border-t border-border/70 cursor-pointer hover:bg-muted/50"
                                onClick={() => toggleRegion(row.regionName)}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    {expandedRegions.has(row.regionName) ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span>{row.regionName}</span>
                                    <span className="text-helper text-muted-foreground font-normal">
                                      {row.townshipCount} township{row.townshipCount === 1 ? "" : "s"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {row.regionTotal.toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            ) : (
                              <TableRow key={`township-${row.regionName}-${row.townshipName}-${idx}`}>
                                <TableCell className="pl-10 font-normal">
                                  {row.townshipName}
                                </TableCell>
                                <TableCell className="text-right">{row.activityCount}</TableCell>
                                <TableCell className="text-right">
                                  {row.percentage.toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            ),
                          )
                        ) : (
                          breakdownRows.map((r) => (
                            <TableRow key={r.region}>
                              <TableCell className="font-medium">{r.region}</TableCell>
                              <TableCell className="text-right">{r.activityCount}</TableCell>
                              <TableCell className="text-right">
                                {r.percentage.toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                        {/* Totals row — sums across regions. Note that
                            "Activities" counts region-coverage entries, not
                            unique activities, so the same activity covering
                            multiple regions is counted once per region. */}
                        <TableRow className="bg-muted/50 border-t border-border/70 font-medium">
                          <TableCell className="font-semibold">Total</TableCell>
                          <TableCell className="text-right font-semibold">
                            {breakdownRows.reduce((sum, r) => sum + (r.activityCount || 0), 0)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {breakdownRows.reduce((sum, r) => sum + (r.percentage || 0), 0).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <p className="text-helper text-muted-foreground italic">
                  Activities counts region-coverage entries — an activity
                  with sub-national breakdown across multiple regions is
                  counted once per region, so the total can exceed the
                  number of unique activities.
                </p>
              </>
            ) : (
              <p className="text-helper text-muted-foreground">
                No sub-national breakdown recorded across this organisation's activities.
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

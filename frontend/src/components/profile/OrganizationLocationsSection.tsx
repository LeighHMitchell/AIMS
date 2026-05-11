"use client"

import React, { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { MapPin, BarChart3, Download } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { ActivityLocationsTable } from "@/components/locations/ActivityLocationsTable"
import { XlsxWorkbookBuilder } from "@/lib/exports/xlsx-workbook"
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
}

interface RegionDetail {
  totalPercentage: number
  activityCount: number
  pcode: string | null
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
  const [subnationalData, setSubnationalData] = useState<SubnationalResponse | null>(null)
  const [subnationalViewLevel, setSubnationalViewLevel] = useState<"region" | "township">("region")
  // Hide admin-area-only entries (e.g. a row whose location is just "Chin
  // State" with no township / village / address). Those are sub-national
  // coverage signals, not specific activity sites — and pinning them on a
  // map is misleading. Default ON; users can opt back in.
  const [hideAdminAreaOnly, setHideAdminAreaOnly] = useState(true)

  // Fetch the org's project locations (markers on the map). Uses the same
  // endpoint as the legacy OrgActivitiesMap so the data shape matches
  // ActivityLocationsMapViewV2's expected Location interface (snake_case
  // fields, nested activity context, etc.).
  useEffect(() => {
    if (!organizationId) return
    let cancelled = false
    apiFetch(`/api/dashboard/org-locations?organizationId=${organizationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        const list = Array.isArray(data) ? data : data?.locations || []
        setProjectLocations(list)
      })
      .catch(() => {
        if (!cancelled) setProjectLocations([])
      })
    return () => {
      cancelled = true
    }
  }, [organizationId])

  // Fetch the subnational breakdown (choropleth + table).
  useEffect(() => {
    if (!organizationId) return
    let cancelled = false
    const params = new URLSearchParams({
      organizationId,
      view_level: subnationalViewLevel,
    })
    apiFetch(`/api/subnational-breakdowns?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setSubnationalData(data)
      })
      .catch(() => {
        if (!cancelled) setSubnationalData(null)
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

  // /api/dashboard/org-locations already returns locations in the shape
  // ActivityLocationsMapViewV2 expects, so we just filter out rows with
  // missing/invalid coordinates and (by default) admin-area-only entries.
  const validMapLocations = useMemo(() => {
    return (projectLocations || []).filter((l) => {
      if (!coordinateValid(l)) return false
      if (hideAdminAreaOnly && isAdminAreaOnly(l)) return false
      return true
    })
  }, [projectLocations, hideAdminAreaOnly])

  const adminAreaOnlyCount = useMemo(() => {
    return (projectLocations || []).filter((l) => coordinateValid(l) && isAdminAreaOnly(l)).length
  }, [projectLocations])

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
    <Card className="border-border bg-card p-6">
      <div className="mb-4 flex flex-col space-y-1.5">
        <h2 className="text-2xl font-semibold leading-none tracking-tight text-foreground">
          Organization Locations
        </h2>
        <p className="text-body text-muted-foreground">
          Mapped locations and sub-national breakdown across this organisation's portfolio
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {view === "map" && adminAreaOnlyCount > 0 && (
            // Admin-area-only entries are state/region centroids, not real
            // project sites. We hide them by default but offer a toggle so
            // users who want full coverage can opt in.
            <button
              type="button"
              onClick={() => setHideAdminAreaOnly((v) => !v)}
              className="text-helper text-muted-foreground hover:text-foreground underline-offset-2 hover:underline mr-2"
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

        {view === "map" && (
          <div className="m-0 space-y-6">
            {validMapLocations.length > 0 ? (
              <div className="h-[640px] rounded-md overflow-hidden border border-border">
                <ActivityLocationsMapViewV2
                  locations={validMapLocations as any}
                  mapCenter={[19.0, 96.5]}
                  mapZoom={6}
                  organizationId={organizationId}
                />
              </div>
            ) : (
              <p className="text-helper text-muted-foreground">
                No mapped locations recorded for this organisation.
              </p>
            )}
            {projectLocations.length > 0 && (
              <ActivityLocationsTable locations={projectLocations as any} />
            )}
          </div>
        )}

        {view === "subnational" && (
          <div className="m-0 space-y-4">
            {Object.keys(regionBreakdownsWithDetails).length > 0 ? (
              <>
                <div className="h-[640px] rounded-md overflow-hidden border border-border">
                  <SubnationalChoroplethMap
                    breakdowns={regionBreakdownsWithDetails}
                    viewLevel={subnationalViewLevel}
                    onViewLevelChange={setSubnationalViewLevel}
                  />
                </div>
                <div className="rounded-lg border">
                  <div className="overflow-hidden rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Region</TableHead>
                          <TableHead className="text-right w-[140px]">Activities</TableHead>
                          <TableHead className="text-right w-[160px]">Allocation %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {breakdownRows.map((r) => (
                          <TableRow key={r.region}>
                            <TableCell className="font-medium">{r.region}</TableCell>
                            <TableCell className="text-right">{r.activityCount}</TableCell>
                            <TableCell className="text-right">
                              {r.percentage.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
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

"use client";

import React, { useMemo, useState } from "react";
import { Copy, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  getSortIcon,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { countries } from "@/data/countries";
import { useMapStyle, MAP_STYLE_RASTER_TILES } from "@/lib/map-style-context";

/**
 * Small static map tile thumbnail centred on the given coords. Uses the
 * raster equivalent of whatever basemap style the user has selected on
 * the main map above (via the shared MapStyleProvider) — when no provider
 * is in scope, falls back to the Carto Positron 'carto_light' default.
 *
 * Renders at zoom 11 (city / district scale — enough to place the point
 * in its region) with a red marker dot at the centre. Falls back to a
 * muted MapPin placeholder when no coordinates are available.
 */
function LocationThumbnail({
  lat,
  lng,
  size = 72,
  zoom = 11,
}: {
  lat: number | string | null | undefined
  lng: number | string | null | undefined
  size?: number
  zoom?: number
}) {
  const { style } = useMapStyle()
  const latNum = typeof lat === "string" ? parseFloat(lat) : lat
  const lngNum = typeof lng === "string" ? parseFloat(lng) : lng
  if (latNum == null || lngNum == null || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return (
      <div
        className="shrink-0 rounded bg-muted/40 border border-border flex items-center justify-center"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <MapPin className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lngNum + 180) / 360) * n)
  const y = Math.floor(
    ((1 - Math.log(Math.tan((latNum * Math.PI) / 180) + 1 / Math.cos((latNum * Math.PI) / 180)) / Math.PI) /
      2) *
      n,
  )
  // Clamp Y to valid tile range (handles points at the poles).
  const safeY = Math.max(0, Math.min(n - 1, y))
  const safeX = ((x % n) + n) % n
  const tileBuilder = MAP_STYLE_RASTER_TILES[style] || MAP_STYLE_RASTER_TILES.carto_light
  const tileUrl = tileBuilder.url(zoom, safeX, safeY)
  return (
    <div
      className="relative shrink-0 rounded overflow-hidden bg-muted border border-border"
      style={{ width: size, height: size }}
    >
      <img
        src={tileUrl}
        alt=""
        loading="lazy"
        // Cache-bust on style change so React doesn't reuse the stale tile
        // when the parent style changes — `key` on the parent div does the
        // same job at the DOM level if React Strict re-uses elements.
        key={tileUrl}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Centre dot — approximates the marker position. A single tile
          covers ~20km at zoom 11, so the offset is well within "close
          enough" for a thumbnail. */}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white shadow" />
    </div>
  )
}

interface ActivityLocationRow {
  id?: string | null;
  location_name?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  township_name?: string | null;
  state_region_name?: string | null;
  city?: string | null;
  country_code?: string | null;
  location_description?: string | null;
  activity_location_description?: string | null;
  description?: string | null;
  activity?: {
    id?: string | null;
    title?: string | null;
    /** Activity-level description, used as last-resort fallback for the
     *  Activity Description column when neither activity_location_description
     *  nor description is set on the location row. */
    description?: string | null;
    organization_name?: string | null;
    organization_acronym?: string | null;
  } | null;
}

interface ActivityLocationsTableProps {
  locations: ActivityLocationRow[];
  onLocationClick?: (location: ActivityLocationRow) => void;
}

type SortField = "name" | "state_region" | "activity" | "location" | "location_description" | "activity_description";
type SortOrder = "asc" | "desc";

const PAGE_SIZE = 20;

// Read-only port of the Activity Editor's locations table (LocationsTab.tsx).
// Three columns: Name (with coords + copy button), Location (formatted address +
// location description), Activity Description (line-clamped with tooltip).
// All three are sortable using the standard `getSortIcon` chevron pattern.
export function ActivityLocationsTable({ locations, onLocationClick }: ActivityLocationsTableProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage] = useState(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1); // reset to first page whenever sort changes
  };

  const getCountryName = (code?: string | null): string => {
    if (!code) return "";
    const country = countries.find((c) => c.code.toUpperCase() === code.toUpperCase());
    return country?.name || code;
  };

  const formatAddress = (location: ActivityLocationRow): string => {
    // Walk admin levels from most specific (township) to least (region).
    // Drop any rung whose value matches one already kept — so the common
    // Myanmar pattern of township == city == region == "Magway" collapses
    // to "Magway township, Myanmar" rather than repeating the same name
    // four times. Each surviving rung gets a level suffix so the user can
    // see which rung the kept value refers to. Country has no suffix.
    const levels: { value?: string | null; suffix: string }[] = [
      { value: location.township_name, suffix: "township" },
      { value: location.city, suffix: "city" },
      { value: location.state_region_name, suffix: "region" },
    ];
    const seen = new Set<string>();
    const parts: string[] = [];
    for (const { value, suffix } of levels) {
      const trimmed = value?.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      parts.push(`${trimmed} ${suffix}`);
    }
    if (location.country_code) parts.push(getCountryName(location.country_code));
    return parts.join(", ") || "N/A";
  };

  // Auto-show the Activity column when at least one row carries an activity
  // title (e.g. on the Organization profile, where the table aggregates
  // locations from many activities). The Activity profile's location table
  // doesn't include activity context, so the column stays hidden there.
  const showActivity = useMemo(
    () => (locations || []).some((l) => l.activity?.title),
    [locations],
  );

  const sortedLocations = useMemo(() => {
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...locations].sort((a, b) => {
      let aVal = "";
      let bVal = "";
      switch (sortField) {
        case "name":
          aVal = (a.location_name || "").toLowerCase();
          bVal = (b.location_name || "").toLowerCase();
          break;
        case "state_region":
          aVal = (a.state_region_name || "").toLowerCase();
          bVal = (b.state_region_name || "").toLowerCase();
          break;
        case "activity":
          aVal = (a.activity?.title || "").toLowerCase();
          bVal = (b.activity?.title || "").toLowerCase();
          break;
        case "location":
          aVal = formatAddress(a).toLowerCase();
          bVal = formatAddress(b).toLowerCase();
          break;
        case "location_description":
          aVal = (a.location_description || "").toLowerCase();
          bVal = (b.location_description || "").toLowerCase();
          break;
        case "activity_description":
          aVal = (a.activity_location_description || a.description || a.activity?.description || "").toLowerCase();
          bVal = (b.activity_location_description || b.description || b.activity?.description || "").toLowerCase();
          break;
      }
      return aVal.localeCompare(bVal) * dir;
    });
  }, [locations, sortField, sortOrder]);

  // Pagination — slice the sorted list to the current page. PAGE_SIZE is
  // small enough to keep the UI responsive on long org-profile location
  // lists without forcing the user to scroll for ages.
  const totalRows = sortedLocations.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, totalRows);
  const paginatedLocations = sortedLocations.slice(pageStart, pageEnd);

  if (!locations || locations.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="space-y-3">
      <TableContainer className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {/* On the org profile (showActivity) the column order is
                  Activity Title → Name → Location → Activity Description.
                  Activity profile keeps the legacy two-column layout
                  (Name + Location) since it has no activity context. */}
              {/* Equal-width columns — 20% each when the Activity Title is
                  shown (5 cols on org profile) and 25% each on the activity
                  profile (4 cols). */}
              {showActivity && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/30 transition-colors w-[20%]"
                  onClick={() => handleSort("activity")}
                >
                  <div className="flex items-center gap-1">
                    <span>Activity Title</span>
                    {getSortIcon("activity", sortField, sortOrder)}
                  </div>
                </TableHead>
              )}
              <TableHead
                className={`cursor-pointer hover:bg-muted/30 transition-colors ${showActivity ? "w-[20%]" : "w-[25%]"}`}
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  <span>Location Name</span>
                  {getSortIcon("name", sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className={`cursor-pointer hover:bg-muted/30 transition-colors ${showActivity ? "w-[20%]" : "w-[25%]"}`}
                onClick={() => handleSort("location")}
              >
                <div className="flex items-center gap-1">
                  <span>Address</span>
                  {getSortIcon("location", sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className={`cursor-pointer hover:bg-muted/30 transition-colors ${showActivity ? "w-[20%]" : "w-[25%]"}`}
                onClick={() => handleSort("location_description")}
              >
                <div className="flex items-center gap-1">
                  <span>Location Description</span>
                  {getSortIcon("location_description", sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className={`cursor-pointer hover:bg-muted/30 transition-colors ${showActivity ? "w-[20%]" : "w-[25%]"}`}
                onClick={() => handleSort("activity_description")}
              >
                <div className="flex items-center gap-1">
                  <span>Activity Description</span>
                  {getSortIcon("activity_description", sortField, sortOrder)}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLocations.map((location, idx) => {
              // Fallback chain for the Activity Description column:
              //   1. activity_location_description — most specific (what
              //      the activity does *at this place*)
              //   2. description — the location row's own description
              //   3. activity.description — the activity-level narrative
              //      (last resort, but better than blank)
              const activityDesc =
                location.activity_location_description ||
                location.description ||
                location.activity?.description;
              return (
                <TableRow key={location.id ?? `loc-${idx}`}>
                  {showActivity && (
                    <TableCell className="text-body align-top">
                      {location.activity?.id ? (
                        <a
                          href={`/activities/${location.activity.id}`}
                          className="text-body font-medium text-foreground no-underline hover:no-underline line-clamp-2 whitespace-normal break-words"
                        >
                          {location.activity.title || "Untitled activity"}
                        </a>
                      ) : (
                        <span className="text-body font-medium line-clamp-2 whitespace-normal break-words">
                          {location.activity?.title || "—"}
                        </span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="align-top">
                    <div className="flex items-start gap-3 min-w-0">
                      {onLocationClick && location.latitude != null && location.longitude != null ? (
                        <button
                          type="button"
                          onClick={() => onLocationClick(location)}
                          className="flex-shrink-0 rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:ring-2 hover:ring-primary transition"
                          title="Show on map"
                          aria-label="Show on map"
                        >
                          <LocationThumbnail lat={location.latitude} lng={location.longitude} />
                        </button>
                      ) : (
                        <LocationThumbnail lat={location.latitude} lng={location.longitude} />
                      )}
                      <div className="text-body font-medium min-w-0 break-words">
                        {location.location_name || "Unnamed Location"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-body align-top">
                    <div>{formatAddress(location)}</div>
                    {location.latitude != null && location.longitude != null && (
                      <div className="group/coords flex items-center gap-1.5 text-helper text-muted-foreground mt-0.5 w-fit">
                        <span>
                          {Number(location.latitude).toFixed(4)}, {Number(location.longitude).toFixed(4)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const coords = `${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`;
                            navigator.clipboard.writeText(coords);
                            toast.success("Coordinates copied");
                          }}
                          className="opacity-0 group-hover/coords:opacity-100 transition-opacity hover:text-foreground"
                          title="Copy coordinates"
                          aria-label="Copy coordinates"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        {/* Same Google Maps icon used in the map marker
                            popups (SimpleActivityMarkersLayer). Opens the
                            satellite-tile view at the location's coords.
                            Reveals on hover only — same pattern as the
                            Copy button above. */}
                        <a
                          href={`https://www.google.com/maps?q=${Number(location.latitude)},${Number(location.longitude)}&t=k`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Open in Google Maps"
                          aria-label="Open in Google Maps"
                          className="opacity-0 group-hover/coords:opacity-100 transition-opacity hover:opacity-80 flex-shrink-0"
                        >
                          <img
                            src="https://www.gstatic.com/marketing-cms/assets/images/0f/9a/58f1d92b46069b4a8bdc556b612c/google-maps.webp"
                            alt=""
                            className="h-3.5 w-3.5"
                          />
                        </a>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-body align-top">
                    {location.location_description ? (
                      <span className="whitespace-normal break-words">
                        {location.location_description}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-body align-top">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="line-clamp-3 whitespace-normal break-words cursor-default">
                          {activityDesc || "-"}
                        </span>
                      </TooltipTrigger>
                      {activityDesc && (
                        <TooltipContent side="top" className="max-w-md">
                          <p>{activityDesc}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {totalRows > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-helper text-muted-foreground">
            Showing {pageStart + 1}–{pageEnd} of {totalRows} locations
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-helper text-muted-foreground px-3">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="h-8"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
      </div>
    </TooltipProvider>
  );
}

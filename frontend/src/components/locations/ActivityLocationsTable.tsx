"use client";

import React, { useMemo, useState } from "react";
import { Copy, ChevronLeft, ChevronRight } from "lucide-react";
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
    organization_name?: string | null;
    organization_acronym?: string | null;
  } | null;
}

interface ActivityLocationsTableProps {
  locations: ActivityLocationRow[];
}

type SortField = "name" | "state_region" | "activity" | "location" | "location_description" | "activity_description";
type SortOrder = "asc" | "desc";

const PAGE_SIZE = 20;

// Read-only port of the Activity Editor's locations table (LocationsTab.tsx).
// Three columns: Name (with coords + copy button), Location (formatted address +
// location description), Activity Description (line-clamped with tooltip).
// All three are sortable using the standard `getSortIcon` chevron pattern.
export function ActivityLocationsTable({ locations }: ActivityLocationsTableProps) {
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
    const parts: string[] = [];
    if (location.township_name) parts.push(location.township_name);
    if (location.city) parts.push(location.city);
    if (location.state_region_name) parts.push(location.state_region_name);
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
          aVal = (a.activity_location_description || a.description || "").toLowerCase();
          bVal = (b.activity_location_description || b.description || "").toLowerCase();
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
              <TableHead
                className={`cursor-pointer hover:bg-muted/30 transition-colors ${showActivity ? "w-[20%]" : "w-[24%]"}`}
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  <span>Name</span>
                  {getSortIcon("name", sortField, sortOrder)}
                </div>
              </TableHead>
              {showActivity && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/30 transition-colors w-[16%]"
                  onClick={() => handleSort("state_region")}
                >
                  <div className="flex items-center gap-1">
                    <span>State / Region</span>
                    {getSortIcon("state_region", sortField, sortOrder)}
                  </div>
                </TableHead>
              )}
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
              {showActivity && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/30 transition-colors w-[22%]"
                  onClick={() => handleSort("location_description")}
                >
                  <div className="flex items-center gap-1">
                    <span>Location Description</span>
                    {getSortIcon("location_description", sortField, sortOrder)}
                  </div>
                </TableHead>
              )}
              {!showActivity && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/30 transition-colors w-[26%]"
                  onClick={() => handleSort("location")}
                >
                  <div className="flex items-center gap-1">
                    <span>Location</span>
                    {getSortIcon("location", sortField, sortOrder)}
                  </div>
                </TableHead>
              )}
              <TableHead
                className={`cursor-pointer hover:bg-muted/30 transition-colors ${showActivity ? "w-[22%]" : "w-[50%]"}`}
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
              const activityDesc = location.activity_location_description || location.description;
              return (
                <TableRow key={location.id ?? `loc-${idx}`}>
                  <TableCell className="align-top">
                    <div className="text-body">{location.location_name || "Unnamed Location"}</div>
                    {location.latitude != null && location.longitude != null && (
                      <div className="group/coords flex items-center gap-1 text-helper text-muted-foreground mt-0.5 w-fit">
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
                      </div>
                    )}
                  </TableCell>
                  {showActivity && (
                    <TableCell className="text-body align-top">
                      <div>{location.state_region_name || "—"}</div>
                      {location.country_code && (
                        <div className="text-helper text-muted-foreground mt-0.5">
                          {getCountryName(location.country_code)}
                        </div>
                      )}
                    </TableCell>
                  )}
                  {showActivity && (
                    <TableCell className="text-body align-top">
                      {location.activity?.id ? (
                        <a
                          href={`/activities/${location.activity.id}`}
                          className="text-body text-foreground no-underline hover:no-underline line-clamp-2 whitespace-normal break-words"
                        >
                          {location.activity.title || "Untitled activity"}
                        </a>
                      ) : (
                        <span className="text-body line-clamp-2 whitespace-normal break-words">
                          {location.activity?.title || "—"}
                        </span>
                      )}
                    </TableCell>
                  )}
                  {showActivity && (
                    <TableCell className="text-body align-top">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="line-clamp-3 whitespace-normal break-words cursor-default">
                            {location.location_description || "-"}
                          </span>
                        </TooltipTrigger>
                        {location.location_description && (
                          <TooltipContent side="top" className="max-w-md">
                            <p>{location.location_description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>
                  )}
                  {!showActivity && (
                    <TableCell className="text-body align-top">
                      <div>{formatAddress(location)}</div>
                      {location.location_description && (
                        <div className="text-body mt-0.5 whitespace-normal break-words text-muted-foreground">
                          {location.location_description}
                        </div>
                      )}
                    </TableCell>
                  )}
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

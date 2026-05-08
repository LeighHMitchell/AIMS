"use client";

import React, { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
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
}

interface ActivityLocationsTableProps {
  locations: ActivityLocationRow[];
}

type SortField = "name" | "location" | "activity_description";
type SortOrder = "asc" | "desc";

// Read-only port of the Activity Editor's locations table (LocationsTab.tsx).
// Three columns: Name (with coords + copy button), Location (formatted address +
// location description), Activity Description (line-clamped with tooltip).
// All three are sortable using the standard `getSortIcon` chevron pattern.
export function ActivityLocationsTable({ locations }: ActivityLocationsTableProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortOrder("asc");
    }
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
        case "location":
          aVal = formatAddress(a).toLowerCase();
          bVal = formatAddress(b).toLowerCase();
          break;
        case "activity_description":
          aVal = (a.activity_location_description || a.description || "").toLowerCase();
          bVal = (b.activity_location_description || b.description || "").toLowerCase();
          break;
      }
      return aVal.localeCompare(bVal) * dir;
    });
  }, [locations, sortField, sortOrder]);

  if (!locations || locations.length === 0) return null;

  return (
    <TooltipProvider>
      <TableContainer className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted/30 transition-colors w-[24%]"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  <span>Name</span>
                  {getSortIcon("name", sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/30 transition-colors w-[26%]"
                onClick={() => handleSort("location")}
              >
                <div className="flex items-center gap-1">
                  <span>Location</span>
                  {getSortIcon("location", sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/30 transition-colors w-[50%]"
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
            {sortedLocations.map((location, idx) => {
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
                  <TableCell className="text-body align-top">
                    <div>{formatAddress(location)}</div>
                    {location.location_description && (
                      <div className="text-body mt-0.5 whitespace-normal break-words text-muted-foreground">
                        {location.location_description}
                      </div>
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
    </TooltipProvider>
  );
}

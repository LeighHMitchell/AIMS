"use client";

import * as React from "react";
import { ChevronsUpDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import Image from "next/image";

export interface Organization {
  id: string;
  name: string;
  acronym?: string;
  iati_org_id?: string;
  logo?: string;
  country?: string;
  organisation_type?: string;
}

interface OrganizationSearchableSelectProps {
  organizations: Organization[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  emptyStateMessage?: string;
  emptyStateSubMessage?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  forceDirection?: 'up' | 'down' | 'auto';
}

export function OrganizationSearchableSelect({
  organizations,
  value,
  onValueChange,
  placeholder = "Select organization...",
  searchPlaceholder = "Search organizations...",
  disabled = false,
  className,
  emptyStateMessage = "No organizations found.",
  emptyStateSubMessage = "Try adjusting your search terms",
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  forceDirection = 'auto',
}: OrganizationSearchableSelectProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const selectedOrganization = organizations.find(org => org.id === value);

  // Clean up search when dropdown closes
  React.useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  // Filter organizations based on search query
  const filteredOrganizations = React.useMemo(() => {
    if (!search) return organizations;
    
    const query = search.toLowerCase();
    return organizations.filter(
      org =>
        org.name.toLowerCase().includes(query) ||
        (org.acronym && org.acronym.toLowerCase().includes(query)) ||
        (org.iati_org_id && org.iati_org_id.toLowerCase().includes(query)) ||
        (org.country && org.country.toLowerCase().includes(query))
    );
  }, [organizations, search]);

  const handleSelect = (organizationId: string) => {
    onValueChange(organizationId);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange("");
  };

  const handleSearchClear = () => {
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const renderOrganizationDisplay = (org: Organization, showLogo = true) => (
    <div className="flex items-center gap-3">
      {showLogo && org.logo && (
        <div className="flex-shrink-0">
          <Image
            src={org.logo}
            alt={`${org.name} logo`}
            width={24}
            height={24}
            className="rounded-sm object-contain"
            onError={(e) => {
              // Hide image on error
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium text-foreground truncate">
            {org.name}
          </span>
          {org.acronym && (
            <span className="font-medium text-foreground">
              ({org.acronym})
            </span>
          )}
        </div>
        {(org.iati_org_id || org.country) && (
          <div className="flex items-center gap-1 mt-0.5">
            {org.iati_org_id && (
              <span className="text-xs text-muted-foreground">
                {org.iati_org_id}
              </span>
            )}
            {org.iati_org_id && org.country && (
              <span className="text-xs text-muted-foreground">•</span>
            )}
            {org.country && (
              <span className="text-xs text-muted-foreground">
                {org.country}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          data-popover-trigger
          className={cn(
            "flex min-h-[60px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
            !selectedOrganization && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOrganization ? (
              renderOrganizationDisplay(selectedOrganization, true)
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-2">
            {selectedOrganization && (
              <button
                type="button"
                onClick={handleClear}
                className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                aria-label="Clear selection"
                tabIndex={-1}
              >
                <span className="text-xs">×</span>
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[600px] min-w-[var(--radix-popover-trigger-width)] p-0 shadow-lg border"
          align="start"
          sideOffset={2}
          collisionPadding={20}
          forcePosition={forceDirection === 'up' ? 'top' : forceDirection === 'down' ? 'bottom' : undefined}
        >
          {/* Search Input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 focus:border-none"
              autoFocus={false}
            />
            {search && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="ml-2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                aria-label="Clear search"
                tabIndex={-1}
              >
                <span className="text-xs">×</span>
              </button>
            )}
          </div>

          {/* Organizations List */}
          <div 
            className="max-h-[300px] overflow-y-auto scroll-smooth"
            onScroll={(e) => e.stopPropagation()}
          >
            {filteredOrganizations.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-sm text-muted-foreground">
                  {emptyStateMessage}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {emptyStateSubMessage}
                </div>
              </div>
            ) : (
              filteredOrganizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleSelect(org.id)}
                  className={cn(
                    "pl-6 pr-3 py-3 w-full text-left cursor-pointer transition-colors flex items-start gap-2 hover:bg-accent/50 focus:bg-accent focus:outline-none",
                    value === org.id && "bg-accent"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 mt-1 flex-shrink-0",
                      value === org.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {renderOrganizationDisplay(org, true)}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 
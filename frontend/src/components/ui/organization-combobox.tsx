"use client"

import * as React from "react"
import Image from "next/image"
import { Check, ChevronsUpDown, Building2, X, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area";
import { isLegacyOrgType } from "@/lib/org-type-mappings";
import { IATI_COUNTRIES } from "@/data/iati-countries";

/**
 * Get the 2-letter ISO country code for flag display.
 * The country field may contain either a 2-letter code (like "FR")
 * or a full name (like "France"). This normalizes to the code.
 */
function getCountryCode(country: string | undefined): string | null {
  if (!country) return null;

  // If it's already a 2-letter code, use it directly
  if (country.length === 2) {
    return country.toLowerCase();
  }

  // Try to find the country by name in the IATI countries list
  const found = IATI_COUNTRIES.find(
    c => c.name.toLowerCase() === country.toLowerCase()
  );
  if (found) {
    return found.code.toLowerCase();
  }

  // Fallback: try partial matching for country names with variations
  // e.g., "Bahamas (the)" vs "Bahamas"
  const partialMatch = IATI_COUNTRIES.find(
    c => c.name.toLowerCase().includes(country.toLowerCase()) ||
         country.toLowerCase().includes(c.name.toLowerCase().split(' (')[0])
  );
  if (partialMatch) {
    return partialMatch.code.toLowerCase();
  }

  return null;
}

export interface Organization {
  id: string
  name: string
  acronym?: string
  type?: string
  org_type?: string  // Database field name (legacy)
  Organisation_Type_Code?: string  // New database field name
  Organisation_Type_Name?: string  // New database field name
  country?: string
  iati_org_id?: string
  iati_identifier?: string  // Database field name
  reporting_org_ref?: string
  logo?: string
}

interface OrganizationComboboxProps {
  organizations: Organization[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  allowManualEntry?: boolean
  disabled?: boolean
  className?: string
  fallbackRef?: string
  /** Callback when an organization with a legacy type code is selected */
  onLegacyTypeDetected?: (org: Organization) => void
  /** Controlled open state */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
}

export function OrganizationCombobox({
  organizations,
  value,
  onValueChange,
  placeholder = "Select organization...",
  disabled = false,
  className,
  fallbackRef,
  onLegacyTypeDetected,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}: OrganizationComboboxProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  
  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  const [search, setSearch] = React.useState("")
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus search input when popover opens
  React.useEffect(() => {
    if (open) {
      // Small timeout to ensure the popover is rendered
      const timeoutId = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  // Find selected organization
  const selectedOrg = organizations.find(org => org.id === value)

  // Get display name for organization
  const getOrganizationDisplay = (org: Organization) => {
    if (org.name && org.acronym && org.name !== org.acronym) {
      return `${org.name} (${org.acronym})`
    }
    return org.name || org.acronym || 'Unknown'
  }

  // Helper to render org details line (IATI ref, type code, country)
  const getOrgDetailsLine = (org: Organization) => {
    const parts: string[] = []
    const iatiRef = org.iati_org_id || org.iati_identifier
    const orgType = org.Organisation_Type_Code || org.org_type || org.type
    
    // Show IATI ref if available, otherwise show org ID
    if (iatiRef) {
      parts.push(iatiRef)
    } else {
      parts.push(`ID: ${org.id}`)
    }
    
    if (orgType) {
      // Format type as "40 Multilateral" instead of "Type: 40"
      parts.push(orgType)
    }
    if (org.country) parts.push(org.country)
    
    return parts.length > 0 ? parts.join(' · ') : null
  }

  // Helper to render org details line with styled badges
  const getOrgDetailsLineStyled = (org: Organization) => {
    const iatiRef = org.iati_org_id || org.iati_identifier
    const orgTypeCode = org.Organisation_Type_Code  // This contains the code like "40"
    const orgTypeText = org.Organisation_Type_Name || org.type  // This contains the text like "Multilateral"
    
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* IATI Org ID Badge */}
        {iatiRef ? (
          <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded hover:text-gray-600">
            {iatiRef}
          </span>
        ) : (
          <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded hover:text-gray-600">
            ID: {org.id}
          </span>
        )}
        
        {/* Organization Type Code Badge */}
        {orgTypeCode && (
          <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded hover:text-gray-600">
            {orgTypeCode}
          </span>
        )}
        
        {/* Dot separator */}
        {orgTypeCode && orgTypeText && (
          <span className="text-xs text-gray-400">·</span>
        )}
        
        {/* Organization Type Text */}
        {orgTypeText && (
          <span className="text-xs text-gray-500 hover:text-gray-500">
            {orgTypeText}
          </span>
        )}
      </div>
    )
  }

  // Filter organizations based on search
  const filteredOrgs = React.useMemo(() => {
    if (!search) return organizations; // Show all by default, scroll area will limit visible height
    const term = search.toLowerCase();
    return organizations.filter(org =>
      org.name.toLowerCase().includes(term) ||
      (org.acronym && org.acronym.toLowerCase().includes(term)) ||
      (org.iati_org_id && org.iati_org_id.toLowerCase().includes(term)) ||
      (org.iati_identifier && org.iati_identifier.toLowerCase().includes(term)) ||
      (org.type && org.type.toLowerCase().includes(term)) ||
      (org.org_type && org.org_type.toLowerCase().includes(term)) ||
      (org.Organisation_Type_Code && org.Organisation_Type_Code.toLowerCase().includes(term)) ||
      (org.Organisation_Type_Name && org.Organisation_Type_Name.toLowerCase().includes(term)) ||
      (org.country && org.country.toLowerCase().includes(term))
    );
  }, [organizations, search]);

  const handleSelect = (orgId: string) => {
    onValueChange(orgId)
    setOpen(false)
    
    // Check if the selected organization has a legacy type code
    const selectedOrg = organizations.find(o => o.id === orgId)
    if (selectedOrg && onLegacyTypeDetected) {
      const orgTypeCode = selectedOrg.Organisation_Type_Code || selectedOrg.type
      if (isLegacyOrgType(orgTypeCode)) {
        onLegacyTypeDetected(selectedOrg)
      }
    }
  }

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild className="w-full">
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal px-3 py-2 text-base h-auto min-h-[52px] border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 hover:text-gray-900",
              className
            )}
          >
          {(() => {
            const selected = organizations.find((o) => o.id === value);
            if (selected) {
              const iatiRef = selected.iati_org_id || selected.iati_identifier
              const orgTypeCode = selected.Organisation_Type_Code
              const orgTypeName = selected.Organisation_Type_Name || selected.type

              return (
                <div className="flex items-start gap-3 text-left w-full min-w-0 py-0.5">
                  {/* Organization logo */}
                  {selected.logo ? (
                    <div className="w-8 h-8 flex-shrink-0">
                      <Image
                        src={selected.logo}
                        alt={`${selected.name} logo`}
                        width={32}
                        height={32}
                        className="rounded-sm object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-sm">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                  )}

                  {/* Organization details - two line layout */}
                  <div className="min-w-0 flex-1">
                    {/* Line 1: Name and acronym */}
                    <div className="truncate font-medium text-sm text-gray-900">
                      {selected.name}{selected.acronym && selected.acronym !== selected.name ? ` (${selected.acronym})` : ''}
                    </div>

                    {/* Line 2: ID, Type, Country with flag */}
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                      {/* IATI ID or internal ID */}
                      <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[10px]">
                        {iatiRef || `ID: ${selected.id.substring(0, 8)}`}
                      </span>

                      {/* Organization Type */}
                      {(orgTypeCode || orgTypeName) && (
                        <>
                          <span className="text-gray-300">·</span>
                          {orgTypeCode && (
                            <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[10px]">{orgTypeCode}</span>
                          )}
                          {orgTypeName && (
                            <span className="truncate">{orgTypeName}</span>
                          )}
                        </>
                      )}

                      {/* Country with flag */}
                      {selected.country && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="flex items-center gap-1 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {getCountryCode(selected.country) && (
                              <img
                                src={`https://flagcdn.com/w20/${getCountryCode(selected.country)}.png`}
                                alt=""
                                className="w-3.5 h-auto rounded-[2px]"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            )}
                            {selected.country}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            // Show fallback reference if no organization found but we have a ref
            if (fallbackRef && !selected) {
              return (
                <span className="flex flex-col min-w-0 text-left leading-relaxed">
                  <span className="truncate font-medium text-base text-yellow-600 leading-relaxed">
                    {fallbackRef}
                  </span>
                  <span className="text-sm text-yellow-500 truncate mt-1 leading-relaxed">
                    Organization not found in list
                  </span>
                </span>
              );
            }
            return <span className="text-gray-400 text-base leading-relaxed">{placeholder}</span>;
          })()}
          <div className="flex items-center gap-1 ml-2">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onValueChange('');
                  }
                }}
                className="h-4 w-4 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Clear selection"
              >
                <X className="h-3 w-3 text-gray-500" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="p-0 w-[600px]"
      >
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              placeholder="Search organizations by name, acronym, or IATI ID..."
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CommandList>
            {search && filteredOrgs.length === 0 && (
              <CommandEmpty>No organization found.</CommandEmpty>
            )}
            {filteredOrgs.length > 0 && (
              <ScrollArea className="max-h-60 overflow-y-auto">
                <CommandGroup>
                  {filteredOrgs.map(org => {
                    const iatiRef = org.iati_org_id || org.iati_identifier
                    const orgTypeCode = org.Organisation_Type_Code
                    const orgTypeName = org.Organisation_Type_Name || org.type

                    return (
                      <CommandItem
                        key={org.id}
                        onSelect={() => handleSelect(org.id)}
                        className="py-2.5"
                      >
                        <div className="flex items-start gap-3 w-full">
                          {/* Organization logo */}
                          {org.logo ? (
                            <div className="w-8 h-8 flex-shrink-0 mt-0.5">
                              <Image
                                src={org.logo}
                                alt={`${org.name} logo`}
                                width={32}
                                height={32}
                                className="rounded-sm object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-sm mt-0.5">
                              <Building2 className="h-5 w-5 text-gray-400" />
                            </div>
                          )}

                          {/* Organization details - two line layout */}
                          <div className="min-w-0 flex-1">
                            {/* Line 1: Name and acronym */}
                            <div className="font-medium text-gray-900 text-sm">
                              {org.name}{org.acronym && org.acronym !== org.name ? ` (${org.acronym})` : ''}
                            </div>

                            {/* Line 2: ID, Type, Country with flag */}
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {/* IATI ID or internal ID */}
                              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                {iatiRef || `ID: ${org.id.substring(0, 8)}...`}
                              </span>

                              {/* Organization Type */}
                              {(orgTypeCode || orgTypeName) && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  {orgTypeCode && (
                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{orgTypeCode}</span>
                                  )}
                                  {orgTypeName && (
                                    <span className="text-xs text-gray-500">{orgTypeName}</span>
                                  )}
                                </>
                              )}

                              {/* Country with flag */}
                              {org.country && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {getCountryCode(org.country) && (
                                      <img
                                        src={`https://flagcdn.com/w20/${getCountryCode(org.country)}.png`}
                                        alt=""
                                        className="w-4 h-auto rounded-[2px]"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                      />
                                    )}
                                    {org.country}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </ScrollArea>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    </div>
  )
} 
"use client"

import * as React from "react"
import Image from "next/image"
import { Check, ChevronsUpDown, Building2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area";

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
  logo?: string
}

interface OrganizationComboboxProps {
  organizations: Organization[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  allowManualEntry?: boolean
  className?: string
  fallbackRef?: string
}

export function OrganizationCombobox({
  organizations,
  value,
  onValueChange,
  placeholder = "Select organization...",
  className,
  fallbackRef
}: OrganizationComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const triggerRef = React.useRef<HTMLButtonElement>(null);

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
            className={cn(
              "w-full justify-between font-normal px-4 py-2 text-base h-auto border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 hover:text-gray-900",
              className
            )}
          >
          {(() => {
            const selected = organizations.find((o) => o.id === value);
            if (selected) {
              return (
                <div className="flex items-center gap-3 text-left w-full min-w-0">
                  {/* Organization logo - only show if logo exists */}
                  {selected.logo ? (
                    <div className="w-6 h-6 flex-shrink-0">
                      <Image
                        src={selected.logo}
                        alt={`${selected.name} logo`}
                        width={24}
                        height={24}
                        className="rounded-sm object-contain"
                        onError={(e) => {
                          console.log(`[OrganizationCombobox] Selected logo failed to load for ${selected.name}:`, selected.logo);
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-sm">
                      <Building2 className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate font-normal text-sm leading-relaxed text-gray-900 hover:text-gray-900">
                        {getOrganizationDisplay(selected)}
                      </span>
                      {(selected.iati_org_id || selected.iati_identifier) && (
                        <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded hover:text-gray-600">
                          {selected.iati_org_id || selected.iati_identifier}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const orgTypeText = selected.Organisation_Type_Name || selected.type;
                      const parts = [];
                      if (orgTypeText) parts.push(orgTypeText);
                      if (selected.country) parts.push(selected.country);
                      if (parts.length > 0) {
                        return (
                          <span className="text-xs text-gray-500 truncate">
                            {parts.join(' · ')}
                          </span>
                        );
                      }
                      return null;
                    })()}
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
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange('');
                }}
                className="h-4 w-4 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors"
                aria-label="Clear selection"
              >
                <X className="h-3 w-3 text-gray-500" />
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="p-0 max-w-[600px]"
        style={{
          width: triggerRef.current ? `${triggerRef.current.offsetWidth}px` : '320px',
        }}
      >
        <Command>
          <CommandInput
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus:ring-0"
            autoFocus
          />
          <CommandList>
            {search && filteredOrgs.length === 0 && (
              <CommandEmpty>No organization found.</CommandEmpty>
            )}
            {filteredOrgs.length > 0 && (
              <ScrollArea className="max-h-60 overflow-x-hidden overflow-y-auto">
                <CommandGroup>
                  {filteredOrgs.map(org => (
                    <CommandItem
                      key={org.id}
                      onSelect={() => {
                        onValueChange(org.id);
                        setOpen(false);
                      }}
                      className="py-3"
                    >
                      <div className="flex items-center gap-3 w-full">
                        {/* Organization logo - only show if logo exists */}
                        {org.logo ? (
                          <div className="w-6 h-6 flex-shrink-0">
                            <Image
                              src={org.logo}
                              alt={`${org.name} logo`}
                              width={24}
                              height={24}
                              className="rounded-sm object-contain"
                              onError={(e) => {
                                console.log(`[OrganizationCombobox] Logo failed to load for ${org.name}:`, org.logo);
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-sm">
                            <Building2 className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-normal text-gray-900 text-sm truncate hover:text-gray-900">{org.name}{org.acronym ? ` (${org.acronym})` : ''}</span>
                            {(org.iati_org_id || org.iati_identifier) && (
                              <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded hover:text-gray-600">
                                {org.iati_org_id || org.iati_identifier}
                              </span>
                            )}
                          </div>
                          {(() => {
                            const orgTypeText = org.Organisation_Type_Name || org.type;
                            const parts = [];
                            if (orgTypeText) parts.push(orgTypeText);
                            if (org.country) parts.push(org.country);
                            if (parts.length > 0) {
                              return (
                                <span className="text-xs text-gray-500 truncate">
                                  {parts.join(' · ')}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
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
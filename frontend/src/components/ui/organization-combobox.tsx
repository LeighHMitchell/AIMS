"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
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
  country?: string
  iati_org_id?: string
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

  // Helper to render IATI and country on one line
  const getIatiCountryLine = (org: Organization) => {
    const iati = org.iati_org_id
    const country = org.country
    if (iati && country) {
      return `${iati} · ${country}`
    } else if (iati) {
      return iati
    } else if (country) {
      return country
    }
    return null
  }

  // Filter organizations based on search
  const filteredOrgs = React.useMemo(() => {
    if (!search) return organizations; // Show all by default, scroll area will limit visible height
    const term = search.toLowerCase();
    return organizations.filter(org =>
      org.name.toLowerCase().includes(term) ||
      (org.acronym && org.acronym.toLowerCase().includes(term)) ||
      (org.iati_org_id && org.iati_org_id.toLowerCase().includes(term)) ||
      (org.country && org.country.toLowerCase().includes(term))
    );
  }, [organizations, search]);

  const handleSelect = (orgId: string) => {
    onValueChange(orgId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal px-3 py-2 text-sm h-auto",
            className
          )}
        >
          {(() => {
            const selected = organizations.find((o) => o.id === value);
            if (selected) {
              return (
                <span className="flex flex-col min-w-0 text-left leading-tight">
                  <span className="truncate font-medium text-sm leading-tight">
                    {getOrganizationDisplay(selected)}
                  </span>
                  {getIatiCountryLine(selected) && (
                    <span className="text-xs text-gray-500 truncate leading-tight">
                      {getIatiCountryLine(selected)}
                    </span>
                  )}
                </span>
              );
            }
            // Show fallback reference if no organization found but we have a ref
            if (fallbackRef && !selected) {
              return (
                <span className="flex flex-col min-w-0 text-left leading-tight">
                  <span className="truncate font-medium text-sm text-yellow-600 leading-tight">
                    {fallbackRef}
                  </span>
                  <span className="text-xs text-yellow-500 truncate leading-tight">
                    Organization not found in list
                  </span>
                </span>
              );
            }
            return <span className="text-gray-400 text-sm leading-tight">{placeholder}</span>;
          })()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="p-0 min-w-[320px] max-w-[600px]"
        style={{
          width: triggerRef.current ? `${triggerRef.current.offsetWidth}px` : undefined,
        }}
      >
        <Command>
          <CommandInput
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 text-base">{org.name}{org.acronym ? ` (${org.acronym})` : ''}</span>
                        {(org.iati_org_id || org.country) && (
                          <span className="text-xs text-gray-500 truncate">
                            {org.iati_org_id}
                            {org.iati_org_id && org.country ? ' · ' : ''}
                            {org.country}
                          </span>
                        )}
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
  )
} 
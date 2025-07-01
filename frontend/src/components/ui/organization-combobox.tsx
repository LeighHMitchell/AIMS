"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export interface Organization {
  id: string
  name: string
  acronym?: string
  type?: string
  country?: string
  iati_org_id?: string
}

interface OrganizationComboboxProps {
  organizations: Organization[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  allowManualEntry?: boolean
  className?: string
}

export function OrganizationCombobox({
  organizations,
  value,
  onValueChange,
  placeholder = "Select organization...",
  allowManualEntry = true,
  className
}: OrganizationComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [manualMode, setManualMode] = React.useState(false)
  
  // Find selected organization
  const selectedOrg = organizations.find(org => org.id === value)
  
  // Get display name for organization
  const getOrganizationDisplay = (org: Organization) => {
    if (org.name && org.acronym) {
      return `${org.name} (${org.acronym})`
    }
    return org.name
  }
  
  // Filter organizations based on search
  const filteredOrgs = organizations.filter(org => {
    const searchLower = search.toLowerCase();
    const displayName = getOrganizationDisplay(org);
    
    // Check display name
    if (displayName.toLowerCase().includes(searchLower)) return true;
    
    // Check acronym specifically - allow partial matches from start
    if (org.acronym && org.acronym.toLowerCase().startsWith(searchLower)) return true;
    
    // Check full name
    if (org.name && org.name.toLowerCase().includes(searchLower)) return true;
    
    // Check country
    if (org.country && org.country.toLowerCase().includes(searchLower)) return true;
    
    // Check IATI ID
    if (org.iati_org_id && org.iati_org_id.toLowerCase().includes(searchLower)) return true;
    
    return false;
  })
  
  const handleSelect = (orgId: string) => {
    if (orgId === "manual") {
      setManualMode(true)
      setOpen(false)
    } else {
      onValueChange(orgId)
      setOpen(false)
      setManualMode(false)
    }
  }
  
  if (manualMode && allowManualEntry) {
    return (
      <div className={cn("flex gap-2", className)}>
        <Input
          value={value || ""}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Enter organization name..."
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setManualMode(false)
            onValueChange("")
          }}
        >
          Cancel
        </Button>
      </div>
    )
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 opacity-50" />
            {selectedOrg ? (
              <div className="truncate text-left">
                <div className="text-base">
                  {selectedOrg.name}
                  {selectedOrg.acronym && (
                    <span> ({selectedOrg.acronym})</span>
                  )}
                </div>
                {selectedOrg.iati_org_id && (
                  <div className="text-xs text-gray-500">
                    {selectedOrg.iati_org_id}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <CommandEmpty>
            No organization found.
            {allowManualEntry && (
              <div className="py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleSelect("manual")}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Enter manually
                </Button>
              </div>
            )}
          </CommandEmpty>
          <CommandGroup>
            {filteredOrgs.map((org) => (
              <CommandItem
                key={org.id}
                onSelect={() => handleSelect(org.id)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === org.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex-1">
                  <div className="text-base">
                    {org.name}
                    {org.acronym && (
                      <span> ({org.acronym})</span>
                    )}
                    {org.type && (
                      <Badge variant="outline" className="text-xs ml-2">
                        {org.type}
                      </Badge>
                    )}
                  </div>
                  {org.iati_org_id && (
                    <div className="text-xs text-gray-500">
                      {org.iati_org_id}
                    </div>
                  )}
                </div>
              </CommandItem>
            ))}
            {allowManualEntry && (
              <>
                <CommandItem
                  onSelect={() => handleSelect("manual")}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Enter manually
                </CommandItem>
              </>
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 
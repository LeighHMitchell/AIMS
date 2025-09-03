"use client"

import * as React from "react"
import Image from "next/image"
import { Check, ChevronsUpDown, Building2 } from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"

export interface OrganizationWithLogo {
  id: string
  name: string
  acronym?: string
  type?: string
  country?: string
  iati_org_id?: string
  logo?: string
}

interface OrganizationDropdownWithLogoProps {
  organizations: OrganizationWithLogo[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  fallbackRef?: string
}

export function OrganizationDropdownWithLogo({
  organizations,
  value,
  onValueChange,
  placeholder = "Select organization...",
  className,
  disabled = false,
  fallbackRef
}: OrganizationDropdownWithLogoProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // Find selected organization
  const selectedOrg = organizations.find(org => org.id === value)

  // Get display name for organization
  const getOrganizationDisplay = (org: OrganizationWithLogo) => {
    if (org.name && org.acronym && org.name !== org.acronym) {
      return `${org.name} (${org.acronym})`
    }
    return org.name || org.acronym || 'Unknown'
  }

  // Helper to render IATI and country on one line
  const getIatiCountryLine = (org: OrganizationWithLogo) => {
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
    if (!search) return organizations.slice(0, 5) // Show first 5 by default
    const term = search.toLowerCase()
    return organizations.filter(org =>
      org.name.toLowerCase().includes(term) ||
      (org.acronym && org.acronym.toLowerCase().includes(term)) ||
      (org.iati_org_id && org.iati_org_id.toLowerCase().includes(term)) ||
      (org.country && org.country.toLowerCase().includes(term))
    )
  }, [organizations, search])

  const handleSelect = (orgId: string) => {
    onValueChange(orgId)
    setOpen(false)
    setSearch("")
  }

  const renderOrganizationItem = (org: OrganizationWithLogo, isSelected = false) => (
    <div className="flex items-center gap-3 w-full">
      {/* Organization Logo */}
      <div className="w-6 h-6 flex-shrink-0">
        {org.logo ? (
          <Image
            src={org.logo}
            alt={`${org.name} logo`}
            width={24}
            height={24}
            className="rounded-sm object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="w-6 h-6 bg-gray-100 rounded-sm flex items-center justify-center">
            <Building2 className="h-4 w-4 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Organization Details */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">
          {getOrganizationDisplay(org)}
        </div>
        {getIatiCountryLine(org) && (
          <div className="text-xs text-gray-500 truncate mt-0.5">
            {getIatiCountryLine(org)}
          </div>
        )}
      </div>
      
      {isSelected && <Check className="h-4 w-4 text-green-600" />}
    </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        ref={triggerRef}
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          "w-full justify-between font-normal min-w-[320px] px-4 py-2 h-auto border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 flex items-center",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
          {selectedOrg ? (
            <div className="flex items-center gap-3 text-left w-full min-w-0">
              {/* Selected org logo */}
              <div className="w-5 h-5 flex-shrink-0">
                {selectedOrg.logo ? (
                  <Image
                    src={selectedOrg.logo}
                    alt={`${selectedOrg.name} logo`}
                    width={20}
                    height={20}
                    className="rounded-sm object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-5 h-5 bg-gray-100 rounded-sm flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate font-medium text-base">
                  {getOrganizationDisplay(selectedOrg)}
                </span>
                {getIatiCountryLine(selectedOrg) && (
                  <span className="text-sm text-gray-500 truncate">
                    {getIatiCountryLine(selectedOrg)}
                  </span>
                )}
              </div>
            </div>
          ) : fallbackRef ? (
            <span className="flex flex-col min-w-0 text-left">
              <span className="truncate font-medium text-base text-yellow-600">
                {fallbackRef}
              </span>
              <span className="text-sm text-yellow-500 truncate">
                Organization not found in list
              </span>
            </span>
          ) : (
            <span className="text-gray-400 text-base">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                      onSelect={() => handleSelect(org.id)}
                      className="py-3 cursor-pointer"
                    >
                      {renderOrganizationItem(org, org.id === value)}
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

"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, MapPin, Plus, X, CheckCircle, Loader2, AlertCircle } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { MYANMAR_REGIONS, type MyanmarRegion } from "@/data/myanmar-regions"
import { Input } from "@/components/ui/input"

interface RegionSearchableSelectProps {
  selectedRegions: Record<string, number>
  onRegionAdd: (regionName: string, percentage: number) => void
  onRegionRemove: (regionName: string) => void
  onPercentageChange: (regionName: string, percentage: number) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  allocationStatus?: Record<string, 'saving' | 'saved' | 'error'>
  shouldShowGreenTick?: (regionName: string) => boolean
}

export function RegionSearchableSelect({
  selectedRegions,
  onRegionAdd,
  onRegionRemove,
  onPercentageChange,
  disabled = false,
  placeholder = "Select a state/region/union territory...",
  className,
  allocationStatus = {},
  shouldShowGreenTick
}: RegionSearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  
  // Get list of available regions (not already selected)
  const availableRegions = MYANMAR_REGIONS.filter(
    region => !selectedRegions.hasOwnProperty(region.name)
  )
  
  // Filter regions based on search
  const filteredRegions = availableRegions.filter(region =>
    region.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    region.type.toLowerCase().includes(searchValue.toLowerCase())
  )
  
  // Group regions by type
  const groupedRegions = {
    States: filteredRegions.filter(r => r.type === "State"),
    Regions: filteredRegions.filter(r => r.type === "Region"),
    "Union Territories": filteredRegions.filter(r => r.type === "Union Territory")
  }
  
  const handleSelectRegion = (region: MyanmarRegion) => {
    onRegionAdd(region.name, 0) // Add with 0% initially
    setOpen(false)
    setSearchValue("")
  }
  
  const totalPercentage = Object.values(selectedRegions).reduce((sum, val) => sum + val, 0)
  const isValidTotal = Math.abs(totalPercentage - 100) < 0.01
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Dropdown for adding regions */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Add Locations</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="w-full justify-between text-left font-normal"
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {placeholder}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command shouldFilter={false}>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  placeholder="Search states, regions, or union territories..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <CommandList>
                {filteredRegions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {searchValue ? "No matching locations found." : "All locations have been added."}
                  </div>
                ) : (
                  <>
                    {Object.entries(groupedRegions).map(([groupName, regions]) => {
                      if (regions.length === 0) return null
                      
                      return (
                        <CommandGroup key={groupName} heading={groupName}>
                          {regions.map((region) => (
                            <CommandItem
                              key={region.name}
                              value={region.name}
                              onSelect={() => handleSelectRegion(region)}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  "opacity-0"
                                )}
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{region.name}</span>
                              </div>
                              <Badge variant="secondary" className="ml-auto">
                                {region.type}
                              </Badge>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )
                    })}
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Selected regions with percentage inputs */}
      {Object.keys(selectedRegions).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Selected Locations</label>
            <div className="flex items-center gap-3">
              {Object.keys(selectedRegions).length > 1 && (
                <button
                  onClick={() => {
                    // Clear all regions
                    Object.keys(selectedRegions).forEach(regionName => {
                      onRegionRemove(regionName)
                    })
                  }}
                  disabled={disabled}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                  title="Clear all locations"
                >
                  <X className="h-3 w-3" />
                  Clear All
                </button>
              )}
              <div className={cn(
                "text-sm font-medium",
                isValidTotal ? "text-green-600" : totalPercentage > 100 ? "text-red-600" : "text-amber-600"
              )}>
                Total: {totalPercentage.toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {Object.entries(selectedRegions)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([regionName, percentage]) => {
                const region = MYANMAR_REGIONS.find(r => r.name === regionName)
                
                return (
                  <div
                    key={regionName}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{regionName}</div>
                      {region && (
                        <div className="text-xs text-muted-foreground">{region.type}</div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={percentage || ""}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0
                          onPercentageChange(regionName, value)
                        }}
                        placeholder="0.00"
                        className="w-24 text-right"
                        disabled={disabled}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                      
                      {/* Save Status Icons */}
                      <div className="flex items-center ml-2">
                        {allocationStatus[regionName] === 'saving' && (
                          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                        )}
                        {shouldShowGreenTick && shouldShowGreenTick(regionName) && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {allocationStatus[regionName] === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRegionRemove(regionName)}
                      disabled={disabled}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove {regionName}</span>
                    </Button>
                  </div>
                )
              })}
          </div>
          
          {!isValidTotal && Object.keys(selectedRegions).length > 0 && (
            <div className={cn(
              "text-xs",
              totalPercentage > 100 ? "text-red-600" : "text-amber-600"
            )}>
              {totalPercentage > 100 
                ? `Reduce allocations by ${(totalPercentage - 100).toFixed(1)}% to reach 100%`
                : `Add ${(100 - totalPercentage).toFixed(1)}% more to reach 100%`
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}
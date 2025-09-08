"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import myanmarData from '@/data/myanmar-locations.json'

export interface AdminUnit {
  id: string
  name: string
  type: 'state' | 'region' | 'union-territory' | 'township'
  parentName?: string
  parentId?: string
  fullName: string
}

interface AdminCategory {
  name: string
  type: 'nationwide' | 'states-regions' | 'townships'
  units: AdminUnit[]
}

interface HierarchicalAdminSelectProps {
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  allAdminUnits: AdminUnit[]
}

export function HierarchicalAdminSelect({
  selected,
  onChange,
  placeholder = "Select administrative units...",
  className,
  disabled = false,
  allAdminUnits,
}: HierarchicalAdminSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  // No longer need expanded categories since we have a flat list

  // Put all admin units in a single category
  const adminCategories = React.useMemo((): AdminCategory[] => {
    // Sort all units alphabetically
    const sortedUnits = [...allAdminUnits].sort((a, b) => a.name.localeCompare(b.name))
    
    return [{
      name: 'All Administrative Units',
      type: 'states-regions',
      units: sortedUnits
    }]
  }, [allAdminUnits])

  // No need to manage expanded categories anymore

  // Filter categories based on search
  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return adminCategories

    const query = searchQuery.toLowerCase().trim()

    return adminCategories.map(category => ({
      ...category,
      units: category.units.filter(unit => {
        // Search in unit name
        if (unit.name.toLowerCase().includes(query)) return true
        
        // Search in full name
        if (unit.fullName.toLowerCase().includes(query)) return true
        
        // Search in type
        if (unit.type.toLowerCase().includes(query)) return true
        
        return false
      })
    })).filter(category => category.units.length > 0)
  }, [adminCategories, searchQuery])

  // No need for toggle category function anymore

  const handleSelect = (unitId: string) => {
    if (selected.includes(unitId)) {
      onChange(selected.filter(id => id !== unitId))
    } else {
      onChange([...selected, unitId])
    }
  }

  const handleUnselect = (unitId: string) => {
    onChange(selected.filter(id => id !== unitId))
  }

  const getSelectedUnits = () => {
    return allAdminUnits.filter(unit => selected.includes(unit.id))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between min-h-[40px]", className)}
          disabled={disabled}
        >
          <div className="flex-1 text-left">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <span className="text-sm text-gray-700">
                {selected.length} unit{selected.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              className="mr-2 h-4 w-4 shrink-0 opacity-50"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              placeholder="Search administrative units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          {filteredCategories.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No administrative units found.
            </div>
          )}
          <CommandList className="max-h-[400px] overflow-auto">
            {filteredCategories.length > 0 && filteredCategories[0].units.map((unit) => {
              const isSelected = selected.includes(unit.id)
              const displayName = unit.fullName
              
              return (
                <div
                  key={unit.id}
                  className={cn(
                    "flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b",
                    isSelected && "bg-blue-50"
                  )}
                  onClick={() => handleSelect(unit.id)}
                  data-value={displayName.toLowerCase()}
                >
                  <Check
                    className={cn(
                      "mr-3 h-4 w-4",
                      isSelected ? "opacity-100 text-blue-600" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {displayName}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {unit.type === 'union-territory' ? 'Union Territory' : 
                       unit.type === 'state' ? 'State' : 'Region'}
                    </div>
                  </div>
                </div>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

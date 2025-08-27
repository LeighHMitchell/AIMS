"use client"

import * as React from "react"
import { Check, ChevronsUpDown, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
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
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(
    new Set() // Will be set to expand all categories by default
  )

  // Organize admin units into hierarchical categories
  const adminCategories = React.useMemo((): AdminCategory[] => {
    const statesAndRegions = allAdminUnits.filter(unit => unit.type !== 'township')
    const townships = allAdminUnits.filter(unit => unit.type === 'township')

    // Group townships by their parent state/region
    const townshipsByParent = townships.reduce((acc, township) => {
      const parentName = township.parentName!
      if (!acc[parentName]) {
        acc[parentName] = []
      }
      acc[parentName].push(township)
      return acc
    }, {} as Record<string, AdminUnit[]>)

    return [
      {
        name: 'States & Regions',
        type: 'states-regions',
        units: statesAndRegions
      },
      ...Object.entries(townshipsByParent).map(([parentName, townships]) => ({
        name: `${parentName} Townships`,
        type: 'townships' as const,
        units: townships
      }))
    ]
  }, [allAdminUnits])

  // Expand all categories by default when categories change
  React.useEffect(() => {
    const allCategoryNames = adminCategories.map(cat => cat.name)
    setExpandedCategories(new Set(allCategoryNames))
  }, [adminCategories])

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
        
        // For townships, also search in parent name
        if (unit.type === 'township' && unit.parentName?.toLowerCase().includes(query)) return true
        
        // Search in combined display name (e.g., "Bhamo - Kachin State")
        const displayName = unit.type === 'township' ? `${unit.name} - ${unit.parentName}` : unit.fullName
        if (displayName.toLowerCase().includes(query)) return true
        
        return false
      })
    })).filter(category => category.units.length > 0)
  }, [adminCategories, searchQuery])

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName)
    } else {
      newExpanded.add(categoryName)
    }
    setExpandedCategories(newExpanded)
  }

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
        <Command>
          <CommandInput 
            placeholder="Search administrative units..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandEmpty>No administrative units found.</CommandEmpty>
          <CommandList className="max-h-[400px] overflow-auto">
            {filteredCategories.map((category) => {
              const isExpanded = expandedCategories.has(category.name)
              
              return (
                <CommandGroup key={category.name} className="p-0">
                  {/* Category Header */}
                  <div
                    className="flex items-center px-4 py-3 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleCategory(category.name)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-600 mr-2 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-600 mr-2 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm">
                        {category.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {category.units.length} unit{category.units.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Units List */}
                  {isExpanded && category.units.map((unit) => {
                    const isSelected = selected.includes(unit.id)
                    const displayName = unit.type === 'township' ? `${unit.name} - ${unit.parentName}` : unit.fullName
                    
                    return (
                      <div
                        key={unit.id}
                        className={cn(
                          "flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors",
                          isSelected && "bg-blue-50"
                        )}
                        onClick={() => handleSelect(unit.id)}
                        data-value={displayName.toLowerCase()}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            {displayName}
                          </div>
                          <div className="text-xs text-gray-400 capitalize">
                            {unit.type === 'union-territory' ? 'Union Territory' : unit.type}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

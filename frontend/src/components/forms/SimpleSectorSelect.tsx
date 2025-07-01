"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import { Check, ChevronsUpDown, Search, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
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
import dacSectorsData from "@/data/dac-sectors.json"

interface Sector {
  code: string
  name: string
  description: string
}

interface SectorCategory {
  [categoryName: string]: Sector[]
}

interface SimpleSectorSelectProps {
  selectedSectors?: string[]
  onSectorsChange?: (sectors: string[]) => void
  placeholder?: string
  id?: string
  disabled?: boolean
  maxSelections?: number
  allowMultiple?: boolean
}

export function SimpleSectorSelect({
  selectedSectors = [],
  onSectorsChange,
  placeholder = "Select OECD DAC sectors",
  id,
  disabled = false,
  maxSelections = 10,
  allowMultiple = true
}: SimpleSectorSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const popoverRef = useRef<HTMLDivElement>(null)

  const sectorsData = dacSectorsData as SectorCategory

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Flatten all sectors for searching
  const allSectors = useMemo(() => {
    const flattened: Array<Sector & { categoryName: string }> = []
    
    Object.entries(sectorsData).forEach(([categoryName, sectors]) => {
      sectors.forEach(sector => {
        flattened.push({
          ...sector,
          categoryName
        })
      })
    })
    
    return flattened
  }, [sectorsData])

  // Get selected sector details
  const selectedSectorDetails = useMemo(() => {
    return allSectors.filter(sector => selectedSectors.includes(sector.code))
  }, [allSectors, selectedSectors])

  // Filter sectors based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === "") {
      return sectorsData
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered: SectorCategory = {}
    
    Object.entries(sectorsData).forEach(([categoryName, sectors]) => {
      const matchingSectors = sectors.filter(sector => 
        sector.code.toLowerCase().includes(query) ||
        sector.name.toLowerCase().includes(query) ||
        sector.description.toLowerCase().includes(query) ||
        categoryName.toLowerCase().includes(query)
      )
      
      if (matchingSectors.length > 0) {
        filtered[categoryName] = matchingSectors
      }
    })

    return filtered
  }, [sectorsData, searchQuery])

  // Auto-expand categories with search results
  useEffect(() => {
    if (searchQuery) {
      setExpandedCategories(new Set(Object.keys(filteredData)))
    }
  }, [searchQuery, filteredData])

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName)
    } else {
      newExpanded.add(categoryName)
    }
    setExpandedCategories(newExpanded)
  }

  const handleSectorToggle = (sectorCode: string) => {
    if (!onSectorsChange) return

    let newSelection: string[]
    
    if (allowMultiple) {
      if (selectedSectors.includes(sectorCode)) {
        newSelection = selectedSectors.filter(code => code !== sectorCode)
      } else {
        if (selectedSectors.length >= maxSelections) {
          return // Don't add if max reached
        }
        newSelection = [...selectedSectors, sectorCode]
      }
    } else {
      newSelection = selectedSectors.includes(sectorCode) ? [] : [sectorCode]
      setOpen(false)
    }
    
    onSectorsChange(newSelection)
  }

  const clearAllSelections = () => {
    if (onSectorsChange) {
      onSectorsChange([])
    }
  }

  const getDisplayText = () => {
    if (selectedSectors.length === 0) {
      return placeholder
    }
    
    if (selectedSectors.length === 1) {
      const sector = selectedSectorDetails[0]
      return sector ? `${sector.code} – ${sector.name.split(' – ')[1] || sector.name}` : selectedSectors[0]
    }
    
    return `${selectedSectors.length} sectors selected`
  }

  return (
    <div className="relative w-full" ref={popoverRef}>
      <Popover 
        open={open} 
        onOpenChange={(newOpen) => {
          setOpen(newOpen)
          if (!newOpen) {
            setSearchQuery("")
          }
        }}
      >
        <PopoverTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50",
            selectedSectors.length === 0 && "text-muted-foreground",
            "min-w-0"
          )}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
        >
          <span className="block truncate text-left flex-1">
            {getDisplayText()}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-none p-0 overflow-visible" align="start">
          <Command className="overflow-visible">
            {/* Search Header */}
            <div className="border-b border-border px-3 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search sectors by code, name, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {/* Selection Summary */}
            {allowMultiple && selectedSectors.length > 0 && (
              <div className="px-3 py-2 border-b bg-blue-50 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-blue-700 font-medium">
                    {selectedSectors.length} sector{selectedSectors.length !== 1 ? 's' : ''} selected
                    {maxSelections && ` (max ${maxSelections})`}
                  </span>
                  <button
                    onClick={clearAllSelections}
                    className="text-blue-600 hover:text-blue-800 text-xs underline"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            <CommandList className="max-h-[400px] overflow-auto">
              {Object.keys(filteredData).length === 0 ? (
                <div className="py-6 text-center text-sm">
                  {searchQuery ? `No sectors found for "${searchQuery}"` : "No sectors available."}
                </div>
              ) : (
                Object.entries(filteredData).map(([categoryName, sectors]) => {
                  const isExpanded = expandedCategories.has(categoryName)
                  
                  return (
                    <CommandGroup key={categoryName} className="p-0">
                      {/* Category Header */}
                      <div
                        className="flex items-center px-4 py-3 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleCategory(categoryName)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-600 mr-2 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-600 mr-2 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 text-sm">
                            {categoryName}
                          </div>
                          <div className="text-xs text-gray-600">
                            {sectors.length} sector{sectors.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      {/* Sectors List */}
                      {isExpanded && sectors.map((sector) => {
                        const isSelected = selectedSectors.includes(sector.code)
                        const canSelect = allowMultiple ? 
                          (isSelected || selectedSectors.length < maxSelections) : 
                          true

                        return (
                          <CommandItem
                            key={sector.code}
                            onSelect={() => canSelect && handleSectorToggle(sector.code)}
                            className={cn(
                              "cursor-pointer px-4 py-3 border-b border-gray-100 hover:bg-blue-50 focus:bg-blue-50",
                              "flex items-start gap-3",
                              !canSelect && "opacity-50 cursor-not-allowed",
                              isSelected && "bg-blue-50 border-blue-200"
                            )}
                          >
                            <Check
                              className={cn(
                                "mt-1 h-4 w-4 shrink-0 text-blue-600",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="font-medium text-sm text-gray-900">
                                {sector.name}
                              </div>
                              {sector.description && (
                                <div className="text-xs text-gray-600 leading-relaxed">
                                  {sector.description}
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  )
                })
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Helper function to get sector label from code
export const getSectorLabel = (code: string): string => {
  const sectorsData = dacSectorsData as SectorCategory
  
  for (const sectors of Object.values(sectorsData)) {
    const sector = sectors.find(s => s.code === code)
    if (sector) {
      return `${sector.code} – ${sector.name}`
    }
  }
  
  return code
}

// Helper function to get sector description from code
export const getSectorDescription = (code: string): string => {
  const sectorsData = dacSectorsData as SectorCategory
  
  for (const sectors of Object.values(sectorsData)) {
    const sector = sectors.find(s => s.code === code)
    if (sector) {
      return sector.description
    }
  }
  
  return ""
}

export default SimpleSectorSelect
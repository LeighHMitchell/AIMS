"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import { Check, ChevronsUpDown, Info, Search, X } from "lucide-react"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import aidTypesData from "@/data/aid-types.json"

interface AidType {
  code: string
  name: string
  description?: string
  children?: AidType[]
}

interface AidTypeSelectProps {
  value?: string | null | undefined
  onValueChange?: (value: string | null) => void
  placeholder?: string
  id?: string
  disabled?: boolean
  /** Controlled open state */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
}

export function AidTypeSelect({
  value,
  onValueChange,
  placeholder = "Select aid type",
  id,
  disabled = false,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}: AidTypeSelectProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  const [searchQuery, setSearchQuery] = useState("")
  const popoverRef = useRef<HTMLDivElement>(null)

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

  // Flatten the hierarchical data for easier searching and display
  const flattenedAidTypes = useMemo(() => {
    const flattened: Array<{
      code: string
      name: string
      description?: string
      level: number
      parentCode?: string
      categoryName?: string
    }> = []

    const flatten = (items: AidType[], level = 0, parentCode?: string, categoryName?: string) => {
      items.forEach(item => {
        flattened.push({
          ...item,
          level,
          parentCode,
          categoryName: level === 0 ? item.name : categoryName
        })
        if (item.children) {
          flatten(item.children, level + 1, item.code, level === 0 ? item.name : categoryName)
        }
      })
    }

    flatten(aidTypesData as AidType[])
    return flattened
  }, [])

  // Get the selected item details
  const selectedItem = flattenedAidTypes.find(item => item.code === value)

  // Filter items based on search query with improved search logic
  const filteredItems = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === "") {
      return flattenedAidTypes
    }

    const query = searchQuery.toLowerCase().trim()
    
    return flattenedAidTypes.filter(item => {
      // Search in code, name, and description
      return item.code.toLowerCase().includes(query) ||
             item.name.toLowerCase().includes(query) ||
             (item.description && item.description.toLowerCase().includes(query))
    })
  }, [flattenedAidTypes, searchQuery])

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {}
    
    // First, organize by category
    filteredItems.forEach(item => {
      const categoryCode = item.level === 0 ? item.code : item.code[0]
      
      if (!groups[categoryCode]) {
        groups[categoryCode] = []
      }
      
      // Avoid duplicates
      if (!groups[categoryCode].some(i => i.code === item.code)) {
        groups[categoryCode].push(item)
      }
    })

    // Ensure each group has its category header
    Object.keys(groups).forEach(categoryCode => {
      const hasHeader = groups[categoryCode].some(item => item.level === 0)
      if (!hasHeader) {
        const header = flattenedAidTypes.find(item => item.code === categoryCode && item.level === 0)
        if (header) {
          groups[categoryCode].unshift(header)
        }
      }
    })

    return groups
  }, [filteredItems, flattenedAidTypes])

  const COMMONLY_USED_AID_CODES = ["C01", "B01", "D02", "B04", "B031", "B032"];
  const commonlyUsedAidTypes = filteredItems.filter(opt => COMMONLY_USED_AID_CODES.includes(opt.code));
  const otherGroupedItems = groupedItems;

  const renderItemContent = (item: typeof flattenedAidTypes[0]) => {
    const isSelected = value === item.code
    const indentClass = item.level === 1 ? "pl-4" : item.level === 2 ? "pl-7" : ""

    return (
      <CommandItem
        key={item.code}
        onSelect={() => {
          if (item.level > 0) { // Only allow selection of non-category items
            onValueChange?.(item.code === value ? null : item.code)
            setOpen(false)
          }
        }}
        className={cn(
          "cursor-pointer px-3 py-2 space-y-1 hover:bg-accent/50",
          "flex items-start gap-2",
          indentClass,
          item.level === 0 && "font-semibold text-sm opacity-70 cursor-default pointer-events-none hover:bg-transparent hover:text-inherit",
          isSelected && item.level > 0 && "bg-accent"
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <span className={cn(
              "text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded inline-block mr-1.5",
              item.level === 0 ? "text-gray-700" : ""
            )}>
              {item.code}
            </span>
            <span className={cn(
              item.level === 0 ? "text-gray-600" : "text-gray-700"
            )}>
              – {item.name}
            </span>
          </div>
          {item.description && item.level > 0 && (
            <div className="text-sm text-gray-500 leading-snug">
              {item.description}
            </div>
          )}
        </div>
        {item.description && item.level === 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-gray-400 shrink-0 mt-0.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{item.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CommandItem>
    )
  }

  return (
    <div className="relative w-full flex-1 flex flex-col" ref={popoverRef}>
      <Popover 
        open={open} 
        onOpenChange={(newOpen) => {
          setOpen(newOpen)
          if (!newOpen) {
            setSearchQuery("") // Clear search when closing
          }
        }}
      >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full h-full justify-between font-normal px-3 py-3 text-sm min-h-[60px] border-input hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:text-foreground whitespace-normal text-left items-start",
            !value && "text-muted-foreground"
          )}
        >
          <span className="flex-1 min-w-0 text-left">
            {selectedItem ? (
              <span className="flex items-start gap-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">{selectedItem.code}</span>
                <span className="font-medium text-sm text-foreground">{selectedItem.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            )}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {selectedItem && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange?.(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onValueChange?.(null);
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
        className="w-[var(--radix-popover-trigger-width)] max-w-none p-0"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              type="text"
              placeholder="Search aid types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                  setSearchQuery("");
                }
              }}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
          </div>
          <CommandList className="max-h-[300px] overflow-auto">
            {searchQuery && filteredItems.length > 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                {filteredItems.length} match{filteredItems.length !== 1 ? 'es' : ''} found
              </div>
            )}
            {commonlyUsedAidTypes.length > 0 && (
              <CommandGroup>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                  Commonly Used
                </div>
                {commonlyUsedAidTypes.map(option => renderItemContent(option))}
              </CommandGroup>
            )}
            {Object.entries(otherGroupedItems).map(([categoryCode, items]) => {
              const category = items.find(item => item.code === categoryCode && item.level === 0)
              if (!category) return null

              return (
                <CommandGroup key={categoryCode} className="p-0">
                  {renderItemContent(category)}
                  {items
                    .filter(item => item.code !== categoryCode)
                    .sort((a, b) => {
                      // Sort by code to maintain hierarchical order
                      return a.code.localeCompare(b.code)
                    })
                    .map(renderItemContent)}
                </CommandGroup>
              )
            })}
            {filteredItems.length === 0 && (
              <div className="py-6 text-center text-sm">
                {searchQuery ? `No aid types found for "${searchQuery}"` : "No aid type found."}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    </div>
  )
}
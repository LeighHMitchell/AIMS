"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import flowTypesData from "@/data/flow-types.json"

interface FlowType {
  code: string
  name: string
  description: string
}

interface FlowTypeSelectProps {
  value?: string | null | undefined
  onValueChange?: (value: string | null) => void
  placeholder?: string
  id?: string
  disabled?: boolean
}

export function FlowTypeSelect({
  value,
  onValueChange,
  placeholder = "Select Default Flow Type",
  id,
  disabled = false
}: FlowTypeSelectProps) {
  const [open, setOpen] = useState(false)
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

  const flowTypes = flowTypesData as FlowType[]

  // Get the selected item details
  const selectedItem = flowTypes.find(item => item.code === value)

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === "") {
      return flowTypes
    }

    const query = searchQuery.toLowerCase().trim()
    return flowTypes.filter(item => 
      item.code.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    )
  }, [searchQuery])

  return (
    <div className="relative w-full" ref={popoverRef}>
      <Popover 
        open={open} 
        onOpenChange={(newOpen) => {
          setOpen(newOpen)
          if (!newOpen) {
            setSearchQuery("") // Clear search when closing
          }
        }}
      >
      <PopoverTrigger
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
          "min-w-0" // Add this to ensure it can shrink/grow properly
        )}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
      >
        <span className="block truncate text-left flex-1">
          {selectedItem ? `${selectedItem.code} – ${selectedItem.name}` : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] max-w-none p-0 overflow-visible bottom-full mb-2" 
        align="start"
      >
        <Command className="overflow-visible">
          <div className="border-b border-border px-3 py-2">
            <CommandInput 
              placeholder="Search flow types..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
          <CommandList className="max-h-[400px] overflow-auto rounded-md bg-white shadow border">
            {searchQuery && filteredItems.length > 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                {filteredItems.length} match{filteredItems.length !== 1 ? 'es' : ''} found
              </div>
            )}
            {filteredItems.length === 0 && (
              <div className="py-6 text-center text-sm">
                {searchQuery ? `No flow types found for "${searchQuery}"` : "No flow type found."}
              </div>
            )}
            {filteredItems.map((item) => (
              <CommandItem
                key={item.code}
                onSelect={() => {
                  onValueChange?.(item.code === value ? null : item.code)
                  setOpen(false)
                }}
                className="cursor-pointer px-4 py-2 space-y-1 hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 flex items-start gap-3"
              >
                <Check
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    value === item.code ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-medium">
                    {item.code} – {item.name}
                  </div>
                  <div className="text-sm text-gray-500 leading-snug">
                    {item.description}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    </div>
  )
}

// Helper function to get flow type label from code
export const getFlowTypeLabel = (code: string): string => {
  const flowType = flowTypesData.find((item: FlowType) => item.code === code)
  return flowType ? `${flowType.code} – ${flowType.name}` : code
}
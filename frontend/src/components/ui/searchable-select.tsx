"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
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

export interface SearchableSelectOption {
  value: string
  label: string
  description?: string
  category?: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  // Group options by category
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, SearchableSelectOption[]> = {}
    
    options.forEach(option => {
      const category = option.category || "Other"
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(option)
    })
    
    return groups
  }, [options])

  // Filter options based on search
  const filteredGroups = React.useMemo(() => {
    if (!search) return groupedOptions
    
    const filtered: Record<string, SearchableSelectOption[]> = {}
    
    Object.entries(groupedOptions).forEach(([category, items]) => {
      const filteredItems = items.filter(item => {
        const searchLower = search.toLowerCase()
        return (
          item.value.toLowerCase().includes(searchLower) ||
          item.label.toLowerCase().includes(searchLower) ||
          (item.description && item.description.toLowerCase().includes(searchLower))
        )
      })
      
      if (filteredItems.length > 0) {
        filtered[category] = filteredItems
      }
    })
    
    return filtered
  }, [groupedOptions, search])

  // Get selected option
  const selectedOption = options.find(option => option.value === value)

  // Handle click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current && 
        contentRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [open])

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("keydown", handleEscape)
      return () => {
        document.removeEventListener("keydown", handleEscape)
      }
    }
  }, [open])

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger 
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent 
          ref={contentRef}
          className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999]" 
          align="start"
        >
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  // Prevent command from intercepting keyboard navigation
                  e.stopPropagation()
                }}
              />
            </div>
            <CommandList>
              {Object.keys(filteredGroups).length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyText}
                </div>
              ) : (
                Object.entries(filteredGroups).map(([category, items]) => (
                  <CommandGroup key={category}>
                    {Object.keys(groupedOptions).length > 1 && (
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        {category}
                      </div>
                    )}
                    {items.map((option) => (
                      <CommandItem
                        key={option.value}
                        onSelect={() => {
                          onValueChange(option.value)
                          setOpen(false)
                          setSearch("")
                        }}
                        className="py-2.5"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === option.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col gap-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {option.value}
                            </span>
                            <span>{option.label}</span>
                          </div>
                          {option.description && (
                            <span className="text-xs text-muted-foreground pl-7">
                              {option.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedOption?.description && (
        <p className="text-xs text-muted-foreground mt-1">
          {selectedOption.description}
        </p>
      )}
    </div>
  )
} 
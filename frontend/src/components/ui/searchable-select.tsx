"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
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
  code?: string  // Optional code to display as a badge before the label
  category?: string
  icon?: React.ReactNode
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
  showValueCode?: boolean
  dropdownClassName?: string
  triggerIcon?: React.ReactNode
  open?: boolean // Controlled open state
  onOpenChange?: (open: boolean) => void // Callback when open state changes
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
  showValueCode = true,
  dropdownClassName,
  triggerIcon,
  open: controlledOpen,
  onOpenChange,
}: SearchableSelectProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value)
    }
    if (controlledOpen === undefined) {
      setInternalOpen(value)
    }
  }

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
          (item.description && item.description.toLowerCase().includes(searchLower)) ||
          (item.code && item.code.toLowerCase().includes(searchLower))
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
          <span className="truncate flex items-center gap-2">
            {triggerIcon}
            {selectedOption?.icon}
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent
          ref={contentRef}
          className={cn("min-w-[250px] p-0 z-[9999]", dropdownClassName)}
          align="start"
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  // Prevent command from intercepting keyboard navigation
                  e.stopPropagation()
                }}
                className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                autoFocus
              />
              {search && (
                <X
                  className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground shrink-0"
                  onClick={() => setSearch('')}
                />
              )}
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
                            {option.icon}
                            {showValueCode && (
                              <span className="font-mono text-xs text-muted-foreground">
                                {option.value}
                              </span>
                            )}
                            {option.code && (
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                {option.code}
                              </span>
                            )}
                            <span className="truncate">{option.label}</span>
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
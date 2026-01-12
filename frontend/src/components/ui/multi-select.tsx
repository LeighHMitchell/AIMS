"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"

export interface MultiSelectOption {
  label: string
  value: string
  group?: string
  subtitle?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  renderOption?: (option: MultiSelectOption) => React.ReactNode
  showSelectAll?: boolean
  onClear?: () => void
  selectedLabel?: string
  onOpenChange?: (open: boolean) => void
  searchable?: boolean
  searchPlaceholder?: string
  dropdownAlign?: "start" | "center" | "end"
  dropdownSide?: "top" | "right" | "bottom" | "left"
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
  disabled = false,
  renderOption,
  showSelectAll = false,
  onClear,
  selectedLabel,
  onOpenChange,
  searchable = false,
  searchPlaceholder = "Search...",
  dropdownAlign = "start",
  dropdownSide = "bottom",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const isSelectingRef = React.useRef(false)

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item))
  }

  const handleSelect = (item: string) => {
    isSelectingRef.current = true
    
    if (item === "SELECT_ALL") {
      // Select all options
      onChange(options.map(opt => opt.value))
    } else if (selected.includes(item)) {
      handleUnselect(item)
    } else {
      onChange([...selected, item])
    }
    
    // Keep popover open after selection
    setTimeout(() => {
      isSelectingRef.current = false
    }, 0)
  }
  
  const handleOpenChange = (newOpen: boolean) => {
    // Don't close if we're in the middle of selecting
    if (!newOpen && isSelectingRef.current) {
      return
    }
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onClear) {
      onClear()
    } else {
      onChange([])
    }
  }

  // Group options by their group property
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, MultiSelectOption[]> = {}

    options.forEach((option) => {
      const groupName = option.group || ""
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(option)
    })

    return groups
  }, [options])

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <div className="flex gap-1 flex-wrap truncate">
            {selected.length === 0 ? (
              <span className="text-sm text-muted-foreground">{placeholder}</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {selected.length} {selectedLabel || 'selected'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selected.length > 0 && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100 cursor-pointer"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align={dropdownAlign} side={dropdownSide} sideOffset={4}>
        <Command>
          {searchable && (
            <CommandInput placeholder={searchPlaceholder} className="h-9" />
          )}
          <CommandEmpty>No results found.</CommandEmpty>
          <div className="max-h-[300px] overflow-y-auto">
            {showSelectAll && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => handleSelect("SELECT_ALL")}
                  className="font-semibold"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.length === options.length ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Select All
                </CommandItem>
              </CommandGroup>
            )}
            {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
              <CommandGroup key={groupName || "_ungrouped"} heading={groupName || undefined}>
                {groupOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected.includes(option.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {renderOption ? renderOption(option) : option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}


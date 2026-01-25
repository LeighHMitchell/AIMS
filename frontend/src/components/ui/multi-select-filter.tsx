"use client"

import React, { useState, useMemo } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  value: string
  label: string
  code?: string
}

interface MultiSelectFilterProps {
  options: MultiSelectOption[]
  value?: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  icon?: React.ReactNode
  className?: string
  dropdownClassName?: string
  open?: boolean // Controlled open state
  onOpenChange?: (open: boolean) => void // Callback when open state changes
}

export function MultiSelectFilter({
  options,
  value = [],
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No options found.",
  icon,
  className,
  dropdownClassName,
  open: controlledOpen,
  onOpenChange,
}: MultiSelectFilterProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [search, setSearch] = useState("")
  
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
  
  // Ensure value is always an array
  const safeValue = value || []

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const query = search.toLowerCase()
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.code && opt.code.toLowerCase().includes(query))
    )
  }, [options, search])

  const toggleOption = (optionValue: string) => {
    if (safeValue.includes(optionValue)) {
      onChange(safeValue.filter((v) => v !== optionValue))
    } else {
      onChange([...safeValue, optionValue])
    }
  }

  const selectAll = () => {
    onChange(options.map((opt) => opt.value))
  }

  const clearAll = () => {
    onChange([])
  }

  const getDisplayText = () => {
    if (safeValue.length === 0) return placeholder
    if (safeValue.length === 1) {
      const selected = options.find((opt) => opt.value === safeValue[0])
      return selected?.label || safeValue[0]
    }
    return `${safeValue.length} selected`
  }

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) setSearch("")
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal", className)}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {icon}
            <span className="truncate">{getDisplayText()}</span>
          </div>
          {safeValue.length > 0 ? (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs shrink-0">
              {safeValue.length}
            </Badge>
          ) : (
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0 w-[350px]", dropdownClassName)} align="start">
        {/* Search */}
        <div className="flex items-center border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            autoFocus
          />
          {search && (
            <X
              className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground shrink-0"
              onClick={() => setSearch("")}
            />
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
          <span className="text-xs text-muted-foreground">
            {safeValue.length} of {options.length} selected
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="h-6 text-xs px-2"
            >
              Select all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-6 text-xs px-2"
              disabled={safeValue.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Options */}
        <div className="max-h-[300px] overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              {emptyText}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleOption(option.value)}
              >
                <Checkbox
                  checked={safeValue.includes(option.value)}
                  onCheckedChange={() => toggleOption(option.value)}
                />
                {option.code && (
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {option.code}
                  </span>
                )}
                <span className="text-sm truncate">{option.label}</span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

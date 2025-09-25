"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandList,
} from "@/components/ui/command"
import myanmarData from "@/data/myanmar-locations.json"

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
  const containerRef = React.useRef<HTMLDivElement | null>(null)
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
    setOpen(false)
  }

  const handleUnselect = (unitId: string) => {
    onChange(selected.filter(id => id !== unitId))
  }

  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const getSelectedUnits = () => {
    return allAdminUnits.filter(unit => selected.includes(unit.id))
  }

  const listboxId = React.useId()

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        role="combobox"
        aria-expanded={open}
        aria-disabled={disabled}
        aria-controls={open ? listboxId : undefined}
        tabIndex={disabled ? -1 : 0}
        className={cn(
          "flex w-full min-h-[40px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors",
          "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-60"
        )}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (disabled) return
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
            event.preventDefault()
            setOpen(true)
          }
          if (event.key === "Escape") {
            setOpen(false)
          }
        }}
      >
        <div className="flex-1 text-left">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <span className="text-sm font-medium">
              {selected.length} unit{selected.length !== 1 ? "s" : ""} selected
            </span>
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
      </div>

      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-2 w-full rounded-md border bg-popover shadow-md"
        >
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
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                placeholder="Search administrative units..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
            {filteredCategories.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No administrative units found.
              </div>
            ) : (
              <CommandList className="max-h-[400px] overflow-auto">
                {filteredCategories[0].units.map((unit) => {
                  const isSelected = selected.includes(unit.id)
                  const displayName = unit.fullName

                  return (
                    <div
                      key={unit.id}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      className={cn(
                        "flex cursor-pointer items-center px-6 py-3 transition-colors",
                        "hover:bg-accent/50 focus:bg-accent/50",
                        isSelected && "bg-accent"
                      )}
                      onClick={() => handleSelect(unit.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          handleSelect(unit.id)
                        }
                      }}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{displayName}</div>
                      </div>
                    </div>
                  )
                })}
              </CommandList>
            )}
          </Command>
        </div>
      )}
    </div>
  )
}

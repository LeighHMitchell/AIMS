"use client"

import * as React from "react"
import { Check, ChevronsUpDown, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"

export interface AdminUnit {
  id: string
  name: string
  type: 'state' | 'region' | 'union-territory' | 'township'
  parentName?: string
  parentId?: string
  fullName: string
  st_pcode?: string
  ts_pcode?: string
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
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set())
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  // Check if we have townships in the list
  const hasTownships = React.useMemo(() => {
    return allAdminUnits.some(u => u.type === 'township')
  }, [allAdminUnits])

  // Group units by parent state/region (only when townships are present)
  const groupedUnits = React.useMemo(() => {
    if (!hasTownships) {
      // No townships - return flat list
      return [{
        name: 'All Administrative Units',
        parentUnit: null,
        children: [...allAdminUnits].sort((a, b) => a.name.localeCompare(b.name))
      }]
    }

    // Group by parent
    const groups: Map<string, { parentUnit: AdminUnit | null; children: AdminUnit[] }> = new Map()

    // First add states/regions as group headers
    allAdminUnits
      .filter(u => u.type !== 'township')
      .forEach(unit => {
        groups.set(unit.name, {
          parentUnit: unit,
          children: []
        })
      })

    // Then add townships under their parents
    allAdminUnits
      .filter(u => u.type === 'township')
      .forEach(unit => {
        const parentName = unit.parentName
        if (parentName && groups.has(parentName)) {
          groups.get(parentName)!.children.push(unit)
        }
      })

    // Sort children within each group
    groups.forEach(group => {
      group.children.sort((a, b) => a.name.localeCompare(b.name))
    })

    // Convert to array and sort by parent name
    return Array.from(groups.entries())
      .map(([name, data]) => ({
        name,
        ...data
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allAdminUnits, hasTownships])

  // Filter based on search
  const filteredGroups = React.useMemo(() => {
    if (!searchQuery.trim()) return groupedUnits

    const query = searchQuery.toLowerCase().trim()

    return groupedUnits
      .map(group => {
        // Check if parent matches
        const parentMatches = group.parentUnit?.name.toLowerCase().includes(query) ||
                            group.parentUnit?.fullName.toLowerCase().includes(query)

        // Filter children that match
        const matchingChildren = group.children.filter(child =>
          child.name.toLowerCase().includes(query) ||
          child.fullName.toLowerCase().includes(query)
        )

        // Include group if parent matches or any children match
        if (parentMatches || matchingChildren.length > 0) {
          return {
            ...group,
            // If searching, show all matching children
            children: parentMatches ? group.children : matchingChildren,
            // Auto-expand when searching
            expanded: true
          }
        }
        return null
      })
      .filter((group): group is NonNullable<typeof group> => group !== null)
  }, [groupedUnits, searchQuery])

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
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

  // Count selected by type
  const selectedCounts = React.useMemo(() => {
    let regions = 0
    let townships = 0
    selected.forEach(id => {
      const unit = allAdminUnits.find(u => u.id === id)
      if (unit?.type === 'township') {
        townships++
      } else if (unit) {
        regions++
      }
    })
    return { regions, townships }
  }, [selected, allAdminUnits])

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
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selected.length} unit{selected.length !== 1 ? "s" : ""} selected
              </span>
              {selectedCounts.townships > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedCounts.townships} township{selectedCounts.townships !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
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
          <Command>
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
            {filteredGroups.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No administrative units found.
              </div>
            ) : (
              <CommandList className="max-h-[400px] overflow-auto">
                {hasTownships ? (
                  // Grouped view with collapsible state/regions
                  filteredGroups.map((group) => {
                    const isExpanded = searchQuery.trim() || expandedGroups.has(group.name)
                    const parentUnit = group.parentUnit
                    const isParentSelected = parentUnit ? selected.includes(parentUnit.id) : false
                    const hasSelectedChildren = group.children.some(c => selected.includes(c.id))

                    return (
                      <div key={group.name} className="border-b last:border-b-0">
                        {/* Parent State/Region */}
                        {parentUnit && (
                          <div
                            className={cn(
                              "flex items-center px-3 py-2 cursor-pointer transition-colors",
                              "hover:bg-accent/50",
                              isParentSelected && "bg-accent"
                            )}
                          >
                            {/* Expand/collapse button */}
                            {group.children.length > 0 && (
                              <button
                                type="button"
                                className="p-1 mr-1 hover:bg-accent rounded"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleGroup(group.name)
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            {group.children.length === 0 && <div className="w-6" />}

                            {/* Checkbox for parent */}
                            <div
                              role="option"
                              aria-selected={isParentSelected}
                              className="flex-1 flex items-center py-1"
                              onClick={() => handleSelect(parentUnit.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault()
                                  handleSelect(parentUnit.id)
                                }
                              }}
                              tabIndex={0}
                            >
                              <Check
                                className={cn("mr-2 h-4 w-4", isParentSelected ? "opacity-100" : "opacity-0")}
                                aria-hidden="true"
                              />
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{parentUnit.name}</span>
                                {hasSelectedChildren && !isParentSelected && (
                                  <Badge variant="outline" className="text-xs">
                                    {group.children.filter(c => selected.includes(c.id)).length} townships
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Children (townships) */}
                        {isExpanded && group.children.length > 0 && (
                          <div className="bg-muted/30">
                            {group.children.map((unit) => {
                              const isSelected = selected.includes(unit.id)
                              return (
                                <div
                                  key={unit.id}
                                  role="option"
                                  aria-selected={isSelected}
                                  tabIndex={0}
                                  className={cn(
                                    "flex cursor-pointer items-center pl-10 pr-6 py-2 transition-colors",
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
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{unit.name}</span>
                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                      Township
                                    </Badge>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  // Flat list view (no townships)
                  filteredGroups[0]?.children.map((unit) => {
                    const isSelected = selected.includes(unit.id)
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
                          <div className="text-sm font-medium text-foreground">{unit.fullName}</div>
                        </div>
                      </div>
                    )
                  })
                )}
              </CommandList>
            )}
          </Command>
        </div>
      )}
    </div>
  )
}

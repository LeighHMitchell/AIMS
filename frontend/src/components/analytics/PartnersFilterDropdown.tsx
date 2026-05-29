"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown, Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface PartnerOption {
  key: string
  name: string
  acronym?: string | null
}

interface PartnersFilterDropdownProps {
  options: PartnerOption[]
  /** Selected keys; `null` means "all selected" (the default). */
  selected: string[] | null
  onChange: (next: string[]) => void
  triggerClassName?: string
  /** Trigger label, e.g. "Partners" (default) or "Development Partners". */
  label?: string
}

/**
 * Searchable Development-Partner checklist — the dropdown originally inline in
 * the Financial Totals chart. Trigger shows "Partners (selected/total)"; the
 * body has Select all / Clear, a search box, and a scrollable checkbox list
 * rendering each partner as "Full Name (Acronym)". `selected = null` means all.
 */
export function PartnersFilterDropdown({
  options,
  selected,
  onChange,
  triggerClassName,
  label = 'Partners',
}: PartnersFilterDropdownProps) {
  const [search, setSearch] = useState('')
  const allKeys = options.map(o => o.key)
  const effective = selected ?? allKeys

  const toggle = (key: string) => {
    onChange(effective.includes(key) ? effective.filter(k => k !== key) : [...effective, key])
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? options.filter(p => p.name.toLowerCase().includes(q) || (p.acronym || '').toLowerCase().includes(q))
    : options

  return (
    <DropdownMenu onOpenChange={(open) => { if (!open) setSearch('') }}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-8', triggerClassName)}>
          {label} ({selected?.length ?? options.length}/{options.length})
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-96 p-2" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b border-border">
          <span className="text-helper font-semibold text-foreground">Development Partners</span>
          <div className="flex gap-1">
            <button
              onClick={() => onChange(allKeys)}
              className="text-xs font-medium text-primary hover:text-primary/80 px-1.5 py-0.5 rounded hover:bg-muted"
            >
              Select all
            </button>
            <button
              onClick={() => onChange([])}
              className="text-xs font-medium text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="relative mb-2">
          <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search partners..."
            className="h-8 pl-8 text-body"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="space-y-1 max-h-[320px] overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-2 py-3 text-body text-muted-foreground text-center">No matching partners</div>
          ) : (
            filtered.map(p => {
              const isSelected = effective.includes(p.key)
              return (
                <div
                  key={p.key}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                  onClick={() => toggle(p.key)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(p.key)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-body text-foreground truncate">
                    {p.acronym ? `${p.name} (${p.acronym})` : p.name}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

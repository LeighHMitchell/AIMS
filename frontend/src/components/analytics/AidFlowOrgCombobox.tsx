"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface AidFlowOrgOption {
  id: string
  name: string
  acronym?: string | null
}

interface AidFlowOrgComboboxProps {
  organizations: AidFlowOrgOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

// Renders an organisation as a single uniform string — full name with the
// acronym in parentheses, all in the same font, weight, colour and size.
// (No badges, no two-line layout, no logo chrome.)
function formatOrg(o: AidFlowOrgOption): string {
  if (o.acronym && o.acronym !== o.name) return `${o.name} (${o.acronym})`
  return o.name
}

export function AidFlowOrgCombobox({
  organizations,
  value,
  onValueChange,
  placeholder = "Search organisations...",
  className,
}: AidFlowOrgComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      const id = setTimeout(() => searchInputRef.current?.focus(), 0)
      return () => clearTimeout(id)
    }
  }, [open])

  const selected = organizations.find(o => o.id === value)

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return organizations
    return organizations.filter(o =>
      o.name.toLowerCase().includes(q) ||
      (o.acronym && o.acronym.toLowerCase().includes(q))
    )
  }, [organizations, search])

  const handleSelect = (id: string) => {
    onValueChange(id)
    setOpen(false)
    setSearch("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full h-10 justify-between bg-white font-normal text-body",
            className
          )}
        >
          <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
            {selected ? formatOrg(selected) : placeholder}
          </span>
          <span className="flex items-center gap-1 ml-2">
            {selected && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  onValueChange('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    onValueChange('')
                  }
                }}
                className="h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer"
                aria-label="Clear selection"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[280px]"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={searchInputRef}
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full bg-transparent py-3 text-body outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-body text-muted-foreground">No organisations found</div>
          ) : (
            filtered.map(o => (
              <div
                key={o.id}
                role="option"
                onClick={() => handleSelect(o.id)}
                className={cn(
                  "px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-accent/50",
                  value === o.id && "bg-accent"
                )}
              >
                <Check className={cn("h-4 w-4 shrink-0", value === o.id ? "opacity-100" : "opacity-0")} />
                {/* Single uniform span — name + acronym share font, weight,
                    colour, and size. Wraps onto multiple lines if needed. */}
                <span className="text-body text-foreground font-normal whitespace-normal break-words">
                  {formatOrg(o)}
                </span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

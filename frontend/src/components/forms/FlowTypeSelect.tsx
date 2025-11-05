"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandItem,
  CommandList,
  CommandGroup,
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
  group?: string
}

type Option = {
  code: string;
  name: string;
  description: string;
  group: string;
};

const allOptions: Option[] = flowTypesData.map(type => ({
  code: type.code,
  name: type.name,
  description: type.description,
  group: type.group || 'Other'
}));

interface FlowTypeSelectProps {
  value?: string | null | undefined
  onValueChange?: (value: string | null) => void
  placeholder?: string
  id?: string
  disabled?: boolean
  className?: string
}

export function FlowTypeSelect({
  value,
  onValueChange,
  placeholder = "Select Default Flow Type",
  id,
  disabled = false,
  className
}: FlowTypeSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const popoverRef = useRef<HTMLDivElement>(null)

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

  const selectedOption = allOptions.find(option => option.code === value)

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return allOptions;
    const query = searchQuery.toLowerCase();
    return allOptions.filter(option => 
      option.code.toLowerCase().includes(query) ||
      option.name.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query) ||
      query.replace('#', '') === option.code
    );
  }, [searchQuery]);

  const groupedOptions = useMemo(() => {
    const groups: { [key: string]: Option[] } = {};
    filteredOptions.forEach(option => {
      if (!groups[option.group]) {
        groups[option.group] = [];
      }
      groups[option.group].push(option);
    });
    return groups;
  }, [filteredOptions]);

  const COMMONLY_USED_FLOW_CODES = ["10"];
  const commonlyUsedFlowTypes = filteredOptions.filter(opt => COMMONLY_USED_FLOW_CODES.includes(opt.code));
  const otherGroupedOptions = Object.entries(groupedOptions).reduce((acc, [group, options]) => {
    acc[group] = options.filter(opt => !COMMONLY_USED_FLOW_CODES.includes(opt.code));
    return acc;
  }, {} as typeof groupedOptions);

  return (
    <div className={cn("relative w-full", className)} ref={popoverRef}>
      <Popover 
        open={open} 
        onOpenChange={(newOpen) => {
          setOpen(newOpen)
          if (!newOpen) {
            setSearchQuery("")
          }
        }}
      >
        <PopoverTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            !selectedOption && "text-muted-foreground"
          )}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
        >
          <span className="truncate">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-mono text-foreground bg-gray-200 px-1.5 py-0.5 rounded">{selectedOption.code}</span>
                <span className="font-medium">{selectedOption.name}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-2">
            {selectedOption && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange?.(null);
                }}
                className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                aria-label="Clear selection"
              >
                <span className="text-xs">×</span>
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border bottom-full"
          align="start"
          sideOffset={4}
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search flow types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                    setSearchQuery("");
                  }
                }}
                className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 focus:border-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                  aria-label="Clear search"
                >
                  <span className="text-xs">×</span>
                </button>
              )}
            </div>
            <CommandList>
              {commonlyUsedFlowTypes.length > 0 && (
                <CommandGroup>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                    Commonly Used
                  </div>
                  {commonlyUsedFlowTypes.map(option => (
                    <CommandItem
                      key={option.code}
                      onSelect={() => {
                        onValueChange?.(option.code === value ? null : option.code);
                        setOpen(false);
                        setSearchQuery("");
                      }}
                      className="pl-6 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-foreground bg-gray-200 px-1.5 py-0.5 rounded">{option.code}</span>
                          <span className="font-medium text-foreground">{option.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                          {option.description}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {Object.entries(otherGroupedOptions).map(([groupName, options]) => options.length > 0 && (
                <CommandGroup key={groupName}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                    {groupName}
                  </div>
                  {options.map((option) => (
                    <CommandItem
                      key={option.code}
                      onSelect={() => {
                        onValueChange?.(option.code === value ? null : option.code);
                        setOpen(false);
                        setSearchQuery("");
                      }}
                      className="pl-6 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-foreground bg-gray-200 px-1.5 py-0.5 rounded">{option.code}</span>
                          <span className="font-medium text-foreground">{option.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                          {option.description}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              {Object.keys(groupedOptions).length === 0 && (
                <div className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">
                    No flow types found.
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Try adjusting your search terms
                  </div>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export const getFlowTypeLabel = (code: string): string => {
  const flowType = allOptions.find((item: Option) => item.code === code)
  return flowType ? `${flowType.code} – ${flowType.name}` : code
}
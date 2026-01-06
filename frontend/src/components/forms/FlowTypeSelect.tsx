"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  /** Controlled open state */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
}

export function FlowTypeSelect({
  value,
  onValueChange,
  placeholder = "Select Default Flow Type",
  id,
  disabled = false,
  className,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}: FlowTypeSelectProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
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
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal px-4 py-2 text-base h-10 border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 hover:text-gray-900",
              !selectedOption && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selectedOption ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedOption.code}</span>
                  <span className="font-medium text-sm text-gray-900">{selectedOption.name}</span>
                </span>
              ) : (
                <span className="text-gray-400 text-sm">{placeholder}</span>
              )}
            </span>
            <div className="flex items-center gap-1 ml-2">
              {selectedOption && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onValueChange?.(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      onValueChange?.(null);
                    }
                  }}
                  className="h-4 w-4 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Clear selection"
                >
                  <X className="h-3 w-3 text-gray-500" />
                </span>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border bottom-full"
          align="start"
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
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
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                autoFocus
              />
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
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{option.code}</span>
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
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{option.code}</span>
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
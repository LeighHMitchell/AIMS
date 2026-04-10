"use client";

import React from "react";
import { ChevronsUpDown, Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import financeTypes from "@/data/finance-types.json";

interface FinanceType {
  code: string;
  name: string;
  description: string;
  group: string;
  withdrawn?: boolean;
}

interface FinanceTypeSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

const allOptions: FinanceType[] = financeTypes;

export function FinanceTypeSelect({
  value,
  onChange,
  placeholder = "Select finance type...",
  disabled = false,
  className,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: FinanceTypeSelectProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  
  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedOption = allOptions.find(option => option.code === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return allOptions;
    const query = searchQuery.toLowerCase();
    return allOptions.filter(option =>
      option.code.toLowerCase().includes(query) ||
      option.name.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const groupedOptions = React.useMemo(() => {
    const groups: { [key: string]: FinanceType[] } = {};
    filteredOptions.forEach(option => {
      if (!groups[option.group]) {
        groups[option.group] = [];
      }
      groups[option.group].push(option);
    });
    return groups;
  }, [filteredOptions]);


  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal px-3 py-2 text-sm h-10 border-input hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:text-foreground",
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
                <span className="text-muted-foreground text-sm">{placeholder}</span>
              )}
            </span>
            <div className="flex items-center gap-1 ml-2">
              {selectedOption && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={e => {
                    e.stopPropagation();
                    onChange?.("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      onChange?.("");
                    }
                  }}
                  className="h-4 w-4 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Clear selection"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </span>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border"
          align="start"
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search finance types..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Escape") {
                    setOpen(false);
                    setSearchQuery("");
                  }
                }}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                autoFocus
              />
            </div>
            <CommandList>
              {Object.entries(groupedOptions).map(([groupName, options]) => options.length > 0 && (
                <CommandGroup key={groupName}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                    {groupName}
                  </div>
                  {options.map(option => (
                    <CommandItem
                      key={option.code}
                      onSelect={() => {
                        if (!option.withdrawn) {
                          onChange?.(option.code);
                          setOpen(false);
                          setSearchQuery("");
                        }
                      }}
                      className={cn(
                        "cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors",
                        option.withdrawn && "opacity-50 pointer-events-none bg-muted",
                        value === option.code && "bg-accent"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded inline-block mr-1.5">{option.code}</span>
                          <span className="text-foreground">{option.name}</span>
                          {option.withdrawn && (
                            <span className="ml-2 text-xs text-red-500">Withdrawn</span>
                          )}
                        </div>
                        {option.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              {Object.keys(groupedOptions).length === 0 && (
                <div className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">
                    No finance types found.
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
  );
} 
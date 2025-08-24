"use client";

import React from "react";
import { ChevronsUpDown, Check, Search } from "lucide-react";
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
}

const allOptions: FinanceType[] = financeTypes;

export function FinanceTypeSelect({
  value,
  onChange,
  placeholder = "Select finance type...",
  disabled = false,
  className,
}: FinanceTypeSelectProps) {
  const [open, setOpen] = React.useState(false);
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

  const COMMONLY_USED_FINANCE_CODES = ["110", "421"];
  const commonlyUsedFinanceTypes = filteredOptions.filter(opt => COMMONLY_USED_FINANCE_CODES.includes(opt.code));
  const otherGroupedOptions = Object.entries(groupedOptions).reduce((acc, [group, options]) => {
    acc[group] = options.filter(opt => !COMMONLY_USED_FINANCE_CODES.includes(opt.code));
    return acc;
  }, {} as typeof groupedOptions);

  return (
    <div className={cn("pb-6", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
            !selectedOption && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedOption.code}</span>
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
                onClick={e => {
                  e.stopPropagation();
                  onChange?.("");
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
                placeholder="Search finance types..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Escape") {
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
              {commonlyUsedFinanceTypes.length > 0 && (
                <CommandGroup>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                    Commonly Used
                  </div>
                  {commonlyUsedFinanceTypes.map(option => (
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
                        "pl-6 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors",
                        option.withdrawn && "opacity-50 pointer-events-none bg-muted"
                      )}
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
                          {option.withdrawn && (
                            <span className="ml-2 text-xs text-red-500">Withdrawn</span>
                          )}
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
                        "pl-6 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors",
                        option.withdrawn && "opacity-50 pointer-events-none bg-muted"
                      )}
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
                          {option.withdrawn && (
                            <span className="ml-2 text-xs text-red-500">Withdrawn</span>
                          )}
                        </div>

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
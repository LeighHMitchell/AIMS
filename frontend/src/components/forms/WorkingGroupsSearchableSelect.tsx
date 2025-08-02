"use client";

import React from "react";
import { ChevronsUpDown, Check, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { WORKING_GROUPS, groupWorkingGroupsBySector, WorkingGroup } from "@/lib/workingGroups";

interface WorkingGroupsSearchableSelectProps {
  value?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function WorkingGroupsSearchableSelect({
  value = [],
  onValueChange,
  placeholder = "Select working groups...",
  disabled = false,
  className,
}: WorkingGroupsSearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedGroups = value.map(code => WORKING_GROUPS.find(wg => wg.code === code)).filter(Boolean) as WorkingGroup[];

  const filteredGroups = React.useMemo(() => {
    if (!searchQuery) return WORKING_GROUPS;
    
    const query = searchQuery.toLowerCase();
    return WORKING_GROUPS.filter(wg => 
      wg.code.toLowerCase().includes(query) ||
      wg.label.toLowerCase().includes(query) ||
      (wg.description && wg.description.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const groupedOptions = React.useMemo(() => {
    const grouped = groupWorkingGroupsBySector();
    const filteredGrouped: Record<string, WorkingGroup[]> = {};
    
    Object.entries(grouped).forEach(([sectorName, groups]) => {
      const filteredGroupsInSector = groups.filter(wg => filteredGroups.includes(wg));
      if (filteredGroupsInSector.length > 0) {
        filteredGrouped[sectorName] = filteredGroupsInSector;
      }
    });
    
    return filteredGrouped;
  }, [filteredGroups]);

  const toggleWorkingGroup = (code: string) => {
    const newValue = value.includes(code) 
      ? value.filter(c => c !== code)
      : [...value, code];
    onValueChange?.(newValue);
  };

  const clearSelection = () => {
    onValueChange?.([]);
  };

  return (
    <div className={cn("pb-6", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
            selectedGroups.length === 0 && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedGroups.length > 0 ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {selectedGroups.length}
                </span>
                <span className="font-medium">
                  {selectedGroups.length === 1 
                    ? selectedGroups[0].label 
                    : `${selectedGroups.length} groups selected`
                  }
                </span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-2">
            {selectedGroups.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                aria-label="Clear all selections"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] min-w-[400px] p-0 shadow-lg border"
          align="start"
          sideOffset={4}
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search working groups..."
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
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <CommandList className="max-h-80">
              {Object.entries(groupedOptions).map(([sectorName, groups]) => (
                <CommandGroup key={sectorName}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                    {sectorName}
                  </div>
                  {groups.map((wg) => (
                    <CommandItem
                      key={wg.code}
                      onSelect={() => toggleWorkingGroup(wg.code)}
                      className="pl-6 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.includes(wg.code) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {wg.code}
                          </span>
                          <span className="font-medium text-foreground">{wg.label}</span>
                        </div>
                        {wg.description && (
                          <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                            {wg.description}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              {Object.keys(groupedOptions).length === 0 && (
                <div className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">
                    No working groups found.
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

// Export types for use elsewhere
export type { WorkingGroupsSearchableSelectProps }; 
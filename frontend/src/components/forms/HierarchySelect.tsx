"use client";

import React from "react";
import { ChevronsUpDown, Check, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useDropdownState } from "@/contexts/DropdownContext";

type HierarchyOption = {
  level: number;
  name: string;
  description: string;
};

// Per IATI, @hierarchy is just a depth number that each reporting organisation
// defines for itself — there is no IATI codelist or fixed labels. The names below
// are neutral; the descriptions give *examples only*, not standard definitions.

/** Neutral, depth-based names for IATI @hierarchy. Single source of truth — also used by the IATI import preview. */
export const HIERARCHY_LEVEL_NAMES: Record<string, string> = {
  "1": "Top level",
  "2": "Second level",
  "3": "Third level",
  "4": "Fourth level",
  "5": "Fifth level",
};

/** Returns the neutral level name, falling back to "Level N" for out-of-range depths (IATI sets no maximum). */
export function getHierarchyLevelName(level: number | string): string {
  return HIERARCHY_LEVEL_NAMES[String(level)] || `Level ${level}`;
}

const HIERARCHY_LEVELS: HierarchyOption[] = [
  {
    level: 1,
    name: HIERARCHY_LEVEL_NAMES["1"],
    description: "The highest level in your organisation's structure, e.g. an overarching programme or strategy."
  },
  {
    level: 2,
    name: HIERARCHY_LEVEL_NAMES["2"],
    description: "One level below the top, e.g. a sub-programme or country project."
  },
  {
    level: 3,
    name: HIERARCHY_LEVEL_NAMES["3"],
    description: "For example, a specific project or implementation component."
  },
  {
    level: 4,
    name: HIERARCHY_LEVEL_NAMES["4"],
    description: "For example, a sub-component or work package."
  },
  {
    level: 5,
    name: HIERARCHY_LEVEL_NAMES["5"],
    description: "A more detailed level, e.g. a task or output."
  }
];

interface HierarchySelectProps {
  value?: number;
  onValueChange?: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownId?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function HierarchySelect({
  value,
  onValueChange,
  placeholder = "Select hierarchy level...",
  disabled = false,
  className,
  dropdownId = "hierarchy-select",
  side,
  align = "start",
}: HierarchySelectProps) {
  const { isOpen, setOpen } = useDropdownState(dropdownId);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedOption = HIERARCHY_LEVELS.find(option => option.level === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return HIERARCHY_LEVELS;
    
    const query = searchQuery.toLowerCase();
    return HIERARCHY_LEVELS.filter(option => 
      option.level.toString().includes(query) ||
      option.name.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className={cn("pb-6", className)}>
      <Popover open={isOpen} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
            !selectedOption && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Level {selectedOption.level}</span>
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
                  onValueChange?.(undefined); // Clear the selection (IATI @hierarchy is optional, no default)
                }}
                className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                aria-label="Clear selection"
              >
                <span className="text-helper">×</span>
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border"
          align={align}
          side={side}
          sideOffset={4}
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search hierarchy levels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                    setSearchQuery("");
                  }
                }}
                className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-body outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 focus:border-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                  aria-label="Clear search"
                >
                  <span className="text-helper">×</span>
                </button>
              )}
            </div>
            <CommandList>
              <div className="px-3 py-2 text-helper text-muted-foreground border-b bg-muted/30 leading-relaxed">
                Levels are defined by your organisation; IATI sets no fixed names. Level 1 is the top; deeper levels are sub-activities. Pair this with a Parent/Child link on the Linked Activities tab.
              </div>
              <CommandGroup className="p-0">
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.level}
                    onSelect={() => {
                      onValueChange?.(option.level);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    className="cursor-pointer py-3 px-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors rounded-none"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Level {option.level}</span>
                        <span className="font-medium text-foreground">{option.name}</span>
                      </div>
                      <div className="text-body text-muted-foreground mt-1.5 leading-relaxed">
                        {option.description}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {filteredOptions.length === 0 && (
                <div className="py-8 text-center">
                  <div className="text-body text-muted-foreground">
                    No hierarchy levels found.
                  </div>
                  <div className="text-helper text-muted-foreground mt-1">
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

export type { HierarchySelectProps };


"use client";

import * as React from "react";
import { ChevronsUpDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Command, CommandGroup, CommandItem, CommandList } from "./command";
import { useDropdownState, DropdownContext } from "@/contexts/DropdownContext";

export interface EnhancedSelectOption {
  code: string;
  name: string;
  description?: string;
}

export interface EnhancedSelectGroup {
  label: string;
  options: EnhancedSelectOption[];
}

interface EnhancedSearchableSelectProps {
  groups: EnhancedSelectGroup[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  emptyStateMessage?: string;
  emptyStateSubMessage?: string;
  dropdownId?: string; // Unique identifier for this dropdown instance
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function EnhancedSearchableSelect({
  groups,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  className,
  emptyStateMessage = "No options found.",
  emptyStateSubMessage = "Try adjusting your search terms",
  dropdownId = "enhanced-searchable-select",
  side,
  align = "start",
}: EnhancedSearchableSelectProps) {
  // Use shared dropdown state if dropdownId is provided
  const [localIsOpen, setLocalIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Use dropdown context if available, otherwise use local state
  const dropdownContext = React.useContext(DropdownContext);
  const { isOpen, setOpen } = dropdownContext && dropdownId !== "enhanced-searchable-select" ? useDropdownState(dropdownId) : {
    isOpen: localIsOpen,
    setOpen: setLocalIsOpen
  };

  // Flatten all options for search and selection
  const allOptions = React.useMemo(
    () => groups.flatMap(g => g.options.map(o => ({ ...o, group: g.label }))),
    [groups]
  );

  const selectedOption = allOptions.find(opt => opt.code === value);

  // Filter groups based on search query
  const filteredGroups = React.useMemo(() => {
    if (!search) return groups;
    
    const query = search.toLowerCase();
    return groups
      .map(group => ({
        ...group,
        options: group.options.filter(
          option =>
            option.code.toLowerCase().includes(query) ||
            option.name.toLowerCase().includes(query) ||
            (option.description && option.description.toLowerCase().includes(query)) ||
            query.replace('#', '') === option.code // Support searching with # prefix
        ),
      }))
      .filter(group => group.options.length > 0);
  }, [groups, search]);

  const handleSelect = (optionCode: string) => {
    onValueChange(optionCode);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange("");
  };

  const handleSearchClear = () => {
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <div className={cn("pb-6", className)}>
      <Popover open={isOpen} onOpenChange={setOpen}>
        <PopoverTrigger
          data-popover-trigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors cursor-pointer",
            !selectedOption && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {selectedOption.code}
                </span>
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
                onClick={handleClear}
                className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                aria-label="Clear selection"
                tabIndex={-1}
              >
                <span className="text-xs">×</span>
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border"
          align={align}
          sideOffset={4}
        >
          <Command>
            {/* Search Input */}
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 focus:border-none"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                  aria-label="Clear search"
                  tabIndex={-1}
                >
                  <span className="text-xs">×</span>
                </button>
              )}
            </div>

            <CommandList>
              {filteredGroups.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">
                    {emptyStateMessage}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {emptyStateSubMessage}
                  </div>
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <CommandGroup key={group.label}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {group.label}
                    </div>
                    {group.options.map((option) => (
                      <CommandItem
                        key={option.code}
                        onSelect={() => handleSelect(option.code)}
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
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {option.code}
                            </span>
                            <span className="text-foreground">
                              {option.name.replace(new RegExp(`^${option.code}\\s*-?\\s*`), "")}
                            </span>
                          </div>
                          {option.description && (
                            <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Helper function to transform your existing data structures
// Types are already exported above with the interface declarations
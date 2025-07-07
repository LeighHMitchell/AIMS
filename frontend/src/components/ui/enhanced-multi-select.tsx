import React from "react";
import { ChevronsUpDown, Search, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Badge } from "./badge";

export interface EnhancedMultiSelectOption {
  code: string;
  name: string;
  description?: string;
}

export interface EnhancedMultiSelectGroup {
  label: string;
  options: EnhancedMultiSelectOption[];
}

interface EnhancedMultiSelectProps {
  groups: EnhancedMultiSelectGroup[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export function EnhancedMultiSelect({
  groups,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  className,
}: EnhancedMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Flatten all options for search and selection
  const allOptions = React.useMemo(
    () => groups.flatMap(g => g.options.map(o => ({ ...o, group: g.label }))),
    [groups]
  );

  const selectedOptions = allOptions.filter(opt => value.includes(opt.code));

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
            query.replace('#', '') === option.code
        ),
      }))
      .filter(group => group.options.length > 0);
  }, [groups, search]);

  const handleToggle = (optionCode: string) => {
    if (value.includes(optionCode)) {
      onValueChange(value.filter(code => code !== optionCode));
    } else {
      onValueChange([...value, optionCode]);
    }
  };

  const handleRemoveChip = (optionCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(value.filter(code => code !== optionCode));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange([]);
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          data-popover-trigger
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors flex-wrap gap-2",
            !selectedOptions.length && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 items-center min-h-[1.5rem] flex-1">
            {selectedOptions.length > 0 ? (
              selectedOptions.map(opt => (
                <Badge key={opt.code} variant="secondary" className="flex items-center gap-1 px-2 py-0.5 text-xs font-mono">
                  {opt.code}
                  <button
                    type="button"
                    className="ml-1 p-0.5 rounded hover:bg-muted-foreground/20"
                    onClick={e => handleRemoveChip(opt.code, e)}
                    tabIndex={-1}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            {selectedOptions.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                aria-label="Clear all selections"
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
          align="start"
          sideOffset={4}
        >
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

          {/* Options List */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-sm text-muted-foreground">
                  No options found.
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search terms
                </div>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.label}>
                  {/* Group Header */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                    {group.label}
                  </div>
                  {/* Group Options */}
                  {group.options.map((option) => {
                    const isSelected = value.includes(option.code);
                    return (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() => handleToggle(option.code)}
                        className={cn(
                          "pl-6 pr-3 py-3 w-full text-left cursor-pointer transition-colors flex items-start gap-2 hover:bg-accent/50 focus:bg-accent focus:outline-none",
                          isSelected && "bg-accent"
                        )}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 mt-1 flex-shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                              {option.code}
                            </span>
                            <span className="font-medium text-foreground truncate">
                              {option.name.replace(new RegExp(`^${option.code}\\s*-?\\s*`), "")}
                            </span>
                          </div>
                          {option.description && (
                            <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 
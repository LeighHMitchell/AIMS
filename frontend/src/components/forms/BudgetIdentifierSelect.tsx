"use client";

import React from "react";
import { ChevronsUpDown, Check, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import budgetIdentifiersData from "@/data/budget-identifiers.json";
import { useDropdownState } from "@/contexts/DropdownContext";

interface BudgetIdentifier {
  code: string;
  name: string;
  description: string;
  category: string;
  categoryName: string;
}

interface BudgetIdentifierSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  vocabulary: string; // The selected vocabulary code
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownId?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function BudgetIdentifierSelect({
  value,
  onValueChange,
  vocabulary,
  placeholder = "Select or enter budget identifier code...",
  disabled = false,
  className,
  dropdownId = "budget-identifier-select",
  side,
  align = "start",
}: BudgetIdentifierSelectProps) {
  const { isOpen, setOpen } = useDropdownState(dropdownId);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [freeTextValue, setFreeTextValue] = React.useState(value || "");

  const budgetIdentifiers = budgetIdentifiersData as BudgetIdentifier[];

  // For vocabulary 1 (IATI), use the codelist; for others, allow free text
  const useCodelist = vocabulary === '1';

  const selectedOption = useCodelist 
    ? budgetIdentifiers.find(option => option.code === value)
    : null;

  const filteredOptions = React.useMemo(() => {
    if (!useCodelist) return [];
    if (!searchQuery) return budgetIdentifiers;
    
    const query = searchQuery.toLowerCase();
    return budgetIdentifiers.filter(option => 
      option.code.toLowerCase().includes(query) ||
      option.name.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query) ||
      option.categoryName.toLowerCase().includes(query)
    );
  }, [searchQuery, useCodelist, budgetIdentifiers]);

  // Group options by category
  const groupedOptions = React.useMemo(() => {
    if (!useCodelist) return {};
    
    const groups: { [key: string]: BudgetIdentifier[] } = {};
    filteredOptions.forEach(option => {
      const categoryKey = option.categoryName || 'Other';
      if (!groups[categoryKey]) {
        groups[categoryKey] = [];
      }
      groups[categoryKey].push(option);
    });
    return groups;
  }, [filteredOptions, useCodelist]);

  // For free text vocabularies (2-5)
  if (!useCodelist) {
    return (
      <div className={cn("space-y-2", className)}>
        <input
          type="text"
          value={freeTextValue}
          onChange={(e) => {
            setFreeTextValue(e.target.value);
            onValueChange?.(e.target.value);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          {vocabulary === '2' && 'Enter the budget code from your country\'s chart of accounts'}
          {vocabulary === '3' && 'Enter the budget code from your country\'s budget system'}
          {vocabulary === '4' && 'Enter the budget code from your organization\'s classification system'}
          {vocabulary === '5' && 'Enter the budget code from your custom vocabulary'}
        </p>
      </div>
    );
  }

  // For vocabulary 1 (IATI codelist)
  return (
    <div className={cn("pb-6", className)}>
      <Popover open={isOpen} onOpenChange={setOpen}>
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
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange?.("");
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
          className="w-[var(--radix-popover-trigger-width)] min-w-[400px] max-h-[400px] p-0 shadow-lg border overflow-hidden"
          align={align}
          side={side}
          sideOffset={4}
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search budget identifiers..."
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
            <CommandList className="max-h-[320px] overflow-y-auto">
              {Object.entries(groupedOptions).map(([categoryName, options]) => (
                <CommandGroup key={categoryName}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                    {categoryName}
                  </div>
                  {options.map((option) => (
                    <CommandItem
                      key={option.code}
                      onSelect={() => {
                        onValueChange?.(option.code);
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
                    No budget identifiers found.
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

export type { BudgetIdentifierSelectProps };


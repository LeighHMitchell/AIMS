"use client";

import React, { useEffect, useState } from "react";
import { ChevronsUpDown, Check, Search, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import budgetIdentifiersData from "@/data/budget-identifiers.json";
import { useDropdownState } from "@/contexts/DropdownContext";
import { BudgetClassification, CLASSIFICATION_TYPE_LABELS } from "@/types/aid-on-budget";

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

  // State for budget classifications (vocabulary 2)
  const [budgetClassifications, setBudgetClassifications] = useState<BudgetClassification[]>([]);
  const [loadingClassifications, setLoadingClassifications] = useState(false);

  const budgetIdentifiers = budgetIdentifiersData as BudgetIdentifier[];

  // Determine which mode to use
  const useIATICodelist = vocabulary === '1';
  const useCountryChartOfAccounts = vocabulary === '2';
  const useFreeText = !useIATICodelist && !useCountryChartOfAccounts;

  // Fetch budget classifications when vocabulary is '2'
  useEffect(() => {
    if (useCountryChartOfAccounts) {
      setLoadingClassifications(true);
      fetch('/api/admin/budget-classifications?flat=true')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setBudgetClassifications(data.data);
          }
        })
        .catch(err => {
          console.error('Error fetching budget classifications:', err);
        })
        .finally(() => {
          setLoadingClassifications(false);
        });
    }
  }, [useCountryChartOfAccounts]);

  // Find selected option based on vocabulary
  const selectedOption = useIATICodelist
    ? budgetIdentifiers.find(option => option.code === value)
    : null;

  const selectedClassification = useCountryChartOfAccounts
    ? budgetClassifications.find(c => c.code === value)
    : null;

  // Filter IATI options
  const filteredOptions = React.useMemo(() => {
    if (!useIATICodelist) return [];
    if (!searchQuery) return budgetIdentifiers;

    const query = searchQuery.toLowerCase();
    return budgetIdentifiers.filter(option =>
      option.code.toLowerCase().includes(query) ||
      option.name.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query) ||
      option.categoryName.toLowerCase().includes(query)
    );
  }, [searchQuery, useIATICodelist, budgetIdentifiers]);

  // Filter budget classifications
  const filteredClassifications = React.useMemo(() => {
    if (!useCountryChartOfAccounts) return [];
    if (!searchQuery) return budgetClassifications;

    const query = searchQuery.toLowerCase();
    return budgetClassifications.filter(c =>
      c.code.toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query) ||
      (c.description?.toLowerCase().includes(query) ?? false) ||
      (c.nameLocal?.toLowerCase().includes(query) ?? false)
    );
  }, [searchQuery, useCountryChartOfAccounts, budgetClassifications]);

  // Group IATI options by category
  const groupedOptions = React.useMemo(() => {
    if (!useIATICodelist) return {};

    const groups: { [key: string]: BudgetIdentifier[] } = {};
    filteredOptions.forEach(option => {
      const categoryKey = option.categoryName || 'Other';
      if (!groups[categoryKey]) {
        groups[categoryKey] = [];
      }
      groups[categoryKey].push(option);
    });
    return groups;
  }, [filteredOptions, useIATICodelist]);

  // Group classifications by type
  const groupedClassifications = React.useMemo(() => {
    if (!useCountryChartOfAccounts) return {};

    const groups: { [key: string]: BudgetClassification[] } = {};
    filteredClassifications.forEach(c => {
      const categoryKey = CLASSIFICATION_TYPE_LABELS[c.classificationType] || 'Other';
      if (!groups[categoryKey]) {
        groups[categoryKey] = [];
      }
      groups[categoryKey].push(c);
    });
    return groups;
  }, [filteredClassifications, useCountryChartOfAccounts]);

  // For free text vocabularies (3-5)
  if (useFreeText) {
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
          {vocabulary === '3' && 'Enter the budget code from your country\'s budget system'}
          {vocabulary === '4' && 'Enter the budget code from your organization\'s classification system'}
          {vocabulary === '5' && 'Enter the budget code from your custom vocabulary'}
        </p>
      </div>
    );
  }

  // For Country Chart of Accounts (vocabulary 2)
  if (useCountryChartOfAccounts) {
    return (
      <div className={cn("pb-6", className)}>
        <Popover open={isOpen} onOpenChange={setOpen}>
          <PopoverTrigger
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
              !selectedClassification && "text-muted-foreground"
            )}
            disabled={disabled || loadingClassifications}
          >
            <span className="truncate">
              {loadingClassifications ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading classifications...
                </span>
              ) : selectedClassification ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedClassification.code}</span>
                  <span className="font-medium">{selectedClassification.name}</span>
                </span>
              ) : (
                "Select from Chart of Accounts..."
              )}
            </span>
            <div className="flex items-center gap-2">
              {selectedClassification && (
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
                  placeholder="Search budget classifications..."
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
                {Object.entries(groupedClassifications).map(([categoryName, classifications]) => (
                  <CommandGroup key={categoryName}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {categoryName}
                    </div>
                    {classifications.map((c) => (
                      <CommandItem
                        key={c.id}
                        onSelect={() => {
                          onValueChange?.(c.code);
                          setOpen(false);
                          setSearchQuery("");
                        }}
                        className="pl-6 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === c.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{c.code}</span>
                            <span className="font-medium text-foreground">{c.name}</span>
                          </div>
                          {c.description && (
                            <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                              {c.description}
                            </div>
                          )}
                          {c.nameLocal && (
                            <div className="text-xs text-muted-foreground mt-1 italic">
                              {c.nameLocal}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
                {Object.keys(groupedClassifications).length === 0 && !loadingClassifications && (
                  <div className="py-8 text-center">
                    <div className="text-sm text-muted-foreground">
                      {budgetClassifications.length === 0
                        ? "No budget classifications defined yet."
                        : "No classifications found."}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {budgetClassifications.length === 0
                        ? "Ask an administrator to set up the Chart of Accounts."
                        : "Try adjusting your search terms"}
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


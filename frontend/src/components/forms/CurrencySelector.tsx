'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronsUpDown, Check, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import currencyList from '@/data/currency-list.json';

interface Currency {
  code: string;
  name: string;
  description?: string;
  withdrawn?: boolean;
}

const PINNED_CODES = ["USD", "EUR", "GBP", "AUD", "JPY", "MMK"];

interface CurrencySelectorProps {
  value?: string | null | undefined;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  showCodeOnly?: boolean; // New prop to control display behavior
  forceDropUp?: boolean; // Force dropdown to open upward
}

const allOptions: Currency[] = currencyList;
const pinnedOptions: Currency[] = allOptions.filter(opt => PINNED_CODES.includes(opt.code));
const otherOptions: Currency[] = allOptions.filter(opt => !PINNED_CODES.includes(opt.code));

export function CurrencySelector({
  value,
  onValueChange,
  placeholder = "Select currency...",
  disabled = false,
  className,
  id,
  showCodeOnly = false, // Default to false for backward compatibility
  forceDropUp = false, // Default to false for backward compatibility
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropDirection, setDropDirection] = useState<"top" | "bottom">(forceDropUp ? "top" : "bottom");
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = allOptions.find(option => option.code === value);

  const filteredPinned = useMemo(() => {
    if (!searchQuery) return pinnedOptions;
    const query = searchQuery.toLowerCase();
    return pinnedOptions.filter(option =>
      option.code.toLowerCase().includes(query) ||
      option.name.toLowerCase().includes(query) ||
      (option.description && option.description.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const filteredOther = useMemo(() => {
    if (!searchQuery) return otherOptions;
    const query = searchQuery.toLowerCase();
    return otherOptions.filter(option =>
      option.code.toLowerCase().includes(query) ||
      option.name.toLowerCase().includes(query) ||
      (option.description && option.description.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // For search, combine both lists
  const filteredCombined = useMemo(() => {
    if (!searchQuery) return [];
    return [
      ...filteredPinned,
      ...filteredOther
    ];
  }, [searchQuery, filteredPinned, filteredOther]);

  const showNoResults = searchQuery && filteredCombined.length === 0;

  // Function to calculate if dropdown should open upward
  const calculateDropDirection = () => {
    if (forceDropUp) {
      setDropDirection("top");
      return;
    }
    
    if (!triggerRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 400; // max-h-[400px] from className
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    
    // If there's not enough space below but enough space above, open upward
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      setDropDirection("top");
    } else {
      setDropDirection("bottom");
    }
  };

  // Calculate direction when opening
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      calculateDropDirection();
    }
    setOpen(newOpen);
  };

  // Recalculate on scroll/resize
  useEffect(() => {
    const handleScroll = () => {
      if (open) {
        calculateDropDirection();
      }
    };

    const handleResize = () => {
      if (open) {
        calculateDropDirection();
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  return (
    <div className={cn("pb-6", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          ref={triggerRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
            !selectedOption && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {selectedOption ? (
              showCodeOnly ? (
                <span className="font-medium">{selectedOption.code}</span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedOption.code}</span>
                  <span className="font-medium">{selectedOption.name}</span>
                  {selectedOption.withdrawn && (
                    <span className="ml-2 text-xs text-red-500">Withdrawn</span>
                  )}
                </span>
              )
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
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-h-[400px] overflow-y-auto p-0 shadow-lg border"
          align="start"
          side={dropDirection}
          sideOffset={4}
          avoidCollisions={false}
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search currency code, name, or description..."
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
            <CommandList className="overflow-visible" style={{ maxHeight: 'none' }}>
              {showNoResults ? (
                <div className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">
                    No currency found.
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Try adjusting your search terms
                  </div>
                </div>
              ) : searchQuery ? (
                <CommandGroup>
                  {filteredCombined.map(option => (
                    <CommandItem
                      key={option.code}
                      onSelect={() => {
                        if (!option.withdrawn) {
                          onValueChange?.(option.code);
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
                        {option.description && (
                          <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <>
                  {/* Common currencies group */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">Common currencies</div>
                  <CommandGroup>
                    {filteredPinned.map(option => (
                      <CommandItem
                        key={option.code}
                        onSelect={() => {
                          if (!option.withdrawn) {
                            onValueChange?.(option.code);
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
                          {option.description && (
                            <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <div className="border-t border-muted my-1" />
                  {/* All currencies group */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">All currencies</div>
                  <CommandGroup>
                    {filteredOther.map(option => (
                      <CommandItem
                        key={option.code}
                        onSelect={() => {
                          if (!option.withdrawn) {
                            onValueChange?.(option.code);
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
                          {option.description && (
                            <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
} 
"use client";

import React from "react";
import { ChevronsUpDown, Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const TIED_STATUS_OPTIONS = [
  {
    code: "5",
    name: "Untied",
    description:
      "Untied aid is defined as loans and grants whose proceeds are fully and freely available to finance procurement from all OECD countries and substantially all developing countries.",
  },
  {
    code: "3",
    name: "Partially tied",
    description:
      "Official Development Assistance for which the associated goods and services must be procured from a restricted number of countries, which must however include substantially all aid recipient countries and can include the donor country.",
  },
  {
    code: "4",
    name: "Tied",
    description:
      "Official grants or loans where procurement of the goods or services involved is limited to the donor country or to a group of countries which does not include substantially all aid recipient countries.",
  },
];

export interface TiedStatusSelectProps {
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

export function TiedStatusSelect({
  value,
  onValueChange,
  placeholder = "Select tied status...",
  disabled = false,
  className,
  id,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: TiedStatusSelectProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  
  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedOption = TIED_STATUS_OPTIONS.find((option) => option.code === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return TIED_STATUS_OPTIONS;
    const query = searchQuery.toLowerCase();
    return TIED_STATUS_OPTIONS.filter(
      (option) =>
        option.code.toLowerCase().includes(query) ||
        option.name.toLowerCase().includes(query) ||
        option.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            id={id}
            className={cn(
              "w-full justify-between font-normal px-4 py-2 text-base h-10 border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 hover:text-gray-900",
              !selectedOption && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selectedOption ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {selectedOption.code}
                  </span>
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
                placeholder="Search tied status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
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
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.code}
                    onSelect={() => {
                      onValueChange?.(option.code);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    className={cn(
                      "pl-6 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
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
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {option.code}
                        </span>
                        <span className="font-medium text-foreground">{option.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {option.description}
                      </div>
                    </div>
                  </CommandItem>
                ))}
                {filteredOptions.length === 0 && (
                  <div className="py-8 text-center">
                    <div className="text-sm text-muted-foreground">
                      No tied status found.
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Try adjusting your search terms
                    </div>
                  </div>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
} 
"use client";

import React from "react";
import { ChevronsUpDown, Check, Search } from "lucide-react";
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
}

export function TiedStatusSelect({
  value,
  onValueChange,
  placeholder = "Select tied status...",
  disabled = false,
  className,
  id,
}: TiedStatusSelectProps) {
  const [open, setOpen] = React.useState(false);
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
    <div className={cn("pb-6", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
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
                onClick={(e) => {
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
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border"
          align="start"
          sideOffset={4}
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
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
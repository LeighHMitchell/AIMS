'use client';

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { IATI_MEASURE_TYPES, getMeasureTypeByCode } from "@/data/iati-measure-types";
import { useDropdownState } from "@/contexts/DropdownContext";

interface MeasureTypeSearchableSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownId?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function MeasureTypeSearchableSelect({
  value,
  onValueChange,
  placeholder = "Select measure type...",
  disabled = false,
  className,
  dropdownId = "measure-type-select",
  side,
  align = "start",
}: MeasureTypeSearchableSelectProps) {
  const { isOpen, setOpen } = useDropdownState(dropdownId);

  const selectedOption = IATI_MEASURE_TYPES.find(option => option.code === value);

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
          className="w-[400px] p-0" 
          align={align}
          side={side}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty>No measure type found.</CommandEmpty>
              <CommandGroup>
                {IATI_MEASURE_TYPES.map((option) => (
                  <CommandItem
                    key={option.code}
                    value={option.code}
                    onSelect={(currentValue) => {
                      onValueChange?.(currentValue);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start py-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded min-w-[2rem] text-center">
                        {option.code}
                      </span>
                      <span className="font-medium text-sm">{option.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 pl-10">
                      {option.description}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}


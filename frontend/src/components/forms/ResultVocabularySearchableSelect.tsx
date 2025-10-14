"use client";

import React from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { REFERENCE_VOCABULARIES } from "@/types/results";
import { useDropdownState } from "@/contexts/DropdownContext";

type Option = {
  code: string;
  name: string;
};

const allOptions: Option[] = Object.entries(REFERENCE_VOCABULARIES).map(([code, name]) => ({
  code,
  name,
}));

interface ResultVocabularySearchableSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownId?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function ResultVocabularySearchableSelect({
  value,
  onValueChange,
  placeholder = "Select result vocabulary...",
  disabled = false,
  className,
  dropdownId = "result-vocabulary-select",
  side,
  align = "start",
}: ResultVocabularySearchableSelectProps) {
  const { isOpen, setOpen } = useDropdownState(dropdownId);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedOption = allOptions.find(option => option.code === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return allOptions;
    
    const query = searchQuery.toLowerCase();
    return allOptions.filter(option => 
      option.code.toLowerCase().includes(query) ||
      option.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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
              <CommandEmpty>No result vocabulary found.</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.code}
                    value={option.code}
                    onSelect={(currentValue) => {
                      onValueChange?.(currentValue);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    className="flex items-center gap-2 py-3 cursor-pointer"
                  >
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded min-w-[2rem] text-center">
                      {option.code}
                    </span>
                    <span className="font-medium text-sm">{option.name}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedOption?.code === option.code ? "opacity-100" : "opacity-0"
                      )}
                    />
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

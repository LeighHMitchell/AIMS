"use client";

import React from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const SCORE_OPTIONS = [
  {
    value: 0,
    label: "Not targeted",
    description: "The activity does not target this policy objective",
  },
  {
    value: 1,
    label: "Significant objective", 
    description: "Important and deliberate objective, but not the principal reason for the activity",
  },
  {
    value: 2,
    label: "Principal objective",
    description: "The policy objective is the principal reason for undertaking the activity",
  }
];

interface PolicyMarkerScoreSelectProps {
  value?: number;
  onValueChange?: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PolicyMarkerScoreSelect({
  value = 0,
  onValueChange,
  placeholder = "Select score...",
  disabled = false,
  className,
}: PolicyMarkerScoreSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = SCORE_OPTIONS.find(option => option.value === value);

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
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
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                  {selectedOption.value}
                </span>
                <span className="font-medium">{selectedOption.label}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border"
          align="start"
          sideOffset={4}
        >
          <Command>
            <CommandList>
              <CommandGroup>
                {SCORE_OPTIONS.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      onValueChange?.(option.value);
                      setOpen(false);
                    }}
                    className="cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                          {option.value}
                        </span>
                        <span className="font-medium text-foreground">{option.label}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {option.description}
                      </div>
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

export type { PolicyMarkerScoreSelectProps }; 
"use client";

import React from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Standard IATI significance options (0, 1, 2 for most policy markers)
const STANDARD_IATI_SCORE_OPTIONS = [
  {
    value: 0,
    label: "Not targeted",
    description: "The activity does not target this policy objective",
    color: "bg-gray-100 text-gray-700"
  },
  {
    value: 1,
    label: "Significant objective", 
    description: "Important and deliberate objective, but not the principal reason for the activity",
    color: "bg-gray-100 text-gray-700"
  },
  {
    value: 2,
    label: "Principal objective",
    description: "The policy objective is the principal reason for undertaking the activity",
    color: "bg-gray-100 text-gray-700"
  }
];

// RMNCH-specific significance options (0, 1, 2, 3, 4 for RMNCH marker only)
const RMNCH_IATI_SCORE_OPTIONS = [
  {
    value: 0,
    label: "Negligible or no funding",
    description: "Negligible or no funding is targeted to RMNCH activities/results. RMNCH is not an objective of the project/programme.",
    color: "bg-gray-100 text-gray-700"
  },
  {
    value: 1,
    label: "At least a quarter of funding",
    description: "At least a quarter of the funding is targeted to the objective.",
    color: "bg-gray-100 text-gray-700"
  },
  {
    value: 2,
    label: "Half of the funding",
    description: "Half of the funding is targeted to the objective.",
    color: "bg-gray-100 text-gray-700"
  },
  {
    value: 3,
    label: "Most funding targeted",
    description: "Most, but not all of the funding is targeted to the objective.",
    color: "bg-gray-100 text-gray-700"
  },
  {
    value: 4,
    label: "Explicit primary objective",
    description: "Explicit primary objective - all funding is targeted to RMNCH activities/results.",
    color: "bg-gray-100 text-gray-700"
  }
];

interface PolicyMarkerScoreSelectIATIProps {
  value?: number;
  onValueChange?: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxScore?: number; // Allow limiting max score (e.g., 2 for non-RMNCH markers)
  scoreLabels?: Record<number, string>; // Allow custom labels
  isRMNCH?: boolean; // Flag to indicate if this is for RMNCH marker
}

export function PolicyMarkerScoreSelectIATI({
  value = 0,
  onValueChange,
  placeholder = "Select significance...",
  disabled = false,
  className,
  maxScore = 4,
  scoreLabels,
  isRMNCH = false
}: PolicyMarkerScoreSelectIATIProps) {
  const [open, setOpen] = React.useState(false);

  // Choose the appropriate options based on whether this is RMNCH or not
  const baseOptions = isRMNCH ? RMNCH_IATI_SCORE_OPTIONS : STANDARD_IATI_SCORE_OPTIONS;
  
  // Filter options based on maxScore
  const availableOptions = baseOptions.filter(option => option.value <= maxScore);
  
  // Override labels if provided
  const scoreOptions = scoreLabels 
    ? availableOptions.map(option => ({
        ...option,
        label: scoreLabels[option.value] || option.label
      }))
    : availableOptions;

  const selectedOption = scoreOptions.find(option => option.value === value);

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
                <span className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded",
                  selectedOption.color
                )}>
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
          className="w-[var(--radix-popover-trigger-width)] min-w-[380px] p-0 shadow-lg border"
          align="start"
          sideOffset={4}
        >
          <Command>
            <CommandList>
              <CommandGroup>
                {scoreOptions.map((option) => (
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
                        <span className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded",
                          option.color
                        )}>
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

export type { PolicyMarkerScoreSelectIATIProps };

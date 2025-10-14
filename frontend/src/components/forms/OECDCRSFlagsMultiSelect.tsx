"use client";

import React from "react";
import { ChevronsUpDown, Check, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OECD_CRS_FLAGS } from "@/data/oecd-crs-flags";

interface OECDCRSFlagsMultiSelectProps {
  value?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function OECDCRSFlagsMultiSelect({
  value = [],
  onValueChange,
  placeholder = "Select CRS flags...",
  disabled = false,
  className,
}: OECDCRSFlagsMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedFlags = OECD_CRS_FLAGS.filter(flag => value.includes(flag.code));

  const toggleFlag = (code: string) => {
    const newValue = value.includes(code)
      ? value.filter(v => v !== code)
      : [...value, code];
    onValueChange?.(newValue);
  };

  const removeFlag = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.(value.filter(v => v !== code));
  };

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
            value.length === 0 && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1.5 flex-1">
            {selectedFlags.length > 0 ? (
              selectedFlags.map((flag) => (
                <Badge
                  key={flag.code}
                  variant="secondary"
                  className="gap-1.5"
                >
                  <span className="text-xs font-mono">{flag.code}</span>
                  <span>{flag.name}</span>
                  <button
                    type="button"
                    onClick={(e) => removeFlag(flag.code, e)}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full h-4 w-4 flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] min-w-[400px] p-0 shadow-lg border"
          align="start"
          sideOffset={4}
        >
          <Command>
            <CommandList>
              <CommandGroup>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                  OECD CRS Flags
                </div>
                {OECD_CRS_FLAGS.map((flag) => {
                  const isSelected = value.includes(flag.code);
                  return (
                    <CommandItem
                      key={flag.code}
                      onSelect={() => toggleFlag(flag.code)}
                      className="pl-6 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-2 mr-2">
                        <div
                          className={cn(
                            "h-4 w-4 border rounded flex items-center justify-center transition-colors",
                            isSelected ? "bg-primary border-primary" : "border-input"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {flag.code}
                          </span>
                          <span className="font-medium text-foreground">{flag.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                          {flag.description}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}


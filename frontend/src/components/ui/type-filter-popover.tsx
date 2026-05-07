"use client";

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, X } from 'lucide-react';

export interface TypeFilterPopoverProps {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  labels: Record<string, string>;
  placeholder: string;
  triggerClassName?: string;
  popoverWidthClassName?: string;
  /** Render the code badge before the label. Default: true. */
  showCodeBadge?: boolean;
  /** Optional controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TypeFilterPopover({
  options,
  selected,
  onChange,
  labels,
  placeholder,
  triggerClassName = 'w-[220px] h-9',
  popoverWidthClassName = 'w-[280px]',
  showCodeBadge = true,
  open,
  onOpenChange,
}: TypeFilterPopoverProps) {
  const toggle = (code: string, checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...selected, code])));
    } else {
      onChange(selected.filter(c => c !== code));
    }
  };

  let triggerLabel: React.ReactNode = placeholder;
  if (selected.length === 1) {
    const code = selected[0];
    triggerLabel = (
      <span className="flex items-center gap-2 truncate">
        {showCodeBadge && (
          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{code}</span>
        )}
        <span className="truncate">{labels[code] || code}</span>
      </span>
    );
  } else if (selected.length > 1) {
    triggerLabel = `${selected.length} selected`;
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={`${triggerClassName} justify-between font-normal ${selected.length === 0 ? 'text-muted-foreground' : ''} ${selected.length > 0 ? 'pr-12' : ''}`}
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className={`${popoverWidthClassName} p-0`} align="start">
          <div className="max-h-[300px] overflow-y-auto p-2 space-y-0.5">
            {options.map(code => {
              const isChecked = selected.includes(code);
              return (
                <label
                  key={code}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(c) => toggle(code, c === true)}
                  />
                  {showCodeBadge && (
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{code}</span>
                  )}
                  <span className="text-body truncate">{labels[code] || code}</span>
                </label>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange([]); }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Clear filter"
          className="absolute right-7 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

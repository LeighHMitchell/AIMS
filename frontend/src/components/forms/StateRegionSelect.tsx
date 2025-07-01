'use client';

import React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import myanmarData from '@/data/myanmar-locations.json';

interface StateRegionSelectProps {
  id?: string;
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  disabled?: boolean;
}

export function StateRegionSelect({
  id,
  value,
  onValueChange,
  placeholder = "Select state/region",
  multiple = false,
  disabled = false,
}: StateRegionSelectProps) {
  const [open, setOpen] = React.useState(false);
  
  // Ensure value is always in the correct format
  const selectedValues = React.useMemo(() => {
    if (!value) return [];
    return multiple ? (Array.isArray(value) ? value : [value]) : [value];
  }, [value, multiple]);

  const handleSelect = (stateId: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(stateId)
        ? selectedValues.filter(v => v !== stateId)
        : [...selectedValues, stateId];
      onValueChange?.(newValues);
    } else {
      onValueChange?.(stateId);
      setOpen(false);
    }
  };

  const handleRemove = (stateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      const newValues = selectedValues.filter(v => v !== stateId);
      onValueChange?.(newValues);
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    
    if (multiple) {
      return (
        <div className="flex flex-wrap gap-1">
          {selectedValues.map((stateId) => {
            const state = myanmarData.states.find(s => s.id === stateId);
            return state ? (
              <Badge key={stateId} variant="secondary" className="text-xs">
                {state.name}
                <button
                  onClick={(e) => handleRemove(stateId, e)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
        </div>
      );
    } else {
      const state = myanmarData.states.find(s => s.id === selectedValues[0]);
      return state?.name || placeholder;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            selectedValues.length === 0 && "text-muted-foreground"
          )}
        >
          <span className="truncate text-left">{getDisplayText()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search states/regions..." />
          <CommandEmpty>No state/region found.</CommandEmpty>
          <CommandGroup className="max-h-96 overflow-auto">
            {myanmarData.states.map((state) => (
              <CommandItem
                key={state.id}
                value={state.name}
                onSelect={() => handleSelect(state.id)}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedValues.includes(state.id) ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex-1">
                  <div className="font-medium">{state.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {state.type === 'state' ? 'State' : 'Region'} • {state.code}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
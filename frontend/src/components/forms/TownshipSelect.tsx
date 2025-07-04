'use client';

import React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import myanmarData from '@/data/myanmar-locations.json';

interface TownshipSelectProps {
  id?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  stateId?: string; // Optional filter by state
}

export function TownshipSelect({
  id,
  value,
  onValueChange,
  placeholder = "Select township",
  disabled = false,
  stateId,
}: TownshipSelectProps) {
  const [open, setOpen] = React.useState(false);
  
  // Get all townships, optionally filtered by state
  const townships = React.useMemo(() => {
    if (stateId) {
      const state = myanmarData.states.find(s => s.id === stateId);
      return state?.townships || [];
    }
    
    // Return all townships grouped by state
    return myanmarData.states.flatMap(state => 
      state.townships.map(township => ({
        ...township,
        stateName: state.name,
        stateId: state.id
      }))
    );
  }, [stateId]);

  const handleSelect = (townshipId: string) => {
    onValueChange?.(townshipId);
    setOpen(false);
  };

  const getSelectedTownship = () => {
    if (!value) return null;
    
    for (const state of myanmarData.states) {
      const township = state.townships.find(t => t.id === value);
      if (township) {
        return { ...township, stateName: state.name };
      }
    }
    return null;
  };

  const selectedTownship = getSelectedTownship();

  // Group townships by state if not filtered
  const groupedTownships = React.useMemo(() => {
    if (stateId) {
      return null; // No grouping needed when filtered by state
    }
    
    const groups: Record<string, typeof townships> = {};
    townships.forEach(township => {
      const stateId = (township as any).stateId;
      if (!groups[stateId]) {
        groups[stateId] = [];
      }
      groups[stateId].push(township);
    });
    return groups;
  }, [townships, stateId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate text-left">
          {selectedTownship ? selectedTownship.name : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search townships..." />
          <CommandEmpty>No township found.</CommandEmpty>
          <div className="max-h-96 overflow-auto">
            {stateId ? (
              // Single state townships
              <CommandGroup>
                {townships.map((township) => (
                  <CommandItem
                    key={township.id}
                    onSelect={() => handleSelect(township.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === township.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{township.name}</div>
                      <div className="text-xs text-muted-foreground">{township.code}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              // Grouped townships
              <>
                {myanmarData.states.map((state) => (
                  <CommandGroup key={state.id}>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {state.name}
                  </div>
                    {state.townships.map((township) => (
                      <CommandItem
                        key={township.id}
                        onSelect={() => handleSelect(township.id)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === township.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{township.name}</div>
                          <div className="text-xs text-muted-foreground">{township.code}</div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
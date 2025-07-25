'use client';

import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { getAllSectors, getHierarchyByCode } from '@/data/sector-hierarchy';

interface SectorSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  maxSelections?: number;
  disabled?: boolean;
}

export function SectorSelect({
  value = [],
  onValueChange,
  placeholder = "Select sectors...",
  className,
  maxSelections = 20,
  disabled = false
}: SectorSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sectors = useMemo(() => getAllSectors(), []);

  const filteredSectors = useMemo(() => {
    if (!searchQuery) return sectors;
    
    const query = searchQuery.toLowerCase();
    return sectors.filter(sector => 
      sector.value.toLowerCase().includes(query) ||
      sector.label.toLowerCase().includes(query)
    );
  }, [sectors, searchQuery]);

  const groupedSectors = useMemo(() => {
    const groups: Record<string, typeof filteredSectors> = {
      group: [],
      sector: [],
      subsector: []
    };

    filteredSectors.forEach(sector => {
      groups[sector.level].push(sector);
    });

    return groups;
  }, [filteredSectors]);

  const handleSelect = (sectorCode: string) => {
    if (value.includes(sectorCode)) {
      onValueChange(value.filter(v => v !== sectorCode));
    } else if (value.length < maxSelections) {
      onValueChange([...value, sectorCode]);
    }
  };

  const selectedLabels = useMemo(() => {
    return value.map(code => {
      const sector = sectors.find(s => s.value === code);
      return sector ? sector.label : code;
    });
  }, [value, sectors]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 items-center max-w-full overflow-hidden">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {value.slice(0, 2).map((code, index) => {
                  const { level } = getHierarchyByCode(code);
                  return (
                    <Badge 
                      key={code} 
                      variant={level === 'group' ? 'default' : level === 'sector' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {code}
                    </Badge>
                  );
                })}
                {value.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{value.length - 2} more
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search sectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <CommandList>
            <CommandEmpty>No sectors found.</CommandEmpty>
            
            {groupedSectors.group.length > 0 && (
              <CommandGroup heading="Sector Groups">
                {groupedSectors.group.map((sector) => (
                  <CommandItem
                    key={sector.value}
                    value={sector.value}
                    onSelect={() => handleSelect(sector.value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(sector.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="text-sm">{sector.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {groupedSectors.sector.length > 0 && (
              <CommandGroup heading="Sectors">
                {groupedSectors.sector.map((sector) => (
                  <CommandItem
                    key={sector.value}
                    value={sector.value}
                    onSelect={() => handleSelect(sector.value)}
                    className="cursor-pointer pl-6"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(sector.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="text-sm">{sector.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {groupedSectors.subsector.length > 0 && (
              <CommandGroup heading="Sub-sectors">
                {groupedSectors.subsector.map((sector) => (
                  <CommandItem
                    key={sector.value}
                    value={sector.value}
                    onSelect={() => handleSelect(sector.value)}
                    className="cursor-pointer pl-10"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(sector.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="text-sm">{sector.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          {value.length >= maxSelections && (
            <div className="p-2 text-xs text-muted-foreground text-center border-t">
              Maximum {maxSelections} selections reached
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
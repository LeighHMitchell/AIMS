'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X, Layers2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { createHierarchicalSectors } from '@/data/sector-hierarchy';

export interface SectorFilterSelection {
  sectorCategories: string[]; // Group codes (e.g., "110", "120")
  sectors: string[]; // Category codes (e.g., "111", "112")
  subSectors: string[]; // Sector codes (e.g., "11110", "11120")
}

interface SectorHierarchyFilterProps {
  selected: SectorFilterSelection;
  onChange: (selected: SectorFilterSelection) => void;
  className?: string;
  disabled?: boolean;
  availableSectorCodes?: string[]; // Optional: only show sectors that exist in data
}

interface HierarchicalSector {
  code: string;
  name: string;
  categories: {
    code: string;
    name: string;
    sectors: {
      code: string;
      name: string;
      status: string;
    }[];
  }[];
}

export function SectorHierarchyFilter({
  selected,
  onChange,
  className,
  disabled = false,
  availableSectorCodes,
}: SectorHierarchyFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Get hierarchical sector data
  const hierarchicalSectors = React.useMemo(() => {
    return createHierarchicalSectors() as HierarchicalSector[];
  }, []);

  // Create lookup maps for filtering
  const { groupMap, categoryMap, sectorMap } = React.useMemo(() => {
    const groupMap = new Map<string, HierarchicalSector>();
    const categoryMap = new Map<string, { code: string; name: string; groupCode: string }>();
    const sectorMap = new Map<string, { code: string; name: string; categoryCode: string; groupCode: string }>();

    hierarchicalSectors.forEach(group => {
      groupMap.set(group.code, group);
      group.categories.forEach(category => {
        categoryMap.set(category.code, { ...category, groupCode: group.code });
        category.sectors.forEach(sector => {
          sectorMap.set(sector.code, { 
            ...sector, 
            categoryCode: category.code, 
            groupCode: group.code 
          });
        });
      });
    });

    return { groupMap, categoryMap, sectorMap };
  }, [hierarchicalSectors]);

  // Filter sectors based on available codes if provided
  const filteredHierarchy = React.useMemo(() => {
    if (!availableSectorCodes || availableSectorCodes.length === 0) {
      return hierarchicalSectors;
    }

    const availableSet = new Set(availableSectorCodes);
    
    return hierarchicalSectors
      .map(group => ({
        ...group,
        categories: group.categories
          .map(category => ({
            ...category,
            sectors: category.sectors.filter(sector => 
              availableSet.has(sector.code) || 
              availableSet.has(category.code) ||
              availableSet.has(group.code)
            )
          }))
          .filter(category => category.sectors.length > 0)
      }))
      .filter(group => group.categories.length > 0);
  }, [hierarchicalSectors, availableSectorCodes]);

  // Search filter
  const searchFilteredHierarchy = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return filteredHierarchy;
    }

    const query = searchQuery.toLowerCase();
    
    return filteredHierarchy
      .map(group => {
        const groupMatches = group.name.toLowerCase().includes(query) || 
                            group.code.includes(query);
        
        const filteredCategories = group.categories
          .map(category => {
            const categoryMatches = category.name.toLowerCase().includes(query) || 
                                   category.code.includes(query);
            
            const filteredSectors = category.sectors.filter(sector =>
              sector.name.toLowerCase().includes(query) || 
              sector.code.includes(query)
            );

            // Include category if it matches or has matching sectors
            if (categoryMatches || filteredSectors.length > 0) {
              return {
                ...category,
                sectors: categoryMatches ? category.sectors : filteredSectors
              };
            }
            return null;
          })
          .filter(Boolean) as typeof group.categories;

        // Include group if it matches or has matching categories
        if (groupMatches || filteredCategories.length > 0) {
          return {
            ...group,
            categories: groupMatches ? group.categories : filteredCategories
          };
        }
        return null;
      })
      .filter(Boolean) as HierarchicalSector[];
  }, [filteredHierarchy, searchQuery]);

  const handleToggleSectorCategory = (code: string) => {
    const newSelection = selected.sectorCategories.includes(code)
      ? selected.sectorCategories.filter(c => c !== code)
      : [...selected.sectorCategories, code];
    
    onChange({
      ...selected,
      sectorCategories: newSelection,
    });
  };

  const handleToggleSector = (code: string) => {
    const newSelection = selected.sectors.includes(code)
      ? selected.sectors.filter(c => c !== code)
      : [...selected.sectors, code];
    
    onChange({
      ...selected,
      sectors: newSelection,
    });
  };

  const handleToggleSubSector = (code: string) => {
    const newSelection = selected.subSectors.includes(code)
      ? selected.subSectors.filter(c => c !== code)
      : [...selected.subSectors, code];
    
    onChange({
      ...selected,
      subSectors: newSelection,
    });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({
      sectorCategories: [],
      sectors: [],
      subSectors: [],
    });
  };

  const totalSelected = 
    selected.sectorCategories.length + 
    selected.sectors.length + 
    selected.subSectors.length;

  const getSelectionSummary = () => {
    const parts: string[] = [];
    if (selected.sectorCategories.length > 0) {
      parts.push(`${selected.sectorCategories.length} categor${selected.sectorCategories.length === 1 ? 'y' : 'ies'}`);
    }
    if (selected.sectors.length > 0) {
      parts.push(`${selected.sectors.length} sector${selected.sectors.length === 1 ? '' : 's'}`);
    }
    if (selected.subSectors.length > 0) {
      parts.push(`${selected.subSectors.length} sub-sector${selected.subSectors.length === 1 ? '' : 's'}`);
    }
    return parts.join(', ');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between h-9', className)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            <Layers2 className="h-4 w-4 text-gray-600 shrink-0" />
            {totalSelected === 0 ? (
              <span className="text-sm text-muted-foreground">Filter by sector</span>
            ) : (
              <span className="text-sm truncate">
                {getSelectionSummary()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {totalSelected > 0 && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear(e);
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] p-0" align="start">
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <Input
              placeholder="Search sectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
            {searchQuery && (
              <X 
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground shrink-0"
                onClick={() => setSearchQuery('')}
              />
            )}
          </div>
          
          <Command shouldFilter={false}>
            {searchFilteredHierarchy.length === 0 && (
              <CommandEmpty>No sectors found.</CommandEmpty>
            )}
            <ScrollArea className="h-[400px]">
              {searchFilteredHierarchy.map((group) => (
                <React.Fragment key={group.code}>
                  <CommandGroup 
                    heading={
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-primary">
                          <code className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono mr-2">{group.code}</code>
                          {group.name}
                        </span>
                        <Badge 
                          variant={selected.sectorCategories.includes(group.code) ? "default" : "outline"}
                          className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSectorCategory(group.code);
                          }}
                        >
                          {selected.sectorCategories.includes(group.code) ? '✓ Selected' : 'Select All'}
                        </Badge>
                      </div>
                    }
                  >
                    {group.categories.map((category) => (
                      <React.Fragment key={category.code}>
                        {/* Category Level (3-digit) */}
                        <CommandItem
                          value={`category-${category.code}`}
                          onSelect={() => handleToggleSector(category.code)}
                          className="pl-4 font-medium bg-muted/30"
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4 shrink-0',
                              selected.sectors.includes(category.code) ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <code className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono mr-2 shrink-0">{category.code}</code>
                          <span className="truncate">{category.name}</span>
                          <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">
                            {category.sectors.length}
                          </Badge>
                        </CommandItem>
                        
                        {/* Sub-sector Level (5-digit) */}
                        {category.sectors.map((sector) => (
                          <CommandItem
                            key={sector.code}
                            value={`subsector-${sector.code}`}
                            onSelect={() => handleToggleSubSector(sector.code)}
                            className="pl-8"
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4 shrink-0',
                                selected.subSectors.includes(sector.code) ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <code className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono mr-2 shrink-0">{sector.code}</code>
                            <span className="truncate">{sector.name}</span>
                          </CommandItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </React.Fragment>
              ))}
            </ScrollArea>
          </Command>
          
          {/* Selection Summary Footer */}
          {totalSelected > 0 && (
            <div className="border-t p-2 bg-muted/50">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={handleClear}
                >
                  Clear all
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Utility function to check if a sector code matches the filter selection
export function matchesSectorFilter(
  sectorCodes: string[],
  selection: SectorFilterSelection
): boolean {
  if (
    selection.sectorCategories.length === 0 &&
    selection.sectors.length === 0 &&
    selection.subSectors.length === 0
  ) {
    return true; // No filter applied
  }

  for (const code of sectorCodes) {
    // Check direct sub-sector match (5-digit)
    if (selection.subSectors.includes(code)) {
      return true;
    }
    
    // Check sector/category match (3-digit)
    if (code.length >= 3) {
      const categoryCode = code.substring(0, 3);
      if (selection.sectors.includes(categoryCode)) {
        return true;
      }
    }
    
    // Check sector category/group match (using first 2-3 digits as group)
    // Groups are like 110, 120, 130, etc. - we need to check the group code
    if (code.length >= 3) {
      const groupCode = code.substring(0, 3);
      if (selection.sectorCategories.includes(groupCode)) {
        return true;
      }
    }
  }

  return false;
}


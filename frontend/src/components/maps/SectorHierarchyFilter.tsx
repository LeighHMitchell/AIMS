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
import { Switch } from '@/components/ui/switch';
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
  open?: boolean; // Controlled open state
  onOpenChange?: (open: boolean) => void; // Callback when open state changes
  activityCounts?: Record<string, number>; // Map of sector code to activity count
  showOnlyActiveSectors?: boolean; // Toggle to show only active sectors
  onShowOnlyActiveSectorsChange?: (value: boolean) => void; // Callback for toggle change
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
  open: controlledOpen,
  onOpenChange,
  activityCounts = {},
  showOnlyActiveSectors = true,
  onShowOnlyActiveSectorsChange,
}: SectorHierarchyFilterProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    }
    if (controlledOpen === undefined) {
      setInternalOpen(value);
    }
  };
  
  // Auto-focus search input when popover opens
  React.useEffect(() => {
    if (open) {
      // Small delay to ensure popover content is rendered
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

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

  // Calculate aggregated activity counts for categories and groups
  const aggregatedCounts = React.useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    const groupCounts: Record<string, number> = {};
    
    // Aggregate sub-sector counts to categories
    hierarchicalSectors.forEach(group => {
      let groupTotal = 0;
      group.categories.forEach(category => {
        let categoryTotal = 0;
        category.sectors.forEach(sector => {
          const count = activityCounts[sector.code] || 0;
          categoryTotal += count;
        });
        categoryCounts[category.code] = categoryTotal;
        groupTotal += categoryTotal;
      });
      groupCounts[group.code] = groupTotal;
    });
    
    return { categoryCounts, groupCounts };
  }, [hierarchicalSectors, activityCounts]);

  // Helper to get activity count for any sector code
  const getActivityCount = (code: string, level: 'group' | 'category' | 'subsector'): number => {
    if (level === 'group') return aggregatedCounts.groupCounts[code] || 0;
    if (level === 'category') return aggregatedCounts.categoryCounts[code] || 0;
    return activityCounts[code] || 0;
  };

  // Helper to check if a sector is inactive (has no activities)
  const isInactive = (code: string, level: 'group' | 'category' | 'subsector'): boolean => {
    return showOnlyActiveSectors && getActivityCount(code, level) === 0;
  };

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
              <span className="text-xs">All Sectors</span>
            ) : (
              <span className="text-xs truncate">
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
              ref={searchInputRef}
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
          
          {/* Show Only Active Sectors Toggle */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">Show only active sectors</span>
            <Switch 
              checked={showOnlyActiveSectors} 
              onCheckedChange={onShowOnlyActiveSectorsChange}
            />
          </div>
          
          <Command shouldFilter={false}>
            {searchFilteredHierarchy.length === 0 && (
              <CommandEmpty>No sectors found.</CommandEmpty>
            )}
            <ScrollArea className="h-[400px]">
              {searchFilteredHierarchy.map((group) => {
                const groupCount = getActivityCount(group.code, 'group');
                const groupInactive = isInactive(group.code, 'group');
                return (
                <React.Fragment key={group.code}>
                  <CommandGroup 
                    heading={
                      <div className={cn("flex items-center justify-between w-full", groupInactive && "opacity-50")}>
                        <span className={cn("font-semibold", groupInactive ? "text-gray-400" : "text-foreground")}>
                          <code className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs font-mono mr-2">{group.code}</code>
                          {group.name}
                          <span className="text-gray-500 font-normal ml-1">({groupCount})</span>
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
                    {group.categories.map((category) => {
                      const categoryCount = getActivityCount(category.code, 'category');
                      const categoryInactive = isInactive(category.code, 'category');
                      return (
                      <React.Fragment key={category.code}>
                        {/* Category Level (3-digit) */}
                        <CommandItem
                          value={`category-${category.code}`}
                          onSelect={() => handleToggleSector(category.code)}
                          className={cn("pl-4 font-medium bg-muted/30", categoryInactive && "opacity-50")}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4 shrink-0',
                              selected.sectors.includes(category.code) ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <code className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs font-mono mr-2 shrink-0">{category.code}</code>
                          <span className={cn("truncate", categoryInactive && "text-gray-400")}>{category.name}</span>
                          <span className="text-gray-500 ml-1">({categoryCount})</span>
                        </CommandItem>
                        
                        {/* Sub-sector Level (5-digit) */}
                        {category.sectors.map((sector) => {
                          const sectorCount = getActivityCount(sector.code, 'subsector');
                          const sectorInactive = isInactive(sector.code, 'subsector');
                          return (
                          <CommandItem
                            key={sector.code}
                            value={`subsector-${sector.code}`}
                            onSelect={() => handleToggleSubSector(sector.code)}
                            className={cn("pl-8", sectorInactive && "opacity-50")}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4 shrink-0',
                                selected.subSectors.includes(sector.code) ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <code className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs font-mono mr-2 shrink-0">{sector.code}</code>
                            <span className={cn("truncate", sectorInactive && "text-gray-400")}>{sector.name}</span>
                            <span className="text-gray-500 ml-1">({sectorCount})</span>
                          </CommandItem>
                          );
                        })}
                      </React.Fragment>
                      );
                    })}
                  </CommandGroup>
                  <CommandSeparator />
                </React.Fragment>
                );
              })}
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


'use client';

import React from "react";
import { ChevronsUpDown, Search, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
// @ts-ignore
import sectorGroupData from '@/data/SectorGroup.json';

// Types for hierarchical structure
interface SectorCategory {
  code: string;
  name: string;
  sectors: Sector3Digit[];
}

interface Sector3Digit {
  code: string;
  name: string;
  subsectors: Sector5Digit[];
}

interface Sector5Digit {
  code: string;
  name: string;
  categoryCode: string;
  categoryName: string;
  sectorCode: string;
  sectorName: string;
}

interface HierarchicalSectorSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  maxSelections?: number;
}

// Transform SectorGroup.json data into hierarchical structure
function transformToHierarchy(): SectorCategory[] {
  const categoryMap = new Map<string, SectorCategory>();
  
  // Filter to only include 5-digit DAC sector codes
  const fiveDigitSectors = sectorGroupData.data.filter((sector: any) => 
    sector.code && sector.code.length === 5 && sector.status === 'active'
  );

  fiveDigitSectors.forEach((sector: any) => {
    const groupCode = sector['codeforiati:group-code'] || 'XXX';
    const groupName = sector['codeforiati:group-name'] || 'Other';
    const categoryCode = sector['codeforiati:category-code'] || sector.code.substring(0, 3);
    const categoryName = sector['codeforiati:category-name'] || 'Unknown Category';

    // Create category if it doesn't exist
    if (!categoryMap.has(groupCode)) {
      categoryMap.set(groupCode, {
        code: groupCode,
        name: groupName,
        sectors: []
      });
    }

    const category = categoryMap.get(groupCode)!;

    // Find or create 3-digit sector
    let sector3Digit = category.sectors.find(s => s.code === categoryCode);
    if (!sector3Digit) {
      sector3Digit = {
        code: categoryCode,
        name: categoryName,
        subsectors: []
      };
      category.sectors.push(sector3Digit);
    }

    // Add 5-digit subsector
    sector3Digit.subsectors.push({
      code: sector.code,
      name: sector.name,
      categoryCode: groupCode,
      categoryName: groupName,
      sectorCode: categoryCode,
      sectorName: categoryName
    });
  });

  // Convert to array and sort
  const categories = Array.from(categoryMap.values());
  
  // Sort categories, sectors, and subsectors
  categories.sort((a, b) => a.name.localeCompare(b.name));
  categories.forEach(category => {
    category.sectors.sort((a, b) => a.name.localeCompare(b.name));
    category.sectors.forEach(sector => {
      sector.subsectors.sort((a, b) => a.code.localeCompare(b.code));
    });
  });

  return categories;
}

export function HierarchicalSectorSelect({
  value,
  onValueChange,
  placeholder = "Select DAC 5-digit sector code(s)",
  searchPlaceholder = "Search 5-digit sector codes...",
  disabled = false,
  className,
  maxSelections = 10,
}: HierarchicalSectorSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus search input when popover opens
  React.useEffect(() => {
    if (open) {
      // Small delay to ensure the popover is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  const hierarchicalData = React.useMemo(() => transformToHierarchy(), []);

  // Flatten all 5-digit options for search and selection
  const allSubsectors = React.useMemo(() => {
    const subsectors: Sector5Digit[] = [];
    hierarchicalData.forEach(category => {
      category.sectors.forEach(sector => {
        subsectors.push(...sector.subsectors);
      });
    });
    return subsectors;
  }, [hierarchicalData]);

  const selectedSubsectors = allSubsectors.filter(opt => value.includes(opt.code));

  // Filter hierarchy based on search query - only search 5-digit codes and names
  const filteredHierarchy = React.useMemo(() => {
    if (!search.trim()) return hierarchicalData;

    const searchLower = search.toLowerCase();
    const filtered: SectorCategory[] = [];

    hierarchicalData.forEach(category => {
      const filteredCategory: SectorCategory = {
        ...category,
        sectors: []
      };

      category.sectors.forEach(sector => {
        const matchingSubsectors = sector.subsectors.filter(subsector =>
          subsector.code.toLowerCase().includes(searchLower) ||
          subsector.name.toLowerCase().includes(searchLower)
        );

        if (matchingSubsectors.length > 0) {
          filteredCategory.sectors.push({
            ...sector,
            subsectors: matchingSubsectors
          });
        }
      });

      if (filteredCategory.sectors.length > 0) {
        filtered.push(filteredCategory);
      }
    });

    return filtered;
  }, [hierarchicalData, search]);

  const handleSelect = (subsectorCode: string) => {
    const newValue = value.includes(subsectorCode)
      ? value.filter(v => v !== subsectorCode)
      : value.length < maxSelections
        ? [...value, subsectorCode]
        : value;
    
    onValueChange(newValue);
  };

  const handleRemove = (codeToRemove: string) => {
    onValueChange(value.filter(v => v !== codeToRemove));
  };

  const handleClearAll = () => {
    onValueChange([]);
  };

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between min-h-[2.5rem] h-auto px-3 py-2",
              selectedSubsectors.length > 0 && "h-auto"
            )}
          >
            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
              {selectedSubsectors.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <span className="text-sm text-gray-700">
                  {selectedSubsectors.length} sector{selectedSubsectors.length !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-2">
              {selectedSubsectors.length > 0 && (
                <X
                  className="h-4 w-4 cursor-pointer hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAll();
                  }}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <ScrollArea className="h-[300px]">
            <div className="p-1">
              {filteredHierarchy.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No sectors found.
                </div>
              ) : (
                filteredHierarchy.map((category) => (
                  <div key={category.code} className="mb-2">
                    {/* Category Header - Non-selectable */}
                    <div 
                      className="px-3 py-2 text-sm font-semibold text-gray-900 bg-gray-100 border-t border-gray-200 first:border-t-0"
                      role="heading"
                      aria-level={3}
                    >
                      {category.name}
                    </div>
                    
                    {/* 3-digit Sectors and their 5-digit subsectors */}
                    {category.sectors.map((sector) => (
                      <div key={sector.code} className="ml-2">
                        {/* 3-digit Sector Header - Non-selectable */}
                        <div 
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 cursor-default"
                          role="heading"
                          aria-level={4}
                        >
                          <span className="font-mono">{sector.code}</span> – {sector.name}
                        </div>
                        
                        {/* 5-digit Subsectors - Selectable */}
                        {sector.subsectors.map((subsector) => {
                          const isSelected = value.includes(subsector.code);
                          const isDisabled = !isSelected && value.length >= maxSelections;
                          
                          return (
                            <div
                              key={subsector.code}
                              className={cn(
                                "relative flex cursor-pointer select-none items-center rounded-sm px-6 py-2 text-sm outline-none transition-colors ml-4",
                                isSelected && "bg-blue-100 text-blue-900",
                                !isSelected && !isDisabled && "hover:bg-gray-100",
                                isDisabled && "text-gray-400 cursor-not-allowed"
                              )}
                              onClick={() => !isDisabled && handleSelect(subsector.code)}
                              role="option"
                              aria-selected={isSelected}
                              aria-disabled={isDisabled}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  isSelected ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm truncate">
                                  <span className="font-mono text-xs text-gray-700">{subsector.code}</span> – {subsector.name}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          {selectedSubsectors.length > 0 && (
            <div className="border-t p-3">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{selectedSubsectors.length} of {maxSelections} selected</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
} 
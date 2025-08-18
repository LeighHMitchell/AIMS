"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import { Check, ChevronsUpDown, Search, Info, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import dacSectorsData from "@/data/dac-sectors.json"
import sectorGroupData from "@/data/SectorGroup.json"
import { EnhancedMultiSelect } from "@/components/ui/enhanced-multi-select"
import { HierarchicalSectorSelect } from './HierarchicalSectorSelect';

interface Sector {
  code: string
  name: string
  description: string
}

interface SectorCategory {
  [categoryName: string]: Sector[]
}

// Helper to transform DAC sector data for EnhancedMultiSelect using SectorGroup.json
export function transformSectorGroups() {
  // Group sectors by their group-name from SectorGroup.json
  const groupedSectors: { [groupName: string]: any[] } = {};
  
  // Filter to only include 5-digit DAC sector codes
  const fiveDigitSectors = sectorGroupData.data.filter((sector: any) => 
    sector.code && sector.code.length === 5
  );
  
  fiveDigitSectors.forEach((sector: any) => {
    const groupName = sector['codeforiati:group-name'] || 'Other';
    if (!groupedSectors[groupName]) {
      groupedSectors[groupName] = [];
    }
    groupedSectors[groupName].push(sector);
  });

  return Object.entries(groupedSectors).map(([groupName, sectors]) => {
    // Group by categories within this group
    const categorizedSectors: { [categoryName: string]: any[] } = {};
    sectors.forEach(sector => {
      const categoryName = sector['codeforiati:category-name'] || 'Other';
      if (!categorizedSectors[categoryName]) {
        categorizedSectors[categoryName] = [];
      }
      categorizedSectors[categoryName].push(sector);
    });

    // Create options for 5-digit sectors only
    const options: any[] = [];
    
    Object.entries(categorizedSectors).forEach(([categoryName, categorySectors]) => {
      // Sort sectors by code
      categorySectors.sort((a, b) => a.code.localeCompare(b.code));
      
      // Add individual 5-digit sector options
      categorySectors.forEach(sector => {
        options.push({
          code: sector.code,
          name: sector.name,
          description: sector.name,
          indent: 0, // No indentation for flat list
          categoryName: categoryName,
          groupName: groupName
        });
      });
    });
    
    return {
      label: groupName,
      options: options,
    };
  });
}

interface SectorSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  variant?: 'flat' | 'hierarchical';
  maxSelections?: number;
}

export function SectorSelect({
  value,
  onValueChange,
  placeholder = "Select DAC 5-digit sector code(s)",
  disabled = false,
  className,
  variant = 'flat',
  maxSelections = 10,
}: SectorSelectProps) {
  if (variant === 'hierarchical') {
    return (
      <HierarchicalSectorSelect
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        maxSelections={maxSelections}
      />
    );
  }

  return (
    <EnhancedMultiSelect
      groups={transformSectorGroups()}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Search 5-digit sector codes..."
      disabled={disabled}
      className={className}
    />
  );
}

// Helper function to get sector label from code
export const getSectorLabel = (code: string): string => {
  const sectorsData = dacSectorsData as SectorCategory
  
  for (const sectors of Object.values(sectorsData)) {
    const sector = sectors.find(s => s.code === code)
    if (sector) {
      return `${sector.code} – ${sector.name}`
    }
  }
  
  return code
}

// Helper function to get sector description from code
export const getSectorDescription = (code: string): string => {
  const sectorsData = dacSectorsData as SectorCategory
  
  for (const sectors of Object.values(sectorsData)) {
    const sector = sectors.find(s => s.code === code)
    if (sector) {
      return sector.description
    }
  }
  
  return ""
}

export default SectorSelect

// Direct export for convenience
export { HierarchicalSectorSelect } from './HierarchicalSectorSelect';
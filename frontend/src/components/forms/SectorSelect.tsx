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
import { EnhancedMultiSelect } from "@/components/ui/enhanced-multi-select"

interface Sector {
  code: string
  name: string
  description: string
}

interface SectorCategory {
  [categoryName: string]: Sector[]
}

// Helper to transform DAC sector data for EnhancedMultiSelect
export function transformSectorGroups() {
  return Object.entries(dacSectorsData).map(([category, options]) => ({
    label: category,
    options: options.map(sector => ({
      code: sector.code,
      name: sector.name,
      description: sector.description,
    })),
  }));
}

interface SectorSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SectorSelect({
  value,
  onValueChange,
  placeholder = "Select OECD DAC sector(s)",
  disabled = false,
  className,
}: SectorSelectProps) {
  return (
    <EnhancedMultiSelect
      groups={transformSectorGroups()}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Search sectors..."
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
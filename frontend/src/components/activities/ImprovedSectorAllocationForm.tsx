'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Sparkles,
  Info,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { HeroCard } from '@/components/ui/hero-card';
import { SectorSelect, transformSectorGroups } from '@/components/forms/SectorSelect';
import { useSectorsAutosave } from '@/hooks/use-field-autosave-new';
import { useUser } from '@/hooks/useUser';
import SectorSunburstVisualization from '@/components/charts/SectorSunburstVisualization';
import { toast } from 'sonner';

interface Sector {
  code: string;
  name: string;
  description: string;
}

interface SectorCategory {
  [categoryName: string]: Sector[]
}

interface SectorAllocation {
  id: string;
  code: string;
  name: string;
  percentage: number;
  category?: string;
  categoryName?: string;
  categoryCode?: string;
  level?: 'group' | 'sector' | 'subsector';
  [key: string]: any;
}

interface SectorValidation {
  isValid: boolean;
  errors: string[];
  totalPercentage: number;
  remainingPercentage: number;
}

interface ImprovedSectorAllocationFormProps {
  allocations: SectorAllocation[];
  onChange: (allocations: SectorAllocation[]) => void;
  onValidationChange?: (validation: SectorValidation) => void;
  allowPublish?: boolean;
  activityId?: string;
}

// Color mapping for sector categories - using gray/slate palette to match sunburst chart
const getCategoryColor = (categoryCode: string): string => {
  // Gray/slate color palette matching the sunburst chart
  const GRAY_SLATE_COLORS = [
    '#1e293b', // slate-800
    '#334155', // slate-700  
    '#475569', // slate-600
    '#64748b', // slate-500
    '#94a3b8', // slate-400
    '#0f172a', // slate-900
    '#374151', // gray-700
    '#4b5563', // gray-600
    '#6b7280', // gray-500
    '#9ca3af', // gray-400
    '#d1d5db', // gray-300
    '#111827', // gray-900
    '#1f2937', // gray-800
    '#374151', // gray-700
    '#6b7280'  // gray-500
  ];

  const colors: { [key: string]: string } = {
    '111': GRAY_SLATE_COLORS[0], // Education
    '121': GRAY_SLATE_COLORS[1], // Health
    '130': GRAY_SLATE_COLORS[2], // Population
    '140': GRAY_SLATE_COLORS[3], // Water Supply & Sanitation
    '150': GRAY_SLATE_COLORS[4], // Government & Civil Society
    '160': GRAY_SLATE_COLORS[5], // Other Social Infrastructure
    '210': GRAY_SLATE_COLORS[6], // Transport & Storage
    '220': GRAY_SLATE_COLORS[7], // Communications
    '230': GRAY_SLATE_COLORS[8], // Energy
    '240': GRAY_SLATE_COLORS[9], // Banking & Financial Services
    '250': GRAY_SLATE_COLORS[10], // Business & Other Services
    '310': GRAY_SLATE_COLORS[11], // Agriculture, Forestry, Fishing
    '320': GRAY_SLATE_COLORS[12], // Industry, Mining, Construction
    '330': GRAY_SLATE_COLORS[13], // Trade Policies & Regulations
    '410': GRAY_SLATE_COLORS[14], // General Environmental Protection
    '430': GRAY_SLATE_COLORS[0], // Other Multisector (wrap around)
    '510': GRAY_SLATE_COLORS[1], // General Budget Support
    '520': GRAY_SLATE_COLORS[2], // Developmental Food Aid
    '530': GRAY_SLATE_COLORS[3], // Other Commodity Assistance
    '600': GRAY_SLATE_COLORS[4], // Action Relating to Debt
    '700': GRAY_SLATE_COLORS[5], // Humanitarian Aid
    '910': GRAY_SLATE_COLORS[6], // Administrative Costs
    '920': GRAY_SLATE_COLORS[7], // Support to NGOs
    '930': GRAY_SLATE_COLORS[8], // Refugees in Donor Countries
    '998': GRAY_SLATE_COLORS[9], // Unallocated/Unspecified
  };
  return colors[categoryCode] || GRAY_SLATE_COLORS[0]; // Default to slate-800
};

// Helper function to determine text color based on background color
const getTextColor = (backgroundColor: string): string => {
  // Light gray colors that need dark text for contrast
  const lightColors = ['#94a3b8', '#9ca3af', '#d1d5db'];
  return lightColors.includes(backgroundColor) ? '#1f2937' : '#ffffff';
};

// Helper function to format percentage for display (max 3 decimal places)
const formatPercentageDisplay = (value: number): string => {
  if (value === 0) return '0';
  if (value % 1 === 0) return value.toString(); // Whole numbers
  return parseFloat(value.toFixed(3)).toString(); // Max 3 decimals, remove trailing zeros
};

// Create a mapping for DAC category codes to parent category names
const getCategoryParentName = (categoryCode: string): string => {
  const categoryMap: { [key: string]: string } = {
    '11': 'Education',
    '12': 'Health',
    '13': 'Population Policies/Programmes & Reproductive Health',
    '14': 'Water Supply & Sanitation',
    '15': 'Government & Civil Society',
    '16': 'Other Social Infrastructure & Services',
    '21': 'Transport & Storage',
    '22': 'Communications',
    '23': 'Energy',
    '24': 'Banking & Financial Services',
    '25': 'Business & Other Services',
    '31': 'Agriculture, Forestry, Fishing',
    '32': 'Industry, Mining, Construction',
    '33': 'Trade Policies & Regulations',
    '41': 'General Environmental Protection',
    '43': 'Other Multisector',
    '51': 'General Budget Support',
    '52': 'Developmental Food Aid/Food Security Assistance',
    '53': 'Other Commodity Assistance',
    '60': 'Action Relating to Debt',
    '70': 'Humanitarian Aid',
    '91': 'Administrative Costs of Donors',
    '92': 'Support to National NGOs',
    '93': 'Refugees in Donor Countries',
    '99': 'Unallocated/Unspecified'
  };
  
  return categoryMap[categoryCode] || `Category ${categoryCode}`;
};

const getSectorInfo = (code: string): { name: string; description: string; category: string; categoryCode: string; categoryName: string } => {
  const dacSectorsData = require('@/data/dac-sectors.json');
  
  // Search through all categories to find the sector
  for (const [categoryName, sectors] of Object.entries(dacSectorsData)) {
    const sectorArray = sectors as any[];
    const sector = sectorArray.find((s: any) => s.code === code);
    
    if (sector) {
      const categoryCode = sector.code.substring(0, 3);
      const parentCategoryCode = categoryCode.substring(0, 2);
      const parentCategoryName = getCategoryParentName(parentCategoryCode);
      
      return {
        name: sector.name,
        description: sector.description || '',
        category: categoryName,
        categoryCode: categoryCode,
        categoryName: parentCategoryName
      };
    }
  }
  
  // Fallback if sector not found
  const categoryCode = code.substring(0, 3);
  const parentCategoryCode = categoryCode.substring(0, 2);
  const parentCategoryName = getCategoryParentName(parentCategoryCode);
  
  return {
    name: `Sector ${code}`,
    description: '',
    category: `Category ${categoryCode}`,
    categoryCode: categoryCode,
    categoryName: parentCategoryName
  };
};

interface SectorOption {
  value: string;
  label: string;
  code: string;
  name: string;
  description: string;
  category: string;
  categoryCode: string;
}

interface SectorGroup {
  label: string;
  options: SectorOption[];
}

type SortField = 'subSector' | 'sector' | 'category' | 'percentage';
type SortDirection = 'asc' | 'desc';

export default function ImprovedSectorAllocationForm({ 
  allocations = [], 
  onChange, 
  onValidationChange,
  allowPublish = true,
  activityId
}: ImprovedSectorAllocationFormProps) {
  const { user } = useUser();
  // Multi-select: get all selected sector codes
  const selectedSectors = allocations.map(a => a.code);
  const sectorsAutosave = useSectorsAutosave(activityId, user?.id);
  const [sortField, setSortField] = useState<SortField>('subSector');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort allocations based on current sort field and direction
  const sortedAllocations = useMemo(() => {
    return [...allocations].sort((a, b) => {
      const aInfo = getSectorInfo(a.code);
      const bInfo = getSectorInfo(b.code);
      
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortField) {
        case 'subSector':
          aValue = a.name || aInfo.name.split(' – ')[1] || a.code;
          bValue = b.name || bInfo.name.split(' – ')[1] || b.code;
          break;
        case 'sector':
          aValue = aInfo.category || 'Unknown Sector';
          bValue = bInfo.category || 'Unknown Sector';
          break;
        case 'category':
          aValue = aInfo.categoryName;
          bValue = bInfo.categoryName;
          break;
        case 'percentage':
          aValue = a.percentage || 0;
          bValue = b.percentage || 0;
          break;
        default:
          aValue = a.code;
          bValue = b.code;
      }
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [allocations, sortField, sortDirection]);

  // Render sortable header
  const SortableHeader = ({ field, children, className = "" }: { field: SortField; children: React.ReactNode; className?: string }) => {
    const isRightAligned = className.includes('text-right');
    return (
      <TableHead 
        className={cn("cursor-pointer hover:bg-gray-100 select-none py-3", className)}
        onClick={() => handleSort(field)}
      >
        <div className={cn("flex items-center gap-1", isRightAligned ? "justify-end" : "justify-start")}>
          {children}
          {sortField === field && (
            sortDirection === 'asc' ? 
              <ChevronUp className="h-4 w-4" /> : 
              <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </TableHead>
    );
  };

  // Per-allocation save status
  const [allocationStatus, setAllocationStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const prevAllocationsRef = useRef(allocations);

  // Track changed allocations and set their status to 'saving' on change
  useEffect(() => {
    const prev = prevAllocationsRef.current;
    const prevIds = new Set(prev.map(a => a.id));
    const currIds = new Set(allocations.map(a => a.id));
    const statusUpdates: Record<string, 'saving'> = {};

    // New or changed allocations
    allocations.forEach(a => {
      const prevA = prev.find(p => p.id === a.id);
      if (!prevA || prevA.percentage !== a.percentage) {
        statusUpdates[a.id] = 'saving';
      }
    });
    // Deleted allocations: remove from status
    prev.forEach(a => {
      if (!currIds.has(a.id)) {
        setAllocationStatus(s => {
          const copy = { ...s };
          delete copy[a.id];
          return copy;
        });
      }
    });
    if (Object.keys(statusUpdates).length > 0) {
      setAllocationStatus(s => ({ ...s, ...statusUpdates }));
    }
    prevAllocationsRef.current = allocations;
  }, [allocations]);

  // On successful save, set all current allocations to 'saved'
  const lastSavedTimeRef = useRef<Date | null>(null);
  useEffect(() => {
    if (sectorsAutosave.state.lastSaved && 
        !sectorsAutosave.state.isSaving && 
        !sectorsAutosave.state.error &&
        sectorsAutosave.state.lastSaved !== lastSavedTimeRef.current) {
      
      lastSavedTimeRef.current = sectorsAutosave.state.lastSaved;
      
      setAllocationStatus(s => {
        const updated: Record<string, 'saved'> = {};
        allocations.forEach(a => { updated[a.id] = 'saved'; });
        return updated;
      });
      
      // Only show toast if we have meaningful sectors to save
      if (allocations.length > 0) {
        toast.success('Sectors saved successfully!', { position: 'top-right', duration: 2000 });
      }
    }
  }, [sectorsAutosave.state.lastSaved, sectorsAutosave.state.isSaving, sectorsAutosave.state.error, allocations]);

  // On save error, set all 'saving' allocations to 'error'
  const lastErrorRef = useRef<Error | null>(null);
  useEffect(() => {
    if (sectorsAutosave.state.error && sectorsAutosave.state.error !== lastErrorRef.current) {
      lastErrorRef.current = sectorsAutosave.state.error;
      
      setAllocationStatus(s => {
        const updated = { ...s };
        Object.keys(updated).forEach(id => {
          if (updated[id] === 'saving') updated[id] = 'error';
        });
        return updated;
      });
      
      toast.error('Failed to save sectors. Please try again.', { position: 'top-right', duration: 3000 });
    }
  }, [sectorsAutosave.state.error]);

  // Add error logging for autosave
  useEffect(() => {
    if (sectorsAutosave.state.error) {
      console.error('[SectorAutosave] Save failed:', sectorsAutosave.state.error);
    }
    if (sectorsAutosave.state.lastSaved) {
      console.log('[SectorAutosave] Save successful:', sectorsAutosave.state.lastSaved);
    }
  }, [sectorsAutosave.state.error, sectorsAutosave.state.lastSaved]);

  // Handler for multi-select
  const handleSectorsChange = (sectorCodes: string[]) => {
    const sectorGroupData = require('@/data/SectorGroup.json');
    const currentCodes = allocations.map(a => a.code);
    const toAdd = sectorCodes.filter(code => !currentCodes.includes(code));
    const toRemove = currentCodes.filter(code => !sectorCodes.includes(code));
    let newAllocations = [...allocations];
    
    // Add
    toAdd.forEach(code => {
      if (code.length === 3 && code.endsWith('0')) {
        // This is a group selection (like "110" for Education) - add as a single group-level allocation
        const groupName = sectorGroupData.data.find((s: any) => s.code.startsWith(code.substring(0, 2)))?.['codeforiati:group-name'] || `Group ${code}`;
        newAllocations.push({
          id: crypto.randomUUID(),
          code: code,
          name: groupName,
          percentage: 0,
          category: groupName,
          categoryCode: code,
          level: 'group'
        });
      } else if (code.length === 3) {
        // This is a category selection (like "111" for Education, Level Unspecified) - add as a single category-level allocation
        const categoryData = sectorGroupData.data.find((s: any) => s['codeforiati:category-code'] === code);
        if (categoryData) {
          newAllocations.push({
            id: crypto.randomUUID(),
            code: code,
            name: categoryData['codeforiati:category-name'],
            percentage: 0,
            category: categoryData['codeforiati:category-name'],
            categoryCode: code,
            level: 'sector'
          });
        }
      } else if (code.length === 5) {
        // This is an individual sector selection
        const sector = sectorGroupData.data.find((s: any) => s.code === code);
        if (sector) {
          const sectorInfo = getSectorInfo(code);
          newAllocations.push({
            id: crypto.randomUUID(),
            code: sector.code,
            name: sector.name,
            percentage: 0,
            category: sectorInfo.category,
            categoryCode: sector.code.substring(0, 3),
            level: 'subsector'
          });
        }
      }
    });
    
    // Remove
    newAllocations = newAllocations.filter(a => !toRemove.includes(a.code));
    onChange(newAllocations);
  };

  // Calculate validation
  const calculateValidation = (allocs: SectorAllocation[], showEmptyWarning: boolean = true): SectorValidation => {
    const errors: string[] = [];
    const totalPercentage = allocs.reduce((sum, a) => sum + (a.percentage || 0), 0);
    
    if (showEmptyWarning && allocs.length === 0) {
      errors.push('At least one sector must be selected');
    }
    
    if (allocs.length > 0 && totalPercentage === 0) {
      errors.push('At least one sector must have a percentage greater than 0');
    }
    
    if (totalPercentage > 100) {
      errors.push(`Total percentage (${totalPercentage.toFixed(1)}%) exceeds 100%`);
    }
    
    if (totalPercentage < 100 && allocs.length > 0) {
      errors.push(`Total percentage (${totalPercentage.toFixed(1)}%) is less than 100%`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      totalPercentage,
      remainingPercentage: Math.max(0, 100 - totalPercentage)
    };
  };

  // Add a single sector
  const addSector = (option: SectorOption | null) => {
    if (!option) return;
    
    const sectorInfo = getSectorInfo(option.code);
    const newAllocation: SectorAllocation = {
      id: crypto.randomUUID(),
      code: option.code,
      name: option.name,
      percentage: 0,
      category: sectorInfo.category,
      categoryCode: option.code.substring(0, 3)
    };
    
    onChange([...allocations, newAllocation]);
  };

  // Update percentage for a specific allocation
  const updatePercentage = (id: string, percentage: number) => {
    const updated = allocations.map(a => 
      a.id === id ? { ...a, percentage: Math.max(0, Math.min(100, percentage)) } : a
    );
    onChange(updated);
  };

  // Remove a sector
  const removeSector = (id: string) => {
    onChange(allocations.filter(a => a.id !== id));
  };

  // Distribute percentages equally
  const distributeEqually = () => {
    if (allocations.length === 0) return;
    const equalPercentage = 100 / allocations.length;
    const updated = allocations.map(a => ({ ...a, percentage: equalPercentage }));
    onChange(updated);
  };

  // Clear all sectors
  const clearAll = () => {
    onChange([]);
  };

  // Group allocations by category for display
  const groupedAllocations = useMemo(() => {
    const groups: { [key: string]: SectorAllocation[] } = {};
    allocations.forEach(allocation => {
      const sectorInfo = getSectorInfo(allocation.code);
      const category = sectorInfo.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(allocation);
    });
    return groups;
  }, [allocations]);

  // Calculate validation
  const validation = useMemo(() => calculateValidation(allocations), [allocations]);

  // Notify parent of validation changes
  useEffect(() => {
    onValidationChange?.(validation);
  }, [validation, onValidationChange]);

  // Save to autosave when allocations change (with deep comparison to prevent unnecessary saves)
  const prevAllocationsStringRef = useRef<string>('');
  useEffect(() => {
    const currentAllocationsString = JSON.stringify(allocations.map(a => ({ 
      code: a.code, 
      percentage: a.percentage, 
      level: a.level 
    })).sort((a, b) => a.code.localeCompare(b.code)));
    
    // Only save if there's a meaningful change
    if (currentAllocationsString !== prevAllocationsStringRef.current && allocations.length > 0) {
      console.log('[SectorForm] Allocations changed, triggering save:', allocations);
      prevAllocationsStringRef.current = currentAllocationsString;
      sectorsAutosave.saveNow(allocations);
    }
  }, [allocations, sectorsAutosave]);

  // Handle sunburst chart segment selection - only show info, don't modify
  const handleSunburstSegmentClick = (code: string, level: 'category' | 'sector' | 'subsector') => {
    // For now, just show information about the clicked segment
    // Could be extended later to highlight or show details
    console.log(`Clicked on ${level}: ${code}`);
  };

  // Calculate summary statistics
  const totalAllocated = allocations.reduce((sum, a) => sum + (a.percentage || 0), 0);
  const totalUnallocated = Math.max(0, 100 - totalAllocated);
  
  // Count different levels properly - count unique values
  const uniqueCategories = new Set();
  const unique3DigitSectors = new Set();
  
  allocations.forEach(allocation => {
    const sectorInfo = getSectorInfo(allocation.code);
    // Add category (DAC Group)
    uniqueCategories.add(sectorInfo.category);
    // Add 3-digit sector code
    unique3DigitSectors.add(allocation.code.substring(0, 3));
  });
  
  const categoryCount = uniqueCategories.size;
  const sectorCount = unique3DigitSectors.size; // Number of unique 3-digit sectors
  const subSectorCount = allocations.filter(a => a.level === 'subsector' || a.code.length === 5).length;

  return (
    <div className="space-y-6">
      {/* Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HeroCard
                title="% Allocated"
                value={Math.round(totalAllocated * 10) / 10}
                currency=""
                suffix="%"
                subtitle="Total sector allocation"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Total percentage allocated across selected sectors</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HeroCard
                title="% Unallocated"
                value={Math.round(totalUnallocated * 10) / 10}
                currency=""
                suffix="%"
                subtitle="Remaining allocation"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Remaining percentage not yet assigned</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HeroCard
                title="Sector Categories"
                value={categoryCount}
                currency=""
                subtitle="Selected categories"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Top-level DAC groups (e.g. Education, Health)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HeroCard
                title="Sectors"
                value={sectorCount}
                currency=""
                subtitle="Selected sectors"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Intermediate DAC codes grouping related sub-sectors</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HeroCard
                title="Sub-sectors"
                value={subSectorCount}
                currency=""
                subtitle="Selected sub-sectors"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>DAC 5-digit sector codes (e.g. 12220 – Basic Health Care)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Form Interface */}
      <div className="space-y-6 w-full">
        {/* Sector Dropdown */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <span>Select Sector to Add</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SectorSelect
              value={selectedSectors}
              onValueChange={handleSectorsChange}
              placeholder="Choose sector(s)..."
              className="w-full"
              variant="hierarchical"
              maxSelections={15}
            />
          </CardContent>
        </Card>

        {/* Selected Sectors */}
        {allocations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Selected Sectors</CardTitle>
                <div className="flex items-center gap-2">
                  {/* Distribute Equally Button only if more than one allocation */}
                  {allocations.length > 1 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={distributeEqually}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Distribute Equally
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Distribute percentage equally across all sectors</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={clearAll}
                          className="text-xs"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear All
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove all sector allocations</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <SortableHeader field="subSector">Sub-sector</SortableHeader>
                      <SortableHeader field="sector">Sector</SortableHeader>
                      <SortableHeader field="category">Sector Category</SortableHeader>
                      <SortableHeader field="percentage" className="w-40 text-right">%</SortableHeader>
                      <TableHead className="w-20 text-center py-3"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAllocations.map((allocation) => {
                      const sectorInfo = getSectorInfo(allocation.code);
                      const categoryCode = sectorInfo.categoryCode;
                      const categoryColor = getCategoryColor(categoryCode);
                      
                      // Extract hierarchy information
                      const subSectorCode = allocation.code;
                      const subSectorName = allocation.name || sectorInfo.name.split(' – ')[1] || allocation.code;
                      const sectorCode = categoryCode;
                      const sectorName = sectorInfo.category || 'Unknown Sector';
                      const categoryGroupCode = categoryCode.substring(0, 2) + '0';
                      const categoryGroupName = sectorInfo.categoryName;
                      
                      return (
                        <TableRow 
                          key={allocation.id}
                          className={cn(
                            "hover:bg-gray-50",
                            allocation.percentage === 0 && "bg-red-50 hover:bg-red-100"
                          )}
                        >
                          {/* Sub-sector Code and Name */}
                          <TableCell className="py-2 text-sm">
                            <span className="font-mono">{subSectorCode}</span> - {subSectorName}
                          </TableCell>
                          
                          {/* Sector Code and Name */}
                          <TableCell className="py-2 text-sm">
                            <span className="font-mono">{sectorCode}</span> - {sectorName.replace(/^\d{3}\s*-\s*/, '')}
                          </TableCell>
                          
                          {/* Sector Category Code and Name */}
                          <TableCell className="py-2 text-sm">
                            <span className="font-mono">{categoryGroupCode}</span> - {categoryGroupName}
                          </TableCell>
                          
                          {/* Percentage Input */}
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.001"
                                value={formatPercentageDisplay(allocation.percentage || 0)}
                                onChange={(e) => updatePercentage(allocation.id, parseFloat(e.target.value) || 0)}
                                className={cn(
                                  "w-24 h-8 text-sm text-center font-mono p-2",
                                  allocation.percentage === 0 && "border-red-300"
                                )}
                              />
                              {/* Save Status Icon */}
                              {allocationStatus[allocation.id] === 'saving' && (
                                <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
                              )}
                              {allocationStatus[allocation.id] === 'saved' && (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              )}
                              {allocationStatus[allocation.id] === 'error' && (
                                <AlertCircle className="h-3 w-3 text-red-600" />
                              )}
                            </div>
                          </TableCell>
                          
                          {/* Action - Delete Button */}
                          <TableCell className="py-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSector(allocation.id)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* Unallocated Row */}
                    {totalUnallocated > 0 && (
                      <TableRow className="text-gray-500 bg-gray-50">
                        <TableCell colSpan={3} className="py-2 px-4">
                          Unallocated
                        </TableCell>
                        <TableCell className="text-center font-mono py-2">
                          {totalUnallocated.toFixed(1)}%
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validation Messages */}
        {validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validation.errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Visualization - Interactive Chart */}
        {allocations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sector Allocation Visualization</CardTitle>
              <CardDescription>
                Interactive sunburst chart showing sector allocation hierarchy and relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-hidden">
                <SectorSunburstVisualization 
                  allocations={allocations}
                  onSegmentClick={handleSunburstSegmentClick}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 
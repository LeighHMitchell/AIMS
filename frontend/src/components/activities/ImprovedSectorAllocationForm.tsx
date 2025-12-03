'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
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
  ChevronDown,
  HelpCircle
} from 'lucide-react';
import { HeroCard } from '@/components/ui/hero-card';
import { SectorSelect, transformSectorGroups } from '@/components/forms/SectorSelect';
import { useSectorsAutosave } from '@/hooks/use-field-autosave-new';
import { useUser } from '@/hooks/useUser';
import SectorSunburstVisualization from '@/components/charts/SectorSunburstVisualization';

import SectorSankeyVisualization from '@/components/charts/SectorSankeyVisualization';
import { toast } from 'sonner';
import { SectorAllocationModeToggle } from '@/components/activities/SectorAllocationModeToggle';
import { useSectorAllocationMode, SectorAllocationMode } from '@/hooks/use-sector-allocation-mode';
import { Lock, ExternalLink } from 'lucide-react';

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
  onCompletionStatusChange?: (completion: { isComplete: boolean; isInProgress: boolean; isSaved: boolean }) => void;
  allowPublish?: boolean;
  activityId?: string;
  onModeChange?: (mode: SectorAllocationMode) => void;
  onNavigateToTransactions?: () => void;
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

// Helper function to detect if percentages are equally distributed
const arePercentagesEquallyDistributed = (allocations: SectorAllocation[]): boolean => {
  if (allocations.length <= 1) return true;
  
  const expectedEqual = 100 / allocations.length;
  const tolerance = 0.1; // Allow small rounding differences
  
  return allocations.every(a => 
    Math.abs(a.percentage - expectedEqual) <= tolerance
  );
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
  onCompletionStatusChange,
  allowPublish = true,
  activityId,
  onModeChange,
  onNavigateToTransactions
}: ImprovedSectorAllocationFormProps) {
  console.log('[ImprovedSectorAllocationForm] Component mounted with:', {
    allocationsCount: allocations.length,
    allocations,
    hasCompletionCallback: !!onCompletionStatusChange
  });
  const { user } = useUser();
  
  // Sector allocation mode (activity vs transaction level)
  const sectorMode = useSectorAllocationMode({
    activityId: activityId || '',
    onModeChange
  });
  
  const isTransactionMode = sectorMode.mode === 'transaction';
  const isLocked = isTransactionMode;
  // Multi-select: get all selected sector codes
  const selectedSectors = allocations.map(a => a.code);
  const sectorsAutosave = useSectorsAutosave(activityId, user?.id);
  const [sortField, setSortField] = useState<SortField>('subSector');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // User action tracking for toast notifications
  const userActionInProgressRef = useRef(false);
  const userActionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveCompletedRef = useRef(false);

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

  // Helper function to determine if allocation should show green tick
  const shouldShowGreenTick = (allocation: any) => {
    const status = allocationStatus[allocation.id];
    
    // Only show green tick if:
    // 1. The sector has a valid percentage (> 0) OR is a user-selected sector (any percentage)
    // 2. AND it's either explicitly marked as saved OR loaded from backend
    // 3. AND it's not currently saving or in error state
    if ((allocation.percentage > 0 || allocation.id) && status !== 'saving' && status !== 'error') {
      return true;
    }
    
    return false;
  };

  // Initialize save status for existing allocations when component first loads
  useEffect(() => {
    const initialStatus: Record<string, 'saved'> = {};
    
    // Mark existing allocations as 'saved' (including those with 0% if they have an ID from database)
    allocations.forEach(allocation => {
      if (allocation.id && !allocationStatus[allocation.id]) {
        initialStatus[allocation.id] = 'saved';
      }
    });
    
    // Only update if we have new sectors to mark as saved
    if (Object.keys(initialStatus).length > 0) {
      setAllocationStatus(prev => ({ ...prev, ...initialStatus }));
    }
  }, [allocations.length]); // Run when allocations first load or count changes

  // Track changed allocations and set their status to 'saving' on change
  useEffect(() => {
    const prev = prevAllocationsRef.current;
    const prevIds = new Set(prev.map(a => a.id));
    const currIds = new Set(allocations.map(a => a.id));
    const statusUpdates: Record<string, 'saving'> = {};

    // New or changed allocations (set to saving if percentage changed, including 0%)
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
        // Mark all sectors as saved (including those with 0% since they're now saved to database)
        allocations.forEach(a => {
          if (a.id) {
            updated[a.id] = 'saved';
          }
        });
        return { ...s, ...updated };
      });
      
      // Mark that a save completed (for debounced toast logic)
      if (userActionInProgressRef.current) {
        pendingSaveCompletedRef.current = true;
      }
    }
  }, [sectorsAutosave.state.lastSaved, sectorsAutosave.state.isSaving, sectorsAutosave.state.error, allocations]);
  
  // Debounced toast for user-initiated saves
  // Shows toast 2-3 seconds after user stops making changes
  useEffect(() => {
    if (userActionInProgressRef.current && pendingSaveCompletedRef.current && allocations.length > 0) {
      // Clear any existing timeout
      if (userActionTimeoutRef.current) {
        clearTimeout(userActionTimeoutRef.current);
      }
      
      // Set new timeout for debounced toast
      userActionTimeoutRef.current = setTimeout(() => {
        toast.success('Sectors saved successfully!', { position: 'top-right', duration: 2000 });
        userActionInProgressRef.current = false;
        pendingSaveCompletedRef.current = false;
        userActionTimeoutRef.current = null;
      }, 2500); // 2.5 second debounce
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (userActionTimeoutRef.current) {
        clearTimeout(userActionTimeoutRef.current);
      }
    };
  }, [sectorsAutosave.state.lastSaved, allocations.length]);

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
    // Mark as user-initiated action
    userActionInProgressRef.current = true;
    pendingSaveCompletedRef.current = false;
    
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
    
    // Smart percentage distribution logic
    if (newAllocations.length > 0) {
      // Auto-fill logic: if only one sector, set it to 100%
      if (newAllocations.length === 1) {
        newAllocations[0].percentage = 100;
        console.log('[SectorForm] Auto-filled single sector to 100%:', {
          code: newAllocations[0].code,
          name: newAllocations[0].name,
          percentage: newAllocations[0].percentage
        });
      } else {
        // Multiple sectors - check if existing allocations appear to be manually customized
        const existingAllocations = newAllocations.filter(a => !toAdd.includes(a.code));
        const hasCustomPercentages = existingAllocations.length > 1 &&
          existingAllocations.some(a => a.percentage > 0) &&
          !arePercentagesEquallyDistributed(existingAllocations);

        if (hasCustomPercentages && toAdd.length > 0) {
          // User has customized percentages - only assign reasonable values to new sectors
          const totalExisting = existingAllocations.reduce((sum, a) => sum + a.percentage, 0);
          const remainingPercentage = Math.max(0, 100 - totalExisting);
          const newSectorPercentage = toAdd.length > 0 ?
            parseFloat((remainingPercentage / toAdd.length).toFixed(2)) : 0;

          newAllocations = newAllocations.map(a => {
            if (toAdd.includes(a.code)) {
              return { ...a, percentage: newSectorPercentage };
            }
            return a; // Keep existing percentages unchanged
          });

          console.log('[SectorForm] Smart allocation - preserving custom percentages:', {
            totalExisting,
            remainingPercentage,
            newSectorPercentage,
            sectors: newAllocations.map(a => ({ code: a.code, percentage: a.percentage }))
          });

          // Show toast if total doesn't equal 100%
          const newTotal = newAllocations.reduce((sum, a) => sum + a.percentage, 0);
          if (Math.abs(newTotal - 100) > 0.01) {
            setTimeout(() => {
              toast.info(`Total allocation is ${newTotal.toFixed(1)}%. You may need to adjust percentages to reach 100%.`, {
                position: 'top-right',
                duration: 4000
              });
            }, 100);
          }
        }
        // If not customized, leave percentages as they are (0% for new sectors)
      }

      console.log('[SectorForm] Final sector allocation after selection change:', {
        totalSectors: newAllocations.length,
        sectors: newAllocations.map(a => ({ code: a.code, name: a.name, percentage: a.percentage })),
        trigger: 'handleSectorsChange - final allocation'
      });

      onChange(newAllocations);

      // Trigger autosave with a small delay (save all sectors)
      setTimeout(() => {
        if (sectorsAutosave && newAllocations.length > 0) {
          console.log('[SectorForm] Triggering autosave after selection change:', {
            allSectors: newAllocations.map(a => ({ code: a.code, percentage: a.percentage })),
            totalSectors: newAllocations.length
          });
          sectorsAutosave.triggerFieldSave(newAllocations);
        }
      }, 100);
    } else {
      onChange(newAllocations);
    }
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
    
    const updatedWithNew = [...allocations, newAllocation];
    
    console.log('[SectorForm] Adding sector without auto-distribution:', {
      newSector: { code: option.code, name: option.name },
      totalSectors: updatedWithNew.length
    });
    
    // Just add the sector with 0% - no auto-distribution
    onChange(updatedWithNew);
    
    // Trigger autosave with the new sector (save all sectors)
    setTimeout(() => {
      if (sectorsAutosave && updatedWithNew.length > 0) {
        console.log('[SectorForm] Triggering autosave after sector addition:', {
          allSectors: updatedWithNew.map(a => ({ code: a.code, percentage: a.percentage })),
          totalSectors: updatedWithNew.length
        });
        sectorsAutosave.triggerFieldSave(updatedWithNew);
      }
    }, 100);
  };

  // Update percentage for a specific allocation
  const updatePercentage = (id: string, percentage: number) => {
    // Mark as user-initiated action
    userActionInProgressRef.current = true;
    pendingSaveCompletedRef.current = false;
    
    const updated = allocations.map(a => 
      a.id === id ? { ...a, percentage: Math.max(0, Math.min(100, percentage)) } : a
    );
    onChange(updated);
    
    // Trigger autosave after percentage update to ensure data is saved
    setTimeout(() => {
      if (sectorsAutosave && updated.length > 0) {
        console.log('[SectorForm] Triggering autosave after percentage update:', {
          trigger: 'updatePercentage',
          allSectors: updated.map(a => ({ code: a.code, percentage: a.percentage })),
          totalSectors: updated.length,
          totalPercentage: updated.reduce((sum, a) => sum + a.percentage, 0)
        });
        sectorsAutosave.triggerFieldSave(updated);
      }
    }, 500); // Longer delay to avoid race conditions
  };

  // Remove a sector
  const removeSector = (id: string) => {
    // Mark as user-initiated action
    userActionInProgressRef.current = true;
    pendingSaveCompletedRef.current = false;
    
    const updated = allocations.filter(a => a.id !== id);
    
    console.log('[SectorForm] Removing sector without auto-redistribution:', {
      removedSectorId: id,
      remainingSectors: updated.length,
      remainingPercentages: updated.map(a => ({ code: a.code, percentage: a.percentage }))
    });
    
    // Just remove the sector - keep existing percentages
    onChange(updated);
    
    // Trigger autosave with the updated sectors (save all sectors)
    setTimeout(() => {
      if (sectorsAutosave) {
        console.log('[SectorForm] Triggering autosave after sector removal:', {
          remainingSectors: updated.map(a => ({ code: a.code, percentage: a.percentage })),
          totalSectors: updated.length
        });
        sectorsAutosave.triggerFieldSave(updated);
      }
    }, 100);
  };

  // Distribute percentages equally
  const distributeEqually = () => {
    if (allocations.length === 0) return;
    
    // Mark as user-initiated action
    userActionInProgressRef.current = true;
    pendingSaveCompletedRef.current = false;
    
    const equalShare = 100 / allocations.length;
    const updated = allocations.map(a => ({
      ...a,
      percentage: parseFloat(equalShare.toFixed(2))
    }));
    
    // Handle rounding errors to ensure total equals exactly 100%
    const total = updated.reduce((sum, alloc) => sum + alloc.percentage, 0);
    if (total !== 100 && updated.length > 0) {
      updated[0].percentage += (100 - total);
      updated[0].percentage = parseFloat(updated[0].percentage.toFixed(2));
    }
    
    onChange(updated);
    
    // Trigger autosave after equal distribution
    setTimeout(() => {
      if (sectorsAutosave && updated.length > 0) {
        console.log('[SectorForm] Triggering autosave after equal distribution:', {
          distributedSectors: updated.map(a => ({ code: a.code, percentage: a.percentage })),
          totalPercentage: updated.reduce((sum, a) => sum + a.percentage, 0)
        });
        sectorsAutosave.triggerFieldSave(updated); // Save all since they all have valid percentages
      }
    }, 100);
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

  // Notify parent of completion status changes
  useEffect(() => {
    if (onCompletionStatusChange) {
      // Small delay to ensure autosave state is properly initialized
      const timeoutId = setTimeout(() => {
        const hasValidSectors = allocations.some(sector => sector.id || sector.percentage > 0);
        const totalPercentage = allocations.reduce((sum, sector) => sum + (sector.percentage || 0), 0);
        const isProperlyAllocated = Math.abs(totalPercentage - 100) < 0.1;
        const isComplete = hasValidSectors && isProperlyAllocated;
        
        // Consider data saved if:
        // 1. localStorage indicates it's persistently saved, OR
        // 2. We have existing allocations (loaded from backend) and we're not currently saving
        const isSaved = sectorsAutosave.state.isPersistentlySaved || 
                       (allocations.length > 0 && !sectorsAutosave.state.isSaving && !sectorsAutosave.state.error);
        
        const isInProgress = sectorsAutosave.state.isSaving || (hasValidSectors && !isProperlyAllocated);
        
        console.log('[SectorForm] Completion status change:', {
          hasValidSectors,
          totalPercentage,
          isProperlyAllocated,
          isComplete,
          isSaved,
          finalStatus: isComplete && isSaved,
          autosaveState: sectorsAutosave.state
        });
        
        onCompletionStatusChange({
          isComplete: isComplete && isSaved,
          isInProgress: isInProgress,
          isSaved: isSaved
        });
      }, 100); // Small delay to ensure proper initialization
      
      return () => clearTimeout(timeoutId);
    }
  }, [allocations, sectorsAutosave.state.isPersistentlySaved, sectorsAutosave.state.isSaving, sectorsAutosave.state.error, onCompletionStatusChange]);

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
  
  // Format unallocated percentage - show precise value for amounts less than 1%
  const formatUnallocatedValue = (value: number): number => {
    if (value === 0) return 0;
    if (value < 1) return parseFloat(value.toFixed(2)); // Show 2 decimal places for values < 1%
    return Math.round(value * 10) / 10; // Show 1 decimal place for values >= 1%
  };
  
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
      {/* Mode Toggle Header */}
      {activityId && (
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex-1">
            <SectorAllocationModeToggle
              activityId={activityId}
              onModeChange={onModeChange}
              disabled={sectorMode.isSwitching}
            />
          </div>
        </div>
      )}

      {/* Locked State Alert for Transaction Mode */}
      {isLocked && (
        <Alert className="bg-amber-50 border-amber-200">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sector allocation is managed at the transaction level</p>
                <p className="text-sm mt-1">
                  The breakdown below shows the weighted average across all transactions.
                  To edit sectors, go to individual transactions.
                </p>
              </div>
              {onNavigateToTransactions && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateToTransactions}
                  className="ml-4 whitespace-nowrap border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Transactions
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

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
                value={formatUnallocatedValue(totalUnallocated)}
                currency=""
                suffix="%"
                subtitle="Remaining allocation"
                variant={totalUnallocated > 0 ? 'error' : 'default'}
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
              disabled={isLocked}
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
                  {allocations.length > 1 && !isLocked && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={distributeEqually}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={isLocked}
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
                  {!isLocked && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={clearAll}
                            className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600 active:text-red-600 focus-visible:text-red-600"
                            disabled={isLocked}
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
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <SortableHeader field="category">Sector Category</SortableHeader>
                      <SortableHeader field="sector">Sector</SortableHeader>
                      <SortableHeader field="subSector">Sub-sector</SortableHeader>
                      <SortableHeader field="percentage" className="w-40 text-center">%</SortableHeader>
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
                            "hover:bg-gray-50 transition-colors duration-150",
                            allocation.percentage === 0 && "bg-red-50 hover:bg-red-100"
                          )}
                        >
                          {/* Sector Category Code and Name */}
                          <TableCell className="py-2 text-sm">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help flex items-center gap-2 whitespace-nowrap">
                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{categoryGroupCode}</span>
                                    <span>{categoryGroupName}</span>
                                    <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 transition-colors duration-150 flex-shrink-0" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent 
                                  side="top" 
                                  className="max-w-sm p-4 bg-white border border-gray-200 shadow-lg"
                                  sideOffset={8}
                                >
                                  <div className="space-y-3">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</span>
                                        <span className="text-sm font-semibold text-gray-900">{categoryGroupName}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sector</span>
                                        <span className="text-sm font-semibold text-gray-900">{sectorName.replace(/^\d{3}\s*-\s*/, '')}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sub-sector</span>
                                        <span className="text-sm font-semibold text-gray-900">{subSectorName}</span>
                                      </div>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Allocation</span>
                                        <span className="text-lg font-bold text-gray-900">{allocation.percentage}%</span>
                                      </div>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          
                          {/* Sector Code and Name */}
                          <TableCell className="py-2 text-sm">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help flex items-center gap-2 whitespace-nowrap">
                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{sectorCode}</span>
                                    <span>{sectorName.replace(/^\d{3}\s*-\s*/, '')}</span>
                                    <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 transition-colors duration-150 flex-shrink-0" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent 
                                  side="top" 
                                  className="max-w-sm p-4 bg-white border border-gray-200 shadow-lg"
                                  sideOffset={8}
                                >
                                  <div className="space-y-3">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</span>
                                        <span className="text-sm font-semibold text-gray-900">{categoryGroupName}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sector</span>
                                        <span className="text-sm font-semibold text-gray-900">{sectorName.replace(/^\d{3}\s*-\s*/, '')}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sub-sector</span>
                                        <span className="text-sm font-semibold text-gray-900">{subSectorName}</span>
                                      </div>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Allocation</span>
                                        <span className="text-lg font-bold text-gray-900">{allocation.percentage}%</span>
                                      </div>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          
                          {/* Sub-sector Code and Name */}
                          <TableCell className="py-2 text-sm">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help flex items-center gap-2 whitespace-nowrap">
                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{subSectorCode}</span>
                                    <span>{subSectorName}</span>
                                    <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 transition-colors duration-150 flex-shrink-0" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent 
                                  side="top" 
                                  className="max-w-sm p-4 bg-white border border-gray-200 shadow-lg"
                                  sideOffset={8}
                                >
                                  <div className="space-y-3">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</span>
                                        <span className="text-sm font-semibold text-gray-900">{categoryGroupName}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sector</span>
                                        <span className="text-sm font-semibold text-gray-900">{sectorName.replace(/^\d{3}\s*-\s*/, '')}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sub-sector</span>
                                        <span className="text-sm font-semibold text-gray-900">{subSectorName}</span>
                                      </div>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Allocation</span>
                                        <span className="text-lg font-bold text-gray-900">{allocation.percentage}%</span>
                                      </div>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          
                          {/* Percentage Input */}
                          <TableCell className="py-2">
                            <div className="flex items-center gap-5">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-help">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.001"
                                        value={formatPercentageDisplay(allocation.percentage || 0)}
                                        onChange={(e) => updatePercentage(allocation.id, parseFloat(e.target.value) || 0)}
                                        disabled={isLocked}
                                        className={cn(
                                          "w-24 h-8 text-sm text-center font-mono p-2",
                                          allocation.percentage === 0 && "border-red-300",
                                          isLocked && "bg-gray-100 cursor-not-allowed"
                                        )}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent 
                                    side="top" 
                                    className="max-w-sm p-4 bg-white border border-gray-200 shadow-lg"
                                    sideOffset={8}
                                  >
                                    <div className="space-y-3">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</span>
                                          <span className="text-sm font-semibold text-gray-900">{categoryGroupName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sector</span>
                                          <span className="text-sm font-semibold text-gray-900">{sectorName.replace(/^\d{3}\s*-\s*/, '')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sub-sector</span>
                                          <span className="text-sm font-semibold text-gray-900">{subSectorName}</span>
                                        </div>
                                      </div>
                                      <div className="pt-2 border-t border-gray-100">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Allocation</span>
                                          <span className="text-lg font-bold text-gray-900">{allocation.percentage}%</span>
                                        </div>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {/* Save Status Icon */}
                              {allocationStatus[allocation.id] === 'saving' && (
                                <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
                              )}
                              {shouldShowGreenTick(allocation) && (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              )}
                              {allocationStatus[allocation.id] === 'error' && (
                                <AlertCircle className="h-3 w-3 text-red-600" />
                              )}
                            </div>
                          </TableCell>
                          
                          {/* Action - Delete Button */}
                          <TableCell className="py-2 text-center">
                            {!isLocked && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSector(allocation.id)}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* Unallocated Row */}
                    {totalUnallocated > 0 && (
                      <TableRow className="text-red-600 bg-red-50 border-red-200">
                        <TableCell colSpan={3} className="py-2 px-4 font-medium">
                          Unallocated
                        </TableCell>
                        <TableCell className="text-center font-mono py-2 font-semibold">
                          {formatUnallocatedValue(totalUnallocated)}%
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

        {/* Visualization - Interactive Charts */}
        {allocations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Sector Allocation Visualization</CardTitle>
                <HelpTextTooltip content="Interactive Sankey diagram showing sector allocation hierarchy from categories to sectors to subsectors">
                  <HelpCircle className="w-4 h-4 text-gray-500 hover:text-gray-700 cursor-help" />
                </HelpTextTooltip>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-hidden w-full">
                <SectorSankeyVisualization
                  allocations={allocations}
                  onSegmentClick={handleSunburstSegmentClick}
                  showControls={false}
                  defaultView="sankey"
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 
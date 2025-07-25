'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Sparkles,
  Info
} from 'lucide-react';
import { HeroCard } from '@/components/ui/hero-card';
import { SectorSelect, transformSectorGroups } from '@/components/forms/SectorSelect';
import { useSectorsAutosave } from '@/hooks/use-field-autosave-new';
import { useUser } from '@/hooks/useUser';
import SectorSunburstChart, { getCategoryColorBySunburstChart } from '@/components/charts/SectorSunburstChart';
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

// Color mapping for sector categories
const getCategoryColor = (categoryCode: string): string => {
  const colors: { [key: string]: string } = {
    '111': '#3B82F6', // Education
    '121': '#10B981', // Health
    '130': '#8B5CF6', // Population
    '140': '#F59E0B', // Water Supply & Sanitation
    '150': '#6366F1', // Government & Civil Society
    '160': '#EC4899', // Other Social Infrastructure
    '210': '#84CC16', // Transport & Storage
    '220': '#06B6D4', // Communications
    '230': '#F97316', // Energy
    '240': '#14B8A6', // Banking & Financial Services
    '250': '#F43F5E', // Business & Other Services
    '310': '#22C55E', // Agriculture, Forestry, Fishing
    '320': '#A855F7', // Industry, Mining, Construction
    '330': '#0EA5E9', // Trade Policies & Regulations
    '410': '#EAB308', // General Environmental Protection
    '430': '#EF4444', // Other Multisector
    '510': '#8B5A2B', // General Budget Support
    '520': '#6B7280', // Developmental Food Aid
    '530': '#059669', // Other Commodity Assistance
    '600': '#DC2626', // Action Relating to Debt
    '700': '#7C3AED', // Humanitarian Aid
    '910': '#F97316', // Administrative Costs
    '920': '#84CC16', // Support to NGOs
    '930': '#06B6D4', // Refugees in Donor Countries
    '998': '#6B7280', // Unallocated/Unspecified
  };
  return colors[categoryCode] || '#6B7280';
};

const getSectorInfo = (code: string): { name: string; description: string; category: string; categoryCode: string } => {
  const dacSectorsData = require('@/data/dac-sectors.json');
  
  // Search through all categories to find the sector
  for (const [categoryName, sectors] of Object.entries(dacSectorsData)) {
    const sectorArray = sectors as any[];
    const sector = sectorArray.find((s: any) => s.code === code);
    
    if (sector) {
      const categoryCode = sector.code.substring(0, 3);
      return {
        name: sector.name,
        description: sector.description || '',
        category: categoryName,
        categoryCode: categoryCode
      };
    }
  }
  
  // Fallback if sector not found
  return {
    name: `Sector ${code}`,
    description: '',
    category: `Category ${code.substring(0, 3)}`,
    categoryCode: code.substring(0, 3)
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
  useEffect(() => {
    if (sectorsAutosave.state.lastSaved && !sectorsAutosave.state.isSaving && !sectorsAutosave.state.error) {
      setAllocationStatus(s => {
        const updated: Record<string, 'saved'> = {};
        allocations.forEach(a => { updated[a.id] = 'saved'; });
        return updated;
      });
      toast.success('Sectors saved successfully!', { position: 'top-right', duration: 3000 });
    }
  }, [sectorsAutosave.state.lastSaved, sectorsAutosave.state.isSaving, sectorsAutosave.state.error, allocations]);

  // On save error, set all 'saving' allocations to 'error'
  useEffect(() => {
    if (sectorsAutosave.state.error) {
      setAllocationStatus(s => {
        const updated = { ...s };
        Object.keys(updated).forEach(id => {
          if (updated[id] === 'saving') updated[id] = 'error';
        });
        return updated;
      });
      toast.error('Failed to save sectors. Please try again.', { position: 'top-right', duration: 4000 });
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
    // Add new allocations for newly selected codes
    const currentCodes = allocations.map(a => a.code);
    const toAdd = sectorCodes.filter(code => !currentCodes.includes(code));
    const toRemove = currentCodes.filter(code => !sectorCodes.includes(code));
    let newAllocations = [...allocations];
    // Add
    toAdd.forEach(code => {
      const group = transformSectorGroups().find(g => g.options.some(o => o.code === code));
      const option = group?.options.find(o => o.code === code);
      if (option && group) {
        const sectorInfo = getSectorInfo(code);
        newAllocations.push({
          id: crypto.randomUUID(),
          code: option.code,
          name: option.name,
          percentage: 0,
          category: sectorInfo.category,
          categoryCode: option.code.substring(0, 3)
        });
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

  // Save to autosave when allocations change
  useEffect(() => {
    if (allocations.length > 0) {
      sectorsAutosave.saveNow(allocations);
    }
  }, [allocations, sectorsAutosave]);

  // Calculate summary statistics
  const totalAllocated = allocations.reduce((sum, a) => sum + (a.percentage || 0), 0);
  const totalUnallocated = Math.max(0, 100 - totalAllocated);
  const sectorCount = allocations.length;
  const subSectorCount = allocations.filter(a => a.code.length > 3).length;

  return (
    <div className="space-y-6">
      {/* Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroCard
          title="% Allocated"
          value={totalAllocated}
          suffix="%"
          subtitle="Total sector allocation"
        />
        <HeroCard
          title="% Unallocated"
          value={totalUnallocated}
          suffix="%"
          subtitle="Remaining allocation"
        />
        <HeroCard
          title="Sectors"
          value={sectorCount}
          subtitle="Total sectors selected"
        />
        <HeroCard
          title="Sub-sectors"
          value={subSectorCount}
          subtitle="Detailed sector breakdown"
        />
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
            <CardContent className="space-y-3">
              {Object.entries(groupedAllocations).map(([category, grouped]) => (
                <div key={category} className="mb-4">
                  <div className="font-semibold text-sm text-gray-700 mb-2">{category}</div>
                  <div className="space-y-2">
                    {grouped.map((allocation) => {
                      const sectorInfo = getSectorInfo(allocation.code);
                      const categoryCode = sectorInfo.categoryCode;
                      return (
                        <div
                          key={allocation.id}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-lg border transition-all",
                            allocation.percentage === 0 && "bg-red-50 border-red-200"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900">
                              {allocation.code} – {allocation.name || sectorInfo.name.split(' – ')[1] || allocation.code}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {sectorInfo.category}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Progress Bar */}
                            <div className="w-32">
                              <Progress 
                                value={allocation.percentage} 
                                className="h-6"
                                style={{
                                  '--progress-foreground': getCategoryColor(categoryCode)
                                } as React.CSSProperties}
                              />
                              <div className="text-xs text-center mt-1 font-medium font-mono">
                                {allocation.percentage.toFixed(1)}%
                              </div>
                            </div>
                            {/* Per-allocation save status icon */}
                            {allocationStatus[allocation.id] === 'saving' && (
                              <span title="Saving..."><Loader2 className="h-4 w-4 animate-spin text-orange-500" /></span>
                            )}
                            {allocationStatus[allocation.id] === 'saved' && (
                              <span title="Saved"><CheckCircle className="h-4 w-4 text-green-600" /></span>
                            )}
                            {allocationStatus[allocation.id] === 'error' && (
                              <span title="Save failed"><AlertCircle className="h-4 w-4 text-red-600" /></span>
                            )}
                            {/* Percentage Input */}
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={allocation.percentage || ''}
                              onChange={(e) => updatePercentage(allocation.id, parseFloat(e.target.value) || 0)}
                              className={cn(
                                "w-20 h-10 text-sm text-center font-mono",
                                allocation.percentage === 0 && "border-red-300"
                              )}
                            />
                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSector(allocation.id)}
                              className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Distribute Equally Button only if more than one allocation */}
              {allocations.length > 1 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={distributeEqually}
                  className="text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Distribute Equally
                </Button>
              )}
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

        {/* Sunburst Chart Visualization */}
        {allocations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sector Allocation Sunburst</CardTitle>
              <CardDescription>
                Interactive sunburst chart showing sector allocation hierarchy
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[500px] relative">
                <SectorSunburstChart allocations={allocations} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 
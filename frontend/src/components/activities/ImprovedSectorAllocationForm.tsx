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
import { EnhancedSectorSelect } from '@/components/forms/EnhancedSectorSelect';
import { getSectorByCode, getHierarchyByCode } from '@/data/sector-hierarchy';
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

// Get category color that matches the sunburst chart
const getCategoryColor = (categoryCode: string, allAllocations: SectorAllocation[]): string => {
  return getCategoryColorBySunburstChart(allAllocations, categoryCode);
};

const getSectorInfo = (code: string): { name: string; description: string; category: string; categoryCode: string } => {
  const { group, sector, subsector, level } = getHierarchyByCode(code);
  
  if (level === 'group' && group) {
    return {
      name: group.name,
      description: '',
      category: group.name,
      categoryCode: group.code
    };
  }
  
  if (level === 'sector' && group && sector) {
    return {
      name: sector.name,
      description: '',
      category: group.name,
      categoryCode: sector.code
    };
  }
  
  if (level === 'subsector' && group && sector && subsector) {
    return {
      name: subsector.name,
      description: subsector.description || '',
      category: group.name,
      categoryCode: sector.code
    };
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
  const [isHierarchyLoading, setIsHierarchyLoading] = useState(false);

  // Per-allocation save status - initialize with persistent saved state
  const [allocationStatus, setAllocationStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>(() => {
    // If sectors are persistently saved, initialize all current allocations as 'saved'
    if (sectorsAutosave.state.isPersistentlySaved && allocations.length > 0) {
      const initialStatus: Record<string, 'saved'> = {};
      allocations.forEach(allocation => {
        initialStatus[allocation.id] = 'saved';
      });
      return initialStatus;
    }
    return {};
  });
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

  // Initialize allocation status when persistent save state is available
  useEffect(() => {
    if (sectorsAutosave.state.isPersistentlySaved && allocations.length > 0) {
      setAllocationStatus(currentStatus => {
        const newStatus: Record<string, 'saved'> = {};
        allocations.forEach(allocation => {
          // Only set to 'saved' if not already in a different state (like 'saving')
          if (!currentStatus[allocation.id] || currentStatus[allocation.id] === 'error') {
            newStatus[allocation.id] = 'saved';
          }
        });
        return { ...currentStatus, ...newStatus };
      });
    }
  }, [sectorsAutosave.state.isPersistentlySaved, allocations]);

  // Enhanced autosave result logging
  useEffect(() => {
    if (sectorsAutosave.state.error) {
      console.error('❌ [SectorAutosave] === SAVE FAILED ===');
      console.error('💥 [SectorAutosave] Error:', sectorsAutosave.state.error);
      console.error('📊 [SectorAutosave] Failed to save allocations:', allocations.length);
      console.error('🏢 [SectorAutosave] Activity ID:', activityId);
      console.error('👤 [SectorAutosave] User ID:', user?.id);
    }
    if (sectorsAutosave.state.lastSaved) {
      console.log('✅ [SectorAutosave] === SAVE SUCCESSFUL ===');
      console.log('💾 [SectorAutosave] Last saved:', sectorsAutosave.state.lastSaved);
      console.log('📊 [SectorAutosave] Saved allocations count:', allocations.length);
      console.log('🏢 [SectorAutosave] Activity ID:', activityId);
      console.log('👤 [SectorAutosave] User ID:', user?.id);
    }
    if (sectorsAutosave.state.isSaving) {
      console.log('⏳ [SectorAutosave] === SAVING IN PROGRESS ===');
      console.log('📊 [SectorAutosave] Saving allocations:', allocations.length);
    }
  }, [sectorsAutosave.state.error, sectorsAutosave.state.lastSaved, sectorsAutosave.state.isSaving, allocations.length, activityId, user?.id]);

  // Determine if all sectors are saved (for green checkmark)
  const allSectorsSaved = useMemo(() => {
    if (allocations.length === 0) return false;
    if (sectorsAutosave.state.isSaving) return false;
    if (sectorsAutosave.state.error) return false;
    
    // Show persistent saved state OR recent successful save
    if (sectorsAutosave.state.isPersistentlySaved) return true;
    if (!sectorsAutosave.state.lastSaved) return false;
    
    // Check if we have recent successful save (show for 2 seconds after save)
    const lastSavedTime = new Date(sectorsAutosave.state.lastSaved).getTime();
    const twoSecondsAgo = Date.now() - 2000;
    return lastSavedTime > twoSecondsAgo;
  }, [sectorsAutosave.state.isSaving, sectorsAutosave.state.error, sectorsAutosave.state.lastSaved, sectorsAutosave.state.isPersistentlySaved, allocations.length]);

  // Handler for multi-select
  const handleSectorsChange = (sectorCodes: string[]) => {
    try {
      setIsHierarchyLoading(true);
      
      // Add new allocations for newly selected codes
      const currentCodes = allocations.map(a => a.code);
      const toAdd = sectorCodes.filter(code => !currentCodes.includes(code));
      const toRemove = currentCodes.filter(code => !sectorCodes.includes(code));
      let newAllocations = [...allocations];
      
      // Add new sectors
      const failedCodes: string[] = [];
      toAdd.forEach(code => {
        // Determine level from code
        const determineLevel = (code: string): 'group' | 'sector' | 'subsector' => {
          if (code.length === 3) return 'group';
          if (code.length === 5) return 'subsector';
          return 'sector';
        };
        
        const level = determineLevel(code);
        const { group, sector, subsector } = getHierarchyByCode(code);
        
        if (level === 'group' && group) {
          // Group level selection
          newAllocations.push({
            id: crypto.randomUUID(),
            code: group.code,
            name: group.name,
            percentage: 0,
            level: 'group',
            category: group.name,
            categoryCode: group.code
          });
        } else if (level === 'sector' && group && sector) {
          // Sector level selection
          newAllocations.push({
            id: crypto.randomUUID(),
            code: sector.code,
            name: sector.name,
            percentage: 0,
            level: 'sector',
            category: group.name,
            categoryCode: sector.code,
            categoryName: sector.name
          });
        } else if (level === 'subsector' && group && sector && subsector) {
          // Sub-sector level selection
          newAllocations.push({
            id: crypto.randomUUID(),
            code: subsector.code,
            name: subsector.name,
            percentage: 0,
            level: 'subsector',
            category: group.name,
            categoryCode: sector.code,
            categoryName: sector.name
          });
        } else {
          failedCodes.push(code);
        }
      });
      
      // Show warning for failed codes
      if (failedCodes.length > 0) {
        toast.warning(`Could not find hierarchy data for: ${failedCodes.join(', ')}`);
      }
      
      // Remove deselected sectors
      newAllocations = newAllocations.filter(a => !toRemove.includes(a.code));
      onChange(newAllocations);
    } catch (error) {
      console.error('Error updating sector selection:', error);
      toast.error('Failed to update sector selection. Please try again.');
    } finally {
      setIsHierarchyLoading(false);
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
    
    if (totalPercentage > 100.1) { // Allow small floating point precision errors
      errors.push(`Total percentage (${totalPercentage.toFixed(1)}%) exceeds 100%`);
    }
    
    if (totalPercentage < 99.9 && allocs.length > 0) { // Allow small tolerance for 100%
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

  // Add ref to track previous allocations for deep comparison
  const previousAllocationsRef = useRef<SectorAllocation[]>([]);
  
  // Helper function to perform deep comparison of sector allocations
  const areAllocationsEqual = (prev: SectorAllocation[], current: SectorAllocation[]): boolean => {
    if (prev.length !== current.length) return false;
    
    // Sort both arrays by id to ensure consistent comparison
    const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
    const sortedCurrent = [...current].sort((a, b) => a.id.localeCompare(b.id));
    
    return sortedPrev.every((prevAlloc, index) => {
      const currentAlloc = sortedCurrent[index];
      return (
        prevAlloc.id === currentAlloc.id &&
        prevAlloc.code === currentAlloc.code &&
        prevAlloc.name === currentAlloc.name &&
        prevAlloc.percentage === currentAlloc.percentage &&
        prevAlloc.level === currentAlloc.level &&
        prevAlloc.category === currentAlloc.category &&
        prevAlloc.categoryCode === currentAlloc.categoryCode &&
        prevAlloc.categoryName === currentAlloc.categoryName
      );
    });
  };
  
  // Save to autosave when allocations actually change (with deep comparison)
  useEffect(() => {
    console.log('🔍 [SectorForm] === SECTOR SAVING DEBUG ===');
    console.log('🏢 [SectorForm] Activity ID:', activityId);
    console.log('👤 [SectorForm] User ID:', user?.id);
    console.log('📊 [SectorForm] Allocations count:', allocations.length);
    console.log('⚙️ [SectorForm] Autosave state:', sectorsAutosave.state);
    
    // Check if we have required data for saving
    if (!activityId) {
      console.error('❌ [SectorForm] No Activity ID - cannot save sectors');
      return;
    }
    
    if (!user?.id) {
      console.error('❌ [SectorForm] No User ID - cannot save sectors');
      return;
    }
    
    // Perform deep comparison to check if allocations actually changed
    const previousAllocations = previousAllocationsRef.current;
    const allocationsChanged = !areAllocationsEqual(previousAllocations, allocations);
    
    console.log('🔄 [SectorForm] Allocations changed check:', allocationsChanged);
    console.log('📊 [SectorForm] Previous allocations count:', previousAllocations.length);
    console.log('📊 [SectorForm] Current allocations count:', allocations.length);
    
    if (!allocationsChanged) {
      console.log('⏩ [SectorForm] Allocations unchanged - skipping save');
      return;
    }
    
    // Update the ref with current allocations
    previousAllocationsRef.current = [...allocations];
    
    if (allocations.length > 0) {
      console.log('📊 [SectorForm] Allocations to save:', JSON.stringify(allocations, null, 2));
      
      // Check data structure
      allocations.forEach((allocation, index) => {
        console.log(`📋 [SectorForm] Allocation ${index + 1}:`, {
          id: allocation.id,
          code: allocation.code,
          name: allocation.name,
          percentage: allocation.percentage,
          level: allocation.level || 'unknown',
          category: allocation.category,
          categoryCode: allocation.categoryCode
        });
      });
      
      console.log('💾 [SectorForm] Calling sectorsAutosave.saveNow()...');
      sectorsAutosave.saveNow(allocations);
    } else {
      console.log('⚠️ [SectorForm] No allocations to save (empty array) - but this is a valid change, saving...');
      sectorsAutosave.saveNow(allocations);
    }
  }, [allocations, sectorsAutosave, activityId, user?.id]);

  // Calculate summary statistics
  const totalAllocated = allocations.reduce((sum, a) => sum + (a.percentage || 0), 0);
  const totalUnallocated = Math.max(0, 100 - totalAllocated);
  const sectorCount = allocations.length;
  const subSectorCount = allocations.filter(a => a.code.length > 3).length;
  const categoryCount = Object.keys(groupedAllocations).length;

  return (
    <div className="space-y-6">
      {/* Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <HeroCard
          title="% Allocated"
          value={totalAllocated}
          currency=""
          suffix="%"
          subtitle="Total sector allocation"
        />
        <HeroCard
          title="% Unallocated"
          value={totalUnallocated}
          currency=""
          suffix="%"
          subtitle="Remaining allocation"
        />
        <HeroCard
          title="Categories"
          value={categoryCount}
          currency=""
          subtitle="Sector categories selected"
        />
        <HeroCard
          title="Sectors"
          value={sectorCount}
          currency=""
          subtitle="Total sectors selected"
        />
        <HeroCard
          title="Sub-sectors"
          value={subSectorCount}
          currency=""
          subtitle="Detailed sector breakdown"
        />
      </div>

      {/* Form Interface */}
      <div className="space-y-6 w-full">
        {/* Sector Dropdown */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <span>Select Sectors from Hierarchy</span>
              <Badge variant="secondary" className="text-xs">
                Enhanced
              </Badge>
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Browse Groups → Sectors → Sub-sectors using the official OECD DAC classification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <EnhancedSectorSelect
                value={selectedSectors}
                onValueChange={handleSectorsChange}
                placeholder="Choose sector(s) from hierarchy..."
                className="w-full"
                maxSelections={20}
              />
              {isHierarchyLoading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Sectors */}
        {allocations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Selected Sectors</CardTitle>
                  {allSectorsSaved && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>All sectors saved successfully</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
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
                              {allocation.code} – {allocation.name || sectorInfo.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {allocation.categoryName && allocation.categoryCode ? 
                                `${allocation.categoryCode} - ${allocation.categoryName}` : 
                                sectorInfo.category
                              }
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Progress Bar */}
                            <div className="w-32">
                              <Progress 
                                value={allocation.percentage} 
                                className="h-6"
                                style={{
                                  '--progress-foreground': getCategoryColor(categoryCode, allocations)
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
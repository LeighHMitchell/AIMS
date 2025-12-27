'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, AlertCircle, Info, BarChart2, PieChart, Copy, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { SectorSelect, getSectorLabel, getSectorDescription } from '@/components/forms/SectorSelect';
import { SectorValidation } from '@/types/sector';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// Broad/residual DAC sector codes that should trigger a guidance alert
const BROAD_SECTOR_CODES = [
  '43010', // Multisector aid
  '43082', // Research / scientific institutions
  '43050', // Non-agricultural alternative development
  '52010', // Food aid / food security programmes
  '43081', // Multisector education / training programmes
  '99810', // Sectors not specified
];

// Helper to check if a sector code is broad/residual
const isBroadSectorCode = (code: string): boolean => {
  // Check explicit broad sector codes
  if (BROAD_SECTOR_CODES.includes(code)) return true;

  // Check for 3-digit parent codes (codes ending in 00 at positions 4-5)
  if (code.length === 5 && code.endsWith('00')) return true;

  // Check for 3-digit codes (should be 5 digits for specific sectors)
  if (code.length === 3) return true;

  return false;
};

// Helper to check if a sector code is specific (5-digit, not ending in 00)
const isSpecificSectorCode = (code: string): boolean => {
  return code.length === 5 && !code.endsWith('00');
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

interface SectorAllocation {
  id: string;
  code: string;
  percentage: number;
  categoryName?: string;
  category?: string;
}

interface EnhancedSectorAllocationFormProps {
  allocations: SectorAllocation[];
  onChange: (allocations: SectorAllocation[]) => void;
  onValidationChange?: (validation: SectorValidation) => void;
  allowPublish?: boolean;
}

export default function EnhancedSectorAllocationForm({ 
  allocations = [], 
  onChange, 
  onValidationChange,
  allowPublish = true 
}: EnhancedSectorAllocationFormProps) {
  const [localAllocations, setLocalAllocations] = useState<SectorAllocation[]>(() => 
    allocations.length > 0 ? allocations : []
  );
  const [selectedSectors, setSelectedSectors] = useState<string[]>(() => 
    allocations.map(a => a.code)
  );
  
  // Sync props changes to local state (but only when props actually change)
  const lastPropsRef = useRef(allocations);
  useEffect(() => {
    if (JSON.stringify(allocations) !== JSON.stringify(lastPropsRef.current)) {
      lastPropsRef.current = allocations;
      setLocalAllocations(allocations);
      setSelectedSectors(allocations.map(a => a.code));
    }
  }, [allocations]);
  const [validation, setValidation] = useState<SectorValidation>({ 
    isValid: false, 
    totalPercentage: 0, 
    remainingPercentage: 100,
    errors: [] 
  });
  const [visualizationType, setVisualizationType] = useState<'donut' | 'bar'>('donut');

  // Check for broad/residual sector codes and determine if warning should show
  const broadSectorWarning = React.useMemo(() => {
    const broadSectors = localAllocations.filter(a => isBroadSectorCode(a.code));
    const specificSectors = localAllocations.filter(a => isSpecificSectorCode(a.code));

    // Only show warning if there are broad sectors AND no specific sectors
    // (optional behavior: don't show if at least one specific code is selected)
    const shouldShow = broadSectors.length > 0 && specificSectors.length === 0;

    return {
      shouldShow,
      broadSectors: broadSectors.map(a => ({
        code: a.code,
        label: getSectorLabel(a.code)
      }))
    };
  }, [localAllocations]);

  // Validate allocations
  useEffect(() => {
    const total = localAllocations.reduce((sum, alloc) => sum + (alloc.percentage || 0), 0);
    const errors: string[] = [];
    
    if (localAllocations.length === 0) {
      errors.push('At least one sector allocation is required');
    }
    
    if (total !== 100 && localAllocations.length > 0) {
      if (total > 100) {
        errors.push(`Total allocation exceeds 100% (currently ${total.toFixed(1)}%)`);
      } else {
        errors.push(`Total allocation is only ${total.toFixed(1)}% (must equal 100%)`);
      }
    }
    
    // Check for duplicate sectors
    const codes = localAllocations.map(a => a.code);
    const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate sectors detected: ${duplicates.join(', ')}`);
    }
    
    // Check for invalid percentages
    const invalidPercentages = localAllocations.filter(a => 
      isNaN(a.percentage) || a.percentage <= 0 || a.percentage > 100
    );
    if (invalidPercentages.length > 0) {
      errors.push('All percentages must be between 0.1% and 100%');
    }
    
    const newValidation: SectorValidation = {
      isValid: errors.length === 0 && total === 100,
      totalPercentage: total,
      remainingPercentage: 100 - total,
      errors
    };
    
    setValidation(newValidation);
    if (onValidationChange) {
      onValidationChange(newValidation);
    }

    // Show toast notification for over-allocation errors
    if (errors.length > 0 && localAllocations.length > 0) {
      const overAllocationError = errors.find(error => 
        error.includes('exceeds 100%') || error.includes('only') && error.includes('%')
      );
      
      if (overAllocationError) {
        toast.error(overAllocationError, {
          position: 'top-center',
          duration: 4000,
        });
      }
    }
  }, [localAllocations, onValidationChange]);

  // Use ref to track if we should sync with parent to prevent infinite loops
  const isInitialMount = useRef(true);
  const lastSyncedAllocations = useRef<SectorAllocation[]>([]);

  // Sync with parent component only when allocations actually change
  useEffect(() => {
    // Skip initial mount to prevent immediate sync
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastSyncedAllocations.current = localAllocations;
      return;
    }

    // Only sync if allocations have actually changed
    const hasChanged = JSON.stringify(localAllocations) !== JSON.stringify(lastSyncedAllocations.current);
    if (hasChanged) {
      lastSyncedAllocations.current = localAllocations;
      onChange(localAllocations);
    }
  }, [localAllocations, onChange]);

  // Sync selected sectors for the dropdown
  useEffect(() => {
    const newSelectedSectors = localAllocations.map(a => a.code);
    setSelectedSectors(prev => {
      // Only update if the array has actually changed
      if (prev.length !== newSelectedSectors.length || 
          !prev.every((sector, index) => sector === newSelectedSectors[index])) {
        return newSelectedSectors;
      }
      return prev;
    });
  }, [localAllocations]);

  const addSector = (sectorCode: string) => {
    if (localAllocations.find(a => a.code === sectorCode)) {
      return; // Already exists
    }
    
    const newAllocation: SectorAllocation = {
      id: uuidv4(),
      code: sectorCode,
      percentage: 0
    };
    
    setLocalAllocations(prev => {
      const updatedWithNew = [...prev, newAllocation];
      
      // Auto-distribute percentages equally among all sectors
      const equalShare = 100 / updatedWithNew.length;
      const autoBalanced = updatedWithNew.map(a => ({
        ...a,
        percentage: parseFloat(equalShare.toFixed(2))
      }));
      
      // Handle rounding errors by adjusting the first allocation
      const total = autoBalanced.reduce((sum, a) => sum + a.percentage, 0);
      if (total !== 100 && autoBalanced.length > 0) {
        autoBalanced[0].percentage += (100 - total);
        autoBalanced[0].percentage = parseFloat(autoBalanced[0].percentage.toFixed(2));
      }
      
      console.log('[EnhancedSectorForm] Auto-distributing percentages:', {
        totalSectors: autoBalanced.length,
        equalShare,
        autoBalanced: autoBalanced.map(a => ({ code: a.code, percentage: a.percentage }))
      });
      
      return autoBalanced;
    });
  };

  const removeSector = (id: string) => {
    setLocalAllocations(prev => {
      const updated = prev.filter(a => a.id !== id);
      
      // Auto-distribute percentages equally among remaining sectors
      if (updated.length > 0) {
        const equalShare = 100 / updated.length;
        const autoBalanced = updated.map(a => ({
          ...a,
          percentage: parseFloat(equalShare.toFixed(2))
        }));
        
        // Handle rounding errors by adjusting the first allocation
        const total = autoBalanced.reduce((sum, a) => sum + a.percentage, 0);
        if (total !== 100 && autoBalanced.length > 0) {
          autoBalanced[0].percentage += (100 - total);
          autoBalanced[0].percentage = parseFloat(autoBalanced[0].percentage.toFixed(2));
        }
        
        console.log('[EnhancedSectorForm] Auto-redistributing after removal:', {
          remainingSectors: autoBalanced.length,
          equalShare,
          autoBalanced: autoBalanced.map(a => ({ code: a.code, percentage: a.percentage }))
        });
        
        return autoBalanced;
      } else {
        return updated;
      }
    });
  };

  const updatePercentage = (id: string, percentage: number) => {
    setLocalAllocations(prev => 
      prev.map(a => a.id === id ? { ...a, percentage: Math.max(0, Math.min(100, percentage)) } : a)
    );
  };

  const handleSectorSelection = (sectors: string[]) => {
    setSelectedSectors(sectors);
    
    const currentCodes = localAllocations.map(a => a.code);
    const toAdd = sectors.filter(code => !currentCodes.includes(code));
    const toRemove = currentCodes.filter(code => !sectors.includes(code));
    
    setLocalAllocations(prev => {
      let newAllocations = [...prev];
      
      // Add new sectors
      toAdd.forEach(code => {
        if (!newAllocations.find(a => a.code === code)) {
          const newAllocation: SectorAllocation = {
            id: uuidv4(),
            code: code,
            percentage: 0
          };
          newAllocations.push(newAllocation);
        }
      });
      
      // Remove deselected sectors
      newAllocations = newAllocations.filter(a => !toRemove.includes(a.code));
      
      // Smart percentage distribution logic
      if (newAllocations.length > 0) {
        // Check if existing allocations appear to be manually customized
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
          
          const smartAllocated = newAllocations.map(a => {
            if (toAdd.includes(a.code)) {
              return { ...a, percentage: newSectorPercentage };
            }
            return a; // Keep existing percentages unchanged
          });
          
          console.log('[EnhancedSectorForm] Smart allocation - preserving custom percentages:', {
            totalExisting,
            remainingPercentage,
            newSectorPercentage,
            smartAllocated: smartAllocated.map(a => ({ code: a.code, percentage: a.percentage }))
          });
          
          // Show toast if total doesn't equal 100%
          const newTotal = smartAllocated.reduce((sum, a) => sum + a.percentage, 0);
          if (Math.abs(newTotal - 100) > 0.01) {
            setTimeout(() => {
              toast.info(`Total allocation is ${newTotal.toFixed(1)}%. You may need to adjust percentages to reach 100%.`, {
                position: 'top-center',
                duration: 4000
              });
            }, 100);
          }
          
          return smartAllocated;
        } else {
          // Auto-distribute equally (default behavior for new selections or equal distributions)
          const equalShare = 100 / newAllocations.length;
          const autoBalanced = newAllocations.map(a => ({
            ...a,
            percentage: parseFloat(equalShare.toFixed(2))
          }));
          
          // Handle rounding errors by adjusting the first allocation
          const total = autoBalanced.reduce((sum, a) => sum + a.percentage, 0);
          if (total !== 100 && autoBalanced.length > 0) {
            autoBalanced[0].percentage += (100 - total);
            autoBalanced[0].percentage = parseFloat(autoBalanced[0].percentage.toFixed(2));
          }
          
          console.log('[EnhancedSectorForm] Auto-distributing percentages equally:', {
            totalSectors: autoBalanced.length,
            equalShare,
            autoBalanced: autoBalanced.map(a => ({ code: a.code, percentage: a.percentage }))
          });
          
          return autoBalanced;
        }
      } else {
        return newAllocations;
      }
    });
  };

  const distributeEqually = () => {
    if (localAllocations.length === 0) return;
    
    const equalPercentage = 100 / localAllocations.length;
    setLocalAllocations(prev => 
      prev.map(allocation => ({ ...allocation, percentage: equalPercentage }))
    );
  };

  const clearAll = () => {
    setLocalAllocations([]);
    setSelectedSectors([]);
  };

  const formatPercentage = (value: number): string => {
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  };

  // Group allocations by category
  const groupedAllocations = localAllocations.reduce((acc, allocation) => {
    // Try to get category from allocation, fallback to 'Other'
    const category = allocation.categoryName || allocation.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(allocation);
    return acc;
  }, {} as Record<string, typeof localAllocations>);

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">OECD DAC Sector Allocation</h3>
          <p className="text-sm text-gray-600 mt-1">
            Select sectors and assign percentage allocations (must total 100%)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisualizationType(visualizationType === 'donut' ? 'bar' : 'donut')}
                >
                  {visualizationType === 'donut' ? <BarChart2 className="h-4 w-4" /> : <PieChart className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Switch to {visualizationType === 'donut' ? 'bar chart' : 'donut chart'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Sector Selection */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <span>Select Sectors</span>
            <Badge variant="secondary" className="text-xs">
              IATI Compliant
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SectorSelect
            value={selectedSectors}
            onValueChange={handleSectorSelection}
            placeholder="Search and select OECD DAC sectors..."
            className="w-full"
          />

          {/* Broad/Residual Sector Warning */}
          {broadSectorWarning.shouldShow && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <div className="space-y-2">
                  <p className="font-medium">Consider using more specific sector codes</p>
                  <p className="text-sm">
                    You've selected {broadSectorWarning.broadSectors.length === 1 ? 'a broad/residual sector code' : 'broad/residual sector codes'}:{' '}
                    <span className="font-medium">
                      {broadSectorWarning.broadSectors.map(s => s.code).join(', ')}
                    </span>
                  </p>
                  <p className="text-sm">
                    These are high-level or residual classifications. Selecting more specific 5-digit DAC sector codes
                    improves reporting quality, analysis, and comparability of your data.
                  </p>
                  <p className="text-xs text-amber-600">
                    You can continue with this selection if a more specific code is not applicable.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {localAllocations.length > 1 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={distributeEqually}
              className="text-xs"
            >
              Distribute Equally
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearAll}
            className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600 active:text-red-600 focus-visible:text-red-600"
          >
            Clear All
          </Button>
        </CardContent>
      </Card>

      {/* Allocation Management */}
      {localAllocations.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Percentage Allocation</CardTitle>
              {validation.totalPercentage !== 100 && (
                <span className="text-gray-500">
                  ({validation.remainingPercentage > 0 ? '+' : ''}{formatPercentage(validation.remainingPercentage)}%)
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(groupedAllocations).map(([category, allocations]) => (
                <div key={category} className="mb-4">
                  <div className="font-semibold text-sm text-gray-700 mb-2">{category}</div>
                  <div className="space-y-2">
                    {allocations.map((allocation) => (
                      <div 
                        key={allocation.id} 
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {getSectorLabel(allocation.code)}
                          </div>
                          {getSectorDescription(allocation.code) && (
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {getSectorDescription(allocation.code)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0.1"
                              max="100"
                              step="0.1"
                              value={allocation.percentage || ''}
                              onChange={(e) => updatePercentage(allocation.id, parseFloat(e.target.value) || 0)}
                              className="w-20 h-8 text-sm text-right"
                              placeholder="0"
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSector(allocation.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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

      {/* Success Message */}
      {validation.isValid && localAllocations.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Sector allocation is valid and totals 100%. 
            {allowPublish && ' Ready for publication.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Visualization */}
      {localAllocations.length > 0 && validation.totalPercentage > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Allocation Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {visualizationType === 'donut' ? (
                <div className="text-center text-gray-500">
                  <PieChart className="h-12 w-12 mx-auto mb-2" />
                  <p>Donut chart visualization</p>
                  <p className="text-xs">(Chart component integration needed)</p>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <BarChart2 className="h-12 w-12 mx-auto mb-2" />
                  <p>Bar chart visualization</p>
                  <p className="text-xs">(Chart component integration needed)</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p><strong>OECD DAC Sector Codes:</strong> These are standardized codes used by the Development Assistance Committee (DAC) of the Organisation for Economic Co-operation and Development (OECD) to classify development assistance by purpose. All percentages must add up to exactly 100%.</p>
      </div>
    </div>
  );
}
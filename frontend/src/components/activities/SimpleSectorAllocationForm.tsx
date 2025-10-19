'use client';

import React, { useEffect } from 'react';
import { Trash2, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { SimpleSectorSelect, getSectorLabel, getSectorDescription } from '@/components/forms/SimpleSectorSelect';
import { SectorValidation } from '@/types/sector';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

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
  name?: string;
  percentage: number;
}

interface SimpleSectorAllocationFormProps {
  allocations: SectorAllocation[];
  onChange: (allocations: SectorAllocation[]) => void;
  onValidationChange?: (validation: SectorValidation) => void;
  allowPublish?: boolean;
}

export default function SimpleSectorAllocationForm({ 
  allocations = [], 
  onChange, 
  onValidationChange,
  allowPublish = true 
}: SimpleSectorAllocationFormProps) {
  // Debug logging for allocations
  useEffect(() => {
    console.log('[SimpleSectorAllocationForm] Allocations prop changed:', allocations);
    console.log('[SimpleSectorAllocationForm] Allocations count:', allocations.length);
    if (allocations.length > 0) {
      console.log('[SimpleSectorAllocationForm] First allocation:', allocations[0]);
    }
  }, [allocations]);

  // Always derive selectedSectors from allocations to ensure they stay in sync
  const selectedSectors = allocations.map(a => a.code);

  // Calculate validation
  const calculateValidation = (allocs: SectorAllocation[]): SectorValidation => {
    const total = allocs.reduce((sum, alloc) => sum + (alloc.percentage || 0), 0);
    const errors: string[] = [];
    
    if (allocs.length === 0) {
      errors.push('At least one sector allocation is required');
    }
    
    if (total !== 100 && allocs.length > 0) {
      if (total > 100) {
        errors.push(`Total allocation exceeds 100% (currently ${total.toFixed(1)}%)`);
      } else {
        errors.push(`Total allocation is only ${total.toFixed(1)}% (must equal 100%)`);
      }
    }
    
    // Check for duplicate sectors
    const codes = allocs.map(a => a.code);
    const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate sectors detected: ${duplicates.join(', ')}`);
    }
    
    // Check for invalid percentages
    const invalidPercentages = allocs.filter(a => 
      isNaN(a.percentage) || a.percentage <= 0 || a.percentage > 100
    );
    if (invalidPercentages.length > 0) {
      errors.push('All percentages must be between 0.1% and 100%');
    }
    
    return {
      isValid: errors.length === 0 && total === 100,
      totalPercentage: total,
      remainingPercentage: 100 - total,
      errors
    };
  };

  const validation = calculateValidation(allocations);

  // Show toast notification for over-allocation errors
  useEffect(() => {
    if (validation.errors.length > 0 && allocations.length > 0) {
      const overAllocationError = validation.errors.find(error => 
        error.includes('exceeds 100%') || error.includes('only') && error.includes('%')
      );
      
      if (overAllocationError) {
        toast.error(overAllocationError, {
          position: 'top-right',
          duration: 4000,
        });
      }
    }
  }, [validation.errors, allocations.length]);

  // Update validation when allocations change
  useEffect(() => {
    if (onValidationChange) {
      const validation = calculateValidation(allocations);
      onValidationChange(validation);
    }
  }, [allocations, onValidationChange]);

  const addSector = (sectorCode: string) => {
    if (allocations.find(a => a.code === sectorCode)) {
      return; // Already exists
    }
    
    const newAllocation: SectorAllocation = {
      id: uuidv4(),
      code: sectorCode,
      name: getSectorLabel(sectorCode),
      percentage: 0
    };
    
    const updatedWithNew = [...allocations, newAllocation];
    
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
    
    console.log('[SimpleSectorForm] Auto-distributing percentages:', {
      totalSectors: autoBalanced.length,
      equalShare,
      autoBalanced: autoBalanced.map(a => ({ code: a.code, percentage: a.percentage }))
    });
    
    onChange(autoBalanced);
  };

  const removeSector = (id: string) => {
    const updated = allocations.filter(a => a.id !== id);
    
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
      
      console.log('[SimpleSectorForm] Auto-redistributing after removal:', {
        remainingSectors: autoBalanced.length,
        equalShare,
        autoBalanced: autoBalanced.map(a => ({ code: a.code, percentage: a.percentage }))
      });
      
      onChange(autoBalanced);
    } else {
      onChange(updated);
    }
  };

  const updatePercentage = (id: string, percentage: number) => {
    onChange(
      allocations.map(a => a.id === id ? { ...a, percentage: Math.max(0, Math.min(100, percentage)) } : a)
    );
  };

  const handleSectorSelection = (sectors: string[]) => {
    const currentCodes = allocations.map(a => a.code);
    const toAdd = sectors.filter(code => !currentCodes.includes(code));
    const toRemove = currentCodes.filter(code => !sectors.includes(code));
    let newAllocations = [...allocations];
    
    // Add new sectors
    toAdd.forEach(code => {
      if (!newAllocations.find(a => a.code === code)) {
        const newAllocation: SectorAllocation = {
          id: uuidv4(),
          code: code,
          name: getSectorLabel(code),
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
        
        console.log('[SimpleSectorForm] Smart allocation - preserving custom percentages:', {
          totalExisting,
          remainingPercentage,
          newSectorPercentage,
          smartAllocated: smartAllocated.map(a => ({ code: a.code, percentage: a.percentage }))
        });
        
        onChange(smartAllocated);
        
        // Show toast if total doesn't equal 100%
        const newTotal = smartAllocated.reduce((sum, a) => sum + a.percentage, 0);
        if (Math.abs(newTotal - 100) > 0.01) {
          setTimeout(() => {
            toast.info(`Total allocation is ${newTotal.toFixed(1)}%. You may need to adjust percentages to reach 100%.`, {
              position: 'top-right',
              duration: 4000
            });
          }, 100);
        }
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
        
        console.log('[SimpleSectorForm] Auto-distributing percentages equally:', {
          totalSectors: autoBalanced.length,
          equalShare,
          autoBalanced: autoBalanced.map(a => ({ code: a.code, percentage: a.percentage }))
        });
        
        onChange(autoBalanced);
      }
    } else {
      onChange(newAllocations);
    }
  };

  const distributeEqually = () => {
    if (allocations.length === 0) return;
    
    const equalPercentage = 100 / allocations.length;
    onChange(
      allocations.map(allocation => ({ ...allocation, percentage: equalPercentage }))
    );
  };

  const clearAll = () => {
    // Simply clear allocations - selectedSectors will be derived automatically
    onChange([]);
  };

  const formatPercentage = (value: number): string => {
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  };

  return (
    <div className="space-y-6">
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
          <SimpleSectorSelect
            selectedSectors={selectedSectors}
            onSectorsChange={handleSectorSelection}
            placeholder="Search and select OECD DAC sectors..."
            allowMultiple={true}
            maxSelections={20}
          />
          
          {allocations.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAll}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600 active:text-red-600 focus-visible:text-red-600"
              >
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allocation Management */}
      {allocations.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Percentage Allocation</CardTitle>
              <div className="flex items-center gap-2 text-sm">
                <span className={`font-medium ${
                  validation.totalPercentage === 100 ? 'text-green-600' : 
                  validation.totalPercentage > 100 ? 'text-red-600' : 'text-amber-600'
                }`}>
                  Total: {formatPercentage(validation.totalPercentage)}%
                </span>
                {validation.totalPercentage !== 100 && (
                  <span className="text-gray-500">
                    ({validation.remainingPercentage > 0 ? '+' : ''}{formatPercentage(validation.remainingPercentage)}%)
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allocations.map((allocation) => (
                <div 
                  key={allocation.id} 
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {allocation.name || getSectorLabel(allocation.code)}
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
            
            {/* Distribute Equally Button at bottom of sector list */}
            {allocations.length > 1 && (
              <div className="pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={distributeEqually}
                  className="text-xs w-full"
                >
                  Distribute Equally
                </Button>
              </div>
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

      {/* Success Message */}
      {validation.isValid && allocations.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Sector allocation is valid and totals 100%. 
            {allowPublish && ' Ready for publication.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Pie Chart Visualization */}
      {allocations.length > 0 && (
        <Card>
          <CardContent className="pt-6">
                              <div className="w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allocations.map((allocation, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-gray-50">
                          <div className="font-medium text-sm text-gray-900">
                            {allocation.code}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {allocation.name}
                          </div>
                          <div className="text-lg font-semibold text-blue-600 mt-2">
                            {allocation.percentage}%
                          </div>
                        </div>
                      ))}
                    </div>
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
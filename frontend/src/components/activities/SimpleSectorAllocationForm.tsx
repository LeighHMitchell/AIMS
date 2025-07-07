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
import SectorAllocationPieChart from '@/components/charts/SectorAllocationPieChart';

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
    
    const validation = calculateValidation(allocations);
    const remainingPercentage = Math.max(0, validation.remainingPercentage);
    const suggestedPercentage = allocations.length === 0 ? 100 : 
      Math.min(remainingPercentage, Math.round(remainingPercentage / (selectedSectors.length - allocations.length)));
    
    const newAllocation: SectorAllocation = {
      id: uuidv4(),
      code: sectorCode,
      name: getSectorLabel(sectorCode),
      percentage: suggestedPercentage
    };
    
    onChange([...allocations, newAllocation]);
  };

  const removeSector = (id: string) => {
    // Simply update allocations - selectedSectors will be derived automatically
    onChange(allocations.filter(a => a.id !== id));
  };

  const updatePercentage = (id: string, percentage: number) => {
    onChange(
      allocations.map(a => a.id === id ? { ...a, percentage: Math.max(0, Math.min(100, percentage)) } : a)
    );
  };

  const handleSectorSelection = (sectors: string[]) => {
    // Add new sectors
    sectors.forEach(code => {
      if (!allocations.find(a => a.code === code)) {
        addSector(code);
      }
    });
    
    // Remove deselected sectors
    allocations.forEach(allocation => {
      if (!sectors.includes(allocation.code)) {
        removeSector(allocation.id);
      }
    });
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
                className="text-xs text-red-600 hover:text-red-700"
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
            <SectorAllocationPieChart allocations={allocations} />
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
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

interface SectorAllocation {
  id: string;
  code: string;
  percentage: number;
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
    
    const remainingPercentage = Math.max(0, 100 - validation.totalPercentage);
    const suggestedPercentage = localAllocations.length === 0 ? 100 : 
      Math.min(remainingPercentage, Math.round(remainingPercentage / (selectedSectors.length - localAllocations.length)));
    
    const newAllocation: SectorAllocation = {
      id: uuidv4(),
      code: sectorCode,
      percentage: suggestedPercentage
    };
    
    setLocalAllocations(prev => [...prev, newAllocation]);
  };

  const removeSector = (id: string) => {
    setLocalAllocations(prev => prev.filter(a => a.id !== id));
  };

  const updatePercentage = (id: string, percentage: number) => {
    setLocalAllocations(prev => 
      prev.map(a => a.id === id ? { ...a, percentage: Math.max(0, Math.min(100, percentage)) } : a)
    );
  };

  const handleSectorSelection = (sectors: string[]) => {
    setSelectedSectors(sectors);
    
    // Add new sectors
    sectors.forEach(code => {
      if (!localAllocations.find(a => a.code === code)) {
        addSector(code);
      }
    });
    
    // Remove deselected sectors
    localAllocations.forEach(allocation => {
      if (!sectors.includes(allocation.code)) {
        removeSector(allocation.id);
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
            selectedSectors={selectedSectors}
            onSectorsChange={handleSectorSelection}
            placeholder="Search and select OECD DAC sectors..."
            allowMultiple={true}
            maxSelections={20}
          />
          
          {localAllocations.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={distributeEqually}
                className="text-xs"
              >
                Distribute Equally
              </Button>
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
      {localAllocations.length > 0 && (
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
              {localAllocations.map((allocation) => (
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
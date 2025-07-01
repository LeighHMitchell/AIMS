'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, 
  AlertCircle, 
  Check, 
  ChevronDown,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import dacSectorsData from '@/data/dac-sectors.json';
import { SectorValidation } from '@/types/sector';
import { v4 as uuidv4 } from 'uuid';
import SectorAllocationPieChart from '@/components/charts/SectorAllocationPieChart';
import Select, { GroupBase, OptionProps, GroupHeadingProps, components } from 'react-select';

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
  name?: string;
  percentage: number;
  category?: string;
  categoryCode?: string;
}

interface ImprovedSectorAllocationFormProps {
  allocations: SectorAllocation[];
  onChange: (allocations: SectorAllocation[]) => void;
  onValidationChange?: (validation: SectorValidation) => void;
  allowPublish?: boolean;
}

// Category colors
const CATEGORY_COLORS: { [key: string]: string } = {
  '110': '#3B82F6', // Education - Blue
  '120': '#10B981', // Health - Green
  '130': '#8B5CF6', // Population - Purple
  '140': '#F59E0B', // Water - Amber
  '150': '#6366F1', // Government - Indigo
  '160': '#EC4899', // Social - Pink
  '210': '#84CC16', // Transport - Lime
  '220': '#06B6D4', // Communications - Cyan
  '230': '#F97316', // Energy - Orange
  '240': '#14B8A6', // Banking - Teal
  '250': '#F43F5E', // Business - Rose
  '310': '#22C55E', // Agriculture - Green
  '320': '#A855F7', // Industry - Purple
  '330': '#0EA5E9', // Trade - Sky
  '410': '#EAB308', // Environment - Yellow
  '430': '#6B7280', // Other - Gray
  '500': '#DC2626', // Budget Support - Red
  '600': '#7C3AED', // Debt - Violet
  '700': '#059669', // Emergency - Emerald
  '910': '#9333EA', // Admin - Purple
  '920': '#DB2777', // NGO Support - Pink
  '930': '#2563EB', // Refugees - Blue
  '998': '#525252', // Unallocated - Gray
};

// Get category color
const getCategoryColor = (categoryCode: string): string => {
  const code = categoryCode.substring(0, 3);
  return CATEGORY_COLORS[code] || '#6B7280';
};

// Get sector information
const getSectorInfo = (code: string): { name: string; description: string; category: string; categoryCode: string } => {
  const sectorsData = dacSectorsData as SectorCategory;
  
  for (const [categoryName, sectors] of Object.entries(sectorsData)) {
    const sector = sectors.find(s => s.code === code);
    if (sector) {
      const categoryCode = categoryName.split(' - ')[0];
      return {
        name: `${sector.code} – ${sector.name}`,
        description: sector.description,
        category: categoryName,
        categoryCode
      };
    }
  }
  
  return {
    name: code,
    description: '',
    category: 'Unknown',
    categoryCode: '999'
  };
};

// Types for react-select
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

// Custom components for react-select
const GroupHeading = (props: GroupHeadingProps<SectorOption, false, GroupBase<SectorOption>>) => (
  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
    <components.GroupHeading {...props}>
      <div className="text-sm font-semibold text-gray-700">
        {props.data.label}
      </div>
    </components.GroupHeading>
  </div>
);

const Option = (props: OptionProps<SectorOption, false, GroupBase<SectorOption>>) => {
  const { data, isSelected, isFocused } = props;
  
  return (
    <components.Option {...props}>
      <div 
        className={cn(
          "px-4 py-3 cursor-pointer transition-colors",
          isFocused && "bg-gray-100",
          isSelected && "bg-blue-50"
        )}
      >
        <div className="font-medium text-sm">
          {data.code} – {data.name}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {data.description.length > 80 
            ? data.description.substring(0, 80) + '...' 
            : data.description}
        </div>
      </div>
    </components.Option>
  );
};

export default function ImprovedSectorAllocationForm({ 
  allocations = [], 
  onChange, 
  onValidationChange,
  allowPublish = true 
}: ImprovedSectorAllocationFormProps) {
  const [selectedSector, setSelectedSector] = useState<SectorOption | null>(null);

  // Prepare options for react-select
  const sectorOptions = useMemo((): SectorGroup[] => {
    const sectorsData = dacSectorsData as SectorCategory;
    const groups: SectorGroup[] = [];
    
    Object.entries(sectorsData).forEach(([categoryName, sectors]) => {
      const options = sectors.map(sector => ({
        value: sector.code,
        label: `${sector.code} – ${sector.name}`,
        code: sector.code,
        name: sector.name,
        description: sector.description,
        category: categoryName,
        categoryCode: categoryName.split(' - ')[0]
      }));
      
      groups.push({
        label: categoryName,
        options
      });
    });
    
    return groups;
  }, []);

  // Filter out already selected sectors
  const availableOptions = useMemo(() => {
    const selectedCodes = allocations.map(a => a.code);
    
    return sectorOptions.map(group => ({
      ...group,
      options: group.options.filter(option => !selectedCodes.includes(option.code))
    })).filter(group => group.options.length > 0);
  }, [sectorOptions, allocations]);

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
    
    return {
      isValid: errors.length === 0 && total === 100,
      totalPercentage: total,
      remainingPercentage: 100 - total,
      errors
    };
  };

  const validation = calculateValidation(allocations);

  // Update validation when allocations change
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(validation);
    }
  }, [allocations, onValidationChange]);

  const addSector = (option: SectorOption | null) => {
    if (!option) return;
    
    const remainingPercentage = Math.max(0, validation.remainingPercentage);
    const suggestedPercentage = allocations.length === 0 ? 100 : remainingPercentage;
    
    const newAllocation: SectorAllocation = {
      id: uuidv4(),
      code: option.code,
      name: option.label,
      percentage: suggestedPercentage,
      category: option.category,
      categoryCode: option.categoryCode
    };
    
    onChange([...allocations, newAllocation]);
    setSelectedSector(null);
  };

  const updatePercentage = (id: string, percentage: number) => {
    onChange(
      allocations.map(a => a.id === id ? { ...a, percentage: Math.max(0, Math.min(100, percentage)) } : a)
    );
  };

  const removeSector = (id: string) => {
    onChange(allocations.filter(a => a.id !== id));
  };

  const distributeEqually = () => {
    if (allocations.length === 0) return;
    
    const equalPercentage = parseFloat((100 / allocations.length).toFixed(2));
    const updated = allocations.map((allocation, index) => ({
      ...allocation,
      percentage: index === 0 ? 
        parseFloat((equalPercentage + (100 - equalPercentage * allocations.length)).toFixed(2)) : 
        equalPercentage
    }));
    
    onChange(updated);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sector Allocation
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Validation Badge */}
              {allocations.length > 0 && (
                <Badge 
                  variant={validation.isValid ? "default" : validation.totalPercentage > 100 ? "destructive" : "secondary"}
                  className={cn(
                    "transition-all rounded-md",
                    validation.isValid && "bg-green-600"
                  )}
                >
                  Total: {validation.totalPercentage.toFixed(1)}%
                  {validation.isValid && (
                    <Check className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Sector Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Select Sector to Add
            </label>
            <Select
              value={selectedSector}
              onChange={addSector}
              options={availableOptions}
              className="w-full"
              classNamePrefix="select"
              placeholder="Choose a sector..."
              isClearable
              isSearchable
              components={{
                GroupHeading,
                Option
              }}
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: '48px',
                  borderColor: '#e5e7eb',
                  '&:hover': {
                    borderColor: '#d1d5db'
                  }
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 50
                }),
                groupHeading: (base) => ({
                  ...base,
                  padding: 0,
                  margin: 0
                }),
                option: (base) => ({
                  ...base,
                  padding: 0
                })
              }}
            />
          </div>
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
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={distributeEqually}
                        className="text-xs"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Distribute Equally
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Distribute {validation.totalPercentage}% equally across all sectors</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {allocations.map((allocation) => {
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
                      {allocation.name || sectorInfo.name}
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
                      <div className="text-xs text-center mt-1 font-medium">
                        {allocation.percentage.toFixed(1)}%
                      </div>
                    </div>
                    
                    {/* Percentage Input */}
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={allocation.percentage || ''}
                      onChange={(e) => updatePercentage(allocation.id, parseFloat(e.target.value) || 0)}
                      className={cn(
                        "w-20 h-10 text-sm text-center",
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

      {/* Enhanced Pie Chart Visualization */}
      {allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allocation Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <SectorAllocationPieChart allocations={allocations} />
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p className="font-medium mb-1">💡 Tips:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Use the dropdown to search and select sectors by code or name</li>
          <li>Percentages must total exactly 100% for valid allocation</li>
          <li>Adjust percentages using the input fields or distribute equally</li>
        </ul>
      </div>
    </div>
  );
} 
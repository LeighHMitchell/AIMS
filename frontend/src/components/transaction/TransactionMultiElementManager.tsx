"use client"
/**
 * Transaction Multi-Element Manager Components
 * 
 * Provides UI components for managing multiple IATI transaction elements:
 * - Multiple sectors with percentage allocation
 * - Multiple aid types
 * - Multiple recipient countries
 * - Multiple recipient regions
 */

import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, AlertCircle, CheckCircle, Info, Check, ChevronsUpDown, Search, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  TransactionSector, 
  TransactionAidType, 
  TransactionRecipientCountry, 
  TransactionRecipientRegion 
} from "@/types/transaction";
import { cn } from "@/lib/utils";
import aidTypesData from "@/data/aid-types.json";
import { SectorSelect, getSectorLabel, getSectorDescription } from "@/components/forms/SectorSelect";
import dacSectorsData from "@/data/dac-sectors.json";

// Helper to get full sector info from DAC sectors data
interface SectorInfo {
  code: string;
  name: string;
  description: string;
  category?: string;
}

const getSectorInfo = (code: string): SectorInfo => {
  const sectors = dacSectorsData as { [key: string]: Array<{ code: string; name: string; description: string }> };
  for (const [category, sectorList] of Object.entries(sectors)) {
    const sector = sectorList.find(s => s.code === code);
    if (sector) {
      return { ...sector, category };
    }
  }
  return { code, name: `Sector ${code}`, description: '', category: 'Unknown' };
};

interface AidType {
  code: string;
  name: string;
  description?: string;
  children?: AidType[];
}

// ============================================================================
// SECTOR MANAGER - Enhanced with SectorSelect and rich UI
// ============================================================================

interface SectorManagerProps {
  sectors: TransactionSector[];
  onSectorsChange: (sectors: TransactionSector[]) => void;
  allowPercentages?: boolean;
  className?: string;
}

export function TransactionSectorManager({ 
  sectors = [], 
  onSectorsChange,
  allowPercentages = true,
  className 
}: SectorManagerProps) {
  // Track selected sector codes for the SectorSelect component
  const selectedSectorCodes = useMemo(() => sectors.map(s => s.code), [sectors]);
  
  // Validation calculations
  const totalPercentage = useMemo(() => 
    sectors.reduce((sum, s) => sum + (s.percentage || 0), 0), 
    [sectors]
  );
  const hasPercentages = sectors.some(s => s.percentage !== undefined && s.percentage > 0);
  const hasPercentageError = allowPercentages && hasPercentages && Math.abs(totalPercentage - 100) > 0.01;
  const isComplete = hasPercentages && Math.abs(totalPercentage - 100) <= 0.01;
  const remainingPercentage = Math.max(0, 100 - totalPercentage);

  // Handle sector selection from SectorSelect
  const handleSectorSelectChange = useCallback((newCodes: string[]) => {
    // Find newly added codes
    const existingCodes = new Set(sectors.map(s => s.code));
    const addedCodes = newCodes.filter(code => !existingCodes.has(code));
    const removedCodes = new Set(sectors.map(s => s.code).filter(code => !newCodes.includes(code)));
    
    // Create new sectors array
    let updatedSectors = sectors.filter(s => !removedCodes.has(s.code));
    
    // Add new sectors with suggested percentage
    addedCodes.forEach(code => {
      const sectorInfo = getSectorInfo(code);
      const suggestedPercentage = updatedSectors.length === 0 ? 100 : Math.min(remainingPercentage, 10);
      
      updatedSectors.push({
        code,
        vocabulary: '1', // Default to DAC 5-digit
        percentage: allowPercentages ? suggestedPercentage : undefined,
        narrative: sectorInfo.name
      });
    });
    
    onSectorsChange(updatedSectors);
  }, [sectors, onSectorsChange, allowPercentages, remainingPercentage]);

  // Update percentage for a specific sector
  const updatePercentage = useCallback((index: number, percentage: number) => {
    const updated = sectors.map((sector, i) => 
      i === index ? { ...sector, percentage: Math.max(0, Math.min(100, percentage)) } : sector
    );
    onSectorsChange(updated);
  }, [sectors, onSectorsChange]);

  // Remove a sector by index
  const removeSector = useCallback((index: number) => {
    onSectorsChange(sectors.filter((_, i) => i !== index));
  }, [sectors, onSectorsChange]);

  // Distribute percentages equally
  const distributeEqually = useCallback(() => {
    if (sectors.length === 0) return;
    
    const equalShare = 100 / sectors.length;
    const updated = sectors.map(s => ({
      ...s,
      percentage: parseFloat(equalShare.toFixed(2))
    }));
    
    // Handle rounding errors to ensure total equals exactly 100%
    const total = updated.reduce((sum, s) => sum + (s.percentage || 0), 0);
    if (total !== 100 && updated.length > 0) {
      updated[0].percentage = (updated[0].percentage || 0) + (100 - total);
      updated[0].percentage = parseFloat(updated[0].percentage.toFixed(2));
    }
    
    onSectorsChange(updated);
  }, [sectors, onSectorsChange]);

  // Clear all sectors
  const clearAll = useCallback(() => {
    onSectorsChange([]);
  }, [onSectorsChange]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with status badges */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Transaction Sectors</Label>
          <Info className="h-4 w-4 text-muted-foreground cursor-help" title="IATI allows multiple sectors per transaction with percentage allocations" />
        </div>
        <div className="flex items-center gap-2">
          {sectors.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {sectors.length} sector{sectors.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {hasPercentages && (
            <>
              {hasPercentageError && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {totalPercentage.toFixed(1)}% (must be 100%)
                </Badge>
              )}
              {isComplete && (
                <Badge variant="default" className="text-xs bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  100%
                </Badge>
              )}
              {!isComplete && !hasPercentageError && sectors.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {totalPercentage.toFixed(1)}%
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sector Selection Dropdown */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Select sectors to add</Label>
        <SectorSelect
          value={selectedSectorCodes}
          onValueChange={handleSectorSelectChange}
          placeholder="Search and select DAC sectors..."
          variant="hierarchical"
          maxSelections={15}
        />
      </div>

      {/* Selected Sectors List */}
      {sectors.length > 0 && (
        <div className="space-y-3">
          {/* Action buttons */}
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2">
              {sectors.length > 1 && allowPercentages && (
                <Button 
                  type="button"
                  variant="default" 
                  size="sm"
                  onClick={distributeEqually}
                  className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Distribute Equally
                </Button>
              )}
              <Button 
                type="button"
                variant="outline" 
                size="sm"
                onClick={clearAll}
                className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3 mr-1 text-red-500" />
                Clear All
              </Button>
            </div>
          </div>

          {/* Sector cards */}
          <div className="space-y-2">
            {sectors.map((sector, index) => {
              const sectorInfo = getSectorInfo(sector.code);
              // Extract just the sector name without the code prefix
              const sectorNameOnly = sectorInfo.name.replace(/^\d+\s*[-–]\s*/, '');
              // Parse category to separate code and name
              const categoryMatch = sectorInfo.category?.match(/^(\d+)\s*[-–]\s*(.+)$/);
              const categoryCode = categoryMatch ? categoryMatch[1] : '';
              const categoryName = categoryMatch ? categoryMatch[2] : sectorInfo.category || '';
              
              return (
                <Card key={`${sector.code}-${index}`} className="p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Sector info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-mono shrink-0">
                          {sector.code}
                        </Badge>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {sectorNameOnly}
                        </span>
                      </div>
                      {sectorInfo.category && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {categoryCode && (
                            <span className="text-xs font-mono bg-muted text-gray-600 px-1.5 py-0.5 rounded">
                              {categoryCode}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {categoryName}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Percentage input */}
                    {allowPercentages && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={sector.percentage ?? ''}
                          onChange={(e) => updatePercentage(index, parseFloat(e.target.value) || 0)}
                          className="w-20 h-8 text-sm text-center"
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    )}
                    
                    {/* Remove button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSector(index)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sectors.length === 0 && (
        <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
          <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No sectors selected</p>
          <p className="text-xs mt-1">Use the dropdown above to add sectors</p>
        </div>
      )}
      
      {/* Validation error */}
      {hasPercentageError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Sector percentages must sum to exactly 100% (IATI requirement). Current total: {totalPercentage.toFixed(1)}%
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ============================================================================
// AID TYPE MANAGER
// ============================================================================

interface AidTypeManagerProps {
  aidTypes: TransactionAidType[];
  onAidTypesChange: (aidTypes: TransactionAidType[]) => void;
  className?: string;
}

export function TransactionAidTypeManager({ 
  aidTypes = [], 
  onAidTypesChange,
  className 
}: AidTypeManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Flatten the hierarchical data
  const flattenedAidTypes = useMemo(() => {
    const flattened: Array<{
      code: string;
      name: string;
      description?: string;
      level: number;
      parentCode?: string;
      categoryName?: string;
    }> = [];

    const flatten = (items: AidType[], level = 0, parentCode?: string, categoryName?: string) => {
      items.forEach(item => {
        flattened.push({
          ...item,
          level,
          parentCode,
          categoryName: level === 0 ? item.name : categoryName
        });
        if (item.children) {
          flatten(item.children, level + 1, item.code, level === 0 ? item.name : categoryName);
        }
      });
    };

    flatten(aidTypesData as AidType[]);
    return flattened;
  }, []);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === "") {
      return flattenedAidTypes;
    }

    const query = searchQuery.toLowerCase().trim();
    
    return flattenedAidTypes.filter(item => {
      return item.code.toLowerCase().includes(query) ||
             item.name.toLowerCase().includes(query) ||
             (item.description && item.description.toLowerCase().includes(query));
    });
  }, [flattenedAidTypes, searchQuery]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    
    filteredItems.forEach(item => {
      const categoryCode = item.level === 0 ? item.code : item.code[0];
      
      if (!groups[categoryCode]) {
        groups[categoryCode] = [];
      }
      
      if (!groups[categoryCode].some(i => i.code === item.code)) {
        groups[categoryCode].push(item);
      }
    });

    Object.keys(groups).forEach(categoryCode => {
      const hasHeader = groups[categoryCode].some(item => item.level === 0);
      if (!hasHeader) {
        const header = flattenedAidTypes.find(item => item.code === categoryCode && item.level === 0);
        if (header) {
          groups[categoryCode].unshift(header);
        }
      }
    });

    return groups;
  }, [filteredItems, flattenedAidTypes]);

  const addAidType = (code: string) => {
    if (!code || aidTypes.some(at => at.code === code)) {
      return;
    }
    
    const aidTypeToAdd: TransactionAidType = {
      code: code,
      vocabulary: '1', // Default to OECD DAC
    };
    
    onAidTypesChange([...aidTypes, aidTypeToAdd]);
    setIsOpen(false);
    setSearchQuery("");
  };

  const removeAidType = (index: number) => {
    onAidTypesChange(aidTypes.filter((_, i) => i !== index));
  };

  const updateVocabulary = (index: number, vocabulary: string) => {
    const updated = aidTypes.map((aidType, i) => 
      i === index ? { ...aidType, vocabulary } : aidType
    );
    onAidTypesChange(updated);
  };

  const getAidTypeName = (code: string) => {
    const item = flattenedAidTypes.find(item => item.code === code);
    return item?.name || code;
  };

  const renderItemContent = (item: typeof flattenedAidTypes[0]) => {
    const isAlreadyAdded = aidTypes.some(at => at.code === item.code);
    const indentClass = item.level === 1 ? "pl-6" : item.level === 2 ? "pl-10" : "";

    return (
      <CommandItem
        key={item.code}
        onSelect={() => {
          if (item.level > 0 && !isAlreadyAdded) {
            addAidType(item.code);
          }
        }}
        className={cn(
          "cursor-pointer px-4 py-2 space-y-1 hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700",
          "flex items-start gap-2",
          indentClass,
          item.level === 0 && "font-semibold text-sm opacity-70 cursor-default pointer-events-none hover:bg-transparent hover:text-inherit",
          isAlreadyAdded && item.level > 0 && "opacity-50 cursor-not-allowed"
        )}
        disabled={isAlreadyAdded || item.level === 0}
      >
        {item.level > 0 && (
          <Check
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              isAlreadyAdded ? "opacity-100" : "opacity-0"
            )}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded",
              item.level === 0 ? "text-gray-700" : "text-gray-800"
            )}>
              {item.code}
            </span>
            <span className={cn(
              "text-sm",
              item.level === 0 ? "text-gray-600" : "text-gray-700"
            )}>
              – {item.name}
            </span>
          </div>
          {item.description && item.level > 0 && (
            <div className="text-sm text-gray-500 leading-snug">
              {item.description}
            </div>
          )}
        </div>
      </CommandItem>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Aid Types</Label>
        <Info className="h-4 w-4 text-muted-foreground cursor-help" title="IATI allows multiple aid types with different vocabularies" />
      </div>
      
      {/* Existing aid types */}
      <div className="space-y-2">
        {aidTypes.map((aidType, index) => (
          <Card key={index} className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {aidType.code}
            </span>
                <span className="text-sm text-gray-700">
                  {getAidTypeName(aidType.code)}
                </span>
      </div>
          <Select 
                value={aidType.vocabulary || '1'}
                onValueChange={(v) => updateVocabulary(index, v)}
          >
                <SelectTrigger className="h-8 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">OECD DAC</SelectItem>
              <SelectItem value="2">Earmarking Category</SelectItem>
              <SelectItem value="3">Earmarking Modality</SelectItem>
              <SelectItem value="4">Cash and Voucher</SelectItem>
            </SelectContent>
          </Select>
        <Button 
          type="button" 
                variant="ghost"
          size="sm"
                onClick={() => removeAidType(index)}
                className="h-8 w-8 p-0"
        >
                <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
            </div>
      </Card>
        ))}
      </div>
      
      {/* Add new aid type with dropdown */}
      <div className="relative">
        <Popover open={isOpen} onOpenChange={(newOpen) => {
          setIsOpen(newOpen);
          if (!newOpen) {
            setSearchQuery("");
          }
        }}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Aid Type
              <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[500px] p-0" align="start">
            <Command>
              <div className="border-b border-border px-3 py-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search aid types..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
              <CommandList className="max-h-[400px] overflow-auto">
                {searchQuery && filteredItems.length > 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                    {filteredItems.length} match{filteredItems.length !== 1 ? 'es' : ''} found
                  </div>
                )}
                {Object.entries(groupedItems).map(([categoryCode, items]) => {
                  const category = items.find(item => item.code === categoryCode && item.level === 0);
                  if (!category) return null;

                  return (
                    <CommandGroup key={categoryCode} className="p-0">
                      {renderItemContent(category)}
                      {items
                        .filter(item => item.code !== categoryCode)
                        .sort((a, b) => a.code.localeCompare(b.code))
                        .map(renderItemContent)}
                    </CommandGroup>
                  );
                })}
                {filteredItems.length === 0 && (
                  <div className="py-6 text-center text-sm">
                    {searchQuery ? `No aid types found for "${searchQuery}"` : "No aid type found."}
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// ============================================================================
// RECIPIENT COUNTRY MANAGER
// ============================================================================

// Common country codes - comprehensive list
const COMMON_COUNTRIES = [
  { code: 'MM', name: 'Myanmar' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AO', name: 'Angola' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'Congo, Democratic Republic' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: 'Côte d\'Ivoire' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KP', name: 'Korea, North' },
  { code: 'KR', name: 'Korea, South' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PS', name: 'Palestine' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'São Tomé and Príncipe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

interface RecipientCountryManagerProps {
  countries: TransactionRecipientCountry[];
  onCountriesChange: (countries: TransactionRecipientCountry[]) => void;
  allowPercentages?: boolean;
  className?: string;
}

export function TransactionRecipientCountryManager({ 
  countries = [], 
  onCountriesChange,
  allowPercentages = true,
  className 
}: RecipientCountryManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("");
  const [percentage, setPercentage] = useState<string>("");

  const totalPercentage = countries.reduce((sum, c) => sum + (c.percentage || 0), 0);
  const hasPercentages = countries.some(c => c.percentage !== undefined);
  const hasPercentageError = allowPercentages && hasPercentages && Math.abs(totalPercentage - 100) > 0.01;
  const isComplete = hasPercentages && Math.abs(totalPercentage - 100) <= 0.01;

  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === "") {
      return COMMON_COUNTRIES;
    }

    const query = searchQuery.toLowerCase().trim();
    return COMMON_COUNTRIES.filter(country => 
      country.code.toLowerCase().includes(query) ||
      country.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const addCountry = () => {
    if (!selectedCountryCode || countries.some(c => c.code === selectedCountryCode)) {
      return;
    }
    
    const countryToAdd: TransactionRecipientCountry = {
      code: selectedCountryCode,
      percentage: allowPercentages && percentage ? parseFloat(percentage) : undefined,
    };
    
    onCountriesChange([...countries, countryToAdd]);
    setSelectedCountryCode("");
    setPercentage("");
    setIsOpen(false);
  };

  const removeCountry = (index: number) => {
    onCountriesChange(countries.filter((_, i) => i !== index));
  };

  const updatePercentage = (index: number, newPercentage: number | undefined) => {
    const updated = countries.map((country, i) => 
      i === index ? { ...country, percentage: newPercentage } : country
    );
    onCountriesChange(updated);
  };

  const getCountryName = (code: string) => {
    const country = COMMON_COUNTRIES.find(c => c.code === code);
    return country?.name || code;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Recipient Countries</Label>
          <Info className="h-4 w-4 text-muted-foreground cursor-help" title="ISO 3166-1 alpha-2 codes (e.g., TZ, KE)" />
        </div>
        {hasPercentages && (
          <Badge variant={hasPercentageError ? "destructive" : isComplete ? "default" : "secondary"} className="text-xs">
            {hasPercentageError && <AlertCircle className="h-3 w-3 mr-1" />}
            {isComplete && <CheckCircle className="h-3 w-3 mr-1" />}
            {totalPercentage.toFixed(1)}%
          </Badge>
        )}
      </div>
      
      {/* Existing countries */}
      <div className="space-y-2">
        {countries.map((country, index) => (
          <Card key={index} className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                  {country.code}
                </span>
                <span className="text-sm text-gray-700">
                  {getCountryName(country.code)}
                </span>
              </div>
              {allowPercentages && (
                <div className="flex items-center gap-1 w-24">
                  <Input
                    type="number"
                    placeholder="%"
                    min="0"
                    max="100"
                    step="0.1"
                    value={country.percentage || ''}
                    onChange={(e) => updatePercentage(index, e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="h-8"
                  />
                  <span className="text-xs">%</span>
                </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCountry(index)}
                className="h-8 w-8 p-0"
            >
                <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Add new country with dropdown */}
      <div className="space-y-2">
        <Popover open={isOpen} onOpenChange={(newOpen) => {
          setIsOpen(newOpen);
          if (!newOpen) {
            setSearchQuery("");
          }
        }}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-between text-left font-normal",
                !selectedCountryCode && "text-muted-foreground"
              )}
            >
              {selectedCountryCode ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                    {selectedCountryCode}
                  </span>
                  <span>{getCountryName(selectedCountryCode)}</span>
                </span>
              ) : (
                "Select country..."
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <div className="border-b border-border px-3 py-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
              <CommandList className="max-h-[300px] overflow-auto">
                {filteredCountries.length === 0 ? (
                  <div className="py-6 text-center text-sm">
                    {searchQuery ? `No countries found for "${searchQuery}"` : "No countries found."}
                  </div>
                ) : (
                  <CommandGroup>
                    {filteredCountries.map((country) => {
                      const isAlreadyAdded = countries.some(c => c.code === country.code);
                      const isSelected = selectedCountryCode === country.code;
                      
                      return (
                        <CommandItem
                          key={country.code}
                          onSelect={() => {
                            if (!isAlreadyAdded) {
                              setSelectedCountryCode(country.code);
                              setIsOpen(false);
                            }
                          }}
                          className={cn(
                            "cursor-pointer px-4 py-2 hover:bg-blue-50 hover:text-blue-700",
                            isAlreadyAdded && "opacity-50 cursor-not-allowed"
                          )}
                          disabled={isAlreadyAdded}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected || isAlreadyAdded ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                              {country.code}
                            </span>
                            <span className="text-sm">{country.name}</span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {selectedCountryCode && (
          <div className="flex gap-2">
          {allowPercentages && (
              <div className="flex items-center gap-1 flex-1">
              <Input
                type="number"
                  placeholder="Percentage"
                min="0"
                max="100"
                step="0.1"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  className="h-9"
              />
              <span className="text-xs">%</span>
            </div>
          )}
          <Button 
            type="button" 
            onClick={addCountry} 
              className="h-9"
          >
              <Plus className="h-4 w-4 mr-1" />
              Add Country
          </Button>
        </div>
        )}
      </div>
      
      {hasPercentageError && (
        <Alert variant="destructive">
          <AlertDescription>
            Country percentages must sum to 100%. Current: {totalPercentage.toFixed(1)}%
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ============================================================================
// RECIPIENT REGION MANAGER
// ============================================================================

interface RecipientRegionManagerProps {
  regions: TransactionRecipientRegion[];
  onRegionsChange: (regions: TransactionRecipientRegion[]) => void;
  allowPercentages?: boolean;
  className?: string;
}

export function TransactionRecipientRegionManager({ 
  regions = [], 
  onRegionsChange,
  allowPercentages = true,
  className 
}: RecipientRegionManagerProps) {
  const [newRegion, setNewRegion] = useState<Partial<TransactionRecipientRegion>>({
    vocabulary: '1'
  });

  const totalPercentage = regions.reduce((sum, r) => sum + (r.percentage || 0), 0);
  const hasPercentages = regions.some(r => r.percentage !== undefined);
  const hasPercentageError = allowPercentages && hasPercentages && Math.abs(totalPercentage - 100) > 0.01;

  const addRegion = () => {
    if (!newRegion.code || newRegion.code.trim() === '') {
      return;
    }
    
    const regionToAdd: TransactionRecipientRegion = {
      code: newRegion.code.trim(),
      vocabulary: newRegion.vocabulary || '1',
      percentage: allowPercentages ? newRegion.percentage : undefined,
      narrative: newRegion.narrative?.trim(),
    };
    
    onRegionsChange([...regions, regionToAdd]);
    setNewRegion({ vocabulary: '1' });
  };

  const removeRegion = (index: number) => {
    onRegionsChange(regions.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Recipient Regions</Label>
        {hasPercentages && (
          <Badge variant={hasPercentageError ? "destructive" : "secondary"}>
            {totalPercentage.toFixed(1)}%
          </Badge>
        )}
      </div>
      
      <div className="space-y-2">
        {regions.map((region, index) => (
          <Card key={index} className="p-2">
            <div className="flex items-center gap-2">
              <Badge>{region.code}</Badge>
              <span className="text-xs text-muted-foreground">Vocab: {region.vocabulary}</span>
              {region.percentage !== undefined && (
                <span className="text-xs">{region.percentage}%</span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRegion(index)}
                className="ml-auto h-6 w-6 p-0"
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </div>
            {region.narrative && (
              <div className="mt-1 text-xs text-muted-foreground">{region.narrative}</div>
            )}
          </Card>
        ))}
      </div>
      
      <Card className="p-3 bg-muted/30">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Region code"
              value={newRegion.code || ''}
              onChange={(e) => setNewRegion({ ...newRegion, code: e.target.value })}
              className="h-8"
            />
            <Select 
              value={newRegion.vocabulary || '1'}
              onValueChange={(v) => setNewRegion({ ...newRegion, vocabulary: v })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">OECD DAC</SelectItem>
                <SelectItem value="2">UN</SelectItem>
              </SelectContent>
            </Select>
            {allowPercentages && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  placeholder="%"
                  min="0"
                  max="100"
                  step="0.1"
                  value={newRegion.percentage || ''}
                  onChange={(e) => setNewRegion({ 
                    ...newRegion, 
                    percentage: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  className="h-8"
                />
                <span className="text-xs">%</span>
              </div>
            )}
          </div>
          <Input
            placeholder="Narrative"
            value={newRegion.narrative || ''}
            onChange={(e) => setNewRegion({ ...newRegion, narrative: e.target.value })}
            className="h-8"
          />
          <Button 
            type="button" 
            onClick={addRegion} 
            size="sm"
            className="w-full"
            disabled={!newRegion.code}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Region
          </Button>
        </div>
      </Card>
      
      {hasPercentageError && (
        <Alert variant="destructive">
          <AlertDescription>
            Region percentages must sum to 100%. Current: {totalPercentage.toFixed(1)}%
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

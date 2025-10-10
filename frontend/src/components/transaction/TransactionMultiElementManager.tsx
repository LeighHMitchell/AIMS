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

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  TransactionSector, 
  TransactionAidType, 
  TransactionRecipientCountry, 
  TransactionRecipientRegion 
} from "@/types/transaction";
import { cn } from "@/lib/utils";

// ============================================================================
// SECTOR MANAGER
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
  const [newSector, setNewSector] = useState<Partial<TransactionSector>>({
    vocabulary: '1'
  });

  const totalPercentage = sectors.reduce((sum, s) => sum + (s.percentage || 0), 0);
  const hasPercentages = sectors.some(s => s.percentage !== undefined);
  const hasPercentageError = allowPercentages && hasPercentages && Math.abs(totalPercentage - 100) > 0.01;
  const isComplete = hasPercentages && Math.abs(totalPercentage - 100) <= 0.01;

  const addSector = () => {
    if (!newSector.code || newSector.code.trim() === '') {
      return;
    }
    
    const sectorToAdd: TransactionSector = {
      code: newSector.code.trim(),
      vocabulary: newSector.vocabulary || '1',
      percentage: allowPercentages ? newSector.percentage : undefined,
      narrative: newSector.narrative?.trim(),
    };
    
    onSectorsChange([...sectors, sectorToAdd]);
    setNewSector({ vocabulary: '1' });
  };

  const removeSector = (index: number) => {
    onSectorsChange(sectors.filter((_, i) => i !== index));
  };

  const updateSector = (index: number, updates: Partial<TransactionSector>) => {
    const updated = sectors.map((sector, i) => 
      i === index ? { ...sector, ...updates } : sector
    );
    onSectorsChange(updated);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Transaction Sectors</Label>
          <Info className="h-4 w-4 text-muted-foreground cursor-help" title="IATI allows multiple sectors per transaction" />
        </div>
        {hasPercentages && (
          <div className="flex items-center gap-2">
            {hasPercentageError && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Must sum to 100%
              </Badge>
            )}
            {isComplete && (
              <Badge variant="default" className="text-xs bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                {totalPercentage.toFixed(1)}%
              </Badge>
            )}
            {!isComplete && !hasPercentageError && (
              <Badge variant="secondary" className="text-xs">
                {totalPercentage.toFixed(1)}%
              </Badge>
            )}
          </div>
        )}
      </div>
      
      {/* Existing sectors */}
      <div className="space-y-2">
        {sectors.map((sector, index) => (
          <Card key={index} className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <div>
                  <Input
                    placeholder="Code"
                    value={sector.code}
                    onChange={(e) => updateSector(index, { code: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Select 
                    value={sector.vocabulary || '1'}
                    onValueChange={(v) => updateSector(index, { vocabulary: v })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">DAC 5-digit</SelectItem>
                      <SelectItem value="2">DAC 3-digit</SelectItem>
                      <SelectItem value="3">COFOG</SelectItem>
                      <SelectItem value="7">SDMX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {allowPercentages && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder="%"
                      min="0"
                      max="100"
                      step="0.1"
                      value={sector.percentage || ''}
                      onChange={(e) => updateSector(index, { 
                        percentage: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                      className="h-8"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSector(index)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {sector.narrative && (
              <div className="mt-2 text-xs text-muted-foreground">
                {sector.narrative}
              </div>
            )}
          </Card>
        ))}
      </div>
      
      {/* Add new sector */}
      <Card className="p-3 bg-muted/30">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Sector code (e.g., 11220)"
              value={newSector.code || ''}
              onChange={(e) => setNewSector({ ...newSector, code: e.target.value })}
              className="h-8"
            />
            <Select 
              value={newSector.vocabulary || '1'}
              onValueChange={(v) => setNewSector({ ...newSector, vocabulary: v })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Vocabulary" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">DAC 5-digit</SelectItem>
                <SelectItem value="2">DAC 3-digit</SelectItem>
                <SelectItem value="3">COFOG</SelectItem>
                <SelectItem value="7">SDMX</SelectItem>
              </SelectContent>
            </Select>
            {allowPercentages && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  placeholder="Percentage"
                  min="0"
                  max="100"
                  step="0.1"
                  value={newSector.percentage || ''}
                  onChange={(e) => setNewSector({ 
                    ...newSector, 
                    percentage: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  className="h-8"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            )}
          </div>
          <Input
            placeholder="Narrative (optional)"
            value={newSector.narrative || ''}
            onChange={(e) => setNewSector({ ...newSector, narrative: e.target.value })}
            className="h-8"
          />
          <Button 
            type="button" 
            onClick={addSector} 
            size="sm"
            className="w-full"
            disabled={!newSector.code}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Sector
          </Button>
        </div>
      </Card>
      
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
  const [newAidType, setNewAidType] = useState<Partial<TransactionAidType>>({
    vocabulary: '1'
  });

  const addAidType = () => {
    if (!newAidType.code || newAidType.code.trim() === '') {
      return;
    }
    
    const aidTypeToAdd: TransactionAidType = {
      code: newAidType.code.trim(),
      vocabulary: newAidType.vocabulary || '1',
    };
    
    onAidTypesChange([...aidTypes, aidTypeToAdd]);
    setNewAidType({ vocabulary: '1' });
  };

  const removeAidType = (index: number) => {
    onAidTypesChange(aidTypes.filter((_, i) => i !== index));
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
          <Card key={index} className="p-2 flex items-center gap-2">
            <Badge>{aidType.code}</Badge>
            <span className="text-xs text-muted-foreground">
              Vocab: {aidType.vocabulary || '1'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeAidType(index)}
              className="ml-auto h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </Card>
        ))}
      </div>
      
      {/* Add new aid type */}
      <Card className="p-3 bg-muted/30">
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Aid type code (e.g., A01)"
            value={newAidType.code || ''}
            onChange={(e) => setNewAidType({ ...newAidType, code: e.target.value })}
            className="h-8"
          />
          <Select 
            value={newAidType.vocabulary || '1'}
            onValueChange={(v) => setNewAidType({ ...newAidType, vocabulary: v })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">OECD DAC</SelectItem>
              <SelectItem value="2">Earmarking Category</SelectItem>
              <SelectItem value="3">Earmarking Modality</SelectItem>
              <SelectItem value="4">Cash and Voucher</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          type="button" 
          onClick={addAidType} 
          size="sm"
          className="w-full mt-2"
          disabled={!newAidType.code}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Aid Type
        </Button>
      </Card>
    </div>
  );
}

// ============================================================================
// RECIPIENT COUNTRY MANAGER
// ============================================================================

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
  const [newCountry, setNewCountry] = useState<Partial<TransactionRecipientCountry>>({});

  const totalPercentage = countries.reduce((sum, c) => sum + (c.percentage || 0), 0);
  const hasPercentages = countries.some(c => c.percentage !== undefined);
  const hasPercentageError = allowPercentages && hasPercentages && Math.abs(totalPercentage - 100) > 0.01;
  const isComplete = hasPercentages && Math.abs(totalPercentage - 100) <= 0.01;

  const addCountry = () => {
    if (!newCountry.code || newCountry.code.trim() === '') {
      return;
    }
    
    const countryToAdd: TransactionRecipientCountry = {
      code: newCountry.code.trim().toUpperCase(),
      percentage: allowPercentages ? newCountry.percentage : undefined,
    };
    
    onCountriesChange([...countries, countryToAdd]);
    setNewCountry({});
  };

  const removeCountry = (index: number) => {
    onCountriesChange(countries.filter((_, i) => i !== index));
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
      
      <div className="space-y-2">
        {countries.map((country, index) => (
          <Card key={index} className="p-2 flex items-center gap-2">
            <Badge className="font-mono">{country.code}</Badge>
            {country.percentage !== undefined && (
              <span className="text-xs text-muted-foreground">{country.percentage}%</span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCountry(index)}
              className="ml-auto h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </Card>
        ))}
      </div>
      
      <Card className="p-3 bg-muted/30">
        <div className="flex gap-2">
          <Input
            placeholder="Country code (e.g., TZ)"
            value={newCountry.code || ''}
            onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value })}
            maxLength={2}
            className="h-8 uppercase"
          />
          {allowPercentages && (
            <div className="flex items-center gap-1 w-24">
              <Input
                type="number"
                placeholder="%"
                min="0"
                max="100"
                step="0.1"
                value={newCountry.percentage || ''}
                onChange={(e) => setNewCountry({ 
                  ...newCountry, 
                  percentage: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
                className="h-8"
              />
              <span className="text-xs">%</span>
            </div>
          )}
          <Button 
            type="button" 
            onClick={addCountry} 
            size="sm"
            disabled={!newCountry.code}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Card>
      
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
                <Trash2 className="h-3 w-3" />
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
            placeholder="Narrative (optional)"
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

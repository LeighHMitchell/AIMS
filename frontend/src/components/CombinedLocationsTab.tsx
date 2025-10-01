'use client';

import React, { useState, useMemo } from 'react';
import { CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Using the new LocationsTab component instead of LocationEditor
// import LocationEditor, { IATILocation } from './LocationEditor';
import { EnhancedSubnationalBreakdown } from './activities/EnhancedSubnationalBreakdown';
import CountriesRegionsTab, { CountryAllocation, RegionAllocation } from './activities/CountriesRegionsTab';
import { AdvancedLocationData } from '@/data/iati-location-types';

// Re-export types for compatibility with existing interfaces
export interface SpecificLocation {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address?: string;
  notes?: string;
}

export interface CoverageArea {
  id: string;
  scope: 'national' | 'subnational';
  description: string;
  regions?: {
    id: string;
    name: string;
    code: string;
    townships: {
      id: string;
      name: string;
      code: string;
    }[];
  }[];
}

interface CombinedLocationsTabProps {
  // Activity Locations props
  specificLocations: SpecificLocation[];
  coverageAreas: CoverageArea[];
  onSpecificLocationsChange: (locations: SpecificLocation[]) => void;
  onCoverageAreasChange: (areas: CoverageArea[]) => void;

  // Advanced IATI Location Fields props
  advancedLocations?: AdvancedLocationData[];
  onAdvancedLocationsChange?: (locations: AdvancedLocationData[]) => void;

  // Subnational Breakdown props
  activityId: string;
  canEdit?: boolean;
  onSubnationalDataChange?: (breakdowns: Record<string, number>) => void;
  subnationalBreakdowns?: Record<string, number>;

  // Countries & Regions props
  countries?: CountryAllocation[];
  regions?: RegionAllocation[];
  onCountriesChange?: (countries: CountryAllocation[]) => void;
  onRegionsChange?: (regions: RegionAllocation[]) => void;

  // Common props
  activityTitle?: string;
  activitySector?: string;
}

// Import the new LocationsTab component
import LocationsTab from './LocationsTab';

export default function CombinedLocationsTab({
  specificLocations = [],
  coverageAreas = [],
  onSpecificLocationsChange,
  onCoverageAreasChange,
  advancedLocations = [],
  onAdvancedLocationsChange,
  activityId,
  canEdit = true,
  onSubnationalDataChange,
  subnationalBreakdowns: initialSubnationalBreakdowns = {},
  countries: initialCountries = [],
  regions: initialRegions = [],
  onCountriesChange,
  onRegionsChange,
  activityTitle,
  activitySector
}: CombinedLocationsTabProps) {
  // State to track active sub-tab
  const [activeSubTab, setActiveSubTab] = useState('activity-locations');
  const [subnationalBreakdowns, setSubnationalBreakdowns] = useState<Record<string, number>>(initialSubnationalBreakdowns);
  const [countries, setCountries] = useState<CountryAllocation[]>(initialCountries);
  const [regions, setRegions] = useState<RegionAllocation[]>(initialRegions);
  const [advancedLocationsState, setAdvancedLocationsState] = useState<AdvancedLocationData[]>(advancedLocations);
  
  // Track locations from the LocationsTab component
  const [currentLocations, setCurrentLocations] = useState<any[]>([]);

  // Calculate completion status for sub-tabs
  const hasValidLocations = useMemo(() => {
    // Use currentLocations from LocationsTab if available, otherwise fall back to specificLocations
    const locationsToCheck = currentLocations.length > 0 ? currentLocations : specificLocations;
    
    // Check specific locations for validity
    return locationsToCheck.some(location =>
      location.location_name?.trim() && // Use location_name from LocationSchema
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number'
    );
  }, [currentLocations, specificLocations]);

  const hasCompleteSubnational = useMemo(() => {
    const totalPercentage = Object.values(subnationalBreakdowns).reduce((sum, value) => sum + (value || 0), 0);
    const isValidTotal = Math.abs(totalPercentage - 100) < 0.01; // Allow for floating point precision
    const hasAnyValues = Object.values(subnationalBreakdowns).some(value => value > 0);
    return isValidTotal && hasAnyValues;
  }, [subnationalBreakdowns]);

  // Check if subnational has any data (for green tick)
  const hasSubnationalData = useMemo(() => {
    return Object.values(subnationalBreakdowns).some(value => value > 0);
  }, [subnationalBreakdowns]);

  const hasValidCountriesRegions = useMemo(() => {
    const countryTotal = countries.reduce((sum, c) => sum + (c.percentage || 0), 0);
    const regionTotal = regions.reduce((sum, r) => sum + (r.percentage || 0), 0);
    const totalPercentage = countryTotal + regionTotal;
    const isValidTotal = Math.abs(totalPercentage - 100) < 0.01;
    const hasAnyValues = countries.length > 0 || regions.length > 0;
    return isValidTotal && hasAnyValues;
  }, [countries, regions]);

  // Check if countries/regions has any data (for green tick)
  const hasCountriesRegionsData = useMemo(() => {
    return countries.length > 0 || regions.length > 0;
  }, [countries, regions]);

  // Update parent when subnational data changes
  const handleSubnationalDataChange = (breakdowns: Record<string, number>) => {
    setSubnationalBreakdowns(breakdowns);
    if (onSubnationalDataChange) {
      onSubnationalDataChange(breakdowns);
    }
  };

  // Update parent when countries data changes
  const handleCountriesChange = (newCountries: CountryAllocation[]) => {
    setCountries(newCountries);
    if (onCountriesChange) {
      onCountriesChange(newCountries);
    }
  };

  // Update parent when regions data changes
  const handleRegionsChange = (newRegions: RegionAllocation[]) => {
    setRegions(newRegions);
    if (onRegionsChange) {
      onRegionsChange(newRegions);
    }
  };

  // Update parent when advanced locations data changes
  const handleAdvancedLocationsChange = (newAdvancedLocations: AdvancedLocationData[]) => {
    setAdvancedLocationsState(newAdvancedLocations);
    if (onAdvancedLocationsChange) {
      onAdvancedLocationsChange(newAdvancedLocations);
    }
  };

  // Handle locations change from LocationsTab
  const handleLocationsChange = (newLocations: any[]) => {
    setCurrentLocations(newLocations);
    // Also update the parent's specificLocations if callback is provided
    if (onSpecificLocationsChange) {
      onSpecificLocationsChange(newLocations);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity-locations" className="flex items-center gap-2">
            Activity Sites
            {hasValidLocations && <CheckCircle className="h-4 w-4 text-green-500 ml-1" />}
          </TabsTrigger>
          <TabsTrigger value="subnational-breakdown" className="flex items-center gap-2">
            Subnational Allocation
            {hasSubnationalData && <CheckCircle className="h-4 w-4 text-green-500 ml-1" />}
          </TabsTrigger>
          <TabsTrigger value="countries-regions" className="flex items-center gap-2">
            Country and Region Allocation
            {hasCountriesRegionsData && <CheckCircle className="h-4 w-4 text-green-500 ml-1" />}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="activity-locations" className="mt-6">
          <LocationsTab
            activityId={activityId}
            activityTitle={activityTitle}
            activitySector={activitySector}
            canEdit={canEdit}
            onLocationsChange={handleLocationsChange}
          />
        </TabsContent>

        <TabsContent value="subnational-breakdown" className="mt-6">
          <EnhancedSubnationalBreakdown
            activityId={activityId}
            canEdit={canEdit}
            onDataChange={handleSubnationalDataChange}
          />
        </TabsContent>

        <TabsContent value="countries-regions" className="mt-6">
          <CountriesRegionsTab
            activityId={activityId}
            countries={countries}
            regions={regions}
            onCountriesChange={handleCountriesChange}
            onRegionsChange={handleRegionsChange}
            canEdit={canEdit}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
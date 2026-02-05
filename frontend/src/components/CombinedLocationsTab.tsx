'use client';

import React, { useState, useMemo } from 'react';
import { CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Using the new LocationsTab component instead of LocationEditor
// import LocationEditor, { IATILocation } from './LocationEditor';
import { EnhancedSubnationalBreakdown } from './activities/EnhancedSubnationalBreakdown';
import { AdvancedLocationData } from '@/data/iati-location-types';

// Re-export CountryAllocation and RegionAllocation types for compatibility
export type { CountryAllocation, RegionAllocation } from './activities/CountriesRegionsTab';

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
  activityTitle,
  activitySector
}: CombinedLocationsTabProps) {
  // State to track active sub-tab
  const [activeSubTab, setActiveSubTab] = useState('activity-locations');
  const [subnationalBreakdowns, setSubnationalBreakdowns] = useState<Record<string, number>>(initialSubnationalBreakdowns);
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

  // Derive suggested regions from Activity Sites locations
  // These will be auto-added to the Subnational Allocation tab with 0%
  const suggestedRegions = useMemo(() => {
    const regions = new Set<string>();
    currentLocations.forEach(loc => {
      if (loc.state_region_name) {
        regions.add(loc.state_region_name);
      }
    });
    return Array.from(regions);
  }, [currentLocations]);

  // Update parent when subnational data changes
  const handleSubnationalDataChange = (breakdowns: Record<string, number>) => {
    setSubnationalBreakdowns(breakdowns);
    if (onSubnationalDataChange) {
      onSubnationalDataChange(breakdowns);
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
        <TabsList className="p-1 h-auto bg-background gap-1 border mb-4 flex flex-wrap">
          <TabsTrigger value="activity-locations" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Activity Sites
            {hasValidLocations && <CheckCircle className="h-4 w-4 text-green-500 ml-1" />}
          </TabsTrigger>
          <TabsTrigger value="subnational-breakdown" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Subnational Allocation
            {hasSubnationalData && <CheckCircle className="h-4 w-4 text-green-500 ml-1" />}
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
            suggestedRegions={suggestedRegions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
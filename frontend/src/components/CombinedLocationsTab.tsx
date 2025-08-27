'use client';

import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle } from 'lucide-react';
import LocationsTab from './LocationsTab';
import { EnhancedSubnationalBreakdown } from './activities/EnhancedSubnationalBreakdown';

// Re-export types for compatibility
interface SpecificLocation {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address?: string;
  notes?: string;
}

interface CoverageArea {
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
  
  // Subnational Breakdown props
  activityId: string;
  canEdit?: boolean;
  onSubnationalDataChange?: (breakdowns: Record<string, number>) => void;
  subnationalBreakdowns?: Record<string, number>;
  
  // Common props
  activityTitle?: string;
  activitySector?: string;
}

export default function CombinedLocationsTab({
  specificLocations = [],
  coverageAreas = [],
  onSpecificLocationsChange,
  onCoverageAreasChange,
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

  // Calculate completion status for sub-tabs
  const hasValidLocations = useMemo(() => {
    return specificLocations.some(location => 
      location.name?.trim() && 
      typeof location.latitude === 'number' && 
      typeof location.longitude === 'number'
    );
  }, [specificLocations]);

  const hasCompleteSubnational = useMemo(() => {
    const totalPercentage = Object.values(subnationalBreakdowns).reduce((sum, value) => sum + (value || 0), 0);
    const isValidTotal = Math.abs(totalPercentage - 100) < 0.01; // Allow for floating point precision
    const hasAnyValues = Object.values(subnationalBreakdowns).some(value => value > 0);
    return isValidTotal && hasAnyValues;
  }, [subnationalBreakdowns]);

  // Update parent when subnational data changes
  const handleSubnationalDataChange = (breakdowns: Record<string, number>) => {
    setSubnationalBreakdowns(breakdowns);
    if (onSubnationalDataChange) {
      onSubnationalDataChange(breakdowns);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activity-locations" className="flex items-center gap-2">
            Activity Locations
            {hasValidLocations && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </TabsTrigger>
          <TabsTrigger value="subnational-breakdown" className="flex items-center gap-2">
            Subnational Breakdown
            {hasCompleteSubnational && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="activity-locations" className="mt-6">
          <LocationsTab
            specificLocations={specificLocations}
            coverageAreas={coverageAreas}
            onSpecificLocationsChange={onSpecificLocationsChange}
            onCoverageAreasChange={onCoverageAreasChange}
            activityId={activityId}
            activityTitle={activityTitle}
            activitySector={activitySector}
          />
        </TabsContent>

        <TabsContent value="subnational-breakdown" className="mt-6">
          <EnhancedSubnationalBreakdown
            activityId={activityId}
            canEdit={canEdit}
            onDataChange={handleSubnationalDataChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
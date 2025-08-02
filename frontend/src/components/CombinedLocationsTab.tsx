'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LocationsTab from './LocationsTab';
import { SubnationalBreakdownTab } from './activities/SubnationalBreakdownTab';

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
  activityTitle,
  activitySector
}: CombinedLocationsTabProps) {
  // State to track active sub-tab
  const [activeSubTab, setActiveSubTab] = useState('activity-locations');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Locations</h2>
        <p className="text-gray-600 text-sm">
          Manage activity locations and regional breakdown allocations
        </p>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activity-locations">Activity Locations</TabsTrigger>
          <TabsTrigger value="subnational-breakdown">Subnational Breakdown</TabsTrigger>
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
          <SubnationalBreakdownTab
            activityId={activityId}
            canEdit={canEdit}
            onDataChange={onSubnationalDataChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
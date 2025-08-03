import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LocationsTab from './LocationsTab';
import { SubnationalBreakdownTab } from './activities/SubnationalBreakdownTab';

interface CombinedLocationsTabProps {
  specificLocations: any[];
  coverageAreas: any[];
  onSpecificLocationsChange: (locations: any[]) => void;
  onCoverageAreasChange: (areas: any[]) => void;
  activityId: string;
  canEdit: boolean;
  onSubnationalDataChange: (data: Record<string, number>) => void;
  activityTitle?: string;
  activitySector?: string;
}

export default function CombinedLocationsTab({
  specificLocations,
  coverageAreas,
  onSpecificLocationsChange,
  onCoverageAreasChange,
  activityId,
  canEdit,
  onSubnationalDataChange,
  activityTitle,
  activitySector
}: CombinedLocationsTabProps) {
  const [activeTab, setActiveTab] = useState('activity_locations');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activity_locations">Activity Locations</TabsTrigger>
          <TabsTrigger value="subnational_breakdown">Subnational Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="activity_locations">
          <LocationsTab
            specificLocations={specificLocations}
            coverageAreas={coverageAreas}
            onSpecificLocationsChange={onSpecificLocationsChange}
            onCoverageAreasChange={onCoverageAreasChange}
            activityId={activityId}
          />
        </TabsContent>

        <TabsContent value="subnational_breakdown">
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
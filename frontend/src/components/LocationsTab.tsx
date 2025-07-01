'use client';

import React, { useState } from 'react';
import LocationSelector from './LocationSelectorDynamic';
import EnhancedCoverageSelector from './EnhancedCoverageSelectorDynamic';

// Types for IATI-compliant location data
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

interface LocationsTabProps {
  specificLocations: SpecificLocation[];
  coverageAreas: CoverageArea[];
  onSpecificLocationsChange: (locations: SpecificLocation[]) => void;
  onCoverageAreasChange: (areas: CoverageArea[]) => void;
}

export default function LocationsTab({
  specificLocations = [],
  coverageAreas = [],
  onSpecificLocationsChange,
  onCoverageAreasChange,
}: LocationsTabProps) {
  return (
    <div className="space-y-6">
      {/* Two-column layout with aligned tops */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Interactive Location Selector */}
        <div className="flex flex-col h-full">
          <LocationSelector
            locations={specificLocations}
            onLocationsChange={onSpecificLocationsChange}
          />
        </div>

        {/* Right Column: Enhanced Coverage Selector */}
        <div className="flex flex-col h-full">
          <EnhancedCoverageSelector
            coverageAreas={coverageAreas}
            onCoverageAreasChange={onCoverageAreasChange}
          />
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="text-center text-sm text-gray-600 py-4 border-t bg-gray-50 rounded-lg">
        <p className="font-medium">
          {specificLocations.length} physical location{specificLocations.length !== 1 ? 's' : ''} and{' '}
          {coverageAreas.length} coverage area{coverageAreas.length !== 1 ? 's' : ''} added
        </p>
        <p className="text-xs text-gray-500 mt-1">
          All location data will be saved with IATI-compliant structure
        </p>
      </div>
    </div>
  );
}


'use client';

import React, { useState } from 'react';
import LocationSelector from './LocationSelectorDynamic';
import EnhancedCoverageSelector from './EnhancedCoverageSelectorDynamic';
import { useLocationsAutosave } from '@/hooks/use-field-autosave-new';
import { useUser } from '@/hooks/useUser';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
  activityId?: string;
}

export default function LocationsTab({
  specificLocations = [],
  coverageAreas = [],
  onSpecificLocationsChange,
  onCoverageAreasChange,
  activityId
}: LocationsTabProps) {
  const { user } = useUser();
  
  // Field-level autosave for locations
  const locationsAutosave = useLocationsAutosave(activityId, user?.id);

  // Enhanced onChange handlers that trigger autosave
  const handleSpecificLocationsChange = (newLocations: SpecificLocation[]) => {
    onSpecificLocationsChange(newLocations);
    if (activityId) {
      const locationsData = {
        specificLocations: newLocations,
        coverageAreas: coverageAreas
      };
      locationsAutosave.triggerFieldSave(locationsData);
    }
  };

  const handleCoverageAreasChange = (newAreas: CoverageArea[]) => {
    onCoverageAreasChange(newAreas);
    if (activityId) {
      const locationsData = {
        specificLocations: specificLocations,
        coverageAreas: newAreas
      };
      locationsAutosave.triggerFieldSave(locationsData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with autosave status */}
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-gray-900">Activity Locations</h2>
        {locationsAutosave.state.isSaving && (
          <span className="text-xs text-blue-600">Saving...</span>
        )}
        {locationsAutosave.state.lastSaved && !locationsAutosave.state.isSaving && (
          <span className="text-xs text-green-600">Saved</span>
        )}
        {locationsAutosave.state.error && (
          <span className="text-xs text-red-600">Save failed</span>
        )}
      </div>

      {/* Autosave error details */}
      {locationsAutosave.state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to save locations: {locationsAutosave.state.error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Two-column layout with aligned tops */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Interactive Location Selector */}
        <div className="flex flex-col h-full">
          <LocationSelector
            locations={specificLocations}
            onLocationsChange={handleSpecificLocationsChange}
          />
        </div>

        {/* Right Column: Enhanced Coverage Selector */}
        <div className="flex flex-col h-full">
          <EnhancedCoverageSelector
            coverageAreas={coverageAreas}
            onCoverageAreasChange={handleCoverageAreasChange}
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


'use client';

import React, { useState, useEffect } from 'react';
import LocationSelector from './LocationSelectorDynamic';
import { useLocationsAutosave } from '@/hooks/use-field-autosave-new';
import { useUser } from '@/hooks/useUser';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  
  // Debug logging for locations data
  useEffect(() => {
    console.log('[LocationsTab] Received specific locations:', specificLocations);
    console.log('[LocationsTab] Received coverage areas:', coverageAreas);
    console.log('[LocationsTab] Activity ID:', activityId);
  }, [specificLocations, coverageAreas, activityId]);
  
  // Field-level autosave for locations
  const locationsAutosave = useLocationsAutosave(activityId, user?.id);
  
  // Toast notifications for save success/error
  useEffect(() => {
    if (locationsAutosave.state.lastSaved && !locationsAutosave.state.isSaving && !locationsAutosave.state.error) {
      toast.success('Locations saved successfully!', { 
        position: 'top-right', 
        duration: 2000,
        icon: <CheckCircle className="h-4 w-4" />
      });
    }
  }, [locationsAutosave.state.lastSaved]);

  useEffect(() => {
    if (locationsAutosave.state.error) {
      toast.error('Failed to save locations. Please try again.', { 
        position: 'top-right', 
        duration: 3000,
        icon: <AlertCircle className="h-4 w-4" />
      });
    }
  }, [locationsAutosave.state.error]);

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

  return (
    <div className="space-y-6">
      {/* Header with autosave status */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-gray-900">Activity Locations</h2>
        {locationsAutosave.state.isSaving && (
          <div className="flex items-center gap-1 text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Saving...</span>
          </div>
        )}
        {locationsAutosave.state.lastSaved && !locationsAutosave.state.isSaving && !locationsAutosave.state.error && (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Saved</span>
          </div>
        )}
        {locationsAutosave.state.error && (
          <div className="flex items-center gap-1 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Save failed</span>
          </div>
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

      {/* Single column layout */}
      <div className="max-w-4xl">
        {/* Location Selector */}
        <div className="flex flex-col h-full">
          <LocationSelector
            locations={specificLocations}
            onLocationsChange={handleSpecificLocationsChange}
          />
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="text-center text-sm text-gray-600 py-4 border-t bg-gray-50 rounded-lg">
        <p className="font-medium">
          {specificLocations.length} physical location{specificLocations.length !== 1 ? 's' : ''} added
        </p>
        <p className="text-xs text-gray-500 mt-1">
          All location data will be saved with IATI-compliant structure
        </p>
      </div>
    </div>
  );
}


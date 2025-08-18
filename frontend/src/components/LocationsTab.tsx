'use client';

import React, { useState, useEffect } from 'react';
import SimpleMapSelector from './SimpleMapSelectorWrapper';
import { Location } from './LocationSelector';
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
  activityTitle?: string;
  activitySector?: string;
}

// Convert SpecificLocation to new Location format
function convertSpecificLocationToLocation(specificLocation: SpecificLocation): Location {
  console.log('🔄 Converting SpecificLocation to Location:', {
    input: {
      name: specificLocation.name,
      lat: specificLocation.latitude,
      lng: specificLocation.longitude,
      coordTypes: {
        lat: typeof specificLocation.latitude,
        lng: typeof specificLocation.longitude
      }
    }
  });
  
  const converted = {
    id: specificLocation.id,
    location_type: 'site' as const,
    location_name: specificLocation.name,
    description: specificLocation.notes,
    latitude: specificLocation.latitude,
    longitude: specificLocation.longitude,
    address: specificLocation.address,
    site_type: specificLocation.type || 'project_site'
  };
  
  console.log('🔄 Converted result:', {
    name: converted.location_name,
    lat: converted.latitude,
    lng: converted.longitude
  });
  
  return converted;
}

// Convert new Location format back to SpecificLocation
function convertLocationToSpecificLocation(location: Location): SpecificLocation {
  return {
    id: location.id || '',
    name: location.location_name,
    type: location.site_type || 'project_site',
    latitude: location.latitude || 0,
    longitude: location.longitude || 0,
    address: location.address,
    notes: location.description
  };
}

export default function LocationsTab({
  specificLocations = [],
  coverageAreas = [],
  onSpecificLocationsChange,
  onCoverageAreasChange,
  activityId,
  activityTitle,
  activitySector
}: LocationsTabProps) {
  // Get user for autosave
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

  // Convert locations for the new LocationSelector
  console.log('[LocationsTab] Converting specificLocations to Location format:', {
    count: specificLocations.length,
    firstLocation: specificLocations[0] ? {
      name: specificLocations[0].name,
      lat: specificLocations[0].latitude,
      lng: specificLocations[0].longitude
    } : null
  });
  
  const locations: Location[] = specificLocations.map(convertSpecificLocationToLocation);
  
  console.log('[LocationsTab] Converted locations:', {
    count: locations.length,
    firstLocation: locations[0] ? {
      name: locations[0].location_name,
      lat: locations[0].latitude,
      lng: locations[0].longitude
    } : null
  });

  // Enhanced onChange handlers that trigger autosave
  const handleLocationsChange = (newLocations: Location[]) => {
    // Convert back to SpecificLocation format for parent component
    const specificLocationsFormatted = newLocations.map(convertLocationToSpecificLocation);
    onSpecificLocationsChange(specificLocationsFormatted);
    
    if (activityId) {
      const locationsData = {
        specificLocations: specificLocationsFormatted,
        coverageAreas: coverageAreas
      };
      locationsAutosave.triggerFieldSave(locationsData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with autosave status */}
        <div className="flex items-center gap-3">
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
      <div className="max-w-7xl w-full">
        {/* Location Selector */}
        <div className="flex flex-col h-full">
          <SimpleMapSelector
            locations={locations}
            onLocationsChange={handleLocationsChange}
            activityId={activityId}
            userId={user?.id}
            activityTitle={activityTitle}
            activitySector={activitySector}
          />
        </div>
      </div>

      {/* Bottom Summary */}

    </div>
  );
}


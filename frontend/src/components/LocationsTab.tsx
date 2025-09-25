'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useFieldAutosave } from '@/hooks/use-field-autosave-new';
import { useUser } from '@/hooks/useUser';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AdvancedLocationFields from './activities/AdvancedLocationFields';
import { AdvancedLocationData } from '@/data/iati-location-types';

// Dynamic import to avoid SSR issues
const SimpleMapSelector = dynamic(
  () => import('./SimpleMapSelectorWrapper'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }
);

// Re-export Location interface from LocationSelector to avoid duplication
import { Location } from './LocationSelector';

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
  advancedLocations?: AdvancedLocationData[];
  onAdvancedLocationsChange?: (locations: AdvancedLocationData[]) => void;
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
  activitySector,
  advancedLocations = [],
  onAdvancedLocationsChange
}: LocationsTabProps) {
  // Ensure props are always arrays - memoized to prevent unnecessary re-renders
  const safeSpecificLocations = useMemo(() => Array.isArray(specificLocations) ? specificLocations : [], [specificLocations]);
  const safeCoverageAreas = useMemo(() => Array.isArray(coverageAreas) ? coverageAreas : [], [coverageAreas]);
  const safeAdvancedLocations = useMemo(() => Array.isArray(advancedLocations) ? advancedLocations : [], [advancedLocations]);

  // Get user for autosave (with fallback)
  const { user } = useUser();
  const userId = user?.id || 'anonymous';

  // State for loaded locations
  const [loadedLocations, setLoadedLocations] = useState<Location[]>([]);

  // Load existing locations from backend when component mounts or activityId changes
  useEffect(() => {
    const loadExistingLocations = async () => {
      if (!activityId || activityId === 'new') {
        setLoadedLocations([]);
        return;
      }

      try {
        console.log('[LocationsTab] Loading existing locations for activity:', activityId);
        const response = await fetch(`/api/activities/${activityId}/locations`);

        if (!response.ok) {
          console.error('[LocationsTab] Failed to load locations:', response.statusText);
          return;
        }

        const data = await response.json();
        console.log('[LocationsTab] Loaded locations:', data.locations);

        if (data.locations && Array.isArray(data.locations)) {
          // Convert database locations to frontend format
          const convertedLocations = data.locations.map((location: any) => ({
            id: location.id,
            location_type: location.location_type,
            location_name: location.location_name,
            description: location.description,
            latitude: location.latitude ? parseFloat(location.latitude) : undefined,
            longitude: location.longitude ? parseFloat(location.longitude) : undefined,
            address: location.address,
            site_type: location.site_type,
            state_region_code: location.state_region_code,
            state_region_name: location.state_region_name,
            township_code: location.township_code,
            township_name: location.township_name,
          }));

          setLoadedLocations(convertedLocations);
        }
      } catch (error) {
        console.error('[LocationsTab] Error loading locations:', error);
      }
    };

    loadExistingLocations();
  }, [activityId]);

  // Debug logging for locations data
  useEffect(() => {
    console.log('[LocationsTab] Received specific locations:', safeSpecificLocations);
    console.log('[LocationsTab] Received coverage areas:', safeCoverageAreas);
    console.log('[LocationsTab] Loaded locations:', loadedLocations);
    console.log('[LocationsTab] Activity ID:', activityId);
    console.log('[LocationsTab] User ID:', userId);
  }, [safeSpecificLocations, safeCoverageAreas, loadedLocations, activityId, userId]);

  // Callback to handle successful saves
  const handleSaveSuccess = useCallback((data: any) => {
    console.log('[LocationsTab] Save successful, updating loaded locations:', data);

    // Update loaded locations from the response
    if (data.locations && Array.isArray(data.locations)) {
      const convertedLocations = data.locations.map((location: any) => ({
        id: location.id,
        location_type: location.location_type,
        location_name: location.location_name,
        description: location.description,
        latitude: location.latitude ? parseFloat(location.latitude) : undefined,
        longitude: location.longitude ? parseFloat(location.longitude) : undefined,
        address: location.address,
        site_type: location.site_type,
        state_region_code: location.state_region_code,
        state_region_name: location.state_region_name,
        township_code: location.township_code,
        township_name: location.township_name,
      }));

      setLoadedLocations(convertedLocations);
      console.log('[LocationsTab] Updated loaded locations count:', convertedLocations.length);
    }
  }, []);

  // Custom field autosave for locations with success callback (only when activityId is available)
  const locationsAutosave = useFieldAutosave('locations', {
    activityId: activityId || 'new',
    userId,
    debounceMs: 2000,
    onSuccess: handleSaveSuccess
  });

  // Toast notifications for save success/error
  useEffect(() => {
    if (locationsAutosave.state.lastSaved && !locationsAutosave.state.isSaving && !locationsAutosave.state.error) {
      // Silent save - no toast notification
    }
  }, [locationsAutosave.state.lastSaved, locationsAutosave.state.isSaving, locationsAutosave.state.error]);

  useEffect(() => {
    if (locationsAutosave.state.error) {
      toast.error('Failed to save locations. Please try again.', {
        position: 'top-right',
        duration: 3000,
        icon: <AlertCircle className="h-4 w-4" />
      });
    }
  }, [locationsAutosave.state.error]);

  // Safety check for required props - after all hooks
  if (!onSpecificLocationsChange || !onCoverageAreasChange) {
    console.error('LocationsTab: Missing required props onSpecificLocationsChange or onCoverageAreasChange');
    return <div>Error: Missing required props</div>;
  }

  // Convert locations for the new LocationSelector
  console.log('[LocationsTab] Converting specificLocations to Location format:', {
    count: safeSpecificLocations.length,
    firstLocation: safeSpecificLocations[0] ? {
      name: safeSpecificLocations[0].name,
      lat: safeSpecificLocations[0].latitude,
      lng: safeSpecificLocations[0].longitude
    } : null
  });
  
  // Combine loaded locations with any new locations that have been added
  const allLocations = [...loadedLocations];

  // Add any specific locations that aren't in loaded locations (newly added)
  safeSpecificLocations.forEach(specificLocation => {
    const existingIndex = allLocations.findIndex(loc =>
      loc.id === specificLocation.id ||
      (loc.latitude === specificLocation.latitude && loc.longitude === specificLocation.longitude)
    );

    if (existingIndex === -1) {
      allLocations.push(convertSpecificLocationToLocation(specificLocation));
    }
  });

  const locations: Location[] = allLocations;
  
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
    try {
      // Convert back to SpecificLocation format for parent component
      const specificLocationsFormatted = newLocations.map(convertLocationToSpecificLocation);
      onSpecificLocationsChange(specificLocationsFormatted);

      if (activityId && activityId !== 'new') {
        // Ensure we always have the proper data structure expected by the API
        const locationsData = {
          specificLocations: specificLocationsFormatted || [],
          coverageAreas: safeCoverageAreas  // Use safe coverage areas
        };

        console.log('[LocationsTab] Saving locations data:', {
          specificLocationsCount: specificLocationsFormatted.length,
          coverageAreasCount: safeCoverageAreas.length,
          activityId: activityId,
          specificLocationsData: specificLocationsFormatted,
          coverageAreasData: safeCoverageAreas
        });

        console.log('[LocationsTab] Autosave trigger details:', {
          fieldName: 'locations',
          hasActivityId: !!activityId,
          userId: user?.id
        });

        locationsAutosave.triggerFieldSave(locationsData);
      }
    } catch (error) {
      console.error('[LocationsTab] Error in handleLocationsChange:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with autosave status */}
        <div className="flex items-center gap-3">
          {/* Removed save status indicators */}
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

      {/* Advanced IATI Location Fields */}
      <AdvancedLocationFields
        locations={safeAdvancedLocations}
        onLocationsChange={onAdvancedLocationsChange || (() => {})}
        canEdit={true}
        activityId={activityId}
      />

      {/* Bottom Summary */}

    </div>
  );
}


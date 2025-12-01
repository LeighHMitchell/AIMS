import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

import { useUser } from '@/hooks/useUser';
import { useFieldAutosave } from '@/hooks/use-field-autosave-new';

import LocationModal from './locations/LocationModal';
import LocationCard from './locations/LocationCard';
import { LocationsSkeleton } from './activities/TabSkeletons';
import ActivityLocationsHeatmap from './maps/ActivityLocationsHeatmap';

import {
  type LocationSchema,
} from '@/lib/schemas/location';

interface LocationsTabProps {
  activityId?: string;
  activityTitle?: string;
  activitySector?: string;
  canEdit?: boolean;
  onLocationsChange?: (locations: LocationSchema[]) => void;
}

export default function LocationsTab({
  activityId,
  activityTitle,
  activitySector,
  canEdit = true,
  onLocationsChange,
}: LocationsTabProps) {
  // State
  const [locations, setLocations] = useState<LocationSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationSchema | undefined>();

  // Get user for autosave
  const { user } = useUser();
  const userId = user?.id || 'anonymous';

  // Load locations from API
  const loadLocations = useCallback(async () => {
      if (!activityId || activityId === 'new') {
      setLocations([]);
      setIsLoading(false);
        return;
      }

      try {
      setIsLoading(true);
      setError(null);

        const response = await fetch(`/api/activities/${activityId}/locations`);
        if (!response.ok) {
        throw new Error('Failed to load locations');
        }

        const data = await response.json();

      if (data.success) {
        setLocations(data.locations || []);
      } else {
        throw new Error(data.error || 'Failed to load locations');
      }
    } catch (err) {
      console.error('Error loading locations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  }, [activityId]);

  // Load locations on mount and when activityId changes
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Notify parent when locations change
  useEffect(() => {
    if (onLocationsChange) {
      onLocationsChange(locations);
    }
  }, [locations, onLocationsChange]);


  // Handle save location (create or update)
  const handleSaveLocation = useCallback(async (locationData: LocationSchema) => {
    try {
      console.log('[LocationsTab] 🚀 Starting save process for location:', locationData);
      
      const url = editingLocation 
        ? `/api/locations/${editingLocation.id}`
        : `/api/activities/${activityId}/locations`;
      
      const method = editingLocation ? 'PATCH' : 'POST';
      
      console.log('[LocationsTab] 📡 Making API request:', { url, method, isUpdate: !!editingLocation });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData),
      });

      console.log('[LocationsTab] 📡 API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[LocationsTab] ❌ API error response:', errorData);
        throw new Error('Failed to save location');
      }

      const result = await response.json();
      console.log('[LocationsTab] ✅ API success response:', result);
      
      if (result.success) {
        console.log('[LocationsTab] ✅ Location saved successfully, reloading...');
        toast.success(editingLocation ? 'Location updated successfully' : 'Location added successfully');
        await loadLocations();
        console.log('[LocationsTab] ✅ Locations reloaded, closing modal');
        setIsModalOpen(false);
        setEditingLocation(undefined);
      } else {
        console.error('[LocationsTab] ❌ API returned success: false:', result);
        throw new Error(result.error || 'Failed to save location');
      }
    } catch (err) {
      console.error('[LocationsTab] ❌ Error saving location:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save location');
    }
  }, [activityId, editingLocation, loadLocations]);

  // Handle delete location
  const handleDeleteLocation = useCallback(async (locationId: string) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/locations/${locationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete location');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Location deleted successfully');
        await loadLocations();
      } else {
        throw new Error(result.error || 'Failed to delete location');
      }
    } catch (err) {
      console.error('Error deleting location:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete location');
    }
  }, [activityId, loadLocations]);

  // Handle duplicate location
  const handleDuplicateLocation = useCallback(async (location: LocationSchema) => {
    try {
      const duplicateData = {
        ...location,
        id: undefined, // Remove ID to create new location
        location_name: `${location.location_name} (Copy)`,
      };

      const response = await fetch(`/api/activities/${activityId}/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateData),
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate location');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Location duplicated successfully');
        await loadLocations();
      } else {
        throw new Error(result.error || 'Failed to duplicate location');
      }
    } catch (err) {
      console.error('Error duplicating location:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate location');
    }
  }, [activityId, loadLocations]);

  // Handle edit location
  const handleEditLocation = useCallback((location: LocationSchema) => {
    setEditingLocation(location);
    setIsModalOpen(true);
  }, []);

  // Handle close modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingLocation(undefined);
  }, []);

  // Handle add new location
  const handleAddLocation = useCallback(() => {
    setEditingLocation(undefined);
    setIsModalOpen(true);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadLocations();
  }, [loadLocations]);


  // Show loading state with skeleton
  if (isLoading) {
    return <LocationsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Activity Locations Heatmap */}
      <ActivityLocationsHeatmap 
        locations={locations}
        title="Activity Locations Map"
        activityTitle={activityTitle}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Activity Locations</h3>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && locations.length > 0 && (
            <Button onClick={handleAddLocation} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Location
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="ml-2"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}



      {/* Locations Grid */}
      {locations.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No locations added</h4>
          <p className="text-gray-600 mb-6">
            Add locations to specify where your activity takes place or where beneficiaries are located.
          </p>
          {canEdit && (
            <div className="flex justify-center">
              <Button onClick={handleAddLocation} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Location
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onEdit={handleEditLocation}
              onDelete={handleDeleteLocation}
              onDuplicate={handleDuplicateLocation}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {/* Location Modal */}
      <LocationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveLocation}
        location={editingLocation}
        activityId={activityId}
        activityTitle={activityTitle}
        activitySector={activitySector}
      />
    </div>
  );
}
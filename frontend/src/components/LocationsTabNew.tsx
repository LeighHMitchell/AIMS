'use client';

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
  Info
} from 'lucide-react';
import { toast } from 'sonner';

import { useUser } from '@/hooks/useUser';
import { useFieldAutosave } from '@/hooks/use-field-autosave-new';

import LocationModal from './locations/LocationModal';
import LocationCard from './locations/LocationCard';

import {
  type LocationSchema,
} from '@/lib/schemas/location';

interface LocationsTabProps {
  activityId?: string;
  activityTitle?: string;
  activitySector?: string;
  canEdit?: boolean;
}

export default function LocationsTabNew({
  activityId,
  activityTitle,
  activitySector,
  canEdit = true,
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

  // Field autosave for locations
  const locationsAutosave = useFieldAutosave('locations', {
    activityId: activityId || 'new',
    userId,
    debounceMs: 2000,
  });

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

  // Auto-save when locations change
  useEffect(() => {
    if (activityId && activityId !== 'new' && locations.length > 0) {
      const timeoutId = setTimeout(() => {
        const locationsData = {
          locations: locations.filter(loc => !loc.id?.startsWith('temp_')),
        };

        locationsAutosave.triggerFieldSave(locationsData);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [locations, activityId, locationsAutosave]);

  // Handle save location (create or update)
  const handleSaveLocation = useCallback(async (locationData: LocationSchema) => {
    try {
      console.log('[LocationsTabNew] 🚀 Starting save process for location:', locationData);
      
      const isUpdate = !!locationData.id;
      const url = isUpdate
        ? `/api/locations/${locationData.id}`
        : `/api/activities/${activityId}/locations`;

      const method = isUpdate ? 'PATCH' : 'POST';

      console.log('[LocationsTabNew] 📡 Making API request:', { url, method, isUpdate });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...locationData,
          user_id: userId,
        }),
      });

      console.log('[LocationsTabNew] 📡 API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[LocationsTabNew] ❌ API error response:', errorData);
        throw new Error(errorData.error || 'Failed to save location');
      }

      const result = await response.json();
      console.log('[LocationsTabNew] ✅ API success response:', result);

      if (isUpdate) {
        // Update existing location in state
        setLocations(prev =>
          prev.map(loc =>
            loc.id === locationData.id ? result.location : loc
          )
        );
        console.log('[LocationsTabNew] ✅ Updated location in state');
      } else {
        // Add new location to state
        setLocations(prev => [...prev, result.location]);
        console.log('[LocationsTabNew] ✅ Added new location to state');
      }

      // Reload to get updated percentage summary
      console.log('[LocationsTabNew] 🔄 Reloading locations...');
      await loadLocations();
      console.log('[LocationsTabNew] ✅ Locations reloaded successfully');

    } catch (error) {
      console.error('[LocationsTabNew] ❌ Error saving location:', error);
      throw error;
    }
  }, [activityId, userId, loadLocations]);

  // Handle delete location
  const handleDeleteLocation = useCallback(async (locationId: string) => {
    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete location');
      }

      // Remove location from state
      setLocations(prev => prev.filter(loc => loc.id !== locationId));

      // Reload to get updated percentage summary
      await loadLocations();

      toast.success('Location deleted successfully');
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location. Please try again.');
      throw error;
    }
  }, [loadLocations]);

  // Handle edit location
  const handleEditLocation = useCallback((location: LocationSchema) => {
    setEditingLocation(location);
    setIsModalOpen(true);
  }, []);

  // Handle duplicate location
  const handleDuplicateLocation = useCallback((location: LocationSchema) => {
    const duplicatedLocation: LocationSchema = {
      ...location,
      id: undefined,
      location_name: `${location.location_name} (Copy)`,
      created_at: undefined,
      updated_at: undefined,
    };

    setEditingLocation(duplicatedLocation);
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



  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading locations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Activity Locations</h3>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
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
          </AlertDescription>
        </Alert>
      )}


      {/* Percentage Summary Info */}

      {/* Locations Grid */}
      {locations.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No locations added</h4>
          <p className="text-gray-600 mb-4">
            Add locations to specify where your activity takes place or where beneficiaries are located.
          </p>
          {canEdit && (
            <Button onClick={handleAddLocation} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Location
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        onDelete={handleDeleteLocation}
        activityId={activityId || 'new'}
        location={editingLocation}
        existingLocations={locations}
      />

    </div>
  );
}

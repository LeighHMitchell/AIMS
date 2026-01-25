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
  Info,
  LayoutGrid,
  Table as TableIcon,
  MoreVertical,
  PencilLine,
  Trash2,
  Copy
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { countries } from '@/data/countries';
import { Menu } from 'bloom-menu';

interface SectorData {
  code: string;
  name: string;
  categoryCode?: string;
  categoryName?: string;
  level?: string;
  percentage: number;
}

interface ActivityData {
  id: string;
  title: string;
  status?: string;
  organization_name?: string;
  sectors?: SectorData[];
  totalBudget?: number;
  totalPlannedDisbursement?: number;
  totalCommitments?: number;
  totalDisbursed?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  banner?: string;
  icon?: string;
}

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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [activityData, setActivityData] = useState<ActivityData | undefined>();

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
        // Filter out coverage-type locations - they belong to Subnational Allocation, not Activity Sites
        const siteLocations = (data.locations || []).filter(
          (loc: any) => loc.location_type !== 'coverage'
        );
        setLocations(siteLocations);
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

  // Load activity data for the map popup display
  const loadActivityData = useCallback(async () => {
    if (!activityId || activityId === 'new') {
      setActivityData(undefined);
      return;
    }

    try {
      const response = await fetch(`/api/activities/${activityId}`);
      if (!response.ok) {
        console.error('Failed to load activity data for map');
        return;
      }

      const data = await response.json();
      
      if (data.success && data.activity) {
        const activity = data.activity;
        setActivityData({
          id: activity.id,
          title: activity.title || activityTitle || 'Untitled Activity',
          status: activity.activity_status,
          organization_name: activity.reporting_org_name || activity.organization_name,
          sectors: activity.sectors?.map((s: any) => ({
            code: s.code,
            name: s.name,
            categoryCode: s.category_code,
            categoryName: s.category_name,
            level: s.level,
            percentage: s.percentage || 100,
          })),
          totalBudget: activity.total_budget_usd || activity.total_budget,
          totalPlannedDisbursement: activity.total_planned_disbursement_usd || activity.total_planned_disbursement,
          totalCommitments: activity.total_commitments_usd || activity.total_commitments,
          totalDisbursed: activity.total_disbursed_usd || activity.total_disbursed,
          plannedStartDate: activity.planned_start_date,
          plannedEndDate: activity.planned_end_date,
          actualStartDate: activity.actual_start_date,
          actualEndDate: activity.actual_end_date,
          banner: activity.banner,
          icon: activity.icon,
        });
      }
    } catch (err) {
      console.error('Error loading activity data:', err);
    }
  }, [activityId, activityTitle]);

  // Load activity data on mount and when activityId changes
  useEffect(() => {
    loadActivityData();
  }, [loadActivityData]);

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
      {/* Activity Locations Map */}
      <ActivityLocationsHeatmap 
        locations={locations}
        title="Activity Locations Map"
        activityTitle={activityTitle}
        activity={activityData}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Activity Locations</h3>
          {locations.length > 0 && (
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="h-7 px-2"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-7 px-2"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
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



      {/* Locations Display */}
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
      ) : viewMode === 'cards' ? (
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
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Activity Description</TableHead>
                {canEdit && <TableHead className="w-[60px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => {
                const getCountryName = (code: string | undefined) => {
                  if (!code) return '';
                  const country = countries.find(c => c.code.toUpperCase() === code.toUpperCase());
                  return country?.name || code;
                };

                const formatAddress = () => {
                  const parts = [];
                  if (location.township_name) parts.push(location.township_name);
                  if (location.city) parts.push(location.city);
                  if (location.state_region_name) parts.push(location.state_region_name);
                  if (location.country_code) parts.push(getCountryName(location.country_code));
                  return parts.join(', ') || 'N/A';
                };

                return (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      {location.location_name || 'Unnamed Location'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {location.latitude && location.longitude
                        ? `${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{formatAddress()}</div>
                      {location.location_description && (
                        <div className="text-sm text-muted-foreground whitespace-normal break-words mt-1">
                          {location.location_description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px]">
                      <div className="whitespace-normal break-words">
                        {location.activity_location_description || location.description || '-'}
                      </div>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Menu.Root direction="bottom" anchor="end">
                          <Menu.Container
                            buttonSize={32}
                            menuWidth={160}
                            menuRadius={12}
                            className="bg-white dark:bg-neutral-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10 relative z-[9999]"
                          >
                            <Menu.Trigger>
                              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
                                <MoreVertical className="h-4 w-4" />
                              </div>
                            </Menu.Trigger>
                            <Menu.Content className="p-1.5">
                              <Menu.Item
                                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                                onSelect={() => handleEditLocation(location)}
                              >
                                <PencilLine className="h-4 w-4" />
                                Edit
                              </Menu.Item>
                              <Menu.Item
                                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                                onSelect={() => handleDuplicateLocation(location)}
                              >
                                <Copy className="h-4 w-4" />
                                Duplicate
                              </Menu.Item>
                              <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                              <Menu.Item
                                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors"
                                onSelect={() => location.id && handleDeleteLocation(location.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Menu.Item>
                            </Menu.Content>
                          </Menu.Container>
                        </Menu.Root>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EnhancedSearchableSelect, type EnhancedSelectGroup } from '@/components/ui/enhanced-searchable-select';
import { ChevronDown, ChevronUp, MapPin, Plus, Trash2, AlertCircle } from 'lucide-react';
import {
  LOCATION_REACH_TYPES,
  LOCATION_ID_VOCABULARIES,
  ADMINISTRATIVE_LEVELS,
  LOCATION_EXACTNESS_TYPES,
  LOCATION_CLASS_TYPES,
  FEATURE_DESIGNATION_TYPES,
  AdvancedLocationData
} from '@/data/iati-location-types';


const LOCATION_REACH_GROUPS: EnhancedSelectGroup[] = [
  {
    label: 'Location Reach',
    options: LOCATION_REACH_TYPES.map((type) => ({
      code: type.code,
      name: type.name,
      description: type.description
    }))
  }
];

const LOCATION_EXACTNESS_GROUPS: EnhancedSelectGroup[] = [
  {
    label: 'Exactness',
    options: LOCATION_EXACTNESS_TYPES.map((type) => ({
      code: type.code,
      name: type.name,
      description: type.description
    }))
  }
];

const LOCATION_CLASS_GROUPS: EnhancedSelectGroup[] = [
  {
    label: 'Location Class',
    options: LOCATION_CLASS_TYPES.map((type) => ({
      code: type.code,
      name: type.name,
      description: type.description
    }))
  }
];

const LOCATION_ID_VOCABULARY_GROUPS: EnhancedSelectGroup[] = [
  {
    label: 'Vocabularies',
    options: LOCATION_ID_VOCABULARIES.map((vocab) => ({
      code: vocab.code,
      name: vocab.name,
      description: vocab.description
    }))
  }
];

const ADMINISTRATIVE_LEVEL_GROUPS: EnhancedSelectGroup[] = [
  {
    label: 'Administrative Levels',
    options: ADMINISTRATIVE_LEVELS.map((level) => ({
      code: level.code,
      name: level.name,
      description: level.description
    }))
  }
];

const FEATURE_DESIGNATION_GROUPS: EnhancedSelectGroup[] = Object.entries(
  FEATURE_DESIGNATION_TYPES.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }

    acc[item.category].push({
      code: item.code,
      name: item.name
    });

    return acc;
  }, {} as Record<string, { code: string; name: string }[]>)
).map(([category, options]) => ({
  label: category,
  options
}));

const LOCATION_SELECT_SETTINGS = {
  searchPlaceholder: 'Search options',
  emptyStateMessage: 'No options found.',
  emptyStateSubMessage: 'Try adjusting your search'
};


interface AdvancedLocationFieldsProps {
  locations: AdvancedLocationData[];
  onLocationsChange: (locations: AdvancedLocationData[]) => void;
  canEdit?: boolean;
  activityId?: string;
}

export default function AdvancedLocationFields({
  locations = [],
  onLocationsChange,
  canEdit = true,
  activityId
}: AdvancedLocationFieldsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localLocations, setLocalLocations] = useState<AdvancedLocationData[]>(locations);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update local state when props change
  useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

  // Add new location
  const addLocation = () => {
    const newLocation: AdvancedLocationData = {
      id: `location-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      locationReach: '1', // Default to "activity happens at this location"
      exactness: '1', // Default to "exact"
      locationClass: '4', // Default to "site"
      percentage: 0
    };
    
    const updatedLocations = [...localLocations, newLocation];
    setLocalLocations(updatedLocations);
    onLocationsChange(updatedLocations);
  };

  // Update location
  const updateLocation = (id: string, updates: Partial<AdvancedLocationData>) => {
    const updatedLocations = localLocations.map(loc => 
      loc.id === id ? { ...loc, ...updates } : loc
    );
    setLocalLocations(updatedLocations);
    onLocationsChange(updatedLocations);
    
    // Clear error for this location
    if (errors[id]) {
      const newErrors = { ...errors };
      delete newErrors[id];
      setErrors(newErrors);
    }
  };

  // Remove location
  const removeLocation = (id: string) => {
    const updatedLocations = localLocations.filter(loc => loc.id !== id);
    setLocalLocations(updatedLocations);
    onLocationsChange(updatedLocations);
    
    // Clear error for this location
    if (errors[id]) {
      const newErrors = { ...errors };
      delete newErrors[id];
      setErrors(newErrors);
    }
  };

  // Validate location
  const validateLocation = (location: AdvancedLocationData): string | null => {
    // Must have either coordinates or administrative code
    const hasCoordinates = location.coordinates?.latitude && location.coordinates?.longitude;
    const hasAdminCode = location.administrative?.code;
    
    if (!hasCoordinates && !hasAdminCode) {
      return 'Location must have either coordinates or administrative code';
    }
    
    return null;
  };

  // Validate all locations
  const validateAllLocations = () => {
    const newErrors: Record<string, string> = {};
    
    localLocations.forEach(location => {
      const error = validateLocation(location);
      if (error) {
        newErrors[location.id] = error;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Advanced IATI Location Fields
              </CardTitle>
              <div className="flex items-center gap-2">
                {localLocations.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {localLocations.length} location{localLocations.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Add Location Button */}
            {canEdit && (
              <div className="flex justify-end">
                <Button onClick={addLocation} size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Location
                </Button>
              </div>
            )}

            {/* Locations List */}
            {localLocations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No locations added yet</p>
                <p className="text-sm">Click "Add Location" to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {localLocations.map((location, index) => (
                  <Card key={location.id} className="border border-gray-200">
                    <CardContent className="p-4 space-y-4">
                      {/* Location Header */}
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm text-gray-700">
                          Location {index + 1}
                        </h4>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLocation(location.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Error Display */}
                      {errors[location.id] && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {errors[location.id]}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Location Reach */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`location-reach-${location.id}`} className="flex items-center gap-2">
                            Location Reach
                            <HelpTextTooltip content="Clarifies whether the activity happens at this location or if beneficiaries live here" />
                          </Label>
                          <EnhancedSearchableSelect
                            groups={LOCATION_REACH_GROUPS}
                            value={location.locationReach || ''}
                            onValueChange={(value) => updateLocation(location.id, { locationReach: value })}
                            disabled={!canEdit}
                            placeholder="Select reach type"
                            searchPlaceholder={LOCATION_SELECT_SETTINGS.searchPlaceholder}
                            emptyStateMessage={LOCATION_SELECT_SETTINGS.emptyStateMessage}
                            emptyStateSubMessage={LOCATION_SELECT_SETTINGS.emptyStateSubMessage}
                          />
                        </div>

                        {/* Exactness */}
                        <div className="space-y-2">
                          <Label htmlFor={`exactness-${location.id}`}>Exactness</Label>
                          <EnhancedSearchableSelect
                            groups={LOCATION_EXACTNESS_GROUPS}
                            value={location.exactness || ''}
                            onValueChange={(value) => updateLocation(location.id, { exactness: value })}
                            disabled={!canEdit}
                            placeholder="Select exactness"
                            searchPlaceholder={LOCATION_SELECT_SETTINGS.searchPlaceholder}
                            emptyStateMessage={LOCATION_SELECT_SETTINGS.emptyStateMessage}
                            emptyStateSubMessage={LOCATION_SELECT_SETTINGS.emptyStateSubMessage}
                          />
                        </div>
                      </div>

                      {/* Location ID */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Location ID</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`location-id-vocab-${location.id}`}>Vocabulary</Label>
                            <EnhancedSearchableSelect
                              groups={LOCATION_ID_VOCABULARY_GROUPS}
                              value={location.locationId?.vocabulary || ''}
                              onValueChange={(value) => updateLocation(location.id, { 
                                locationId: { 
                                  ...location.locationId, 
                                  vocabulary: value 
                                } 
                              })}
                              disabled={!canEdit}
                              placeholder="Select vocabulary"
                              searchPlaceholder={LOCATION_SELECT_SETTINGS.searchPlaceholder}
                              emptyStateMessage={LOCATION_SELECT_SETTINGS.emptyStateMessage}
                              emptyStateSubMessage={LOCATION_SELECT_SETTINGS.emptyStateSubMessage}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`location-id-code-${location.id}`}>Code</Label>
                            <Input
                              id={`location-id-code-${location.id}`}
                              value={location.locationId?.code || ''}
                              onChange={(e) => updateLocation(location.id, { 
                                locationId: { 
                                  ...location.locationId, 
                                  code: e.target.value 
                                } 
                              })}
                              placeholder="Enter location code"
                              disabled={!canEdit}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Administrative Divisions */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Administrative Divisions</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`admin-vocab-${location.id}`}>Vocabulary</Label>
                            <EnhancedSearchableSelect
                              groups={LOCATION_ID_VOCABULARY_GROUPS}
                              value={location.administrative?.vocabulary || ''}
                              onValueChange={(value) => updateLocation(location.id, { 
                                administrative: { 
                                  ...location.administrative, 
                                  vocabulary: value 
                                } 
                              })}
                              disabled={!canEdit}
                              placeholder="Select vocabulary"
                              searchPlaceholder={LOCATION_SELECT_SETTINGS.searchPlaceholder}
                              emptyStateMessage={LOCATION_SELECT_SETTINGS.emptyStateMessage}
                              emptyStateSubMessage={LOCATION_SELECT_SETTINGS.emptyStateSubMessage}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`admin-level-${location.id}`}>Level</Label>
                            <EnhancedSearchableSelect
                              groups={ADMINISTRATIVE_LEVEL_GROUPS}
                              value={location.administrative?.level || ''}
                              onValueChange={(value) => updateLocation(location.id, { 
                                administrative: { 
                                  ...location.administrative, 
                                  level: value 
                                } 
                              })}
                              disabled={!canEdit}
                              placeholder="Select level"
                              searchPlaceholder={LOCATION_SELECT_SETTINGS.searchPlaceholder}
                              emptyStateMessage={LOCATION_SELECT_SETTINGS.emptyStateMessage}
                              emptyStateSubMessage={LOCATION_SELECT_SETTINGS.emptyStateSubMessage}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`admin-code-${location.id}`}>Code</Label>
                            <Input
                              id={`admin-code-${location.id}`}
                              value={location.administrative?.code || ''}
                              onChange={(e) => updateLocation(location.id, { 
                                administrative: { 
                                  ...location.administrative, 
                                  code: e.target.value 
                                } 
                              })}
                              placeholder="Enter administrative code"
                              disabled={!canEdit}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Location Class and Feature Designation */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`location-class-${location.id}`}>Location Class</Label>
                          <EnhancedSearchableSelect
                            groups={LOCATION_CLASS_GROUPS}
                            value={location.locationClass || ''}
                            onValueChange={(value) => updateLocation(location.id, { locationClass: value })}
                            disabled={!canEdit}
                            placeholder="Select class"
                            searchPlaceholder={LOCATION_SELECT_SETTINGS.searchPlaceholder}
                            emptyStateMessage={LOCATION_SELECT_SETTINGS.emptyStateMessage}
                            emptyStateSubMessage={LOCATION_SELECT_SETTINGS.emptyStateSubMessage}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`feature-designation-${location.id}`}>Feature Designation</Label>
                          <EnhancedSearchableSelect
                            groups={FEATURE_DESIGNATION_GROUPS}
                            value={location.featureDesignation || ''}
                            onValueChange={(value) => updateLocation(location.id, { featureDesignation: value })}
                            disabled={!canEdit}
                            placeholder="Select designation"
                            searchPlaceholder={LOCATION_SELECT_SETTINGS.searchPlaceholder}
                            emptyStateMessage={LOCATION_SELECT_SETTINGS.emptyStateMessage}
                            emptyStateSubMessage={LOCATION_SELECT_SETTINGS.emptyStateSubMessage}
                          />
                        </div>
                      </div>

                      {/* Coordinates */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Coordinates (Optional)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`latitude-${location.id}`}>Latitude</Label>
                            <Input
                              id={`latitude-${location.id}`}
                              type="number"
                              step="any"
                              value={location.coordinates?.latitude || ''}
                              onChange={(e) => updateLocation(location.id, { 
                                coordinates: { 
                                  ...location.coordinates, 
                                  latitude: parseFloat(e.target.value) || 0 
                                } 
                              })}
                              placeholder="Enter latitude"
                              disabled={!canEdit}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`longitude-${location.id}`}>Longitude</Label>
                            <Input
                              id={`longitude-${location.id}`}
                              type="number"
                              step="any"
                              value={location.coordinates?.longitude || ''}
                              onChange={(e) => updateLocation(location.id, { 
                                coordinates: { 
                                  ...location.coordinates, 
                                  longitude: parseFloat(e.target.value) || 0 
                                } 
                              })}
                              placeholder="Enter longitude"
                              disabled={!canEdit}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Activity Description */}
                      <div className="space-y-2">
                        <Label htmlFor={`activity-description-${location.id}`}>Activity Description</Label>
                        <Textarea
                          id={`activity-description-${location.id}`}
                          value={location.activityDescription || ''}
                          onChange={(e) => updateLocation(location.id, { activityDescription: e.target.value })}
                          placeholder="Describe what happens at this location"
                          rows={3}
                          disabled={!canEdit}
                        />
                      </div>

                      {/* Percentage Allocation */}
                      <div className="space-y-2">
                        <Label htmlFor={`percentage-${location.id}`}>Percentage Allocation (Optional)</Label>
                        <Input
                          id={`percentage-${location.id}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={location.percentage || ''}
                          onChange={(e) => updateLocation(location.id, { percentage: parseFloat(e.target.value) || 0 })}
                          placeholder="Enter percentage (0-100)"
                          disabled={!canEdit}
                        />
                      </div>

                      {/* Location Reference */}
                      <div className="space-y-2">
                        <Label htmlFor={`location-ref-${location.id}`} className="flex items-center gap-2">
                          Location Reference
                          <HelpTextTooltip content="IATI location reference identifier (e.g., AF-KAN, KH-PNH)" />
                        </Label>
                        <Input
                          id={`location-ref-${location.id}`}
                          value={location.locationRef || ''}
                          onChange={(e) => updateLocation(location.id, { locationRef: e.target.value })}
                          placeholder="e.g., AF-KAN, KH-PNH"
                          disabled={!canEdit}
                        />
                      </div>

                      {/* Spatial Reference System */}
                      <div className="space-y-2">
                        <Label htmlFor={`srs-name-${location.id}`} className="flex items-center gap-2">
                          Spatial Reference System
                          <HelpTextTooltip content="The coordinate reference system used for the coordinates (default: WGS84)" />
                        </Label>
                        <Input
                          id={`srs-name-${location.id}`}
                          value={location.srsName || 'http://www.opengis.net/def/crs/EPSG/0/4326'}
                          onChange={(e) => updateLocation(location.id, { srsName: e.target.value })}
                          placeholder="http://www.opengis.net/def/crs/EPSG/0/4326"
                          disabled={!canEdit}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Validation Summary */}
            {Object.keys(errors).length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please fix the validation errors above before saving.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}


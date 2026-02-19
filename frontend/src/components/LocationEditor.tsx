'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Trash2,
  MapPin,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { EnhancedSearchableSelect } from '@/components/ui/enhanced-searchable-select';
import { IATI_COUNTRIES } from '@/data/iati-countries';

// IATI 2.03 compliant location interface
export interface IATILocation {
  id: string;
  name?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  description?: string;
  locationReach?: string;
  exactness?: string;
  locationClass?: string;
  featureDesignation?: string;
  locationId?: {
    vocabulary: string;
    code: string;
  };
  administrative?: Array<{
    vocabulary: string;
    level: string;
    code: string;
  }>;
  activityDescription?: string;
  percentage?: number;
  searchQuery?: string;
}

interface LocationEditorProps {
  locations?: IATILocation[];
  onLocationsChange: (locations: IATILocation[]) => void;
  activityId?: string;
  canEdit?: boolean;
}

export default function LocationEditor({
  locations = [],
  onLocationsChange,
  activityId,
  canEdit = true
}: LocationEditorProps) {
  const [localLocations, setLocalLocations] = useState<IATILocation[]>(() => locations);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update local state when locations prop changes
  useEffect(() => {
    if (JSON.stringify(locations) !== JSON.stringify(localLocations)) {
      setLocalLocations(locations);
    }
  }, [locations]);

  // Add new location
  const addLocation = () => {
    const newLocation: IATILocation = {
      id: `location-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      country: '',
      locationReach: '1', // Default to "Activity happens here"
      exactness: '1', // Default to "Exact"
      locationClass: '4', // Default to "Site"
      percentage: 0
    };

    const updatedLocations = [...localLocations, newLocation];
    setLocalLocations(updatedLocations);
    onLocationsChange(updatedLocations);
    toast.success('New location added');
  };

  // Update location
  const updateLocation = (id: string, updates: Partial<IATILocation>) => {
    const updatedLocations = localLocations.map(loc =>
      loc.id === id ? { ...loc, ...updates } : loc
    );
    setLocalLocations(updatedLocations);
    onLocationsChange(updatedLocations);

    // Clear error for this location if it exists
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
    
    toast.success('Location removed');
  };

  // Validate location
  const validateLocation = (location: IATILocation): string | null => {
    if (!location.name || location.name.trim().length === 0) {
      return 'Location name is required';
    }
    if (!location.country) {
      return 'Country is required';
    }
    if (location.percentage && (location.percentage < 0 || location.percentage > 100)) {
      return 'Percentage must be between 0 and 100';
    }
    return null;
  };

  // Validate all locations
  const validateAllLocations = (): boolean => {
    let hasErrors = false;
    const newErrors: Record<string, string> = {};
    
    localLocations.forEach(location => {
      const error = validateLocation(location);
      if (error) {
        newErrors[location.id] = error;
        hasErrors = true;
      }
    });
    
    setErrors(newErrors);
    return !hasErrors;
  };

  return (
    <div className="space-y-6">
      {/* Validation Summary */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-1">Please fix the following errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {Object.entries(errors).map(([locationId, error]) => {
                const location = localLocations.find(l => l.id === locationId);
                return (
                  <li key={locationId} className="text-sm">
                    <strong>{location?.name || 'Location'}:</strong> {error}
                  </li>
                );
              })}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Activity Locations</h3>
          <p className="text-sm text-gray-600">
            Add specific locations where this activity takes place
          </p>
        </div>
        <div className="flex items-center gap-2">
          {localLocations.length > 0 && (
            <>
              <span className="text-sm text-gray-600">
                {localLocations.length} location{localLocations.length !== 1 ? 's' : ''}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to remove all locations?')) {
                    setLocalLocations([]);
                    onLocationsChange([]);
                    setErrors({});
                    toast.success('All locations removed');
                  }
                }}
                disabled={!canEdit}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600 active:text-red-600 focus-visible:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-1 text-red-500" />
                Clear All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Add Location Button (when empty) */}
      {localLocations.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">No locations added yet</p>
          <Button onClick={addLocation} disabled={!canEdit}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      )}

      {/* Location Cards */}
      {localLocations.map((location, index) => (
        <Card key={location.id} className="border border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">
                Location {index + 1}
              </CardTitle>
              <div className="flex items-center gap-2">
                {errors[location.id] && (
                  <AlertCircle className="h-4 w-4 text-red-500" title={errors[location.id]} />
                )}
                {!errors[location.id] && validateLocation(location) === null && (
                  <CheckCircle className="h-4 w-4 text-green-500" title="Valid location" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLocation(location.id)}
                  disabled={!canEdit}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location Name */}
              <div>
                <Label htmlFor={`name-${location.id}`}>
                  Location Name <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
                </Label>
                <Input
                  id={`name-${location.id}`}
                  value={location.name || ''}
                  onChange={(e) => updateLocation(location.id, { name: e.target.value })}
                  placeholder="e.g., Project Office, Field Site"
                  disabled={!canEdit}
                />
              </div>

              {/* Country */}
              <div>
                <Label htmlFor={`country-${location.id}`}>
                  Country <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
                </Label>
                <EnhancedSearchableSelect
                  value={location.country || ''}
                  onValueChange={(value) => updateLocation(location.id, { country: value })}
                  placeholder="Select country"
                  searchPlaceholder="Search countries..."
                  disabled={!canEdit}
                  dropdownId={`country-${location.id}`}
                  groups={[
                    {
                      label: 'Countries',
                      options: IATI_COUNTRIES.map(country => ({
                        code: country.code,
                        name: country.name,
                        description: country.code
                      }))
                    }
                  ]}
                />
              </div>

              {/* Address Line 1 */}
              <div>
                <Label htmlFor={`address1-${location.id}`}>Address Line 1</Label>
                <Input
                  id={`address1-${location.id}`}
                  value={location.addressLine1 || ''}
                  onChange={(e) => updateLocation(location.id, { addressLine1: e.target.value })}
                  placeholder="Street address"
                  disabled={!canEdit}
                />
              </div>

              {/* City */}
              <div>
                <Label htmlFor={`city-${location.id}`}>City</Label>
                <Input
                  id={`city-${location.id}`}
                  value={location.city || ''}
                  onChange={(e) => updateLocation(location.id, { city: e.target.value })}
                  placeholder="City name"
                  disabled={!canEdit}
                />
              </div>

              {/* State/Province */}
              <div>
                <Label htmlFor={`state-${location.id}`}>State/Province</Label>
                <Input
                  id={`state-${location.id}`}
                  value={location.stateProvince || ''}
                  onChange={(e) => updateLocation(location.id, { stateProvince: e.target.value })}
                  placeholder="State or province"
                  disabled={!canEdit}
                />
              </div>

              {/* Postal Code */}
              <div>
                <Label htmlFor={`postal-${location.id}`}>Postal Code</Label>
                <Input
                  id={`postal-${location.id}`}
                  value={location.postalCode || ''}
                  onChange={(e) => updateLocation(location.id, { postalCode: e.target.value })}
                  placeholder="Postal code"
                  disabled={!canEdit}
                />
              </div>

              {/* Latitude */}
              <div>
                <Label htmlFor={`lat-${location.id}`}>Latitude</Label>
                <Input
                  id={`lat-${location.id}`}
                  type="number"
                  step="any"
                  value={location.latitude || ''}
                  onChange={(e) => updateLocation(location.id, { 
                    latitude: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="e.g., 16.8661"
                  disabled={!canEdit}
                />
              </div>

              {/* Longitude */}
              <div>
                <Label htmlFor={`lng-${location.id}`}>Longitude</Label>
                <Input
                  id={`lng-${location.id}`}
                  type="number"
                  step="any"
                  value={location.longitude || ''}
                  onChange={(e) => updateLocation(location.id, { 
                    longitude: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="e.g., 96.1951"
                  disabled={!canEdit}
                />
              </div>

              {/* Percentage */}
              <div>
                <Label htmlFor={`percentage-${location.id}`}>Percentage (%)</Label>
                <Input
                  id={`percentage-${location.id}`}
                  type="number"
                  min="0"
                  max="100"
                  value={location.percentage || ''}
                  onChange={(e) => updateLocation(location.id, { 
                    percentage: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="0-100"
                  disabled={!canEdit}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor={`description-${location.id}`}>Location Description</Label>
              <Textarea
                id={`description-${location.id}`}
                value={location.description || ''}
                onChange={(e) => updateLocation(location.id, { description: e.target.value })}
                placeholder="Describe this location and its relevance to the activity"
                disabled={!canEdit}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add Another Location Button */}
      {localLocations.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={addLocation}
            disabled={!canEdit}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Location
          </Button>
        </div>
      )}

      {/* Summary Card */}
      {localLocations.length > 0 && (
        <Card className="mt-6 bg-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Saved Locations Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {localLocations.map((location, index) => {
                const isValid = validateLocation(location) === null;
                const countryName = IATI_COUNTRIES.find(c => c.code === location.country)?.name;
                
                return (
                  <div 
                    key={location.id} 
                    className="flex items-start justify-between p-3 bg-white rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {index + 1}. {location.name || 'Unnamed Location'}
                        </span>
                        {isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      {(location.city || location.stateProvince || location.postalCode || countryName) && (
                        <div className="text-sm text-gray-600 mt-1">
                          {[
                            location.city,
                            location.addressLine1,
                            location.stateProvince,
                            location.postalCode,
                            countryName
                          ].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {location.percentage !== undefined && location.percentage !== null && (
                        <div className="text-sm text-gray-500 mt-1">
                          {location.percentage}% allocation
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Validation Button */}
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const isValid = validateAllLocations();
                  if (isValid) {
                    toast.success('All locations are valid');
                  } else {
                    toast.error('Please fix validation errors');
                  }
                }}
                className="w-full"
              >
                Validate All Locations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
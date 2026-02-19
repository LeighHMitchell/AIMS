'use client';

import React, { useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StateRegionSelect } from '@/components/forms/StateRegionSelect';
import { TownshipSelect } from '@/components/forms/TownshipSelect';
import { LocationCategorySelect } from '@/components/forms/LocationCategorySelect';
import myanmarData from '@/data/myanmar-locations.json';

interface Location {
  id?: string;
  name?: string;
  category?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  stateRegions?: string[];
  township?: string;
}

interface MyanmarLocationEditorProps {
  activityScope: string | number;
  locations: Location;
  onChange: (locations: Location) => void;
}

export default function MyanmarLocationEditor({
  activityScope,
  locations = {},
  onChange,
}: MyanmarLocationEditorProps) {
  const [searchAddress, setSearchAddress] = useState('');
  
  const scope = typeof activityScope === 'string' ? parseInt(activityScope) : activityScope;

  const updateLocation = (field: keyof Location, value: any) => {
    onChange({
      ...locations,
      [field]: value,
    });
  };

  const renderScopeSpecificFields = () => {
    switch (scope) {
      case 4: // National
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="country" className="text-sm font-medium">
                Country
              </Label>
              <Input
                id="country"
                value="Myanmar"
                disabled
                className="h-10 bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                National scope automatically applies to Myanmar
              </p>
            </div>
          </div>
        );

      case 5: // Multi 1st-level (Multiple States/Regions)
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="states-regions" className="text-sm font-medium">
                States/Regions *
              </Label>
              <StateRegionSelect
                id="states-regions"
                value={locations.stateRegions || []}
                onValueChange={(value) => updateLocation('stateRegions', value)}
                placeholder="Select multiple states/regions"
                multiple={true}
              />
              <p className="text-xs text-gray-500 mt-1">
                Select multiple states or regions for multi-subnational activities
              </p>
            </div>
          </div>
        );

      case 6: // Single 1st-level (Single State/Region)
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="state-region" className="text-sm font-medium">
                State/Region *
              </Label>
              <StateRegionSelect
                id="state-region"
                value={Array.isArray(locations.stateRegions) ? locations.stateRegions[0] : locations.stateRegions}
                onValueChange={(value) => updateLocation('stateRegions', [value as string])}
                placeholder="Select state/region"
                multiple={false}
              />
              <p className="text-xs text-gray-500 mt-1">
                Select a single state or region
              </p>
            </div>
          </div>
        );

      case 7: // Single 2nd-level (Township)
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="township" className="text-sm font-medium">
                Township *
              </Label>
              <TownshipSelect
                id="township"
                value={locations.township}
                onValueChange={(value) => updateLocation('township', value)}
                placeholder="Select township"
              />
              <p className="text-xs text-gray-500 mt-1">
                Select a specific township within Myanmar
              </p>
            </div>
          </div>
        );

      case 8: // Single Location
        return (
          <div className="space-y-6">
            {/* Location Name and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location-name" className="text-sm font-medium">
                  Location Name *
                </Label>
                <Input
                  id="location-name"
                  value={locations.name || ''}
                  onChange={(e) => updateLocation('name', e.target.value)}
                  placeholder="Enter location name"
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="location-category" className="text-sm font-medium">
                  Location Category *
                </Label>
                <LocationCategorySelect
                  id="location-category"
                  value={locations.category}
                  onValueChange={(value) => updateLocation('category', value)}
                  placeholder="Select category"
                />
              </div>
            </div>

            {/* Address Search */}
            <div>
              <Label htmlFor="address-search" className="text-sm font-medium">
                Address Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="address-search"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  placeholder="Search for address or place..."
                  className="h-10 pl-9"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Search and select location or drop a pin on the map below
              </p>
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude" className="text-sm font-medium">
                  Latitude
                </Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={locations.latitude || ''}
                  onChange={(e) => updateLocation('latitude', parseFloat(e.target.value) || undefined)}
                  placeholder="e.g., 16.8660"
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="longitude" className="text-sm font-medium">
                  Longitude
                </Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={locations.longitude || ''}
                  onChange={(e) => updateLocation('longitude', parseFloat(e.target.value) || undefined)}
                  placeholder="e.g., 96.1951"
                  className="h-10"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="address" className="text-sm font-medium">
                Address
              </Label>
              <Input
                id="address"
                value={locations.address || ''}
                onChange={(e) => updateLocation('address', e.target.value)}
                placeholder="Full address"
                className="h-10"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={locations.description || ''}
                onChange={(e) => updateLocation('description', e.target.value)}
                placeholder="Additional location details..."
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="py-8 text-center text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Select Activity Scope (4-8) to configure location details</p>
          </div>
        );
    }
  };

  const renderMap = () => {
    if (!scope || scope < 4 || scope > 8) {
      return null;
    }

    const getMapContent = () => {
      switch (scope) {
        case 4: // National
          return (
            <div className="h-96 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border border-green-200 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path d="M20,30 Q30,20 40,25 Q50,15 60,20 Q70,10 80,25 Q85,35 80,45 Q75,55 70,65 Q60,75 50,70 Q40,80 30,75 Q20,65 15,55 Q10,45 15,35 Z" 
                        fill="currentColor" className="text-green-600" />
                </svg>
              </div>
              <div className="text-center relative z-10">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-700">Myanmar National Coverage</p>
                <p className="text-xs text-gray-500 mt-1">Activity covers the entire country</p>
              </div>
            </div>
          );

        case 5: // Multi states/regions
        case 6: // Single state/region
          const selectedStates = locations.stateRegions || [];
          return (
            <div className="h-96 bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="h-full flex flex-col">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    {scope === 5 ? 'Selected States/Regions' : 'Selected State/Region'}
                  </h4>
                  {selectedStates.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedStates.map(stateId => {
                        const state = myanmarData.states.find(s => s.id === stateId);
                        return state ? (
                          <div key={stateId} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {state.name}
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No states/regions selected</p>
                  )}
                </div>
                <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 rounded border-2 border-dashed border-blue-200 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <p className="text-sm text-gray-600">
                      {scope === 5 ? 'Multi-state/region' : 'Single state/region'} map view
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Administrative boundaries with highlighting
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );

        case 7: // Township
          const selectedTownship = locations.township ? 
            myanmarData.states.flatMap(s => s.townships).find(t => t.id === locations.township) : null;
          return (
            <div className="h-96 bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="h-full flex flex-col">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Township</h4>
                  {selectedTownship ? (
                    <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs inline-block">
                      {selectedTownship.name}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No township selected</p>
                  )}
                </div>
                <div className="flex-1 bg-gradient-to-br from-orange-50 to-yellow-50 rounded border-2 border-dashed border-orange-200 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                    <p className="text-sm text-gray-600">Township boundary view</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Detailed township area highlighting
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );

        case 8: // Single location
          const hasCoordinates = locations.latitude && locations.longitude;
          return (
            <div className="h-96 bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="h-full flex flex-col">
                <div className="mb-4 flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Precise Location</h4>
                    {locations.name && (
                      <p className="text-sm text-gray-600 mb-1">{locations.name}</p>
                    )}
                    {hasCoordinates && (
                      <p className="text-xs text-gray-500">
                        {locations.latitude?.toFixed(6)}, {locations.longitude?.toFixed(6)}
                      </p>
                    )}
                  </div>
                  {locations.category && (
                    <div className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                      {myanmarData.locationCategories.find(c => c.code === locations.category)?.name}
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-gradient-to-br from-purple-50 to-pink-50 rounded border-2 border-dashed border-purple-200 flex items-center justify-center relative">
                  {hasCoordinates && (
                    <div className="absolute top-4 left-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  <div className="text-center">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <p className="text-sm text-gray-600">Interactive map with pin</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Click to drop pin or search address
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Myanmar Map
            {scope && (
              <span className="text-sm font-normal text-gray-500">
                (Scope {scope})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getMapContent()}
          <div className="mt-4 text-xs text-gray-500 text-center">
            <p>🗺️ Interactive map integration available in production</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const getScopeDescription = () => {
    switch (scope) {
      case 4:
        return "National scope covers the entire country of Myanmar";
      case 5:
        return "Multi-subnational scope covers multiple states or regions";
      case 6:
        return "Single subnational scope covers one state or region";
      case 7:
        return "Single township scope covers a specific township";
      case 8:
        return "Single location with precise coordinates";
      default:
        return "Select an activity scope to configure location details";
    }
  };

  return (
    <div className="space-y-6">
      {/* Scope Information */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location Configuration
            {scope >= 4 && scope <= 8 && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (Scope {scope})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            {getScopeDescription()}
          </p>
          
          {renderScopeSpecificFields()}
        </CardContent>
      </Card>

      {/* Map Display */}
      {renderMap()}
    </div>
  );
}
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Search, MapPin, X, Edit2, Save, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Dynamic import for Leaflet to avoid SSR issues
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

// Custom pin icon using SVG
const createPinIcon = (color = '#ef4444') => {
  if (!L || typeof window === 'undefined') {
    return null;
  }
  
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="12" cy="10" r="3" fill="#ffffff"/>
        </svg>
      </div>
    `,
    className: 'custom-pin-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Location types
const locationTypes = [
  { value: 'main_office', label: 'Main Office' },
  { value: 'field_office', label: 'Field Office' },
  { value: 'training_venue', label: 'Training Venue' },
  { value: 'health_centre', label: 'Health Centre' },
  { value: 'school', label: 'School' },
  { value: 'distribution_point', label: 'Distribution Point' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'community_center', label: 'Community Center' },
  { value: 'other', label: 'Other' },
];

// Types
interface SpecificLocation {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address?: string;
  notes?: string;
}

interface LocationSelectorProps {
  locations: SpecificLocation[];
  onLocationsChange: (locations: SpecificLocation[]) => void;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    country?: string;
    state?: string;
    county?: string;
    city?: string;
  };
}

// Map click handler component
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Draggable marker component
function DraggableMarker({ 
  position, 
  onPositionChange 
}: { 
  position: [number, number]; 
  onPositionChange: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const icon = createPinIcon('#ef4444');

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const newPos = marker.getLatLng();
        onPositionChange(newPos.lat, newPos.lng);
      }
    },
  };

  // Don't render marker if icon is not available (SSR)
  if (!icon) {
    return null;
  }

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={icon}
    />
  );
}

// Map center controller
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

// Address search component
function AddressSearch({ onLocationSelect }: { 
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();

  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Myanmar')}&limit=5&addressdetails=1`,
        { 
          headers: { 
            'User-Agent': 'AIMS-Activity-Editor/1.0',
            'Accept': 'application/json'
          } 
        }
      );
      
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      searchLocations(value);
    }, 500);
  };

  const handleResultSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onLocationSelect(lat, lng, result.display_name);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search for address or place in Myanmar..."
          className="h-10 pl-9 pr-8"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSearchResults([]);
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((result) => (
            <button
              key={result.place_id}
              onClick={() => handleResultSelect(result)}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="text-sm font-medium truncate">{result.display_name}</div>
              <div className="text-xs text-gray-500">
                {parseFloat(result.lat).toFixed(4)}, {parseFloat(result.lon).toFixed(4)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LocationSelector({ locations, onLocationsChange }: LocationSelectorProps) {
  // Form state
  const [newLocation, setNewLocation] = useState({
    name: '',
    type: '',
    latitude: 21.9, // Default Myanmar center
    longitude: 95.9,
    address: '',
    notes: '',
  });

  const [mapCenter, setMapCenter] = useState<[number, number]>([21.9, 95.9]);
  const [mapZoom, setMapZoom] = useState(6);
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([21.9, 95.9]);
  const [showMarker, setShowMarker] = useState(false);
  
  // Editing state
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<SpecificLocation>>({});

  // Update marker when coordinates change
  useEffect(() => {
    if (newLocation.latitude && newLocation.longitude) {
      const newPos: [number, number] = [newLocation.latitude, newLocation.longitude];
      setMarkerPosition(newPos);
      setShowMarker(true);
    }
  }, [newLocation.latitude, newLocation.longitude]);

  // Handle map clicks
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng);
    setNewLocation(prev => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      address: address ? address.split(',')[0] : ''
    }));
    setMapCenter([lat, lng]);
    setMapZoom(12);
  }, []);

  // Handle marker drag
  const handleMarkerDrag = useCallback((lat: number, lng: number) => {
    setNewLocation(prev => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6))
    }));
  }, []);

  // Handle search result selection
  const handleLocationSelect = useCallback((lat: number, lng: number, address: string) => {
    setNewLocation(prev => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      address: address.split(',')[0], // Take first part as location name suggestion
    }));
    setMapCenter([lat, lng]);
    setMapZoom(12);
  }, []);

  // Reverse geocoding for pin placement
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { 
          headers: { 
            'User-Agent': 'AIMS-Activity-Editor/1.0',
            'Accept': 'application/json'
          } 
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        return result.display_name || '';
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
    return '';
  };

  // Handle coordinate input changes
  const handleCoordinateChange = (field: 'latitude' | 'longitude', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setNewLocation(prev => ({ ...prev, [field]: numValue }));
      
      // Update map center when both coordinates are valid
      if (field === 'latitude' && newLocation.longitude) {
        setMapCenter([numValue, newLocation.longitude]);
        setMapZoom(12);
      } else if (field === 'longitude' && newLocation.latitude) {
        setMapCenter([newLocation.latitude, numValue]);
        setMapZoom(12);
      }
    }
  };

  // Add location
  const handleAddLocation = () => {
    if (!newLocation.name || !newLocation.type) {
      return;
    }

    const location: SpecificLocation = {
      id: crypto.randomUUID(),
      name: newLocation.name,
      type: newLocation.type,
      latitude: newLocation.latitude,
      longitude: newLocation.longitude,
      address: newLocation.address,
      notes: newLocation.notes,
    };

    onLocationsChange([...locations, location]);

    // Reset form
    setNewLocation({
      name: '',
      type: '',
      latitude: 21.9,
      longitude: 95.9,
      address: '',
      notes: '',
    });
    setMapCenter([21.9, 95.9]);
    setMapZoom(6);
    setShowMarker(false);
  };

  // Remove location
  const removeLocation = (id: string) => {
    onLocationsChange(locations.filter(loc => loc.id !== id));
  };

  // Start editing location
  const startEditing = (location: SpecificLocation) => {
    setEditingLocationId(location.id);
    setEditFormData({ ...location });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingLocationId(null);
    setEditFormData({});
  };

  // Save edited location
  const saveEditedLocation = () => {
    if (!editingLocationId || !editFormData.name || !editFormData.type) return;
    
    const updatedLocations = locations.map(loc => 
      loc.id === editingLocationId 
        ? { ...loc, ...editFormData } as SpecificLocation
        : loc
    );
    
    onLocationsChange(updatedLocations);
    setEditingLocationId(null);
    setEditFormData({});
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Add a Specific Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address Search */}
        <div>
          <Label className="text-sm font-medium">Search Address</Label>
          <AddressSearch onLocationSelect={handleLocationSelect} />
          <p className="text-xs text-gray-500 mt-1">
            Search will auto-fill coordinates and place name
          </p>
        </div>

        {/* Interactive Map */}
        <div>
          <Label className="text-sm font-medium">Location on Map</Label>
          <div className="h-80 w-full border rounded-md overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapController center={mapCenter} zoom={mapZoom} />
              <MapClickHandler onMapClick={handleMapClick} />
              {showMarker && (
                <DraggableMarker
                  position={markerPosition}
                  onPositionChange={handleMarkerDrag}
                />
              )}
            </MapContainer>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Click on the map to set location or drag the marker to adjust
          </p>
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitude" className="text-sm font-medium">
              Latitude
            </Label>
            <Input
              id="latitude"
              type="number"
              step="0.000001"
              value={newLocation.latitude}
              onChange={(e) => handleCoordinateChange('latitude', e.target.value)}
              placeholder="e.g., 21.9162"
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
              value={newLocation.longitude}
              onChange={(e) => handleCoordinateChange('longitude', e.target.value)}
              placeholder="e.g., 95.9560"
              className="h-10"
            />
          </div>
        </div>

        {/* Location Details */}
        <div>
          <Label htmlFor="location-name" className="text-sm font-medium">
            Location Name *
          </Label>
          <Input
            id="location-name"
            value={newLocation.name}
            onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter location name"
            className="h-10"
          />
        </div>

        <div>
          <Label htmlFor="location-type" className="text-sm font-medium">
            Location Type *
          </Label>
          <Select
            value={newLocation.type}
            onValueChange={(value) => setNewLocation(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select location type" />
            </SelectTrigger>
            <SelectContent>
              {locationTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="notes" className="text-sm font-medium">
            Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            value={newLocation.notes}
            onChange={(e) => setNewLocation(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional location details..."
            rows={3}
          />
        </div>

        <Button 
          onClick={handleAddLocation}
          disabled={!newLocation.name || !newLocation.type}
          className="w-full"
        >
          <MapPin className="h-4 w-4 mr-2" />
          Add Location
        </Button>

        {/* Added Locations List */}
        {locations.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-medium">Added Locations ({locations.length})</h4>
            {locations.map((location) => (
              <div key={location.id} className="p-3 border rounded-lg bg-gray-50">
                {editingLocationId === location.id ? (
                  // Editing mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={editFormData.name || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Location name"
                        className="h-8 text-sm"
                      />
                      <Select
                        value={editFormData.type || ''}
                        onValueChange={(value) => setEditFormData(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {locationTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {editFormData.notes !== undefined && (
                      <Textarea
                        value={editFormData.notes}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Notes..."
                        rows={2}
                        className="text-sm"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={saveEditedLocation}
                        className="h-7 px-2"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEditing}
                        className="h-7 px-2"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Display mode
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{location.name}</h5>
                      <p className="text-xs text-gray-500">
                        {locationTypes.find(t => t.value === location.type)?.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                      {location.address && (
                        <p className="text-xs text-gray-600 mt-1">{location.address}</p>
                      )}
                      {location.notes && (
                        <p className="text-xs text-gray-600 mt-1">{location.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(location)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLocation(location.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, Map, Layers, Edit, Trash2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// Import gesture handling plugin and CSS
// Note: Gesture handling CSS is not needed - the plugin works without it

// Dynamic import for map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('react-leaflet').then((mod) => mod.Tooltip),
  { ssr: false }
);
const Polygon = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polygon),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
);

// Import Leaflet and fix SSR issues
let L: any;
let useMapEventsHook: any;
let useMap: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  const ReactLeaflet = require('react-leaflet');
  useMapEventsHook = ReactLeaflet.useMapEvents;
  useMap = ReactLeaflet.useMap;
  require('leaflet/dist/leaflet.css');
  
  // Load leaflet-gesture-handling plugin
  try {
    const GestureHandling = require('leaflet-gesture-handling');
    
    // Add the gesture handling handler to Leaflet
    L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling.GestureHandling);
    console.log('Gesture handling plugin loaded successfully');
  } catch (e) {
    console.warn('Leaflet gesture handling plugin not loaded:', e);
  }
  
  // Load leaflet.heat plugin
  try {
    require('leaflet.heat');
  } catch (e) {
    console.warn('Leaflet.heat plugin not loaded');
  }
  
  // Fix for default marker icons in Leaflet
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

// Database interface matching Supabase schema
export interface Location {
  id?: string;
  activity_id?: string;
  location_type: 'site' | 'coverage';
  location_name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  site_type?: string;
  admin_unit?: string;
  coverage_scope?: 'national' | 'subnational' | 'regional' | 'local';
  state_region_code?: string;
  state_region_name?: string;
  township_code?: string;
  township_name?: string;
  village_name?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  // Activity details for hover display
  activity_title?: string;
  activity_sector?: string;
}

interface LocationSelectorProps {
  locations: Location[];
  onLocationsChange: (locations: Location[]) => void;
  activityId?: string;
  userId?: string;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  saveMessage?: string;
  activityTitle?: string;
  activitySector?: string;
}

// Enhanced site type options with descriptions (matching collaboration type format)
const SITE_TYPES = [
  { 
    value: 'project_site', 
    label: 'Project Site',
    description: 'Primary location where project activities are implemented'
  },
  { 
    value: 'office', 
    label: 'Office',
    description: 'Administrative or management office location'
  },
  { 
    value: 'warehouse', 
    label: 'Warehouse',
    description: 'Storage facility for supplies, equipment, or materials'
  },
  { 
    value: 'training_center', 
    label: 'Training Center',
    description: 'Facility used for capacity building and training programs'
  },
  { 
    value: 'health_facility', 
    label: 'Health Facility',
    description: 'Medical clinic, hospital, or health service facility'
  },
  { 
    value: 'school', 
    label: 'School',
    description: 'Educational institution for primary, secondary, or tertiary education'
  },
  { 
    value: 'community_center', 
    label: 'Community Center',
    description: 'Multi-purpose facility serving local community needs'
  },
  { 
    value: 'other', 
    label: 'Other',
    description: 'Location type not covered by standard categories'
  }
];

// Coverage scope options
const COVERAGE_SCOPES = [
  { value: 'national', label: 'National' },
  { value: 'subnational', label: 'Subnational' },
  { value: 'regional', label: 'Regional' },
  { value: 'local', label: 'Local' }
];

// Myanmar boundaries for highlighting (more detailed coordinates)
const MYANMAR_BOUNDS: [number, number][] = [
  [28.335, 92.189],
  [28.335, 101.168],
  [9.784, 101.168],
  [9.784, 92.189],
];

// Enhanced Myanmar GeoJSON with better boundary definition
const MYANMAR_GEOJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "Myanmar", "admin": "country" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[92.172, 20.670], [92.652, 21.324], [93.553, 21.849], [94.108, 21.849], [95.158, 21.857], [95.125, 22.755], [96.419, 23.627], [97.327, 23.897], [98.449, 24.753], [98.676, 25.918], [98.712, 26.743], [98.672, 27.508], [98.246, 27.747], [97.711, 28.335], [97.176, 28.335], [96.419, 27.264], [95.404, 26.001], [94.565, 25.164], [93.413, 24.847], [92.503, 24.976], [91.696, 24.072], [90.972, 23.682], [90.583, 22.938], [90.496, 22.804], [90.389, 21.833], [89.031, 22.055], [88.876, 21.690], [88.931, 20.848], [92.368, 20.670], [92.172, 20.670]]]
      }
    }
  ]
};

// Map events component
function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  // Always call hooks first - no conditions
  const map = useMapEventsHook ? useMapEventsHook({
    click(e: any) {
      if (typeof window !== 'undefined') {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  }) : null;
  
  return null;
}

// Heat map component for location density visualization
function HeatMapLayer({ locations }: { locations: Location[] }) {
  // Always call hooks first
  const map = useMap();
  
  React.useEffect(() => {
    if (!map || typeof window === 'undefined' || !L || !L.heatLayer) return;
    
    const validLocations = locations.filter(loc => loc.latitude && loc.longitude);
    
    if (validLocations.length === 0) return;
    
    // Convert locations to heat data format [lat, lng, intensity]
    const heatData = validLocations.map(loc => [
      loc.latitude!,
      loc.longitude!,
      1 // intensity
    ]);
    
    // Create heat layer with better visibility
    const heatLayer = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      max: 1.0,
      minOpacity: 0.4,
      gradient: {
        0.0: '#8b5cf6',
        0.2: '#a855f7', 
        0.4: '#c084fc',
        0.6: '#fbbf24',
        0.8: '#f59e0b',
        1.0: '#d97706'
      }
    });
    
    // Add to map
    heatLayer.addTo(map);
    
    // Cleanup
    return () => {
      if (map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, locations]);
    
  return null;
}

// Map thumbnail component
function MapThumbnail({ location }: { location: Location }) {
  if (typeof window === 'undefined') {
    return (
      <div className="w-32 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <MapPin className="h-6 w-6 text-gray-400" />
        </div>
      </div>
    );
  }

  if (!location.latitude || !location.longitude) {
    return (
      <div className="w-32 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <MapPin className="h-6 w-6 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-32 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
      <MapContainer
        center={[location.latitude, location.longitude]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        dragging={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
        />
        <Marker position={[location.latitude, location.longitude]} />
      </MapContainer>
    </div>
  );
}

export default function LocationSelector({ 
  locations, 
  onLocationsChange, 
  activityId, 
  userId,
  saveStatus, 
  saveMessage,
  activityTitle,
  activitySector 
}: LocationSelectorProps) {
  console.log('[LocationSelector] Component rendering...');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Partial<Location>>({});
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Default center (Myanmar)
  const defaultCenter: [number, number] = [21.9162, 95.9560];

  useEffect(() => {
    setIsMapLoaded(true);
  }, []);


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle real-time search with debouncing
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);

      try {
        // First try Myanmar-specific search
        let response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=mm&limit=5&addressdetails=1`
        );
        let data = await response.json();

        // If no results in Myanmar, try global search
        if (data.length === 0) {
          response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
          );
          data = await response.json();
        }

        setSearchResults(data);
      } catch (error) {
        console.error('Error searching locations:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle map click
  const handleMapClick = async (lat: number, lng: number) => {
    try {
      // Reverse geocoding to get address and administrative areas
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();

      // Extract administrative areas
      const address = data.display_name || '';
      const stateRegion = data.address?.state || data.address?.province || '';
      const township = data.address?.county || data.address?.district || '';
      const village = data.address?.village || data.address?.suburb || data.address?.hamlet || '';

      setSelectedLocation({
        location_type: 'site',
        location_name: '',
        latitude: lat,
        longitude: lng,
        address: address,
        state_region_name: stateRegion,
        township_name: township,
        village_name: village,
        site_type: 'project_site'
      });

      setIsAddingLocation(true);
      toast.success('Location selected! Fill in the details below.');
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      // Fallback without address
      setSelectedLocation({
        location_type: 'site',
        location_name: '',
        latitude: lat,
        longitude: lng,
        address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
        site_type: 'project_site'
      });
      setIsAddingLocation(true);
      toast.success('Location selected! Fill in the details below.');
    }
  };

  // Handle selecting a search result
  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Update map view
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);
    }

    // Set selected location with administrative areas
    setSelectedLocation({
      location_type: 'site',
      location_name: '',
      latitude: lat,
      longitude: lng,
      address: result.display_name,
      state_region_name: result.address?.state || result.address?.province || '',
      township_name: result.address?.county || result.address?.district || '',
      village_name: result.address?.village || result.address?.suburb || result.address?.hamlet || '',
      site_type: 'project_site'
    });

    setIsAddingLocation(true);
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
    toast.success(`Selected: ${result.display_name}`);
  };



  // Add location
  const handleAddLocation = () => {
    if (!selectedLocation.latitude || !selectedLocation.longitude || !selectedLocation.location_name) {
      toast.error('Please provide a location name');
      return;
    }

    const newLocation: Location = {
      id: `temp_${Date.now()}`, // Temporary ID until saved to database
      location_type: 'site',
      location_name: selectedLocation.location_name,
      description: selectedLocation.description,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      address: selectedLocation.address,
      site_type: selectedLocation.site_type,
      state_region_name: selectedLocation.state_region_name,
      township_name: selectedLocation.township_name,
      village_name: selectedLocation.village_name,
      activity_id: activityId,
      created_by: userId,
      activity_title: activityTitle,
      activity_sector: activitySector
    };

    onLocationsChange([...locations, newLocation]);
    setSelectedLocation({});
    setIsAddingLocation(false);
    toast.success('Location added successfully');
  };

  // Edit location
  const handleEditLocation = (location: Location) => {
    setEditingLocation(location.id || '');
    setSelectedLocation(location);
    setIsAddingLocation(true);
    
    // Update map view to show the edited location
    if (mapRef.current && location.latitude && location.longitude) {
      mapRef.current.setView([location.latitude, location.longitude], 15);
    }
  };

  // Update location
  const handleUpdateLocation = () => {
    if (!editingLocation || !selectedLocation.location_name) {
      toast.error('Please provide a location name');
      return;
    }

    const updatedLocations = locations.map(loc => 
      loc.id === editingLocation 
        ? { 
            ...loc, 
            ...selectedLocation,
            updated_by: userId,
            updated_at: new Date().toISOString()
          }
        : loc
    );

    onLocationsChange(updatedLocations);
    setEditingLocation(null);
    setSelectedLocation({});
    setIsAddingLocation(false);
    toast.success('Location updated successfully');
  };

  // Delete location
  const handleDeleteLocation = (locationId: string) => {
    const updatedLocations = locations.filter(loc => loc.id !== locationId);
    onLocationsChange(updatedLocations);
    toast.success('Location deleted successfully');
  };

  // Cancel adding/editing
  const handleCancel = () => {
    setSelectedLocation({});
    setIsAddingLocation(false);
    setEditingLocation(null);
  };

  // Filter locations by type for display
  const siteLocations = locations.filter(loc => loc.location_type === 'site');

  if (!isMapLoaded) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Controls - Fixed layout to prevent clipping */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Bar - Enhanced with dropdown */}
        <div className="flex-1 min-w-0">
          <div className="relative search-container z-10">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
            <Input
              placeholder="Search for a location (try 'Yangon', 'Mandalay', or any city)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              className="pl-10 w-full"
            />
            
            {/* Search Results Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto z-50">
                {isSearching ? (
                  <div className="p-3 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                      Searching...
                    </div>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSearchResult(result)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{result.name || result.display_name.split(',')[0]}</div>
                      <div className="text-sm text-gray-500 mt-1">{result.display_name}</div>
                      {result.type && (
                        <div className="text-xs text-gray-400 mt-1 capitalize">{result.type.replace('_', ' ')}</div>
                      )}
                    </button>
                  ))
                ) : searchQuery.trim().length >= 2 ? (
                  <div className="p-3 text-center text-gray-500">
                    No results found for "{searchQuery}"
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

      </div>


      {/* Coordinates Display */}
      {selectedLocation.latitude && selectedLocation.longitude && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              value={selectedLocation.latitude?.toFixed(6) || ''}
              readOnly
              className="bg-blue-50"
            />
          </div>
          <div>
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              value={selectedLocation.longitude?.toFixed(6) || ''}
              readOnly
              className="bg-blue-50"
            />
          </div>
        </div>
      )}

      {/* Simple Map - Rebuilt from scratch */}
      <Card>
        <CardContent className="p-0">
          <div className="h-80 w-full relative bg-gray-100 rounded-lg">
            {typeof window !== 'undefined' && (
              <MapContainer
                center={defaultCenter}
                zoom={6}
                style={{ height: '100%', width: '100%', borderRadius: '8px', cursor: 'crosshair' }}
                ref={mapRef}
                zoomControl={true}
                attributionControl={true}
                whenReady={() => {
                  console.log('🗺️ MAP READY');
                  
                  // Use a setTimeout to ensure the map ref is properly set
                  setTimeout(() => {
                    if (mapRef.current) {
                      const leafletMap = mapRef.current;
                      console.log('📍 LEAFLET MAP:', !!leafletMap);
                      console.log('📍 MAP CONTAINER:', !!leafletMap.getContainer);
                      
                      try {
                        // Check initial state
                        console.log('🔍 INITIAL DRAGGING:', leafletMap.dragging?._enabled ? '✅' : '❌');
                        console.log('🔍 INITIAL SCROLL:', leafletMap.scrollWheelZoom?._enabled ? '✅' : '❌');
                        
                        // Force enable all interactions
                        if (leafletMap.dragging) {
                          leafletMap.dragging._enabled = true;
                          leafletMap.dragging.enable();
                          console.log('🔧 Dragging FORCE enabled');
                        }
                        if (leafletMap.scrollWheelZoom) {
                          leafletMap.scrollWheelZoom._enabled = true;
                          leafletMap.scrollWheelZoom.enable();
                          console.log('🔧 ScrollWheelZoom FORCE enabled');
                        }
                        if (leafletMap.touchZoom) {
                          leafletMap.touchZoom._enabled = true;
                          leafletMap.touchZoom.enable();
                          console.log('🔧 TouchZoom FORCE enabled');
                        }
                        if (leafletMap.doubleClickZoom) {
                          leafletMap.doubleClickZoom._enabled = true;
                          leafletMap.doubleClickZoom.enable();
                          console.log('🔧 DoubleClickZoom FORCE enabled');
                        }
                        if (leafletMap.keyboard) {
                          leafletMap.keyboard._enabled = true;
                          leafletMap.keyboard.enable();
                          console.log('🔧 Keyboard FORCE enabled');
                        }
                        
                        // Add event listeners to test interaction
                        leafletMap.on('mousedown', function(e: any) {
                          console.log('🖱️ Mouse down detected');
                        });
                        
                        leafletMap.on('wheel', function(e: any) {
                          console.log('🎡 Wheel event detected');
                        });
                        
                        leafletMap.on('drag', function(e: any) {
                          console.log('🚀 Map dragging!');
                        });
                        
                        leafletMap.on('zoom', function(e: any) {
                          console.log('🔍 Map zooming!');
                        });
                        
                        // Check final state
                        console.log('🔧 FINAL DRAGGING:', leafletMap.dragging?._enabled ? '✅' : '❌');
                        console.log('🔧 FINAL SCROLL:', leafletMap.scrollWheelZoom?._enabled ? '✅' : '❌');
                        console.log('🔧 FINAL TOUCH:', leafletMap.touchZoom?._enabled ? '✅' : '❌');
                        console.log('✨ MAP SETUP COMPLETE');
                      } catch (e) {
                        console.log('❌ MAP ERROR:', e);
                      }
                    } else {
                      console.log('❌ MAP REF NOT AVAILABLE');
                    }
                  }, 100);
                }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Show existing location markers */}
                {siteLocations.map((location) => (
                  location.latitude && location.longitude && (
                    <Marker
                      key={location.id}
                      position={[location.latitude, location.longitude]}
                    >
                      <Popup>
                        <div>
                          <strong>{location.location_name}</strong>
                          <br />
                          {location.site_type?.replace('_', ' ')}
                        </div>
                      </Popup>
                    </Marker>
                  )
                ))}
                
                <MapEvents onMapClick={handleMapClick} />
              </MapContainer>
            )}
            
                         {/* Click instruction */}
             <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded shadow text-xs text-gray-600 z-50 pointer-events-none">
               💡 Click on the map to add a location
             </div>
             
             {/* Touch interaction indicator */}
             <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded shadow text-xs z-50 pointer-events-none">
               👆 Touch & Scroll Enabled
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Administrative Areas - Always visible, grayed out fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="stateRegion" className="text-xs text-gray-500">State/Region/Union Territory</Label>
            <Input
              id="stateRegion"
              value={selectedLocation.state_region_name || ''}
              readOnly
              disabled
              className="bg-gray-100 text-gray-600 cursor-not-allowed"
              placeholder="Click on map or search to populate"
            />
          </div>
          <div>
            <Label htmlFor="township" className="text-xs text-gray-500">Township</Label>
            <Input
              id="township"
              value={selectedLocation.township_name || ''}
              readOnly
              disabled
              className="bg-gray-100 text-gray-600 cursor-not-allowed"
              placeholder="Click on map or search to populate"
            />
          </div>
          <div>
            <Label htmlFor="village" className="text-xs text-gray-500">Village</Label>
            <Input
              id="village"
              value={selectedLocation.village_name || ''}
              readOnly
              disabled
              className="bg-gray-100 text-gray-600 cursor-not-allowed"
              placeholder="Click on map or search to populate"
            />
          </div>
        </div>
      </div>

      {/* Location Form */}
      {isAddingLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {editingLocation ? 'Edit Location' : 'Add New Location'}
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="locationName">Location Name *</Label>
                <Input
                  id="locationName"
                  placeholder="Enter location name"
                  value={selectedLocation.location_name || ''}
                  onChange={(e) => setSelectedLocation(prev => ({ ...prev, location_name: e.target.value }))}
                />
              </div>

              {/* Enhanced Site Type Dropdown - Matching collaboration type format */}
              <div>
                <Label htmlFor="siteType">Site Type</Label>
                <Select
                value={selectedLocation.site_type || 'project_site'}
                onValueChange={(value) => setSelectedLocation(prev => ({ ...prev, site_type: value }))}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select site type" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {SITE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="pl-6 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {type.value}
                          </span>
                          <span className="font-medium text-foreground">{type.label}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                          {type.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="locationDescription">Additional Details</Label>
              <Textarea
                id="locationDescription"
                placeholder="Additional location details..."
                value={selectedLocation.description || ''}
                onChange={(e) => setSelectedLocation(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={editingLocation ? handleUpdateLocation : handleAddLocation}
                className="flex items-center gap-2"
                disabled={!selectedLocation.location_name?.trim()}
              >
                <Plus className="h-4 w-4" />
                {editingLocation ? 'Update Location' : 'Add Location'}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Locations */}
      {locations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Saved Locations ({locations.length})</h3>
          
          {/* Site Locations */}
          {siteLocations.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {siteLocations.map((location) => (
                  <Card key={location.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Map Thumbnail */}
                        <MapThumbnail location={location} />

                        {/* Location Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{location.location_name}</h4>
                              <p className="text-sm text-gray-600 capitalize">{location.site_type?.replace('_', ' ')}</p>
                              <p className="text-xs text-gray-500 mt-1">{location.address}</p>
                              {location.description && (
                                <p className="text-sm text-gray-600 mt-1">{location.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditLocation(location)}
                                title="Edit location"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLocation(location.id || '')}
                                title="Delete location"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Administrative Areas */}
                          {(location.state_region_name || location.township_name) && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {location.state_region_name && (
                                <Badge variant="outline" className="text-xs">
                                  {location.state_region_name}
                                </Badge>
                              )}
                              {location.township_name && (
                                <Badge variant="outline" className="text-xs">
                                  {location.township_name}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
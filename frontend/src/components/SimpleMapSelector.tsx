'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, Edit, Trash2, Plus, X, Flame, RotateCcw, Layers, Satellite, Mountain } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
// Note: Leaflet is imported dynamically to avoid SSR issues

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

// Import Leaflet and fix SSR issues
let L: any = null;
let useMapEventsHook: any = null;

// Ensure we only load Leaflet on client side
const loadLeafletDependencies = () => {
  if (typeof window !== 'undefined' && !L) {
    try {
      L = require('leaflet');
      const ReactLeaflet = require('react-leaflet');
      useMapEventsHook = ReactLeaflet.useMapEvents;
      require('leaflet/dist/leaflet.css');
      
      // Load leaflet-gesture-handling plugin (optional)
      try {
        const GestureHandling = require('leaflet-gesture-handling');
        if (L?.Map?.addInitHook) {
          L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling.GestureHandling);
          console.log('✅ Gesture handling plugin loaded successfully');
        }
      } catch (e) {
        console.warn('⚠️ Leaflet gesture handling plugin not loaded, using default interactions:', e);
      }
      
      // Fix for default marker icons in Leaflet
      if (L?.Icon?.Default) {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });
      }
    } catch (error) {
      console.error('Failed to load Leaflet dependencies:', error);
      L = null;
      useMapEventsHook = null;
    }
  }
};

// Dependencies will be loaded in the component useEffect

// Create local SVG marker icon (no external dependencies)
function createLocalMarkerIcon() {
  // Ensure Leaflet is loaded
  if (typeof window === 'undefined' || !L) {
    return null;
  }
  // Create a bright red pin SVG as data URL
  const svgPin = `<svg width="25" height="41" viewBox="0 0 25 41" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.5 0C5.596 0 0 5.596 0 12.5C0 19.404 12.5 41 12.5 41C12.5 41 25 19.404 25 12.5C25 5.596 19.404 0 12.5 0Z" fill="#DC2626"/>
    <circle cx="12.5" cy="12.5" r="6" fill="white"/>
    <circle cx="12.5" cy="12.5" r="3" fill="#DC2626"/>
  </svg>`;
  
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgPin)}`;
  
  console.log('🎯 Creating local SVG marker icon');
  console.log('📍 SVG Data URL:', svgDataUrl.substring(0, 100) + '...');
  
  try {
    const icon = new L.Icon({
      iconUrl: svgDataUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41], // Center horizontally, bottom of pin vertically
      popupAnchor: [1, -34],
      className: 'custom-pin-marker'
    });
    console.log('✅ Local SVG icon created successfully');
    return icon;
  } catch (error) {
    console.error('❌ Error creating local SVG icon:', error);
    // Fallback to basic divIcon
    return new L.divIcon({
      html: '<div style="background: red; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      className: 'fallback-marker'
    });
  }
}

interface Location {
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

interface SaveStatus {
  isLoading: boolean;
  error: string | null;
  lastSaved: Date | null;
}

interface SimpleMapSelectorProps {
  locations: Location[];
  onLocationsChange: (locations: Location[]) => void;
  activityId?: string;
  userId?: string;
  saveStatus?: SaveStatus;
  saveMessage?: string;
  activityTitle?: string;
  activitySector?: string;
}

// Map layer configuration
const MAP_LAYERS = {
  streets: {
    name: 'Streets',
    icon: Layers,
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors'
  },
  satellite: {
    name: 'Satellite',
    icon: Satellite,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  topographic: {
    name: 'Topographic',
    icon: Mountain,
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a> contributors'
  }
} as const;

type MapLayerType = keyof typeof MAP_LAYERS;

// Default center: Myanmar
const defaultCenter: [number, number] = [21.9162, 95.9560];
const defaultZoom = 6;

// Map events component
function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  if (!useMapEventsHook || typeof window === 'undefined') return null;
  
  try {
    const map = useMapEventsHook({
      click(e: any) {
        const { lat, lng } = e.latlng;
        onMapClick(lat, lng);
      },
    });
    return null;
  } catch (error) {
    console.error('Error in MapEvents:', error);
    return null;
  }
}

// Map initializer to ensure proper setup
// Component to handle map reset
function MapReset({ shouldReset, onResetComplete }: { shouldReset: boolean; onResetComplete: () => void }) {
  if (!useMapEventsHook || typeof window === 'undefined') return null;
  
  try {
    const map = useMapEventsHook({});
  
    useEffect(() => {
      if (!map || !shouldReset) return;
      
      console.log('Resetting map view to Myanmar');
      map.setView(defaultCenter, defaultZoom);
      onResetComplete();
    }, [map, shouldReset, onResetComplete]);
    
    return null;
  } catch (error) {
    console.error('Error in MapReset:', error);
    return null;
  }
}

// Component to fit map bounds to locations
function MapBounds({ locations }: { locations: Location[] }) {
  if (!useMapEventsHook || typeof window === 'undefined') return null;
  
  try {
    const map = useMapEventsHook({});
  
  useEffect(() => {
    if (!map || !locations.length) return;
    
    const validLocations = locations.filter(loc => 
      loc.latitude && loc.longitude && 
      !isNaN(loc.latitude) && !isNaN(loc.longitude)
    );
    
    if (validLocations.length === 0) {
      console.log('No valid locations to fit bounds');
      return;
    }
    
    console.log('🗺️ MapBounds: Fitting map bounds to', validLocations.length, 'locations');
    console.log('🗺️ MapBounds: Valid locations:', validLocations.map(loc => ({
      name: loc.location_name,
      lat: loc.latitude,
      lng: loc.longitude,
      position: [loc.latitude, loc.longitude]
    })));
    
    if (validLocations.length === 1) {
      // For single location, set view with higher zoom
      const loc = validLocations[0];
      console.log('🗺️ MapBounds: Setting view to single location:', {
        name: loc.location_name,
        position: [loc.latitude!, loc.longitude!],
        zoom: 12
      });
      map.setView([loc.latitude!, loc.longitude!], 12);
    } else {
      // For multiple locations, fit bounds
      const bounds = validLocations.map(loc => [loc.latitude!, loc.longitude!] as [number, number]);
      console.log('🗺️ MapBounds: Calculated bounds:', bounds);
      
      // Calculate the extent of the bounds
      const lats = bounds.map(b => b[0]);
      const lngs = bounds.map(b => b[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      console.log('🗺️ MapBounds: Bounds extent:', {
        latRange: [minLat, maxLat],
        lngRange: [minLng, maxLng],
        latSpread: maxLat - minLat,
        lngSpread: maxLng - minLng
      });
      
      map.fitBounds(bounds, { padding: [20, 20] });
      console.log('🗺️ MapBounds: Fitted bounds to multiple locations');
    }
    }, [map, locations]);
    
    return null;
  } catch (error) {
    console.error('Error in MapBounds:', error);
    return null;
  }
}

function MapInitializer() {
  if (!useMapEventsHook || typeof window === 'undefined') return null;
  
  try {
    const map = useMapEventsHook({});
  
  useEffect(() => {
    if (map) {
      console.log('🔧 MapInitializer: Forcing interaction setup...');
      
      // Force enable all interactions
      if (map.dragging && !map.dragging.enabled()) {
        map.dragging.enable();
        console.log('✅ Force enabled dragging');
      }
      
      if (map.scrollWheelZoom && !map.scrollWheelZoom.enabled()) {
        map.scrollWheelZoom.enable();
        console.log('✅ Force enabled scroll wheel zoom');
      }
      
      if (map.touchZoom && !map.touchZoom.enabled()) {
        map.touchZoom.enable();
        console.log('✅ Force enabled touch zoom');
      }
      
      // Force map to refresh and recalculate size
      setTimeout(() => {
        console.log('🔄 Forcing map refresh...');
        map.invalidateSize();
        console.log('✅ Map size invalidated and refreshed');
      }, 100);
      
      // Set up test event listeners with more detailed logging
      map.on('drag', () => {
        console.log('🚀 Map is being dragged');
        // Don't force redraw during drag - let Leaflet handle it naturally
      });
      
      map.on('dragend', () => {
        console.log('🏁 Drag ended - forcing map refresh');
        map.invalidateSize();
      });
      
      map.on('zoom', () => console.log('🔍 Map is being zoomed'));
      
      console.log('🔧 Final status check:');
      console.log('- Dragging enabled:', map.dragging?.enabled());
      console.log('- Scroll wheel enabled:', map.scrollWheelZoom?.enabled());
      console.log('- Touch zoom enabled:', map.touchZoom?.enabled());
    }
    }, [map]);
    
    return null;
  } catch (error) {
    console.error('Error in MapInitializer:', error);
    return null;
  }
}

// Heatmap component
function HeatmapLayer({ locations }: { locations: Location[] }) {
  if (!useMapEventsHook || typeof window === 'undefined') return null;
  
  try {
    const map = useMapEventsHook({});
    const heatLayerRef = useRef<any>(null);
  
  useEffect(() => {
    if (!map) return;
    
    // Load leaflet.heat plugin if available
    if (typeof window !== 'undefined') {
      try {
        require('leaflet.heat');
        
        // Remove existing heatmap layer if it exists
        if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
          map.removeLayer(heatLayerRef.current);
          heatLayerRef.current = null;
        }
        
        // Only create heatmap if we have valid locations
        const validLocations = locations.filter(loc => 
          loc.latitude && loc.longitude && 
          !isNaN(loc.latitude) && !isNaN(loc.longitude)
        );
        
        if (validLocations.length === 0) {
          console.log('No valid locations for heatmap');
          return;
        }
        
        // Create heatmap data from locations
        const heatmapData = validLocations.map(loc => [
          loc.latitude!, 
          loc.longitude!, 
          1.0 // Intensity - could be based on activity data in the future
        ]);
        
        console.log('Creating heatmap with', heatmapData.length, 'points');
        
        // Create and add heatmap layer
        if (!L || !L.heatLayer) {
          console.warn('Leaflet heatLayer not available');
          return;
        }
        const heatLayer = L.heatLayer(heatmapData, {
          radius: 25,
          blur: 15,
          maxZoom: 18,
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
        
        heatLayerRef.current = heatLayer;
        heatLayer.addTo(map);
        
      } catch (error) {
        console.warn('Leaflet.heat plugin not available:', error);
      }
    }
    
    // Cleanup function
    return () => {
      if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
    }, [map, locations]);
    
    return null;
  } catch (error) {
    console.error('Error in HeatmapLayer:', error);
    return null;
  }
}

// Map thumbnail component for location cards
function MapThumbnail({ location }: { location: Location }) {
  // Memoize icon creation to prevent function calls during JSX evaluation
  const markerIcon = useMemo(() => {
    if (typeof window === 'undefined' || !L || !useMapEventsHook) {
      return null;
    }
    return createLocalMarkerIcon();
  }, []);

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

  // Don't render if Leaflet isn't loaded
  if (!L || !useMapEventsHook || !markerIcon) {
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
          attribution={MAP_LAYERS.topographic.attribution}
          url={MAP_LAYERS.topographic.url}
        />
        <Marker 
          position={[location.latitude, location.longitude]} 
          icon={markerIcon}
        />
      </MapContainer>
    </div>
  );
}

export default function SimpleMapSelector({
  locations,
  onLocationsChange,
  activityId,
  userId,
  saveStatus,
  saveMessage,
  activityTitle,
  activitySector
}: SimpleMapSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Partial<Location>>({});
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [shouldResetMap, setShouldResetMap] = useState(false);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('streets');
  const mapRef = useRef<any>(null);

  console.log('[SimpleMapSelector] Component rendering...');
  console.log('[SimpleMapSelector] Locations received:', locations);
  console.log('[SimpleMapSelector] Locations count:', locations?.length || 0);
  console.log('[SimpleMapSelector] Current map layer:', mapLayer);
  
  // Only log if there are issues
  if (locations?.length > 0) {
    console.log(`📍 Map View: ${showHeatmap ? 'Heatmap' : 'Pins'} (${locations.length} locations)`);
  }

  // Memoize marker icon creation to prevent function calls during JSX evaluation
  const markerIcon = useMemo(() => {
    if (typeof window === 'undefined' || !L || !useMapEventsHook || !isMapLoaded) {
      return null;
    }
    return createLocalMarkerIcon();
  }, [isMapLoaded]);

  useEffect(() => {
    // Ensure Leaflet is loaded before setting map as loaded
    if (typeof window !== 'undefined') {
      try {
        loadLeafletDependencies();
        // Only set map as loaded if L and useMapEventsHook are available
        if (L && useMapEventsHook) {
          setIsMapLoaded(true);
          console.log('✅ Leaflet dependencies loaded and map ready');
        } else {
          console.warn('⚠️ Leaflet dependencies not fully loaded');
          setIsMapLoaded(false);
        }
      } catch (error) {
        console.error('❌ Failed to load Leaflet dependencies:', error);
        setIsMapLoaded(false);
      }
    }
  }, []);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=mm&limit=5&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      setSearchResults(data || []);
      setShowDropdown((data || []).length > 0);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search locations');
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 3) {
        handleSearch(searchQuery);
      } else {
        // Clear results if query is too short
        setSearchResults([]);
        setShowDropdown(false);
        setIsSearching(false);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  // Handle map reset completion
  const handleResetComplete = useCallback(() => {
    setShouldResetMap(false);
    console.log('Map reset completed');
  }, []);

  // Handle map click to add new location
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    console.log('🗺️ Map clicked at:', lat, lng);
    
    try {
      // Reverse geocode to get detailed address information
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`
      );
      const data = await response.json();
      
      // Extract administrative details from the address components
      const address = data.address || {};
      console.log('🏛️ Address details:', address);
      
      const newLocation: Partial<Location> = {
        location_name: '',
        location_type: 'site',
        site_type: 'project_site',
        latitude: lat,
        longitude: lng,
        address: data.display_name || `${lat}, ${lng}`,
        description: '',
        // Extract administrative levels for Myanmar
        state_region_name: address.state || address.region || address.province || '',
        state_region_code: address.state_code || '',
        township_name: address.township || address.county || address.municipality || '',
        township_code: address.township_code || '',
        village_name: address.village || address.hamlet || address.suburb || address.neighbourhood || '',
      };
      
      console.log('📍 Extracted location details:', {
        state: newLocation.state_region_name,
        township: newLocation.township_name,
        village: newLocation.village_name
      });
      
      setSelectedLocation(newLocation);
      setIsAddingLocation(true);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      toast.error('Failed to get location details');
    }
  }, []);

  // Add or update location
  const saveLocation = () => {
    if (!selectedLocation.location_name || !selectedLocation.latitude || !selectedLocation.longitude) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check for duplicate coordinates (within 0.0001 degrees tolerance - about 11 meters)
    const tolerance = 0.0001;
    const existingLocationWithSameCoords = locations.find(loc => 
      loc.id !== editingLocation && // Exclude current location when editing
      loc.latitude && loc.longitude && // Ensure coordinates exist
      Math.abs(loc.latitude - selectedLocation.latitude!) < tolerance &&
      Math.abs(loc.longitude - selectedLocation.longitude!) < tolerance
    );

    if (existingLocationWithSameCoords) {
      toast.error(`⚠️ These coordinates are too close to existing location "${existingLocationWithSameCoords.location_name}". Please use different coordinates or edit the existing location.`);
      console.error('🚫 Duplicate coordinates detected:', {
        existing: {
          name: existingLocationWithSameCoords.location_name,
          coords: [existingLocationWithSameCoords.latitude, existingLocationWithSameCoords.longitude]
        },
        new: {
          name: selectedLocation.location_name,
          coords: [selectedLocation.latitude, selectedLocation.longitude]
        }
      });
      return;
    }

    console.log('✅ Saving location with coordinates:', [selectedLocation.latitude, selectedLocation.longitude]);

    if (editingLocation) {
      // Update existing location
      const updatedLocations = locations.map(loc => 
        loc.id === editingLocation 
          ? {
              ...loc,
              location_name: selectedLocation.location_name || '',
              location_type: selectedLocation.location_type || loc.location_type,
              site_type: selectedLocation.site_type || loc.site_type,
              latitude: selectedLocation.latitude || 0,
              longitude: selectedLocation.longitude || 0,
              address: selectedLocation.address || '',
              description: selectedLocation.description || '',
              state_region_code: selectedLocation.state_region_code,
              state_region_name: selectedLocation.state_region_name,
              township_code: selectedLocation.township_code,
              township_name: selectedLocation.township_name,
              village_name: selectedLocation.village_name,
            }
          : loc
      );
      
      onLocationsChange(updatedLocations);
      setEditingLocation(null);
      toast.success('Location updated successfully');
    } else {
      // Add new location
      const newLocation: Location = {
        id: Date.now().toString(),
        location_name: selectedLocation.location_name || '',
        location_type: selectedLocation.location_type || 'site',
        site_type: selectedLocation.site_type || 'project_site',
        latitude: selectedLocation.latitude || 0,
        longitude: selectedLocation.longitude || 0,
        address: selectedLocation.address || '',
        description: selectedLocation.description || '',
        state_region_code: selectedLocation.state_region_code,
        state_region_name: selectedLocation.state_region_name,
        township_code: selectedLocation.township_code,
        township_name: selectedLocation.township_name,
        village_name: selectedLocation.village_name,
      };

      onLocationsChange([...locations, newLocation]);
      toast.success('Location added successfully');
    }

    setSelectedLocation({});
    setIsAddingLocation(false);
  };

  // Delete location
  const deleteLocation = (locationId: string) => {
    onLocationsChange(locations.filter(loc => loc.id !== locationId));
    toast.success('Location deleted');
  };

  // Clean up duplicate coordinates
  const cleanupDuplicateCoordinates = () => {
    const tolerance = 0.0001;
    const uniqueLocations: Location[] = [];
    const duplicatesFound: Location[] = [];

    locations.forEach(location => {
      const isDuplicate = uniqueLocations.some(unique => 
        unique.latitude !== undefined && location.latitude !== undefined &&
        unique.longitude !== undefined && location.longitude !== undefined &&
        Math.abs(unique.latitude - location.latitude) < tolerance &&
        Math.abs(unique.longitude - location.longitude) < tolerance
      );

      if (!isDuplicate) {
        uniqueLocations.push(location);
      } else {
        duplicatesFound.push(location);
      }
    });

    if (duplicatesFound.length > 0) {
      onLocationsChange(uniqueLocations);
      toast.success(`🧹 Cleaned up ${duplicatesFound.length} duplicate location(s). Kept unique locations only.`);
      console.log('🧹 Removed duplicate locations:', duplicatesFound.map(d => d.location_name));
    } else {
      toast.info('✅ No duplicate coordinates found. All locations have unique coordinates.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Add Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative search-container">
            <Input
              placeholder="Search for a location..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="pr-10"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              </div>
            )}
            
            {/* Search results dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                        onClick={() => {
                        // Extract administrative details from search result
                        const address = result.address || {};
                        
                        const newLocation: Partial<Location> = {
                          location_name: result.name || result.display_name.split(',')[0],
                          location_type: 'site',
                          site_type: 'project_site',
                          latitude: parseFloat(result.lat),
                          longitude: parseFloat(result.lon),
                          address: result.display_name,
                          description: '',
                          // Extract administrative levels
                          state_region_name: address.state || address.region || address.province || '',
                          state_region_code: address.state_code || '',
                          township_name: address.township || address.county || address.municipality || '',
                          township_code: address.township_code || '',
                          village_name: address.village || address.hamlet || address.suburb || address.neighbourhood || '',
                        };
                        setSelectedLocation(newLocation);
                        setIsAddingLocation(true);
                        setShowDropdown(false);
                        // Keep the search result in the search bar
                        setSearchQuery(result.name || result.display_name.split(',')[0]);
                        
                        // Move map to the selected location
                        if (mapRef.current) {
                          const leafletMap = mapRef.current;
                          leafletMap.setView([parseFloat(result.lat), parseFloat(result.lon)], 15);
                        }
                      }}
                  >
                    <div className="font-medium">{result.name || result.display_name.split(',')[0]}</div>
                    <div className="text-gray-500 text-xs">{result.display_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
                        {/* Coordinate Entry */}
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="manual-lat" className="text-xs text-gray-500">Latitude</Label>
                <Input
                  id="manual-lat"
                  type="number"
                  step="any"
                  value={selectedLocation.latitude || ''}
                  onChange={(e) => {
                    const lat = parseFloat(e.target.value);
                    if (!isNaN(lat)) {
                      setSelectedLocation({ ...selectedLocation, latitude: lat });
                      // Auto-fill location name if empty
                      if (!selectedLocation.location_name) {
                        setSelectedLocation(prev => ({ 
                          ...prev, 
                          latitude: lat,
                          location_name: `Location at ${lat.toFixed(6)}, ${selectedLocation.longitude?.toFixed(6) || '...'}`
                        }));
                      }
                    }
                  }}
                  placeholder="e.g., 21.9162"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="manual-lng" className="text-xs text-gray-500">Longitude</Label>
                <Input
                  id="manual-lng"
                  type="number"
                  step="any"
                  value={selectedLocation.longitude || ''}
                  onChange={(e) => {
                    const lng = parseFloat(e.target.value);
                    if (!isNaN(lng)) {
                      setSelectedLocation({ ...selectedLocation, longitude: lng });
                      // Auto-fill location name if empty
                      if (!selectedLocation.location_name) {
                        setSelectedLocation(prev => ({ 
                          ...prev, 
                          longitude: lng,
                          location_name: `Location at ${selectedLocation.latitude?.toFixed(6) || '...'}, ${lng.toFixed(6)}`
                        }));
                      }
                    }
                  }}
                  placeholder="e.g., 95.9560"
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Map
            </div>
                            <div className="flex items-center gap-2">
                  {/* Map Layer Selector */}
                  <Select value={mapLayer} onValueChange={(value: MapLayerType) => setMapLayer(value)}>
                    <SelectTrigger className="w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MAP_LAYERS).map(([key, layer]) => {
                        const IconComponent = layer.icon;
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-3 w-3" />
                              {layer.name}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShouldResetMap(true)}
                    className="text-xs"
                    title="Reset view to Myanmar"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset View
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className="text-xs"
                    title={showHeatmap ? "Switch to Pin View" : "Switch to Heat Map View"}
                  >
                    {showHeatmap ? (
                      <>
                        <MapPin className="h-3 w-3 mr-1" />
                        Show Pins
                      </>
                    ) : (
                      <>
                        <Flame className="h-3 w-3 mr-1" />
                        Show Heat Map
                      </>
                    )}
                  </Button>
                </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full relative rounded-lg overflow-hidden">
            {isMapLoaded && L && useMapEventsHook && (
              <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
                className="leaflet-map-container"
                ref={mapRef}
                // Explicitly enable all interactions
                dragging={true}
                touchZoom={true}
                scrollWheelZoom={true}
                doubleClickZoom={true}
                boxZoom={true}
                keyboard={true}
                zoomControl={true}
                attributionControl={true}
                // Don't use gestureHandling for now to debug
                // gestureHandling={true}
                whenReady={() => {
                  console.log('🗺️ Map is ready, setting up interactions...');
                  
                  if (mapRef.current) {
                    const leafletMap = mapRef.current;
                    
                    // Force enable all interactions
                    if (leafletMap.dragging) {
                      leafletMap.dragging.enable();
                      console.log('✅ Dragging enabled');
                    }
                    if (leafletMap.scrollWheelZoom) {
                      leafletMap.scrollWheelZoom.enable();
                      console.log('✅ Scroll wheel zoom enabled');
                    }
                    if (leafletMap.touchZoom) {
                      leafletMap.touchZoom.enable();
                      console.log('✅ Touch zoom enabled');
                    }
                    if (leafletMap.doubleClickZoom) {
                      leafletMap.doubleClickZoom.enable();
                      console.log('✅ Double click zoom enabled');
                    }
                    if (leafletMap.boxZoom) {
                      leafletMap.boxZoom.enable();
                      console.log('✅ Box zoom enabled');
                    }
                    if (leafletMap.keyboard) {
                      leafletMap.keyboard.enable();
                      console.log('✅ Keyboard navigation enabled');
                    }
                    
                    // Add event listeners to verify interactions work
                    leafletMap.on('dragstart', () => console.log('🚀 Drag started'));
                    leafletMap.on('drag', () => console.log('🚀 Dragging...'));
                    leafletMap.on('dragend', () => console.log('🚀 Drag ended'));
                    leafletMap.on('zoomstart', () => console.log('🔍 Zoom started'));
                    leafletMap.on('zoomend', () => console.log('🔍 Zoom ended'));
                    
                    console.log('🔧 Final check - Interactions enabled:');
                    console.log('- Dragging:', leafletMap.dragging?.enabled() || false);
                    console.log('- Scroll wheel:', leafletMap.scrollWheelZoom?.enabled() || false);
                    console.log('- Touch zoom:', leafletMap.touchZoom?.enabled() || false);
                  }
                }}
              >
                <TileLayer
                  attribution={MAP_LAYERS[mapLayer].attribution}
                  url={MAP_LAYERS[mapLayer].url}
                  keepBuffer={2}
                  updateWhenIdle={false}
                  updateWhenZooming={true}
                  tileSize={256}
                  maxZoom={19}
                  minZoom={1}
                />
                
                {/* Existing location markers */}
                {/* Duplicate coordinate detection */}
                {(() => {
                  const tolerance = 0.0001;
                  const duplicateGroups: Location[][] = [];
                  const processed = new Set<string>();
                  
                  locations.forEach(location => {
                    if (!location.id || processed.has(location.id)) return;
                    
                    const duplicates = locations.filter(loc => 
                      loc.latitude !== undefined && location.latitude !== undefined &&
                      loc.longitude !== undefined && location.longitude !== undefined &&
                      Math.abs(loc.latitude - location.latitude) < tolerance &&
                      Math.abs(loc.longitude - location.longitude) < tolerance
                    );
                    
                    if (duplicates.length > 1) {
                      duplicateGroups.push(duplicates);
                      duplicates.forEach(dup => dup.id && processed.add(dup.id));
                    } else {
                      location.id && processed.add(location.id);
                    }
                  });
                  
                  if (duplicateGroups.length > 0) {
                    console.warn('🚫 DUPLICATE COORDINATES DETECTED:', duplicateGroups);
                  }
                  
                  return null;
                })()}
                
                {/* PIN VIEW - Only show when heatmap is OFF */}
                {!showHeatmap && locations.map((location, index) => {
                  if (!location.latitude || !location.longitude) {
                    console.warn('Skipping location with missing coordinates:', location);
                    return null;
                  }
                  
                  // Debug log for each marker being rendered
                  console.log(`📍 Rendering marker ${index + 1}/${locations.length}:`, {
                    name: location.location_name,
                    lat: location.latitude,
                    lng: location.longitude,
                    latType: typeof location.latitude,
                    lngType: typeof location.longitude,
                    position: [location.latitude, location.longitude],
                    googleMapsUrl: `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                  });
                  
                  // Validate coordinates are within Myanmar bounds
                  const isValidLat = location.latitude >= 20.69 && location.latitude <= 22.74;
                  const isValidLng = location.longitude >= 94.35 && location.longitude <= 99.15;
                  
                  if (!isValidLat || !isValidLng) {
                    console.warn(`⚠️ Marker outside Myanmar bounds:`, {
                      name: location.location_name,
                      lat: location.latitude,
                      lng: location.longitude,
                      isValidLat,
                      isValidLng
                    });
                  }
                  
                  return (
                    <Marker
                      key={location.id}
                      position={[location.latitude, location.longitude]}
                      icon={markerIcon || undefined}
                      eventHandlers={{
                        click: () => {
                          console.log('🎯 CLICKED MARKER:', {
                            name: location.location_name,
                            inputCoords: [location.latitude, location.longitude],
                            shouldBeAt: `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                          });
                          setSelectedMarkerId(location.id || null);
                        },
                      }}
                    >
                      {selectedMarkerId === location.id && (
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-medium">{location.location_name}</h3>
                            <p className="text-sm text-gray-600">{location.address}</p>
                            <div className="text-xs text-blue-600 font-mono mt-2 bg-blue-50 p-1 rounded">
                              📍 Lat: {location.latitude?.toFixed(6)}<br/>
                              📍 Lng: {location.longitude?.toFixed(6)}
                            </div>
                            {location.description && (
                              <p className="text-sm text-gray-500 mt-1">{location.description}</p>
                            )}
                          </div>
                        </Popup>
                      )}
                    </Marker>
                  );
                })}
                
                {/* Test marker for debugging - DEFAULT ICON */}

                

                

                

                
                <MapReset shouldReset={shouldResetMap} onResetComplete={handleResetComplete} />
                <MapBounds locations={locations} />
                <MapInitializer />
                <MapEvents onMapClick={handleMapClick} />
                
                {/* HEATMAP VIEW - Only show when toggle is ON */}
                {showHeatmap && <HeatmapLayer locations={locations} />}
              </MapContainer>
            )}
            
            {/* Loading state when map isn't ready */}
            {(!isMapLoaded || !L || !useMapEventsHook) && (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <div className="text-sm text-gray-600">Loading map...</div>
                </div>
              </div>
            )}
            
            {/* Map instructions and debug info */}
            <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded shadow text-xs text-gray-600 pointer-events-none space-y-1">
              <div>💡 Click on the map to add a location</div>
              <div>🖱️ Try dragging the map to pan around</div>
              <div>🔍 Use mouse wheel to zoom</div>
              <div>📍 Locations: {locations?.length || 0}</div>
              {locations?.length > 0 && (
                <div>📊 Valid coords: {locations.filter(l => l.latitude && l.longitude).length}</div>
              )}
              {locations?.length > 0 && (
                <div className="mt-2 text-blue-600 font-bold">🎯 Click pins to see their coordinates!</div>
              )}
              {/* Debug: Show coordinate ranges */}
              {locations?.length > 1 && (() => {
                const validLocs = locations.filter(l => l.latitude !== undefined && l.longitude !== undefined);
                const lats = validLocs.map(l => l.latitude!);
                const lngs = validLocs.map(l => l.longitude!);
                return (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <div className="font-semibold">Debug Info:</div>
                    <div>Lat range: {Math.min(...lats).toFixed(2)} - {Math.max(...lats).toFixed(2)}</div>
                    <div>Lng range: {Math.min(...lngs).toFixed(2)} - {Math.max(...lngs).toFixed(2)}</div>
                  </div>
                );
              })()}
            </div>



            {/* View mode indicator */}
            {locations?.length > 0 && (
              <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded shadow text-xs text-gray-600 pointer-events-none">
                <div className="font-semibold">
                  {showHeatmap ? '🔥 Heat Map View' : '📍 Pin View'} ({locations.length} locations)
                </div>
              </div>
            )}
          </div>
          
          {/* Location Details from Map Click */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Location Details</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="state-region" className="text-xs text-gray-500">State/Region/Union Territory</Label>
                <Input
                  id="state-region"
                  value={selectedLocation.state_region_name || ''}
                  className="bg-gray-100 text-gray-500 cursor-not-allowed"
                  placeholder="Click on map to auto-fill"
                  readOnly
                  disabled
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="township" className="text-xs text-gray-500">Township</Label>
                  <Input
                    id="township"
                    value={selectedLocation.township_name || ''}
                    className="bg-gray-100 text-gray-500 cursor-not-allowed"
                    placeholder="Click on map"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="village" className="text-xs text-gray-500">Village</Label>
                  <Input
                    id="village"
                    value={selectedLocation.village_name || ''}
                    className="bg-gray-100 text-gray-500 cursor-not-allowed"
                    placeholder="Click on map"
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Location Form */}
      {isAddingLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Location
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingLocation(false);
                  setSelectedLocation({});
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location-name">Location Name *</Label>
                <Input
                  id="location-name"
                  value={selectedLocation.location_name || ''}
                  onChange={(e) => setSelectedLocation({ ...selectedLocation, location_name: e.target.value })}
                  placeholder="Enter location name"
                />
              </div>
              <div>
                <Label htmlFor="location-type">Type</Label>
                <Select
                  value={selectedLocation.site_type || 'project_site'}
                  onValueChange={(value) => setSelectedLocation({ ...selectedLocation, site_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project_site">Project Site</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="field_office">Field Office</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="training_center">Training Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="location-description">Description</Label>
              <Textarea
                id="location-description"
                value={selectedLocation.description || ''}
                onChange={(e) => setSelectedLocation({ ...selectedLocation, description: e.target.value })}
                placeholder="Enter location description"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="location-address">Address</Label>
              <Input
                id="location-address"
                value={selectedLocation.address || ''}
                onChange={(e) => setSelectedLocation({ ...selectedLocation, address: e.target.value })}
                placeholder="Address"
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={saveLocation} className="flex-1">
                {editingLocation ? 'Update Location' : 'Add Location'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingLocation(false);
                  setSelectedLocation({});
                  setEditingLocation(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Locations */}
      {locations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Saved Locations ({locations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locations.map((location) => (
                <div key={location.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    {/* Map Thumbnail */}
                    <MapThumbnail location={location} />
                    
                    {/* Location Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{location.location_name}</h3>
                          <p className="text-xs text-gray-600 mt-1">{location.address}</p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLocation(location);
                              setEditingLocation(location.id || null);
                              setIsAddingLocation(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteLocation(location.id || '')}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Administrative details */}
                      {(location.state_region_name || location.township_name || location.village_name) && (
                        <div className="space-y-1 text-xs text-gray-500 mb-2">
                          {location.state_region_name && (
                            <div>📍 State/Region: {location.state_region_name}</div>
                          )}
                          <div className="flex gap-4">
                            {location.township_name && (
                              <div>🏘️ Township: {location.township_name}</div>
                            )}
                            {location.village_name && (
                              <div>🏡 Village: {location.village_name}</div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {location.description && (
                        <p className="text-xs text-gray-500 mb-2">{location.description}</p>
                      )}
                      
                      <div className="text-xs text-gray-400 font-mono">
                        {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
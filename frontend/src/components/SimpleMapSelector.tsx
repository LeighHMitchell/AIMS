'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Map, Edit, Trash2, Plus, X, RotateCcw, Layers, Satellite, Mountain, Home, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { LocationTypeSelect } from '@/components/forms/LocationTypeSelect';
import { getLocationTypeLabel } from '@/data/location-types';
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
const ZoomControl = dynamic(
  () => import('react-leaflet').then((mod) => mod.ZoomControl),
  { ssr: false }
);
const AttributionControl = dynamic(
  () => import('react-leaflet').then((mod) => mod.AttributionControl),
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
      
      // Load leaflet.heat plugin for heatmap functionality
      try {
        require('leaflet.heat');
        console.log('✅ Leaflet heat plugin loaded successfully');
      } catch (e) {
        console.warn('⚠️ Leaflet heat plugin not loaded, heatmap functionality disabled:', e);
      }
      
      // Fix marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    } catch (error) {
      console.error('Failed to load Leaflet dependencies:', error);
    }
  }
};

// Create local SVG marker icon (no external dependencies)
function createLocalMarkerIcon() {
  // Ensure Leaflet is loaded
  if (typeof window === 'undefined' || !L) {
    return null;
  }
  // Create a bright red pin SVG as data URL
  const svgPin = `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.3 12.5 28.5 12.5 28.5s12.5-20.2 12.5-28.5C25 5.6 19.4 0 12.5 0z" fill="#e74c3c"/>
    <circle cx="12.5" cy="12.5" r="6" fill="white"/>
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
    console.error('❌ Failed to create local SVG icon:', error);
    return null;
  }
}

// Create selected marker icon (different color)
function createSelectedMarkerIcon() {
  if (typeof window === 'undefined' || !L) {
    return null;
  }
  
  const svgPin = `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.3 12.5 28.5 12.5 28.5s12.5-20.2 12.5-28.5C25 5.6 19.4 0 12.5 0z" fill="#3498db"/>
    <circle cx="12.5" cy="12.5" r="6" fill="white"/>
  </svg>`;
  
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgPin)}`;
  
  try {
    return new L.Icon({
      iconUrl: svgDataUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      className: 'custom-pin-marker selected'
    });
  } catch (error) {
    console.error('❌ Failed to create selected marker icon:', error);
    return null;
  }
}

// Map layer configurations
type MapLayerType = 'streets' | 'satellite' | 'terrain';

const MAP_LAYERS = {
  streets: {
    name: 'Streets',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors, © CARTO',
    icon: Layers
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    icon: Satellite
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap',
    icon: Mountain
  }
};

// Location interface (matching LocationSelector.tsx)
interface Location {
  id?: string;
  activity_id?: string;
  location_type: 'site' | 'coverage';
  location_name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state_province?: string;
  country?: string;
  postal_code?: string;
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

// Save status interface
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
      map.setView([19.5, 96.0], 6);
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
      console.log('🗺️ MapBounds: No valid locations, keeping current view');
      return;
    }
    
    if (validLocations.length === 1) {
      // For single location, center on it
      const loc = validLocations[0];
      console.log('🗺️ MapBounds: Single location, centering on:', loc.location_name);
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
      
      // Force refresh map size
      setTimeout(() => {
        console.log('🔄 Forcing map refresh...');
        map.invalidateSize();
        console.log('✅ Map size invalidated and refreshed');
      }, 100);
      
      // Additional interaction setup
      setTimeout(() => {
        if (map.getContainer) {
          const container = map.getContainer();
          if (container) {
            container.style.cursor = 'grab';
            console.log('🎯 Map cursor set to grab');
          }
        }
      }, 200);
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
            0.0: 'blue',
            0.2: 'cyan',
            0.4: 'lime',
            0.6: 'yellow',
            0.8: 'orange',
            1.0: 'red'
          }
        });
        
        map.addLayer(heatLayer);
        heatLayerRef.current = heatLayer;
        console.log('✅ Heatmap layer added successfully');
        
      } catch (error) {
        console.error('Error creating heatmap:', error);
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
function MapThumbnail({ location, mapLayer = 'streets' }: { location: Location; mapLayer?: MapLayerType }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  if (!location.latitude || !location.longitude) {
    console.log('MapThumbnail: Missing coordinates for location:', location.location_name);
    return (
      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
          <MapPin className="h-6 w-6 text-gray-400" />
      </div>
    );
  }

  // Use memoized URLs to prevent unnecessary re-renders
  const mapUrls = useMemo(() => {
    const lat = location.latitude!;
    const lng = location.longitude!;
    
    // Primary: Use Mapbox static API for all map types (more reliable)
    const mapboxToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
    
    let primaryUrl = '';
    let fallbackUrl = '';
    
    switch (mapLayer) {
      case 'satellite':
        // Mapbox satellite
        primaryUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/pin-s+ff0000(${lng},${lat})/${lng},${lat},14,0/128x128@2x?access_token=${mapboxToken}`;
        // Esri fallback
        fallbackUrl = `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&bboxSR=4326&size=128,128&imageSR=4326&format=png&f=image`;
        break;
      case 'terrain':
        // Mapbox terrain
        primaryUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/pin-s+ff0000(${lng},${lat})/${lng},${lat},14,0/128x128@2x?access_token=${mapboxToken}`;
        // OSM topo fallback
        fallbackUrl = `https://tile.opentopomap.org/${Math.floor(14)}/${Math.floor((lng + 180) * Math.pow(2, 14) / 360)}/${Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) * Math.pow(2, 13))}.png`;
        break;
      case 'streets':
      default:
        // Mapbox streets
        primaryUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${lng},${lat})/${lng},${lat},14,0/128x128@2x?access_token=${mapboxToken}`;
        // OSM fallback with a tile approach
        const osmZoom = 14;
        const osmX = Math.floor((lng + 180) / 360 * Math.pow(2, osmZoom));
        const osmY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, osmZoom));
        fallbackUrl = `https://tile.openstreetmap.org/${osmZoom}/${osmX}/${osmY}.png`;
        break;
    }
    
    return { primaryUrl, fallbackUrl };
  }, [location.latitude, location.longitude, mapLayer]);

  // Reset state when location or map layer changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
  }, [location.latitude, location.longitude, mapLayer]);

  console.log('MapThumbnail: Rendering thumbnail for:', location.location_name, 'with layer:', mapLayer);

    return (
    <div className="w-16 h-16 rounded overflow-hidden border bg-gray-100 relative">
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-pulse">
            <MapPin className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      )}
      
      {hasError ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <MapPin className="h-4 w-4 text-gray-400" />
        </div>
      ) : (
        <img
          key={`${location.id}-${mapLayer}-${retryCount}`}
          src={retryCount === 0 ? mapUrls.primaryUrl : mapUrls.fallbackUrl}
          alt={`Map of ${location.location_name}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onLoad={() => {
            console.log('MapThumbnail: Successfully loaded map for:', location.location_name);
            setIsLoading(false);
            setHasError(false);
          }}
          onError={(e) => {
            console.error('MapThumbnail: Failed to load map for:', location.location_name, 'Retry count:', retryCount);
            
            if (retryCount === 0) {
              // Try fallback URL
              console.log('MapThumbnail: Trying fallback URL for:', location.location_name);
              setRetryCount(1);
            } else {
              // Both failed, show placeholder
            console.log('MapThumbnail: All map services failed for:', location.location_name);
            setIsLoading(false);
            setHasError(true);
            }
          }}
        />
      )}
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
  const [selectedLocation, setSelectedLocation] = useState<Partial<Location>>({
    location_type: 'site',
    site_type: ''
  });
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [shouldResetMap, setShouldResetMap] = useState(false);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('streets');
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
  const [editingLocationData, setEditingLocationData] = useState<Location | null>(null);
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

  const selectedMarkerIcon = useMemo(() => {
    if (typeof window === 'undefined' || !L || !useMapEventsHook || !isMapLoaded) {
      return null;
    }
    return createSelectedMarkerIcon();
  }, [isMapLoaded]);

  // Load Leaflet dependencies on component mount
  useEffect(() => {
        loadLeafletDependencies();
    
    // Check if dependencies loaded successfully
    const checkInterval = setInterval(() => {
        if (L && useMapEventsHook) {
          setIsMapLoaded(true);
          console.log('✅ Leaflet dependencies loaded and map ready');
        } else {
          console.warn('⚠️ Leaflet dependencies not fully loaded');
          setIsMapLoaded(false);
        }
      clearInterval(checkInterval);
    }, 100);

    return () => clearInterval(checkInterval);
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
    }, 300);

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
        site_type: '',
        latitude: lat,
        longitude: lng,
        address: data.display_name || `${lat}, ${lng}`,
        description: '',
        // Populate new address fields from reverse geocoding
        address_line_2: address.house_number && address.road ? `${address.house_number} ${address.road}` : address.road || '',
        city: address.city || address.town || address.village || address.hamlet || '',
        state_province: address.state || address.region || address.province || '',
        country: address.country || '',
        postal_code: address.postcode || '',
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

  // Handle coordinate entry and trigger reverse geocoding + map centering
  const handleCoordinateEntry = useCallback(async (lat: number, lng: number) => {
    console.log('📍 Coordinates entered:', lat, lng);
    
    // Center the map on the new coordinates
    if (mapRef.current) {
      const map = mapRef.current;
      map.setView([lat, lng], 14); // Zoom level 14 for detailed view
      console.log('🗺️ Map centered on entered coordinates');
    }
    
    try {
      // Reverse geocode to get detailed address information
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`
      );
      const data = await response.json();
      
      // Extract administrative details from the address components
      const address = data.address || {};
      console.log('🏛️ Address details from coordinates:', address);
      
      // Update the selected location with reverse geocoded data
      setSelectedLocation(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        address: data.display_name || `${lat}, ${lng}`,
        // Populate address fields from reverse geocoding
        address_line_2: address.house_number && address.road ? `${address.house_number} ${address.road}` : address.road || '',
        city: address.city || address.town || address.village || address.hamlet || '',
        state_province: address.state || address.region || address.province || '',
        country: address.country || '',
        postal_code: address.postcode || '',
        // Extract administrative levels for Myanmar
        state_region_name: address.state || address.region || address.province || '',
        state_region_code: address.state_code || '',
        township_name: address.township || address.county || address.municipality || '',
        township_code: address.township_code || '',
        village_name: address.village || address.hamlet || address.suburb || address.neighbourhood || '',
      }));
      
      console.log('✅ Location details updated from coordinates');
    } catch (error) {
      console.error('Error reverse geocoding coordinates:', error);
      toast.error('Failed to get location details for coordinates');
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
              address_line_1: selectedLocation.address_line_1 || '',
              address_line_2: selectedLocation.address_line_2 || '',
              city: selectedLocation.city || '',
              state_province: selectedLocation.state_province || '',
              country: selectedLocation.country || '',
              postal_code: selectedLocation.postal_code || '',
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
        site_type: selectedLocation.site_type || '',
        latitude: selectedLocation.latitude || 0,
        longitude: selectedLocation.longitude || 0,
        address: selectedLocation.address || '',
        address_line_1: selectedLocation.address_line_1 || '',
        address_line_2: selectedLocation.address_line_2 || '',
        city: selectedLocation.city || '',
        state_province: selectedLocation.state_province || '',
        country: selectedLocation.country || '',
        postal_code: selectedLocation.postal_code || '',
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

    setSelectedLocation({
      location_type: 'site',
      site_type: ''
    });
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
    <div className="space-y-6 w-full">
      {/* Map on Left, Add Location and Location Details Stacked on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        {/* Map Section - Left Side (Full Height) */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
              Map
            </div>
                            <div className="flex items-center gap-2">
                  <Select value={mapLayer} onValueChange={(value: MapLayerType) => setMapLayer(value)}>
                    <SelectTrigger className="w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="streets">Streets</SelectItem>
                      <SelectItem value="satellite">Satellite</SelectItem>
                      <SelectItem value="terrain">Terrain</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShouldResetMap(true);
                      setTimeout(() => setShouldResetMap(false), 100);
                    }}
                    className="text-xs"
                    title="Reset view to Myanmar"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset View
                  </Button>
                </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-full w-full relative rounded-lg overflow-hidden">
            {isMapLoaded && L && useMapEventsHook ? (
              <MapContainer
                ref={mapRef}
                    center={[19.5, 96.0]}
                    zoom={6}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    attributionControl={false}
                whenReady={() => {
                      console.log('Map is ready');
                      setIsMapLoaded(true);
                    }}
                  >
                    <ZoomControl position="topright" />
                    <AttributionControl position="bottomleft" prefix={false} />
                    
                <TileLayer
                  attribution={MAP_LAYERS[mapLayer].attribution}
                  url={MAP_LAYERS[mapLayer].url}
                  keepBuffer={2}
                  updateWhenIdle={false}
                      updateWhenZooming={false}
                    />
                    
                {!showHeatmap && locations.map((location, index) => {
                  if (!location.latitude || !location.longitude) {
                    console.warn('Skipping location with missing coordinates:', location);
                    return null;
                  }
                  
                      const position: [number, number] = [location.latitude!, location.longitude!];
                      const isSelected = selectedMarkerId === location.id;
                  
                  return (
                    <Marker
                          key={location.id || `location-${index}`}
                          position={position}
                          icon={isSelected ? selectedMarkerIcon : markerIcon}
                      eventHandlers={{
                        click: () => {
                              console.log('Marker clicked:', location.location_name);
                          setSelectedMarkerId(location.id || null);
                        },
                      }}
                    >
                        <Popup>
                            <div className="text-sm">
                              <div className="font-semibold mb-1">{location.location_name}</div>
                            {location.description && (
                                <div className="text-gray-600 mb-2">{location.description}</div>
                              )}
                              <div className="text-xs text-gray-500 space-y-1">
                                {location.state_region_name && (
                                  <div>📍 {location.state_region_name}</div>
                                )}
                                {location.township_name && (
                                  <div>🏘️ {location.township_name}</div>
                                )}
                                {location.village_name && (
                                  <div>🏡 {location.village_name}</div>
                                )}
                                <div className="font-mono">
                                  {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                                </div>
                              </div>
                          </div>
                        </Popup>
                    </Marker>
                  );
                })}
                
                <MapBounds locations={locations} />
                <MapInitializer />
                <MapEvents onMapClick={handleMapClick} />
                <MapReset 
                  shouldReset={shouldResetMap} 
                  onResetComplete={() => setShouldResetMap(false)} 
                />
                
                {showHeatmap && <HeatmapLayer locations={locations} />}
              </MapContainer>
            ) : null}
            
            {(!isMapLoaded || !L || !useMapEventsHook) && (
                  <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <div className="text-sm text-gray-600">Loading map...</div>
                </div>
              </div>
            )}
            
                {isAddingLocation && (
                  <div className="absolute top-4 left-4 bg-blue-500 text-white p-3 rounded-lg shadow-lg text-sm max-w-xs">
                    <div className="font-semibold mb-1">📍 Click on the map</div>
                    <div>Click anywhere on the map to add a new location at that point.</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingLocation(false)}
                      className="mt-2 text-white hover:bg-blue-600 p-1 h-auto"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

            {locations?.length > 0 && (
              <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded shadow text-xs text-gray-600 pointer-events-none">
                <div className="font-semibold">
                  {showHeatmap ? '🔥 Heat Map View' : '📍 Pin View'} ({locations.length} locations)
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
          </div>
          
        {/* Right Side - Add Location and Location Details Stacked */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Add Location Card */}
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Add Location
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="relative search-container">
                <Input
                  placeholder="Search for a location..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  onBlur={() => {
                    // Delay hiding dropdown to allow click events on dropdown items
                    setTimeout(() => {
                      setShowDropdown(false);
                      // Clear search if no location was selected
                      if (!selectedLocation.location_name) {
                        setSearchQuery('');
                      }
                    }, 200);
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                  className="pr-10"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              </div>
                )}
                
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => {
                          const address = result.address || {};
                          
                          // Parse the display name to extract address components
                          const displayParts = result.display_name.split(',').map((part: string) => part.trim());
                          
                          const newLocation: Partial<Location> = {
                            location_name: result.name || displayParts[0],
                            location_type: 'site',
                            site_type: '',
                            latitude: parseFloat(result.lat),
                            longitude: parseFloat(result.lon),
                            address: result.display_name,
                            description: '',
                            // Populate new address fields
                            address_line_2: address.house_number && address.road ? `${address.house_number} ${address.road}` : address.road || '',
                            city: address.city || address.town || address.village || address.hamlet || '',
                            state_province: address.state || address.region || address.province || '',
                            country: address.country || '',
                            postal_code: address.postcode || '',
                            // Keep existing Myanmar-specific fields
                            state_region_name: address.state || address.region || address.province || '',
                            state_region_code: address.state_code || '',
                            township_name: address.township || address.county || address.municipality || '',
                            township_code: address.township_code || '',
                            village_name: address.village || address.hamlet || address.suburb || address.neighbourhood || '',
                          };
                          
                          // Center the map on the selected search result
                          if (mapRef.current) {
                            const map = mapRef.current;
                            map.setView([parseFloat(result.lat), parseFloat(result.lon)], 14);
                            console.log('🗺️ Map centered on search result:', result.name || displayParts[0]);
                          }
                          
                          setSelectedLocation(newLocation);
                          setSearchQuery(result.name || displayParts[0]);
                          setShowDropdown(false);
                          setIsAddingLocation(true);
                        }}
                      >
                        <div className="font-medium">{result.name || result.display_name.split(',')[0]}</div>
                        <div className="text-xs text-gray-500">{result.display_name}</div>
              </div>
                    ))}
                  </div>
                )}
            </div>
            
              <div className="mt-4 space-y-3">
                <div className="text-sm font-medium text-gray-700">Or enter coordinates manually:</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                  <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={selectedLocation.latitude || ''}
                      onChange={(e) => {
                        const newLat = parseFloat(e.target.value) || undefined;
                        setSelectedLocation(prev => {
                          const updated = { ...prev, latitude: newLat };
                          // Center map if both lat and lng are valid
                          if (updated.latitude && updated.longitude && mapRef.current) {
                            const map = mapRef.current;
                            map.setView([updated.latitude, updated.longitude], 14);
                            console.log('🗺️ Map centered on entered coordinates:', updated.latitude, updated.longitude);
                          }
                          return updated;
                        });
                      }}
                      placeholder="e.g., 16.8661"
                      className="text-sm"
                  />
                </div>
                <div>
                    <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                  <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={selectedLocation.longitude || ''}
                      onChange={(e) => {
                        const newLng = parseFloat(e.target.value) || undefined;
                        setSelectedLocation(prev => {
                          const updated = { ...prev, longitude: newLng };
                          // Center map if both lat and lng are valid
                          if (updated.latitude && updated.longitude && mapRef.current) {
                            const map = mapRef.current;
                            map.setView([updated.latitude, updated.longitude], 14);
                            console.log('🗺️ Map centered on entered coordinates:', updated.latitude, updated.longitude);
                          }
                          return updated;
                        });
                      }}
                      placeholder="e.g., 95.9560"
                      className="text-sm"
                  />
                </div>
              </div>
            </div>

        </CardContent>
      </Card>

          {/* Location Details Card */}
          <Card className="flex-1 flex flex-col">
          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Location Details
            </CardTitle>
          </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {/* Location Name */}
              <div>
                <Label htmlFor="location-name" className="text-xs">Location Name</Label>
                <Input
                  id="location-name"
                  value={selectedLocation.location_name || ''}
                  onChange={(e) => setSelectedLocation(prev => ({
                    ...prev,
                    location_name: e.target.value
                  }))}
                  placeholder="Enter location name"
                  className="text-sm"
                />
              </div>

              {/* Location Type */}
              <div>
                <Label htmlFor="location-type" className="text-xs">Location Type</Label>
                <LocationTypeSelect
                  value={selectedLocation.site_type || ''}
                  onValueChange={(value) => setSelectedLocation(prev => ({
                    ...prev,
                    site_type: value
                  }))}
                  className="text-sm"
                />
              </div>

              {/* Address Line 1 */}
              <div>
                <Label htmlFor="address-line-1" className="text-xs">Address Line 1</Label>
                <Input
                  id="address-line-1"
                  value={selectedLocation.address_line_1 || ''}
                  onChange={(e) => setSelectedLocation(prev => ({
                    ...prev,
                    address_line_1: e.target.value
                  }))}
                  placeholder="Street address, building name, etc."
                  className="text-sm"
                />
              </div>

              {/* Address Line 2 */}
              <div>
                <Label htmlFor="address-line-2" className="text-xs">Address Line 2</Label>
                <Input
                  id="address-line-2"
                  value={selectedLocation.address_line_2 || ''}
                  onChange={(e) => setSelectedLocation(prev => ({
                    ...prev,
                    address_line_2: e.target.value
                  }))}
                  placeholder="Apartment, suite, unit, etc."
                  className="text-sm"
                />
            </div>
            
              {/* City, State/Province */}
              <div className="grid grid-cols-2 gap-3">
            <div>
                  <Label htmlFor="city" className="text-xs">City</Label>
                  <Input
                    id="city"
                    value={selectedLocation.city || ''}
                    onChange={(e) => setSelectedLocation(prev => ({
                      ...prev,
                      city: e.target.value
                    }))}
                    placeholder="City"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="state-province" className="text-xs">State/Province</Label>
                  <Input
                    id="state-province"
                    value={selectedLocation.state_province || ''}
                    onChange={(e) => setSelectedLocation(prev => ({
                      ...prev,
                      state_province: e.target.value
                    }))}
                    placeholder="State or Province"
                    className="text-sm"
                  />
                </div>
            </div>
            
              {/* Country, Postal Code */}
              <div className="grid grid-cols-2 gap-3">
            <div>
                  <Label htmlFor="country" className="text-xs">Country</Label>
              <Input
                    id="country"
                    value={selectedLocation.country || ''}
                    onChange={(e) => setSelectedLocation(prev => ({
                      ...prev,
                      country: e.target.value
                    }))}
                    placeholder="Country"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="postal-code" className="text-xs">Postal Code</Label>
                  <Input
                    id="postal-code"
                    value={selectedLocation.postal_code || ''}
                    onChange={(e) => setSelectedLocation(prev => ({
                      ...prev,
                      postal_code: e.target.value
                    }))}
                    placeholder="Postal/ZIP code"
                    className="text-sm"
                  />
                </div>
            </div>
            
              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-xs">Description</Label>
                <Textarea
                  id="description"
                  value={selectedLocation.description || ''}
                  onChange={(e) => setSelectedLocation(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  placeholder="Additional details about this location"
                  className="text-sm"
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={saveLocation}
                  className="flex-1"
                  disabled={!selectedLocation.location_name || !selectedLocation.latitude || !selectedLocation.longitude}
                >
                {editingLocation ? 'Update Location' : 'Add Location'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedLocation({
                    location_type: 'site',
                    site_type: ''
                  });
                    setIsAddingLocation(false);
                  setEditingLocation(null);
                    setSearchQuery('');
                }}
              >
                  Clear
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Saved Locations List - Full Width Below */}
      {locations && locations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <h4 className="font-semibold text-gray-900">Saved Locations</h4>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {locations.map((location, index) => {
                const isExpanded = expandedLocationId === location.id;
                const isEditing = editingLocationData?.id === location.id;
                
                return (
                  <div key={location.id} className="border rounded-lg overflow-hidden transition-all duration-300">
                    <div className="p-4">
                  <div className="flex items-start gap-4">
                        <MapThumbnail location={location} mapLayer={mapLayer} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{location.location_name}</h3>
                          {location.site_type && (
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {getLocationTypeLabel(location.site_type)}
                            </p>
                          )}
                          <p className="text-xs text-gray-600 mt-1">{location.address}</p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                  if (isExpanded && isEditing) {
                                    // Close if already expanded and editing
                                    setExpandedLocationId(null);
                                    setEditingLocationData(null);
                                  } else {
                                    // Expand and load location data for editing
                                    setExpandedLocationId(location.id || null);
                                    setEditingLocationData({...location});
                                  }
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
                    
                    {/* Expandable Edit Section */}
                    {isExpanded && editingLocationData && (
                      <div className="border-t bg-gray-50 p-4 space-y-4 animate-in slide-in-from-top duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Location Name */}
                          <div className="md:col-span-2">
                            <Label htmlFor={`edit-name-${location.id}`} className="text-xs">Location Name</Label>
                            <Input
                              id={`edit-name-${location.id}`}
                              value={editingLocationData.location_name || ''}
                              onChange={(e) => setEditingLocationData(prev => prev ? {...prev, location_name: e.target.value} : null)}
                              placeholder="Enter location name"
                              className="text-sm"
                            />
                          </div>

                          {/* Location Type */}
                          <div className="md:col-span-2">
                            <Label htmlFor={`edit-type-${location.id}`} className="text-xs">Location Type</Label>
                            <LocationTypeSelect
                              value={editingLocationData.site_type || ''}
                              onValueChange={(value) => setEditingLocationData(prev => prev ? {...prev, site_type: value} : null)}
                              className="text-sm"
                            />
                          </div>

                          {/* Coordinates */}
                          <div>
                            <Label htmlFor={`edit-lat-${location.id}`} className="text-xs">Latitude *</Label>
                            <Input
                              id={`edit-lat-${location.id}`}
                              type="number"
                              step="any"
                              value={editingLocationData.latitude || ''}
                              onChange={(e) => setEditingLocationData(prev => prev ? {...prev, latitude: parseFloat(e.target.value) || undefined} : null)}
                              placeholder="e.g., 16.8661"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-lng-${location.id}`} className="text-xs">Longitude *</Label>
                            <Input
                              id={`edit-lng-${location.id}`}
                              type="number"
                              step="any"
                              value={editingLocationData.longitude || ''}
                              onChange={(e) => setEditingLocationData(prev => prev ? {...prev, longitude: parseFloat(e.target.value) || undefined} : null)}
                              placeholder="e.g., 95.9560"
                              className="text-sm"
                            />
                          </div>

                          {/* Address Fields */}
                          <div className="md:col-span-2">
                            <Label htmlFor={`edit-addr1-${location.id}`} className="text-xs">Address Line 1</Label>
                            <Input
                              id={`edit-addr1-${location.id}`}
                              value={editingLocationData.address_line_1 || ''}
                              onChange={(e) => setEditingLocationData(prev => prev ? {...prev, address_line_1: e.target.value} : null)}
                              placeholder="Street address, building name, etc."
                              className="text-sm"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <Label htmlFor={`edit-addr2-${location.id}`} className="text-xs">Address Line 2</Label>
                            <Input
                              id={`edit-addr2-${location.id}`}
                              value={editingLocationData.address_line_2 || ''}
                              onChange={(e) => setEditingLocationData(prev => prev ? {...prev, address_line_2: e.target.value} : null)}
                              placeholder="Apartment, suite, unit, etc."
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`edit-city-${location.id}`} className="text-xs">City</Label>
                            <Input
                              id={`edit-city-${location.id}`}
                              value={editingLocationData.city || ''}
                              onChange={(e) => setEditingLocationData(prev => prev ? {...prev, city: e.target.value} : null)}
                              placeholder="City"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-state-${location.id}`} className="text-xs">State/Province</Label>
                            <Input
                              id={`edit-state-${location.id}`}
                              value={editingLocationData.state_province || ''}
                              onChange={(e) => setEditingLocationData(prev => prev ? {...prev, state_province: e.target.value} : null)}
                              placeholder="State or Province"
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`edit-country-${location.id}`} className="text-xs">Country</Label>
                            <Input
                              id={`edit-country-${location.id}`}
                              value={editingLocationData.country || ''}
                              onChange={(e) => setEditingLocationData(prev => prev ? {...prev, country: e.target.value} : null)}
                              placeholder="Country"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-postal-${location.id}`} className="text-xs">Postal Code</Label>
                            <Input
                              id={`edit-postal-${location.id}`}
                              value={editingLocationData.postal_code || ''}
                              onChange={(e) => setEditingLocationData(prev => prev ? {...prev, postal_code: e.target.value} : null)}
                              placeholder="Postal/ZIP code"
                              className="text-sm"
                            />
                          </div>

                          {/* Description */}
                          <div className="md:col-span-2">
                            <Label htmlFor={`edit-desc-${location.id}`} className="text-xs">Description</Label>
                            <Textarea
                              id={`edit-desc-${location.id}`}
                              value={editingLocationData.description || ''}
                              onChange={(e) => setEditingLocationData(prev => prev ? {...prev, description: e.target.value} : null)}
                              placeholder="Additional details about this location"
                              className="text-sm h-20"
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setExpandedLocationId(null);
                              setEditingLocationData(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!editingLocationData.location_name || !editingLocationData.latitude || !editingLocationData.longitude) {
                                toast.error('Please fill in all required fields');
                                return;
                              }

                              // Check for duplicate coordinates (excluding current location)
                              const tolerance = 0.0001;
                              const existingLocationWithSameCoords = locations.find(loc => 
                                loc.id !== editingLocationData.id &&
                                loc.latitude && loc.longitude &&
                                Math.abs(loc.latitude - editingLocationData.latitude!) < tolerance &&
                                Math.abs(loc.longitude - editingLocationData.longitude!) < tolerance
                              );

                              if (existingLocationWithSameCoords) {
                                toast.error(`⚠️ These coordinates are too close to existing location "${existingLocationWithSameCoords.location_name}".`);
                                return;
                              }

                              // Update the location
                              const updatedLocations = locations.map(loc => 
                                loc.id === editingLocationData.id ? editingLocationData : loc
                              );
                              
                              onLocationsChange(updatedLocations);
                              setExpandedLocationId(null);
                              setEditingLocationData(null);
                              toast.success('Location updated successfully');
                            }}
                            disabled={!editingLocationData.location_name || !editingLocationData.latitude || !editingLocationData.longitude}
                          >
                            Update Location
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import { Search, MapPin, X, Pencil, Trash2, Save, XCircle, CheckCircle, AlertCircle, Loader2, HelpCircle, Layers, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { lookupAdminByCoordinates, lookupAdminByName, enhanceLocationWithAdmin } from '@/lib/myanmar-admin-lookup';
import { LocationTypeSelect, getLocationTypeLabel } from '@/components/forms/LocationTypeSelect';

// Dynamic import for Leaflet to avoid SSR issues
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  // Load heat layer plugin
  require('leaflet.heat');
}

// Custom pin icon using SVG with enhanced visibility
const createPinIcon = (color = '#ef4444', size = 32) => {
  if (!L || typeof window === 'undefined') {
    console.warn('[createPinIcon] Leaflet not available or SSR');
    return null;
  }
  
  console.log('[createPinIcon] Creating icon with color:', color, 'size:', size);
  
  try {
    return L.divIcon({
      html: `
        <div style="
          position: relative;
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));
          z-index: 9999 !important;
        ">
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Outer shadow/border for better visibility -->
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#000000" stroke="none" opacity="0.4" transform="translate(1,1)"/>
            <!-- Main pin -->
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="${color}" stroke="#ffffff" stroke-width="3"/>
            <!-- Center circle with stronger contrast -->
            <circle cx="12" cy="10" r="3" fill="#ffffff" stroke="#000000" stroke-width="0.5"/>
          </svg>
        </div>
      `,
      className: 'custom-pin-icon',
      iconSize: [size, size],
      iconAnchor: [size/2, size],
      popupAnchor: [0, -size],
    });
  } catch (error) {
    console.error('[createPinIcon] Error creating icon:', error);
    return null;
  }
};


// Helper function to generate thumbnail map URL
const generateThumbnailMapUrl = (lat: number, lng: number, zoom: number = 13) => {
  const width = 120;
  const height = 80;
  // Using OpenStreetMap tiles via a static map service
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${lng},${lat})/${lng},${lat},${zoom}/${width}x${height}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.rJcFIG214AriISLbB6B5aw`;
};

// Simple tile-based thumbnail without attribution - using satellite view
const generateCleanThumbnailUrl = (lat: number, lng: number, zoom: number = 13) => {
  const width = 120;
  const height = 80;
  // Using satellite tiles to create a clean thumbnail
  const tileSize = 256;
  const scale = Math.pow(2, zoom);
  const worldCoordX = Math.floor((lng + 180) / 360 * scale);
  const worldCoordY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * scale);
  
  // Return satellite tile URL
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${worldCoordY}/${worldCoordX}`;
};

// Types
interface SpecificLocation {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address?: string;
  notes?: string;
  // Administrative data - automatically populated
  stateRegionCode?: string;
  stateRegionName?: string;
  townshipCode?: string;
  townshipName?: string;
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

// Map click handler component - always ready for clicks
function MapClickHandler({ 
  onMapClick
}: { 
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    mousemove: (e) => {
      map.getContainer().style.cursor = 'crosshair';
    },
  });

  useEffect(() => {
    const mapContainer = map.getContainer();
    mapContainer.style.cursor = 'crosshair';
    mapContainer.title = 'Click anywhere on the map to add a new location';

    return () => {
      mapContainer.style.cursor = '';
      mapContainer.title = '';
    };
  }, [map]);

  return null;
}

// Draggable marker component with fixed size for visibility
function DraggableMarker({ 
  position, 
  onPositionChange 
}: { 
  position: [number, number]; 
  onPositionChange: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  
  console.log('[DraggableMarker] Rendering at position:', position);
  
  // Use fixed large size for better visibility - memoized to prevent recreation
  const icon = useMemo(() => createPinIcon('#ef4444', 36), []); // Red color with fixed large size

  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const newPos = marker.getLatLng();
        onPositionChange(newPos.lat, newPos.lng);
      }
    },
  }), [onPositionChange]);

  // Don't render marker if icon is not available (SSR)
  if (!icon) {
    console.warn('[DraggableMarker] Failed to create icon');
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
  const lastCenterRef = useRef<[number, number]>(center);
  const lastZoomRef = useRef<number>(zoom);
  
  useEffect(() => {
    // Only update the map view if the center or zoom has actually changed
    const centerChanged = center[0] !== lastCenterRef.current[0] || center[1] !== lastCenterRef.current[1];
    const zoomChanged = zoom !== lastZoomRef.current;
    
    if (centerChanged || zoomChanged) {
      map.setView(center, zoom);
      lastCenterRef.current = center;
      lastZoomRef.current = zoom;
    }
  }, [map, center, zoom]);
  
  return null;
}

// Dynamic tile layer component
function DynamicTileLayer({ layerType }: { layerType: string }) {
  const layers = {
    streets: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
    },
    topographic: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a>'
    },
    terrain: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  };

  const layer = layers[layerType as keyof typeof layers] || layers.streets;

  return (
    <TileLayer
      url={layer.url}
      attribution={layer.attribution}
      maxZoom={18}
      minZoom={1}
    />
  );
}

// Map layer control component
function MapLayerControl({ 
  currentLayer, 
  onLayerChange 
}: { 
  currentLayer: string;
  onLayerChange: (layer: string) => void;
}) {
  const layers = [
    { id: 'streets', name: 'Streets' },
    { id: 'satellite', name: 'Satellite' },
    { id: 'topographic', name: 'Topographic' },
    { id: 'terrain', name: 'Terrain' }
  ];

  return (
    <div className="absolute top-2 left-2 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-2">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium">Map Style</span>
      </div>
      <div className="space-y-1">
        {layers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => onLayerChange(layer.id)}
            className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors ${
              currentLayer === layer.id ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
            }`}
          >
            {layer.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// Map controls component
function MapControls({ 
  onResetView, 
  onToggleHeatMap, 
  showHeatMap 
}: { 
  onResetView: () => void;
  onToggleHeatMap: () => void;
  showHeatMap: boolean;
}) {
  return (
    <div className="absolute top-2 right-2 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-2">
      <div className="space-y-2">
        <Button
          onClick={onResetView}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset View
        </Button>
        <Button
          onClick={onToggleHeatMap}
          variant="outline"
          size="sm"
          className={`w-full ${showHeatMap ? 'bg-blue-100 text-blue-700' : ''}`}
        >
          {showHeatMap ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
          {showHeatMap ? 'Hide' : 'Show'} Heat Map
        </Button>
      </div>
    </div>
  );
}

// Saved locations markers component with drag-and-drop functionality
function SavedLocationMarkers({ 
  locations, 
  onLocationEdit,
  onLocationMove
}: { 
  locations: SpecificLocation[];
  onLocationEdit: (location: SpecificLocation) => void;
  onLocationMove: (locationId: string, newLat: number, newLng: number) => void;
}) {
  const markers = useMemo(() => {
    if (!locations.length) return null;

    console.log('[SavedLocationMarkers] Rendering', locations.length, 'locations');

    return locations.map((location) => {
      console.log('[SavedLocationMarkers] Rendering location:', location.name, 'at', location.latitude, location.longitude);
      
      // Use a fixed, large size for better visibility
      const savedIcon = createPinIcon('#22c55e', 36); // Green color with fixed large size
      
      if (!savedIcon) {
        console.warn('[SavedLocationMarkers] Failed to create icon for location:', location.name);
        return null;
      }
      
      return (
        <DraggableSavedMarker
          key={location.id}
          location={location}
          icon={savedIcon}
          onLocationEdit={onLocationEdit}
          onLocationMove={onLocationMove}
        />
      );
    });
  }, [locations, onLocationEdit, onLocationMove]);

  return <>{markers}</>;
}

// Individual draggable saved location marker
function DraggableSavedMarker({
  location,
  icon,
  onLocationEdit,
  onLocationMove
}: {
  location: SpecificLocation;
  icon: any;
  onLocationEdit: (location: SpecificLocation) => void;
  onLocationMove: (locationId: string, newLat: number, newLng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const [isDragging, setIsDragging] = useState(false);

  const eventHandlers = {
    dragstart() {
      setIsDragging(true);
      console.log('[DraggableSavedMarker] Started dragging:', location.name);
    },
    dragend() {
      setIsDragging(false);
      const marker = markerRef.current;
      if (marker != null) {
        const newPos = marker.getLatLng();
        console.log('[DraggableSavedMarker] Drag ended for:', location.name, 'New position:', newPos);
        onLocationMove(location.id, newPos.lat, newPos.lng);
      }
    },
  };

  return (
    <Marker
      ref={markerRef}
      position={[location.latitude, location.longitude]}
      icon={icon}
      draggable={true}
      eventHandlers={eventHandlers}
    >
      <Popup>
        <div className="text-sm">
          <h4 className="font-semibold">{location.name}</h4>
          <p className="text-gray-600">
            {getLocationTypeLabel(location.type)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </p>
          {location.address && (
            <p className="text-xs text-gray-600 mt-1">{location.address}</p>
          )}
          {(location.stateRegionName || location.townshipName) && (
            <div className="text-xs text-gray-600 mt-2">
              {location.stateRegionName && (
                <div>📍 {location.stateRegionName}</div>
              )}
              {location.townshipName && (
                <div>🏘️ {location.townshipName}</div>
              )}
            </div>
          )}
          {location.notes && (
            <p className="text-xs text-gray-600 mt-1 italic">{location.notes}</p>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onLocationEdit(location)}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
            >
              Edit Location
            </button>
            <span className="text-xs text-gray-500 px-2 py-1">
              💬 Drag to move
            </span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Heat map layer component for location density visualization with zoom-responsive settings
function LocationHeatMap({ locations }: { locations: SpecificLocation[] }) {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());

  // Update zoom level state
  useEffect(() => {
    const handleZoomEnd = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('zoomend', handleZoomEnd);
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  useEffect(() => {
    if (typeof window === 'undefined' || !L || locations.length < 2) {
      return;
    }

    try {
      // Check if heat layer is available
      if (!L.heatLayer) {
        console.warn('Leaflet.heat plugin not available. Skipping heat map.');
        return;
      }

      // Calculate dynamic heat map settings based on zoom level
      const getHeatMapSettings = (zoom: number) => {
        if (zoom <= 6) {
          // Very zoomed out - large radius, high intensity
          return {
            radius: 25,
            blur: 12,
            minOpacity: 0.6,
            intensity: 1.2
          };
        } else if (zoom <= 8) {
          // Moderately zoomed out
          return {
            radius: 20,
            blur: 10,
            minOpacity: 0.5,
            intensity: 1.0
          };
        } else if (zoom <= 10) {
          // Medium zoom
          return {
            radius: 15,
            blur: 7,
            minOpacity: 0.4,
            intensity: 0.9
          };
        } else {
          // Zoomed in
          return {
            radius: 12,
            blur: 6,
            minOpacity: 0.3,
            intensity: 0.8
          };
        }
      };

      const settings = getHeatMapSettings(currentZoom);

      // Prepare heat map data points with dynamic intensity
      const heatPoints = locations.map(location => [
        location.latitude,
        location.longitude,
        settings.intensity // Dynamic intensity based on zoom
      ]);

      // Remove existing heat layer
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }

      // Create new heat layer with zoom-responsive settings
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: settings.radius,
        blur: settings.blur,
        minOpacity: settings.minOpacity,
        maxZoom: 18, // Increased from 12 to maintain visibility at higher zooms
        gradient: {
          0.0: 'rgba(0, 0, 255, 0)',
          0.2: 'rgba(59, 130, 246, 0.6)', // Blue with transparency
          0.4: 'rgba(34, 197, 94, 0.7)',  // Green
          0.6: 'rgba(245, 158, 11, 0.8)', // Yellow/Orange
          0.8: 'rgba(239, 68, 68, 0.9)',  // Red
          1.0: 'rgba(220, 38, 38, 1.0)'   // Dark red
        }
      }).addTo(map);
    } catch (error) {
      console.warn('Could not load heat map:', error);
    }

    // Cleanup
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, locations, currentZoom]); // Added currentZoom dependency to update on zoom changes

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

// Helper function to format location display text
const formatLocationText = (location: SpecificLocation): string => {
  const parts: string[] = [];
  
  // Add township if available and different from location name
  if (location.townshipName && location.townshipName !== location.name) {
    parts.push(location.townshipName);
  }
  
  // Add state/region if available
  if (location.stateRegionName) {
    parts.push(location.stateRegionName);
  }
  
  // Always add Myanmar
  parts.push('Myanmar');
  
  return parts.join(', ');
};

// Helper function to enhance locations with administrative data
const enhanceLocationWithAdminData = (location: SpecificLocation): SpecificLocation => {
  // If location already has state/region data, return as is
  if (location.stateRegionName) {
    return location;
  }

  // Try to detect administrative data from coordinates
  const adminData = lookupAdminByCoordinates(location.latitude, location.longitude);
  if (adminData) {
    return {
      ...location,
      stateRegionCode: adminData.stateRegionCode,
      stateRegionName: adminData.stateRegionName,
      townshipCode: adminData.townshipCode || location.townshipCode,
      townshipName: adminData.townshipName || location.townshipName,
    };
  }

  return location;
};

export default function LocationSelector({ locations, onLocationsChange }: LocationSelectorProps) {
  // Form state
  const [newLocation, setNewLocation] = useState({
    name: '',
    type: '',
    latitude: 21.9, // Default Myanmar center
    longitude: 95.9,
    address: '',
    notes: '',
    // Administrative data - will be populated automatically
    stateRegionCode: '',
    stateRegionName: '',
    townshipCode: '',
    townshipName: '',
  });

  const [mapCenter, setMapCenter] = useState<[number, number]>([21.9, 95.9]);
  const [mapZoom, setMapZoom] = useState(5); // Zoom level 5 shows the full map of Myanmar
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([21.9, 95.9]);
  const [showMarker, setShowMarker] = useState(false);
  
  // Editing state
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<SpecificLocation>>({});
  
  // Map visualization state
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<NominatimResult[]>([]);
  const [showMapSearchResults, setShowMapSearchResults] = useState(false);
  
  // Map layer state
  const [currentMapLayer, setCurrentMapLayer] = useState('streets');
  
  // Save status state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  // Enhance existing locations with administrative data on mount
  useEffect(() => {
    const enhancedLocations = locations.map(enhanceLocationWithAdminData);
    const hasChanges = enhancedLocations.some((enhanced, index) => 
      enhanced.stateRegionName !== locations[index].stateRegionName
    );
    
    if (hasChanges) {
      console.log('[LocationSelector] Enhancing existing locations with administrative data');
      onLocationsChange(enhancedLocations);
    }
  }, []); // Run only on mount

  // Update marker when coordinates change
  useEffect(() => {
    if (newLocation.latitude && newLocation.longitude) {
      const newPos: [number, number] = [newLocation.latitude, newLocation.longitude];
      setMarkerPosition(newPos);
      setShowMarker(true);
    }
  }, [newLocation.latitude, newLocation.longitude]);

  // Auto-update administrative data when coordinates change (following your guidance)
  useEffect(() => {
    const updateAdminData = async () => {
      if (newLocation.latitude && newLocation.longitude) {
        const geocodeResult = await reverseGeocode(newLocation.latitude, newLocation.longitude);
        
        // Try Myanmar administrative data lookup first
        const adminData = lookupAdminByCoordinates(newLocation.latitude, newLocation.longitude);
        
        setNewLocation(prev => ({
          ...prev,
          // Only update if we don't already have administrative data or if coordinates changed significantly
          stateRegionCode: adminData?.stateRegionCode || prev.stateRegionCode || '',
          stateRegionName: adminData?.stateRegionName || geocodeResult.region || prev.stateRegionName,
          townshipCode: adminData?.townshipCode || prev.townshipCode || '',
          townshipName: adminData?.townshipName || geocodeResult.township || prev.townshipName
        }));
      }
    };

    // Debounce the admin data update to avoid too many API calls
    const timeoutId = setTimeout(updateAdminData, 500);
    return () => clearTimeout(timeoutId);
  }, [newLocation.latitude, newLocation.longitude]);

  // Handle map clicks - now always allows clicking to add locations
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    const geocodeResult = await reverseGeocode(lat, lng);
    
    // Try Myanmar administrative data lookup first (more accurate for Myanmar)
    const adminData = lookupAdminByCoordinates(lat, lng);
    
    setNewLocation(prev => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      address: geocodeResult.displayName ? geocodeResult.displayName.split(',')[0] : '',
      // Use Myanmar lookup data if available, otherwise use reverse geocoding result
      stateRegionCode: adminData?.stateRegionCode || '',
      stateRegionName: adminData?.stateRegionName || geocodeResult.region,
      townshipCode: adminData?.townshipCode || '',
      townshipName: adminData?.townshipName || geocodeResult.township
    }));
    setMapCenter([lat, lng]);
    setMapZoom(12);
  }, []);

  // Map layer functions
  const handleMapLayerChange = useCallback((layerId: string) => {
    setCurrentMapLayer(layerId);
  }, []);

  const handleResetView = useCallback(() => {
    // Reset to show the full map of Myanmar
    setMapCenter([21.9, 95.9]); // Myanmar center
    setMapZoom(5); // Zoom level 5 shows the entire country better
  }, []);

  const handleToggleHeatMap = useCallback(() => {
    setShowHeatMap(prev => !prev);
  }, []);

  // Handle marker drag with enhanced reverse geocoding
  const handleMarkerDrag = useCallback(async (lat: number, lng: number) => {
    const geocodeResult = await reverseGeocode(lat, lng);
    
    // Try Myanmar administrative data lookup first (more accurate for Myanmar)
    const adminData = lookupAdminByCoordinates(lat, lng);
    
    setNewLocation(prev => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      // Use Myanmar lookup data if available, otherwise use reverse geocoding result
      stateRegionCode: adminData?.stateRegionCode || '',
      stateRegionName: adminData?.stateRegionName || geocodeResult.region,
      townshipCode: adminData?.townshipCode || '',
      townshipName: adminData?.townshipName || geocodeResult.township
    }));
  }, []);

  // Handle search result selection
  const handleLocationSelect = useCallback((lat: number, lng: number, address: string) => {
    // Lookup Myanmar administrative data
    const adminData = lookupAdminByCoordinates(lat, lng) || lookupAdminByName(address);
    
    setNewLocation(prev => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      address: address.split(',')[0], // Take first part as location name suggestion
      // Add administrative data
      stateRegionCode: adminData?.stateRegionCode || '',
      stateRegionName: adminData?.stateRegionName || '',
      townshipCode: adminData?.townshipCode || '',
      townshipName: adminData?.townshipName || ''
    }));
    setMapCenter([lat, lng]);
    setMapZoom(12);
  }, []);

  // Enhanced reverse geocoding for administrative data extraction
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
        
        // Extract administrative data from Nominatim response
        const adminData = {
          region: result.address?.state || result.address?.region || result.address?.state_district || '',
          township: result.address?.county || result.address?.suburb || result.address?.municipality || result.address?.village || '',
          displayName: result.display_name || ''
        };
        
        return adminData;
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
    return { region: '', township: '', displayName: '' };
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

  // Add location with save status feedback - type is now optional
  const handleAddLocation = () => {
    if (!newLocation.name) {
      return;
    }

    setSaveStatus('saving');
    setSaveMessage('Adding location...');

    // Ensure we have administrative data by looking it up if missing
    let adminData = {
      stateRegionCode: newLocation.stateRegionCode,
      stateRegionName: newLocation.stateRegionName,
      townshipCode: newLocation.townshipCode,
      townshipName: newLocation.townshipName,
    };

    // If we don't have state/region data, try to look it up
    if (!adminData.stateRegionName) {
      const detectedAdmin = lookupAdminByCoordinates(newLocation.latitude, newLocation.longitude);
      if (detectedAdmin) {
        adminData = {
          stateRegionCode: detectedAdmin.stateRegionCode,
          stateRegionName: detectedAdmin.stateRegionName,
          townshipCode: detectedAdmin.townshipCode || adminData.townshipCode,
          townshipName: detectedAdmin.townshipName || adminData.townshipName,
        };
      }
    }

    const location: SpecificLocation = {
      id: crypto.randomUUID(),
      name: newLocation.name,
      type: newLocation.type || 'other',
      latitude: newLocation.latitude,
      longitude: newLocation.longitude,
      address: newLocation.address,
      notes: newLocation.notes,
      // Include administrative data (detected or provided)
      stateRegionCode: adminData.stateRegionCode,
      stateRegionName: adminData.stateRegionName,
      townshipCode: adminData.townshipCode,
      townshipName: adminData.townshipName,
    };

    onLocationsChange([...locations, location]);

    // Show success feedback
    setSaveStatus('saved');
    setSaveMessage(`✅ "${location.name}" added successfully!`);
    
    // Reset form
    setNewLocation({
      name: '',
      type: '',
      latitude: 21.9,
      longitude: 95.9,
      address: '',
      notes: '',
      // Reset administrative data
      stateRegionCode: '',
      stateRegionName: '',
      townshipCode: '',
      townshipName: '',
    });
    setMapCenter([21.9, 95.9]);
    setMapZoom(6);
    setShowMarker(false);

    // Clear status after 3 seconds
    setTimeout(() => {
      setSaveStatus('idle');
      setSaveMessage('');
    }, 3000);
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

  // Handle location edit from map popup
  const handleLocationEditFromMap = (location: SpecificLocation) => {
    startEditing(location);
    // Scroll to the location in the list for easy editing
    const locationElement = document.getElementById(`location-${location.id}`);
    if (locationElement) {
      locationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Handle location move via drag-and-drop with save status
  const handleLocationMove = useCallback(async (locationId: string, newLat: number, newLng: number) => {
    console.log('[LocationSelector] Moving location:', locationId, 'to', newLat, newLng);
    
    setSaveStatus('saving');
    setSaveMessage('Updating location...');
    
    // Find the location and update its coordinates
    const updatedLocations = locations.map(loc => {
      if (loc.id === locationId) {
        return {
          ...loc,
          latitude: parseFloat(newLat.toFixed(6)),
          longitude: parseFloat(newLng.toFixed(6))
        };
      }
      return loc;
    });
    
    // Update the locations immediately for responsive UI
    onLocationsChange(updatedLocations);
    
    // Show success feedback
    const movedLocation = updatedLocations.find(loc => loc.id === locationId);
    setSaveStatus('saved');
    setSaveMessage(`✅ "${movedLocation?.name}" moved successfully!`);
    
    // Clear status after 3 seconds
    setTimeout(() => {
      setSaveStatus('idle');
      setSaveMessage('');
    }, 3000);
  }, [locations, onLocationsChange]);

  // Handle map search
  const searchTimeout = useRef<NodeJS.Timeout>();
  const handleMapSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setMapSearchResults([]);
      setShowMapSearchResults(false);
      return;
    }

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
        setMapSearchResults(results);
        setShowMapSearchResults(true);
      }
    } catch (error) {
      console.error('Map search error:', error);
    }
  }, []);

  const handleMapSearchChange = useCallback((value: string) => {
    setMapSearchQuery(value);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      handleMapSearch(value);
    }, 500);
  }, [handleMapSearch]);

  const handleMapSearchSelect = useCallback((result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setMapCenter([lat, lng]);
    setMapZoom(12);
    setMapSearchQuery('');
    setMapSearchResults([]);
    setShowMapSearchResults(false);
  }, []);

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
          <AddressSearch onLocationSelect={handleLocationSelect} />
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

        {/* Interactive Map */}
        <div>
          {/* Map Controls Above Map */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              {/* Map Style Dropdown */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Map Style:</Label>
                <Select value={currentMapLayer} onValueChange={handleMapLayerChange}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="streets">Streets</SelectItem>
                    <SelectItem value="satellite">Satellite</SelectItem>
                    <SelectItem value="topographic">Topographic</SelectItem>
                    <SelectItem value="terrain">Terrain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Reset View Button */}
              <Button
                onClick={handleResetView}
                variant="outline"
                size="sm"
                className="h-8"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset View
              </Button>

              {/* Real-time Save Status */}
              {saveStatus !== 'idle' && (
                <div className={`flex items-center gap-1 text-xs ${
                  saveStatus === 'saving' ? 'text-blue-600' :
                  saveStatus === 'saved' ? 'text-green-600' :
                  'text-red-600'
                }`}>
                  {saveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
                  {saveStatus === 'saved' && <CheckCircle className="h-3 w-3" />}
                  {saveStatus === 'error' && <AlertCircle className="h-3 w-3" />}
                  <span>{saveMessage}</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-80 w-full border rounded-md overflow-hidden relative">
            {/* Zoom Controls Overlay */}
            <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-white/95 backdrop-blur-sm shadow-lg"
                onClick={() => setMapZoom(Math.min(mapZoom + 1, 18))}
              >
                +
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-white/95 backdrop-blur-sm shadow-lg"
                onClick={() => setMapZoom(Math.max(mapZoom - 1, 1))}
              >
                −
              </Button>
            </div>

            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              key="map-container"
            >
              <DynamicTileLayer layerType={currentMapLayer} key={`tile-layer-${currentMapLayer}`} />
              <MapController center={mapCenter} zoom={mapZoom} />
              <MapClickHandler onMapClick={handleMapClick} />
              
              {/* Saved locations markers */}
              <SavedLocationMarkers 
                locations={locations}
                onLocationEdit={handleLocationEditFromMap}
                onLocationMove={handleLocationMove}
                key="saved-markers"
              />
              
              {/* Heat map layer */}
              {showHeatMap && locations.length > 1 && (
                <LocationHeatMap locations={locations} key="heat-map" />
              )}
              
              {/* New location marker (red, draggable) - show when user is adding a location */}
              {(newLocation.name || showMarker || (newLocation.latitude !== 21.9 || newLocation.longitude !== 95.9)) && (
                <DraggableMarker
                  position={markerPosition}
                  onPositionChange={handleMarkerDrag}
                  key="draggable-marker"
                />
              )}
            </MapContainer>
          </div>
          <div className="flex justify-between items-center mt-1">
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click anywhere on the map to add a new location</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Administrative Information */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Administrative Area
          </Label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
            {/* State/Region - always show as greyed out box */}
            <div className="text-sm">
              <span className="font-medium">State/Region</span> 
              <div className="mt-1">
                <Input
                  value={newLocation.stateRegionName || ''}
                  placeholder="Auto-generated based on coordinates"
                  disabled
                  className="h-8 text-sm bg-gray-100 text-gray-900"
                />
              </div>
            </div>
            
            {/* Township - always show as greyed out box */}
            <div className="text-sm">
              <span className="font-medium">Township</span> 
              <div className="mt-1">
                <Input
                  value={newLocation.townshipName || ''}
                  placeholder="Auto-generated based on coordinates"
                  disabled
                  className="h-8 text-sm bg-gray-100 text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="location-name" className="text-sm font-medium">
              Location Name
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
              Location Type
            </Label>
            <LocationTypeSelect
              value={newLocation.type}
              onValueChange={(value) => setNewLocation(prev => ({ ...prev, type: value }))}
              placeholder="Select location type (optional)..."
            />
          </div>
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
          disabled={!newLocation.name}
          className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          <MapPin className="h-5 w-5 mr-2" />
          Add Location to Activity
        </Button>

        {/* Added Locations List */}
        {locations.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-slate-900">Saved Locations</h4>
              <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {locations.length} location{locations.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {locations.map((location) => (
                <div key={location.id} id={`location-${location.id}`} className="h-[180px] bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                {editingLocationId === location.id ? (
                  // Editing mode
                  <div className="h-full p-4 flex flex-col">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={editFormData.name || ''}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Location name"
                          className="h-9 text-sm"
                        />
                        <LocationTypeSelect
                          value={editFormData.type || ''}
                          onValueChange={(value) => setEditFormData(prev => ({ ...prev, type: value }))}
                          placeholder="Select type..."
                        />
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
                    </div>
                    <div className="flex gap-2 justify-end pt-3 mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEditing}
                        className="h-8 px-3"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveEditedLocation}
                        className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Display mode
                  <div className="h-full flex">
                    {/* Thumbnail Map */}
                    <div 
                      className="w-32 h-full bg-slate-100 rounded-l-lg flex-shrink-0 overflow-hidden relative bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${generateCleanThumbnailUrl(location.latitude, location.longitude)})`,
                        backgroundBlendMode: 'multiply'
                      }}
                      title={`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                    >
                      <div className="absolute inset-0 bg-slate-500/10"></div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 p-4 relative">
                      {/* Action Buttons - Top Right */}
                      <div className="absolute top-3 right-3 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(location)}
                          className="h-7 w-7 hover:bg-slate-100"
                          title="Edit location"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500 hover:text-slate-700" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLocation(location.id)}
                          className="h-7 w-7 hover:bg-red-50"
                          title="Remove location"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-600" />
                        </Button>
                      </div>
                      
                      {/* Title and Type */}
                      <div className="mb-2 pr-16">
                        <h5 className="font-semibold text-base text-slate-900 truncate">{location.name}</h5>
                        <p className="text-sm text-slate-600 mt-1">
                          {getLocationTypeLabel(location.type)}
                        </p>
                      </div>
                      
                      {/* Location Information */}
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700">
                          {formatLocationText(location)}
                        </p>
                        
                        {/* Address if different from formatted location */}
                        {location.address && location.address !== location.stateRegionName && (
                          <p className="text-xs text-slate-500">
                            {location.address}
                          </p>
                        )}
                        
                        {/* Notes */}
                        {location.notes && (
                          <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded">
                            {location.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
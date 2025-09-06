'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Map, RotateCcw, Layers, Satellite, Mountain, MapPin, Activity, Building, Filter, Flame, BarChart3 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton-loader';
import { EnhancedSubnationalBreakdown } from '@/components/activities/EnhancedSubnationalBreakdown';
import MyanmarAdminMap from '@/components/MyanmarAdminMap';

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
      
      // Load heatmap plugin
      require('leaflet.heat');
      
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

// Create activity marker icon
function createActivityMarkerIcon() {
  if (typeof window === 'undefined' || !L) {
    return null;
  }
  
  const svgPin = `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.3 12.5 28.5 12.5 28.5s12.5-20.2 12.5-28.5C25 5.6 19.4 0 12.5 0z" fill="#2563eb"/>
    <circle cx="12.5" cy="12.5" r="6" fill="white"/>
  </svg>`;
  
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgPin)}`;
  
  try {
    return new L.Icon({
      iconUrl: svgDataUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      className: 'activity-marker'
    });
  } catch (error) {
    console.error('Failed to create activity marker icon:', error);
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

// Location interface
interface LocationData {
  id: string;
  activity_id: string;
  location_type: string;
  location_name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  site_type?: string;
  admin_unit?: string;
  coverage_scope?: string;
  state_region_code?: string;
  state_region_name?: string;
  township_code?: string;
  township_name?: string;
  created_at: string;
  updated_at: string;
  activity?: {
    id: string;
    title: string;
    status: string;
    organization_id: string;
    organization_name?: string;
  } | null;
}

// Map initializer component
function MapInitializer() {
  if (!useMapEventsHook || typeof window === 'undefined') {
    return null;
  }
  
  const map = useMapEventsHook({});

  useEffect(() => {
    if (map) {
      console.log('🔧 AidMap: Setting up map interactions...');
      
      if (map.dragging && !map.dragging.enabled()) {
        map.dragging.enable();
      }
      
      if (map.scrollWheelZoom && !map.scrollWheelZoom.enabled()) {
        map.scrollWheelZoom.enable();
      }
      
      if (map.touchZoom && !map.touchZoom.enabled()) {
        map.touchZoom.enable();
      }
      
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [map]);
  
  return null;
}

// Map bounds component to fit all locations
function MapBounds({ locations }: { locations: LocationData[] }) {
  if (!useMapEventsHook || typeof window === 'undefined') {
    return null;
  }
  
  const map = useMapEventsHook({});

  useEffect(() => {
    if (!map || !locations.length) return;
    
    const validLocations = locations.filter(loc => 
      loc.latitude && loc.longitude && 
      !isNaN(loc.latitude) && !isNaN(loc.longitude)
    );
    
    if (validLocations.length === 0) return;
    
    if (validLocations.length === 1) {
      const loc = validLocations[0];
      map.setView([loc.latitude, loc.longitude], 12);
    } else {
      const bounds = validLocations.map(loc => [loc.latitude, loc.longitude] as [number, number]);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, locations]);
  
  return null;
}

// Map reset component to handle reset functionality
function MapReset({ shouldReset, locations }: { shouldReset: boolean; locations: LocationData[] }) {
  if (!useMapEventsHook || typeof window === 'undefined') {
    return null;
  }
  
  const map = useMapEventsHook({});

  useEffect(() => {
    if (!map || !shouldReset) return;
    
    const validLocations = locations.filter(loc => 
      loc.latitude && loc.longitude && 
      !isNaN(loc.latitude) && !isNaN(loc.longitude)
    );
    
    if (validLocations.length === 0) {
      // Reset to Myanmar center view if no locations
      map.setView([19.5, 96.0], 6);
    } else if (validLocations.length === 1) {
      const loc = validLocations[0];
      map.setView([loc.latitude, loc.longitude], 12);
    } else {
      const bounds = validLocations.map(loc => [loc.latitude, loc.longitude] as [number, number]);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, shouldReset, locations]);
  
  return null;
}

// Heatmap component
function HeatmapLayer({ locations }: { locations: LocationData[] }) {
  if (!useMapEventsHook || typeof window === 'undefined' || !L) {
    return null;
  }
  
  const map = useMapEventsHook({});

  useEffect(() => {
    if (!map || !locations.length || !L.heatLayer) return;
    
    // Prepare heatmap data: [latitude, longitude, intensity]
    const heatmapData = locations.map(location => [
      location.latitude,
      location.longitude,
      1 // Base intensity of 1 for each location
    ]);
    
    // Create heatmap layer with smaller, more intense circles
    const heatLayer = L.heatLayer(heatmapData, {
      radius: 30,        // Reduced from 50 for smaller circles
      blur: 15,          // Reduced from 25 for sharper edges
      maxZoom: 18,       // Keep high max zoom
      minOpacity: 0.4,   // Increased from 0.3 for more intensity
      max: 0.8,          // Reduced from 1.0 to make colors more intense
      gradient: {
        0.0: '#313695',
        0.1: '#4575b4', 
        0.2: '#74add1',
        0.3: '#abd9e9',
        0.4: '#e0f3f8',
        0.5: '#ffffcc',
        0.6: '#fee090',
        0.7: '#fdae61',
        0.8: '#f46d43',
        0.9: '#d73027',
        1.0: '#a50026'
      }
    });
    
    // Add to map
    heatLayer.addTo(map);
    
    // Cleanup function
    return () => {
      if (map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, locations]);
  
  return null;
}

// View mode types
type ViewMode = 'markers' | 'heatmap';
type TabMode = 'map' | 'subnational';

export default function AidMap() {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('streets');
  const [viewMode, setViewMode] = useState<ViewMode>('markers');
  const [tabMode, setTabMode] = useState<TabMode>('map');
  const [shouldResetMap, setShouldResetMap] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const mapRef = useRef<any>(null);

  // State for locations data
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for subnational breakdown data
  const [subnationalData, setSubnationalData] = useState<{
    breakdowns: Record<string, number>;
    details: Record<string, any>;
  }>({ breakdowns: {}, details: {} });
  const [subnationalLoading, setSubnationalLoading] = useState(true);

  // Fetch locations from our new API
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/locations');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch locations');
        }
        
        if (data.success && data.locations) {
          setLocations(data.locations);
          console.log('[AidMap] Locations loaded:', data.locations.length);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('[AidMap] Error fetching locations:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch locations');
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Fetch subnational breakdown data
  useEffect(() => {
    const fetchSubnationalData = async () => {
      try {
        setSubnationalLoading(true);
        
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (orgFilter !== 'all') params.append('organization', orgFilter);
        
        console.log('[AidMap] Fetching subnational data from:', `/api/subnational-breakdowns?${params}`);
        const response = await fetch(`/api/subnational-breakdowns?${params}`);
        console.log('[AidMap] Response status:', response.status);
        const data = await response.json();
        console.log('[AidMap] Raw API response:', data);
        
        if (!response.ok) {
          console.error('[AidMap] API error:', data);
          throw new Error(data.error || 'Failed to fetch subnational breakdown data');
        }
        
        setSubnationalData(data);
        console.log('[AidMap] Subnational breakdown data set to state:', data);
      } catch (err) {
        console.error('[AidMap] Error fetching subnational breakdown data:', err);
        // Don't set error state as this is optional data
      } finally {
        setSubnationalLoading(false);
      }
    };

    fetchSubnationalData();
  }, [statusFilter, orgFilter]);

  // Memoize marker icon creation
  const activityMarkerIcon = useMemo(() => {
    if (typeof window === 'undefined' || !L || !isMapLoaded) {
      return null;
    }
    return createActivityMarkerIcon();
  }, [isMapLoaded]);

  // Load Leaflet dependencies on component mount
  useEffect(() => {
    loadLeafletDependencies();
    
    const checkInterval = setInterval(() => {
      if (L && useMapEventsHook) {
        setIsMapLoaded(true);
        console.log('✅ AidMap: Leaflet dependencies loaded');
      }
      clearInterval(checkInterval);
    }, 100);

    return () => clearInterval(checkInterval);
  }, []);

  // Filter valid locations (already loaded from API)
  const validLocations = useMemo(() => {
    return locations.filter(location => 
      location.latitude && 
      location.longitude && 
      !isNaN(location.latitude) && 
      !isNaN(location.longitude)
    );
  }, [locations]);

  // Filter locations based on selected filters
  const filteredLocations = useMemo(() => {
    let filtered = validLocations;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(loc => loc.activity?.status === statusFilter);
    }

    if (orgFilter !== 'all') {
      filtered = filtered.filter(loc => loc.activity?.organization_name === orgFilter);
    }

    return filtered;
  }, [validLocations, statusFilter, orgFilter]);

  // Get unique organizations for filter
  const organizations = useMemo(() => {
    const orgs = new Set<string>();
    locations.forEach(location => {
      if (location.activity?.organization_name) {
        orgs.add(location.activity.organization_name);
      }
    });
    return Array.from(orgs).sort();
  }, [locations]);

  // Use subnational breakdown data from database
  const regionBreakdowns = subnationalData?.breakdowns || {};
  
  // Debug logging
  console.log('[AidMap] subnationalData:', subnationalData);
  console.log('[AidMap] regionBreakdowns:', regionBreakdowns);
  console.log('[AidMap] regionBreakdowns keys length:', Object.keys(regionBreakdowns || {}).length);
  console.log('[AidMap] subnationalLoading:', subnationalLoading);

  // Format currency
  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              <Skeleton variant="text" width="120px" height="1.5rem" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton variant="rectangular" width="100%" height="600px" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Aid Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-gray-500">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="font-medium">Failed to load map data</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Card with Tabbed Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Aid Map & Analysis
              <Badge variant="secondary" className="ml-2">
                {filteredLocations.length} locations
              </Badge>
            </CardTitle>
            
            <Tabs value={tabMode} onValueChange={(value: TabMode) => setTabMode(value)}>
              <TabsList>
                <TabsTrigger value="map" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Map View
                </TabsTrigger>
                <TabsTrigger value="subnational" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Sub-national Breakdown
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={tabMode} onValueChange={(value: TabMode) => setTabMode(value)}>
            <TabsContent value="map" className="space-y-4">
              <div className="space-y-4">
                {/* Map Controls */}
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="markers">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Markers
                          </div>
                        </SelectItem>
                        <SelectItem value="heatmap">
                          <div className="flex items-center gap-2">
                            <Flame className="h-4 w-4" />
                            Heatmap
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={mapLayer} onValueChange={(value: MapLayerType) => setMapLayer(value)}>
                      <SelectTrigger className="w-32">
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
                      title="Reset view to Myanmar"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset View
                    </Button>
                  </div>
                </div>
                
                {/* Filters */}
                <div className="flex gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <Select value={orgFilter} onValueChange={setOrgFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by organization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org} value={org}>
                      {org}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {viewMode === 'heatmap' && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Flame className="h-4 w-4" />
                <span>Activity density visualization</span>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="h-[600px] w-full relative rounded-lg overflow-hidden">
            {isMapLoaded && L && useMapEventsHook ? (
              <MapContainer
                ref={mapRef}
                center={[19.5, 96.0]}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                attributionControl={false}
                whenReady={() => {
                  console.log('AidMap ready');
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
                
                {viewMode === 'markers' ? (
                  // Render markers
                  <>
                    {filteredLocations.map((location, index) => {
                      if (!location.latitude || !location.longitude) return null;
                      
                      const position: [number, number] = [location.latitude, location.longitude];
                      
                      return (
                        <Marker
                          key={`${location.id}-${index}`}
                          position={position}
                          icon={activityMarkerIcon}
                        >
                          <Popup>
                            <div className="text-sm max-w-sm">
                              <div className="font-semibold mb-2 text-blue-600">
                                {location.activity?.title || 'Unknown Activity'}
                              </div>
                              
                              <div className="space-y-2">
                                <div>
                                  <div className="font-medium text-gray-700">Location:</div>
                                  <div className="text-gray-600">{location.location_name}</div>
                                  {location.address && (
                                    <div className="text-xs text-gray-500">{location.address}</div>
                                  )}
                                  {location.site_type && (
                                    <div className="text-xs text-gray-500">Type: {location.site_type}</div>
                                  )}
                                </div>
                                
                                {location.activity?.organization_name && (
                                  <div>
                                    <div className="font-medium text-gray-700">Organization:</div>
                                    <div className="text-gray-600">{location.activity.organization_name}</div>
                                  </div>
                                )}
                                
                                {location.activity?.status && (
                                  <div>
                                    <div className="font-medium text-gray-700">Status:</div>
                                    <Badge variant="outline" className="text-xs">
                                      {location.activity.status}
                                    </Badge>
                                  </div>
                                )}
                                
                                {location.description && (
                                  <div>
                                    <div className="font-medium text-gray-700">Description:</div>
                                    <div className="text-xs text-gray-600">{location.description}</div>
                                  </div>
                                )}
                                
                                {(location.state_region_name || location.township_name) && (
                                  <div>
                                    <div className="font-medium text-gray-700">Administrative:</div>
                                    <div className="text-xs text-gray-600 space-y-1">
                                      {location.state_region_name && (
                                        <div>Region: {location.state_region_name}</div>
                                      )}
                                      {location.township_name && (
                                        <div>Township: {location.township_name}</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="text-xs text-gray-400 font-mono pt-2 border-t">
                                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                </div>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </>
                ) : (
                  // Render heatmap
                  <HeatmapLayer locations={filteredLocations} />
                )}
                
                <MapBounds locations={filteredLocations} />
                <MapReset shouldReset={shouldResetMap} locations={filteredLocations} />
                <MapInitializer />
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <div className="text-sm text-gray-600">Loading map...</div>
                </div>
              </div>
            )}
            
            {filteredLocations.length === 0 && !loading && (
              <div className="absolute inset-0 bg-gray-50/90 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="font-medium text-gray-600">No locations found</p>
                  <p className="text-sm text-gray-500">
                    Try adjusting your filters or check if activities have location data
                  </p>
                </div>
              </div>
            )}
            </div>
              </div>
            </TabsContent>
            
            <TabsContent value="subnational" className="space-y-4">
              <div className="space-y-6">
                <div className="text-sm text-muted-foreground">
                  Sub-national breakdown showing activity distribution across Myanmar's states and regions from activity breakdown data.
                </div>
                
                {subnationalLoading ? (
                  <div className="space-y-4">
                    <div className="h-[600px] w-full bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                        <div className="text-sm text-gray-600">Loading sub-national breakdown data...</div>
                      </div>
                    </div>
                  </div>
                ) : Object.keys(regionBreakdowns || {}).length > 0 ? (
                  <>
                    {/* Myanmar Admin Map */}
                    <div className="h-[600px] w-full">
                      <MyanmarAdminMap 
                        breakdowns={regionBreakdowns}
                        visible={true}
                        onRegionClick={(regionName) => {
                          console.log('Region clicked:', regionName);
                          // Could add filtering functionality here
                        }}
                      />
                    </div>
                    
                    {/* Breakdown Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(regionBreakdowns)
                        .sort(([,a], [,b]) => b - a) // Sort by percentage descending
                        .map(([region, percentage]) => {
                          const details = subnationalData.details[region];
                          const activityCount = details?.activityCount || 0;
                          const totalPercentage = details?.totalPercentage || 0;
                          
                          return (
                            <Card key={region}>
                              <CardContent className="pt-4">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-medium text-sm">{region}</h4>
                                  <span className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</span>
                                </div>
                                <div className="text-2xl font-bold">{activityCount}</div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {activityCount === 1 ? 'activity' : 'activities'}
                                </p>
                                {totalPercentage > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    Total coverage: {totalPercentage.toFixed(1)}%
                                  </div>
                                )}
                                {details?.activities && details.activities.length > 0 && (
                                  <div className="mt-2 text-xs">
                                    <div className="font-medium text-muted-foreground mb-1">Recent activities:</div>
                                    {details.activities.slice(0, 2).map((activity: any, idx: number) => (
                                      <div key={idx} className="truncate text-muted-foreground">
                                        • {activity.title}
                                      </div>
                                    ))}
                                    {details.activities.length > 2 && (
                                      <div className="text-muted-foreground">
                                        +{details.activities.length - 2} more
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  </>
                ) : (
                  <div className="p-8 border-2 border-dashed rounded-lg text-center">
                    <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Sub-national Breakdown Data Available</h3>
                    <p className="text-muted-foreground mb-4">
                      No activities with sub-national breakdown information found for the current filters.
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Sub-national breakdowns are configured in individual activity editors.
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredLocations.length}</div>
            <p className="text-xs text-muted-foreground">Activity Locations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {new Set(filteredLocations.map(l => l.activity?.id).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique Activities</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {new Set(filteredLocations.map(l => l.activity?.organization_name).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">Organizations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {new Set(filteredLocations.map(l => l.location_type)).size}
            </div>
            <p className="text-xs text-muted-foreground">Location Types</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
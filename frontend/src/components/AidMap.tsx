'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Map as MapIcon, 
  RotateCcw, 
  Layers, 
  Satellite, 
  Mountain, 
  MapPin, 
  Flame, 
  BarChart3, 
  CircleDot 
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton-loader';
import { EnhancedSubnationalBreakdown } from '@/components/activities/EnhancedSubnationalBreakdown';
import { SectorHierarchyFilter, SectorFilterSelection, matchesSectorFilter } from '@/components/maps/SectorHierarchyFilter';
import { MapSearch } from '@/components/maps/MapSearch';
import { ACTIVITY_STATUS_GROUPS } from '@/data/activity-status-types';
import { getCountryCoordinates, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/data/country-coordinates';

// Dynamic import for MyanmarRegionsMap to avoid SSR issues
const MyanmarRegionsMap = dynamic(() => import('@/components/MyanmarRegionsMap'), { ssr: false });

// Dynamic import for map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
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

// Dynamic import for new marker and heatmap layers
const AidMapMarkersLayer = dynamic(() => import('./maps/AidMapMarkersLayer'), { ssr: false });
const HeatmapLayer = dynamic(() => import('./maps/HeatmapLayer'), { ssr: false });
const MapFlyTo = dynamic(() => import('./maps/MapFlyTo'), { ssr: false });

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


// Map layer configurations
type MapLayerType = 'cartodb_voyager' | 'osm_standard' | 'osm_humanitarian' | 'cyclosm' | 'opentopo' | 'satellite_esri';

const MAP_LAYERS: Record<MapLayerType, { name: string; url: string; attribution: string; icon: any }> = {
  cartodb_voyager: {
    name: 'Streets (CartoDB Voyager)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors, © CARTO',
    icon: Layers
  },
  osm_standard: {
    name: 'OpenStreetMap Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    icon: Layers
  },
  osm_humanitarian: {
    name: 'Humanitarian (HOT)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © HOT',
    icon: Layers
  },
  cyclosm: {
    name: 'CyclOSM Transport',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © CyclOSM',
    icon: Layers
  },
  opentopo: {
    name: 'OpenTopo Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © OpenTopoMap',
    icon: Mountain
  },
  satellite_esri: {
    name: 'ESRI Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    icon: Satellite
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
  district_name?: string;
  village_name?: string;
  city?: string;
  created_at: string;
  updated_at: string;
  activity?: {
    id: string;
    title: string;
    status: string;
    organization_id: string;
    organization_name?: string;
    sectors?: Array<{
      code: string;
      name: string;
      categoryCode?: string;
      categoryName?: string;
      level?: string;
      percentage?: number;
    }>;
    totalBudget?: number;
    totalPlannedDisbursement?: number;
    startDate?: string;
    endDate?: string;
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
      
      // Keep scrollWheelZoom disabled so page scrolling works normally
      if (map.scrollWheelZoom && map.scrollWheelZoom.enabled()) {
        map.scrollWheelZoom.disable();
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

// Map reset component to handle reset functionality - always resets to home country
function MapReset({ shouldReset, homeCountryCenter, homeCountryZoom }: {
  shouldReset: boolean;
  homeCountryCenter: [number, number];
  homeCountryZoom: number;
}) {
  if (!useMapEventsHook || typeof window === 'undefined') {
    return null;
  }

  const map = useMapEventsHook({});

  useEffect(() => {
    if (!map || !shouldReset) return;

    // Always reset to home country view
    map.setView(homeCountryCenter, homeCountryZoom);
  }, [map, shouldReset, homeCountryCenter, homeCountryZoom]);

  return null;
}

// Heatmap data preparation helper
const prepareHeatmapPoints = (locations: LocationData[]) => {
  return locations
    .filter(loc => {
      const lat = Number(loc.latitude)
      const lng = Number(loc.longitude)
      return !isNaN(lat) && !isNaN(lng)
    })
    .map(loc => ({
      lat: Number(loc.latitude),
      lng: Number(loc.longitude),
      intensity: 0.8
    }))
}

// View mode types
type ViewMode = 'markers' | 'heatmap';
type TabMode = 'map' | 'subnational';

export default function AidMap() {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('cartodb_voyager');
  const [viewMode, setViewMode] = useState<ViewMode>('markers');
  const [tabMode, setTabMode] = useState<TabMode>('map');
  const [shouldResetMap, setShouldResetMap] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<SectorFilterSelection>({
    sectorCategories: [],
    sectors: [],
    subSectors: [],
  });
  const mapRef = useRef<any>(null);

  // Home country coordinates from system settings
  const [homeCountryCenter, setHomeCountryCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [homeCountryZoom, setHomeCountryZoom] = useState<number>(DEFAULT_MAP_ZOOM);

  // State for fly-to target (used by MapFlyTo component inside MapContainer)
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  // Fetch home country from system settings
  useEffect(() => {
    const fetchHomeCountry = async () => {
      try {
        const response = await fetch('/api/admin/system-settings')
        if (response.ok) {
          const data = await response.json()
          if (data.homeCountry) {
            const countryCoords = getCountryCoordinates(data.homeCountry)
            setHomeCountryCenter(countryCoords.center)
            setHomeCountryZoom(countryCoords.zoom)
          }
        }
      } catch (error) {
        console.error('Failed to fetch home country setting:', error)
        // Keep defaults on error
      }
    }
    fetchHomeCountry()
  }, []);

  // Handler for location search
  const handleLocationSearch = useCallback((lat: number, lng: number, name: string, type: string) => {
    console.log('[MapSearch] handleLocationSearch called:', { lat, lng, name, type });

    // Determine zoom level based on location type
    let zoomLevel = 10;
    if (type === 'city' || type === 'town' || type === 'village' || type === 'hamlet') {
      zoomLevel = 12;
    } else if (type === 'administrative' || type === 'state' || type === 'region' || type === 'province') {
      zoomLevel = 9;
    } else if (type === 'country') {
      zoomLevel = 6;
    }

    // Set the fly-to target - MapFlyTo component inside MapContainer will handle the actual flyTo
    console.log(`[MapSearch] Setting flyTo target: ${name} (${lat}, ${lng}) at zoom ${zoomLevel}`);
    setFlyToTarget({ lat, lng, zoom: zoomLevel });
  }, []);

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

    // Apply sector hierarchy filter
    const hasSectorFilter = 
      sectorFilter.sectorCategories.length > 0 || 
      sectorFilter.sectors.length > 0 || 
      sectorFilter.subSectors.length > 0;
    
    if (hasSectorFilter) {
      filtered = filtered.filter(loc => {
        const activitySectors = loc.activity?.sectors || [];
        const sectorCodes = activitySectors.map(s => s.code);
        return matchesSectorFilter(sectorCodes, sectorFilter);
      });
    }

    return filtered;
  }, [validLocations, statusFilter, orgFilter, sectorFilter]);

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
              <MapIcon className="h-5 w-5" />
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
            <MapIcon className="h-5 w-5" />
            Atlas
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
              <MapIcon className="h-5 w-5" />
              Map & Analysis
            </CardTitle>
            
            <div className="flex justify-end">
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
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={tabMode} onValueChange={(value: TabMode) => setTabMode(value)}>
            <TabsContent value="map" className="space-y-4">
          {/* Map */}
          <div className="h-[92vh] min-h-[800px] w-full relative rounded-lg overflow-hidden border border-gray-200">
            {/* All Controls - single top row */}
            <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-1.5">
              {/* Filters */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] bg-white shadow-md border-gray-300 text-xs h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {ACTIVITY_STATUS_GROUPS.map((group) => (
                    <React.Fragment key={group.label}>
                      {group.options.map((status) => (
                        <SelectItem key={status.code} value={status.code}>
                          <span className="inline-flex items-center gap-2">
                            <code className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono">{status.code}</code>
                            <span>{status.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={orgFilter} onValueChange={setOrgFilter}>
                <SelectTrigger className="w-[130px] bg-white shadow-md border-gray-300 text-xs h-9">
                  <SelectValue placeholder="Organization" />
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
              
              <SectorHierarchyFilter
                selected={sectorFilter}
                onChange={setSectorFilter}
                className="w-[130px] bg-white shadow-md border-gray-300 h-9 text-xs"
              />
              
              {/* Search */}
              <MapSearch
                onLocationSelect={handleLocationSearch}
                className="w-[160px]"
                placeholder="Search..."
              />
              
              {/* Spacer to push map controls to the right */}
              <div className="flex-1" />
              
              {/* Map Controls - grouped with more spacing */}
              <div className="flex items-center gap-2 shrink-0">
                <Select value={mapLayer} onValueChange={(value) => setMapLayer(value as MapLayerType)}>
                  <SelectTrigger className="w-[150px] bg-white shadow-md border-gray-300 text-xs h-9">
                    <SelectValue placeholder="Map type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MAP_LAYERS).map(([key, layer]) => (
                      <SelectItem key={key} value={key}>
                        {layer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => {
                    setShouldResetMap(true);
                    setTimeout(() => setShouldResetMap(false), 100);
                  }}
                  variant="outline"
                  size="sm"
                  title="Reset to home country view"
                  className="bg-white shadow-md border-gray-300 h-9 w-9 p-0"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                {/* View Mode Toggle */}
                <div className="flex bg-white rounded-md shadow-md border border-gray-300 overflow-hidden">
                  <Button
                    onClick={() => setViewMode('markers')}
                    variant="ghost"
                    size="sm"
                    title="Show markers"
                    className={`rounded-none border-0 h-9 w-9 p-0 ${viewMode === 'markers' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                  >
                    <CircleDot className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setViewMode('heatmap')}
                    variant="ghost"
                    size="sm"
                    title="Show heatmap"
                    className={`rounded-none border-0 border-l border-gray-300 h-9 w-9 p-0 ${viewMode === 'heatmap' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100'}`}
                  >
                    <Flame className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {isMapLoaded && L && useMapEventsHook ? (
              <MapContainer
                key={`${mapLayer}-${homeCountryCenter[0]}-${homeCountryCenter[1]}`}
                ref={mapRef}
                center={homeCountryCenter}
                zoom={homeCountryZoom}
                minZoom={2}
                maxBounds={[[-90, -180], [90, 180]]}
                maxBoundsViscosity={1.0}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                attributionControl={false}
                scrollWheelZoom={false}
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
                  noWrap={true}
                />
                
                {/* Markers Mode */}
                {viewMode === 'markers' && filteredLocations.length > 0 && (
                  <AidMapMarkersLayer locations={filteredLocations} />
                )}

                {/* Heatmap Mode */}
                {viewMode === 'heatmap' && filteredLocations.length > 0 && (
                  <HeatmapLayer 
                    points={prepareHeatmapPoints(filteredLocations)}
                    options={{
                      radius: 30,
                      blur: 20,
                      maxZoom: 12,
                      max: 1.0,
                      minOpacity: 0.5,
                      gradient: {
                        0.2: '#313695',
                        0.3: '#4575b4', 
                        0.4: '#74add1',
                        0.5: '#abd9e9',
                        0.6: '#ffffbf',
                        0.7: '#fee090',
                        0.8: '#fdae61',
                        0.9: '#f46d43',
                        1.0: '#d73027'
                      }
                    }}
                  />
                )}
                
                <MapReset
                  shouldReset={shouldResetMap}
                  homeCountryCenter={homeCountryCenter}
                  homeCountryZoom={homeCountryZoom}
                />
                <MapInitializer />
                <MapFlyTo 
                  target={flyToTarget} 
                  onComplete={() => setFlyToTarget(null)} 
                />
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
            </TabsContent>
            
            <TabsContent value="subnational" className="space-y-4">
              <div className="space-y-6">
                <div className="text-sm text-muted-foreground">
                  Sub-national breakdown showing activity distribution across Myanmar's states and regions from activity breakdown data.
                </div>
                
                {subnationalLoading ? (
                  <div className="space-y-4">
                    <div className="h-[85vh] min-h-[700px] w-full bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                        <div className="text-sm text-gray-600">Loading sub-national breakdown data...</div>
                      </div>
                    </div>
                  </div>
                ) : Object.keys(regionBreakdowns || {}).length > 0 ? (
                  <>
                    {/* Myanmar Admin Map */}
                    <div className="h-[85vh] min-h-[700px] w-full">
                      <MyanmarRegionsMap 
                        breakdowns={regionBreakdowns}
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
    </div>
  );
}
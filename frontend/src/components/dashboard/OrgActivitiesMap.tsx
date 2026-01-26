"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, RotateCcw, Flame, CircleDot, Layers, Mountain, Satellite } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ACTIVITY_STATUS_GROUPS } from '@/data/activity-status-types';
import { SectorHierarchyFilter, SectorFilterSelection, matchesSectorFilter } from '@/components/maps/SectorHierarchyFilter';
import { apiFetch } from '@/lib/api-fetch';

// Dynamic imports for map components
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
const MarkersLayer = dynamic(
  () => import('@/components/maps/MarkersLayer'),
  { ssr: false }
);
const HeatmapLayer = dynamic(
  () => import('@/components/maps/HeatmapLayer'),
  { ssr: false }
);

// Leaflet instance and hooks
let L: any = null;
let useMapEventsHook: any = null;

// Load Leaflet dependencies
const loadLeafletDependencies = () => {
  if (typeof window !== 'undefined' && !L) {
    try {
      L = require('leaflet');
      const ReactLeaflet = require('react-leaflet');
      useMapEventsHook = ReactLeaflet.useMapEvents;
      require('leaflet/dist/leaflet.css');
      require('leaflet.heat');
      
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
type MapLayerType = 'cartodb_voyager' | 'osm_standard' | 'osm_humanitarian' | 'opentopo' | 'satellite_esri';

const MAP_LAYERS: Record<MapLayerType, { name: string; url: string; attribution: string }> = {
  cartodb_voyager: {
    name: 'Streets (CartoDB)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors, © CARTO',
  },
  osm_standard: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  osm_humanitarian: {
    name: 'Humanitarian (HOT)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © HOT',
  },
  opentopo: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © OpenTopoMap',
  },
  satellite_esri: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
  }
};

// Map initializer component
function MapInitializer({ bounds }: { bounds: [[number, number], [number, number]] | null }) {
  if (!useMapEventsHook || typeof window === 'undefined') {
    return null;
  }
  
  const map = useMapEventsHook({});

  useEffect(() => {
    if (map) {
      if (map.dragging && !map.dragging.enabled()) {
        map.dragging.enable();
      }
      if (map.scrollWheelZoom && map.scrollWheelZoom.enabled()) {
        map.scrollWheelZoom.disable();
      }
      if (map.touchZoom && !map.touchZoom.enabled()) {
        map.touchZoom.enable();
      }
      
      // Fit to bounds with padding if bounds exist
      if (bounds) {
        setTimeout(() => {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }, 100);
      }
      
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }
  }, [map, bounds]);
  
  return null;
}

// Map reset component
function MapReset({ shouldReset, bounds }: { shouldReset: boolean; bounds: [[number, number], [number, number]] | null }) {
  if (!useMapEventsHook || typeof window === 'undefined') {
    return null;
  }

  const map = useMapEventsHook({});

  useEffect(() => {
    if (!map || !shouldReset || !bounds) return;
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
  }, [map, shouldReset, bounds]);

  return null;
}

// Heatmap data preparation
const prepareHeatmapPoints = (locations: LocationData[]) => {
  return locations
    .filter(loc => {
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      return !isNaN(lat) && !isNaN(lng);
    })
    .map(loc => ({
      lat: Number(loc.latitude),
      lng: Number(loc.longitude),
      intensity: 0.8
    }));
};

type ViewMode = 'markers' | 'heatmap';

interface OrgActivitiesMapProps {
  organizationId: string;
}

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
      percentage: number;
    }>;
    totalBudget?: number;
    totalPlannedDisbursement?: number;
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
  } | null;
}

export function OrgActivitiesMap({ organizationId }: OrgActivitiesMapProps) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('cartodb_voyager');
  const [viewMode, setViewMode] = useState<ViewMode>('markers');
  const [shouldResetMap, setShouldResetMap] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<SectorFilterSelection>({
    sectorCategories: [],
    sectors: [],
    subSectors: [],
  });
  const mapRef = useRef<any>(null);

  // Load Leaflet dependencies on mount
  useEffect(() => {
    loadLeafletDependencies();
    
    const checkInterval = setInterval(() => {
      if (L && useMapEventsHook) {
        setIsMapLoaded(true);
        clearInterval(checkInterval);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, []);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({ organizationId });
        const response = await apiFetch(`/api/dashboard/org-locations?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch locations');
        }

        const data = await response.json();
        console.log('[OrgActivitiesMap] Fetched locations:', data.locations?.length || 0);
        setLocations(data.locations || []);
      } catch (err) {
        console.error('[OrgActivitiesMap] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map data');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchLocations();
    }
  }, [organizationId]);

  // Filter valid locations
  const validLocations = useMemo(() => {
    return locations.filter(loc => {
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [locations]);

  // Apply filters
  const filteredLocations = useMemo(() => {
    let filtered = validLocations;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(loc => loc.activity?.status === statusFilter);
    }

    // Sector filter
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
  }, [validLocations, statusFilter, sectorFilter]);

  // Calculate bounds to fit all markers with padding
  const mapBounds = useMemo((): [[number, number], [number, number]] | null => {
    if (filteredLocations.length === 0) {
      return null;
    }

    const lats = filteredLocations.map(loc => loc.latitude);
    const lngs = filteredLocations.map(loc => loc.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Add some padding to the bounds
    const latPad = (maxLat - minLat) * 0.1 || 0.5;
    const lngPad = (maxLng - minLng) * 0.1 || 0.5;
    
    return [
      [minLat - latPad, minLng - lngPad],
      [maxLat + latPad, maxLng + lngPad]
    ];
  }, [filteredLocations]);

  // Default center for empty state
  const defaultCenter: [number, number] = [12.5, 105.0]; // Cambodia

  const handleReset = () => {
    setShouldResetMap(true);
    setTimeout(() => setShouldResetMap(false), 100);
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[700px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Activity Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load map: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-slate-600" />
          Activity Locations
        </CardTitle>
        <CardDescription>
          {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} from your activities
          {statusFilter !== 'all' || sectorFilter.sectorCategories.length > 0 || sectorFilter.sectors.length > 0 || sectorFilter.subSectors.length > 0 
            ? ` (filtered from ${validLocations.length} total)` 
            : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {validLocations.length === 0 ? (
          <div className="h-[700px] flex items-center justify-center bg-slate-50 rounded-lg">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No locations recorded</p>
              <p className="text-xs text-slate-400 mt-1">
                Add locations to your activities to see them here
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[700px] w-full relative rounded-lg overflow-hidden border border-gray-200">
            {/* Controls overlay - positioned at top of map */}
            <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-1.5">
              {/* Left side filters */}
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

              <SectorHierarchyFilter
                selected={sectorFilter}
                onChange={setSectorFilter}
                className="w-[120px] bg-white shadow-md border-gray-300 h-9 text-xs"
              />

              {/* Spacer to push right controls */}
              <div className="flex-1" />

              {/* Right side map controls */}
              <div className="flex items-center gap-1.5">
                <Select value={mapLayer} onValueChange={(value) => setMapLayer(value as MapLayerType)}>
                  <SelectTrigger className="w-[130px] bg-white shadow-md border-gray-300 text-xs h-9">
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
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  title="Reset map view"
                  className="bg-white shadow-md border-gray-300 h-9 w-9 p-0"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

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
                key={`org-map-${organizationId}-${mapLayer}`}
                ref={mapRef}
                center={defaultCenter}
                zoom={6}
                minZoom={2}
                maxBounds={[[-90, -180], [90, 180]]}
                maxBoundsViscosity={1.0}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                scrollWheelZoom={false}
              >
                <ZoomControl position="topright" />
                <TileLayer
                  attribution={MAP_LAYERS[mapLayer].attribution}
                  url={MAP_LAYERS[mapLayer].url}
                  keepBuffer={2}
                  updateWhenIdle={false}
                  updateWhenZooming={false}
                  noWrap={true}
                />
                
                {/* Markers mode */}
                {viewMode === 'markers' && filteredLocations.length > 0 && (
                  <MarkersLayer locations={filteredLocations} />
                )}

                {/* Heatmap mode */}
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

                <MapInitializer bounds={mapBounds} />
                <MapReset shouldReset={shouldResetMap} bounds={mapBounds} />
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <div className="text-sm text-gray-600">Loading map...</div>
                </div>
              </div>
            )}

            {/* No results overlay */}
            {filteredLocations.length === 0 && validLocations.length > 0 && (
              <div className="absolute inset-0 bg-gray-50/90 flex items-center justify-center z-[500]">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="font-medium text-gray-600">No locations match filters</p>
                  <p className="text-sm text-gray-500">
                    Try adjusting your status or sector filters
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

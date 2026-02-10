'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Map, MapControls, useMap } from '@/components/ui/map';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CircleDot, Flame, MapPin, RotateCcw, Building2 } from 'lucide-react';
import MapLibreGL from 'maplibre-gl';
import dynamic from 'next/dynamic';
import { apiFetch } from '@/lib/api-fetch';

// Dynamic imports for map layers
const SimpleActivityMarkersLayer = dynamic(
  () => import('@/components/maps-v2/SimpleActivityMarkersLayer'),
  { ssr: false }
);
const HeatmapLayer = dynamic(
  () => import('@/components/maps-v2/HeatmapLayer'),
  { ssr: false }
);
const OtherOrgsMarkersLayer = dynamic(
  () => import('@/components/maps-v2/OtherOrgsMarkersLayer'),
  { ssr: false }
);

// Map style configurations (same as Atlas)
const MAP_STYLES = {
  carto_light: {
    name: 'Streets (Light)',
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  carto_voyager: {
    name: 'Voyager',
    light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  hot: {
    name: 'Humanitarian (HOT)',
    light: {
      version: 8 as const,
      sources: {
        'hot-osm': {
          type: 'raster' as const,
          tiles: [
            '/api/tiles/hot/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
          maxzoom: 19
        }
      },
      layers: [{
        id: 'hot-osm-layer',
        type: 'raster' as const,
        source: 'hot-osm',
        minzoom: 0,
        maxzoom: 22
      }]
    },
    dark: {
      version: 8 as const,
      sources: {
        'hot-osm': {
          type: 'raster' as const,
          tiles: [
            '/api/tiles/hot/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
          maxzoom: 19
        }
      },
      layers: [{
        id: 'hot-osm-layer',
        type: 'raster' as const,
        source: 'hot-osm',
        minzoom: 0,
        maxzoom: 22
      }]
    }
  },
  satellite_imagery: {
    name: 'Satellite Imagery',
    light: {
      version: 8 as const,
      sources: {
        'esri-satellite': {
          type: 'raster' as const,
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: '© Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxzoom: 19
        }
      },
      layers: [{
        id: 'esri-satellite-layer',
        type: 'raster' as const,
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 22
      }]
    },
    dark: {
      version: 8 as const,
      sources: {
        'esri-satellite': {
          type: 'raster' as const,
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: '© Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxzoom: 19
        }
      },
      layers: [{
        id: 'esri-satellite-layer',
        type: 'raster' as const,
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 22
      }]
    }
  },
};

type MapStyleKey = keyof typeof MAP_STYLES;

interface Location {
  id?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  site_type?: string;
  state_region_name?: string;
  township_name?: string;
  district_name?: string;
  village_name?: string;
  address?: string;
  city?: string;
  description?: string;
  location_description?: string;
  [key: string]: unknown;
}

interface OtherOrgLocation {
  id: string;
  location_name?: string;
  latitude: number;
  longitude: number;
  site_type?: string;
  activity?: {
    id: string;
    title?: string;
    organization_id?: string;
    organization_name?: string;
    organization_acronym?: string;
  } | null;
}

interface ActivityLocationsMapViewV2Props {
  locations: Location[];
  mapCenter: [number, number]; // [lat, lng] - will convert internally to [lng, lat] for MapLibre
  mapZoom: number;
  viewMode?: 'markers' | 'heatmap';
  activityTitle?: string;
  organizationId?: string; // Current activity's organization ID for filtering other orgs
}

// Helper function to fit bounds to locations
function fitBoundsToLocations(map: MapLibreGL.Map, locations: Location[], duration = 1000) {
  const validLocations = locations.filter(loc => {
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);
    return !isNaN(lat) && !isNaN(lng);
  });
  
  if (validLocations.length === 0) return;
  
  const bounds = new MapLibreGL.LngLatBounds();
  validLocations.forEach(loc => {
    bounds.extend([Number(loc.longitude), Number(loc.latitude)]);
  });
  
  map.fitBounds(bounds, { 
    padding: 50, 
    maxZoom: 12,
    duration
  });
}

// Auto-fit bounds component
function AutoFitBounds({ locations }: { locations: Location[] }) {
  const { map, isLoaded } = useMap();
  
  useEffect(() => {
    if (!map || !isLoaded || locations.length === 0) return;
    
    // Small delay to ensure map is fully ready
    const timer = setTimeout(() => {
      fitBoundsToLocations(map, locations);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [map, isLoaded, locations]);
  
  return null;
}

// Reset view button component
function ResetViewButton({ locations }: { locations: Location[] }) {
  const { map, isLoaded } = useMap();
  
  const handleReset = useCallback(() => {
    if (!map || !isLoaded) return;
    fitBoundsToLocations(map, locations, 1500);
  }, [map, isLoaded, locations]);
  
  if (!isLoaded) return null;
  
  return (
    <Button
      onClick={handleReset}
      variant="outline"
      size="sm"
      title="Reset view"
      className="bg-white shadow-md border-gray-300 h-8 w-8 p-0"
    >
      <RotateCcw className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function ActivityLocationsMapViewV2({
  locations,
  mapCenter,
  mapZoom,
  viewMode: initialViewMode = 'markers',
  activityTitle,
  organizationId,
}: ActivityLocationsMapViewV2Props) {
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('carto_light');
  const [viewMode, setViewMode] = useState<'markers' | 'heatmap'>(initialViewMode);
  const [showOtherOrgs, setShowOtherOrgs] = useState(false);
  const [otherOrgsLocations, setOtherOrgsLocations] = useState<OtherOrgLocation[]>([]);
  const [loadingOtherOrgs, setLoadingOtherOrgs] = useState(false);

  // Fetch other organizations' locations when toggled on
  useEffect(() => {
    if (!showOtherOrgs || !organizationId) {
      setOtherOrgsLocations([]);
      return;
    }

    const fetchOtherOrgsLocations = async () => {
      setLoadingOtherOrgs(true);
      try {
        const response = await apiFetch('/api/locations');
        if (response.success && response.locations) {
          // Filter out locations from the current organization
          const filtered = response.locations.filter(
            (loc: OtherOrgLocation) => loc.activity?.organization_id && loc.activity.organization_id !== organizationId
          );
          setOtherOrgsLocations(filtered);
        }
      } catch (error) {
        console.error('Failed to fetch other organizations locations:', error);
      } finally {
        setLoadingOtherOrgs(false);
      }
    };

    fetchOtherOrgsLocations();
  }, [showOtherOrgs, organizationId]);

  // Filter valid locations
  const validLocations = useMemo(() => {
    return locations.filter(loc => {
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      return !isNaN(lat) && !isNaN(lng);
    });
  }, [locations]);

  // Prepare heatmap points
  const heatmapPoints = useMemo(() => {
    return validLocations.map(loc => ({
      lat: Number(loc.latitude),
      lng: Number(loc.longitude),
      intensity: 0.8
    }));
  }, [validLocations]);

  // Convert center from [lat, lng] to [lng, lat] for MapLibre
  const mapLibreCenter: [number, number] = [mapCenter[1], mapCenter[0]];

  if (validLocations.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-surface-muted rounded-md">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No location data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Controls overlay */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        {/* Map Style Selector */}
        <Select value={mapStyle} onValueChange={(value) => setMapStyle(value as MapStyleKey)}>
          <SelectTrigger className="w-[160px] bg-white shadow-md border-gray-300 text-xs h-8">
            <SelectValue placeholder="Map style" />
          </SelectTrigger>
          <SelectContent className="z-[9999]">
            {Object.entries(MAP_STYLES).map(([key, style]) => (
              <SelectItem key={key} value={key} className="text-xs">
                {style.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View Mode Toggle */}
        <div className="flex bg-white rounded-md shadow-md border border-gray-300 overflow-hidden">
          <Button
            onClick={() => setViewMode('markers')}
            variant="ghost"
            size="sm"
            title="Show markers"
            className={`rounded-none border-0 h-8 w-8 p-0 ${viewMode === 'markers' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
          >
            <CircleDot className="h-3.5 w-3.5" />
          </Button>
          <Button
            onClick={() => setViewMode('heatmap')}
            variant="ghost"
            size="sm"
            title="Show heatmap"
            className={`rounded-none border-0 border-l border-gray-300 h-8 w-8 p-0 ${viewMode === 'heatmap' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100'}`}
          >
            <Flame className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Other Organizations Toggle */}
        {organizationId && (
          <Button
            onClick={() => setShowOtherOrgs(!showOtherOrgs)}
            variant="outline"
            size="sm"
            title={showOtherOrgs ? "Hide other organizations' activities" : "Show other organizations' activities nearby"}
            className={`bg-white shadow-md border-gray-300 h-8 w-8 p-0 ${showOtherOrgs ? 'bg-blue-100 text-blue-700 border-blue-300' : ''}`}
            disabled={loadingOtherOrgs}
          >
            <Building2 className={`h-3.5 w-3.5 ${loadingOtherOrgs ? 'animate-pulse' : ''}`} />
          </Button>
        )}
      </div>

      {/* MapLibre Map */}
      <Map
        key={mapStyle === 'satellite_imagery' ? 'satellite' : mapStyle === 'hot' ? 'hot' : 'standard'}
        styles={{
          light: MAP_STYLES[mapStyle].light,
          dark: MAP_STYLES[mapStyle].dark,
        }}
        center={mapLibreCenter}
        zoom={mapZoom}
        minZoom={3}
        maxZoom={mapStyle === 'satellite_imagery' || mapStyle === 'hot' ? 18 : 18}
        scrollZoom={false}
      >
        {/* Auto-fit bounds to show all markers */}
        <AutoFitBounds locations={validLocations} />
        
        {/* Map Controls */}
        <MapControls 
          position="bottom-right" 
          showZoom={true} 
          showFullscreen={true}
        />
        
        {/* Reset View Button */}
        <div className="absolute bottom-2 left-2 z-10">
          <ResetViewButton locations={validLocations} />
        </div>
        
        {/* Markers Mode */}
        {viewMode === 'markers' && validLocations.length > 0 && (
          <SimpleActivityMarkersLayer 
            locations={validLocations}
            activityTitle={activityTitle}
          />
        )}

        {/* Heatmap Mode */}
        {viewMode === 'heatmap' && heatmapPoints.length > 0 && (
          <HeatmapLayer
            points={heatmapPoints}
            options={{
              radius: 30,
              intensity: 1,
              opacity: 0.8,
              maxZoom: 12,
            }}
          />
        )}

        {/* Other Organizations' Locations */}
        {showOtherOrgs && otherOrgsLocations.length > 0 && (
          <OtherOrgsMarkersLayer locations={otherOrgsLocations} />
        )}
      </Map>
    </div>
  );
}

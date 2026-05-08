'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Map, useMap } from '@/components/ui/map';
import { MapStyleSelect } from '@/components/maps/MapStyleSelect';
import { MapBridge, MapZoomRotateOverlay } from '@/components/maps/MapOverlayControls';
import { Button } from '@/components/ui/button';
import {
  CircleDot,
  Flame,
  MapPin,
  Building2,
  Layers,
  ChevronsUpDown,
  Check,
  Cross,
  Zap,
  Waves,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import MapLibreGL from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
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
const HealthFacilitiesLayer = dynamic(
  () => import('@/components/maps-v2/HealthFacilitiesLayer'),
  { ssr: false }
);
const PowerGridLayer = dynamic(
  () => import('@/components/maps-v2/PowerGridLayer'),
  { ssr: false }
);
const FloodRiskLayer = dynamic(
  () => import('@/components/maps-v2/FloodRiskLayer'),
  { ssr: false }
);

import { FACILITY_TYPES } from '@/components/maps-v2/HealthFacilitiesLayer';
import { POWER_GRID_TYPES } from '@/components/maps-v2/PowerGridLayer';
import { FLOOD_RISK_LEVELS } from '@/components/maps-v2/FloodRiskLayer';

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
          tiles: ['/api/tiles/hot/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
          maxzoom: 19,
        },
      },
      layers: [
        { id: 'hot-osm-layer', type: 'raster' as const, source: 'hot-osm', minzoom: 0, maxzoom: 22 },
      ],
    },
    dark: {
      version: 8 as const,
      sources: {
        'hot-osm': {
          type: 'raster' as const,
          tiles: ['/api/tiles/hot/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
          maxzoom: 19,
        },
      },
      layers: [
        { id: 'hot-osm-layer', type: 'raster' as const, source: 'hot-osm', minzoom: 0, maxzoom: 22 },
      ],
    },
  },
  osm_liberty: {
    name: 'OpenStreetMap Liberty',
    light: 'https://tiles.openfreemap.org/styles/liberty',
    dark: 'https://tiles.openfreemap.org/styles/liberty',
  },
  satellite_imagery: {
    name: 'Satellite Imagery',
    light: {
      version: 8 as const,
      sources: {
        'esri-satellite': {
          type: 'raster' as const,
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '© Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxzoom: 19,
        },
      },
      layers: [
        { id: 'esri-satellite-layer', type: 'raster' as const, source: 'esri-satellite', minzoom: 0, maxzoom: 22 },
      ],
    },
    dark: {
      version: 8 as const,
      sources: {
        'esri-satellite': {
          type: 'raster' as const,
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '© Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxzoom: 19,
        },
      },
      layers: [
        { id: 'esri-satellite-layer', type: 'raster' as const, source: 'esri-satellite', minzoom: 0, maxzoom: 22 },
      ],
    },
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
  mapCenter: [number, number]; // [lat, lng] — converted internally to [lng, lat] for MapLibre
  mapZoom: number;
  viewMode?: 'markers' | 'heatmap';
  activityTitle?: string;
  organizationId?: string;
}

// Fit map bounds around all activity locations
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
    padding: 80,
    maxZoom: 12,
    duration,
  });
}

function AutoFitBounds({ locations }: { locations: Location[] }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || locations.length === 0) return;
    const timer = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fitBoundsToLocations(map as any, locations);
    }, 100);
    return () => clearTimeout(timer);
  }, [map, isLoaded, locations]);

  return null;
}

export default function ActivityLocationsMapViewV2({
  locations,
  mapCenter,
  mapZoom,
  viewMode: initialViewMode = 'markers',
  activityTitle,
  organizationId,
}: ActivityLocationsMapViewV2Props) {
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const handleMapReady = useCallback((map: MapLibreMap | null) => {
    setMapInstance(map);
  }, []);

  const [mapStyle, setMapStyle] = useState<MapStyleKey>('carto_light');
  const [viewMode, setViewMode] = useState<'markers' | 'heatmap'>(initialViewMode);
  const [showOtherOrgs, setShowOtherOrgs] = useState(false);
  const [otherOrgsLocations, setOtherOrgsLocations] = useState<OtherOrgLocation[]>([]);
  const [loadingOtherOrgs, setLoadingOtherOrgs] = useState(false);

  // Data layers visibility (same shape as Atlas)
  const [layersPopoverOpen, setLayersPopoverOpen] = useState(false);
  const [showHealthFacilities, setShowHealthFacilities] = useState(false);
  const [healthFacilityTypes, setHealthFacilityTypes] = useState<string[]>([]);
  const [showPowerGrid, setShowPowerGrid] = useState(false);
  const [powerGridTypes, setPowerGridTypes] = useState<string[]>([]);
  const [showFloodRisk, setShowFloodRisk] = useState(false);
  const [floodRiskLevels, setFloodRiskLevels] = useState<string[]>([]);

  const [healthFacilitiesLoading, setHealthFacilitiesLoading] = useState(false);
  const [healthFacilitiesCount, setHealthFacilitiesCount] = useState<number | null>(null);
  const [powerGridLoading, setPowerGridLoading] = useState(false);
  const [powerGridCount, setPowerGridCount] = useState<number | null>(null);
  const [floodRiskLoading, setFloodRiskLoading] = useState(false);
  const [floodRiskCount, setFloodRiskCount] = useState<number | null>(null);

  // Country code for the data layer fetches — comes from system settings (home country)
  const [countryCode, setCountryCode] = useState<string>('MM');
  useEffect(() => {
    apiFetch('/api/admin/system-settings')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.homeCountry) setCountryCode(data.homeCountry);
      })
      .catch(() => {});
  }, []);

  // Other organizations' locations
  useEffect(() => {
    if (!showOtherOrgs || !organizationId) {
      setOtherOrgsLocations([]);
      return;
    }
    setLoadingOtherOrgs(true);
    apiFetch('/api/locations')
      .then(r => r.json())
      .then(data => {
        if (data?.success && data.locations) {
          const filtered = data.locations.filter(
            (loc: OtherOrgLocation) =>
              loc.activity?.organization_id && loc.activity.organization_id !== organizationId
          );
          setOtherOrgsLocations(filtered);
        }
      })
      .catch(err => console.error('Failed to fetch other organisations locations:', err))
      .finally(() => setLoadingOtherOrgs(false));
  }, [showOtherOrgs, organizationId]);

  const validLocations = useMemo(() => {
    return locations.filter(loc => {
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      return !isNaN(lat) && !isNaN(lng);
    });
  }, [locations]);

  const heatmapPoints = useMemo(() => {
    return validLocations.map(loc => ({
      lat: Number(loc.latitude),
      lng: Number(loc.longitude),
      intensity: 0.8,
    }));
  }, [validLocations]);

  // Convert center from [lat, lng] to [lng, lat] for MapLibre
  const mapLibreCenter: [number, number] = [mapCenter[1], mapCenter[0]];

  if (validLocations.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-surface-muted rounded-md">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-muted-foreground">No location data available</p>
        </div>
      </div>
    );
  }

  const anyLayerOn = showHealthFacilities || showPowerGrid || showFloodRisk;
  const layerCount = [showHealthFacilities, showPowerGrid, showFloodRisk].filter(Boolean).length;

  return (
    <div className="relative h-full w-full">
      {/* Top-left overlay: Style, Layers, View Mode, Other Orgs */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <MapStyleSelect
          value={mapStyle}
          onChange={setMapStyle}
          triggerClassName="w-[180px] h-11 text-sm shadow-md"
        />

        {/* Layers Popover */}
        <Popover open={layersPopoverOpen} onOpenChange={setLayersPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-11 px-4 gap-2 text-sm shadow-md bg-white ${anyLayerOn ? 'bg-muted border-border text-foreground' : ''}`}
            >
              <Layers className="h-5 w-5" />
              <span>Layers</span>
              {anyLayerOn && (
                <span className="bg-foreground text-background text-[11px] rounded-full h-5 w-5 flex items-center justify-center">
                  {layerCount}
                </span>
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <div className="p-3 border-b">
              <h4 className="font-medium text-body">Data Layers</h4>
              <p className="text-helper text-muted-foreground">Toggle additional map layers</p>
            </div>
            <div className="p-2">
              {/* Health Facilities */}
              <div className={`rounded-md ${showHealthFacilities ? 'bg-muted' : ''}`}>
                <div
                  className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/50 rounded-md"
                  onClick={() => {
                    setShowHealthFacilities(!showHealthFacilities);
                    if (showHealthFacilities) {
                      setHealthFacilitiesCount(null);
                      setHealthFacilityTypes([]);
                    }
                  }}
                >
                  <div className={`h-4 w-4 rounded border flex items-center justify-center ${showHealthFacilities ? 'bg-foreground border-foreground' : 'border-input'}`}>
                    {showHealthFacilities && <Check className="h-3 w-3 text-background" />}
                  </div>
                  <Cross className="h-4 w-4 text-destructive" />
                  <div className="flex-1">
                    <div className="text-body font-medium">OSM Health Facilities</div>
                    <div className="text-helper text-muted-foreground">
                      {healthFacilitiesLoading ? 'Loading...' :
                        healthFacilitiesCount !== null ? `${healthFacilitiesCount.toLocaleString()} facilities` :
                          'Hospitals, clinics, pharmacies'}
                    </div>
                  </div>
                  {healthFacilitiesLoading && (
                    <div className="h-4 w-4 border-2 border-destructive/30 border-t-red-600 rounded-full animate-spin" />
                  )}
                </div>
                {showHealthFacilities && (
                  <div className="ml-6 pb-2 space-y-1">
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-helper text-muted-foreground">Filter by type:</span>
                      {healthFacilityTypes.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setHealthFacilityTypes([]); }}
                          className="text-helper text-muted-foreground hover:text-foreground"
                        >Show all</button>
                      )}
                    </div>
                    {FACILITY_TYPES.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-white/50 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHealthFacilityTypes(prev => {
                            if (prev.length === 0) return [type.id];
                            if (prev.includes(type.id)) return prev.filter(t => t !== type.id);
                            return [...prev, type.id];
                          });
                        }}
                      >
                        <div
                          className="h-3 w-3 rounded-sm border flex items-center justify-center border-input"
                          style={{
                            backgroundColor: healthFacilityTypes.length === 0 || healthFacilityTypes.includes(type.id)
                              ? type.color : 'transparent',
                          }}
                        >
                          {(healthFacilityTypes.length === 0 || healthFacilityTypes.includes(type.id)) && (
                            <Check className="h-2 w-2 text-white" />
                          )}
                        </div>
                        <span
                          className="text-helper"
                          style={{
                            color: healthFacilityTypes.length === 0 || healthFacilityTypes.includes(type.id)
                              ? type.color : '#9ca3af',
                          }}
                        >{type.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Power Grid */}
              <div className={`rounded-md mt-1 ${showPowerGrid ? 'bg-muted' : ''}`}>
                <div
                  className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/50 rounded-md"
                  onClick={() => {
                    setShowPowerGrid(!showPowerGrid);
                    if (showPowerGrid) {
                      setPowerGridCount(null);
                      setPowerGridTypes([]);
                    }
                  }}
                >
                  <div className={`h-4 w-4 rounded border flex items-center justify-center ${showPowerGrid ? 'bg-foreground border-foreground' : 'border-input'}`}>
                    {showPowerGrid && <Check className="h-3 w-3 text-background" />}
                  </div>
                  <Zap className="h-4 w-4 text-amber-600" />
                  <div className="flex-1">
                    <div className="text-body font-medium">OSM Power Grid</div>
                    <div className="text-helper text-muted-foreground">
                      {powerGridLoading ? 'Loading...' :
                        powerGridCount !== null ? `${powerGridCount.toLocaleString()} features` :
                          'Lines, substations, plants'}
                    </div>
                  </div>
                  {powerGridLoading && (
                    <div className="h-4 w-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                  )}
                </div>
                {showPowerGrid && (
                  <div className="ml-6 pb-2 space-y-1">
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-helper text-muted-foreground">Filter by type:</span>
                      {powerGridTypes.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPowerGridTypes([]); }}
                          className="text-helper text-muted-foreground hover:text-foreground"
                        >Show all</button>
                      )}
                    </div>
                    {POWER_GRID_TYPES.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-white/50 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPowerGridTypes(prev => {
                            if (prev.length === 0) return [type.id];
                            if (prev.includes(type.id)) return prev.filter(t => t !== type.id);
                            return [...prev, type.id];
                          });
                        }}
                      >
                        <div
                          className="h-3 w-3 rounded-sm border flex items-center justify-center border-input"
                          style={{
                            backgroundColor: powerGridTypes.length === 0 || powerGridTypes.includes(type.id)
                              ? type.color : 'transparent',
                          }}
                        >
                          {(powerGridTypes.length === 0 || powerGridTypes.includes(type.id)) && (
                            <Check className="h-2 w-2 text-white" />
                          )}
                        </div>
                        <span
                          className="text-helper"
                          style={{
                            color: powerGridTypes.length === 0 || powerGridTypes.includes(type.id)
                              ? type.color : '#9ca3af',
                          }}
                        >{type.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Flood Risk */}
              <div className={`rounded-md mt-1 ${showFloodRisk ? 'bg-muted' : ''}`}>
                <div
                  className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/50 rounded-md"
                  onClick={() => {
                    setShowFloodRisk(!showFloodRisk);
                    if (showFloodRisk) {
                      setFloodRiskCount(null);
                      setFloodRiskLevels([]);
                    }
                  }}
                >
                  <div className={`h-4 w-4 rounded border flex items-center justify-center ${showFloodRisk ? 'bg-foreground border-foreground' : 'border-input'}`}>
                    {showFloodRisk && <Check className="h-3 w-3 text-background" />}
                  </div>
                  <Waves className="h-4 w-4 text-cyan-600" />
                  <div className="flex-1">
                    <div className="text-body font-medium">Flood Risk Zones</div>
                    <div className="text-helper text-muted-foreground">
                      {floodRiskLoading ? 'Loading...' :
                        floodRiskCount !== null ? `${floodRiskCount.toLocaleString()} zones` :
                          'Flood hazard areas'}
                    </div>
                  </div>
                  {floodRiskLoading && (
                    <div className="h-4 w-4 border-2 border-cyan-300 border-t-cyan-600 rounded-full animate-spin" />
                  )}
                </div>
                {showFloodRisk && (
                  <div className="ml-6 pb-2 space-y-1">
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-helper text-muted-foreground">Filter by risk:</span>
                      {floodRiskLevels.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setFloodRiskLevels([]); }}
                          className="text-helper text-muted-foreground hover:text-foreground"
                        >Show all</button>
                      )}
                    </div>
                    {FLOOD_RISK_LEVELS.map((level) => (
                      <div
                        key={level.id}
                        className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-white/50 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFloodRiskLevels(prev => {
                            if (prev.length === 0) return [level.id];
                            if (prev.includes(level.id)) return prev.filter(l => l !== level.id);
                            return [...prev, level.id];
                          });
                        }}
                      >
                        <div
                          className="h-3 w-3 rounded-sm border flex items-center justify-center border-input"
                          style={{
                            backgroundColor: floodRiskLevels.length === 0 || floodRiskLevels.includes(level.id)
                              ? level.color : 'transparent',
                          }}
                        >
                          {(floodRiskLevels.length === 0 || floodRiskLevels.includes(level.id)) && (
                            <Check className="h-2 w-2 text-white" />
                          )}
                        </div>
                        <span
                          className="text-helper"
                          style={{
                            color: floodRiskLevels.length === 0 || floodRiskLevels.includes(level.id)
                              ? level.color : '#9ca3af',
                          }}
                        >{level.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Markers / Heatmap toggle */}
        <div className="inline-flex items-center gap-0.5 rounded-md bg-muted p-1 shadow-md border border-border">
          <Button
            onClick={() => setViewMode('markers')}
            variant="ghost"
            size="sm"
            title="Show markers"
            className={cn(
              'h-9 w-9 p-0',
              viewMode === 'markers'
                ? 'bg-white shadow-sm text-foreground hover:bg-white'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <CircleDot className="h-5 w-5" />
          </Button>
          <Button
            onClick={() => setViewMode('heatmap')}
            variant="ghost"
            size="sm"
            title="Show heatmap"
            className={cn(
              'h-9 w-9 p-0',
              viewMode === 'heatmap'
                ? 'bg-white shadow-sm text-foreground hover:bg-white'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Flame className="h-5 w-5" />
          </Button>
        </div>

      </div>

      {/* Top-right zoom / rotate / tilt / compass */}
      <MapZoomRotateOverlay map={mapInstance} />

      {/* MapLibre Map */}
      <Map
        key={mapStyle === 'satellite_imagery' ? 'satellite' : mapStyle === 'hot' ? 'hot' : 'standard'}
        styles={{
          light: MAP_STYLES[mapStyle].light as string | object,
          dark: MAP_STYLES[mapStyle].dark as string | object,
        }}
        center={mapLibreCenter}
        zoom={mapZoom}
        minZoom={3}
        maxZoom={18}
        scrollZoom={false}
      >
        <MapBridge onMap={handleMapReady} />

        {/* Auto-fit bounds to show all markers */}
        <AutoFitBounds locations={validLocations} />

        {/* Markers */}
        {viewMode === 'markers' && validLocations.length > 0 && (
          <SimpleActivityMarkersLayer
            locations={validLocations}
            activityTitle={activityTitle}
          />
        )}

        {/* Heatmap */}
        {viewMode === 'heatmap' && heatmapPoints.length > 0 && (
          <HeatmapLayer
            points={heatmapPoints}
            options={{ radius: 30, intensity: 1, opacity: 0.8, maxZoom: 12 }}
          />
        )}

        {/* Data layers */}
        <HealthFacilitiesLayer
          country={countryCode}
          visible={showHealthFacilities}
          facilityTypes={healthFacilityTypes}
          onLoadingChange={setHealthFacilitiesLoading}
          onFacilityCountChange={setHealthFacilitiesCount}
        />
        <PowerGridLayer
          country={countryCode}
          visible={showPowerGrid}
          infrastructureTypes={powerGridTypes}
          onLoadingChange={setPowerGridLoading}
          onFeatureCountChange={setPowerGridCount}
        />
        <FloodRiskLayer
          country={countryCode}
          visible={showFloodRisk}
          riskLevels={floodRiskLevels}
          onLoadingChange={setFloodRiskLoading}
          onZoneCountChange={setFloodRiskCount}
        />

        {/* Other organisations' locations */}
        {showOtherOrgs && otherOrgsLocations.length > 0 && (
          <OtherOrgsMarkersLayer locations={otherOrgsLocations} />
        )}
      </Map>
    </div>
  );
}

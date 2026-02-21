"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MapPin,
  RotateCcw,
  Flame,
  CircleDot,
  BarChart3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown,
  Mountain,
  Map as MapIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { ACTIVITY_STATUS_GROUPS } from '@/data/activity-status-types';
import { SectorHierarchyFilter, SectorFilterSelection, matchesSectorFilter } from '@/components/maps/SectorHierarchyFilter';
import { apiFetch } from '@/lib/api-fetch';
import { Map, MapControls, useMap } from '@/components/ui/map';
import { useHomeCountry } from '@/contexts/SystemSettingsContext';
import { getCountryCenter, getCountryZoom } from '@/data/country-coordinates';
import type MapLibreGL from 'maplibre-gl';

// Dynamic imports for map layers (SSR disabled)
const MarkersLayer = dynamic(
  () => import('@/components/maps-v2/MarkersLayer'),
  { ssr: false }
);
const HeatmapLayer = dynamic(
  () => import('@/components/maps-v2/HeatmapLayer'),
  { ssr: false }
);
const SubnationalChoroplethMap = dynamic(
  () => import('@/components/maps/SubnationalChoroplethMap'),
  { ssr: false }
);

// HOT (Humanitarian OpenStreetMap Team) raster tile style
// Using local proxy to bypass CORS restrictions
const HOT_STYLE = {
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
};

// ESRI Satellite raster tile style (free, no API key)
const SATELLITE_STYLE = {
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
};

// Map style configurations matching Atlas
const MAP_STYLES = {
  carto_light: {
    name: 'Streets (Light)',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  carto_voyager: {
    name: 'Voyager',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  hot: {
    name: 'Humanitarian (HOT)',
    style: HOT_STYLE,
  },
  osm_liberty: {
    name: 'OpenStreetMap Liberty',
    style: 'https://tiles.openfreemap.org/styles/liberty',
  },
  satellite_imagery: {
    name: 'Satellite Imagery',
    style: SATELLITE_STYLE,
  },
};

type MapStyleKey = keyof typeof MAP_STYLES;

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
type TabMode = 'map' | 'subnational';

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
    organization_acronym?: string;
    organization_logo?: string;
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

// Helper component to fit bounds when map loads
function MapBoundsHandler({
  bounds,
  shouldReset
}: {
  bounds: [[number, number], [number, number]] | null;
  shouldReset: boolean;
}) {
  const { map, isLoaded } = useMap();
  const initialFitDone = useRef(false);

  // Initial fit to bounds
  useEffect(() => {
    if (!isLoaded || !map || !bounds || initialFitDone.current) return;

    // Convert bounds from [lat, lng] to MapLibre format [lng, lat]
    const sw: [number, number] = [bounds[0][1], bounds[0][0]]; // [lng, lat]
    const ne: [number, number] = [bounds[1][1], bounds[1][0]]; // [lng, lat]

    setTimeout(() => {
      map.fitBounds([sw, ne], {
        padding: 50,
        maxZoom: 12,
        duration: 1000
      });
      initialFitDone.current = true;
    }, 100);
  }, [isLoaded, map, bounds]);

  // Reset handler
  useEffect(() => {
    if (!isLoaded || !map || !bounds || !shouldReset) return;

    const sw: [number, number] = [bounds[0][1], bounds[0][0]];
    const ne: [number, number] = [bounds[1][1], bounds[1][0]];

    map.fitBounds([sw, ne], {
      padding: 50,
      maxZoom: 12,
      duration: 1000
    });
  }, [isLoaded, map, bounds, shouldReset]);

  return null;
}

// Bridge component: syncs map instance + 3D state to the parent
function Map3DSync({ onIs3DChange }: { onIs3DChange: (v: boolean) => void }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleMove = () => {
      const pitch = Math.round(map.getPitch());
      const bearing = Math.round(map.getBearing());
      onIs3DChange(pitch !== 0 || bearing !== 0);
    };

    map.on('move', handleMove);
    return () => { map.off('move', handleMove); };
  }, [map, isLoaded, onIs3DChange]);

  return null;
}

export function OrgActivitiesMap({ organizationId }: OrgActivitiesMapProps) {
  const homeCountry = useHomeCountry();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('carto_voyager');
  const [viewMode, setViewMode] = useState<ViewMode>('markers');
  const [shouldResetMap, setShouldResetMap] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<SectorFilterSelection>({
    sectorCategories: [],
    sectors: [],
    subSectors: [],
  });
  const [showOnlyActiveSectors, setShowOnlyActiveSectors] = useState(true);
  const [tabMode, setTabMode] = useState<TabMode>('map');
  const mapRef = useRef<MapLibreGL.Map | null>(null);
  const [is3D, setIs3D] = useState(false);

  // Subnational breakdown state
  const [subnationalData, setSubnationalData] = useState<{
    breakdowns: Record<string, number>;
    details: Record<string, any>;
  }>({ breakdowns: {}, details: {} });
  const [subnationalLoading, setSubnationalLoading] = useState(false);
  const [subnationalViewLevel, setSubnationalViewLevel] = useState<'region' | 'township'>('region');

  // Table sorting state
  const [sortColumn, setSortColumn] = useState<'region' | 'activities' | 'allocation' | 'coverage'>('allocation');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  // Fetch subnational breakdown data when tab is active
  useEffect(() => {
    if (tabMode !== 'subnational') return;

    const fetchSubnationalData = async () => {
      try {
        setSubnationalLoading(true);

        const params = new URLSearchParams();
        params.append('organizationId', organizationId);
        params.append('view_level', subnationalViewLevel);

        const response = await apiFetch(`/api/subnational-breakdowns?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch subnational breakdown data');
        }

        setSubnationalData(data);
      } catch (err) {
        console.error('[OrgActivitiesMap] Error fetching subnational data:', err);
      } finally {
        setSubnationalLoading(false);
      }
    };

    fetchSubnationalData();
  }, [organizationId, tabMode, subnationalViewLevel]);

  // Compute region breakdowns with details (same pattern as Atlas)
  const regionBreakdownsWithDetails = useMemo(() => {
    const result: Record<string, { percentage: number; activityCount?: number; activities?: Array<{ id: string; title: string }> }> = {};
    const breakdowns = subnationalData?.breakdowns || {};
    const details = subnationalData?.details || {};

    Object.entries(breakdowns).forEach(([region, percentage]) => {
      result[region] = {
        percentage: percentage as number,
        activityCount: details[region]?.activityCount || 0,
        activities: details[region]?.activities?.map((a: any) => ({ id: a.id, title: a.title })) || []
      };
    });
    return result;
  }, [subnationalData]);

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

  // Compute sector activity counts (apply status filter only, not sector filter)
  const sectorActivityCounts = useMemo(() => {
    let locationsForCounting = validLocations;
    if (statusFilter !== 'all') {
      locationsForCounting = locationsForCounting.filter(loc =>
        loc.activity?.status === statusFilter
      );
    }

    const sectorActivities: Record<string, Set<string>> = {};
    locationsForCounting.forEach(location => {
      const activityId = location.activity_id;
      location.activity?.sectors?.forEach(sector => {
        if (!sectorActivities[sector.code]) {
          sectorActivities[sector.code] = new Set();
        }
        sectorActivities[sector.code].add(activityId);
      });
    });

    const counts: Record<string, number> = {};
    Object.entries(sectorActivities).forEach(([code, activities]) => {
      counts[code] = activities.size;
    });
    return counts;
  }, [validLocations, statusFilter]);

  // Calculate bounds to fit all markers with padding (in [lat, lng] format for internal use)
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

  // Default center for empty state - derived from host country in system settings
  // getCountryCenter returns [lat, lng]; MapLibre uses [lng, lat]
  const homeCenter = getCountryCenter(homeCountry);
  const defaultCenter: [number, number] = [homeCenter[1], homeCenter[0]];
  const defaultZoom = getCountryZoom(homeCountry);

  const handleReset = () => {
    setShouldResetMap(true);
    setTimeout(() => setShouldResetMap(false), 100);
  };

  const handle3DView = useCallback(() => {
    mapRef.current?.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
  }, []);

  const handle2DView = useCallback(() => {
    mapRef.current?.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
  }, []);

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
        <div className="flex items-center justify-between">
          <div>
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
          </div>

          <div className="flex justify-end">
            <Tabs value={tabMode} onValueChange={(value) => setTabMode(value as TabMode)}>
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
        <Tabs value={tabMode} onValueChange={(value) => setTabMode(value as TabMode)}>
          {/* Map View Tab */}
          <TabsContent value="map" className="space-y-4">
            {/* Filters Bar - Above the map */}
            <div className="flex items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] text-xs h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ACTIVITY_STATUS_GROUPS.map((group) => (
                      <React.Fragment key={group.label}>
                        {group.options.map((status) => (
                          <SelectItem key={status.code} value={status.code}>
                            <span className="inline-flex items-center gap-2">
                              <code className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs font-mono">{status.code}</code>
                              <span>{status.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Sector</label>
                <SectorHierarchyFilter
                  selected={sectorFilter}
                  onChange={setSectorFilter}
                  activityCounts={sectorActivityCounts}
                  showOnlyActiveSectors={showOnlyActiveSectors}
                  onShowOnlyActiveSectorsChange={setShowOnlyActiveSectors}
                  className="w-[200px] h-9 text-xs"
                />
              </div>
            </div>

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
                {/* Map controls overlay - inside the map */}
                <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5">
                  <Select value={mapStyle} onValueChange={(value) => setMapStyle(value as MapStyleKey)}>
                    <SelectTrigger className="w-[180px] bg-white shadow-md border-gray-300 text-xs h-9">
                      <SelectValue placeholder="Map style" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {Object.entries(MAP_STYLES).map(([key, style]) => (
                        <SelectItem key={key} value={key}>
                          {style.name}
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

                  {is3D ? (
                    <Button
                      onClick={handle2DView}
                      variant="outline"
                      size="sm"
                      title="2D View"
                      className="bg-white shadow-md border-gray-300 h-9 px-2.5"
                    >
                      <MapIcon className="h-4 w-4 mr-1.5" />
                      <span className="text-xs">2D</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={handle3DView}
                      variant="outline"
                      size="sm"
                      title="3D View"
                      className="bg-white shadow-md border-gray-300 h-9 px-2.5"
                    >
                      <Mountain className="h-4 w-4 mr-1.5" />
                      <span className="text-xs">3D</span>
                    </Button>
                  )}
                </div>

                {/* MapLibre Map */}
                <Map
                  key={`org-map-${organizationId}-${mapStyle}`}
                  ref={mapRef}
                  center={defaultCenter}
                  zoom={defaultZoom}
                  minZoom={2}
                  styles={{
                    light: MAP_STYLES[mapStyle].style as string | object,
                    dark: MAP_STYLES[mapStyle].style as string | object,
                  }}
                >
                  <MapControls position="top-right" showZoom />
                  <Map3DSync onIs3DChange={setIs3D} />

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
                        intensity: 1,
                        opacity: 0.8,
                        maxZoom: 12,
                        colorStops: [
                          [0, 'rgba(49, 54, 149, 0)'],
                          [0.2, '#313695'],
                          [0.3, '#4575b4'],
                          [0.4, '#74add1'],
                          [0.5, '#abd9e9'],
                          [0.6, '#ffffbf'],
                          [0.7, '#fee090'],
                          [0.8, '#fdae61'],
                          [0.9, '#f46d43'],
                          [1.0, '#d73027']
                        ]
                      }}
                    />
                  )}

                  <MapBoundsHandler bounds={mapBounds} shouldReset={shouldResetMap} />
                </Map>

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
          </TabsContent>

          {/* Sub-national Breakdown Tab */}
          <TabsContent value="subnational" className="space-y-4">
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Sub-national breakdown showing activity distribution across states and regions from activity breakdown data.
              </div>

              {subnationalLoading ? (
                <div className="space-y-4">
                  <div className="h-[700px] w-full bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                      <div className="text-sm text-gray-600">Loading sub-national breakdown data...</div>
                    </div>
                  </div>
                </div>
              ) : Object.keys(regionBreakdownsWithDetails || {}).length > 0 ? (
                <>
                  {/* Choropleth Map */}
                  <div className="h-[700px] w-full">
                    <SubnationalChoroplethMap
                      breakdowns={regionBreakdownsWithDetails}
                      viewLevel={subnationalViewLevel}
                      onViewLevelChange={setSubnationalViewLevel}
                      onFeatureClick={(pcode, name, level) => {
                        console.log('Feature clicked:', { pcode, name, level });
                      }}
                    />
                  </div>

                  {/* Breakdown Statistics Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              if (sortColumn === 'region') {
                                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortColumn('region');
                                setSortDirection('asc');
                              }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              Region
                              {sortColumn === 'region' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 text-right"
                            onClick={() => {
                              if (sortColumn === 'activities') {
                                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortColumn('activities');
                                setSortDirection('desc');
                              }
                            }}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Activities
                              {sortColumn === 'activities' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 text-right"
                            onClick={() => {
                              if (sortColumn === 'allocation') {
                                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortColumn('allocation');
                                setSortDirection('desc');
                              }
                            }}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Allocation %
                              {sortColumn === 'allocation' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 text-right"
                            onClick={() => {
                              if (sortColumn === 'coverage') {
                                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortColumn('coverage');
                                setSortDirection('desc');
                              }
                            }}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Coverage %
                              {sortColumn === 'coverage' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(regionBreakdownsWithDetails)
                          .map(([region, data]) => {
                            const details = subnationalData.details[region];
                            const activityCount = data.activityCount || 0;
                            const percentage = data.percentage || 0;
                            const totalPercentage = details?.totalPercentage || 0;
                            const activities = data.activities || [];
                            return { region, activityCount, percentage, totalPercentage, activities };
                          })
                          .sort((a, b) => {
                            let comparison = 0;
                            switch (sortColumn) {
                              case 'region':
                                comparison = a.region.localeCompare(b.region);
                                break;
                              case 'activities':
                                comparison = a.activityCount - b.activityCount;
                                break;
                              case 'allocation':
                                comparison = a.percentage - b.percentage;
                                break;
                              case 'coverage':
                                comparison = a.totalPercentage - b.totalPercentage;
                                break;
                            }
                            return sortDirection === 'asc' ? comparison : -comparison;
                          })
                          .map(({ region, activityCount, percentage, totalPercentage, activities }) => {
                            const isExpanded = expandedRows.has(region);
                            const hasActivities = activities.length > 0;
                            return (
                              <React.Fragment key={region}>
                                <TableRow
                                  className={hasActivities ? 'cursor-pointer hover:bg-muted/50' : ''}
                                  onClick={() => {
                                    if (hasActivities) {
                                      setExpandedRows(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(region)) {
                                          newSet.delete(region);
                                        } else {
                                          newSet.add(region);
                                        }
                                        return newSet;
                                      });
                                    }
                                  }}
                                >
                                  <TableCell className="w-8 p-2">
                                    {hasActivities && (
                                      isExpanded
                                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </TableCell>
                                  <TableCell className="font-medium">{region}</TableCell>
                                  <TableCell className="text-right">{activityCount}</TableCell>
                                  <TableCell className="text-right">{percentage.toFixed(1)}%</TableCell>
                                  <TableCell className="text-right">{totalPercentage.toFixed(1)}%</TableCell>
                                </TableRow>
                                {isExpanded && hasActivities && (
                                  <TableRow className="bg-muted/30">
                                    <TableCell colSpan={5} className="p-4">
                                      <div className="text-sm">
                                        <div className="font-medium mb-2">Activities in {region}:</div>
                                        <ul className="space-y-1 text-muted-foreground">
                                          {activities.map((activity) => (
                                            <li key={activity.id} className="flex items-start gap-2">
                                              <span className="text-muted-foreground/50">•</span>
                                              <a
                                                href={`/activities/${activity.id}`}
                                                className="hover:text-primary hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {activity.title}
                                              </a>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="p-8 border-2 border-dashed rounded-lg text-center">
                  <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Sub-national Breakdown Data Available</h3>
                  <p className="text-muted-foreground mb-4">
                    No activities with sub-national breakdown information found for this organization.
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
  );
}

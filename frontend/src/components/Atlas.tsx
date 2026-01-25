'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Map as MapIcon, 
  RotateCcw, 
  MapPin, 
  Flame, 
  BarChart3, 
  CircleDot,
  ChevronsUpDown,
  Check,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown,
  Mountain
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton-loader';
import { SectorHierarchyFilter, SectorFilterSelection, matchesSectorFilter } from '@/components/maps/SectorHierarchyFilter';
import { MapSearch } from '@/components/maps/MapSearch';
import { ACTIVITY_STATUS_GROUPS } from '@/data/activity-status-types';
import { useOrganizations } from '@/hooks/use-organizations';
import { getCountryCoordinates, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/data/country-coordinates';

// mapcn map components
import { Map, MapControls, useMap } from '@/components/ui/map';

// Dynamic import for MyanmarRegionsMap (SVG-based, no MapLibre needed)
const MyanmarRegionsMap = dynamic(() => import('@/components/MyanmarRegionsMap'), { ssr: false });

// Dynamic import for MapLibre-based layers
const MarkersLayer = dynamic(() => import('./maps-v2/MarkersLayer'), { ssr: false });
const HeatmapLayer = dynamic(() => import('./maps-v2/HeatmapLayer'), { ssr: false });
const MapFlyTo = dynamic(() => import('./maps-v2/MapFlyTo'), { ssr: false });

// Map style configurations for mapcn
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
  osm_liberty: {
    name: 'OpenStreetMap Liberty',
    light: 'https://tiles.openfreemap.org/styles/liberty',
    dark: 'https://tiles.openfreemap.org/styles/liberty',
  },
};

type MapStyleKey = keyof typeof MAP_STYLES;

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
    totalCommitments?: number;
    totalDisbursed?: number;
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    banner?: string;
    icon?: string;
  } | null;
}

// View mode types
type ViewMode = 'markers' | 'heatmap';
type TabMode = 'map' | 'subnational';

// Map 3D Controller Component (uses useMap inside Map context)
function Map3DController({ 
  homeCountryCenter, 
  homeCountryZoom 
}: { 
  homeCountryCenter: [number, number]; 
  homeCountryZoom: number;
}) {
  const { map, isLoaded } = useMap();
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleMove = () => {
      setPitch(Math.round(map.getPitch()));
      setBearing(Math.round(map.getBearing()));
    };

    map.on('move', handleMove);
    return () => {
      map.off('move', handleMove);
    };
  }, [map, isLoaded]);

  const handle3DView = useCallback(() => {
    map?.easeTo({
      pitch: 60,
      bearing: -20,
      duration: 1000,
    });
  }, [map]);

  const handleReset = useCallback(() => {
    if (map) {
      map.flyTo({
        center: [homeCountryCenter[1], homeCountryCenter[0]], // MapLibre uses [lng, lat]
        zoom: homeCountryZoom,
        pitch: 0,
        bearing: 0,
        duration: 1500,
      });
    }
  }, [map, homeCountryCenter, homeCountryZoom]);

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
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
        <Button
          onClick={handleReset}
          variant="outline"
          size="sm"
          title="Reset view"
          className="bg-white shadow-md border-gray-300 h-9 w-9 p-0"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      {(pitch !== 0 || bearing !== 0) && (
        <div className="rounded-md bg-white/90 backdrop-blur px-2.5 py-1.5 text-[10px] font-mono border border-gray-300 shadow-md">
          <div className="text-gray-600">Pitch: {pitch}°</div>
          <div className="text-gray-600">Bearing: {bearing}°</div>
        </div>
      )}
    </div>
  );
}

export default function Atlas() {
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('carto_light');
  const [viewMode, setViewMode] = useState<ViewMode>('markers');
  const [tabMode, setTabMode] = useState<TabMode>('map');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [orgFilterOpen, setOrgFilterOpen] = useState(false);
  const [orgFilterSearch, setOrgFilterSearch] = useState('');
  // Sorting state for subnational breakdown table
  const [sortColumn, setSortColumn] = useState<'region' | 'activities' | 'allocation' | 'coverage'>('allocation');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  // Expanded rows state for showing activities
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sectorFilter, setSectorFilter] = useState<SectorFilterSelection>({
    sectorCategories: [],
    sectors: [],
    subSectors: [],
  });

  // Fetch organizations with logos
  const { organizations: allOrganizations } = useOrganizations();

  // Home country coordinates from system settings
  const [homeCountryCenter, setHomeCountryCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [homeCountryZoom, setHomeCountryZoom] = useState<number>(DEFAULT_MAP_ZOOM);

  // State for fly-to target
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
      }
    }
    fetchHomeCountry()
  }, []);

  // Handler for location search
  const handleLocationSearch = useCallback((lat: number, lng: number, name: string, type: string) => {
    console.log('[Atlas] handleLocationSearch called:', { lat, lng, name, type });

    // Determine zoom level based on location type
    let zoomLevel = 10;
    if (type === 'city' || type === 'town' || type === 'village' || type === 'hamlet') {
      zoomLevel = 12;
    } else if (type === 'administrative' || type === 'state' || type === 'region' || type === 'province') {
      zoomLevel = 9;
    } else if (type === 'country') {
      zoomLevel = 6;
    }

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

  // Fetch locations from API
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
          console.log('[Atlas] Locations loaded:', data.locations.length);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('[Atlas] Error fetching locations:', err);
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
        
        const response = await fetch(`/api/subnational-breakdowns?${params}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch subnational breakdown data');
        }
        
        setSubnationalData(data);
      } catch (err) {
        console.error('[Atlas] Error fetching subnational breakdown data:', err);
      } finally {
        setSubnationalLoading(false);
      }
    };

    fetchSubnationalData();
  }, [statusFilter, orgFilter]);

  // Filter valid locations
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

  // Get unique organizations for filter with logo data
  const organizations = useMemo(() => {
    const orgNames = new Set<string>();
    locations.forEach(location => {
      if (location.activity?.organization_name) {
        orgNames.add(location.activity.organization_name);
      }
    });
    
    const orgList = Array.from(orgNames).map(name => {
      const fullOrg = allOrganizations.find(org => 
        org.name === name || org.acronym === name
      );
      return {
        name,
        logo: fullOrg?.logo,
        acronym: fullOrg?.acronym,
      };
    });
    
    return orgList.sort((a, b) => a.name.localeCompare(b.name));
  }, [locations, allOrganizations]);

  // Use subnational breakdown data from database
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

  // Prepare heatmap points
  const heatmapPoints = useMemo(() => {
    return filteredLocations
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
  }, [filteredLocations]);

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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="h-5 w-5" />
              Map & Analysis
            </CardTitle>
            
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
            <TabsContent value="map" className="space-y-4">
              {/* Map Container */}
              <div className="h-[92vh] min-h-[800px] w-full relative rounded-lg overflow-hidden border border-gray-200">
                {/* Controls Bar - positioned above map */}
                <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-2">
                  {/* Filters */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="!w-[130px] min-w-[130px] bg-white shadow-md border-gray-300 text-xs h-9">
                      <SelectValue placeholder="All Statuses" />
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
                  
                  <Popover open={orgFilterOpen} onOpenChange={setOrgFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={orgFilterOpen}
                        className="!w-[200px] min-w-[200px] justify-between bg-white shadow-md border-gray-300 text-xs h-9 font-normal"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {orgFilter === 'all' ? (
                            <Building2 className="h-4 w-4 text-gray-500 shrink-0" />
                          ) : (
                            (() => {
                              const selectedOrg = organizations.find(o => o.name === orgFilter);
                              return selectedOrg?.logo ? (
                                <img src={selectedOrg.logo} alt="" className="h-4 w-4 rounded-sm object-contain shrink-0" />
                              ) : (
                                <Building2 className="h-4 w-4 text-gray-500 shrink-0" />
                              );
                            })()
                          )}
                          <span className="truncate">
                            {orgFilter === 'all' ? 'All Organizations' : orgFilter}
                          </span>
                        </div>
                        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search organizations..." 
                          value={orgFilterSearch}
                          onValueChange={setOrgFilterSearch}
                          className="text-xs"
                        />
                        <CommandList>
                          <CommandEmpty>No organization found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setOrgFilter('all');
                                setOrgFilterOpen(false);
                                setOrgFilterSearch('');
                              }}
                              className="flex items-center text-xs"
                            >
                              <Check className={cn("h-3.5 w-3.5 mr-2 shrink-0", orgFilter === 'all' ? "opacity-100" : "opacity-0")} />
                              <Building2 className="h-5 w-5 mr-2 text-gray-400 shrink-0" />
                              <span>All Organizations</span>
                            </CommandItem>
                            {organizations
                              .filter(org => 
                                org.name.toLowerCase().includes(orgFilterSearch.toLowerCase()) ||
                                (org.acronym && org.acronym.toLowerCase().includes(orgFilterSearch.toLowerCase()))
                              )
                              .map((org) => (
                                <CommandItem
                                  key={org.name}
                                  value={org.name}
                                  onSelect={() => {
                                    setOrgFilter(org.name);
                                    setOrgFilterOpen(false);
                                    setOrgFilterSearch('');
                                  }}
                                  className="flex items-center text-xs"
                                >
                                  <Check className={cn("h-3.5 w-3.5 mr-2 shrink-0", orgFilter === org.name ? "opacity-100" : "opacity-0")} />
                                  <div className="h-5 w-5 mr-2 shrink-0 flex items-center justify-center">
                                    {org.logo ? (
                                      <img 
                                        src={org.logo} 
                                        alt={org.name} 
                                        className="h-5 w-5 rounded-sm object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                    ) : null}
                                    <Building2 className={cn("h-4 w-4 text-gray-400", org.logo ? "hidden" : "")} />
                                  </div>
                                  <span className="truncate">
                                    {org.name}{org.acronym && org.acronym !== org.name ? ` (${org.acronym})` : ''}
                                  </span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  <SectorHierarchyFilter
                    selected={sectorFilter}
                    onChange={setSectorFilter}
                    className="!w-[280px] min-w-[280px] bg-white shadow-md border-gray-300 h-9 text-xs"
                  />
                  
                  {/* Search */}
                  <MapSearch
                    onLocationSelect={handleLocationSearch}
                    className="w-[180px]"
                    placeholder="Search location..."
                  />
                  
                  {/* Spacer */}
                  <div className="flex-1" />
                  
                  {/* Map Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={mapStyle} onValueChange={(value) => setMapStyle(value as MapStyleKey)}>
                      <SelectTrigger className="!w-[180px] min-w-[180px] bg-white shadow-md border-gray-300 text-xs h-9">
                        <SelectValue placeholder="Map style" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(MAP_STYLES).map(([key, style]) => (
                          <SelectItem key={key} value={key}>
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
                
                {/* MapLibre Map */}
                <Map
                  styles={{
                    light: MAP_STYLES[mapStyle].light,
                    dark: MAP_STYLES[mapStyle].dark,
                  }}
                  center={[homeCountryCenter[1], homeCountryCenter[0]]} // MapLibre uses [lng, lat]
                  zoom={homeCountryZoom}
                  minZoom={2}
                  maxZoom={18}
                >
                  {/* Map Controls - positioned inside Map context */}
                  <div className="absolute top-16 right-3 z-[1000]">
                    <Map3DController 
                      homeCountryCenter={homeCountryCenter} 
                      homeCountryZoom={homeCountryZoom} 
                    />
                  </div>
                  
                  <MapControls 
                    position="bottom-right" 
                    showZoom={true} 
                    showCompass={true}
                    showLocate={true}
                    showFullscreen={true}
                  />
                  
                  {/* Markers Mode */}
                  {viewMode === 'markers' && filteredLocations.length > 0 && (
                    <MarkersLayer locations={filteredLocations} />
                  )}

                  {/* Heatmap Mode */}
                  {viewMode === 'heatmap' && heatmapPoints.length > 0 && (
                    <HeatmapLayer points={heatmapPoints} />
                  )}
                  
                  {/* Fly To Handler */}
                  <MapFlyTo 
                    target={flyToTarget} 
                    onComplete={() => setFlyToTarget(null)} 
                  />
                </Map>
                
                {filteredLocations.length === 0 && !loading && (
                  <div className="absolute inset-0 bg-gray-50/90 flex items-center justify-center pointer-events-none">
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
                  Sub-national breakdown showing activity distribution across Myanmar&apos;s states and regions from activity breakdown data.
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
                ) : Object.keys(regionBreakdownsWithDetails || {}).length > 0 ? (
                  <>
                    {/* Myanmar Admin Map */}
                    <div className="h-[85vh] min-h-[700px] w-full">
                      <MyanmarRegionsMap 
                        breakdowns={regionBreakdownsWithDetails}
                        onRegionClick={(regionName) => {
                          console.log('Region clicked:', regionName);
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

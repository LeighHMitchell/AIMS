'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { MapPin, RotateCcw, Mountain, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton-loader';
import { getCountryCoordinates, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/data/country-coordinates';
import dynamic from 'next/dynamic';

// mapcn map components
import { Map, MapControls, useMap } from '@/components/ui/map';

// Dynamic import for MapLibre-based layers
const MarkersLayer = dynamic(() => import('@/components/maps-v2/MarkersLayer'), { ssr: false });
const MapFlyTo = dynamic(() => import('@/components/maps-v2/MapFlyTo'), { ssr: false });

// Map style configurations
const MAP_STYLES = {
  carto_light: {
    name: 'Streets (Light)',
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
};

// Location data from API - using any to match MarkersLayer's expected type
type LocationData = any;

interface OrganizationActivityLocationsMapProps {
  organizationId: string;
}

// Map 3D Controller Component
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
  const [zoom, setZoom] = useState(homeCountryZoom);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleMove = () => {
      setPitch(Math.round(map.getPitch()));
      setBearing(Math.round(map.getBearing()));
      setZoom(Math.round(map.getZoom() * 10) / 10);
    };

    map.on('move', handleMove);
    setZoom(Math.round(map.getZoom() * 10) / 10);
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

  const handle2DView = useCallback(() => {
    map?.easeTo({
      pitch: 0,
      bearing: 0,
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

  const is3DMode = pitch !== 0 || bearing !== 0;

  if (!isLoaded) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        {is3DMode ? (
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
      <div className="absolute top-full left-0 mt-1.5 rounded-md bg-white/90 backdrop-blur px-2 py-1 text-[10px] font-mono border border-gray-300 shadow-md flex gap-2 whitespace-nowrap z-[1]">
        <span className="text-gray-600">Zoom: {zoom}</span>
        {is3DMode && (
          <>
            <span className="text-gray-600">Pitch: {pitch}</span>
            <span className="text-gray-600">Bearing: {bearing}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function OrganizationActivityLocationsMap({ organizationId }: OrganizationActivityLocationsMapProps) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeCountryCenter, setHomeCountryCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [homeCountryZoom, setHomeCountryZoom] = useState<number>(DEFAULT_MAP_ZOOM);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  // Fetch home country from system settings
  useEffect(() => {
    const fetchHomeCountry = async () => {
      try {
        const response = await apiFetch('/api/admin/system-settings')
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

  // Fetch locations for this organization
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all locations and filter by organization
        const response = await apiFetch('/api/locations');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch locations');
        }

        if (data.success && data.locations) {
          // Filter locations for this organization
          const orgLocations = data.locations.filter(
            (loc: LocationData) => loc.activity?.organization_id === organizationId
          );
          setLocations(orgLocations);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('[OrgActivityLocationsMap] Error fetching locations:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch locations');
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
    return locations.filter(location =>
      location.latitude &&
      location.longitude &&
      !isNaN(location.latitude) &&
      !isNaN(location.longitude)
    );
  }, [locations]);

  // Calculate bounds to fit all markers
  useEffect(() => {
    if (validLocations.length > 0 && !loading) {
      // Calculate the centroid of all locations
      const sumLat = validLocations.reduce((sum, loc) => sum + loc.latitude, 0);
      const sumLng = validLocations.reduce((sum, loc) => sum + loc.longitude, 0);
      const centerLat = sumLat / validLocations.length;
      const centerLng = sumLng / validLocations.length;

      // Set fly target to center of locations after a short delay
      setTimeout(() => {
        setFlyToTarget({ lat: centerLat, lng: centerLng, zoom: 7 });
      }, 500);
    }
  }, [validLocations, loading]);

  if (loading) {
    return (
      <div className="h-[600px] w-full">
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="font-medium text-slate-600">Failed to load map data</p>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (validLocations.length === 0) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="font-medium text-slate-600">No activity locations</p>
          <p className="text-sm text-slate-500">
            This organization has no activities with location data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full relative rounded-lg overflow-hidden border border-gray-200">
      {/* Location count badge */}
      <div className="absolute top-3 left-3 z-20">
        <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-md border border-gray-300 shadow-md">
          <span className="text-xs font-medium text-gray-700">
            {validLocations.length} location{validLocations.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* MapLibre Map */}
      <Map
        styles={{
          light: MAP_STYLES.carto_light.light,
          dark: MAP_STYLES.carto_light.dark,
        }}
        center={[homeCountryCenter[1], homeCountryCenter[0]]}
        zoom={homeCountryZoom}
        minZoom={2}
        maxZoom={18}
        scrollZoom={false}
      >
        {/* Controls Bar - must be inside Map for useMap context */}
        <div className="absolute top-3 right-3 z-20">
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

        {/* Markers */}
        {validLocations.length > 0 && (
          <MarkersLayer locations={validLocations} />
        )}

        {/* Fly To Handler */}
        <MapFlyTo
          target={flyToTarget}
          onComplete={() => setFlyToTarget(null)}
        />
      </Map>
    </div>
  );
}

'use client';

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup, useMap } from '@/components/ui/map';
import { Mountain, Map as MapIcon, RotateCcw } from 'lucide-react';
import type MapLibreGL from 'maplibre-gl';
import type { LocationSchema } from '@/lib/schemas/location';

type MapLayerKey = 'osm_standard' | 'osm_humanitarian' | 'cyclosm' | 'opentopo' | 'satellite_esri';

interface LocationMapProps {
  mapCenter: [number, number]; // [lat, lng] - will convert to [lng, lat] for MapLibre
  mapZoom: number;
  mapRef: React.RefObject<MapLibreGL.Map | null>;
  currentLayer: MapLayerKey;
  existingLocations: LocationSchema[];
  currentLocationId?: string;
  markerPosition: [number, number] | null; // [lat, lng]
  onMarkerDragEnd: (lat: number, lng: number) => void;
  onMapClick: (lat: number, lng: number) => void;
  locationName?: string | null;
  displayLatitude?: number | null;
  displayLongitude?: number | null;
}

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

// ESRI Satellite raster tile style
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

// Map style URLs for MapLibre (using Carto's vector tiles and raster tiles)
const MAP_STYLES: Record<MapLayerKey, string | typeof HOT_STYLE> = {
  osm_standard: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  osm_humanitarian: HOT_STYLE,
  cyclosm: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  opentopo: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  satellite_esri: SATELLITE_STYLE,
};

// Component to handle map click events
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const { map, isLoaded } = useMap();
  
  useEffect(() => {
    if (!isLoaded || !map) return;
    
    const handleClick = (e: MapLibreGL.MapMouseEvent) => {
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    };
    
    map.on('click', handleClick);
    
    return () => {
      map.off('click', handleClick);
    };
  }, [isLoaded, map, onMapClick]);
  
  return null;
}

// Component to handle map ref forwarding
function MapRefHandler({ mapRef }: { mapRef: React.RefObject<MapLibreGL.Map | null> }) {
  const { map, isLoaded } = useMap();
  
  useEffect(() => {
    if (isLoaded && map) {
      (mapRef as React.MutableRefObject<MapLibreGL.Map | null>).current = map;
    }
    
    return () => {
      (mapRef as React.MutableRefObject<MapLibreGL.Map | null>).current = null;
    };
  }, [isLoaded, map, mapRef]);
  
  return null;
}

// 3D view controller
function Map3DController({ mapCenter, mapZoom }: { mapCenter: [number, number]; mapZoom: number }) {
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
    return () => { map.off('move', handleMove); };
  }, [map, isLoaded]);

  const handle3DView = useCallback(() => {
    map?.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
  }, [map]);

  const handle2DView = useCallback(() => {
    map?.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
  }, [map]);

  const handleReset = useCallback(() => {
    if (map) {
      map.flyTo({
        center: mapCenter,
        zoom: mapZoom,
        pitch: 0,
        bearing: 0,
        duration: 1500,
      });
    }
  }, [map, mapCenter, mapZoom]);

  const is3DMode = pitch !== 0 || bearing !== 0;

  if (!isLoaded) return null;

  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5">
      {is3DMode ? (
        <button
          type="button"
          onClick={handle2DView}
          title="2D View"
          className="flex items-center gap-1.5 bg-white shadow-md border border-gray-300 rounded-md h-8 px-2.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          <MapIcon className="h-3.5 w-3.5" />
          2D
        </button>
      ) : (
        <button
          type="button"
          onClick={handle3DView}
          title="3D View"
          className="flex items-center gap-1.5 bg-white shadow-md border border-gray-300 rounded-md h-8 px-2.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          <Mountain className="h-3.5 w-3.5" />
          3D
        </button>
      )}
      <button
        type="button"
        onClick={handleReset}
        title="Reset view"
        className="flex items-center justify-center bg-white shadow-md border border-gray-300 rounded-md h-8 w-8 text-gray-700 hover:bg-gray-50"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function LocationMapComponent({
  mapCenter,
  mapZoom,
  mapRef,
  currentLayer,
  existingLocations,
  currentLocationId,
  markerPosition,
  onMarkerDragEnd,
  onMapClick,
  locationName,
  displayLatitude,
  displayLongitude,
}: LocationMapProps) {
  // Convert center from [lat, lng] to MapLibre's [lng, lat]
  const mapLibreCenter: [number, number] = [mapCenter[1], mapCenter[0]];
  
  // Handle drag end - convert from MapLibre's {lng, lat} to callback's (lat, lng)
  const handleDragEnd = useCallback((lngLat: { lng: number; lat: number }) => {
    onMarkerDragEnd(lngLat.lat, lngLat.lng);
  }, [onMarkerDragEnd]);

  return (
    <Map
      key={`location-map-${currentLayer}`}
      center={mapLibreCenter}
      zoom={mapZoom}
      styles={{
        light: MAP_STYLES[currentLayer] as string | object,
        dark: MAP_STYLES[currentLayer] as string | object,
      }}
    >
      <MapControls position="top-right" showZoom />
      <MapRefHandler mapRef={mapRef} />
      <MapClickHandler onMapClick={onMapClick} />
      <Map3DController mapCenter={mapLibreCenter} mapZoom={mapZoom} />
      
      {/* Existing location markers */}
      {existingLocations
        .filter((loc) => loc.latitude && loc.longitude && loc.id !== currentLocationId)
        .map((loc) => (
          <MapMarker 
            key={loc.id} 
            longitude={loc.longitude!} 
            latitude={loc.latitude!}
          >
            <MarkerContent className="opacity-60">
              <div className="h-3 w-3 rounded-full border-2 border-white bg-gray-500 shadow-md" />
            </MarkerContent>
            <MarkerPopup>
              <div className="text-sm">
                <strong>{loc.location_name}</strong>
                {loc.site_type && (
                  <>
                    <br />
                    <span className="text-muted-foreground">
                      {loc.site_type.replace('_', ' ')}
                    </span>
                  </>
                )}
              </div>
            </MarkerPopup>
          </MapMarker>
        ))}

      {/* Current/draggable marker */}
      {markerPosition && (
        <MapMarker
          longitude={markerPosition[1]}
          latitude={markerPosition[0]}
          draggable
          onDragEnd={handleDragEnd}
        >
          <MarkerContent>
            <div className="h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg ring-2 ring-blue-200" />
          </MarkerContent>
          <MarkerPopup>
            <div className="text-sm">
              <strong>{locationName || 'New Location'}</strong>
              {displayLatitude !== undefined && displayLongitude !== undefined && 
               displayLatitude !== null && displayLongitude !== null && (
                <>
                  <br />
                  <span className="text-muted-foreground font-mono text-xs">
                    {displayLatitude.toFixed(6)}, {displayLongitude.toFixed(6)}
                  </span>
                </>
              )}
            </div>
          </MarkerPopup>
        </MapMarker>
      )}
    </Map>
  );
}

export default memo(LocationMapComponent);

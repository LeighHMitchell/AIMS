'use client';

import { memo, useEffect, useCallback, useRef } from 'react';
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup, useMap } from '@/components/ui/map';
import type MapLibreGL from 'maplibre-gl';
import type { LocationSchema } from '@/lib/schemas/location';

type MapLayerKey = 'osm_standard' | 'osm_humanitarian' | 'cyclosm' | 'opentopo' | 'satellite_esri';

interface MapLayerConfig {
  name: string;
  url: string;
  attribution: string;
  category: string;
  fallbacks?: string[];
}

interface LocationMapProps {
  mapCenter: [number, number]; // [lat, lng] - will convert to [lng, lat] for MapLibre
  mapZoom: number;
  mapRef: React.RefObject<MapLibreGL.Map | null>;
  mapLayers: Record<MapLayerKey, MapLayerConfig>;
  currentLayer: MapLayerKey;
  getLayerUrl: () => string;
  onLayerChange: (layer: MapLayerKey) => void;
  onMapError: () => void;
  existingLocations: LocationSchema[];
  currentLocationId?: string;
  markerPosition: [number, number] | null; // [lat, lng]
  onMarkerDragEnd: (lat: number, lng: number) => void;
  onMapClick: (lat: number, lng: number) => void;
  locationName?: string | null;
  displayLatitude?: number | null;
  displayLongitude?: number | null;
}

// Map style URLs for MapLibre (using Carto's vector tiles)
const MAP_STYLES: Record<MapLayerKey, string> = {
  osm_standard: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  osm_humanitarian: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json', // Similar to OSM
  cyclosm: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  opentopo: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  satellite_esri: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json', // Note: True satellite requires API key
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

function LocationMapComponent({
  mapCenter,
  mapZoom,
  mapRef,
  mapLayers,
  currentLayer,
  getLayerUrl,
  onLayerChange,
  onMapError,
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
      center={mapLibreCenter}
      zoom={mapZoom}
      styles={{
        light: MAP_STYLES[currentLayer],
        dark: MAP_STYLES[currentLayer],
      }}
    >
      <MapControls position="top-right" showZoom />
      <MapRefHandler mapRef={mapRef} />
      <MapClickHandler onMapClick={onMapClick} />
      
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

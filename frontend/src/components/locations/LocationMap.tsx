'use client';

import { memo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import MapEventsClient from './MapEventsClient';

import type { LocationSchema } from '@/lib/schemas/location';

// Fix default marker icons when bundling with Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

type MapLayerKey = 'roads' | 'satellite';

interface MapLayerConfig {
  name: string;
  url: string;
  attribution: string;
  fallbacks?: string[];
}

interface LocationMapProps {
  mapCenter: [number, number];
  mapZoom: number;
  mapRef: React.RefObject<LeafletMap | null>;
  mapLayers: Record<MapLayerKey, MapLayerConfig>;
  currentLayer: MapLayerKey;
  getLayerUrl: () => string;
  onLayerChange: (layer: MapLayerKey) => void;
  onMapError: () => void;
  existingLocations: LocationSchema[];
  currentLocationId?: string;
  markerPosition: [number, number] | null;
  onMarkerDragEnd: (lat: number, lng: number) => void;
  onMapClick: (lat: number, lng: number) => void;
  locationName?: string | null;
  displayLatitude?: number | null;
  displayLongitude?: number | null;
}

function LayerChangeHandler({ onLayerChange }: { onLayerChange: (layer: MapLayerKey) => void }) {
  useMapEvents({
    baselayerchange(event) {
      const name = event.name as string;
      if (name === 'Street Map') onLayerChange('roads');
      else if (name === 'Satellite Image') onLayerChange('satellite');
    },
  });

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
  // Ensure map ref is reset when modal closes
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        (mapRef as React.MutableRefObject<LeafletMap | null>).current = null;
      }
    };
  }, [mapRef]);

  return (
    <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} ref={mapRef as any}>
      <LayersControl position="topright" style={{ zIndex: 1000 }}>
        <LayersControl.BaseLayer
          checked={currentLayer === 'roads'}
          name="Street Map"
        >
          <TileLayer
            attribution={mapLayers.roads.attribution}
            url={mapLayers.roads.url}
            eventHandlers={{ tileerror: onMapError }}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer
          checked={currentLayer === 'satellite'}
          name="Satellite Image"
        >
          <TileLayer
            attribution={mapLayers.satellite.attribution}
            url={mapLayers.satellite.url}
            eventHandlers={{ tileerror: onMapError }}
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      {existingLocations
        .filter((loc) => loc.latitude && loc.longitude && loc.id !== currentLocationId)
        .map((loc) => (
          <Marker key={loc.id} position={[loc.latitude!, loc.longitude!]}
          >
            <Popup>
              <div>
                <strong>{loc.location_name}</strong>
                {loc.site_type && (
                  <>
                    <br />
                    {loc.site_type.replace('_', ' ')}
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

      {markerPosition && (
        <Marker
          position={markerPosition}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const leafletMarker = event.target as L.Marker;
              const { lat, lng } = leafletMarker.getLatLng();
              onMarkerDragEnd(lat, lng);
            },
          }}
        >
          <Popup>
            <div>
              <strong>{locationName || 'New Location'}</strong>
              {displayLatitude !== undefined && displayLongitude !== undefined && displayLatitude !== null && displayLongitude !== null && (
                <>
                  <br />
                  {displayLatitude.toFixed(6)}, {displayLongitude.toFixed(6)}
                </>
              )}
            </div>
          </Popup>
        </Marker>
      )}

      <LayerChangeHandler onLayerChange={onLayerChange} />
      <MapEventsClient onMapClick={onMapClick} />
    </MapContainer>
  );
}

export default memo(LocationMapComponent);


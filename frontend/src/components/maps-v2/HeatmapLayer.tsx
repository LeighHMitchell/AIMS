'use client';

import { useEffect, useRef, useId } from 'react';
import type MapLibreGL from 'maplibre-gl';
import { useMap } from '@/components/ui/map';

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity?: number;
}

interface HeatmapLayerProps {
  points: HeatmapPoint[];
  options?: {
    radius?: number;
    intensity?: number;
    opacity?: number;
    maxZoom?: number;
    colorStops?: Array<[number, string]>;
  };
}

export default function HeatmapLayer({ points, options = {} }: HeatmapLayerProps) {
  const { map, isLoaded } = useMap();
  const id = useId();
  const sourceId = `heatmap-source-${id}`;
  const layerId = `heatmap-layer-${id}`;
  const hasAddedRef = useRef(false);

  const {
    radius = 30,
    intensity = 1,
    opacity = 0.8,
    maxZoom = 15,
    colorStops = [
      [0, 'rgba(33, 102, 172, 0)'],
      [0.2, 'rgb(103, 169, 207)'],
      [0.4, 'rgb(209, 229, 240)'],
      [0.6, 'rgb(253, 219, 199)'],
      [0.8, 'rgb(239, 138, 98)'],
      [1, 'rgb(178, 24, 43)']
    ]
  } = options;

  // Add source and layer when map is loaded
  useEffect(() => {
    if (!isLoaded || !map || points.length === 0) return;

    // Prevent duplicate additions during React strict mode
    if (hasAddedRef.current) {
      // Just update the data if already added
      try {
        const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource | undefined;
        if (source) {
          const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
            type: 'FeatureCollection',
            features: points.map(p => ({
              type: 'Feature' as const,
              properties: { intensity: p.intensity ?? 1 },
              geometry: {
                type: 'Point' as const,
                coordinates: [p.lng, p.lat]
              }
            }))
          };
          source.setData(geojson);
        }
      } catch {
        // Source doesn't exist, will be added below
      }
      return;
    }

    // Create GeoJSON from points
    const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: points.map(p => ({
        type: 'Feature' as const,
        properties: { intensity: p.intensity ?? 1 },
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lng, p.lat]
        }
      }))
    };

    // Check if source already exists
    if (!map.getSource(sourceId)) {
      // Add the GeoJSON source
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson
      });
    }

    // Check if layer already exists
    if (!map.getLayer(layerId)) {
      // Add the heatmap layer
      map.addLayer({
        id: layerId,
        type: 'heatmap',
        source: sourceId,
        paint: {
          // Increase the heatmap weight based on intensity property
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'intensity'],
            0, 0,
            1, 1
          ],
          // Increase the heatmap color weight by zoom level
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, intensity,
            maxZoom, intensity * 3
          ],
          // Color ramp for heatmap
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            ...colorStops.flatMap(([stop, color]) => [stop, color])
          ],
          // Adjust the heatmap radius by zoom level
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, radius / 3,
            maxZoom, radius
          ],
          // Transition from heatmap to circle layer by zoom level
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            maxZoom - 1, opacity,
            maxZoom, 0
          ]
        }
      });
    }

    hasAddedRef.current = true;

    // Cleanup on unmount
    return () => {
      hasAddedRef.current = false;
      try {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch {
        // Map might be destroyed already
      }
    };
  }, [isLoaded, map, sourceId, layerId, radius, intensity, opacity, maxZoom, colorStops]);

  // Update data when points change
  useEffect(() => {
    if (!isLoaded || !map || !hasAddedRef.current) return;

    try {
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
          type: 'FeatureCollection',
          features: points.map(p => ({
            type: 'Feature' as const,
            properties: { intensity: p.intensity ?? 1 },
            geometry: {
              type: 'Point' as const,
              coordinates: [p.lng, p.lat]
            }
          }))
        };
        source.setData(geojson);
      }
    } catch {
      // Source might not exist yet
    }
  }, [isLoaded, map, points, sourceId]);

  return null;
}

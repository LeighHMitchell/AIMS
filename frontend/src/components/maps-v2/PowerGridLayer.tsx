'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useMap } from '@/components/ui/map';
import type { GeoJSON } from 'geojson';

interface PowerInfrastructure {
  id: string;
  name: string;
  type: string;
  voltage?: number;
  voltageDisplay?: string;
  voltageCategory?: string;
  operator?: string;
  output?: string;
  source?: string;
  cables?: number;
}

interface PowerGridLayerProps {
  country: string;
  visible?: boolean;
  infrastructureTypes?: string[]; // Filter by type (empty = show all)
  onInfrastructureClick?: (infrastructure: PowerInfrastructure, coordinates: [number, number]) => void;
  onLoadingChange?: (loading: boolean) => void;
  onFeatureCountChange?: (count: number) => void;
}

// Available infrastructure types with labels and colors (brand palette)
export const POWER_GRID_TYPES = [
  { id: 'line', label: 'Transmission Lines', color: '#dc2625' },      // Primary Scarlet
  { id: 'minor_line', label: 'Distribution Lines', color: '#7b95a7' }, // Cool Steel
  { id: 'cable', label: 'Underground Cables', color: '#4c5568' },      // Blue Slate
  { id: 'substation', label: 'Substations', color: '#3d6b5c' },        // Muted Teal
  { id: 'plant', label: 'Power Plants', color: '#6b5b7a' },            // Muted Purple
  { id: 'generator', label: 'Generators', color: '#94a3af' },          // Medium Gray
] as const;

const LINE_SOURCE_ID = 'power-grid-lines-source';
const LINE_LAYER_ID = 'power-grid-lines-layer';
const POINT_SOURCE_ID = 'power-grid-points-source';
const POINT_LAYER_ID = 'power-grid-points-layer';
const POINT_CLUSTER_LAYER_ID = 'power-grid-points-clusters';
const POINT_CLUSTER_COUNT_LAYER_ID = 'power-grid-points-cluster-count';

// In-memory cache
const powerGridCache: Record<string, { data: GeoJSON.FeatureCollection; timestamp: number }> = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getCachedData(country: string): GeoJSON.FeatureCollection | null {
  const memCache = powerGridCache[country];
  if (memCache && Date.now() - memCache.timestamp < CACHE_DURATION) {
    console.log(`[PowerGridLayer] Using in-memory cache for ${country}`);
    return memCache.data;
  }

  try {
    const stored = sessionStorage.getItem(`power-grid-${country}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        console.log(`[PowerGridLayer] Using sessionStorage cache for ${country}`);
        powerGridCache[country] = parsed;
        return parsed.data;
      }
    }
  } catch (e) {
    // sessionStorage might not be available
  }

  return null;
}

function cacheData(country: string, data: GeoJSON.FeatureCollection): void {
  const cacheEntry = { data, timestamp: Date.now() };
  powerGridCache[country] = cacheEntry;

  try {
    sessionStorage.setItem(`power-grid-${country}`, JSON.stringify(cacheEntry));
  } catch (e) {
    console.warn('[PowerGridLayer] Could not cache to sessionStorage');
  }
}

export default function PowerGridLayer({
  country,
  visible = true,
  infrastructureTypes = [],
  onInfrastructureClick,
  onLoadingChange,
  onFeatureCountChange,
}: PowerGridLayerProps) {
  const { map, isLoaded } = useMap();
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedCountryRef = useRef<string | null>(null);
  const layersAddedRef = useRef(false);
  const currentDataRef = useRef<string | null>(null);

  // Filter data by type
  const filteredData = data ? {
    ...data,
    features: infrastructureTypes.length === 0
      ? data.features
      : data.features.filter(f => infrastructureTypes.includes(f.properties?.type || ''))
  } : null;

  // Separate lines and points
  const lineFeatures = filteredData?.features.filter(f => f.geometry.type === 'LineString') || [];
  const pointFeatures = filteredData?.features.filter(f => f.geometry.type === 'Point') || [];

  // Notify parent of loading state
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // Update count when filter changes
  useEffect(() => {
    if (filteredData) {
      onFeatureCountChange?.(filteredData.features.length);
    }
  }, [filteredData?.features.length, onFeatureCountChange]);

  // Fetch data
  useEffect(() => {
    if (!country || !visible) return;

    if (data && loadedCountryRef.current === country) {
      onFeatureCountChange?.(filteredData?.features.length || 0);
      return;
    }

    const cachedData = getCachedData(country);
    if (cachedData) {
      setData(cachedData);
      loadedCountryRef.current = country;
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log(`[PowerGridLayer] Fetching from API for ${country}...`);
        const response = await fetch(`/api/layers/power-grid?country=${country}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch power grid data');
        }

        const geoJson = await response.json();

        if (geoJson.features) {
          cacheData(country, geoJson);
          setData(geoJson);
          loadedCountryRef.current = country;
          console.log(`[PowerGridLayer] Loaded ${geoJson.features.length} features for ${country}`);
        }
      } catch (err) {
        console.error('[PowerGridLayer] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load power grid data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [country, visible, data, onFeatureCountChange, filteredData?.features.length]);

  // Add/update map layers
  useEffect(() => {
    if (!map || !isLoaded || !filteredData) return;

    const dataSignature = `${filteredData.features.length}-${loadedCountryRef.current}-${infrastructureTypes.sort().join(',')}`;

    if (layersAddedRef.current && currentDataRef.current === dataSignature) {
      return;
    }

    // Remove existing layers
    [POINT_CLUSTER_COUNT_LAYER_ID, POINT_CLUSTER_LAYER_ID, POINT_LAYER_ID, LINE_LAYER_ID].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    [POINT_SOURCE_ID, LINE_SOURCE_ID].forEach(id => {
      if (map.getSource(id)) map.removeSource(id);
    });

    if (filteredData.features.length === 0) {
      layersAddedRef.current = false;
      currentDataRef.current = null;
      return;
    }

    // Add line source and layer
    if (lineFeatures.length > 0) {
      map.addSource(LINE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: lineFeatures,
        },
      });

      map.addLayer({
        id: LINE_LAYER_ID,
        type: 'line',
        source: LINE_SOURCE_ID,
        paint: {
          'line-color': [
            'match',
            ['get', 'voltageCategory'],
            'transmission', '#dc2625',      // Primary Scarlet - High voltage
            'sub_transmission', '#4c5568',  // Blue Slate - Medium voltage
            'distribution', '#7b95a7',      // Cool Steel - Low voltage
            '#94a3af',                       // Default gray
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, ['match', ['get', 'voltageCategory'], 'transmission', 2, 'sub_transmission', 1.5, 1],
            10, ['match', ['get', 'voltageCategory'], 'transmission', 4, 'sub_transmission', 3, 2],
            15, ['match', ['get', 'voltageCategory'], 'transmission', 6, 'sub_transmission', 4, 3],
          ],
          'line-opacity': 0.8,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });
    }

    // Add point source with clustering
    if (pointFeatures.length > 0) {
      map.addSource(POINT_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: pointFeatures,
        },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: POINT_CLUSTER_LAYER_ID,
        type: 'circle',
        source: POINT_SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#7b95a7', // < 10: Cool Steel
            10,
            '#4c5568', // 10-50: Blue Slate
            50,
            '#dc2625', // > 50: Primary Scarlet
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            12,
            10,
            16,
            50,
            20,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#f1f4f8',
        },
      });

      // Cluster count labels
      map.addLayer({
        id: POINT_CLUSTER_COUNT_LAYER_ID,
        type: 'symbol',
        source: POINT_SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
        },
        paint: {
          'text-color': '#f1f4f8',
        },
      });

      // Individual point markers
      map.addLayer({
        id: POINT_LAYER_ID,
        type: 'circle',
        source: POINT_SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'type'],
            'substation', '#3d6b5c',  // Muted Teal
            'plant', '#6b5b7a',        // Muted Purple
            'generator', '#94a3af',    // Medium Gray
            '#cfd0d5',                 // Default: Pale Slate
          ],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 4,
            12, 6,
            16, 10,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.9,
        },
      });
    }

    // Click handlers
    if (lineFeatures.length > 0) {
      map.on('click', LINE_LAYER_ID, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [LINE_LAYER_ID] });
        if (!features.length) return;

        const feature = features[0];
        if (onInfrastructureClick) {
          onInfrastructureClick(
            feature.properties as PowerInfrastructure,
            [e.lngLat.lng, e.lngLat.lat]
          );
        }
      });

      map.on('mouseenter', LINE_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', LINE_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
      });
    }

    if (pointFeatures.length > 0) {
      map.on('click', POINT_CLUSTER_LAYER_ID, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [POINT_CLUSTER_LAYER_ID] });
        if (!features.length) return;

        const clusterId = features[0].properties?.cluster_id;
        const source = map.getSource(POINT_SOURCE_ID) as maplibregl.GeoJSONSource;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          const geometry = features[0].geometry;
          if (geometry.type === 'Point') {
            map.easeTo({
              center: geometry.coordinates as [number, number],
              zoom: zoom || 12,
            });
          }
        });
      });

      map.on('click', POINT_LAYER_ID, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [POINT_LAYER_ID] });
        if (!features.length) return;

        const feature = features[0];
        const geometry = feature.geometry;

        if (geometry.type === 'Point' && onInfrastructureClick) {
          onInfrastructureClick(
            feature.properties as PowerInfrastructure,
            geometry.coordinates as [number, number]
          );
        }
      });

      map.on('mouseenter', POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('mouseenter', POINT_CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', POINT_CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
      });
    }

    layersAddedRef.current = true;
    currentDataRef.current = dataSignature;

    // Set initial visibility
    const visibility = visible ? 'visible' : 'none';
    [LINE_LAYER_ID, POINT_LAYER_ID, POINT_CLUSTER_LAYER_ID, POINT_CLUSTER_COUNT_LAYER_ID].forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', visibility);
      }
    });

    return () => {
      try {
        [POINT_CLUSTER_COUNT_LAYER_ID, POINT_CLUSTER_LAYER_ID, POINT_LAYER_ID, LINE_LAYER_ID].forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        [POINT_SOURCE_ID, LINE_SOURCE_ID].forEach(id => {
          if (map.getSource(id)) map.removeSource(id);
        });
        layersAddedRef.current = false;
        currentDataRef.current = null;
      } catch {
        // Map might be destroyed
      }
    };
  }, [map, isLoaded, filteredData, infrastructureTypes, onInfrastructureClick, visible, lineFeatures, pointFeatures]);

  // Update visibility
  useEffect(() => {
    if (!map || !isLoaded) return;

    const visibility = visible ? 'visible' : 'none';
    [LINE_LAYER_ID, POINT_LAYER_ID, POINT_CLUSTER_LAYER_ID, POINT_CLUSTER_COUNT_LAYER_ID].forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', visibility);
      }
    });
  }, [map, isLoaded, visible]);

  return null;
}

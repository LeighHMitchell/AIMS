'use client';

import { useEffect, useState, useRef } from 'react';
import { useMap } from '@/components/ui/map';
import type { GeoJSON } from 'geojson';

interface FloodZone {
  id: string;
  name: string;
  riskLevel: string;
  description?: string;
  source?: string;
  lastUpdated?: string;
}

interface FloodRiskLayerProps {
  country: string;
  visible?: boolean;
  riskLevels?: string[]; // Filter by risk level (empty = show all)
  onZoneClick?: (zone: FloodZone, coordinates: [number, number]) => void;
  onLoadingChange?: (loading: boolean) => void;
  onZoneCountChange?: (count: number) => void;
}

// Risk levels with labels and colors (brand palette with opacity)
export const FLOOD_RISK_LEVELS = [
  { id: 'very_high', label: 'Very High Risk', color: '#dc2625', opacity: 0.5 },  // Primary Scarlet
  { id: 'high', label: 'High Risk', color: '#4c5568', opacity: 0.45 },           // Blue Slate
  { id: 'medium', label: 'Medium Risk', color: '#7b95a7', opacity: 0.4 },        // Cool Steel
  { id: 'low', label: 'Low Risk', color: '#cfd0d5', opacity: 0.35 },             // Pale Slate
] as const;

const SOURCE_ID = 'flood-risk-source';
const FILL_LAYER_ID = 'flood-risk-fill-layer';
const OUTLINE_LAYER_ID = 'flood-risk-outline-layer';

// In-memory cache
const floodRiskCache: Record<string, { data: GeoJSON.FeatureCollection; timestamp: number }> = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getCachedData(country: string): GeoJSON.FeatureCollection | null {
  const memCache = floodRiskCache[country];
  if (memCache && Date.now() - memCache.timestamp < CACHE_DURATION) {
    console.log(`[FloodRiskLayer] Using in-memory cache for ${country}`);
    return memCache.data;
  }

  try {
    const stored = sessionStorage.getItem(`flood-risk-${country}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        console.log(`[FloodRiskLayer] Using sessionStorage cache for ${country}`);
        floodRiskCache[country] = parsed;
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
  floodRiskCache[country] = cacheEntry;

  try {
    sessionStorage.setItem(`flood-risk-${country}`, JSON.stringify(cacheEntry));
  } catch (e) {
    console.warn('[FloodRiskLayer] Could not cache to sessionStorage');
  }
}

export default function FloodRiskLayer({
  country,
  visible = true,
  riskLevels = [],
  onZoneClick,
  onLoadingChange,
  onZoneCountChange,
}: FloodRiskLayerProps) {
  const { map, isLoaded } = useMap();
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedCountryRef = useRef<string | null>(null);
  const layersAddedRef = useRef(false);
  const currentDataRef = useRef<string | null>(null);

  // Filter data by risk level
  const filteredData = data ? {
    ...data,
    features: riskLevels.length === 0
      ? data.features
      : data.features.filter(f => riskLevels.includes(f.properties?.riskLevel || ''))
  } : null;

  // Notify parent of loading state
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // Update count when filter changes
  useEffect(() => {
    if (filteredData) {
      onZoneCountChange?.(filteredData.features.length);
    }
  }, [filteredData?.features.length, onZoneCountChange]);

  // Fetch data
  useEffect(() => {
    if (!country || !visible) return;

    if (data && loadedCountryRef.current === country) {
      onZoneCountChange?.(filteredData?.features.length || 0);
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
        console.log(`[FloodRiskLayer] Fetching from API for ${country}...`);
        const response = await fetch(`/api/layers/flood-risk?country=${country}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch flood risk data');
        }

        const geoJson = await response.json();

        if (geoJson.features) {
          cacheData(country, geoJson);
          setData(geoJson);
          loadedCountryRef.current = country;
          console.log(`[FloodRiskLayer] Loaded ${geoJson.features.length} zones for ${country}`);
        }
      } catch (err) {
        console.error('[FloodRiskLayer] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load flood risk data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [country, visible, data, onZoneCountChange, filteredData?.features.length]);

  // Add/update map layers
  useEffect(() => {
    if (!map || !isLoaded || !filteredData) return;

    const dataSignature = `${filteredData.features.length}-${loadedCountryRef.current}-${riskLevels.sort().join(',')}`;

    if (layersAddedRef.current && currentDataRef.current === dataSignature) {
      return;
    }

    // Remove existing layers
    [OUTLINE_LAYER_ID, FILL_LAYER_ID].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

    if (filteredData.features.length === 0) {
      layersAddedRef.current = false;
      currentDataRef.current = null;
      return;
    }

    // Add source
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: filteredData,
    });

    // Add fill layer (semi-transparent polygons)
    // Add at the bottom of custom layers so other markers appear on top
    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': [
          'match',
          ['get', 'riskLevel'],
          'very_high', '#dc2625',  // Primary Scarlet
          'high', '#4c5568',        // Blue Slate
          'medium', '#7b95a7',      // Cool Steel
          'low', '#cfd0d5',         // Pale Slate
          '#94a3af',                // Default
        ],
        'fill-opacity': [
          'match',
          ['get', 'riskLevel'],
          'very_high', 0.5,
          'high', 0.45,
          'medium', 0.4,
          'low', 0.35,
          0.35,
        ],
      },
    });

    // Add outline layer
    map.addLayer({
      id: OUTLINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': [
          'match',
          ['get', 'riskLevel'],
          'very_high', '#dc2625',
          'high', '#4c5568',
          'medium', '#7b95a7',
          'low', '#cfd0d5',
          '#94a3af',
        ],
        'line-width': 1.5,
        'line-opacity': 0.8,
      },
    });

    // Click handler
    map.on('click', FILL_LAYER_ID, (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER_ID] });
      if (!features.length) return;

      const feature = features[0];
      if (onZoneClick) {
        onZoneClick(
          feature.properties as FloodZone,
          [e.lngLat.lng, e.lngLat.lat]
        );
      }
    });

    map.on('mouseenter', FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });

    layersAddedRef.current = true;
    currentDataRef.current = dataSignature;

    // Set initial visibility
    const visibility = visible ? 'visible' : 'none';
    [FILL_LAYER_ID, OUTLINE_LAYER_ID].forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', visibility);
      }
    });

    return () => {
      try {
        [OUTLINE_LAYER_ID, FILL_LAYER_ID].forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
        layersAddedRef.current = false;
        currentDataRef.current = null;
      } catch {
        // Map might be destroyed
      }
    };
  }, [map, isLoaded, filteredData, riskLevels, onZoneClick, visible]);

  // Update visibility
  useEffect(() => {
    if (!map || !isLoaded) return;

    const visibility = visible ? 'visible' : 'none';
    [FILL_LAYER_ID, OUTLINE_LAYER_ID].forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', visibility);
      }
    });
  }, [map, isLoaded, visible]);

  return null;
}

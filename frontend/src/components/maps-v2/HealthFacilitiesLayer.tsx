'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useMap } from '@/components/ui/map';
import type { GeoJSON } from 'geojson';

interface HealthFacility {
  id: string;
  name: string;
  type: string;
  operator?: string;
  operatorType?: string;
  beds?: number;
  staff?: number;
  emergency?: boolean;
  wheelchair?: string;
  phone?: string;
  openingHours?: string;
  source?: string;
}

interface HealthFacilitiesLayerProps {
  country: string; // ISO country code
  visible?: boolean;
  onFacilityClick?: (facility: HealthFacility, coordinates: [number, number]) => void;
  onLoadingChange?: (loading: boolean) => void;
  onFacilityCountChange?: (count: number) => void;
}

const SOURCE_ID = 'health-facilities-source';
const LAYER_ID = 'health-facilities-layer';
const CLUSTER_LAYER_ID = 'health-facilities-clusters';
const CLUSTER_COUNT_LAYER_ID = 'health-facilities-cluster-count';

// In-memory cache for health facilities (persists across component remounts)
const facilitiesCache: Record<string, { data: GeoJSON.FeatureCollection; timestamp: number }> = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Get cached data from memory or sessionStorage
function getCachedFacilities(country: string): GeoJSON.FeatureCollection | null {
  // Check in-memory cache first (fastest)
  const memCache = facilitiesCache[country];
  if (memCache && Date.now() - memCache.timestamp < CACHE_DURATION) {
    console.log(`[HealthFacilitiesLayer] Using in-memory cache for ${country}`);
    return memCache.data;
  }

  // Check sessionStorage (persists across page navigations)
  try {
    const stored = sessionStorage.getItem(`health-facilities-${country}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        console.log(`[HealthFacilitiesLayer] Using sessionStorage cache for ${country}`);
        // Also populate in-memory cache
        facilitiesCache[country] = parsed;
        return parsed.data;
      }
    }
  } catch (e) {
    // sessionStorage might not be available
  }

  return null;
}

// Save data to both memory and sessionStorage
function cacheFacilities(country: string, data: GeoJSON.FeatureCollection): void {
  const cacheEntry = { data, timestamp: Date.now() };

  // Save to in-memory cache
  facilitiesCache[country] = cacheEntry;

  // Save to sessionStorage
  try {
    sessionStorage.setItem(`health-facilities-${country}`, JSON.stringify(cacheEntry));
  } catch (e) {
    // sessionStorage might be full or unavailable
    console.warn('[HealthFacilitiesLayer] Could not cache to sessionStorage');
  }
}

// Countries with pre-generated static files (served from CDN, instant load)
const STATIC_FILE_COUNTRIES = ['MM']; // Add more as needed

// How often to refresh data from API (7 days in milliseconds)
const REFRESH_INTERVAL = 7 * 24 * 60 * 60 * 1000;

// Track when we last refreshed from API
function getLastRefreshTime(country: string): number {
  try {
    const stored = localStorage.getItem(`health-facilities-refresh-${country}`);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function setLastRefreshTime(country: string): void {
  try {
    localStorage.setItem(`health-facilities-refresh-${country}`, Date.now().toString());
  } catch {
    // localStorage might not be available
  }
}

// Try to load from static file first (much faster than API)
async function loadFromStaticFile(country: string): Promise<GeoJSON.FeatureCollection | null> {
  if (!STATIC_FILE_COUNTRIES.includes(country.toUpperCase())) {
    return null;
  }

  try {
    console.log(`[HealthFacilitiesLayer] Loading from static file for ${country}...`);
    const response = await fetch(`/data/health-facilities/${country.toLowerCase()}.json`);
    if (response.ok) {
      const data = await response.json();
      console.log(`[HealthFacilitiesLayer] Loaded ${data.features?.length || 0} facilities from static file`);
      return data;
    }
  } catch (e) {
    console.warn(`[HealthFacilitiesLayer] Could not load static file for ${country}`);
  }
  return null;
}

// Background refresh from API (doesn't block UI)
async function backgroundRefreshFromAPI(
  country: string,
  onUpdate: (data: GeoJSON.FeatureCollection) => void
): Promise<void> {
  const lastRefresh = getLastRefreshTime(country);
  const timeSinceRefresh = Date.now() - lastRefresh;

  // Only refresh if it's been more than REFRESH_INTERVAL since last refresh
  if (lastRefresh > 0 && timeSinceRefresh < REFRESH_INTERVAL) {
    console.log(`[HealthFacilitiesLayer] Skipping background refresh - last refreshed ${Math.round(timeSinceRefresh / 1000 / 60 / 60)} hours ago`);
    return;
  }

  try {
    console.log(`[HealthFacilitiesLayer] Background refresh from API for ${country}...`);
    const response = await fetch(`/api/layers/health-facilities?country=${country}`);

    if (!response.ok) {
      console.warn(`[HealthFacilitiesLayer] Background refresh failed: ${response.status}`);
      return;
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      // Update cache
      cacheFacilities(country, data);
      setLastRefreshTime(country);

      // Notify component of new data
      onUpdate(data);
      console.log(`[HealthFacilitiesLayer] Background refresh complete: ${data.features.length} facilities`);
    }
  } catch (err) {
    console.warn(`[HealthFacilitiesLayer] Background refresh error:`, err);
  }
}

// Facility type to color mapping
const FACILITY_COLORS: Record<string, string> = {
  hospital: '#dc2626', // red
  clinic: '#ea580c', // orange
  doctors: '#0891b2', // cyan
  pharmacy: '#16a34a', // green
  dentist: '#8b5cf6', // purple
  health_facility: '#3b82f6', // blue
  default: '#6b7280', // gray
};

export default function HealthFacilitiesLayer({
  country,
  visible = true,
  onFacilityClick,
  onLoadingChange,
  onFacilityCountChange,
}: HealthFacilitiesLayerProps) {
  const { map, isLoaded } = useMap();
  const [facilities, setFacilities] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already loaded for this country
  const loadedCountryRef = useRef<string | null>(null);

  // Notify parent of loading state changes
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // Fetch facilities when country changes or visibility turns on
  useEffect(() => {
    if (!country) return;

    // If not visible, don't fetch but keep cached data
    if (!visible) return;

    // Check if we already have data for this country
    if (facilities && loadedCountryRef.current === country) {
      // Data already loaded, just notify parent of count
      onFacilityCountChange?.(facilities.features.length);
      return;
    }

    // Check cache first
    const cachedData = getCachedFacilities(country);
    if (cachedData) {
      setFacilities(cachedData);
      loadedCountryRef.current = country;
      onFacilityCountChange?.(cachedData.features.length);
      return;
    }

    // No cache, need to fetch
    const fetchFacilities = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try static file first (instant from CDN)
        const staticData = await loadFromStaticFile(country);
        if (staticData && staticData.features) {
          cacheFacilities(country, staticData);
          setFacilities(staticData);
          loadedCountryRef.current = country;
          onFacilityCountChange?.(staticData.features.length);
          setLoading(false);

          // Trigger background refresh to get fresh data (won't block UI)
          backgroundRefreshFromAPI(country, (freshData) => {
            // Only update if we got more/different data
            if (freshData.features.length !== staticData.features.length) {
              setFacilities(freshData);
              onFacilityCountChange?.(freshData.features.length);
              console.log(`[HealthFacilitiesLayer] Updated with fresh data: ${freshData.features.length} facilities (was ${staticData.features.length})`);
            }
          });

          return;
        }

        // Fall back to API (no static file available)
        console.log(`[HealthFacilitiesLayer] Fetching from API for ${country}...`);
        const response = await fetch(`/api/layers/health-facilities?country=${country}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch health facilities');
        }

        const data = await response.json();

        if (data.features && data.features.length > 0) {
          // Cache the data
          cacheFacilities(country, data);
          setFacilities(data);
          loadedCountryRef.current = country;
          onFacilityCountChange?.(data.features.length);
          console.log(`[HealthFacilitiesLayer] Loaded ${data.features.length} facilities for ${country}`);
        } else {
          console.log(`[HealthFacilitiesLayer] No facilities found for ${country}`);
          const emptyData = { type: 'FeatureCollection' as const, features: [] };
          cacheFacilities(country, emptyData);
          setFacilities(emptyData);
          loadedCountryRef.current = country;
          onFacilityCountChange?.(0);
        }
      } catch (err) {
        console.error('[HealthFacilitiesLayer] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load facilities');
      } finally {
        setLoading(false);
      }
    };

    fetchFacilities();
  }, [country, visible, facilities, onFacilityCountChange]);

  // Track if layers are already added
  const layersAddedRef = useRef(false);
  const currentDataRef = useRef<string | null>(null);

  // Add/update map layers
  useEffect(() => {
    if (!map || !isLoaded || !facilities) return;

    // Create a data signature to detect if data actually changed
    const dataSignature = `${facilities.features.length}-${loadedCountryRef.current}`;

    // If layers already exist with same data, just return (visibility handled separately)
    if (layersAddedRef.current && currentDataRef.current === dataSignature) {
      return;
    }

    // Remove existing layers and source if they exist
    if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) map.removeLayer(CLUSTER_COUNT_LAYER_ID);
    if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID);
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

    if (facilities.features.length === 0) {
      layersAddedRef.current = false;
      currentDataRef.current = null;
      return;
    }

    // Add source with clustering
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: facilities,
      cluster: true,
      clusterMaxZoom: 12,
      clusterRadius: 50,
    });

    // Add cluster circles
    map.addLayer({
      id: CLUSTER_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6', // < 10
          10,
          '#f1f075', // 10-50
          50,
          '#f28cb1', // > 50
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          15, // < 10
          10,
          20, // 10-50
          50,
          25, // > 50
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    // Add cluster count labels
    map.addLayer({
      id: CLUSTER_COUNT_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#333',
      },
    });

    // Add individual facility markers
    map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match',
          ['get', 'type'],
          'hospital', FACILITY_COLORS.hospital,
          'clinic', FACILITY_COLORS.clinic,
          'doctors', FACILITY_COLORS.doctors,
          'pharmacy', FACILITY_COLORS.pharmacy,
          'dentist', FACILITY_COLORS.dentist,
          'health_facility', FACILITY_COLORS.health_facility,
          FACILITY_COLORS.default,
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

    // Click handler for clusters (zoom in)
    map.on('click', CLUSTER_LAYER_ID, (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [CLUSTER_LAYER_ID],
      });

      if (!features.length) return;

      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;

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

    // Click handler for individual facilities
    map.on('click', LAYER_ID, (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [LAYER_ID],
      });

      if (!features.length) return;

      const feature = features[0];
      const geometry = feature.geometry;

      if (geometry.type === 'Point' && onFacilityClick) {
        onFacilityClick(
          feature.properties as HealthFacility,
          geometry.coordinates as [number, number]
        );
      }
    });

    // Change cursor on hover
    map.on('mouseenter', LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('mouseenter', CLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', CLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });

    // Mark layers as added
    layersAddedRef.current = true;
    currentDataRef.current = dataSignature;

    // Set initial visibility
    const visibility = visible ? 'visible' : 'none';
    map.setLayoutProperty(LAYER_ID, 'visibility', visibility);
    map.setLayoutProperty(CLUSTER_LAYER_ID, 'visibility', visibility);
    map.setLayoutProperty(CLUSTER_COUNT_LAYER_ID, 'visibility', visibility);

    // Cleanup
    return () => {
      try {
        if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) map.removeLayer(CLUSTER_COUNT_LAYER_ID);
        if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID);
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
        layersAddedRef.current = false;
        currentDataRef.current = null;
      } catch {
        // Map might be destroyed
      }
    };
  }, [map, isLoaded, facilities, onFacilityClick, visible]);

  // Update visibility when prop changes
  useEffect(() => {
    if (!map || !isLoaded) return;

    const layers = [LAYER_ID, CLUSTER_LAYER_ID, CLUSTER_COUNT_LAYER_ID];
    layers.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    });
  }, [map, isLoaded, visible]);

  return null;
}

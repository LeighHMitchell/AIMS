'use client';

import { useEffect, useState, useCallback } from 'react';
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

  // Notify parent of loading state changes
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // Fetch facilities when country changes
  useEffect(() => {
    if (!country || !visible) return;

    const fetchFacilities = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log(`[HealthFacilitiesLayer] Fetching facilities for ${country}...`);
        const response = await fetch(`/api/layers/health-facilities?country=${country}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch health facilities');
        }

        const data = await response.json();

        if (data.features && data.features.length > 0) {
          setFacilities(data);
          onFacilityCountChange?.(data.features.length);
          console.log(`[HealthFacilitiesLayer] Loaded ${data.features.length} facilities for ${country}`);
        } else {
          console.log(`[HealthFacilitiesLayer] No facilities found for ${country}`);
          setFacilities({ type: 'FeatureCollection', features: [] });
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
  }, [country, visible]);

  // Add/update map layers
  useEffect(() => {
    if (!map || !isLoaded || !facilities) return;

    // Remove existing layers and source
    if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) map.removeLayer(CLUSTER_COUNT_LAYER_ID);
    if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID);
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

    if (!visible || facilities.features.length === 0) return;

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

    // Cleanup
    return () => {
      try {
        if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) map.removeLayer(CLUSTER_COUNT_LAYER_ID);
        if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID);
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // Map might be destroyed
      }
    };
  }, [map, isLoaded, facilities, visible, onFacilityClick]);

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

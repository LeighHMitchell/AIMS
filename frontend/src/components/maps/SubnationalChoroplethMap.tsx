'use client';

import { memo, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Map, MapControls, useMap } from '@/components/ui/map';
import type MapLibreGL from 'maplibre-gl';
import type maplibregl from 'maplibre-gl';
import type { GeoJSON, Feature, Geometry } from 'geojson';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Download, Maximize2, Layers, Mountain, Map as MapIcon, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { toast } from 'sonner';
import {
  type ViewLevel,
  type AllocationLevel,
  type MapBreakdowns,
  type RegionData,
  REGION_NAME_MAPPING,
  STATE_PCODE_MAPPING,
  DEFAULT_COLOR_SCALE,
} from '@/types/subnational';

// Map style - use Carto Positron for clean look
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Myanmar bounding box [west, south, east, north]
const MYANMAR_BOUNDS: [[number, number], [number, number]] = [
  [92.1, 9.5],   // Southwest
  [101.2, 28.5]  // Northeast
];

// Center of Myanmar
const MYANMAR_CENTER: [number, number] = [96.5, 21.0];

// GeoJSON source and layer IDs
const REGION_SOURCE = 'regions-source';
const REGION_LAYER = 'regions-layer';
const REGION_OUTLINE_LAYER = 'regions-outline-layer';
const TOWNSHIP_SOURCE = 'townships-source';
const TOWNSHIP_LAYER = 'townships-layer';
const TOWNSHIP_OUTLINE_LAYER = 'townships-outline-layer';

// Township detail levels for zoom-dependent loading
const TOWNSHIP_DETAIL_LEVELS = [
  { name: 'low', file: '/myanmar-townships-low.geojson', minZoom: 0, maxZoom: 7 },
  { name: 'medium', file: '/myanmar-townships-medium.geojson', minZoom: 7, maxZoom: 9 },
  { name: 'high', file: '/myanmar-townships-high.geojson', minZoom: 9, maxZoom: 11 },
  { name: 'full', file: '/myanmar-townships-full.geojson', minZoom: 11, maxZoom: 22 },
];

// Get appropriate township GeoJSON URL based on zoom level
function getTownshipUrlForZoom(zoom: number): string {
  for (const level of TOWNSHIP_DETAIL_LEVELS) {
    if (zoom >= level.minZoom && zoom < level.maxZoom) {
      return level.file;
    }
  }
  return TOWNSHIP_DETAIL_LEVELS[TOWNSHIP_DETAIL_LEVELS.length - 1].file;
}

// Module-level cache for GeoJSON data to avoid re-fetching
const geojsonCache: Record<string, GeoJSON.FeatureCollection> = {};
const geojsonLoadingPromises: Record<string, Promise<GeoJSON.FeatureCollection> | undefined> = {};

// Pre-load GeoJSON and cache it
function loadGeoJSON(url: string): Promise<GeoJSON.FeatureCollection> {
  // Return cached data if available
  if (geojsonCache[url]) {
    return Promise.resolve(geojsonCache[url]);
  }

  // Return existing promise if already loading
  const existingPromise = geojsonLoadingPromises[url];
  if (existingPromise) {
    return existingPromise;
  }

  // Start loading
  const loadPromise = fetch(url)
    .then(res => res.json())
    .then((data: GeoJSON.FeatureCollection) => {
      // Add stable IDs to features for hover state
      data.features = data.features.map((feature, idx) => ({
        ...feature,
        id: idx,
      }));
      geojsonCache[url] = data;
      delete geojsonLoadingPromises[url];
      return data;
    });

  geojsonLoadingPromises[url] = loadPromise;
  return loadPromise;
}

interface SubnationalChoroplethMapProps {
  breakdowns: MapBreakdowns;
  viewLevel: ViewLevel;
  onViewLevelChange: (level: ViewLevel) => void;
  onFeatureClick?: (pcode: string, name: string, level: AllocationLevel) => void;
  isExpanded?: boolean;
}

// Get color for a percentage value using linear interpolation
function getColorForValue(value: number, colorScale = DEFAULT_COLOR_SCALE): string {
  if (value === 0 || value === null || value === undefined) {
    return colorScale.nullColor;
  }

  const { stops } = colorScale;

  // Find the two stops we're between
  for (let i = 0; i < stops.length - 1; i++) {
    if (value >= stops[i].value && value <= stops[i + 1].value) {
      const t = (value - stops[i].value) / (stops[i + 1].value - stops[i].value);
      return interpolateColor(stops[i].color, stops[i + 1].color, t);
    }
  }

  // Return the last color if value exceeds max
  return stops[stops.length - 1].color;
}

// Linear interpolation between two hex colors
function interpolateColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Format currency for display
function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// Get the system name from GeoJSON feature properties
function getSystemName(properties: Record<string, unknown>, level: ViewLevel): string {
  if (level === 'township') {
    // Township features have TS for township name
    return properties.TS as string;
  } else {
    // Region features have ST for state/region short name
    const shortName = properties.ST as string;
    return REGION_NAME_MAPPING[shortName] || shortName;
  }
}

// Layer ID for 3D extrusion
const EXTRUSION_LAYER_SUFFIX = '-extrusion';

// GeoJSON layer component for choropleth
function ChoroplethLayer({
  sourceId,
  layerId,
  outlineLayerId,
  geojsonUrl,
  breakdowns,
  viewLevel,
  onFeatureClick,
  onHoverChange,
  visible,
  is3DMode = false,
}: {
  sourceId: string;
  layerId: string;
  outlineLayerId: string;
  geojsonUrl: string;
  breakdowns: MapBreakdowns;
  viewLevel: ViewLevel;
  onFeatureClick?: (pcode: string, name: string, level: AllocationLevel) => void;
  onHoverChange?: (feature: Feature<Geometry> | null) => void;
  visible: boolean;
  is3DMode?: boolean;
}) {
  const { map, isLoaded } = useMap();
  const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | number | null>(null);
  const layersAddedRef = useRef(false);
  const sourceAddedRef = useRef(false);
  const extrusionLayerId = layerId + EXTRUSION_LAYER_SUFFIX;

  // Load GeoJSON data using cache
  useEffect(() => {
    loadGeoJSON(geojsonUrl)
      .then(data => setGeojsonData(data))
      .catch(err => console.error(`Failed to load GeoJSON from ${geojsonUrl}:`, err));
  }, [geojsonUrl]);

  // Build a lookup map for fast percentage access
  const percentageLookup = useMemo(() => {
    const lookup: Record<string, number> = {};
    Object.entries(breakdowns).forEach(([name, data]) => {
      if (typeof data === 'number') {
        lookup[name] = data;
      } else if (data && typeof data === 'object') {
        lookup[name] = (data as RegionData).percentage;
      }
    });
    return lookup;
  }, [breakdowns]);

  // Build color expression for MapLibre (GPU-accelerated)
  const colorExpression = useMemo(() => {
    // Create a match expression: ['match', ['get', 'TS'], 'Township1', '#color1', 'Township2', '#color2', ..., '#default']
    const nameProperty = viewLevel === 'township' ? 'TS' : 'ST';
    const matchPairs: (string | number)[] = [];

    Object.entries(percentageLookup).forEach(([name, percentage]) => {
      // For regions, we need to map full name back to short name
      let lookupName = name;
      if (viewLevel === 'region') {
        // Find the short name from the mapping
        const shortName = Object.entries(REGION_NAME_MAPPING).find(([, fullName]) => fullName === name)?.[0];
        if (shortName) lookupName = shortName;
      }
      matchPairs.push(lookupName, getColorForValue(percentage));
    });

    if (matchPairs.length === 0) {
      return DEFAULT_COLOR_SCALE.nullColor;
    }

    return ['match', ['get', nameProperty], ...matchPairs, DEFAULT_COLOR_SCALE.nullColor];
  }, [percentageLookup, viewLevel]);

  // Build extrusion height expression for 3D mode (height based on percentage)
  const extrusionHeightExpression = useMemo(() => {
    const nameProperty = viewLevel === 'township' ? 'TS' : 'ST';
    const matchPairs: (string | number)[] = [];
    const maxHeight = viewLevel === 'township' ? 50000 : 100000; // Max height in meters

    Object.entries(percentageLookup).forEach(([name, percentage]) => {
      let lookupName = name;
      if (viewLevel === 'region') {
        const shortName = Object.entries(REGION_NAME_MAPPING).find(([, fullName]) => fullName === name)?.[0];
        if (shortName) lookupName = shortName;
      }
      // Scale height based on percentage (0-100 -> 0-maxHeight)
      const height = (percentage / 100) * maxHeight;
      matchPairs.push(lookupName, height);
    });

    if (matchPairs.length === 0) {
      return 0;
    }

    return ['match', ['get', nameProperty], ...matchPairs, 0];
  }, [percentageLookup, viewLevel]);

  // Add or update source when GeoJSON is loaded or changes
  useEffect(() => {
    if (!map || !isLoaded || !geojsonData) return;

    const existingSource = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;

    if (existingSource) {
      // Update existing source with new data
      existingSource.setData(geojsonData);
    } else {
      // Add new source
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData,
        generateId: true,
      });
      sourceAddedRef.current = true;
    }
  }, [map, isLoaded, geojsonData, sourceId]);

  // Add layers once when source is ready
  useEffect(() => {
    if (!map || !isLoaded || !sourceAddedRef.current) return;
    if (layersAddedRef.current) return;

    // Wait for source to be loaded
    if (!map.getSource(sourceId)) return;

    // Add fill layer (2D)
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': colorExpression as any,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.9,
            0.7,
          ],
        },
        layout: {
          visibility: visible && !is3DMode ? 'visible' : 'none',
        },
      });
    }

    // Add fill-extrusion layer (3D)
    if (!map.getLayer(extrusionLayerId)) {
      map.addLayer({
        id: extrusionLayerId,
        type: 'fill-extrusion',
        source: sourceId,
        paint: {
          'fill-extrusion-color': colorExpression as any,
          'fill-extrusion-height': extrusionHeightExpression as any,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.85,
        },
        layout: {
          visibility: visible && is3DMode ? 'visible' : 'none',
        },
      });
    }

    // Add outline layer
    if (!map.getLayer(outlineLayerId)) {
      map.addLayer({
        id: outlineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#4C5568',
            '#64748b',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            2,
            0.5,
          ],
        },
        layout: {
          visibility: visible ? 'visible' : 'none',
        },
      });
    }

    layersAddedRef.current = true;
  }, [map, isLoaded, sourceId, layerId, outlineLayerId, extrusionLayerId, colorExpression, extrusionHeightExpression, visible, is3DMode]);

  // Update colors and heights when breakdowns change (without recreating layers)
  useEffect(() => {
    if (!map || !isLoaded || !layersAddedRef.current) return;

    // Update 2D fill layer colors
    const fillLayer = map.getLayer(layerId);
    if (fillLayer) {
      map.setPaintProperty(layerId, 'fill-color', colorExpression as any);
    }

    // Update 3D extrusion layer colors and heights
    const extrusionLayer = map.getLayer(extrusionLayerId);
    if (extrusionLayer) {
      map.setPaintProperty(extrusionLayerId, 'fill-extrusion-color', colorExpression as any);
      map.setPaintProperty(extrusionLayerId, 'fill-extrusion-height', extrusionHeightExpression as any);
    }
  }, [map, isLoaded, layerId, extrusionLayerId, colorExpression, extrusionHeightExpression]);

  // Handle visibility and 2D/3D mode switching
  useEffect(() => {
    if (!map || !isLoaded || !layersAddedRef.current) return;

    const fillLayer = map.getLayer(layerId);
    const extrusionLayer = map.getLayer(extrusionLayerId);
    const outlineLayer = map.getLayer(outlineLayerId);

    // Toggle between 2D fill and 3D extrusion based on mode
    if (fillLayer) {
      map.setLayoutProperty(layerId, 'visibility', visible && !is3DMode ? 'visible' : 'none');
    }
    if (extrusionLayer) {
      map.setLayoutProperty(extrusionLayerId, 'visibility', visible && is3DMode ? 'visible' : 'none');
    }
    if (outlineLayer) {
      // Show outlines in both 2D and 3D mode
      map.setLayoutProperty(outlineLayerId, 'visibility', visible ? 'visible' : 'none');
    }
  }, [map, isLoaded, visible, is3DMode, layerId, extrusionLayerId, outlineLayerId]);

  // Mouse interactions
  useEffect(() => {
    if (!map || !isLoaded || !geojsonData || !visible) return;

    let hoveredId: string | number | null = null;

    const onMouseMove = (e: MapLibreGL.MapLayerMouseEvent) => {
      if (e.features && e.features.length > 0) {
        if (hoveredId !== null) {
          map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
        }
        hoveredId = e.features[0].id as string | number;
        map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: true });
        setHoveredFeatureId(hoveredId);

        // Notify parent of hovered feature
        if (onHoverChange) {
          onHoverChange(e.features[0] as Feature<Geometry>);
        }

        // Update cursor
        map.getCanvas().style.cursor = 'pointer';
      }
    };

    const onMouseLeave = () => {
      if (hoveredId !== null) {
        map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
      }
      hoveredId = null;
      setHoveredFeatureId(null);
      if (onHoverChange) {
        onHoverChange(null);
      }
      map.getCanvas().style.cursor = '';
    };

    const onClick = (e: MapLibreGL.MapLayerMouseEvent) => {
      if (e.features && e.features.length > 0 && onFeatureClick) {
        const props = e.features[0].properties || {};
        const pcode = viewLevel === 'township' ? props.TS_PCODE : props.ST_PCODE;
        const name = getSystemName(props, viewLevel);
        onFeatureClick(pcode, name, viewLevel);
      }
    };

    map.on('mousemove', layerId, onMouseMove);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('click', layerId, onClick);

    return () => {
      map.off('mousemove', layerId, onMouseMove);
      map.off('mouseleave', layerId, onMouseLeave);
      map.off('click', layerId, onClick);
    };
  }, [map, isLoaded, geojsonData, visible, sourceId, layerId, viewLevel, onFeatureClick, onHoverChange]);

  return null;
}

// Zoom-dependent township layer that switches GeoJSON detail based on zoom level
function ZoomDependentTownshipLayer({
  breakdowns,
  onFeatureClick,
  onHoverChange,
  visible,
  is3DMode,
}: {
  breakdowns: MapBreakdowns;
  onFeatureClick?: (pcode: string, name: string, level: AllocationLevel) => void;
  onHoverChange?: (feature: Feature<Geometry> | null) => void;
  visible: boolean;
  is3DMode: boolean;
}) {
  const { map, isLoaded } = useMap();
  const [currentZoom, setCurrentZoom] = useState(5.2);
  const [townshipUrl, setTownshipUrl] = useState(() => getTownshipUrlForZoom(5.2));

  // Track zoom level changes
  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleZoom = () => {
      const zoom = map.getZoom();
      setCurrentZoom(zoom);

      // Only change URL when crossing detail level thresholds
      const newUrl = getTownshipUrlForZoom(zoom);
      if (newUrl !== townshipUrl) {
        console.log(`[Townships] Switching to ${newUrl} at zoom ${zoom.toFixed(1)}`);
        setTownshipUrl(newUrl);
      }
    };

    // Set initial zoom
    handleZoom();

    map.on('zoomend', handleZoom);
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, isLoaded, townshipUrl]);

  return (
    <ChoroplethLayer
      sourceId={TOWNSHIP_SOURCE}
      layerId={TOWNSHIP_LAYER}
      outlineLayerId={TOWNSHIP_OUTLINE_LAYER}
      geojsonUrl={townshipUrl}
      breakdowns={breakdowns}
      viewLevel="township"
      onFeatureClick={onFeatureClick}
      onHoverChange={onHoverChange}
      visible={visible}
      is3DMode={is3DMode}
    />
  );
}

// Tooltip component
function MapTooltip({
  feature,
  breakdowns,
  viewLevel,
}: {
  feature: Feature<Geometry> | null;
  breakdowns: MapBreakdowns;
  viewLevel: ViewLevel;
}) {
  const { map, isLoaded } = useMap();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    name: string;
    percentage: number;
    value?: number;
    activityCount?: number;
  } | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const onMouseMove = (e: MapLibreGL.MapMouseEvent) => {
      setPosition({ x: e.point.x, y: e.point.y });
    };

    map.on('mousemove', onMouseMove);
    return () => {
      map.off('mousemove', onMouseMove);
    };
  }, [map, isLoaded]);

  useEffect(() => {
    if (!feature) {
      setTooltipData(null);
      return;
    }

    const props = feature.properties || {};
    const name = getSystemName(props, viewLevel);

    let percentage = 0;
    let value: number | undefined;
    let activityCount: number | undefined;

    const data = breakdowns[name];
    if (typeof data === 'number') {
      percentage = data;
    } else if (data && typeof data === 'object') {
      const regionData = data as RegionData;
      percentage = regionData.percentage;
      value = regionData.value;
      activityCount = regionData.activityCount;
    }

    setTooltipData({
      name: viewLevel === 'township' ? `${props.TS}, ${props.ST}` : name,
      percentage,
      value,
      activityCount,
    });
  }, [feature, breakdowns, viewLevel]);

  if (!tooltipData || !position) return null;

  return (
    <div
      className="absolute bg-card border border-border rounded-lg shadow-lg p-3 pointer-events-none z-50"
      style={{
        left: position.x + 15,
        top: position.y - 10,
        maxWidth: 280,
      }}
    >
      <h4 className="font-semibold text-foreground text-sm mb-2">{tooltipData.name}</h4>
      <table className="w-full text-xs">
        <tbody>
          <tr className="border-b border-border">
            <td className="py-1 text-muted-foreground">Allocation</td>
            <td className="py-1 text-right font-medium text-foreground">
              {tooltipData.percentage.toFixed(1)}%
            </td>
          </tr>
          {tooltipData.value !== undefined && (
            <tr className="border-b border-border">
              <td className="py-1 text-muted-foreground">Value</td>
              <td className="py-1 text-right font-medium text-foreground">
                {formatCurrency(tooltipData.value)}
              </td>
            </tr>
          )}
          {tooltipData.activityCount !== undefined && (
            <tr>
              <td className="py-1 text-muted-foreground">Activities</td>
              <td className="py-1 text-right font-medium text-foreground">
                {tooltipData.activityCount}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// 3D Controller Component
function Map3DController({
  onModeChange,
}: {
  onModeChange: (is3D: boolean) => void;
}) {
  const { map, isLoaded } = useMap();
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [zoom, setZoom] = useState(5.2);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleMove = () => {
      const currentPitch = Math.round(map.getPitch());
      const currentBearing = Math.round(map.getBearing());
      setPitch(currentPitch);
      setBearing(currentBearing);
      setZoom(Math.round(map.getZoom() * 10) / 10);

      // Notify parent of 3D mode change
      onModeChange(currentPitch !== 0 || currentBearing !== 0);
    };

    map.on('move', handleMove);
    setZoom(Math.round(map.getZoom() * 10) / 10);
    return () => {
      map.off('move', handleMove);
    };
  }, [map, isLoaded, onModeChange]);

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
        center: MYANMAR_CENTER,
        zoom: 5.2,
        pitch: 0,
        bearing: 0,
        duration: 1500,
      });
    }
  }, [map]);

  const is3DMode = pitch !== 0 || bearing !== 0;

  if (!isLoaded) return null;

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
      {/* 2D/3D Toggle */}
      {is3DMode ? (
        <Button
          onClick={handle2DView}
          variant="outline"
          size="sm"
          title="2D View"
          className="bg-card shadow-md border-border h-9 px-2.5"
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
          className="bg-card shadow-md border-border h-9 px-2.5"
        >
          <Mountain className="h-4 w-4 mr-1.5" />
          <span className="text-xs">3D</span>
        </Button>
      )}

      {/* Reset Button */}
      <Button
        onClick={handleReset}
        variant="outline"
        size="sm"
        title="Reset view"
        className="bg-card shadow-md border-border h-9 w-9 p-0"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      {/* Stats Display */}
      <div className="rounded-md bg-card/90 backdrop-blur px-2.5 py-1.5 text-[10px] font-mono border border-border shadow-md flex items-center gap-3 whitespace-nowrap">
        <span className="text-muted-foreground">Zoom: {zoom}</span>
        {is3DMode && (
          <>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">Pitch: {pitch}°</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">Bearing: {bearing}°</span>
          </>
        )}
      </div>
    </div>
  );
}

// Main component
function SubnationalChoroplethMapComponent({
  breakdowns = {},
  viewLevel,
  onViewLevelChange,
  onFeatureClick,
  isExpanded: isExpandedProp = false,
}: SubnationalChoroplethMapProps) {
  const [isExpanded, setIsExpanded] = useState(isExpandedProp);
  const [isExporting, setIsExporting] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<Feature<Geometry> | null>(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Pre-load GeoJSON files in background when component mounts
  // This ensures fast switching when user toggles to township view
  useEffect(() => {
    // Pre-load region GeoJSON
    loadGeoJSON('/myanmar-states-simplified.geojson');

    // Pre-load township detail levels (low first, then progressively higher detail)
    TOWNSHIP_DETAIL_LEVELS.forEach((level, index) => {
      // Stagger loading to avoid blocking
      setTimeout(() => {
        loadGeoJSON(level.file);
      }, index * 500);
    });
  }, []);

  // Callback for 3D mode changes
  const handle3DModeChange = useCallback((is3D: boolean) => {
    setIs3DMode(is3D);
  }, []);

  // Export map to JPEG
  const exportToJPEG = async () => {
    if (!mapContainerRef.current) {
      toast.error('Map not ready for export');
      return;
    }

    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(mapContainerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `myanmar-subnational-allocation-${viewLevel}-map-${new Date().toISOString().split('T')[0]}.jpg`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast.success('Map exported successfully');
        } else {
          toast.error('Failed to generate image');
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export map');
    } finally {
      setIsExporting(false);
    }
  };

  const mapContent = (
    <div className="relative w-full h-full">
      <Map
        center={MYANMAR_CENTER}
        zoom={5.2}
        minZoom={4}
        maxZoom={12}
        scrollZoom={false}
        styles={{
          light: MAP_STYLE,
          dark: MAP_STYLE,
        }}
      >
        <MapControls position="top-left" showZoom />

        {/* Region layer */}
        <ChoroplethLayer
          sourceId={REGION_SOURCE}
          layerId={REGION_LAYER}
          outlineLayerId={REGION_OUTLINE_LAYER}
          geojsonUrl="/myanmar-states-simplified.geojson"
          breakdowns={breakdowns}
          viewLevel="region"
          onFeatureClick={onFeatureClick}
          onHoverChange={viewLevel === 'region' ? setHoveredFeature : undefined}
          visible={viewLevel === 'region'}
          is3DMode={is3DMode}
        />

        {/* Township layer - zoom-dependent detail levels */}
        <ZoomDependentTownshipLayer
          breakdowns={breakdowns}
          onFeatureClick={onFeatureClick}
          onHoverChange={viewLevel === 'township' ? setHoveredFeature : undefined}
          visible={viewLevel === 'township'}
          is3DMode={is3DMode}
        />

        {/* Tooltip */}
        <MapTooltip
          feature={hoveredFeature}
          breakdowns={breakdowns}
          viewLevel={viewLevel}
        />

        {/* 3D Controller */}
        <Map3DController onModeChange={handle3DModeChange} />
      </Map>
    </div>
  );

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Subnational Allocation Map
            <HelpTextTooltip content="Click on regions or townships to add them to the breakdown. Colors show allocation percentages. Toggle between Region and Township views." />
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* View Level Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewLevel === 'region' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 rounded-r-none text-xs"
                onClick={() => onViewLevelChange('region')}
              >
                <Layers className="h-3 w-3 mr-1" />
                Regions
              </Button>
              <Button
                variant={viewLevel === 'township' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 rounded-l-none text-xs"
                onClick={() => onViewLevelChange('township')}
              >
                <Layers className="h-3 w-3 mr-1" />
                Townships
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsExpanded(true)}
              title="Expand"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 h-[calc(100%-4rem)]">
        <div ref={mapContainerRef} className="w-full h-full min-h-[500px]">
          {mapContent}
        </div>
      </CardContent>

      {/* Expanded Dialog View */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Subnational Allocation Map
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  Myanmar {viewLevel === 'region' ? 'States & Regions' : 'Townships'} allocation percentages
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* View Level Toggle in Dialog */}
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={viewLevel === 'region' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 rounded-r-none text-xs"
                    onClick={() => onViewLevelChange('region')}
                  >
                    Regions
                  </Button>
                  <Button
                    variant={viewLevel === 'township' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 rounded-l-none text-xs"
                    onClick={() => onViewLevelChange('township')}
                  >
                    Townships
                  </Button>
                </div>
                <Button
                  onClick={exportToJPEG}
                  disabled={isExporting}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title={isExporting ? 'Exporting...' : 'Export JPEG'}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 h-[600px]">
            {mapContent}
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            This interactive map provides a geographic visualization of aid distribution across Myanmar.
            Darker shading indicates higher allocation percentages, making it easy to identify regional
            concentrations and gaps at a glance. Toggle between Region view (15 States/Regions) and
            Township view (~330 townships) for different levels of detail.
          </p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default memo(SubnationalChoroplethMapComponent);

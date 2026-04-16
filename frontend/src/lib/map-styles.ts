// Shared basemap (tile layer) catalog used by every map surface in the app.
// Each style has a 3-char code rendered as a monospace chip in MapStyleSelect.

export const HOT_STYLE = {
  version: 8 as const,
  sources: {
    'hot-osm': {
      type: 'raster' as const,
      tiles: ['/api/tiles/hot/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution:
        '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'hot-osm-layer',
      type: 'raster' as const,
      source: 'hot-osm',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export const ESRI_SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    'esri-satellite': {
      type: 'raster' as const,
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution:
        '© Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster' as const,
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

type MapStyleSource = string | typeof HOT_STYLE | typeof ESRI_SATELLITE_STYLE;

export const MAP_STYLES: Record<
  'carto_light' | 'carto_voyager' | 'hot' | 'osm_liberty' | 'satellite_imagery',
  { code: string; name: string; light: MapStyleSource; dark: MapStyleSource }
> = {
  carto_light: {
    code: 'STR',
    name: 'Streets',
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  carto_voyager: {
    code: 'VOY',
    name: 'Voyager',
    light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  hot: {
    code: 'HOT',
    name: 'Humanitarian',
    light: HOT_STYLE,
    dark: HOT_STYLE,
  },
  osm_liberty: {
    code: 'LIB',
    name: 'Liberty',
    light: 'https://tiles.openfreemap.org/styles/liberty',
    dark: 'https://tiles.openfreemap.org/styles/liberty',
  },
  satellite_imagery: {
    code: 'SAT',
    name: 'Satellite',
    light: ESRI_SATELLITE_STYLE,
    dark: ESRI_SATELLITE_STYLE,
  },
};

export type MapStyleKey = keyof typeof MAP_STYLES;

export const DEFAULT_MAP_STYLE: MapStyleKey = 'carto_light';

export const ALL_MAP_STYLE_KEYS: readonly MapStyleKey[] = [
  'carto_light',
  'carto_voyager',
  'hot',
  'osm_liberty',
  'satellite_imagery',
];

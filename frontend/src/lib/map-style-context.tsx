"use client"

import React, { createContext, useContext, useState } from "react"

/**
 * Shared map-style state for pages that render both a MapLibre map and
 * a sibling component (e.g. a locations table with map thumbnails) that
 * needs to track which basemap the user has selected. Wrap the map +
 * sibling in `MapStyleProvider`, the map writes via `useMapStyle().setStyle`
 * when the user picks a new style, and the sibling reads via
 * `useMapStyle().style`.
 *
 * When no provider is in scope (e.g. the map is rendered standalone) the
 * hook returns the default 'carto_light' style and a no-op setter, so
 * callers don't have to null-check.
 */
export type MapStyleKey =
  | "carto_light"
  | "carto_voyager"
  | "hot"
  | "osm_liberty"
  | "satellite_imagery"

interface MapStyleContextValue {
  style: MapStyleKey
  setStyle: (s: MapStyleKey) => void
}

const MapStyleContext = createContext<MapStyleContextValue | null>(null)

export function MapStyleProvider({
  children,
  initial = "carto_light",
}: {
  children: React.ReactNode
  initial?: MapStyleKey
}) {
  const [style, setStyle] = useState<MapStyleKey>(initial)
  return (
    <MapStyleContext.Provider value={{ style, setStyle }}>
      {children}
    </MapStyleContext.Provider>
  )
}

export function useMapStyle(): MapStyleContextValue {
  const ctx = useContext(MapStyleContext)
  if (ctx) return ctx
  // No provider — return inert values so callers can still render safely.
  return { style: "carto_light", setStyle: () => {} }
}

/**
 * Raster tile-URL template (`{z}/{x}/{y}`) for each map style, used by
 * small static thumbnails that can't run a full MapLibre instance. Vector
 * styles (Voyager, Liberty) fall back to a sensible raster equivalent.
 *
 * Note: ESRI's World Imagery uses `{z}/{y}/{x}` ordering — pass `swapXY`
 * to the consuming utility to handle that.
 */
export const MAP_STYLE_RASTER_TILES: Record<
  MapStyleKey,
  { url: (z: number, x: number, y: number) => string }
> = {
  carto_light: {
    url: (z, x, y) => `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`,
  },
  carto_voyager: {
    url: (z, x, y) => `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
  },
  hot: {
    // Goes through our /api/tiles/hot proxy to respect rate limits.
    url: (z, x, y) => `/api/tiles/hot/${z}/${x}/${y}.png`,
  },
  osm_liberty: {
    // Liberty is vector-only; show standard OSM raster tiles as the
    // closest stylistic match for a small thumbnail.
    url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  },
  satellite_imagery: {
    url: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  },
}

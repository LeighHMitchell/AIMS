"use client"

import React, { useState, useCallback, useEffect, useRef } from "react"
import { Map, MapControls, useMap } from "@/components/ui/map"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Map as MapIcon, Mountain, RotateCcw } from "lucide-react"
import type MapLibreGL from "maplibre-gl"

// ── Map style configurations (same as Atlas) ──────────────────────────

const HOT_STYLE = {
  version: 8 as const,
  sources: {
    "hot-osm": {
      type: "raster" as const,
      tiles: ["/api/tiles/hot/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        "© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "hot-osm-layer",
      type: "raster" as const,
      source: "hot-osm",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
}

const ESRI_SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    "esri-satellite": {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "© Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "esri-satellite-layer",
      type: "raster" as const,
      source: "esri-satellite",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
}

const MAP_STYLES = {
  carto_light: {
    name: "Streets (Light)",
    light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  carto_voyager: {
    name: "Voyager",
    light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  hot: {
    name: "Humanitarian (HOT)",
    light: HOT_STYLE,
    dark: HOT_STYLE,
  },
  osm_liberty: {
    name: "OpenStreetMap Liberty",
    light: "https://tiles.openfreemap.org/styles/liberty",
    dark: "https://tiles.openfreemap.org/styles/liberty",
  },
  satellite_imagery: {
    name: "Satellite Imagery",
    light: ESRI_SATELLITE_STYLE,
    dark: ESRI_SATELLITE_STYLE,
  },
} as const

type MapStyleKey = keyof typeof MAP_STYLES

// ── Position tracker (saves view across style switches) ───────────────

function MapPositionTracker({
  savedPosition,
  onPositionChange,
}: {
  savedPosition: {
    center: [number, number]
    zoom: number
    pitch: number
    bearing: number
  } | null
  onPositionChange: (pos: {
    center: [number, number]
    zoom: number
    pitch: number
    bearing: number
  }) => void
}) {
  const { map, isLoaded } = useMap()
  const restoredRef = useRef(false)

  useEffect(() => {
    if (!map || !isLoaded || !savedPosition || restoredRef.current) return
    map.jumpTo({
      center: savedPosition.center,
      zoom: savedPosition.zoom,
      pitch: savedPosition.pitch,
      bearing: savedPosition.bearing,
    })
    restoredRef.current = true
  }, [map, isLoaded, savedPosition])

  useEffect(() => {
    if (!map || !isLoaded) return
    const handleMoveEnd = () => {
      const center = map.getCenter()
      onPositionChange({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
      })
    }
    map.on("moveend", handleMoveEnd)
    return () => {
      map.off("moveend", handleMoveEnd)
    }
  }, [map, isLoaded, onPositionChange])

  return null
}

// ── 3D controller ─────────────────────────────────────────────────────

function Map3DController({
  homeCenter,
  homeZoom,
}: {
  homeCenter: [number, number]
  homeZoom: number
}) {
  const { map, isLoaded } = useMap()
  const [pitch, setPitch] = useState(0)
  const [bearing, setBearing] = useState(0)
  const [zoom, setZoom] = useState(homeZoom)

  useEffect(() => {
    if (!map || !isLoaded) return
    const handleMove = () => {
      setPitch(Math.round(map.getPitch()))
      setBearing(Math.round(map.getBearing()))
      setZoom(Math.round(map.getZoom() * 10) / 10)
    }
    map.on("move", handleMove)
    setZoom(Math.round(map.getZoom() * 10) / 10)
    return () => {
      map.off("move", handleMove)
    }
  }, [map, isLoaded])

  const handle3D = useCallback(() => {
    map?.easeTo({ pitch: 60, bearing: -20, duration: 1000 })
  }, [map])

  const handle2D = useCallback(() => {
    map?.easeTo({ pitch: 0, bearing: 0, duration: 1000 })
  }, [map])

  const handleReset = useCallback(() => {
    map?.flyTo({
      center: homeCenter,
      zoom: homeZoom,
      pitch: 0,
      bearing: 0,
      duration: 1500,
    })
  }, [map, homeCenter, homeZoom])

  const is3D = pitch !== 0 || bearing !== 0

  if (!isLoaded) return null

  return (
    <div className="flex items-center gap-2">
      {is3D ? (
        <Button
          onClick={handle2D}
          variant="outline"
          size="sm"
          title="2D View"
          className="bg-white shadow-md border-gray-300 h-9 px-2.5"
        >
          <MapIcon className="h-4 w-4 mr-1.5" />
          <span className="text-xs">2D</span>
        </Button>
      ) : (
        <Button
          onClick={handle3D}
          variant="outline"
          size="sm"
          title="3D View"
          className="bg-white shadow-md border-gray-300 h-9 px-2.5"
        >
          <Mountain className="h-4 w-4 mr-1.5" />
          <span className="text-xs">3D</span>
        </Button>
      )}

      <Button
        onClick={handleReset}
        variant="outline"
        size="sm"
        title="Reset view"
        className="bg-white shadow-md border-gray-300 h-9 w-9 p-0"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      <div className="rounded-md bg-white/90 backdrop-blur px-2.5 py-1.5 text-[10px] font-mono border border-gray-300 shadow-md flex items-center gap-3 whitespace-nowrap">
        <span className="text-gray-600">Zoom: {zoom}</span>
        {is3D && (
          <>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">Pitch: {pitch}°</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">Bearing: {bearing}°</span>
          </>
        )}
      </div>
    </div>
  )
}

// ── Style switcher (rendered inside Map context) ──────────────────────

function MapStyleSwitcher({
  value,
  onChange,
}: {
  value: MapStyleKey
  onChange: (v: MapStyleKey) => void
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as MapStyleKey)}>
      <SelectTrigger className="w-[200px] bg-white shadow-md border-gray-300 text-xs h-9">
        <SelectValue placeholder="Map style" />
      </SelectTrigger>
      <SelectContent className="z-[9999]">
        {Object.entries(MAP_STYLES).map(([key, style]) => (
          <SelectItem key={key} value={key}>
            {style.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── Public shell component ────────────────────────────────────────────

interface LandBankMapShellProps {
  /** Map height CSS class (e.g. "h-[500px]") */
  height?: string
  /** Default center [lng, lat] */
  center?: [number, number]
  /** Default zoom */
  zoom?: number
  /** Children rendered inside Map context (layers etc.) */
  children?: React.ReactNode
}

export function LandBankMapShell({
  height = "h-[500px]",
  center = [95.956, 21.9162],
  zoom = 6,
  children,
}: LandBankMapShellProps) {
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("carto_light")
  const [savedPosition, setSavedPosition] = useState<{
    center: [number, number]
    zoom: number
    pitch: number
    bearing: number
  } | null>(null)

  const handlePositionChange = useCallback(
    (pos: {
      center: [number, number]
      zoom: number
      pitch: number
      bearing: number
    }) => {
      setSavedPosition(pos)
    },
    []
  )

  return (
    <div
      className={`w-full ${height} rounded-lg overflow-hidden border relative`}
    >
      <Map
        key={mapStyle}
        styles={{
          light: MAP_STYLES[mapStyle].light as string | object,
          dark: MAP_STYLES[mapStyle].dark as string | object,
        }}
        center={center}
        zoom={zoom}
        minZoom={2}
        maxZoom={18}
      >
        {/* Restore position when switching styles */}
        <MapPositionTracker
          savedPosition={savedPosition}
          onPositionChange={handlePositionChange}
        />

        {/* Top controls bar */}
        <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-2">
          <div className="flex-1" />

          {/* 3D controls */}
          <Map3DController homeCenter={center} homeZoom={zoom} />

          {/* Style switcher */}
          <MapStyleSwitcher value={mapStyle} onChange={setMapStyle} />
        </div>

        {/* Zoom / compass / fullscreen controls */}
        <MapControls
          position="top-left"
          showZoom
          showCompass
          showLocate
          showFullscreen
          className="!top-14"
        />

        {/* Layer children (parcels, draw tools, etc.) */}
        {children}
      </Map>
    </div>
  )
}

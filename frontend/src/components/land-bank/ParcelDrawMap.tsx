"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useMap } from "@/components/ui/map"
import { Button } from "@/components/ui/button"
import { Upload, Trash2, MousePointerClick } from "lucide-react"
import { LandBankMapShell } from "./LandBankMapShell"
import type MapLibreGL from "maplibre-gl"

interface ParcelDrawMapProps {
  geometry: any | null
  onChange: (geometry: any | null) => void
}

function DrawController({ geometry, onChange }: ParcelDrawMapProps) {
  const { map, isLoaded } = useMap()
  const initialized = useRef(false)
  const [drawingMode, setDrawingMode] = useState(false)
  const pointsRef = useRef<[number, number][]>([])

  // Add draw sources once map is loaded
  useEffect(() => {
    if (!map || !isLoaded || initialized.current) return

    // Source for completed polygon
    if (!map.getSource("drawn-polygon")) {
      map.addSource("drawn-polygon", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] } as any,
      })
      map.addLayer({
        id: "drawn-polygon-fill",
        type: "fill",
        source: "drawn-polygon",
        paint: { "fill-color": "#3b82f6", "fill-opacity": 0.3 },
      })
      map.addLayer({
        id: "drawn-polygon-outline",
        type: "line",
        source: "drawn-polygon",
        paint: { "line-color": "#3b82f6", "line-width": 2 },
      })
    }

    // Source for in-progress drawing
    if (!map.getSource("draw-points")) {
      map.addSource("draw-points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] } as any,
      })
      map.addLayer({
        id: "draw-points-line",
        type: "line",
        source: "draw-points",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      })
      map.addLayer({
        id: "draw-points-circles",
        type: "circle",
        source: "draw-points",
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-color": "#3b82f6",
          "circle-radius": 5,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      })
    }

    // Display existing geometry if provided
    if (geometry) {
      renderPolygon(map, geometry)
    }

    initialized.current = true
  }, [map, isLoaded, geometry])

  // Sync geometry prop changes
  useEffect(() => {
    if (!map || !isLoaded || !initialized.current) return
    if (geometry) {
      renderPolygon(map, geometry)
    } else {
      clearPolygon(map)
    }
  }, [map, isLoaded, geometry])

  // Handle drawing clicks
  useEffect(() => {
    if (!map || !isLoaded) return

    const handleClick = (e: MapLibreGL.MapMouseEvent) => {
      if (!drawingMode) return
      const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      pointsRef.current = [...pointsRef.current, pt]
      updateDrawPreview(map, pointsRef.current)
    }

    const handleDblClick = (e: MapLibreGL.MapMouseEvent) => {
      if (!drawingMode) return
      e.preventDefault()
      const pts = pointsRef.current
      if (pts.length >= 3) {
        const ring = [...pts, pts[0]]
        const geom = { type: "Polygon" as const, coordinates: [ring] }
        onChange(geom)
      }
      pointsRef.current = []
      setDrawingMode(false)
      map.getCanvas().style.cursor = ""
      clearDrawPreview(map)
    }

    map.on("click", handleClick)
    map.on("dblclick", handleDblClick)

    return () => {
      map.off("click", handleClick)
      map.off("dblclick", handleDblClick)
    }
  }, [map, isLoaded, drawingMode, onChange])

  // Toggle cursor
  useEffect(() => {
    if (!map) return
    map.getCanvas().style.cursor = drawingMode ? "crosshair" : ""
    if (!drawingMode) {
      pointsRef.current = []
      if (map.isStyleLoaded()) clearDrawPreview(map)
    }
  }, [map, drawingMode])

  return (
    <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2">
      <Button
        type="button"
        variant={drawingMode ? "default" : "outline"}
        size="sm"
        onClick={() => setDrawingMode(!drawingMode)}
        className="gap-1 bg-white shadow-md border-gray-300"
      >
        <MousePointerClick className="h-3.5 w-3.5" />
        {drawingMode ? "Drawing... (double-click to finish)" : "Draw Polygon"}
      </Button>
    </div>
  )
}

export function ParcelDrawMap({ geometry, onChange }: ParcelDrawMapProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string)
          if (json.type === "FeatureCollection" && json.features?.length > 0) {
            onChange(json.features[0].geometry)
          } else if (json.type === "Feature") {
            onChange(json.geometry)
          } else if (json.type === "Polygon" || json.type === "MultiPolygon") {
            onChange(json)
          }
        } catch {
          // Invalid JSON
        }
      }
      reader.readAsText(file)
      e.target.value = ""
    },
    [onChange]
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-1"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload GeoJSON
        </Button>
        {geometry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(null)}
            className="gap-1 text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Geometry
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".geojson,.json"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      <LandBankMapShell height="h-[350px]">
        <DrawController geometry={geometry} onChange={onChange} />
      </LandBankMapShell>

      {geometry && (
        <p className="text-xs text-muted-foreground">
          Geometry type: {geometry.type}
        </p>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────

function renderPolygon(map: MapLibreGL.Map, geometry: any) {
  const source = map.getSource("drawn-polygon") as MapLibreGL.GeoJSONSource
  if (source) {
    source.setData({
      type: "Feature",
      properties: {},
      geometry,
    } as any)

    const coords = extractCoords(geometry)
    if (coords.length > 0) {
      const bounds = coords.reduce(
        (acc, [lng, lat]) => {
          acc[0] = Math.min(acc[0], lng)
          acc[1] = Math.min(acc[1], lat)
          acc[2] = Math.max(acc[2], lng)
          acc[3] = Math.max(acc[3], lat)
          return acc
        },
        [180, 90, -180, -90] as [number, number, number, number]
      )
      map.fitBounds(bounds as any, { padding: 60, maxZoom: 15 })
    }
  }
}

function clearPolygon(map: MapLibreGL.Map) {
  const source = map.getSource("drawn-polygon") as MapLibreGL.GeoJSONSource
  if (source) {
    source.setData({ type: "FeatureCollection", features: [] } as any)
  }
}

function updateDrawPreview(
  map: MapLibreGL.Map,
  points: [number, number][]
) {
  const source = map.getSource("draw-points") as MapLibreGL.GeoJSONSource
  if (!source) return

  const features: any[] = points.map((pt) => ({
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: pt },
  }))

  if (points.length >= 2) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: points },
    })
  }

  source.setData({ type: "FeatureCollection", features })
}

function clearDrawPreview(map: MapLibreGL.Map) {
  const source = map.getSource("draw-points") as MapLibreGL.GeoJSONSource
  if (source) {
    source.setData({ type: "FeatureCollection", features: [] } as any)
  }
}

function extractCoords(geometry: any): [number, number][] {
  if (!geometry) return []
  if (geometry.type === "Point") return [geometry.coordinates]
  if (geometry.type === "Polygon") return geometry.coordinates[0] || []
  if (geometry.type === "MultiPolygon") return (geometry.coordinates[0]?.[0]) || []
  return []
}

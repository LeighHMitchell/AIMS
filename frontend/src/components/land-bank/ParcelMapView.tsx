"use client"

import { useEffect, useRef } from "react"
import { Map, useMap } from "@/components/ui/map"
import { PARCEL_STATUS_COLORS } from "@/lib/land-bank-utils"
import type { LandParcel, ParcelStatus } from "@/types/land-bank"

interface ParcelMapViewProps {
  parcels: LandParcel[]
  onParcelClick?: (parcel: LandParcel) => void
}

function ParcelMapLayers({ parcels, onParcelClick }: ParcelMapViewProps) {
  const { map, isLoaded } = useMap()
  const layersAdded = useRef(false)

  useEffect(() => {
    if (!map || !isLoaded || layersAdded.current) return

    // Build GeoJSON from parcels that have geometry
    const features = parcels
      .filter(p => p.geometry)
      .map(p => ({
        type: "Feature" as const,
        properties: {
          id: p.id,
          name: p.name,
          parcel_code: p.parcel_code,
          status: p.status,
          size_hectares: p.size_hectares,
          state_region: p.state_region,
          classification: p.classification,
        },
        geometry: p.geometry!,
      }))

    const geojson = {
      type: "FeatureCollection" as const,
      features,
    }

    // Add source
    if (!map.getSource("parcels")) {
      map.addSource("parcels", {
        type: "geojson",
        data: geojson as any,
      })
    }

    // Add fill layer
    if (!map.getLayer("parcels-fill")) {
      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": [
            "match",
            ["get", "status"],
            "available", PARCEL_STATUS_COLORS.available,
            "reserved", PARCEL_STATUS_COLORS.reserved,
            "allocated", PARCEL_STATUS_COLORS.allocated,
            "disputed", PARCEL_STATUS_COLORS.disputed,
            "#888888",
          ],
          "fill-opacity": 0.4,
        },
      })
    }

    // Add outline layer
    if (!map.getLayer("parcels-outline")) {
      map.addLayer({
        id: "parcels-outline",
        type: "line",
        source: "parcels",
        paint: {
          "line-color": [
            "match",
            ["get", "status"],
            "available", PARCEL_STATUS_COLORS.available,
            "reserved", PARCEL_STATUS_COLORS.reserved,
            "allocated", PARCEL_STATUS_COLORS.allocated,
            "disputed", PARCEL_STATUS_COLORS.disputed,
            "#888888",
          ],
          "line-width": 2,
        },
      })
    }

    // Click handler
    if (onParcelClick) {
      map.on("click", "parcels-fill", (e: any) => {
        const feature = e.features?.[0]
        if (feature) {
          const parcel = parcels.find(p => p.id === feature.properties.id)
          if (parcel) onParcelClick(parcel)
        }
      })

      map.on("mouseenter", "parcels-fill", () => {
        map.getCanvas().style.cursor = "pointer"
      })
      map.on("mouseleave", "parcels-fill", () => {
        map.getCanvas().style.cursor = ""
      })
    }

    // Fit bounds to parcels
    if (features.length > 0) {
      const bounds = features.reduce(
        (acc, f) => {
          const coords = extractCoordinates(f.geometry)
          coords.forEach(([lng, lat]) => {
            acc[0] = Math.min(acc[0], lng)
            acc[1] = Math.min(acc[1], lat)
            acc[2] = Math.max(acc[2], lng)
            acc[3] = Math.max(acc[3], lat)
          })
          return acc
        },
        [180, 90, -180, -90] as [number, number, number, number]
      )

      map.fitBounds(bounds as any, { padding: 50, maxZoom: 14 })
    }

    layersAdded.current = true
  }, [map, isLoaded, parcels, onParcelClick])

  return null
}

export function ParcelMapView({ parcels, onParcelClick }: ParcelMapViewProps) {
  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border">
      <Map
        center={[96.5, 19.8]}
        zoom={5}
      >
        <ParcelMapLayers parcels={parcels} onParcelClick={onParcelClick} />
      </Map>
    </div>
  )
}

function extractCoordinates(geometry: any): [number, number][] {
  if (!geometry) return []
  if (geometry.type === "Point") return [geometry.coordinates]
  if (geometry.type === "Polygon") return geometry.coordinates[0] || []
  if (geometry.type === "MultiPolygon") return (geometry.coordinates[0]?.[0]) || []
  return []
}

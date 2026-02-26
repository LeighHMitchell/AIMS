"use client"

import { useEffect, useRef } from "react"
import { useMap } from "@/components/ui/map"
import { PARCEL_STATUS_COLORS } from "@/lib/land-bank-utils"
import { LandBankMapShell } from "./LandBankMapShell"
import type { LandParcel, ParcelStatus } from "@/types/land-bank"

interface ParcelDetailMapProps {
  parcel: LandParcel
}

function ParcelLayer({ parcel }: ParcelDetailMapProps) {
  const { map, isLoaded } = useMap()
  const added = useRef(false)

  useEffect(() => {
    if (!map || !isLoaded || !parcel.geometry || added.current) return

    const geojson = {
      type: "Feature" as const,
      properties: { status: parcel.status },
      geometry: parcel.geometry!,
    }

    if (!map.getSource("parcel-detail")) {
      map.addSource("parcel-detail", {
        type: "geojson",
        data: geojson as any,
      })
    }

    const fillColor = PARCEL_STATUS_COLORS[parcel.status as ParcelStatus] || "#888"

    if (!map.getLayer("parcel-detail-fill")) {
      map.addLayer({
        id: "parcel-detail-fill",
        type: "fill",
        source: "parcel-detail",
        paint: {
          "fill-color": fillColor,
          "fill-opacity": 0.35,
        },
      })
    }

    if (!map.getLayer("parcel-detail-outline")) {
      map.addLayer({
        id: "parcel-detail-outline",
        type: "line",
        source: "parcel-detail",
        paint: {
          "line-color": fillColor,
          "line-width": 2.5,
        },
      })
    }

    const coords = extractCoords(parcel.geometry!)
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

    added.current = true
  }, [map, isLoaded, parcel])

  return null
}

export function ParcelDetailMap({ parcel }: ParcelDetailMapProps) {
  if (!parcel.geometry) {
    return (
      <div className="w-full h-[400px] rounded-lg border flex items-center justify-center bg-muted/50">
        <p className="text-sm text-muted-foreground">No geometry data available for this parcel.</p>
      </div>
    )
  }

  return (
    <LandBankMapShell height="h-[400px]">
      <ParcelLayer parcel={parcel} />
    </LandBankMapShell>
  )
}

function extractCoords(geometry: any): [number, number][] {
  if (!geometry) return []
  if (geometry.type === "Point") return [geometry.coordinates]
  if (geometry.type === "Polygon") return geometry.coordinates[0] || []
  if (geometry.type === "MultiPolygon") return (geometry.coordinates[0]?.[0]) || []
  return []
}

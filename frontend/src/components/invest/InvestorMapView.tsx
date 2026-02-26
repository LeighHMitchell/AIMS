"use client"

import { useEffect, useRef } from "react"
import { useMap } from "@/components/ui/map"
import { LandBankMapShell } from "@/components/land-bank/LandBankMapShell"
import { PARCEL_STATUS_COLORS } from "@/lib/land-bank-utils"
import type { PublicParcel } from "@/types/land-bank"

interface InvestorMapViewProps {
  parcels: PublicParcel[]
  onParcelClick?: (parcel: PublicParcel) => void
}

function InvestorMapLayers({ parcels, onParcelClick }: InvestorMapViewProps) {
  const { map, isLoaded } = useMap()
  const layersAdded = useRef(false)

  useEffect(() => {
    if (!map || !isLoaded || layersAdded.current) return

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
          asset_type: p.asset_type,
        },
        geometry: p.geometry!,
      }))

    const geojson = {
      type: "FeatureCollection" as const,
      features,
    }

    if (!map.getSource("invest-parcels")) {
      map.addSource("invest-parcels", {
        type: "geojson",
        data: geojson as any,
      })
    }

    if (!map.getLayer("invest-parcels-fill")) {
      map.addLayer({
        id: "invest-parcels-fill",
        type: "fill",
        source: "invest-parcels",
        paint: {
          "fill-color": PARCEL_STATUS_COLORS.available,
          "fill-opacity": 0.35,
        },
      })

      map.addLayer({
        id: "invest-parcels-outline",
        type: "line",
        source: "invest-parcels",
        paint: {
          "line-color": PARCEL_STATUS_COLORS.available,
          "line-width": 2,
        },
      })

      // Hover effect
      map.on("mouseenter", "invest-parcels-fill", () => {
        map.getCanvas().style.cursor = "pointer"
      })
      map.on("mouseleave", "invest-parcels-fill", () => {
        map.getCanvas().style.cursor = ""
      })

      // Click handler
      if (onParcelClick) {
        map.on("click", "invest-parcels-fill", (e: any) => {
          const feature = e.features?.[0]
          if (feature?.properties?.id) {
            const p = parcels.find(pp => pp.id === feature.properties.id)
            if (p) onParcelClick(p)
          }
        })
      }
    }

    // Fit bounds to features
    if (features.length > 0) {
      try {
        const maplibregl = (window as any).maplibregl
        if (maplibregl) {
          const bounds = new maplibregl.LngLatBounds()
          features.forEach(f => {
            const coords = f.geometry.type === "Polygon"
              ? (f.geometry as any).coordinates[0]
              : f.geometry.type === "MultiPolygon"
                ? (f.geometry as any).coordinates[0][0]
                : []
            coords.forEach((c: number[]) => bounds.extend(c as [number, number]))
          })
          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 50, maxZoom: 12 })
          }
        }
      } catch {
        // silent
      }
    }

    layersAdded.current = true
  }, [map, isLoaded, parcels, onParcelClick])

  return null
}

export function InvestorMapView(props: InvestorMapViewProps) {
  return (
    <LandBankMapShell height="500px">
      <InvestorMapLayers {...props} />
    </LandBankMapShell>
  )
}

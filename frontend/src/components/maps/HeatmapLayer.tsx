'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

// Extend Leaflet types for heatLayer
declare module 'leaflet' {
  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: {
      minOpacity?: number
      maxZoom?: number
      max?: number
      radius?: number
      blur?: number
      gradient?: Record<number, string>
    }
  ): L.Layer
}

interface HeatmapLayerProps {
  points: Array<{
    lat: number
    lng: number
    intensity?: number
  }>
  options?: {
    minOpacity?: number
    maxZoom?: number
    max?: number
    radius?: number
    blur?: number
    gradient?: Record<number, string>
  }
}

export default function HeatmapLayer({ points, options = {} }: HeatmapLayerProps) {
  const map = useMap()

  useEffect(() => {
    if (!map || points.length === 0) return

    // Convert points to the format expected by leaflet.heat
    const heatPoints: Array<[number, number, number]> = points.map(p => [
      p.lat,
      p.lng,
      p.intensity ?? 1
    ])

    // Default options for a nice looking heatmap
    const defaultOptions = {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      max: 1.0,
      minOpacity: 0.4,
      gradient: {
        0.2: '#313695',
        0.4: '#4575b4',
        0.5: '#74add1',
        0.6: '#abd9e9',
        0.7: '#fee090',
        0.8: '#fdae61',
        0.9: '#f46d43',
        1.0: '#d73027'
      }
    }

    // Create the heat layer
    const heatLayer = L.heatLayer(heatPoints, {
      ...defaultOptions,
      ...options
    })

    // Add to map
    heatLayer.addTo(map)

    // Cleanup on unmount
    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, points, options])

  return null
}


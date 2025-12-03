'use client'

import React, { useMemo, useId, useState, useEffect } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'

// Dynamically import layers to avoid SSR issues
const HeatmapLayer = dynamic(() => import('./HeatmapLayer'), { ssr: false })
const MarkersLayer = dynamic(() => import('./MarkersLayer'), { ssr: false })

interface Location {
  id?: string
  location_name?: string
  latitude?: number
  longitude?: number
  site_type?: string
  state_region_name?: string
  township_name?: string
  district_name?: string
  village_name?: string
  address?: string
  city?: string
  description?: string
  location_description?: string
  [key: string]: any
}

interface ActivityLocationsMapViewProps {
  locations: Location[]
  mapCenter: [number, number]
  mapZoom: number
  currentLayer: string
  layerUrl: string
  layerAttribution: string
  viewMode?: 'markers' | 'heatmap'
  activityTitle?: string
}

export default function ActivityLocationsMapView({
  locations,
  mapCenter,
  mapZoom,
  currentLayer,
  layerUrl,
  layerAttribution,
  viewMode = 'markers',
  activityTitle,
}: ActivityLocationsMapViewProps) {
  // Generate a unique instance ID for this component mount
  const instanceId = useId()
  
  // Track if component is mounted to avoid Leaflet initialization issues
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => setIsMounted(true), 50)
    return () => {
      clearTimeout(timer)
      setIsMounted(false)
    }
  }, [])

  // Filter valid locations
  const validLocations = useMemo(() => {
    return locations.filter(loc => {
      const lat = Number(loc.latitude)
      const lng = Number(loc.longitude)
      return !isNaN(lat) && !isNaN(lng)
    })
  }, [locations])

  // Prepare heatmap points
  const heatmapPoints = useMemo(() => {
    return validLocations.map(loc => ({
      lat: Number(loc.latitude),
      lng: Number(loc.longitude),
      intensity: 0.8
    }))
  }, [validLocations])

  // Don't render until mounted to avoid SSR/hydration issues
  if (!isMounted) {
    return (
      <div style={{ height: '100%', width: '100%' }} className="flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">Loading map...</div>
      </div>
    )
  }

  return (
    <MapContainer
      key={`map-${instanceId}-${currentLayer}-${viewMode}`}
      center={mapCenter}
      zoom={mapZoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      minZoom={5}
      maxZoom={18}
    >
      <TileLayer
        url={layerUrl}
        attribution={layerAttribution}
      />
      
      {/* Heatmap Mode */}
      {viewMode === 'heatmap' && heatmapPoints.length > 0 && (
        <HeatmapLayer 
          points={heatmapPoints}
          options={{
            radius: 30,
            blur: 20,
            maxZoom: 12,
            max: 1.0,
            minOpacity: 0.5,
            gradient: {
              0.2: '#313695',
              0.3: '#4575b4', 
              0.4: '#74add1',
              0.5: '#abd9e9',
              0.6: '#ffffbf',
              0.7: '#fee090',
              0.8: '#fdae61',
              0.9: '#f46d43',
              1.0: '#d73027'
            }
          }}
        />
      )}

      {/* Markers Mode */}
      {viewMode === 'markers' && validLocations.length > 0 && (
        <MarkersLayer 
          locations={validLocations}
          activityTitle={activityTitle}
        />
      )}
    </MapContainer>
  )
}

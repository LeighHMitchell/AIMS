'use client'

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Rectangle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons when bundling with Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface Location {
  id?: string
  location_name?: string
  latitude?: number
  longitude?: number
  site_type?: string
  state_region_name?: string
  [key: string]: any
}

interface ActivityLocationsMapViewProps {
  locations: Location[]
  mapCenter: [number, number]
  mapZoom: number
  currentLayer: string
  layerUrl: string
  layerAttribution: string
}

interface GeoJSONFeature {
  type: string
  properties: {
    ST: string
    ST_RG: string
    ST_PCODE: string
    [key: string]: any
  }
  geometry: {
    type: string
    coordinates: any
  }
}

interface GeoJSONData {
  type: string
  features: GeoJSONFeature[]
}

// Map GeoJSON region names to full names
const REGION_NAME_MAPPING: Record<string, string> = {
  'Ayeyarwady': 'Ayeyarwady Region',
  'Bago': 'Bago Region',
  'Chin': 'Chin State',
  'Kachin': 'Kachin State',
  'Kayah': 'Kayah State',
  'Kayin': 'Kayin State',
  'Magway': 'Magway Region',
  'Mandalay': 'Mandalay Region',
  'Mon': 'Mon State',
  'Nay Pyi Taw': 'Naypyidaw Union Territory',
  'Rakhine': 'Rakhine State',
  'Sagaing': 'Sagaing Region',
  'Shan': 'Shan State',
  'Tanintharyi': 'Tanintharyi Region',
  'Yangon': 'Yangon Region'
}

// Myanmar bounds - restricts the map view to Myanmar only
const MYANMAR_BOUNDS: [[number, number], [number, number]] = [
  [9.5, 92.0],  // Southwest coordinates
  [28.5, 101.5] // Northeast coordinates
]

export default function ActivityLocationsMapView({
  locations,
  mapCenter,
  mapZoom,
  currentLayer,
  layerUrl,
  layerAttribution,
}: ActivityLocationsMapViewProps) {
  const [geoData, setGeoData] = useState<GeoJSONData | null>(null)
  const [regionCounts, setRegionCounts] = useState<Record<string, number>>({})

  // Load GeoJSON data for Myanmar regions
  useEffect(() => {
    fetch('/myanmar-states-simplified.geojson')
      .then(response => response.json())
      .then(data => {
        setGeoData(data)
      })
      .catch(error => {
        console.error('Error loading GeoJSON:', error)
      })
  }, [])

  // Calculate activity count per region
  useEffect(() => {
    const counts: Record<string, number> = {}
    
    locations.forEach(location => {
      const lat = Number(location.latitude)
      const lng = Number(location.longitude)
      
      if (!geoData || isNaN(lat) || isNaN(lng)) return
      
      // Find which region this point is in
      geoData.features.forEach(feature => {
        const regionName = feature.properties.ST
        const fullRegionName = REGION_NAME_MAPPING[regionName] || regionName
        
        // Check if point is in this region's polygon
        if (isPointInRegion([lng, lat], feature.geometry)) {
          counts[fullRegionName] = (counts[fullRegionName] || 0) + 1
        }
      })
    })
    
    setRegionCounts(counts)
  }, [locations, geoData])

  // Simple point-in-polygon check
  const isPointInRegion = (point: [number, number], geometry: any): boolean => {
    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.some((polygon: any) => 
        isPointInPolygon(point, polygon[0])
      )
    } else if (geometry.type === 'Polygon') {
      return isPointInPolygon(point, geometry.coordinates[0])
    }
    return false
  }

  const isPointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
    const [x, y] = point
    let inside = false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i]
      const [xj, yj] = polygon[j]

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      
      if (intersect) inside = !inside
    }

    return inside
  }

  // Get color based on activity count (choropleth coloring)
  const getColor = (count: number): string => {
    if (count === 0) return 'rgba(226, 232, 240, 0.3)' // Very light gray for no activities
    if (count === 1) return 'rgba(96, 165, 250, 0.5)' // Light blue
    if (count === 2) return 'rgba(59, 130, 246, 0.6)' // Medium blue
    if (count <= 4) return 'rgba(251, 146, 60, 0.65)' // Orange
    if (count <= 6) return 'rgba(239, 68, 68, 0.7)' // Red
    return 'rgba(185, 28, 28, 0.75)' // Dark red for many activities
  }

  // Style function for GeoJSON (choropleth styling)
  const styleFeature = (feature: any) => {
    const regionName = feature.properties.ST
    const fullRegionName = REGION_NAME_MAPPING[regionName] || regionName
    const count = regionCounts[fullRegionName] || 0

    return {
      fillColor: getColor(count),
      weight: 2,
      opacity: 1,
      color: count > 0 ? '#475569' : '#cbd5e1', // Darker border for regions with activities
      fillOpacity: count > 0 ? 0.65 : 0.3
    }
  }

  // Highlight feature on hover (choropleth interaction)
  const onEachFeature = (feature: any, layer: any) => {
    const regionName = feature.properties.ST
    const fullRegionName = REGION_NAME_MAPPING[regionName] || regionName
    const count = regionCounts[fullRegionName] || 0

    layer.on({
      mouseover: (e: any) => {
        const layer = e.target
        layer.setStyle({
          weight: 3,
          color: '#1e3a8a',
          fillOpacity: 0.85
        })
        layer.bringToFront()
      },
      mouseout: (e: any) => {
        const layer = e.target
        layer.setStyle(styleFeature(feature))
      }
    })

    // Show tooltip with region name and count
    const tooltipContent = count > 0 
      ? `<div style="font-weight: bold; margin-bottom: 4px; font-size: 13px;">${fullRegionName}</div>
         <div style="font-size: 12px; color: #059669;">✓ ${count} ${count === 1 ? 'activity location' : 'activity locations'}</div>`
      : `<div style="font-weight: bold; font-size: 13px;">${fullRegionName}</div>
         <div style="font-size: 11px; color: #6b7280;">No activity locations</div>`

    layer.bindTooltip(tooltipContent, { sticky: true })
  }

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      maxBounds={MYANMAR_BOUNDS}
      maxBoundsViscosity={1.0}
      minZoom={6}
      maxZoom={18}
      worldCopyJump={false}
      key={currentLayer}
    >
      <TileLayer
        url={layerUrl}
        attribution={layerAttribution}
        bounds={MYANMAR_BOUNDS}
      />
      
      {/* Fade overlay rectangles to hide surrounding countries */}
      {/* Top rectangle */}
      <Rectangle
        bounds={[[MYANMAR_BOUNDS[1][0], -180], [90, 180]]}
        pathOptions={{ fillColor: '#f8fafc', fillOpacity: 0.9, stroke: false, interactive: false }}
      />
      {/* Bottom rectangle */}
      <Rectangle
        bounds={[[-90, -180], [MYANMAR_BOUNDS[0][0], 180]]}
        pathOptions={{ fillColor: '#f8fafc', fillOpacity: 0.9, stroke: false, interactive: false }}
      />
      {/* Left rectangle */}
      <Rectangle
        bounds={[[MYANMAR_BOUNDS[0][0], -180], [MYANMAR_BOUNDS[1][0], MYANMAR_BOUNDS[0][1]]]}
        pathOptions={{ fillColor: '#f8fafc', fillOpacity: 0.9, stroke: false, interactive: false }}
      />
      {/* Right rectangle */}
      <Rectangle
        bounds={[[MYANMAR_BOUNDS[0][0], MYANMAR_BOUNDS[1][1]], [MYANMAR_BOUNDS[1][0], 180]]}
        pathOptions={{ fillColor: '#f8fafc', fillOpacity: 0.9, stroke: false, interactive: false }}
      />
      
      {/* Location Markers (Pins) - MUST render BEFORE GeoJSON to ensure they appear on top */}
      {locations.map((location, idx) => {
        const lat = Number(location.latitude)
        const lng = Number(location.longitude)
        
        // Create larger, more visible custom icon
        const customIcon = L.divIcon({
          className: 'custom-pin-marker',
          html: `
            <div style="position: relative;">
              <div style="
                width: 30px;
                height: 30px;
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                border: 3px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 3px 10px rgba(0,0,0,0.4);
                position: absolute;
                left: -15px;
                top: -30px;
              "></div>
              <div style="
                width: 12px;
                height: 12px;
                background: white;
                border-radius: 50%;
                position: absolute;
                left: -6px;
                top: -21px;
                z-index: 1;
              "></div>
            </div>
          `,
          iconSize: [30, 42],
          iconAnchor: [15, 42],
          popupAnchor: [0, -42]
        })
        
        return (
          <Marker
            key={location.id || idx}
            position={[lat, lng]}
            icon={customIcon}
            zIndexOffset={10000}
          >
            <Popup maxWidth={300} className="location-popup">
              <div className="min-w-[220px]">
                <div className="font-bold text-base mb-2 text-blue-900 border-b pb-2 border-gray-200">
                  📍 {location.location_name || 'Unnamed Location'}
                </div>
                
                {location.site_type && (
                  <div className="text-sm text-gray-700 mb-1.5 flex items-start gap-2">
                    <span className="font-medium text-gray-500">Type:</span>
                    <span>{location.site_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  </div>
                )}
                
                {location.state_region_name && (
                  <div className="text-sm text-gray-700 mb-1.5 flex items-start gap-2">
                    <span className="font-medium text-gray-500">Region:</span>
                    <span>{location.state_region_name}</span>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Latitude:</span>
                    <span className="font-mono">{lat.toFixed(6)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Longitude:</span>
                    <span className="font-mono">{lng.toFixed(6)}°</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
      
      {/* GeoJSON Heatmap Layer for Myanmar regions - Render AFTER markers so markers appear on top */}
      {geoData && (
        <GeoJSON
          data={geoData}
          style={styleFeature}
          onEachFeature={onEachFeature}
          pane="tilePane"
        />
      )}
    </MapContainer>
  )
}

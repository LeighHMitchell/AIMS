'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { GoogleMap, LoadScript, Marker, Polygon, InfoWindow } from '@react-google-maps/api'

interface Location {
  id?: string
  location_name?: string
  latitude?: number
  longitude?: number
  site_type?: string
  state_region_name?: string
  [key: string]: any
}

interface ActivityLocationsGoogleMapProps {
  locations: Location[]
  mapCenter: [number, number]
  mapZoom: number
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

const MYANMAR_BOUNDS = {
  north: 28.5,
  south: 9.5,
  west: 92.0,
  east: 101.5
}

const containerStyle = {
  width: '100%',
  height: '100%'
}

export default function ActivityLocationsGoogleMap({
  locations,
  mapCenter,
  mapZoom,
}: ActivityLocationsGoogleMapProps) {
  const [geoData, setGeoData] = useState<GeoJSONData | null>(null)
  const [regionCounts, setRegionCounts] = useState<Record<string, number>>({})
  const [selectedMarker, setSelectedMarker] = useState<Location | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)

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

  // Get color based on activity count
  const getColor = (count: number): string => {
    if (count === 0) return '#e2e8f0'
    if (count === 1) return '#60a5fa'
    if (count === 2) return '#3b82f6'
    if (count <= 4) return '#fb923c'
    if (count <= 6) return '#ef4444'
    return '#b91c1c'
  }

  // Convert GeoJSON coordinates to Google Maps format
  const convertCoordinates = (coords: number[][][]): google.maps.LatLngLiteral[] => {
    return coords[0].map(coord => ({
      lat: coord[1],
      lng: coord[0]
    }))
  }

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  // Custom marker icon
  const markerIcon = {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    fillColor: '#ef4444',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: 2,
    anchor: new google.maps.Point(12, 22)
  }

  return (
    <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat: mapCenter[0], lng: mapCenter[1] }}
        zoom={mapZoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          restriction: {
            latLngBounds: MYANMAR_BOUNDS,
            strictBounds: false
          },
          minZoom: 6,
          maxZoom: 18,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
            position: google.maps.ControlPosition.TOP_RIGHT,
            mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
          },
          streetViewControl: false,
          fullscreenControl: true
        }}
      >
        {/* Render Myanmar regions as polygons with choropleth coloring */}
        {geoData && geoData.features.map((feature, idx) => {
          const regionName = feature.properties.ST
          const fullRegionName = REGION_NAME_MAPPING[regionName] || regionName
          const count = regionCounts[fullRegionName] || 0

          if (feature.geometry.type === 'MultiPolygon') {
            return feature.geometry.coordinates.map((polygon: number[][][], polyIdx: number) => (
              <Polygon
                key={`${idx}-${polyIdx}`}
                paths={convertCoordinates(polygon)}
                options={{
                  fillColor: getColor(count),
                  fillOpacity: count > 0 ? 0.5 : 0.2,
                  strokeColor: count > 0 ? '#475569' : '#cbd5e1',
                  strokeWeight: 1.5,
                  clickable: true
                }}
                onClick={() => {
                  alert(`${fullRegionName}: ${count} ${count === 1 ? 'location' : 'locations'}`)
                }}
              />
            ))
          } else if (feature.geometry.type === 'Polygon') {
            return (
              <Polygon
                key={idx}
                paths={convertCoordinates(feature.geometry.coordinates)}
                options={{
                  fillColor: getColor(count),
                  fillOpacity: count > 0 ? 0.5 : 0.2,
                  strokeColor: count > 0 ? '#475569' : '#cbd5e1',
                  strokeWeight: 1.5,
                  clickable: true
                }}
                onClick={() => {
                  alert(`${fullRegionName}: ${count} ${count === 1 ? 'location' : 'locations'}`)
                }}
              />
            )
          }
          return null
        })}

        {/* Render location markers */}
        {locations.map((location, idx) => {
          const lat = Number(location.latitude)
          const lng = Number(location.longitude)

          return (
            <Marker
              key={location.id || idx}
              position={{ lat, lng }}
              icon={markerIcon}
              onClick={() => setSelectedMarker(location)}
              title={location.location_name || 'Unnamed Location'}
            />
          )
        })}

        {/* Info window for selected marker */}
        {selectedMarker && (
          <InfoWindow
            position={{
              lat: Number(selectedMarker.latitude),
              lng: Number(selectedMarker.longitude)
            }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div style={{ minWidth: '220px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', color: '#1e3a8a', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                📍 {selectedMarker.location_name || 'Unnamed Location'}
              </div>
              
              {selectedMarker.site_type && (
                <div style={{ fontSize: '14px', color: '#374151', marginBottom: '6px', display: 'flex', gap: '8px' }}>
                  <span style={{ fontWeight: '500', color: '#6b7280' }}>Type:</span>
                  <span>{selectedMarker.site_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                </div>
              )}
              
              {selectedMarker.state_region_name && (
                <div style={{ fontSize: '14px', color: '#374151', marginBottom: '6px', display: 'flex', gap: '8px' }}>
                  <span style={{ fontWeight: '500', color: '#6b7280' }}>Region:</span>
                  <span>{selectedMarker.state_region_name}</span>
                </div>
              )}
              
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Latitude:</span>
                  <span style={{ fontFamily: 'monospace' }}>{Number(selectedMarker.latitude).toFixed(6)}°</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Longitude:</span>
                  <span style={{ fontFamily: 'monospace' }}>{Number(selectedMarker.longitude).toFixed(6)}°</span>
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  )
}







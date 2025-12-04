'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

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

interface MarkersLayerProps {
  locations: Location[]
  activityTitle?: string
}

// Format site type for display
const formatSiteType = (siteType?: string) => {
  if (!siteType) return null
  return siteType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Build location details string
const getLocationDetails = (location: Location) => {
  const parts = []
  if (location.village_name) parts.push(location.village_name)
  if (location.township_name) parts.push(location.township_name)
  if (location.district_name) parts.push(location.district_name)
  if (location.state_region_name) parts.push(location.state_region_name)
  return parts.join(', ')
}

// Create popup content
const createPopupContent = (location: Location, activityTitle?: string) => {
  const lat = Number(location.latitude)
  const lng = Number(location.longitude)
  
  let html = '<div style="min-width: 250px; font-family: system-ui, -apple-system, sans-serif;">'
  
  if (activityTitle) {
    html += `<div style="font-size: 11px; color: #6b7280; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #f3f4f6;">${activityTitle}</div>`
  }
  
  html += `<div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #1e3a5f; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">📍 ${location.location_name || 'Unnamed Location'}</div>`
  
  if (location.description || location.location_description) {
    html += `<div style="font-size: 13px; color: #374151; margin-bottom: 8px; font-style: italic;">${location.description || location.location_description}</div>`
  }
  
  html += '<div style="font-size: 13px;">'
  
  if (formatSiteType(location.site_type)) {
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 70px;">Type:</span><span style="color: #374151;">${formatSiteType(location.site_type)}</span></div>`
  }
  
  if (location.village_name) {
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 70px;">Village:</span><span style="color: #374151;">${location.village_name}</span></div>`
  }
  
  if (location.township_name) {
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 70px;">Township:</span><span style="color: #374151;">${location.township_name}</span></div>`
  }
  
  if (location.district_name) {
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 70px;">District:</span><span style="color: #374151;">${location.district_name}</span></div>`
  }
  
  if (location.state_region_name) {
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 70px;">Region:</span><span style="color: #374151;">${location.state_region_name}</span></div>`
  }
  
  if (location.address || location.city) {
    const addressParts = [location.address, location.city].filter(Boolean).join(', ')
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 70px;">Address:</span><span style="color: #374151;">${addressParts}</span></div>`
  }
  
  html += '</div>'
  
  html += `<div style="font-size: 11px; color: #6b7280; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
    <div style="display: flex; justify-content: space-between;"><span>Latitude:</span><span style="font-family: monospace;">${lat.toFixed(6)}°</span></div>
    <div style="display: flex; justify-content: space-between;"><span>Longitude:</span><span style="font-family: monospace;">${lng.toFixed(6)}°</span></div>
  </div>`
  
  html += '</div>'
  
  return html
}

// Create tooltip content (shown on hover)
const createTooltipContent = (location: Location, activityTitle?: string) => {
  const locationDetails = getLocationDetails(location)
  let html = `<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 280px;">`
  
  // Activity title
  if (activityTitle) {
    html += `<div style="font-size: 10px; color: #6b7280; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${activityTitle}</div>`
  }
  
  // Location name
  html += `<div style="font-weight: 600; font-size: 13px; color: #1e3a5f;">📍 ${location.location_name || 'Unnamed Location'}</div>`
  
  // Location details
  if (locationDetails) {
    html += `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${locationDetails}</div>`
  }
  
  // Site type
  if (formatSiteType(location.site_type)) {
    html += `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Type: ${formatSiteType(location.site_type)}</div>`
  }
  
  // Coordinates
  const lat = Number(location.latitude)
  const lng = Number(location.longitude)
  html += `<div style="font-size: 10px; color: #9ca3af; margin-top: 4px; font-family: monospace;">${lat.toFixed(4)}°, ${lng.toFixed(4)}°</div>`
  
  // Click hint
  html += `<div style="font-size: 10px; color: #3b82f6; margin-top: 4px; font-style: italic;">Click for more details</div>`
  
  html += '</div>'
  return html
}

export default function MarkersLayer({ locations, activityTitle }: MarkersLayerProps) {
  const map = useMap()
  const layerGroupRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!map) return

    // Create or clear layer group
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(map)
    } else {
      layerGroupRef.current.clearLayers()
    }

    // Collect valid coordinates for bounds fitting
    const validCoords: [number, number][] = []

    // Add markers using CircleMarker (which positions correctly)
    locations.forEach(location => {
      const lat = Number(location.latitude)
      const lng = Number(location.longitude)
      
      if (isNaN(lat) || isNaN(lng)) return

      // Collect valid coordinates for bounds
      validCoords.push([lat, lng])

      // Create a nice-looking circular marker
      const marker = L.circleMarker([lat, lng], {
        radius: 12,
        fillColor: '#dc2626',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      })

      // Bind popup directly with simple content first to test
      const popupContent = createPopupContent(location, activityTitle)
      marker.bindPopup(popupContent, {
        maxWidth: 350,
        closeButton: true,
        autoClose: true
      })
      
      // Bind tooltip (shows on hover)
      const tooltipContent = createTooltipContent(location, activityTitle)
      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -15],
        opacity: 1,
        permanent: false,
        className: 'location-tooltip'
      })

      // Debug click handler
      marker.on('click', () => {
        console.log('[MarkersLayer] Marker clicked:', location.location_name)
      })
      
      // Add to layer group
      layerGroupRef.current!.addLayer(marker)
    })

    // Fit map bounds to show all markers
    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords)
      map.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 12
      })
    }

    // Cleanup
    return () => {
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers()
      }
    }
  }, [map, locations, activityTitle])

  return null
}

'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

interface LocationData {
  id: string
  activity_id: string
  location_type: string
  location_name: string
  description?: string
  latitude: number
  longitude: number
  address?: string
  site_type?: string
  admin_unit?: string
  coverage_scope?: string
  state_region_code?: string
  state_region_name?: string
  township_code?: string
  township_name?: string
  district_name?: string
  village_name?: string
  city?: string
  activity?: {
    id: string
    title: string
    status: string
    organization_id: string
    organization_name?: string
  } | null
}

interface AidMapMarkersLayerProps {
  locations: LocationData[]
}

// Format site type for display
const formatSiteType = (siteType?: string) => {
  if (!siteType) return null
  return siteType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Build location details string
const getLocationDetails = (location: LocationData) => {
  const parts = []
  if (location.village_name) parts.push(location.village_name)
  if (location.township_name) parts.push(location.township_name)
  if (location.district_name) parts.push(location.district_name)
  if (location.state_region_name) parts.push(location.state_region_name)
  return parts.join(', ')
}

// Create popup content
const createPopupContent = (location: LocationData) => {
  const lat = Number(location.latitude)
  const lng = Number(location.longitude)
  const locationDetails = getLocationDetails(location)
  
  let html = '<div style="min-width: 280px; font-family: system-ui, -apple-system, sans-serif;">'
  
  // Activity Title
  if (location.activity?.title) {
    html += `<div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #1e3a5f; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">${location.activity.title}</div>`
  }
  
  // Location Name
  html += `<div style="font-weight: 600; font-size: 13px; margin-bottom: 8px; color: #2563eb;">📍 ${location.location_name || 'Unnamed Location'}</div>`
  
  // Description
  if (location.description) {
    html += `<div style="font-size: 12px; color: #374151; margin-bottom: 8px; font-style: italic;">${location.description}</div>`
  }
  
  // Location Details
  html += '<div style="font-size: 12px; space-y: 4px;">'
  
  if (location.activity?.organization_name) {
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 90px;">Organization:</span><span style="color: #374151;">${location.activity.organization_name}</span></div>`
  }
  
  if (location.activity?.status) {
    const statusColors: Record<string, string> = {
      active: '#10b981',
      planned: '#3b82f6',
      completed: '#6b7280',
      cancelled: '#ef4444'
    }
    const statusColor = statusColors[location.activity.status.toLowerCase()] || '#6b7280'
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 90px;">Status:</span><span style="color: ${statusColor}; font-weight: 500;">${location.activity.status}</span></div>`
  }
  
  if (formatSiteType(location.site_type)) {
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 90px;">Type:</span><span style="color: #374151;">${formatSiteType(location.site_type)}</span></div>`
  }
  
  if (location.village_name) {
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 90px;">Village:</span><span style="color: #374151;">${location.village_name}</span></div>`
  }
  
  if (location.township_name) {
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 90px;">Township:</span><span style="color: #374151;">${location.township_name}</span></div>`
  }
  
  if (location.district_name) {
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 90px;">District:</span><span style="color: #374151;">${location.district_name}</span></div>`
  }
  
  if (location.state_region_name) {
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 90px;">Region:</span><span style="color: #374151;">${location.state_region_name}</span></div>`
  }
  
  if (location.address || location.city) {
    const addressParts = [location.address, location.city].filter(Boolean).join(', ')
    html += `<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="font-weight: 500; color: #6b7280; min-width: 90px;">Address:</span><span style="color: #374151;">${addressParts}</span></div>`
  }
  
  html += '</div>'
  
  // Coordinates
  html += `<div style="font-size: 11px; color: #6b7280; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
    <div style="display: flex; justify-content: space-between;"><span>Latitude:</span><span style="font-family: monospace;">${lat.toFixed(6)}°</span></div>
    <div style="display: flex; justify-content: space-between;"><span>Longitude:</span><span style="font-family: monospace;">${lng.toFixed(6)}°</span></div>
  </div>`
  
  html += '</div>'
  
  return html
}

// Create tooltip content (shown on hover)
const createTooltipContent = (location: LocationData) => {
  const locationDetails = getLocationDetails(location)
  let html = `<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 300px;">`
  
  // Activity title
  if (location.activity?.title) {
    html += `<div style="font-size: 10px; color: #6b7280; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${location.activity.title}</div>`
  }
  
  // Location name
  html += `<div style="font-weight: 600; font-size: 13px; color: #1e3a5f;">📍 ${location.location_name || 'Unnamed Location'}</div>`
  
  // Location details
  if (locationDetails) {
    html += `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${locationDetails}</div>`
  }
  
  // Organization
  if (location.activity?.organization_name) {
    html += `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Org: ${location.activity.organization_name}</div>`
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

export default function AidMapMarkersLayer({ locations }: AidMapMarkersLayerProps) {
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

    // Add markers using CircleMarker (which positions correctly)
    locations.forEach(location => {
      const lat = Number(location.latitude)
      const lng = Number(location.longitude)
      
      if (isNaN(lat) || isNaN(lng)) return

      // Create a nice-looking circular marker
      const marker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: '#dc2626',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      })

      // Add inner dot for pin effect
      const innerDot = L.circleMarker([lat, lng], {
        radius: 4,
        fillColor: '#ffffff',
        color: '#dc2626',
        weight: 1,
        opacity: 1,
        fillOpacity: 1,
        interactive: false  // Allow clicks to pass through to main marker
      })
      
      // Add tooltip to outer marker
      marker.bindTooltip(createTooltipContent(location), {
        direction: 'top',
        offset: [0, -12],
        opacity: 1,
        permanent: false,
        className: 'location-tooltip'
      })
      
      // Add popup to outer marker
      marker.bindPopup(createPopupContent(location), {
        maxWidth: 350
      })
      
      // Add both to layer group
      layerGroupRef.current!.addLayer(marker)
      layerGroupRef.current!.addLayer(innerDot)
    })

    // Cleanup
    return () => {
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers()
      }
    }
  }, [map, locations])

  return null
}


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

// Build full address string
const getFullAddress = (location: Location): string => {
  const parts = []
  if (location.address) parts.push(location.address)
  if (location.village_name) parts.push(location.village_name)
  if (location.township_name) parts.push(location.township_name)
  if (location.district_name) parts.push(location.district_name)
  if (location.state_region_name) parts.push(location.state_region_name)
  if (location.city) parts.push(location.city)
  return parts.join(', ') || '-'
}

// Build location details string (short version)
const getLocationDetails = (location: Location) => {
  const parts = []
  if (location.village_name) parts.push(location.village_name)
  if (location.township_name) parts.push(location.township_name)
  if (location.district_name) parts.push(location.district_name)
  if (location.state_region_name) parts.push(location.state_region_name)
  return parts.join(', ')
}

// Create tooltip content (Summary View - shown on hover) - Atlas style
const createTooltipContent = (location: Location, activityTitle?: string) => {
  const locationDetails = getLocationDetails(location)
  
  let html = `<div style="font-family: system-ui, -apple-system, sans-serif; width: 280px; padding: 4px;">`
  
  // Location Name - prominent
  html += `<div style="font-weight: 700; font-size: 14px; color: #111827; margin-bottom: 10px; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;">${location.location_name || 'Unnamed Location'}</div>`
  
  // Divider
  html += `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 10px 0;" />`
  
  // Details grid - Atlas style
  html += `<div style="display: grid; grid-template-columns: 75px 1fr; gap: 6px 10px; font-size: 11px; margin-bottom: 8px;">`
  
  // Site Type
  if (formatSiteType(location.site_type)) {
    html += `<div style="color: #6b7280; font-weight: 500;">Site Type</div>
      <div style="color: #111827;">${formatSiteType(location.site_type)}</div>`
  }
  
  // Location details (region, township, etc.)
  if (locationDetails) {
    html += `<div style="color: #6b7280; font-weight: 500;">Location</div>
      <div style="color: #111827;">${locationDetails}</div>`
  }
  
  // Activity Title (if provided)
  if (activityTitle) {
    html += `<div style="color: #6b7280; font-weight: 500;">Activity</div>
      <div style="color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${activityTitle}</div>`
  }
  
  html += `</div>`
  
  html += '</div>'
  return html
}

// Create popup content (Expanded View - shown on click) - Atlas style
const createPopupContent = (location: Location, activityTitle?: string) => {
  const lat = Number(location.latitude)
  const lng = Number(location.longitude)
  
  let html = `<div style="font-family: system-ui, -apple-system, sans-serif; min-width: 300px; max-width: 360px;">`
  
  // Header
  html += `<div style="margin-bottom: 8px;">
    <h1 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0;">Location Details</h1>
  </div>`
  
  // Location Name
  html += `<div style="margin-bottom: 14px;">
    <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0; line-height: 1.35;">${location.location_name || 'Unnamed Location'}</h2>
  </div>`
  
  // Divider
  html += `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 14px 0;" />`
  
  // Description (if available)
  if (location.description || location.location_description) {
    html += `<div style="font-size: 12px; color: #374151; margin-bottom: 14px; font-style: italic; line-height: 1.5;">${location.description || location.location_description}</div>`
  }
  
  // Details Grid - Atlas style
  html += `<div style="display: grid; grid-template-columns: 85px 1fr; gap: 8px 10px; font-size: 11px; margin-bottom: 16px;">`
  
  // Site Type
  html += `<div style="color: #6b7280; font-weight: 500;">Site Type</div>
    <div style="color: #111827;">${formatSiteType(location.site_type) || '-'}</div>`
  
  // Address
  html += `<div style="color: #6b7280; font-weight: 500;">Address</div>
    <div style="color: #111827; line-height: 1.4;">${getFullAddress(location)}</div>`
  
  // Activity (if provided)
  if (activityTitle) {
    html += `<div style="color: #6b7280; font-weight: 500;">Activity</div>
      <div style="color: #111827;">${activityTitle}</div>`
  }
  
  // Coordinates with copy button
  html += `<div style="color: #6b7280; font-weight: 500;">Coordinates</div>
    <div style="display: flex; align-items: center;">
      <span style="font-family: ui-monospace, monospace; font-size: 10px; color: #374151; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${lat.toFixed(6)}°, ${lng.toFixed(6)}°</span>
      <button onclick="event.stopPropagation(); event.preventDefault(); navigator.clipboard.writeText('${lat.toFixed(6)}, ${lng.toFixed(6)}'); this.innerHTML='<span style=\\'font-size:9px;color:#059669;\\'>Copied</span>'; setTimeout(() => this.innerHTML='<svg width=\\'12\\' height=\\'12\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><rect x=\\'9\\' y=\\'9\\' width=\\'13\\' height=\\'13\\' rx=\\'2\\'/><path d=\\'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1\\'/></svg>', 2000);" style="margin-left: 6px; padding: 2px; background: none; border: none; cursor: pointer; color: #9ca3af; display: flex;" title="Copy">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      </button>
    </div>`
  
  html += `</div>`
  
  // Additional Location Details Section
  const hasAdditionalDetails = location.village_name || location.township_name || location.district_name || location.state_region_name
  
  if (hasAdditionalDetails) {
    html += `<div style="margin-bottom: 16px;">
      <h3 style="font-size: 11px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">Administrative Details</h3>
      <div style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; font-size: 11px;">`
    
    if (location.village_name) {
      html += `<div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #f3f4f6;">
        <span style="color: #374151;">Village</span>
        <span style="font-weight: 600; color: #111827;">${location.village_name}</span>
      </div>`
    }
    
    if (location.township_name) {
      html += `<div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #f3f4f6;">
        <span style="color: #374151;">Township</span>
        <span style="font-weight: 600; color: #111827;">${location.township_name}</span>
      </div>`
    }
    
    if (location.district_name) {
      html += `<div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #f3f4f6;">
        <span style="color: #374151;">District</span>
        <span style="font-weight: 600; color: #111827;">${location.district_name}</span>
      </div>`
    }
    
    if (location.state_region_name) {
      html += `<div style="display: flex; justify-content: space-between; padding: 8px 12px; background: rgba(249, 250, 251, 0.5);">
        <span style="color: #374151;">State/Region</span>
        <span style="font-weight: 600; color: #111827;">${location.state_region_name}</span>
      </div>`
    }
    
    html += `</div></div>`
  }
  
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

    // Add markers using CircleMarker - Atlas style with inner dot for pin effect
    locations.forEach(location => {
      const lat = Number(location.latitude)
      const lng = Number(location.longitude)
      
      if (isNaN(lat) || isNaN(lng)) return

      // Collect valid coordinates for bounds
      validCoords.push([lat, lng])

      // Create outer marker - Atlas style
      const marker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: '#dc2626',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      })

      // Add inner dot for pin effect - Atlas style
      const innerDot = L.circleMarker([lat, lng], {
        radius: 4,
        fillColor: '#ffffff',
        color: '#dc2626',
        weight: 1,
        opacity: 1,
        fillOpacity: 1,
        interactive: false  // Allow clicks to pass through to main marker
      })

      // Add tooltip to outer marker (Summary View)
      marker.bindTooltip(createTooltipContent(location, activityTitle), {
        direction: 'top',
        offset: [0, -12],
        opacity: 1,
        permanent: false,
        className: 'location-tooltip'
      })
      
      // Add popup to outer marker (Expanded View)
      marker.bindPopup(createPopupContent(location, activityTitle), {
        maxWidth: 400,
        className: 'location-popup',
        autoPan: false // Disable auto-pan, we'll handle it ourselves
      })
      
      // Pan map so marker is at bottom middle when popup opens - Atlas style
      marker.on('popupopen', () => {
        const mapSize = map.getSize()
        const markerPoint = map.latLngToContainerPoint([lat, lng])
        // Calculate new center: move marker to bottom 25% of map
        const targetY = mapSize.y * 0.75
        const offsetY = markerPoint.y - targetY
        const newCenter = map.containerPointToLatLng([mapSize.x / 2, mapSize.y / 2 + offsetY])
        map.panTo(newCenter, { animate: true, duration: 0.3 })
      })
      
      // Add both markers to layer group
      layerGroupRef.current!.addLayer(marker)
      layerGroupRef.current!.addLayer(innerDot)
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

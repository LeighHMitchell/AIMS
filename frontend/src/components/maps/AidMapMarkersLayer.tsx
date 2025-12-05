'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

interface SectorData {
  code: string
  name: string
  categoryCode?: string
  categoryName?: string
  level?: string
  percentage: number
}

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
    sectors?: SectorData[]
    totalBudget?: number
    totalPlannedDisbursement?: number
    plannedStartDate?: string
    plannedEndDate?: string
    actualStartDate?: string
    actualEndDate?: string
  } | null
}

interface AidMapMarkersLayerProps {
  locations: LocationData[]
}

// Sector color palette matching analytics
const SECTOR_COLORS: { [key: string]: string } = {
  '111': '#1e293b', // Education - slate-800
  '112': '#334155', // Basic Education - slate-700
  '113': '#475569', // Secondary Education - slate-600
  '114': '#64748b', // Post-Secondary Education - slate-500
  '121': '#0f172a', // Health - slate-900
  '122': '#374151', // Basic Health - gray-700
  '123': '#4b5563', // NCDs - gray-600
  '130': '#6b7280', // Population - gray-500
  '140': '#059669', // Water & Sanitation - emerald-600
  '150': '#0891b2', // Government & Civil Society - cyan-600
  '151': '#0e7490', // Government-general - cyan-700
  '152': '#155e75', // Conflict & Peace - cyan-800
  '160': '#7c3aed', // Other Social Infrastructure - violet-600
  '210': '#dc2626', // Transport - red-600
  '220': '#ea580c', // Communications - orange-600
  '230': '#ca8a04', // Energy - yellow-600
  '231': '#a16207', // Energy Policy - yellow-700
  '232': '#84cc16', // Renewable Energy - lime-500
  '233': '#65a30d', // Non-renewable Energy - lime-600
  '240': '#2563eb', // Banking - blue-600
  '250': '#4f46e5', // Business - indigo-600
  '310': '#16a34a', // Agriculture - green-600
  '311': '#15803d', // Agriculture General - green-700
  '312': '#166534', // Forestry - green-800
  '313': '#14532d', // Fishing - green-900
  '320': '#78716c', // Industry - stone-500
  '321': '#57534e', // Industry General - stone-600
  '322': '#44403c', // Mining - stone-700
  '323': '#292524', // Construction - stone-800
  '330': '#be123c', // Trade - rose-700
  '331': '#9f1239', // Trade Policies - rose-800
  '332': '#881337', // Tourism - rose-900
  '410': '#0d9488', // Environment - teal-600
  '430': '#0f766e', // Multisector - teal-700
  '510': '#9333ea', // Budget Support - purple-600
  '520': '#7e22ce', // Food Aid - purple-700
  '530': '#6b21a8', // Commodity Assistance - purple-800
  '600': '#c026d3', // Debt - fuchsia-600
  '720': '#db2777', // Emergency Response - pink-600
  '730': '#be185d', // Reconstruction - pink-700
  '740': '#9d174d', // Disaster Prevention - pink-800
  '910': '#94a3b8', // Admin Costs - slate-400
  '930': '#cbd5e1', // Refugees - slate-300
  '998': '#e2e8f0', // Unallocated - slate-200
}

// Get color for a sector based on its category code
const getSectorColor = (categoryCode?: string): string => {
  if (!categoryCode) return '#64748b'
  // Try exact match first
  if (SECTOR_COLORS[categoryCode]) return SECTOR_COLORS[categoryCode]
  // Try 3-digit prefix
  const prefix = categoryCode.substring(0, 3)
  if (SECTOR_COLORS[prefix]) return SECTOR_COLORS[prefix]
  // Default color
  return '#64748b'
}

// Format site type for display
const formatSiteType = (siteType?: string) => {
  if (!siteType) return null
  return siteType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Format currency
const formatCurrency = (amount?: number): string => {
  if (!amount || amount === 0) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Format number without currency symbol
const formatNumber = (amount?: number): string => {
  if (!amount || amount === 0) return '-'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Format date
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return '-'
  }
}

// Get status display info
const getStatusInfo = (status?: string): { label: string; color: string; bgColor: string } => {
  const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
    '1': { label: 'Pipeline', color: '#6b7280', bgColor: '#f3f4f6' },
    '2': { label: 'Implementation', color: '#059669', bgColor: '#d1fae5' },
    '3': { label: 'Finalisation', color: '#d97706', bgColor: '#fef3c7' },
    '4': { label: 'Closed', color: '#374151', bgColor: '#e5e7eb' },
    '5': { label: 'Cancelled', color: '#dc2626', bgColor: '#fee2e2' },
    '6': { label: 'Suspended', color: '#9333ea', bgColor: '#f3e8ff' },
    'active': { label: 'Active', color: '#059669', bgColor: '#d1fae5' },
    'planned': { label: 'Planned', color: '#3b82f6', bgColor: '#dbeafe' },
    'completed': { label: 'Completed', color: '#374151', bgColor: '#e5e7eb' },
    'cancelled': { label: 'Cancelled', color: '#dc2626', bgColor: '#fee2e2' }
  }
  const key = status?.toLowerCase() || ''
  return statusMap[key] || statusMap[status || ''] || { label: status || 'Unknown', color: '#6b7280', bgColor: '#f3f4f6' }
}

// Build location address string
const getFullAddress = (location: LocationData): string => {
  const parts = []
  if (location.address) parts.push(location.address)
  if (location.village_name) parts.push(location.village_name)
  if (location.township_name) parts.push(location.township_name)
  if (location.district_name) parts.push(location.district_name)
  if (location.state_region_name) parts.push(location.state_region_name)
  if (location.city) parts.push(location.city)
  return parts.join(', ') || '-'
}

// Create sector breakdown bar HTML
const createSectorBar = (sectors?: SectorData[]): string => {
  if (!sectors || sectors.length === 0) return ''
  
  // Normalize percentages to sum to 100
  const totalPercentage = sectors.reduce((sum, s) => sum + (s.percentage || 0), 0)
  const normalizedSectors = sectors.map(s => ({
    ...s,
    normalizedPercentage: totalPercentage > 0 ? ((s.percentage || 0) / totalPercentage) * 100 : 100 / sectors.length
  }))
  
  let barHtml = `<div style="margin-top: 12px;">
    <div style="font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 6px;">Sector Breakdown</div>
    <div style="display: flex; height: 20px; border-radius: 4px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);">`
  
  normalizedSectors.forEach(sector => {
    const color = getSectorColor(sector.categoryCode || sector.code)
    const width = Math.max(sector.normalizedPercentage, 2) // Minimum width for visibility
    const displayName = sector.name || sector.categoryName || `Sector ${sector.code}`
    const percentage = sector.percentage || Math.round(sector.normalizedPercentage)
    
    barHtml += `<div 
      style="width: ${width}%; background-color: ${color}; position: relative; cursor: pointer;"
      title="${displayName}: ${percentage}%"
      onmouseover="this.style.opacity='0.8'" 
      onmouseout="this.style.opacity='1'"
    ></div>`
  })
  
  barHtml += `</div>
    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;">`
  
  // Add legend
  normalizedSectors.slice(0, 4).forEach(sector => {
    const color = getSectorColor(sector.categoryCode || sector.code)
    const displayName = (sector.name || sector.categoryName || `Sector ${sector.code}`).substring(0, 20)
    const percentage = sector.percentage || Math.round(sector.normalizedPercentage)
    
    barHtml += `<div style="display: flex; align-items: center; gap: 4px; font-size: 10px;">
      <div style="width: 8px; height: 8px; border-radius: 2px; background-color: ${color};"></div>
      <span style="color: #6b7280;">${displayName}${displayName.length >= 20 ? '...' : ''} (${percentage}%)</span>
    </div>`
  })
  
  if (normalizedSectors.length > 4) {
    barHtml += `<div style="font-size: 10px; color: #9ca3af;">+${normalizedSectors.length - 4} more</div>`
  }
  
  barHtml += `</div></div>`
  
  return barHtml
}

// Create clean sector breakdown bar (for popup)
const createSectorBarClean = (sectors?: SectorData[]): string => {
  if (!sectors || sectors.length === 0) return ''
  
  // Normalize percentages to sum to 100
  const totalPercentage = sectors.reduce((sum, s) => sum + (s.percentage || 0), 0)
  const normalizedSectors = sectors.map(s => ({
    ...s,
    normalizedPercentage: totalPercentage > 0 ? ((s.percentage || 0) / totalPercentage) * 100 : 100 / sectors.length
  }))
  
  let html = `<div style="margin-bottom: 20px;">
    <h3 style="font-size: 13px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">Sector Breakdown</h3>
    <div style="display: flex; height: 16px; border-radius: 9999px; overflow: hidden; background: #f3f4f6;">`
  
  normalizedSectors.forEach(sector => {
    const color = getSectorColor(sector.categoryCode || sector.code)
    const width = Math.max(sector.normalizedPercentage, 2) // Minimum width for visibility
    
    html += `<div style="width: ${width}%; background-color: ${color}; height: 100%;"></div>`
  })
  
  html += `</div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">`
  
  // Add legend items
  normalizedSectors.slice(0, 4).forEach(sector => {
    const color = getSectorColor(sector.categoryCode || sector.code)
    const displayName = (sector.name || sector.categoryName || `Sector ${sector.code}`).substring(0, 25)
    const percentage = sector.percentage || Math.round(sector.normalizedPercentage)
    
    html += `<div style="display: flex; align-items: center; gap: 6px; font-size: 13px;">
      <div style="width: 12px; height: 12px; border-radius: 2px; background-color: ${color}; flex-shrink: 0;"></div>
      <span style="color: #374151;">${displayName}${displayName.length >= 25 ? '...' : ''} (${percentage}%)</span>
    </div>`
  })
  
  if (normalizedSectors.length > 4) {
    html += `<div style="font-size: 13px; color: #9ca3af;">+${normalizedSectors.length - 4} more</div>`
  }
  
  html += `</div></div>`
  
  return html
}

// Create compact sector breakdown bar (for popup)
const createSectorBarCompact = (sectors?: SectorData[]): string => {
  if (!sectors || sectors.length === 0) return ''
  
  const totalPercentage = sectors.reduce((sum, s) => sum + (s.percentage || 0), 0)
  const normalizedSectors = sectors.map(s => ({
    ...s,
    normalizedPercentage: totalPercentage > 0 ? ((s.percentage || 0) / totalPercentage) * 100 : 100 / sectors.length
  }))
  
  let html = `<div style="margin-bottom: 16px;">
    <h3 style="font-size: 11px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">Sector Breakdown</h3>
    <div style="display: flex; height: 12px; border-radius: 9999px; overflow: hidden; background: #f3f4f6;">`
  
  normalizedSectors.forEach(sector => {
    const color = getSectorColor(sector.categoryCode || sector.code)
    const width = Math.max(sector.normalizedPercentage, 2)
    html += `<div style="width: ${width}%; background-color: ${color}; height: 100%;"></div>`
  })
  
  html += `</div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">`
  
  // Show only first 2 sectors in compact mode
  normalizedSectors.slice(0, 2).forEach(sector => {
    const color = getSectorColor(sector.categoryCode || sector.code)
    const displayName = (sector.name || sector.categoryName || `Sector ${sector.code}`).substring(0, 20)
    const percentage = sector.percentage || Math.round(sector.normalizedPercentage)
    
    html += `<div style="display: flex; align-items: center; gap: 5px; font-size: 10px;">
      <div style="width: 10px; height: 10px; border-radius: 2px; background-color: ${color}; flex-shrink: 0;"></div>
      <span style="color: #374151;">${displayName}${displayName.length >= 20 ? '...' : ''} (${percentage}%)</span>
    </div>`
  })
  
  if (normalizedSectors.length > 2) {
    html += `<span style="font-size: 10px; color: #9ca3af;">+${normalizedSectors.length - 2} more</span>`
  }
  
  html += `</div></div>`
  
  return html
}

// Create Summary View tooltip content (shown on hover)
const createTooltipContent = (location: LocationData): string => {
  const statusInfo = getStatusInfo(location.activity?.status)
  
  let html = `<div style="font-family: system-ui, -apple-system, sans-serif; width: 300px; padding: 4px;">`
  
  // Activity Title - with word wrap
  if (location.activity?.title) {
    html += `<div style="font-weight: 700; font-size: 14px; color: #111827; margin-bottom: 12px; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;">${location.activity.title}</div>`
  }
  
  // Divider
  html += `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 12px 0;" />`
  
  // Details grid - consistent with popup
  html += `<div style="display: grid; grid-template-columns: 85px 1fr; gap: 8px 10px; font-size: 11px; margin-bottom: 12px;">`
  
  // Location
  html += `<div style="color: #6b7280; font-weight: 500;">Location</div>
    <div style="color: #111827;">${location.location_name || 'Unnamed'}</div>`
  
  // Organisation
  if (location.activity?.organization_name) {
    html += `<div style="color: #6b7280; font-weight: 500;">Organisation</div>
      <div style="color: #111827;">${location.activity.organization_name}</div>`
  }
  
  // Status
  html += `<div style="color: #6b7280; font-weight: 500;">Status</div>
    <div style="color: #111827;">${statusInfo.label}</div>`
  
  html += `</div>`
  
  html += '</div>'
  return html
}

// Create Expanded View popup content (shown on click)
const createPopupContent = (location: LocationData): string => {
  const lat = Number(location.latitude)
  const lng = Number(location.longitude)
  const statusInfo = getStatusInfo(location.activity?.status)
  
  let html = `<div style="font-family: system-ui, -apple-system, sans-serif; min-width: 300px; max-width: 360px;">`
  
  // Activity Overview Header
  html += `<div style="margin-bottom: 8px;">
    <h1 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0;">Activity Overview</h1>
  </div>`
  
  // Title Section - Activity Title only
  html += `<div style="margin-bottom: 14px;">
    <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0; line-height: 1.35;">${location.activity?.title || 'Untitled Activity'}</h2>
  </div>`
  
  // Divider
  html += `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 14px 0;" />`
  
  // Details Grid
  html += `<div style="display: grid; grid-template-columns: 85px 1fr; gap: 8px 10px; font-size: 11px; margin-bottom: 16px;">`
  
  // Location Type
  html += `<div style="color: #6b7280; font-weight: 500;">Location Type</div>
    <div style="color: #111827;">${formatSiteType(location.site_type) || location.location_type || '-'}</div>`
  
  // Address
  html += `<div style="color: #6b7280; font-weight: 500;">Address</div>
    <div style="color: #111827; line-height: 1.4;">${getFullAddress(location)}</div>`
  
  // Organisation
  html += `<div style="color: #6b7280; font-weight: 500;">Organisation</div>
    <div style="color: #111827;">${location.activity?.organization_name || '-'}</div>`
  
  // Status
  html += `<div style="color: #6b7280; font-weight: 500;">Status</div>
    <div style="color: #111827;">${statusInfo.label}</div>`
  
  // Coordinates
  html += `<div style="color: #6b7280; font-weight: 500;">Coordinates</div>
    <div style="display: flex; align-items: center;">
      <span style="font-family: ui-monospace, monospace; font-size: 10px; color: #374151; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${lat.toFixed(6)}°, ${lng.toFixed(6)}°</span>
      <button onclick="event.stopPropagation(); event.preventDefault(); navigator.clipboard.writeText('${lat.toFixed(6)}, ${lng.toFixed(6)}'); this.innerHTML='<span style=\\'font-size:9px;color:#059669;\\'>Copied</span>'; setTimeout(() => this.innerHTML='<svg width=\\'12\\' height=\\'12\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><rect x=\\'9\\' y=\\'9\\' width=\\'13\\' height=\\'13\\' rx=\\'2\\'/><path d=\\'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1\\'/></svg>', 2000);" style="margin-left: 6px; padding: 2px; background: none; border: none; cursor: pointer; color: #9ca3af; display: flex;" title="Copy">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      </button>
    </div>`
  
  html += `</div>`
  
  // Sector Breakdown
  html += createSectorBarCompact(location.activity?.sectors)
  
  // Financial Summary
  html += `<div style="margin-bottom: 16px;">
    <h3 style="font-size: 11px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">Financial Summary</h3>
    <div style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; font-size: 11px;">
      <div style="display: flex; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #f3f4f6;">
        <span style="color: #374151;">Total Budgeted</span>
        <span style="font-weight: 700; color: #111827;">${formatNumber(location.activity?.totalBudget)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 12px; background: rgba(249, 250, 251, 0.5);">
        <span style="color: #374151;">Total Planned Disbursements</span>
        <span style="font-weight: 700; color: #111827;">${formatNumber(location.activity?.totalPlannedDisbursement)}</span>
      </div>
    </div>
  </div>`
  
  // Project Timeline
  html += `<div>
    <h3 style="font-size: 11px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">Project Timeline</h3>
    <div style="font-size: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px;">
      <div style="color: #4b5563;">Planned Start: <span style="font-weight: 600; color: #111827;">${formatDate(location.activity?.plannedStartDate)}</span></div>
      <div style="color: #4b5563;">Planned End: <span style="font-weight: 600; color: #111827;">${formatDate(location.activity?.plannedEndDate)}</span></div>
      <div style="color: #4b5563;">Actual Start: <span style="font-weight: 600; color: #111827;">${formatDate(location.activity?.actualStartDate)}</span></div>
      <div style="color: #4b5563;">Actual End: <span style="font-weight: 600; color: #111827;">${location.activity?.actualEndDate ? formatDate(location.activity.actualEndDate) : 'N/A'}</span></div>
    </div>
  </div>`
  
  html += '</div>'
  
  return html
}

// Generate CSV data for export
const generateCSVData = (location: LocationData): string => {
  const rows = [
    ['Field', 'Value'],
    ['Activity ID', location.activity_id || ''],
    ['Activity Title', location.activity?.title || ''],
    ['Location ID', location.id || ''],
    ['Location Name', location.location_name || ''],
    ['Location Type', formatSiteType(location.site_type) || location.location_type || ''],
    ['Description', location.description || ''],
    ['Address', getFullAddress(location)],
    ['Latitude', location.latitude?.toString() || ''],
    ['Longitude', location.longitude?.toString() || ''],
    ['Organisation', location.activity?.organization_name || ''],
    ['Status', getStatusInfo(location.activity?.status).label],
    ['Total Budget (USD)', location.activity?.totalBudget?.toString() || ''],
    ['Total Planned Disbursement (USD)', location.activity?.totalPlannedDisbursement?.toString() || ''],
    ['Planned Start Date', location.activity?.plannedStartDate || ''],
    ['Planned End Date', location.activity?.plannedEndDate || ''],
    ['Actual Start Date', location.activity?.actualStartDate || ''],
    ['Actual End Date', location.activity?.actualEndDate || ''],
    ['State/Region', location.state_region_name || ''],
    ['Township', location.township_name || ''],
    ['District', location.district_name || ''],
    ['Village', location.village_name || ''],
    ['City', location.city || ''],
  ]
  
  // Add sectors
  location.activity?.sectors?.forEach((sector, idx) => {
    rows.push([`Sector ${idx + 1}`, `${sector.code} - ${sector.name} (${sector.percentage || 0}%)`])
  })
  
  return rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n')
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
      
      // Add tooltip to outer marker (Summary View)
      marker.bindTooltip(createTooltipContent(location), {
        direction: 'top',
        offset: [0, -12],
        opacity: 1,
        permanent: false,
        className: 'location-tooltip'
      })
      
      // Add popup to outer marker (Expanded View)
      marker.bindPopup(createPopupContent(location), {
        maxWidth: 450,
        className: 'location-popup',
        autoPan: false // Disable auto-pan, we'll handle it ourselves
      })
      
      // Pan map so marker is at bottom middle when popup opens
      marker.on('popupopen', () => {
        const mapSize = map.getSize()
        const markerPoint = map.latLngToContainerPoint([lat, lng])
        // Calculate new center: move marker to bottom 25% of map
        const targetY = mapSize.y * 0.75
        const offsetY = markerPoint.y - targetY
        const newCenter = map.containerPointToLatLng([mapSize.x / 2, mapSize.y / 2 + offsetY])
        map.panTo(newCenter, { animate: true, duration: 0.3 })
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

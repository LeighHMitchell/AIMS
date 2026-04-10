"use client"

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Download, RotateCcw, CircleDot, Flame, Mountain, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import html2canvas from 'html2canvas'
import { toast } from "sonner"
import type { LocationSchema } from '@/lib/schemas/location'
import { getCountryCoordinates, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/data/country-coordinates'
import { apiFetch } from '@/lib/api-fetch';

// mapcn map components
import { Map, useMap } from '@/components/ui/map'

// Dynamic import for MapLibre-based layers
const ActivityMarkersLayer = dynamic(() => import('../maps-v2/ActivityMarkersLayer'), { ssr: false })
const SimpleActivityMarkersLayer = dynamic(() => import('../maps-v2/SimpleActivityMarkersLayer'), { ssr: false })
const HeatmapLayer = dynamic(() => import('../maps-v2/HeatmapLayer'), { ssr: false })

interface SectorData {
  code: string
  name: string
  categoryCode?: string
  categoryName?: string
  level?: string
  percentage: number
}

interface ActivityData {
  id: string
  title: string
  status?: string
  organization_name?: string
  sectors?: SectorData[]
  totalBudget?: number
  totalPlannedDisbursement?: number
  totalCommitments?: number
  totalDisbursed?: number
  plannedStartDate?: string
  plannedEndDate?: string
  actualStartDate?: string
  actualEndDate?: string
  banner?: string
  icon?: string
}

interface ActivityLocationsHeatmapProps {
  locations: LocationSchema[]
  title?: string
  activityTitle?: string
  activity?: ActivityData
  simpleMarkers?: boolean
}

type ViewMode = 'markers' | 'heatmap'

type MapStyleKey = 'carto_light' | 'carto_voyager' | 'hot' | 'osm_liberty' | 'satellite_imagery'

// HOT (Humanitarian OpenStreetMap Team) raster tile style
const HOT_STYLE = {
  version: 8 as const,
  sources: {
    'hot-osm': {
      type: 'raster' as const,
      tiles: [
        '/api/tiles/hot/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
      maxzoom: 19
    }
  },
  layers: [{
    id: 'hot-osm-layer',
    type: 'raster' as const,
    source: 'hot-osm',
    minzoom: 0,
    maxzoom: 22
  }]
};

// Satellite imagery raster tile style
const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    'esri-satellite': {
      type: 'raster' as const,
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: '© Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxzoom: 19
    }
  },
  layers: [{
    id: 'esri-satellite-layer',
    type: 'raster' as const,
    source: 'esri-satellite',
    minzoom: 0,
    maxzoom: 22
  }]
};

// Map style configurations for MapLibre GL
const MAP_STYLES: Record<MapStyleKey, { name: string; light: string | object; dark: string | object }> = {
  carto_light: {
    name: 'Streets (Light)',
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  carto_voyager: {
    name: 'Voyager',
    light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  hot: {
    name: 'Humanitarian (HOT)',
    light: HOT_STYLE,
    dark: HOT_STYLE,
  },
  osm_liberty: {
    name: 'OpenStreetMap Liberty',
    light: 'https://tiles.openfreemap.org/styles/liberty',
    dark: 'https://tiles.openfreemap.org/styles/liberty',
  },
  satellite_imagery: {
    name: 'Satellite Imagery',
    light: SATELLITE_STYLE,
    dark: SATELLITE_STYLE,
  },
}

const STYLE_PREFERENCE_KEY = 'aims-activity-map-style-preference'

// Map 3D Controller Component (uses useMap inside Map context)
// Renders into an external portal container so controls appear outside the map
function Map3DController({
  homeCountryCenter,
  homeCountryZoom,
  portalContainer,
}: {
  homeCountryCenter: [number, number]
  homeCountryZoom: number
  portalContainer: HTMLElement | null
}) {
  const { map, isLoaded } = useMap()
  const [pitch, setPitch] = useState(0)
  const [bearing, setBearing] = useState(0)

  useEffect(() => {
    if (!map || !isLoaded) return

    const handleMove = () => {
      setPitch(Math.round(map.getPitch()))
      setBearing(Math.round(map.getBearing()))
    }

    map.on('move', handleMove)
    return () => {
      map.off('move', handleMove)
    }
  }, [map, isLoaded])

  const handle3DView = useCallback(() => {
    map?.easeTo({
      pitch: 60,
      bearing: -20,
      duration: 1000,
    })
  }, [map])

  const handle2DView = useCallback(() => {
    map?.easeTo({
      pitch: 0,
      bearing: 0,
      duration: 1000,
    })
  }, [map])

  const handleReset = useCallback(() => {
    if (map) {
      map.flyTo({
        center: [homeCountryCenter[1], homeCountryCenter[0]], // MapLibre uses [lng, lat]
        zoom: homeCountryZoom,
        pitch: 0,
        bearing: 0,
        duration: 1500,
      })
    }
  }, [map, homeCountryCenter, homeCountryZoom])

  const is3DMode = pitch !== 0 || bearing !== 0

  if (!isLoaded || !portalContainer) return null

  return ReactDOM.createPortal(
    <div className="flex items-center gap-1.5">
      {is3DMode ? (
        <Button
          onClick={handle2DView}
          variant="outline"
          size="sm"
          title="2D View"
          className="h-8 px-2.5 text-xs"
        >
          <Mountain className="h-3.5 w-3.5 mr-1" />
          2D
        </Button>
      ) : (
        <Button
          onClick={handle3DView}
          variant="outline"
          size="sm"
          title="3D View"
          className="h-8 px-2.5 text-xs"
        >
          <Mountain className="h-3.5 w-3.5 mr-1" />
          3D
        </Button>
      )}
      <Button
        onClick={handleReset}
        variant="outline"
        size="sm"
        title="Reset view"
        className="h-8 w-8 p-0"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
      {is3DMode && (
        <div className="rounded-md bg-muted px-2 py-1 text-[10px] font-mono flex gap-2">
          <span className="text-muted-foreground">Pitch: {pitch}°</span>
          <span className="text-muted-foreground">Bearing: {bearing}°</span>
        </div>
      )}
    </div>,
    portalContainer
  )
}

// Map Zoom Controller (uses useMap inside Map context, renders into portal)
function MapZoomController({
  portalContainer,
}: {
  portalContainer: HTMLElement | null
}) {
  const { map, isLoaded } = useMap()

  const handleZoomIn = useCallback(() => {
    map?.zoomTo(map.getZoom() + 1, { duration: 300 })
  }, [map])

  const handleZoomOut = useCallback(() => {
    map?.zoomTo(map.getZoom() - 1, { duration: 300 })
  }, [map])

  const handleFullscreen = useCallback(() => {
    const container = map?.getContainer()
    if (!container) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }, [map])

  if (!isLoaded || !portalContainer) return null

  return ReactDOM.createPortal(
    <div className="flex items-center gap-1">
      <Button onClick={handleZoomIn} variant="outline" size="sm" title="Zoom in" className="h-8 w-8 p-0">
        <span className="text-base font-medium">+</span>
      </Button>
      <Button onClick={handleZoomOut} variant="outline" size="sm" title="Zoom out" className="h-8 w-8 p-0">
        <span className="text-base font-medium">−</span>
      </Button>
      <Button onClick={handleFullscreen} variant="outline" size="sm" title="Fullscreen" className="h-8 w-8 p-0">
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
    </div>,
    portalContainer
  )
}

export default function ActivityLocationsHeatmap({
  locations = [],
  title = "Activity Locations Map",
  activityTitle,
  activity,
  simpleMarkers = false
}: ActivityLocationsHeatmapProps) {
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('carto_light')
  const [isExporting, setIsExporting] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('markers')
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const threeDPortalRef = useRef<HTMLDivElement>(null)
  const zoomPortalRef = useRef<HTMLDivElement>(null)
  const [portalsReady, setPortalsReady] = useState(false)

  // Signal that portal containers are mounted so children can render into them
  useEffect(() => {
    setPortalsReady(true)
  }, [])

  // Home country coordinates from system settings
  const [homeCountryCenter, setHomeCountryCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER)
  const [homeCountryZoom, setHomeCountryZoom] = useState<number>(DEFAULT_MAP_ZOOM)

  // Fetch home country from system settings
  useEffect(() => {
    const fetchHomeCountry = async () => {
      try {
        const response = await apiFetch('/api/admin/system-settings')
        if (response.ok) {
          const data = await response.json()
          if (data.homeCountry) {
            const countryCoords = getCountryCoordinates(data.homeCountry)
            setHomeCountryCenter(countryCoords.center)
            setHomeCountryZoom(countryCoords.zoom)
          }
        }
      } catch (error) {
        console.error('Failed to fetch home country setting:', error)
      }
    }
    fetchHomeCountry()
  }, [])

  // Load saved style preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStyle = localStorage.getItem(STYLE_PREFERENCE_KEY) as MapStyleKey
      if (savedStyle && Object.keys(MAP_STYLES).includes(savedStyle)) {
        setMapStyle(savedStyle)
      }
    }
  }, [])

  // Save style preference
  const handleStyleChange = (style: MapStyleKey) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STYLE_PREFERENCE_KEY, style)
      setMapStyle(style)
    }
  }

  // Filter locations with valid coordinates (site locations only)
  const validLocations = useMemo(() => {
    return locations.filter(loc => {
      if (loc.location_type !== 'site') return false
      const lat = Number(loc.latitude)
      const lng = Number(loc.longitude)
      return !isNaN(lat) && !isNaN(lng)
    })
  }, [locations])

  // Prepare heatmap points
  const heatmapPoints = useMemo(() => {
    return validLocations
      .filter(loc => {
        if (loc.location_type !== 'site') return false
        const lat = Number(loc.latitude)
        const lng = Number(loc.longitude)
        return !isNaN(lat) && !isNaN(lng)
      })
      .map(loc => ({
        lat: Number(loc.latitude),
        lng: Number(loc.longitude),
        intensity: 0.8
      }))
  }, [validLocations])

  // Export map to JPEG
  const exportToJPEG = async () => {
    if (!mapContainerRef.current) {
      toast.error('Map not ready for export')
      return
    }

    setIsExporting(true)
    try {
      const canvas = await html2canvas(mapContainerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      })

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.download = `activity-locations-map-${new Date().toISOString().split('T')[0]}.jpg`
          link.href = url
          link.click()
          URL.revokeObjectURL(url)
          toast.success('Map exported successfully')
        } else {
          toast.error('Failed to generate image')
        }
      }, 'image/jpeg', 0.95)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export map')
    } finally {
      setIsExporting(false)
    }
  }

  // Don't show map if no valid locations
  if (validLocations.length === 0) {
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {title}
          <HelpTextTooltip content="Interactive map showing activity locations. Click markers for details. Double-click to zoom. Use the style selector to switch between different map styles. Toggle 3D mode for a tilted perspective." />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Controls toolbar — outside the map */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {/* Map tile style selector */}
          <Select value={mapStyle} onValueChange={(value) => handleStyleChange(value as MapStyleKey)}>
            <SelectTrigger className="w-44 text-xs h-8">
              <SelectValue placeholder="Select map style" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MAP_STYLES).map(([key, style]) => (
                <SelectItem key={key} value={key}>
                  {style.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View mode toggle (markers / heatmap) */}
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
            <Button
              onClick={() => setViewMode('markers')}
              variant="ghost"
              size="sm"
              title="Show markers"
              className={cn(
                "h-7 w-7 p-0",
                viewMode === 'markers'
                  ? "bg-white shadow-sm text-slate-900 hover:bg-white"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <CircleDot className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={() => setViewMode('heatmap')}
              variant="ghost"
              size="sm"
              title="Show heatmap"
              className={cn(
                "h-7 w-7 p-0",
                viewMode === 'heatmap'
                  ? "bg-white shadow-sm text-slate-900 hover:bg-white"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Flame className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Export */}
          <Button
            onClick={exportToJPEG}
            disabled={isExporting}
            variant="outline"
            size="sm"
            title={isExporting ? 'Exporting...' : 'Export JPEG'}
            className="h-8 w-8 p-0"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* 3D / Reset controls portal target */}
          <div ref={threeDPortalRef} className="flex items-center gap-1.5" />

          {/* Zoom / Fullscreen controls portal target */}
          <div ref={zoomPortalRef} className="flex items-center gap-1" />
        </div>

        {/* Map container */}
        <div ref={mapContainerRef} className="relative w-full h-[500px] rounded-lg overflow-hidden border border-gray-200">
          <Map
            styles={{
              light: MAP_STYLES[mapStyle].light as string | object,
              dark: MAP_STYLES[mapStyle].dark as string | object,
            }}
            center={[homeCountryCenter[1], homeCountryCenter[0]]} // MapLibre uses [lng, lat]
            zoom={homeCountryZoom}
            minZoom={2}
            maxZoom={18}
            scrollZoom={false}
          >
            {/* These components use useMap() and render via portals into the toolbar above */}
            <Map3DController
              homeCountryCenter={homeCountryCenter}
              homeCountryZoom={homeCountryZoom}
              portalContainer={threeDPortalRef.current}
            />
            <MapZoomController
              portalContainer={zoomPortalRef.current}
            />

            {/* Markers Mode */}
            {viewMode === 'markers' && validLocations.length > 0 && (
              simpleMarkers ? (
                <SimpleActivityMarkersLayer
                  locations={validLocations}
                  activityTitle={activityTitle}
                />
              ) : (
                <ActivityMarkersLayer
                  locations={validLocations}
                  activity={activity}
                />
              )
            )}

            {/* Heatmap Mode */}
            {viewMode === 'heatmap' && heatmapPoints.length > 0 && (
              <HeatmapLayer points={heatmapPoints} />
            )}
          </Map>
        </div>
      </CardContent>
    </Card>
  )
}

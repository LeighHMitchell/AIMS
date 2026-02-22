"use client"

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Download, RotateCcw, CircleDot, Flame, Map as MapIcon, Mountain } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import html2canvas from 'html2canvas'
import { toast } from "sonner"
import type { LocationSchema } from '@/lib/schemas/location'
import { getCountryCoordinates, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/data/country-coordinates'
import { apiFetch } from '@/lib/api-fetch';

// mapcn map components
import { Map, MapControls, useMap } from '@/components/ui/map'

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
function Map3DController({ 
  homeCountryCenter, 
  homeCountryZoom 
}: { 
  homeCountryCenter: [number, number]
  homeCountryZoom: number
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

  if (!isLoaded) return null

  return (
    <div className="flex items-center gap-1.5">
      {is3DMode ? (
        <Button
          onClick={handle2DView}
          variant="outline"
          size="sm"
          title="2D View"
          className="bg-white shadow-md border-gray-300 h-9 px-2.5"
        >
          <MapIcon className="h-4 w-4 mr-1.5" />
          <span className="text-xs">2D</span>
        </Button>
      ) : (
        <Button
          onClick={handle3DView}
          variant="outline"
          size="sm"
          title="3D View"
          className="bg-white shadow-md border-gray-300 h-9 px-2.5"
        >
          <Mountain className="h-4 w-4 mr-1.5" />
          <span className="text-xs">3D</span>
        </Button>
      )}
      <Button
        onClick={handleReset}
        variant="outline"
        size="sm"
        title="Reset view"
        className="bg-white shadow-md border-gray-300 h-9 w-9 p-0"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      {is3DMode && (
        <div className="rounded-md bg-white/90 backdrop-blur px-2 py-1 text-[10px] font-mono border border-gray-300 shadow-md flex gap-2">
          <span className="text-gray-600">Pitch: {pitch}°</span>
          <span className="text-gray-600">Bearing: {bearing}°</span>
        </div>
      )}
    </div>
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
        <div ref={mapContainerRef} className="relative w-full h-[500px] rounded-lg overflow-hidden border border-gray-200">
          {/* MapLibre Map */}
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
            {/* Controls Bar - positioned above map */}
            <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-2">
              <Select value={mapStyle} onValueChange={(value) => handleStyleChange(value as MapStyleKey)}>
                <SelectTrigger className="w-48 bg-white shadow-md border-gray-300 text-xs h-9">
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

              <Button
                onClick={exportToJPEG}
                disabled={isExporting}
                variant="outline"
                size="sm"
                title={isExporting ? 'Exporting...' : 'Export JPEG'}
                className="bg-white shadow-md border-gray-300 h-9 w-9 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* View Mode Toggle */}
              <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-1">
                <Button
                  onClick={() => setViewMode('markers')}
                  variant="ghost"
                  size="sm"
                  title="Show markers"
                  className={cn(
                    "h-9 w-9 p-0",
                    viewMode === 'markers'
                      ? "bg-white shadow-sm text-slate-900 hover:bg-white"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <CircleDot className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setViewMode('heatmap')}
                  variant="ghost"
                  size="sm"
                  title="Show heatmap"
                  className={cn(
                    "h-9 w-9 p-0",
                    viewMode === 'heatmap'
                      ? "bg-white shadow-sm text-slate-900 hover:bg-white"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Flame className="h-4 w-4" />
                </Button>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* 3D Controls */}
              <Map3DController 
                homeCountryCenter={homeCountryCenter} 
                homeCountryZoom={homeCountryZoom} 
              />
            </div>

            {/* Map Controls (zoom, compass, etc.) */}
            <MapControls 
              position="bottom-right" 
              showZoom={true} 
              showCompass={true}
              showLocate={true}
              showFullscreen={true}
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

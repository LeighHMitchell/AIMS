"use client"

import React, { useState, useMemo, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Download, RotateCcw, CircleDot, Flame } from 'lucide-react'
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import html2canvas from 'html2canvas'
import { toast } from "sonner"
import type { LocationSchema } from '@/lib/schemas/location'

// Dynamically import the Leaflet map component (client-side only)
const ActivityLocationsMapView = dynamic(() => import('./ActivityLocationsMapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center bg-muted text-sm text-muted-foreground">
      Loading map...
    </div>
  ),
})

interface Location {
  id?: string
  location_name?: string
  latitude?: number
  longitude?: number
  site_type?: string
  [key: string]: any
}

interface ActivityLocationsHeatmapProps {
  locations: Location[]
  title?: string
  activityTitle?: string
}

type ViewMode = 'markers' | 'heatmap'

type MapLayerKey = 'cartodb_voyager' | 'osm_standard' | 'osm_humanitarian' | 'cyclosm' | 'opentopo' | 'satellite_esri'

interface MapLayerConfig {
  name: string
  url: string
  attribution: string
  category: string
}

const MAP_LAYERS: Record<MapLayerKey, MapLayerConfig> = {
  cartodb_voyager: {
    name: 'Streets (CartoDB Voyager)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors, © CARTO',
    category: 'Streets'
  },
  osm_standard: {
    name: 'OpenStreetMap Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    category: 'Streets'
  },
  osm_humanitarian: {
    name: 'Humanitarian (HOT)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © HOT',
    category: 'Humanitarian'
  },
  cyclosm: {
    name: 'CyclOSM Transport',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © CyclOSM',
    category: 'Transport'
  },
  opentopo: {
    name: 'OpenTopo Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © OpenTopoMap',
    category: 'Terrain'
  },
  satellite_esri: {
    name: 'ESRI Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    category: 'Satellite'
  }
}

const LAYER_PREFERENCE_KEY = 'aims-activity-map-layer-preference'
const DEFAULT_CENTER: [number, number] = [21.9162, 95.9560] // Myanmar center
const DEFAULT_ZOOM = 6

export default function ActivityLocationsHeatmap({ 
  locations = [],
  title = "Activity Locations Map",
  activityTitle
}: ActivityLocationsHeatmapProps) {
  const [currentLayer, setCurrentLayer] = useState<MapLayerKey>('cartodb_voyager')
  const [isExporting, setIsExporting] = useState(false)
  const [mapKey, setMapKey] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('markers')
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Reset map to Myanmar view
  const handleResetView = () => {
    setMapKey(prev => prev + 1)
  }

  // Load saved layer preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLayer = localStorage.getItem(LAYER_PREFERENCE_KEY) as MapLayerKey
      if (savedLayer && Object.keys(MAP_LAYERS).includes(savedLayer)) {
        setCurrentLayer(savedLayer)
      } else {
        // Default to CartoDB Voyager if no saved preference
        setCurrentLayer('cartodb_voyager')
      }
    }
  }, [])

  // Save layer preference
  const handleLayerChange = (layer: MapLayerKey) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAYER_PREFERENCE_KEY, layer)
      setCurrentLayer(layer)
    }
  }

  // Filter locations with valid coordinates
  const validLocations = useMemo(() => {
    return locations.filter(loc => 
      loc.latitude != null && 
      loc.longitude != null &&
      !isNaN(Number(loc.latitude)) &&
      !isNaN(Number(loc.longitude))
    )
  }, [locations])

  // Always use Myanmar as default view
  const mapCenter = DEFAULT_CENTER
  const mapZoom = DEFAULT_ZOOM

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
          <HelpTextTooltip content="Interactive map showing activity locations. Click markers for details. Use the layer selector to switch between different map styles." />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div ref={mapContainerRef} className="relative w-full h-[500px] rounded-lg overflow-hidden border border-gray-200">
          {/* Map Controls Overlay */}
          <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
            <Select value={currentLayer} onValueChange={(value) => handleLayerChange(value as MapLayerKey)}>
              <SelectTrigger className="w-48 bg-white shadow-md border-gray-300">
                <SelectValue placeholder="Select map type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MAP_LAYERS).map(([key, layer]) => (
                  <SelectItem key={key} value={key}>
                    {layer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleResetView}
              variant="outline"
              size="sm"
              title="Reset to Myanmar view"
              className="bg-white shadow-md border-gray-300"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button
              onClick={exportToJPEG}
              disabled={isExporting}
              variant="outline"
              size="sm"
              title={isExporting ? 'Exporting...' : 'Export JPEG'}
              className="bg-white shadow-md border-gray-300"
            >
              <Download className="h-4 w-4" />
            </Button>

            {/* View Mode Toggle */}
            <div className="flex bg-white rounded-md shadow-md border border-gray-300 overflow-hidden">
              <Button
                onClick={() => setViewMode('markers')}
                variant="ghost"
                size="sm"
                title="Show markers"
                className={`rounded-none border-0 ${viewMode === 'markers' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
              >
                <CircleDot className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setViewMode('heatmap')}
                variant="ghost"
                size="sm"
                title="Show heatmap"
                className={`rounded-none border-0 border-l border-gray-300 ${viewMode === 'heatmap' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100'}`}
              >
                <Flame className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ActivityLocationsMapView
            key={`${mapKey}-${viewMode}`}
            locations={validLocations}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            currentLayer={currentLayer}
            layerUrl={MAP_LAYERS[currentLayer].url}
            layerAttribution={MAP_LAYERS[currentLayer].attribution}
            viewMode={viewMode}
            activityTitle={activityTitle}
          />
        </div>
      </CardContent>
    </Card>
  )
}


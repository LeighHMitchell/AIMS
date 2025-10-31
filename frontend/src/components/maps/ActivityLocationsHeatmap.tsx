"use client"

import React, { useState, useMemo, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Download, Layers } from 'lucide-react'
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import html2canvas from 'html2canvas'
import { toast } from "sonner"
import type { LocationSchema } from '@/lib/schemas/location'

// Dynamically import the Google Maps component (client-side only)
const ActivityLocationsGoogleMap = dynamic(() => import('./ActivityLocationsGoogleMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center bg-muted text-sm text-muted-foreground">
      Loading Google Maps...
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
}

type MapLayerKey = 'osm_standard' | 'osm_humanitarian' | 'cyclosm' | 'opentopo' | 'satellite_esri'

interface MapLayerConfig {
  name: string
  url: string
  attribution: string
  category: string
}

const MAP_LAYERS: Record<MapLayerKey, MapLayerConfig> = {
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
  title = "Activity Locations Map"
}: ActivityLocationsHeatmapProps) {
  const [currentLayer, setCurrentLayer] = useState<MapLayerKey>('osm_standard')
  const [isExporting, setIsExporting] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Load saved layer preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLayer = localStorage.getItem(LAYER_PREFERENCE_KEY) as MapLayerKey
      if (savedLayer && Object.keys(MAP_LAYERS).includes(savedLayer)) {
        setCurrentLayer(savedLayer)
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

  // Calculate map center and bounds
  const { mapCenter, mapZoom } = useMemo(() => {
    if (validLocations.length === 0) {
      return { mapCenter: DEFAULT_CENTER, mapZoom: DEFAULT_ZOOM }
    }

    if (validLocations.length === 1) {
      return {
        mapCenter: [Number(validLocations[0].latitude), Number(validLocations[0].longitude)] as [number, number],
        mapZoom: 12
      }
    }

    // Calculate center from all locations
    const latSum = validLocations.reduce((sum, loc) => sum + Number(loc.latitude), 0)
    const lngSum = validLocations.reduce((sum, loc) => sum + Number(loc.longitude), 0)
    
    return {
      mapCenter: [latSum / validLocations.length, lngSum / validLocations.length] as [number, number],
      mapZoom: 7
    }
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
            <HelpTextTooltip content="Google Maps showing activity locations with subnational heatmap. Regions are colored based on activity density. Click markers for details. Use map type selector for satellite/terrain views." />
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {validLocations.length} {validLocations.length === 1 ? 'location' : 'locations'}
            </span>
            
            <span className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded border border-green-200">
              📍 Using Google Maps
            </span>

            <Button
              onClick={exportToJPEG}
              disabled={isExporting}
              variant="outline"
              size="sm"
              title={isExporting ? 'Exporting...' : 'Export JPEG'}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div ref={mapContainerRef} className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-200">
          <ActivityLocationsGoogleMap
            locations={validLocations}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
          />
        </div>
        
        {/* Map Legend */}
        <div className="mt-4 space-y-3">
          {/* Visual Elements Guide */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs font-semibold text-blue-900 mb-2">Map Shows:</div>
            <div className="flex items-center gap-4 flex-wrap text-xs text-blue-800">
              <div className="flex items-center gap-2">
                <div className="relative w-6 h-8">
                  <div style={{
                    width: '20px',
                    height: '20px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: '2px solid white',
                    borderRadius: '50% 50% 50% 0',
                    transform: 'rotate(-45deg)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    position: 'absolute',
                    left: '3px',
                    top: '2px'
                  }}></div>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    background: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    left: '9px',
                    top: '7px',
                    zIndex: 1
                  }}></div>
                </div>
                <span className="font-medium">{validLocations.length} Red Pins on Map (Individual Locations)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.6)' }}></div>
                <span className="font-medium">Colored Regions = Subnational Density</span>
              </div>
            </div>
          </div>
          
          {/* Choropleth Legend */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs font-semibold text-gray-700 mb-2">Regional Activity Density (Choropleth)</div>
            <div className="flex items-center gap-4 flex-wrap text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(226, 232, 240, 0.5)' }}></div>
                <span>0 locations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(96, 165, 250, 0.6)' }}></div>
                <span>1-2 locations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(251, 146, 60, 0.65)' }}></div>
                <span>3-4 locations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.7)' }}></div>
                <span>5-6 locations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(185, 28, 28, 0.75)' }}></div>
                <span>7+ locations</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


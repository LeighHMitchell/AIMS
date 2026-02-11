'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { MapPin, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCountryCoordinates, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/data/country-coordinates'
import dynamic from 'next/dynamic'
import { Map, MapControls, MapMarker, MarkerContent, useMap } from '@/components/ui/map'

const MapFlyTo = dynamic(() => import('@/components/maps-v2/MapFlyTo'), { ssr: false })

const MAP_STYLES = {
  carto_light: {
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
}

interface GeoLocation {
  countryCode: string
  countryName: string
  lat: number | null
  lng: number | null
  value: number
  commitments: number
  disbursements: number
  activityCount: number
}

interface SDGGeographyMapProps {
  locations: GeoLocation[]
  sdgColor: string
}

function MapResetController({
  homeCenter,
  homeZoom,
}: {
  homeCenter: [number, number]
  homeZoom: number
}) {
  const { map, isLoaded } = useMap()

  const handleReset = useCallback(() => {
    if (map) {
      map.flyTo({
        center: [homeCenter[1], homeCenter[0]],
        zoom: homeZoom,
        pitch: 0,
        bearing: 0,
        duration: 1500,
      })
    }
  }, [map, homeCenter, homeZoom])

  if (!isLoaded) return null

  return (
    <Button
      onClick={handleReset}
      variant="outline"
      size="sm"
      title="Reset view"
      className="bg-white shadow-md border-gray-300 h-9 w-9 p-0"
    >
      <RotateCcw className="h-4 w-4" />
    </Button>
  )
}

export function SDGGeographyMap({ locations, sdgColor }: SDGGeographyMapProps) {
  const [homeCenter, setHomeCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER)
  const [homeZoom, setHomeZoom] = useState<number>(DEFAULT_MAP_ZOOM)
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null)

  useEffect(() => {
    const fetchHomeCountry = async () => {
      try {
        const response = await apiFetch('/api/admin/system-settings')
        if (response.ok) {
          const data = await response.json()
          if (data.homeCountry) {
            const countryCoords = getCountryCoordinates(data.homeCountry)
            setHomeCenter(countryCoords.center)
            setHomeZoom(countryCoords.zoom)
          }
        }
      } catch (error) {
        console.error('Failed to fetch home country setting:', error)
      }
    }
    fetchHomeCountry()
  }, [])

  const validLocations = locations.filter(l => l.lat !== null && l.lng !== null)

  // Compute max value for proportional sizing
  const maxValue = Math.max(...validLocations.map(l => l.value), 1)

  useEffect(() => {
    if (validLocations.length > 0) {
      const sumLat = validLocations.reduce((sum, l) => sum + (l.lat || 0), 0)
      const sumLng = validLocations.reduce((sum, l) => sum + (l.lng || 0), 0)
      setTimeout(() => {
        setFlyToTarget({
          lat: sumLat / validLocations.length,
          lng: sumLng / validLocations.length,
          zoom: 4,
        })
      }, 500)
    }
  }, [validLocations.length])

  if (validLocations.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="font-medium text-slate-600">No geographic data</p>
          <p className="text-sm text-slate-500">No countries with funding data found for this SDG</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[400px] w-full relative rounded-lg overflow-hidden border border-gray-200">
      <div className="absolute top-3 left-3 z-20">
        <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-md border border-gray-300 shadow-md">
          <span className="text-xs font-medium text-gray-700">
            {validLocations.length} countr{validLocations.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
      </div>

      <Map
        styles={{
          light: MAP_STYLES.carto_light.light,
          dark: MAP_STYLES.carto_light.dark,
        }}
        center={[homeCenter[1], homeCenter[0]]}
        zoom={homeZoom}
        minZoom={2}
        maxZoom={18}
        scrollZoom={false}
      >
        <div className="absolute top-3 right-3 z-20">
          <MapResetController homeCenter={homeCenter} homeZoom={homeZoom} />
        </div>

        <MapControls
          position="bottom-right"
          showZoom={true}
          showCompass={true}
          showLocate={false}
          showFullscreen={true}
        />

        {/* Country Circles */}
        {validLocations.map(loc => {
          const sizeRatio = Math.max(loc.value / maxValue, 0.15)
          const radius = 8 + sizeRatio * 24 // 8px min, 32px max
          const opacity = 0.4 + sizeRatio * 0.4

          return (
            <MapMarker
              key={loc.countryCode}
              latitude={loc.lat!}
              longitude={loc.lng!}
            >
              <MarkerContent>
                <div
                  className="rounded-full border-2 flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                  style={{
                    width: `${radius * 2}px`,
                    height: `${radius * 2}px`,
                    backgroundColor: `${sdgColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
                    borderColor: sdgColor,
                  }}
                  title={`${loc.countryName}: ${loc.activityCount} activities`}
                >
                  {radius > 14 && (
                    <span className="text-[9px] font-bold text-white">{loc.countryCode}</span>
                  )}
                </div>
              </MarkerContent>
            </MapMarker>
          )
        })}

        <MapFlyTo
          target={flyToTarget}
          onComplete={() => setFlyToTarget(null)}
        />
      </Map>
    </div>
  )
}

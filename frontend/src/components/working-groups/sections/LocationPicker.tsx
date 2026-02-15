"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, X, Loader2 } from 'lucide-react'
import { Map, MapMarker, MarkerContent, MapControls } from '@/components/ui/map'
import type { MapRef } from '@/components/ui/map'

// Default center: Myanmar (Naypyidaw)
const DEFAULT_CENTER: [number, number] = [96.0785, 19.7633] // [lng, lat]
const DEFAULT_ZOOM = 6

interface LocationPickerProps {
  location: string
  setLocation: (val: string) => void
  latitude: number | null
  longitude: number | null
  setLatitude: (val: number | null) => void
  setLongitude: (val: number | null) => void
}

interface GeoSearchResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

export default function LocationPicker({
  location,
  setLocation,
  latitude,
  longitude,
  setLatitude,
  setLongitude,
}: LocationPickerProps) {
  const [searchResults, setSearchResults] = useState<GeoSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapRef>(null)

  // Forward geocode: search location text
  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      setShowResults(false)
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data)
        setShowResults(data.length > 0)
      }
    } catch {
      // Silently fail geocoding
    } finally {
      setSearching(false)
    }
  }, [])

  const handleLocationChange = (val: string) => {
    setLocation(val)
    // Debounced search
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => handleSearch(val), 500)
  }

  const selectResult = (result: GeoSearchResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    setLocation(result.display_name)
    setLatitude(lat)
    setLongitude(lng)
    setShowResults(false)
    setSearchResults([])
    // Fly to selected location
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 14 })
    }
  }

  // Reverse geocode: when pin is dropped
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`)
      if (res.ok) {
        const data = await res.json()
        if (data.display_name) {
          setLocation(data.display_name)
        }
      }
    } catch {
      // Keep existing location text if reverse geocode fails
    }
  }, [setLocation])

  const handleMarkerDragEnd = useCallback((lngLat: { lng: number; lat: number }) => {
    setLatitude(lngLat.lat)
    setLongitude(lngLat.lng)
    reverseGeocode(lngLat.lat, lngLat.lng)
  }, [setLatitude, setLongitude, reverseGeocode])

  // Attach click handler to map instance
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const handleClick = (e: any) => {
      const { lng, lat } = e.lngLat
      setLatitude(lat)
      setLongitude(lng)
      reverseGeocode(lat, lng)
    }

    map.on('click', handleClick)
    return () => {
      map.off('click', handleClick)
    }
  }, [mapRef.current, setLatitude, setLongitude, reverseGeocode])

  const clearPin = () => {
    setLatitude(null)
    setLongitude(null)
  }

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const center: [number, number] = (latitude !== null && longitude !== null)
    ? [longitude, latitude]
    : DEFAULT_CENTER
  const zoom = (latitude !== null && longitude !== null) ? 14 : DEFAULT_ZOOM

  return (
    <div className="space-y-2">
      <Label>Location</Label>
      {/* Location text input with search */}
      <div className="relative" ref={resultsRef}>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={location}
            onChange={(e) => handleLocationChange(e.target.value)}
            placeholder="Search for a location or enter address..."
            className="pl-9 pr-9"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
          )}
        </div>
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0"
                onClick={() => selectResult(result)}
              >
                <span className="line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Coordinates display */}
      {latitude !== null && longitude !== null && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="h-3 w-3" />
          <span>{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
          <button
            type="button"
            onClick={clearPin}
            className="text-gray-400 hover:text-red-500 transition-colors ml-1"
            title="Remove pin"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Map */}
      <div className="h-[200px] rounded-lg overflow-hidden border">
        <Map
          ref={mapRef as any}
          center={center}
          zoom={zoom}
        >
          <MapControls position="top-right" showZoom showCompass={false} />
          {latitude !== null && longitude !== null && (
            <MapMarker
              longitude={longitude}
              latitude={latitude}
              draggable
              onDragEnd={handleMarkerDragEnd}
            >
              <MarkerContent>
                <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-lg">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
              </MarkerContent>
            </MapMarker>
          )}
        </Map>
      </div>
      <p className="text-xs text-gray-400">Click the map or drag the pin to set a precise location</p>
    </div>
  )
}

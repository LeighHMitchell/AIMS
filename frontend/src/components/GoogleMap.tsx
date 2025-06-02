"use client"
import React, { useEffect, useRef, useState } from "react"

export type Location = {
  lat: number
  lng: number
}

interface GoogleMapProps {
  locations: Location[]
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>
  center?: Location
  zoom?: number
}

export const GoogleMap: React.FC<GoogleMapProps> = ({
  locations,
  setLocations,
  center = { lat: 13.41, lng: 103.86 },
  zoom = 6,
}) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [markers, setMarkers] = useState<google.maps.Marker[]>([])

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return

    const initMap = async () => {
      // Type assertion to handle the importLibrary method
      const { Map } = await (google.maps as any).importLibrary("maps") as google.maps.MapsLibrary
      const newMap = new Map(mapRef.current!, {
        center,
        zoom,
        mapId: "map",
      })

      // Add click listener to map
      newMap.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          setLocations(prev => [...prev, { lat: e.latLng!.lat(), lng: e.latLng!.lng() }])
        }
      })

      setMap(newMap)
    }

    initMap()
  }, [center, zoom])

  // Update markers when locations change
  useEffect(() => {
    if (!map) return

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null))
    const newMarkers: google.maps.Marker[] = []

    // Add new markers
    locations.forEach(location => {
      const marker = new google.maps.Marker({
        position: location,
        map,
        draggable: true,
      })

      // Add click listener to remove marker
      marker.addListener("click", () => {
        setLocations(prev => prev.filter(loc => 
          loc.lat !== location.lat || loc.lng !== location.lng
        ))
      })

      newMarkers.push(marker)
    })

    setMarkers(newMarkers)
  }, [locations, map])

  return (
    <div className="h-96 w-full rounded-md overflow-hidden border">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
} 
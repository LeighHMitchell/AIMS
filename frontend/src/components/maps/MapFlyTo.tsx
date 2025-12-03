'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

interface MapFlyToProps {
  target: { lat: number; lng: number; zoom: number } | null
  onComplete?: () => void
}

export default function MapFlyTo({ target, onComplete }: MapFlyToProps) {
  const map = useMap()

  useEffect(() => {
    if (target && map) {
      console.log('[MapFlyTo] Flying to:', target)
      map.flyTo([target.lat, target.lng], target.zoom, {
        duration: 1.5,
        easeLinearity: 0.25
      })
      
      // Call onComplete after animation
      if (onComplete) {
        setTimeout(onComplete, 1600)
      }
    }
  }, [target, map, onComplete])

  return null
}



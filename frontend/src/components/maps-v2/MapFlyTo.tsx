'use client';

import { useEffect, useRef } from 'react';
import { useMap } from '@/components/ui/map';

interface MapFlyToProps {
  target: { lat: number; lng: number; zoom: number } | null;
  onComplete?: () => void;
  duration?: number;
}

export default function MapFlyTo({ target, onComplete, duration = 1500 }: MapFlyToProps) {
  const { map, isLoaded } = useMap();
  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !map || !target) return;

    // Create a unique key for this target to prevent duplicate flyTo calls
    const targetKey = `${target.lat}-${target.lng}-${target.zoom}`;
    
    // Skip if we've already flown to this exact target
    if (lastTargetRef.current === targetKey) return;
    
    lastTargetRef.current = targetKey;

    console.log('[MapFlyTo] Flying to:', target);

    // Use MapLibre's flyTo method
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: target.zoom,
      duration: duration,
      essential: true, // This animation is essential for the user experience
    });

    // Call onComplete after the animation finishes
    if (onComplete) {
      const timeoutId = setTimeout(() => {
        onComplete();
        lastTargetRef.current = null; // Reset to allow flying to same location again if needed
      }, duration + 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isLoaded, map, target, onComplete, duration]);

  return null;
}

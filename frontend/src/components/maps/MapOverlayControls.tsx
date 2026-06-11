'use client';

import React, { useEffect, useState } from 'react';
import { useMap } from '@/components/ui/map';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { Plus, Minus, RotateCw, RotateCcw, Box, Compass } from 'lucide-react';

// Bridge component to expose the underlying map instance from the Map context to the parent.
export function MapBridge({ onMap }: { onMap: (map: MapLibreMap | null) => void }) {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    onMap(isLoaded ? (map as unknown as MapLibreMap) : null);
  }, [map, isLoaded, onMap]);
  return null;
}

// Custom overlay buttons for zoom, rotate, tilt, and reset.
// Uses only the public map API to stay portable across mapbox-gl / maplibre-gl.
export function MapZoomRotateOverlay({ map }: { map: MapLibreMap | null }) {
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);

  useEffect(() => {
    if (!map) return;
    try {
      map.dragRotate?.enable();
      map.touchZoomRotate?.enable();
      map.touchZoomRotate?.enableRotation?.();
      (map as any).touchPitch?.enable?.();
      map.keyboard?.enable();
    } catch {
      // Ignore — handlers may not exist on minimal builds
    }

    const sync = () => {
      setBearing(map.getBearing());
      setPitch(map.getPitch());
    };
    sync();
    map.on('rotate', sync);
    map.on('pitch', sync);
    return () => {
      map.off('rotate', sync);
      map.off('pitch', sync);
    };
  }, [map]);

  if (!map) return null;

  const zoomIn = () => map.zoomIn({ duration: 200 });
  const zoomOut = () => map.zoomOut({ duration: 200 });
  const rotateBy = (delta: number) =>
    map.easeTo({ bearing: map.getBearing() + delta, duration: 300 });
  const togglePitch = () =>
    map.easeTo({ pitch: pitch > 5 ? 0 : 60, duration: 400 });
  const resetView = () =>
    map.easeTo({ bearing: 0, pitch: 0, duration: 400 });

  const btn =
    'h-11 w-11 flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-40';

  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
      {/* Zoom */}
      <div className="flex flex-col rounded-md border border-border bg-white shadow-md overflow-hidden">
        <button type="button" onClick={zoomIn} aria-label="Zoom in" title="Zoom in" className={btn}>
          <Plus className="h-5 w-5" />
        </button>
        <div className="h-px bg-border" />
        <button type="button" onClick={zoomOut} aria-label="Zoom out" title="Zoom out" className={btn}>
          <Minus className="h-5 w-5" />
        </button>
      </div>

      {/* Rotate */}
      <div className="flex flex-col rounded-md border border-border bg-white shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => rotateBy(-45)}
          aria-label="Rotate left 45°"
          title="Rotate left 45°"
          className={btn}
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        <div className="h-px bg-border" />
        <button
          type="button"
          onClick={() => rotateBy(45)}
          aria-label="Rotate right 45°"
          title="Rotate right 45°"
          className={btn}
        >
          <RotateCw className="h-5 w-5" />
        </button>
      </div>

      {/* Tilt (3D / 2D) */}
      <button
        type="button"
        onClick={togglePitch}
        aria-label={pitch > 5 ? 'Switch to 2D' : 'Tilt to 3D'}
        title={pitch > 5 ? 'Switch to 2D view' : 'Tilt to 3D view'}
        className={`h-11 w-11 flex items-center justify-center rounded-md border border-border bg-white text-foreground shadow-md hover:bg-muted transition-colors ${
          pitch > 5 ? 'bg-muted' : ''
        }`}
      >
        <Box className="h-5 w-5" />
      </button>

      {/* Compass — click to reset to north & flat */}
      <button
        type="button"
        onClick={resetView}
        aria-label="Reset to north (level)"
        title="Reset bearing & pitch"
        className="h-11 w-11 flex items-center justify-center rounded-md border border-border bg-white text-foreground shadow-md hover:bg-muted transition-colors"
      >
        <Compass
          className="h-5 w-5 transition-transform"
          style={{ transform: `rotate(${-bearing}deg)` }}
        />
      </button>
    </div>
  );
}

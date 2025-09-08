"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { MapPin, RotateCcw } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import for map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
);

// Import Leaflet dynamically
let L: any = null;
let useMapEvents: any = null;

  // Load Leaflet on client side only
const loadLeaflet = () => {
  if (typeof window !== 'undefined' && !L) {
    try {
      L = require('leaflet');
      useMapEvents = require('react-leaflet').useMapEvents;
      require('leaflet/dist/leaflet.css');
      
      // Add custom tooltip styles
      const style = document.createElement('style');
      style.textContent = `
        .custom-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .custom-tooltip .leaflet-tooltip-content {
          margin: 0 !important;
          padding: 0 !important;
        }
      `;
      document.head.appendChild(style);
    } catch (error) {
      console.error('Failed to load Leaflet:', error);
    }
  }
};

interface MyanmarAdminMapProps {
  /** Breakdown data: region name -> percentage */
  breakdowns: Record<string, number>;
  /** Whether to show the map */
  visible?: boolean;
  /** Callback when a region is clicked */
  onRegionClick?: (regionName: string) => void;
}

// Component to handle map reset
function MapReset({ shouldReset, onResetComplete }: { shouldReset: boolean; onResetComplete: () => void }) {
  // Early return if not available - before any hook calls
  if (!useMapEvents || typeof window === 'undefined') {
    return null;
  }
  
  // Now we can safely call hooks
  const map = useMapEvents({});

  useEffect(() => {
    if (!map || !shouldReset) return;
    
    console.log('Resetting map view to Myanmar');
    map.setView([21.0, 96.0], 5.5);
    onResetComplete();
  }, [map, shouldReset, onResetComplete]);
  
  return null;
}

export default function MyanmarAdminMap({ 
  breakdowns, 
  visible = true, 
  onRegionClick 
}: MyanmarAdminMapProps) {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [shouldResetMap, setShouldResetMap] = useState(false);
  const mapRef = useRef<any>(null);

  // Debug: Log breakdowns data
  console.log('[MyanmarAdminMap] Received breakdowns:', breakdowns);
  console.log('[MyanmarAdminMap] Breakdowns keys:', Object.keys(breakdowns || {}));
  console.log('[MyanmarAdminMap] Visible:', visible);

  // Load Leaflet and GeoJSON data
  useEffect(() => {
    loadLeaflet();
    
    // Load Myanmar GeoJSON data
    fetch('/Myanmar.geojson')
      .then(response => response.json())
      .then(data => {
        console.log('Loaded Myanmar GeoJSON:', data);
        setGeoJsonData(data);
        setIsMapLoaded(true);
      })
      .catch(error => {
        console.error('Failed to load Myanmar GeoJSON:', error);
      });
  }, []);

  // Function to get color based on percentage (slate/dark blue theme)
  const getColor = (percentage: number): string => {
    if (percentage === 0) return '#f1f5f9';  // Light slate-50 for 0%
    if (percentage <= 10) return '#e2e8f0';  // slate-200 - Very light slate
    if (percentage <= 20) return '#cbd5e1';  // slate-300 - Light slate
    if (percentage <= 30) return '#94a3b8';  // slate-400 - Medium slate
    if (percentage <= 40) return '#64748b';  // slate-500 - Slate
    if (percentage <= 50) return '#475569';  // slate-600 - Dark slate
    if (percentage <= 60) return '#334155';  // slate-700 - Darker slate
    if (percentage <= 80) return '#1e293b';  // slate-800 - Very dark slate
    return '#0f172a';                        // slate-900 - Darkest slate for >80%
  };

  // Function to map GeoJSON region names to our full region names
  const mapGeoJsonToFullName = (geoJsonName: string): string => {
    // Map from GeoJSON names (without suffixes) to full names (with Region/State/Union Territory)
    const nameMapping: Record<string, string> = {
      'Ayeyarwady': 'Ayeyarwady Region',
      'Bago': 'Bago Region', 
      'Chin': 'Chin State',
      'Kachin': 'Kachin State',
      'Kayah': 'Kayah State',
      'Kayin': 'Kayin State',
      'Magway': 'Magway Region',
      'Mandalay': 'Mandalay Region',
      'Mon': 'Mon State',
      'Nay Pyi Taw': 'Nay Pyi Taw Union Territory',
      'Rakhine': 'Rakhine State',
      'Sagaing': 'Sagaing Region',
      'Shan': 'Shan State',
      'Tanintharyi': 'Tanintharyi Region',
      'Yangon': 'Yangon Region'
    };
    
    return nameMapping[geoJsonName] || geoJsonName;
  };

  // Function to style each region based on breakdown data
  const styleFeature = (feature: any) => {
    const geoJsonName = feature.properties.ST; // "ST" contains the region name from GeoJSON
    const fullRegionName = mapGeoJsonToFullName(geoJsonName);
    const percentage = breakdowns[fullRegionName] || 0;
    
    console.log(`[MyanmarAdminMap] Styling ${geoJsonName} -> ${fullRegionName}: ${percentage}%`);
    
    return {
      fillColor: getColor(percentage),
      weight: 3,
      opacity: 1,
      color: '#1e293b',  // slate-800 for darker, more visible borders
      dashArray: '',
      fillOpacity: 0.6
    };
  };

  // Function to handle region interactions
  const onEachFeature = (feature: any, layer: any) => {
    const geoJsonName = feature.properties.ST;
    const fullRegionName = mapGeoJsonToFullName(geoJsonName);
    const percentage = breakdowns[fullRegionName] || 0;
    
    // Bind tooltip with region info (shows on hover)
    layer.bindTooltip(`
      <div class="text-sm bg-white p-2 rounded shadow-lg border">
        <div class="font-semibold text-gray-900">${fullRegionName}</div>
        <div class="text-gray-600 mt-1">
          Allocation: <span class="font-medium text-gray-900">${percentage.toFixed(1)}%</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">
          ${feature.properties.ST_RG}
        </div>
      </div>
    `, {
      permanent: false,
      sticky: false,
      className: 'custom-tooltip',
      direction: 'center',
      offset: [0, 0]
    });

    // Add hover effects
    layer.on({
      mouseover: (e: any) => {
        const layer = e.target;
        layer.setStyle({
          weight: 3,
          color: '#374151',  // gray-700 for hover borders
          fillColor: '#9ca3af',  // gray-400 monochrome hover
          dashArray: '',
          fillOpacity: 0.8
        });
        layer.bringToFront();
        
        // Show tooltip
        layer.openTooltip();
      },
      mouseout: (e: any) => {
        const layer = e.target;
        layer.setStyle(styleFeature(feature));
        
        // Close tooltip
        layer.closeTooltip();
      },
      click: (e: any) => {
        if (onRegionClick) {
          onRegionClick(fullRegionName);
        }
        // Zoom to region
        const layer = e.target;
        mapRef.current?.fitBounds(layer.getBounds());
      }
    });
  };

  if (!visible) return null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Myanmar Administrative Map
            <HelpTextTooltip content="Click regions to zoom in • Hover for details • Colors show allocation percentages" />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShouldResetMap(true);
              setTimeout(() => setShouldResetMap(false), 100);
            }}
            className="text-xs"
            title="Reset view to Myanmar"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset View
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <div className="min-h-[600px] max-h-[800px] h-full w-full relative rounded-lg overflow-hidden border">
          {isMapLoaded && L && geoJsonData ? (
            <MapContainer
              ref={mapRef}
              center={[21.0, 96.0]}
              zoom={5.5}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              attributionControl={false}
            >
              {/* Add base tiles for better visibility */}
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {/* Administrative boundaries */}
              <GeoJSON
                data={geoJsonData}
                style={styleFeature}
                onEachFeature={onEachFeature}
              />
              <MapReset 
                shouldReset={shouldResetMap} 
                onResetComplete={() => setShouldResetMap(false)} 
              />
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <div className="text-sm text-gray-600">Loading map...</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

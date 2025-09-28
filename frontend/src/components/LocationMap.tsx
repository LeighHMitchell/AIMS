'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';

// Import Leaflet CSS only on client side
if (typeof window !== 'undefined') {
  require('leaflet/dist/leaflet.css');
}

// Dynamically import all Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Custom component for click handling
const MapClickHandler = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    if (map) {
      const handleClick = (e: any) => {
        const { lat, lng } = e.latlng;
        onLocationSelect(lat, lng);
      };

      map.on('click', handleClick);

      return () => {
        map.off('click', handleClick);
      };
    }
  }, [map, onLocationSelect]);

  // This component doesn't render anything visible
  return null;
};

interface LocationMapProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
}

export default function LocationMap({ 
  onLocationSelect, 
  initialCenter = [16.8661, 96.1951], // Default to Yangon, Myanmar
  initialZoom = 10 
}: LocationMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleMapClick = async (lat: number, lng: number) => {
    setIsLoading(true);
    setSelectedLocation([lat, lng]);

    try {
      // Reverse geocoding to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AIMS-Project/1.0'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        onLocationSelect(lat, lng, address);
      } else {
        // Fallback if reverse geocoding fails
        const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        onLocationSelect(lat, lng, address);
      }
    } catch (error) {
      console.error('Error getting address:', error);
      // Fallback if reverse geocoding fails
      const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      onLocationSelect(lat, lng, address);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return (
      <div className="h-[600px] border rounded-lg bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ height: '600px', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler onLocationSelect={handleMapClick} />
        
        {selectedLocation && (
          <Marker position={selectedLocation}>
            <Popup>
              <div className="text-center">
                <p className="font-medium">Selected Location</p>
                <p className="text-sm text-gray-600">
                  {selectedLocation[0].toFixed(6)}, {selectedLocation[1].toFixed(6)}
                </p>
                {isLoading && (
                  <p className="text-xs text-blue-600 mt-1">Getting address...</p>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      
      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg max-w-xs">
        <h4 className="font-medium text-sm mb-2">Click on the map to select a location</h4>
        <p className="text-xs text-gray-600">
          Click anywhere on the map to place a marker and get location details
        </p>
      </div>
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Getting location details...</p>
          </div>
        </div>
      )}
    </div>
  );
}

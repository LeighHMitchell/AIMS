'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface LocationMapSimpleProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
}

export default function LocationMapSimple({ 
  onLocationSelect, 
  initialCenter = [16.8661, 96.1951], // Default to Yangon, Myanmar
  initialZoom = 10 
}: LocationMapSimpleProps) {
  const [isClient, setIsClient] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !mapRef.current) return;

    const loadMap = async () => {
      try {
        // Dynamically import Leaflet only on client side
        const L = (await import('leaflet')).default;
        
        // Import CSS dynamically
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css';
        document.head.appendChild(link);
        
        // Fix default marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Create map
        const map = L.map(mapRef.current!).setView(initialCenter, initialZoom);
        mapInstanceRef.current = map;

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Add click handler
        map.on('click', async (e: any) => {
          const { lat, lng } = e.latlng;
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
        });

        // Add marker if location is selected
        if (selectedLocation) {
          L.marker(selectedLocation).addTo(map);
        }

      } catch (error) {
        console.error('Error loading map:', error);
      }
    };

    loadMap();

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient, initialCenter, initialZoom, onLocationSelect]);

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
      <div 
        ref={mapRef} 
        className="h-[600px] w-full rounded-lg border"
        style={{ minHeight: '600px' }}
      />
      
      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg max-w-xs z-10">
        <h4 className="font-medium text-sm mb-2">Click on the map to select a location</h4>
        <p className="text-xs text-gray-600">
          Click anywhere on the map to place a marker and get location details
        </p>
      </div>
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Getting location details...</p>
          </div>
        </div>
      )}
    </div>
  );
}

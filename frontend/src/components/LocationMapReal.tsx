'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface LocationMapRealProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
}

export default function LocationMapReal({ 
  onLocationSelect, 
  initialCenter = [16.8661, 96.1951], // Default to Yangon, Myanmar
  initialZoom = 10 
}: LocationMapRealProps) {
  const [isClient, setIsClient] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletLoadedRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !mapRef.current || leafletLoadedRef.current) return;

    const loadLeaflet = async () => {
      try {
        // Load Leaflet CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        cssLink.crossOrigin = '';
        document.head.appendChild(cssLink);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        
        script.onload = () => {
          // @ts-ignore - Leaflet is loaded from CDN
          const L = window.L;
          
          if (!L) {
            console.error('Leaflet failed to load');
            return;
          }

          // Fix default marker icons
          delete (L.Icon.Default.prototype as any)._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          });

          // Create map
          const map = L.map(mapRef.current!, {
            center: initialCenter,
            zoom: initialZoom,
            zoomControl: true,
            attributionControl: true
          });
          
          mapInstanceRef.current = map;
          leafletLoadedRef.current = true;

          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }).addTo(map);

          // Add click handler
          map.on('click', async (e: any) => {
            const { lat, lng } = e.latlng;
            setIsLoading(true);
            setSelectedLocation([lat, lng]);

            // Clear existing markers
            map.eachLayer((layer: any) => {
              if (layer instanceof L.Marker) {
                map.removeLayer(layer);
              }
            });

            // Add new marker
            const marker = L.marker([lat, lng]).addTo(map);
            
            // Add popup with coordinates
            marker.bindPopup(`
              <div class="text-center">
                <p class="font-medium">Selected Location</p>
                <p class="text-sm text-gray-600">
                  ${lat.toFixed(6)}, ${lng.toFixed(6)}
                </p>
                ${isLoading ? '<p class="text-xs text-blue-600 mt-1">Getting address...</p>' : ''}
              </div>
            `).openPopup();

            try {
              // Reverse geocoding to get address
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`,
                {
                  headers: {
                    'User-Agent': 'AIMS-Project/1.0'
                  }
                }
              );

              if (response.ok) {
                const data = await response.json();
                const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                
                // Update popup with address
                marker.setPopupContent(`
                  <div class="text-center">
                    <p class="font-medium">Selected Location</p>
                    <p class="text-sm text-gray-600">
                      ${lat.toFixed(6)}, ${lng.toFixed(6)}
                    </p>
                    <p class="text-xs text-gray-500 mt-1 max-w-xs">
                      ${address}
                    </p>
                  </div>
                `).openPopup();
                
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

          setMapLoaded(true);
        };

        script.onerror = () => {
          console.error('Failed to load Leaflet script');
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Leaflet:', error);
      }
    };

    loadLeaflet();

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
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg max-w-xs z-[1000]">
        <h4 className="font-medium text-sm mb-2">Click on the map to select a location</h4>
        <p className="text-xs text-gray-600">
          Click anywhere on the map to place a marker and get location details
        </p>
        {!mapLoaded && (
          <p className="text-xs text-blue-600 mt-2">Loading map tiles...</p>
        )}
      </div>
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg z-[1001]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Getting location details...</p>
          </div>
        </div>
      )}
    </div>
  );
}

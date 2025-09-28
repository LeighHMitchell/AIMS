'use client';

import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

interface LocationMapFallbackProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
}

export default function LocationMapFallback({ 
  onLocationSelect, 
  initialCenter = [16.8661, 96.1951], // Default to Yangon, Myanmar
  initialZoom = 10 
}: LocationMapFallbackProps) {
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const predefinedLocations = [
    { name: "Yangon, Myanmar", lat: 16.8661, lng: 96.1951 },
    { name: "Melbourne, Australia", lat: -37.8136, lng: 145.1431 },
    { name: "New York, USA", lat: 40.7128, lng: -74.0060 },
    { name: "London, UK", lat: 51.5074, lng: -0.1278 },
    { name: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 },
    { name: "Bangkok, Thailand", lat: 13.7563, lng: 100.5018 },
    { name: "Singapore", lat: 1.3521, lng: 103.8198 },
    { name: "Manila, Philippines", lat: 14.5995, lng: 120.9842 },
    { name: "Jakarta, Indonesia", lat: -6.2088, lng: 106.8456 },
    { name: "Hanoi, Vietnam", lat: 21.0285, lng: 105.8542 },
  ];

  const handleLocationClick = async (lat: number, lng: number, name: string) => {
    setIsLoading(true);
    setSelectedLocation([lat, lng]);

    try {
      // Simulate reverse geocoding
      await new Promise(resolve => setTimeout(resolve, 500));
      onLocationSelect(lat, lng, name);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Map Placeholder */}
      <div className="h-[600px] border rounded-lg bg-gradient-to-br from-blue-100 to-green-100 relative overflow-hidden">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="grid grid-cols-12 grid-rows-8 h-full">
            {Array.from({ length: 96 }).map((_, i) => (
              <div key={i} className="border border-gray-300"></div>
            ))}
          </div>
        </div>
        
        {/* Interactive Click Areas */}
        <div className="absolute inset-0">
          {predefinedLocations.map((location, index) => {
            // Calculate position based on location
            let top = 50, left = 50;
            
            // Position locations roughly on the map
            if (location.name.includes('Yangon')) { top = 40; left = 60; }
            else if (location.name.includes('Melbourne')) { top = 70; left = 80; }
            else if (location.name.includes('New York')) { top = 30; left = 20; }
            else if (location.name.includes('London')) { top = 25; left = 45; }
            else if (location.name.includes('Tokyo')) { top = 35; left = 85; }
            else if (location.name.includes('Bangkok')) { top = 50; left = 65; }
            else if (location.name.includes('Singapore')) { top = 55; left = 70; }
            else if (location.name.includes('Manila')) { top = 45; left = 75; }
            else if (location.name.includes('Jakarta')) { top = 60; left = 70; }
            else if (location.name.includes('Hanoi')) { top = 45; left = 68; }

            const colors = [
              'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
              'bg-orange-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500',
              'bg-teal-500', 'bg-cyan-500'
            ];
            const color = colors[index % colors.length];

            return (
              <div 
                key={location.name}
                className={`absolute w-16 h-16 ${color} bg-opacity-30 hover:bg-opacity-50 cursor-pointer rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110`}
                style={{ top: `${top}%`, left: `${left}%` }}
                onClick={() => handleLocationClick(location.lat, location.lng, location.name)}
                title={`Click to select ${location.name}`}
              >
                <MapPin className="h-6 w-6 text-white" />
              </div>
            );
          })}
        </div>
        
        {/* Map Legend */}
        <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg">
          <h4 className="font-medium text-sm mb-2">Click on markers to select locations:</h4>
          <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
            {predefinedLocations.map((location, index) => {
              const colors = [
                'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
                'bg-orange-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500',
                'bg-teal-500', 'bg-cyan-500'
              ];
              const color = colors[index % colors.length];
              
              return (
                <div key={location.name} className="flex items-center gap-2">
                  <div className={`w-3 h-3 ${color} rounded-full`}></div>
                  <span className="truncate">{location.name}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Instructions */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg">
          <p className="text-sm text-gray-600 text-center">
            Click on any colored marker to select that location
          </p>
        </div>

        {/* Selected Location Indicator */}
        {selectedLocation && (
          <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg">
            <p className="text-sm font-medium text-green-600">Selected:</p>
            <p className="text-xs text-gray-600">
              {selectedLocation[0].toFixed(4)}, {selectedLocation[1].toFixed(4)}
            </p>
          </div>
        )}
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

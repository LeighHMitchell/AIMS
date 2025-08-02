'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SimpleMapTest() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Leaflet dynamically
    const loadMap = async () => {
      try {
        console.log('🔄 Loading Leaflet...');
        
        // Import Leaflet CSS
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        
        // Import Leaflet JS
        const L = (await import('leaflet')).default;
        console.log('✅ Leaflet loaded');
        
        // Fix marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        
        // Create map
        const mapContainer = document.getElementById('test-map');
        if (!mapContainer) {
          throw new Error('Map container not found');
        }
        
        console.log('🗺️ Creating map...');
        const map = L.map('test-map').setView([21.9162, 95.9560], 6);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        
        console.log('✅ Map created successfully');
        
        // Test interactions
        map.on('dragstart', () => console.log('🚀 Drag started'));
        map.on('drag', () => console.log('🚀 Dragging...'));
        map.on('dragend', () => console.log('🚀 Drag ended'));
        map.on('zoomstart', () => console.log('🔍 Zoom started'));
        map.on('zoomend', () => console.log('🔍 Zoom ended'));
        map.on('click', (e: any) => console.log(`🖱️ Clicked at: ${e.latlng.lat}, ${e.latlng.lng}`));
        
        // Check interaction status
        setTimeout(() => {
          console.log('🔧 Interaction status:');
          console.log('- Dragging:', map.dragging.enabled());
          console.log('- Scroll wheel zoom:', map.scrollWheelZoom.enabled());
          console.log('- Touch zoom:', map.touchZoom.enabled());
        }, 1000);
        
        setMapLoaded(true);
        
      } catch (err) {
        console.error('❌ Failed to load map:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    
    loadMap();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧪 Simple Map Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm">
            {!mapLoaded && !error && <span className="text-blue-600">Loading map...</span>}
            {mapLoaded && <span className="text-green-600">✅ Map loaded successfully</span>}
            {error && <span className="text-red-600">❌ Error: {error}</span>}
          </div>
          
          <div 
            id="test-map" 
            style={{ height: '400px', width: '100%' }}
            className="border border-gray-300 rounded-lg"
          />
          
          <div className="text-xs text-gray-600 space-y-1">
            <div>🖱️ Try dragging the map to pan</div>
            <div>🔍 Use mouse wheel to zoom</div>
            <div>📱 On mobile: pinch to zoom, drag to pan</div>
            <div>🔧 Check browser console for interaction logs</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
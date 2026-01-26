'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { Map, MapControls, useMap } from '@/components/ui/map';
import { MapMarker, MarkerContent, MarkerPopup, MarkerTooltip } from '@/components/ui/map';
import { Badge } from '@/components/ui/badge';
import { getCountryCoordinates, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/data/country-coordinates';
import { apiFetch } from '@/lib/api-fetch';

// Simplified location interface for embedded map
export interface EmbeddedLocation {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
  description?: string;
  activity?: {
    id: string;
    title: string;
    status?: string;
    organization_name?: string;
    total_budget?: number;
    banner?: string;
  };
}

interface EmbeddedAtlasMapProps {
  locations: EmbeddedLocation[];
  height?: string;
  className?: string;
  showControls?: boolean;
}

// Map style for embedded maps
const MAP_STYLE = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

const getStatusInfo = (status?: string): { label: string; color: string; bgColor: string } => {
  const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
    '1': { label: 'Pipeline', color: '#6b7280', bgColor: '#f3f4f6' },
    '2': { label: 'Implementation', color: '#059669', bgColor: '#d1fae5' },
    '3': { label: 'Finalisation', color: '#d97706', bgColor: '#fef3c7' },
    '4': { label: 'Closed', color: '#374151', bgColor: '#e5e7eb' },
    '5': { label: 'Cancelled', color: '#dc2626', bgColor: '#fee2e2' },
    '6': { label: 'Suspended', color: '#9333ea', bgColor: '#f3e8ff' },
  };
  const key = status?.toLowerCase() || '';
  return statusMap[key] || statusMap[status || ''] || { label: status || 'Unknown', color: '#6b7280', bgColor: '#f3f4f6' };
};

const formatCompactCurrency = (amount?: number): string => {
  if (amount === undefined || amount === null || amount === 0) return '$0';
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (absAmount >= 1000000000) {
    const value = absAmount / 1000000000;
    return `${sign}$${value >= 10 ? value.toFixed(0) : value.toFixed(1)}b`;
  } else if (absAmount >= 1000000) {
    const value = absAmount / 1000000;
    return `${sign}$${value >= 10 ? value.toFixed(0) : value.toFixed(1)}m`;
  } else if (absAmount >= 1000) {
    const value = absAmount / 1000;
    return `${sign}$${value >= 10 ? value.toFixed(0) : value.toFixed(1)}k`;
  }
  return `${sign}$${absAmount.toFixed(0)}`;
};

// Individual marker component for embedded map
function EmbeddedMarker({ location }: { location: EmbeddedLocation }) {
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);
  const statusInfo = getStatusInfo(location.activity?.status);
  
  if (isNaN(lat) || isNaN(lng)) return null;

  return (
    <MapMarker
      longitude={lng}
      latitude={lat}
    >
      <MarkerContent>
        <div className="size-4 rounded-full bg-primary border-2 border-white shadow-lg" />
      </MarkerContent>

      <MarkerTooltip className="!p-0 !bg-white !text-foreground max-w-[280px] overflow-hidden">
        {location.activity?.banner ? (
          <div className="w-full h-14 overflow-hidden">
            <img src={location.activity.banner} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-10 bg-gradient-to-r from-slate-600 to-slate-400" />
        )}
        
        <div className="p-2">
          <div className="font-semibold text-xs text-slate-700 mb-1.5 line-clamp-2">
            {location.activity?.title || 'Untitled Activity'}
          </div>
          
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div className="text-slate-500">Location</div>
            <div className="text-slate-700 truncate">{location.name || 'Unnamed'}</div>
            
            {location.activity?.organization_name && (
              <>
                <div className="text-slate-500">Organisation</div>
                <div className="text-slate-700 truncate">{location.activity.organization_name}</div>
              </>
            )}
            
            <div className="text-slate-500">Status</div>
            <div className="text-slate-700">{statusInfo.label}</div>
          </div>
        </div>
      </MarkerTooltip>

      <MarkerPopup className="!p-0 !bg-white !text-foreground min-w-[300px] max-w-[360px] overflow-hidden" closeButton>
        {location.activity?.banner ? (
          <div className="w-full h-20 overflow-hidden -m-3 mb-3" style={{ width: 'calc(100% + 24px)' }}>
            <img src={location.activity.banner} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-14 bg-gradient-to-r from-slate-600 to-slate-400 -m-3 mb-3" style={{ width: 'calc(100% + 24px)' }} />
        )}
        
        <h3 className="font-bold text-sm text-slate-700 mb-2 leading-tight">
          {location.activity?.title || 'Untitled Activity'}
        </h3>
        
        <hr className="border-slate-200 mb-2" />
        
        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          <div>
            <div className="text-slate-500 text-[10px] font-medium mb-0.5">Organisation</div>
            <div className="text-slate-700">{location.activity?.organization_name || '-'}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px] font-medium mb-0.5">Status</div>
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1.5 py-0"
              style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
            >
              {statusInfo.label}
            </Badge>
          </div>
        </div>
        
        {location.name && (
          <div className="text-xs mb-2">
            <div className="text-slate-500 text-[10px] font-medium mb-0.5">Location</div>
            <div className="text-slate-700">{location.name}</div>
            {location.description && (
              <div className="text-slate-500 text-[10px] mt-0.5">{location.description}</div>
            )}
          </div>
        )}
        
        {location.activity?.total_budget !== undefined && location.activity.total_budget > 0 && (
          <div className="text-xs mb-2">
            <div className="text-slate-500 text-[10px] font-medium mb-0.5">Budget</div>
            <div className="font-semibold text-slate-700">{formatCompactCurrency(location.activity.total_budget)}</div>
          </div>
        )}
        
        {location.activity?.id && (
          <div className="mt-2 pt-2 border-t border-slate-200">
            <a 
              href={`/activities/${location.activity.id}`}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              View Full Activity Details →
            </a>
          </div>
        )}
      </MarkerPopup>
    </MapMarker>
  );
}

// Auto-fit bounds component
function AutoFitBounds({ locations }: { locations: EmbeddedLocation[] }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || locations.length === 0) return;

    // Calculate bounds
    const validLocations = locations.filter(
      loc => !isNaN(Number(loc.latitude)) && !isNaN(Number(loc.longitude))
    );

    if (validLocations.length === 0) return;

    if (validLocations.length === 1) {
      // Single location - center on it
      map.flyTo({
        center: [Number(validLocations[0].longitude), Number(validLocations[0].latitude)],
        zoom: 12,
        duration: 1000,
      });
    } else {
      // Multiple locations - fit bounds
      const lngs = validLocations.map(loc => Number(loc.longitude));
      const lats = validLocations.map(loc => Number(loc.latitude));
      
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ];

      map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 14,
        duration: 1000,
      });
    }
  }, [map, isLoaded, locations]);

  return null;
}

export default function EmbeddedAtlasMap({ 
  locations, 
  height = '500px',
  className = '',
  showControls = true,
}: EmbeddedAtlasMapProps) {
  // Home country coordinates from system settings
  const [homeCountryCenter, setHomeCountryCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [homeCountryZoom, setHomeCountryZoom] = useState<number>(DEFAULT_MAP_ZOOM);

  // Fetch home country from system settings
  useEffect(() => {
    const fetchHomeCountry = async () => {
      try {
        const response = await apiFetch('/api/admin/system-settings');
        if (response.ok) {
          const data = await response.json();
          if (data.homeCountry) {
            const countryCoords = getCountryCoordinates(data.homeCountry);
            setHomeCountryCenter(countryCoords.center);
            setHomeCountryZoom(countryCoords.zoom);
          }
        }
      } catch (error) {
        console.error('Failed to fetch home country setting:', error);
      }
    };
    fetchHomeCountry();
  }, []);

  // Filter valid locations
  const validLocations = useMemo(() => {
    return locations.filter(location => 
      location.latitude && 
      location.longitude && 
      !isNaN(Number(location.latitude)) && 
      !isNaN(Number(location.longitude))
    );
  }, [locations]);

  if (validLocations.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center bg-slate-50 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="font-medium text-slate-600">No locations to display</p>
          <p className="text-sm text-slate-500">
            Add locations to see them on the map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ height }}>
      <Map
        styles={{
          light: MAP_STYLE.light,
          dark: MAP_STYLE.dark,
        }}
        center={[homeCountryCenter[1], homeCountryCenter[0]]} // MapLibre uses [lng, lat]
        zoom={homeCountryZoom}
        minZoom={2}
        maxZoom={18}
      >
        {showControls && (
          <MapControls 
            position="bottom-right" 
            showZoom={true} 
            showCompass={true}
            showFullscreen={true}
          />
        )}
        
        {/* Auto-fit bounds to show all markers */}
        <AutoFitBounds locations={validLocations} />
        
        {/* Markers */}
        {validLocations.map(location => (
          <EmbeddedMarker key={location.id} location={location} />
        ))}
      </Map>
    </div>
  );
}

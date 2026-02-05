'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import { MapMarker, MarkerContent, MarkerTooltip, useMap } from '@/components/ui/map';

interface Location {
  id?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  site_type?: string;
  state_region_name?: string;
  township_name?: string;
  district_name?: string;
  village_name?: string;
  address?: string;
  city?: string;
  description?: string;
  location_description?: string;
  [key: string]: unknown;
}

interface SimpleActivityMarkersLayerProps {
  locations: Location[];
  activityTitle?: string;
}

// Format site type for display
const formatSiteType = (siteType?: string): string => {
  if (!siteType) return '-';
  return siteType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Individual marker component
function SimpleLocationMarker({
  location,
  activityTitle
}: {
  location: Location;
  activityTitle?: string;
}) {
  const { map } = useMap();

  const lat = Number(location.latitude);
  const lng = Number(location.longitude);

  if (isNaN(lat) || isNaN(lng)) return null;

  const handleDoubleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (map) {
      map.flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 1500,
      });
    }
  };

  return (
    <MapMarker
      longitude={lng}
      latitude={lat}
      onDoubleClick={handleDoubleClick}
    >
      {/* Custom marker appearance - red MapPin */}
      <MarkerContent>
        <MapPin className="w-7 h-7 fill-[#DC2626] stroke-white stroke-[1.5]" />
      </MarkerContent>

      {/* Tooltip on hover */}
      <MarkerTooltip className="!p-0 !bg-white !text-foreground max-w-[300px] overflow-hidden">
        <div className="p-2.5">
          {activityTitle && (
            <div className="font-semibold text-xs text-slate-700 mb-1">{activityTitle}</div>
          )}
          <div className="text-[10px] space-y-1">
            {location.site_type && (
              <div><span className="text-slate-500">Site Type:</span> {formatSiteType(location.site_type)}</div>
            )}
            <div><span className="text-slate-500">Location:</span> {location.location_name || 'Unnamed'}</div>
            <div><span className="text-slate-500">Coords:</span> {lat.toFixed(6)}, {lng.toFixed(6)}</div>
          </div>
        </div>
      </MarkerTooltip>
    </MapMarker>
  );
}

export default function SimpleActivityMarkersLayer({ 
  locations, 
  activityTitle 
}: SimpleActivityMarkersLayerProps) {
  // Filter to only locations with valid coordinates
  const validLocations = locations.filter(loc => {
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);
    return !isNaN(lat) && !isNaN(lng);
  });
  
  return (
    <>
      {validLocations.map(location => (
        <SimpleLocationMarker 
          key={location.id || `${location.latitude}-${location.longitude}`} 
          location={location} 
          activityTitle={activityTitle}
        />
      ))}
    </>
  );
}

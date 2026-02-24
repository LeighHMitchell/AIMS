'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import { MapMarker, MarkerContent, MarkerPopup, MarkerTooltip, useMap } from '@/components/ui/map';

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
  activity_location_description?: string;
  [key: string]: unknown;
}

interface SimpleActivityMarkersLayerProps {
  locations: Location[];
  activityTitle?: string;
}

const getFullAddress = (location: Location): string => {
  const parts = [];
  if (location.address) parts.push(location.address);
  if (location.village_name) parts.push(location.village_name);
  if (location.township_name) parts.push(location.township_name);
  if (location.district_name) parts.push(location.district_name);
  if (location.state_region_name) parts.push(location.state_region_name);
  if (location.city) parts.push(location.city);
  return parts.join(', ');
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

  const address = getFullAddress(location);

  const infoContent = (
    <div className="p-2.5">
      <div className="font-semibold text-xs text-slate-700 mb-1.5">
        {location.location_name || 'Unnamed Location'}
      </div>
      <div className="text-[10px] space-y-1">
        {location.location_description && (
          <div className="text-slate-600 leading-snug">{location.location_description}</div>
        )}
        {location.activity_location_description && (
          <div className="text-slate-500 leading-snug">{location.activity_location_description}</div>
        )}
        {address && (
          <div className="text-slate-600 leading-snug">{address}</div>
        )}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="font-mono text-slate-500">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}&t=k`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Google Maps"
            className="hover:opacity-80 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src="https://www.gstatic.com/marketing-cms/assets/images/0f/9a/58f1d92b46069b4a8bdc556b612c/google-maps.webp"
              alt="Open in Google Maps"
              className="h-3.5 w-3.5"
            />
          </a>
        </div>
      </div>
    </div>
  );

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
        {infoContent}
      </MarkerTooltip>

      {/* Popup on click - same content, stays until clicked away */}
      <MarkerPopup className="!p-0 !bg-white !text-foreground max-w-[300px] overflow-hidden" closeButton>
        {infoContent}
      </MarkerPopup>
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

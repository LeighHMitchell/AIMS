'use client';

import React, { useState } from 'react';
import { MapPin, Copy, Check } from 'lucide-react';
import { MapMarker, MarkerContent, MarkerPopup, MarkerTooltip, useMap } from '@/components/ui/map';
import { Badge } from '@/components/ui/badge';

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

// Build location details string (short version)
const getLocationDetails = (location: Location): string => {
  const parts: string[] = [];
  if (location.village_name) parts.push(location.village_name);
  if (location.township_name) parts.push(location.township_name);
  if (location.district_name) parts.push(location.district_name);
  if (location.state_region_name) parts.push(location.state_region_name);
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
  const [copied, setCopied] = useState(false);
  
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

  const handleCopyCoordinates = async () => {
    try {
      await navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy coordinates:', err);
    }
  };

  const locationDetails = getLocationDetails(location);

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
          {/* Location Name */}
          <div className="font-semibold text-xs text-slate-700 mb-2 line-clamp-2">
            {location.location_name || 'Unnamed Location'}
          </div>
          
          {/* Quick info */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            {location.site_type && (
              <>
                <div className="text-slate-500">Site Type</div>
                <div className="text-slate-700">{formatSiteType(location.site_type)}</div>
              </>
            )}
            
            {locationDetails && (
              <>
                <div className="text-slate-500">Location</div>
                <div className="text-slate-700">{locationDetails}</div>
              </>
            )}
            
            {activityTitle && (
              <>
                <div className="text-slate-500">Activity</div>
                <div className="text-slate-700">{activityTitle}</div>
              </>
            )}
          </div>
        </div>
      </MarkerTooltip>

      {/* Popup on click */}
      <MarkerPopup className="!p-0 !bg-white !text-foreground min-w-[300px] max-w-[360px] overflow-hidden" closeButton>
        <div className="p-3">
          {/* Location Name */}
          <h3 className="text-sm font-semibold text-slate-800 mb-0.5 leading-tight">
            {location.location_name || 'Unnamed Location'}
          </h3>
          
          {/* Activity Title */}
          {activityTitle && (
            <div className="text-xs text-slate-500 mb-3">
              {activityTitle}
            </div>
          )}
          
          <hr className="border-slate-200 mb-3" />
          
          {/* Description */}
          {(location.description || location.location_description) && (
            <div className="mb-3">
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-0.5">Description</div>
              <div className="text-xs text-slate-600 leading-snug italic">
                {location.description || location.location_description}
              </div>
            </div>
          )}
          
          {/* Site Type */}
          {location.site_type && (
            <div className="mb-3">
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-1">Site Type</div>
              <Badge variant="secondary" className="text-xs">
                {formatSiteType(location.site_type)}
              </Badge>
            </div>
          )}
          
          {/* Coordinates */}
          <div className="mb-3">
            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-1">Coordinates</div>
            <div className="flex items-center gap-2">
              <div className="font-mono text-xs text-slate-700 bg-slate-50 px-2 py-1 rounded">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </div>
              <button
                onClick={handleCopyCoordinates}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
                title="Copy coordinates"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                )}
              </button>
              <a 
                href={`https://www.google.com/maps?q=${lat},${lng}&t=k`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Maps"
                className="hover:opacity-80"
              >
                <img 
                  src="https://www.gstatic.com/marketing-cms/assets/images/0f/9a/58f1d92b46069b4a8bdc556b612c/google-maps.webp" 
                  alt="Open in Google Maps" 
                  className="h-4 w-4"
                />
              </a>
            </div>
          </div>
          
        </div>
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

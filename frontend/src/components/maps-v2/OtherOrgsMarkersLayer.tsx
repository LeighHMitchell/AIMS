'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import { MapMarker, MarkerContent, MarkerTooltip, useMap } from '@/components/ui/map';

interface OtherOrgLocation {
  id: string;
  location_name?: string;
  latitude: number;
  longitude: number;
  site_type?: string;
  activity?: {
    id: string;
    title?: string;
    organization_name?: string;
    organization_acronym?: string;
  } | null;
}

interface OtherOrgsMarkersLayerProps {
  locations: OtherOrgLocation[];
}

// Format site type for display
const formatSiteType = (siteType?: string): string => {
  if (!siteType) return '-';
  return siteType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Individual marker component for other orgs
function OtherOrgLocationMarker({ location }: { location: OtherOrgLocation }) {
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

  const orgDisplay = location.activity?.organization_acronym || location.activity?.organization_name || 'Unknown Org';

  return (
    <MapMarker
      longitude={lng}
      latitude={lat}
      onDoubleClick={handleDoubleClick}
    >
      {/* Custom marker appearance - blue MapPin */}
      <MarkerContent>
        <MapPin className="w-6 h-6 fill-[#2563EB] stroke-white stroke-[1.5]" />
      </MarkerContent>

      {/* Tooltip on hover */}
      <MarkerTooltip className="!p-0 !bg-white !text-foreground max-w-[300px] overflow-hidden">
        <div className="p-2.5">
          <div className="font-semibold text-xs text-blue-700 mb-1">{orgDisplay}</div>
          {location.activity?.title && (
            <div className="font-medium text-xs text-slate-700 mb-1 line-clamp-2">{location.activity.title}</div>
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

export default function OtherOrgsMarkersLayer({ locations }: OtherOrgsMarkersLayerProps) {
  // Filter to only locations with valid coordinates
  const validLocations = locations.filter(loc => {
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);
    return !isNaN(lat) && !isNaN(lng);
  });

  return (
    <>
      {validLocations.map(location => (
        <OtherOrgLocationMarker
          key={location.id || `${location.latitude}-${location.longitude}`}
          location={location}
        />
      ))}
    </>
  );
}
